// Simulasi pengelolaan sampah Jakarta — port dari platform/packages/sim/R/simulation.R
// (yang sendirinya port verbatim dari global.R / server.R legacy). Konstanta metodologi dari
// R/constants.R; parameter skenario dari data/sim_ref.json (tabel sim.* di database).
// Setiap perubahan harus tetap lolos tests/test_sim.js (paritas dengan hasil R).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Sim = factory();
}(typeof self !== 'undefined' ? self : this, () => {
  // ── Konstanta metodologi (R/constants.R) ──
  const KAP_TPS_T1 = 0.3, KAP_TPS_T2 = 1.5, KAP_TPS_T3 = 3.0, KAP_TPS_T4 = 6.0;
  const KAP_TPS3R_UNIT = 25.0;
  const KAP_BS_PER_UNIT = 22.21 / 1000;
  const KOEF_TIMBULAN = 0.76;
  const KOMP_ORGANIK = 0.4987, KOMP_ANORGANIK = 0.4019, KOMP_RESIDU = 0.0952, KOMP_B3 = 0.0042;
  const FRAKSI_ORG_TPS3R = KOMP_ORGANIK / (KOMP_ORGANIK + KOMP_ANORGANIK);
  const FRAKSI_ANORG_TPS3R = KOMP_ANORGANIK / (KOMP_ORGANIK + KOMP_ANORGANIK);
  const KAP_KOMPOS = 83.5 / 7;
  const KAP_RDF = { eksisting: 466, minimum: 981, moderat: 1800, maksimum: 2000 };
  const KAP_PSEL = { eksisting: 0, minimum: 948, moderat: 2064, maksimum: 3000 };
  const FRAKSI_AKSES_TIER2 = 0.72;
  const UT_PETA = {
    desain: { pct: 1.00, reduksi: 1.00 }, eksisting: { pct: 0.21, reduksi: 0.15 },
    minimum: { pct: 0.40, reduksi: 0.30 }, moderat: { pct: 0.60, reduksi: 0.50 }, maksimum: { pct: 0.80, reduksi: 0.65 },
  };
  const UPGRADE_KAP_PER_UNIT = {
    eksisting: { t3: 0, t4: 0 }, minimum: { t3: 3.0 * 0.40, t4: 0 },
    moderat: { t3: 3.0 * 0.40, t4: 6.0 * 0.40 * 0.50 }, maksimum: { t3: 3.0 * 0.40, t4: 6.0 * 0.40 },
  };
  const BS_PETA = { eksisting: { pct: 0.10 }, minimum: { pct: 0.20 }, moderat: { pct: 0.40 }, maksimum: { pct: 0.70 } };

  // round() R: pembulatan berbasis representasi desimal, setengah tepat -> genap
  function roundR(x, d = 0) {
    if (!Number.isFinite(x)) return x;
    const m = 10 ** d;
    const y = x * m;
    if (Number.isInteger(y * 2) && !Number.isInteger(y)) {
      const f = Math.floor(y);
      return (f % 2 === 0 ? f : f + 1) / m;
    }
    return Number(x.toFixed(d));
  }
  const sum = (a) => a.reduce((t, v) => t + (Number.isNaN(v) ? 0 : v), 0);

  // ── Status kritis per kelurahan (hitung_peta_sim) ──
  function petaSim(ref, { hari = 1, sken_tps3r = 'desain', sken_upgrade = 'eksisting', sken_bs = 'minimum',
    sken_fpsa = 'eksisting', sken_psel = 'eksisting' } = {}) {
    const ut = UT_PETA[sken_tps3r];
    const up = UPGRADE_KAP_PER_UNIT[sken_upgrade];
    const bs = BS_PETA[sken_bs];
    const kec = {};
    ref.sim_kel.forEach((r) => {
      const k = (kec[r.kecamatan] ||= { tps3r: 0, pop: 0 });
      k.tps3r += r.tps3r; k.pop += r.populasi;
    });
    const df = ref.sim_kel.map((r) => {
      const kap_tps12 = r.tipe_1 * KAP_TPS_T1 + r.tipe_2 * KAP_TPS_T2;
      const kap_tps34 = (r.tipe_3 * KAP_TPS_T3 + r.tipe_4 * KAP_TPS_T4) * ut.pct;
      const k = kec[r.kecamatan];
      const kap_tps3r_kec = k.tps3r * KAP_TPS3R_UNIT * ut.pct * ut.reduksi;
      const share = kap_tps3r_kec * (r.populasi / k.pop);
      const kap_upgrade = r.tipe_3 * up.t3 + r.tipe_4 * up.t4;
      const kap_bs = r.n_bank_sampah * bs.pct * KAP_BS_PER_UNIT;
      const kap_efektif = kap_tps12 + kap_tps34 + share * FRAKSI_ORG_TPS3R + share * FRAKSI_ANORG_TPS3R + kap_upgrade + kap_bs;
      const timbulan_harian = r.populasi * KOEF_TIMBULAN / 1000;
      const kap_t1 = Number.isNaN(kap_efektif) ? 0 : kap_efektif;
      return { r, kap_efektif, timbulan_harian, kap_t1, shortfall: Math.max(0, timbulan_harian - kap_t1) };
    });

    const kap_hilir = (KAP_RDF[sken_fpsa] + KAP_PSEL[sken_psel]) * FRAKSI_AKSES_TIER2;
    const total_shortfall = sum(df.map((x) => x.shortfall));

    const data = df.map((x) => {
      const kap_tier2 = total_shortfall > 0 ? Math.min(kap_hilir * (x.shortfall / total_shortfall), x.shortfall) : 0;
      const kap_total = x.kap_t1 + kap_tier2;
      // Sisa < 1e-9 ton adalah galat pembulatan biner (kap_tier2 menutup shortfall tepat), anggap 0
      // seperti hasil R; tanpa ini hari_kritis menjadi angka triliunan, bukan NA.
      const diff = x.timbulan_harian - kap_total;
      const residual = diff > 1e-9 ? diff : 0;
      const akumulasi = residual * hari;
      const no_capacity = kap_total === 0;
      const rasio_isi = no_capacity ? (hari === 0 ? 0 : Infinity) : roundR(akumulasi / kap_total, 3);
      const status_sim = rasio_isi === Infinity || rasio_isi >= 1.0 ? 'KRITIS' : (rasio_isi >= 0.7 ? 'SIAGA' : 'AMAN');
      const sustainable = !no_capacity && residual === 0;
      let hari_kritis;
      if (no_capacity) hari_kritis = hari === 0 ? null : 0;
      else if (sustainable) hari_kritis = null;
      else if (status_sim === 'KRITIS') hari_kritis = 0;
      else hari_kritis = Math.ceil((kap_total - akumulasi) / residual);
      return {
        kelurahan: x.r.kelurahan, kecamatan: x.r.kecamatan, populasi: x.r.populasi,
        kap_efektif: x.kap_efektif, timbulan_harian: x.timbulan_harian, akumulasi,
        rasio_isi: rasio_isi === Infinity ? null : rasio_isi, status_sim, hari_kritis,
        kap_total, residual_harian: residual,
      };
    });
    const n = (s) => data.filter((d) => d.status_sim === s).length;
    return { data, summary: { n_aman: n('AMAN'), n_siaga: n('SIAGA'), n_kritis: n('KRITIS') } };
  }

  // ── Proyeksi kapasitas 2026–2045 (proyeksi) ──
  function proyeksi(ref, sken) {
    const P = ref.params;
    const n = ref.pop_proj.length;
    const kap_tps3r_desain = sum(ref.sim_kel.map((r) => r.tps3r)) * KAP_TPS3R_UNIT;
    const n_unit_bs = P.bs._const.n_unit_total;
    const k = P.timbulan[sken.timbulan];
    const ut = P.tps3r[sken.tps3r];
    const kap_tps3r = kap_tps3r_desain * ut.pct * ut.reduksi;
    const kap_bs = n_unit_bs * P.bs[sken.bs].pct * KAP_BS_PER_UNIT;
    const kap_upgrade = P.upgrade[sken.upgrade].kap_tpd;
    const fp = P.fpsa[sken.fpsa];
    const kap_psel = KAP_PSEL[sken.psel || 'eksisting'];

    const data = ref.pop_proj.map((p, i) => {
      const b = ref.kap_built[i];
      const koef = k.start + (k.end - k.start) / (n - 1) * i;
      const timbulan = (p.populasi * koef) / 1000;
      const kap_fpsa = fp.mode === 0 ? b.kap_fpsa
        : Math.max(b.kap_fpsa, roundR(P.fpsa._const.kap_desain * fp.util_pct));
      const kap_skenario = b.kap_rdf + kap_fpsa + kap_tps3r + kap_bs + kap_upgrade + kap_psel;
      const kap_baseline = b.kap_rdf + b.kap_fpsa + (kap_tps3r_desain * 0.21 * 0.15 * 1);
      const kap_zero_od = b.kap_rdf + b.kap_fpsa;
      const target_rpjmd = roundR((p.populasi * 0.76) / 1000 * ref.target[i].target_pct, 1);
      return {
        tahun: p.tahun, timbulan: roundR(timbulan, 1), kap_skenario: roundR(kap_skenario, 1),
        kap_baseline: roundR(kap_baseline, 1), kap_zero_od: roundR(kap_zero_od, 1), target_rpjmd,
        defisit: roundR(timbulan - kap_skenario, 1),
      };
    });
    const bal = data.filter((r) => r.defisit < 500);
    const r29 = data.find((r) => r.tahun === 2029);
    return {
      data,
      komposisi: komposisi2026(ref, sken, ref.pop_proj[0].populasi),
      summary: { tahun_seimbang: bal.length ? bal[0].tahun : null, target_2029_tercapai: !!(r29 && r29.kap_skenario >= r29.target_rpjmd) },
    };
  }

  // ── Komposisi 2026 per jenis (komposisi_2026) ──
  function komposisi2026(ref, sken, pop2026) {
    const P = ref.params;
    const k = P.timbulan[sken.timbulan];
    const tim_total = roundR((pop2026 * k.start) / 1000, 1);
    const tim_organik = roundR(tim_total * KOMP_ORGANIK, 0);
    const tim_anorg = roundR(tim_total * KOMP_ANORGANIK, 0);
    const tim_residu = roundR(tim_total * KOMP_RESIDU, 0);
    const tim_b3 = roundR(tim_total * KOMP_B3, 0);

    const ut = P.tps3r[sken.tps3r];
    const kap_tps3r_desain = sum(ref.sim_kel.map((r) => r.tps3r)) * KAP_TPS3R_UNIT;
    const kap_tps3r_all = kap_tps3r_desain * ut.pct * ut.reduksi;
    const kap_upgrade = P.upgrade[sken.upgrade].kap_tpd;
    const kap_organik = roundR(kap_tps3r_all * FRAKSI_ORG_TPS3R + kap_upgrade + KAP_KOMPOS, 0);

    const n_unit_bs = P.bs._const.n_unit_total;
    const kap_bs_tot = roundR(n_unit_bs * P.bs[sken.bs].pct * KAP_BS_PER_UNIT, 0);
    const sisa_anorg = Math.max(0, tim_anorg - kap_bs_tot);
    const kap_tps3r_anorg = kap_tps3r_all * FRAKSI_ANORG_TPS3R;
    const kap_anorg = roundR(kap_bs_tot + Math.min(sisa_anorg, kap_tps3r_anorg), 0);

    const kap_rdf = KAP_RDF[sken.fpsa || 'eksisting'];
    const kap_psel = KAP_PSEL[sken.psel || 'eksisting'];
    const gap_organik = Math.max(tim_organik - kap_organik, 0);
    const gap_anorganik = Math.max(tim_anorg - kap_anorg, 0);
    const tim_residu_total = tim_residu + gap_organik + gap_anorganik;
    const kap_residu = kap_rdf + kap_psel;

    const per_jenis = [
      { jenis: 'Organik', pct_total: 49.87, timbulan: tim_organik, kapasitas: kap_organik, gap: gap_organik,
        pct: Math.min(roundR(kap_organik / tim_organik * 100, 1), 100) },
      { jenis: 'Anorganik', pct_total: 40.19, timbulan: tim_anorg, kapasitas: kap_anorg, gap: gap_anorganik,
        pct: Math.min(roundR(kap_anorg / tim_anorg * 100, 1), 100) },
      { jenis: 'Residu', pct_total: 9.52, timbulan: tim_residu_total, kapasitas: Math.min(kap_residu, tim_residu_total),
        gap: Math.max(tim_residu_total - kap_residu, 0), pct: Math.min(roundR(kap_residu / tim_residu_total * 100, 1), 100) },
      { jenis: 'B3', pct_total: 0.42, timbulan: tim_b3, kapasitas: 0, gap: tim_b3, pct: 0 },
    ];
    const fasilitas = [
      ['TPS 3R', roundR(kap_tps3r_all, 0), '#2E7D32'], ['Bank Sampah', kap_bs_tot, '#F5C518'],
      ['Upgrade TPS', kap_upgrade, '#1565C0'], ['Kompos', roundR(KAP_KOMPOS, 0), '#795548'],
      ['RDF Plant', kap_rdf, '#E65100'], ['PSEL', kap_psel, '#6A1B9A'],
    ].map(([nama, kapasitas, warna]) => ({ nama, kapasitas, warna }));
    const kap_total_sistem = sum(fasilitas.map((f) => f.kapasitas));
    fasilitas.forEach((f) => { f.pct_sistem = roundR(f.kapasitas / Math.max(kap_total_sistem, 1) * 100, 1); });
    return {
      per_jenis, fasilitas, timbulan_total: tim_total, terolah_total: kap_total_sistem,
      gap_bantargebang: roundR(Math.max(tim_total - kap_total_sistem, 0), 0),
    };
  }

  // ── Pembiayaan 4 periode (financing) ──
  function financing(ref, sken) {
    const P = ref.params, c = ref.costs;
    const H_UPG = c.tps3r_upgrade, H_BS = c.bs_unit, H_BSP = c.bs_pembinaan, H_RDF = c.rdf_ops, H_FPSA = c.fpsa_ops;
    const n_upgrade = P.upgrade[sken.upgrade].n_unit_baru;
    const n_bs_baru = P.bs[sken.bs].n_unit_baru;
    const bp = P.timbulan[sken.timbulan].biaya_perilaku_miliar;
    const infra = [
      roundR(n_upgrade * H_UPG * 0.6 + n_bs_baru * H_BS * 0.5), roundR(n_upgrade * H_UPG * 0.4 + n_bs_baru * H_BS * 0.3),
      roundR(n_bs_baru * H_BS * 0.2 + bp * 0.3), roundR(bp * 0.2 + 50)];
    const ops = [roundR((H_RDF * 0.4 + H_FPSA * 0.3) * 4), roundR((H_RDF + H_FPSA * 0.7) * 5),
      roundR((H_RDF + H_FPSA) * 5), roundR((H_RDF + H_FPSA) * 5)];
    const pmbn = [roundR(n_bs_baru * H_BSP * 4 + bp * 0.3), roundR(n_bs_baru * H_BSP * 5 + bp * 0.4),
      roundR(n_bs_baru * H_BSP * 5 + bp * 0.3), roundR(n_bs_baru * H_BSP * 5)];
    const periode = ['RPJMD 2025-2029', 'RPJMD 2030-2034', 'RPJMD 2035-2039', 'RPJPD 2040-2045'];
    const data = periode.map((p, i) => {
      const monev = roundR((infra[i] + ops[i] + pmbn[i]) * 0.03);
      return { periode: p, infrastruktur: infra[i], operasional: ops[i], pembinaan: pmbn[i], monev,
        total: infra[i] + ops[i] + pmbn[i] + monev };
    });
    return { data, total_keseluruhan: sum(data.map((d) => d.total)), satuan: 'Miliar Rp' };
  }

  // ── Status kelurahan dengan limpahan ke tetangga (model situs, menggantikan v33 untuk peta) ──
  // Kapasitas dan timbulan per kelurahan sama dengan petaSim (v33). Bedanya: sisa harian yang tidak
  // tertampung lagi oleh kelurahan yang sudah KRITIS dilimpahkan sama rata ke tetangga yang belum
  // KRITIS, dan tiba keesokan harinya. Tetangga = kelurahan yang batasnya bersentuhan (tetangga.json).
  // Kelurahan tanpa tetangga di peta (Kepulauan Seribu) memakai hasil petaSim apa adanya.
  // Pada hari ke-1 belum ada limpahan masuk, jadi hasilnya identik dengan petaSim hari ke-1.
  function petaLimpahan(ref, tetangga, opts = {}) {
    const hari = opts.hari ?? 1;
    const base = petaSim(ref, { ...opts, hari: 1 });
    const K = (s) => String(s).toUpperCase().trim();
    const adj = {};
    Object.entries(tetangga).forEach(([k, v]) => { adj[K(k)] = v.map(K); });
    const rows = base.data.map((d) => ({ d, id: K(d.kelurahan), ikut: !!adj[K(d.kelurahan)],
      kap: d.kap_total, tim: d.timbulan_harian, pile: 0, inflow: 0, masuk: 0, kritis: false, hariKritis: null }));
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    const rasioOf = (r) => (r.kap === 0 ? Infinity : roundR(r.pile / r.kap, 3));

    for (let day = 1; day <= hari; day++) {
      const next = {};
      rows.forEach((r) => {
        if (!r.ikut) return;
        const load = r.tim + r.inflow;
        const sisa = Math.max(0, load - Math.min(load, r.kap));
        r.pile += sisa > 1e-9 ? sisa : 0;
        if (!r.kritis && rasioOf(r) >= 1) { r.kritis = true; r.hariKritis = day; }
        if (r.kritis && r.pile > r.kap) {
          const lebih = r.pile - r.kap;
          const tuju = adj[r.id].map((i) => by[i]).filter((y) => y && !y.kritis);
          if (tuju.length) {
            r.pile = r.kap;
            tuju.forEach((y) => { next[y.id] = (next[y.id] || 0) + lebih / tuju.length; });
          }
        }
      });
      rows.forEach((r) => { if (r.ikut) { r.inflow = next[r.id] || 0; r.masuk += r.inflow; } });
    }

    const data = rows.map((r) => {
      if (!r.ikut) {
        const v = petaSim(ref, { ...opts, hari }).data.find((x) => x.kelurahan === r.d.kelurahan);
        return { ...v, limpahan_masuk: 0 };
      }
      const rasio = hari === 0 ? 0 : rasioOf(r);
      const status = r.kritis ? 'KRITIS' : (rasio >= 0.7 ? 'SIAGA' : 'AMAN');
      return {
        kelurahan: r.d.kelurahan, kecamatan: r.d.kecamatan, populasi: r.d.populasi,
        kap_efektif: r.d.kap_efektif, timbulan_harian: r.tim, kap_total: r.kap,
        residual_harian: Math.max(0, r.tim - r.kap), akumulasi: r.pile,
        rasio_isi: rasio === Infinity ? null : rasio, status_sim: status,
        hari_kritis: r.hariKritis, limpahan_masuk: r.masuk,
      };
    });
    const n = (s) => data.filter((d) => d.status_sim === s).length;
    return { data, summary: { n_aman: n('AMAN'), n_siaga: n('SIAGA'), n_kritis: n('KRITIS') } };
  }

  // Hari pertama seluruh kelurahan KRITIS dengan model limpahan (null jika tidak tercapai dalam maxHari)
  function hariSemuaKritis(ref, tetangga, opts = {}, maxHari = 60) {
    for (let h = 1; h <= maxHari; h++) {
      const s = petaLimpahan(ref, tetangga, { ...opts, hari: h }).summary;
      if (s.n_aman + s.n_siaga === 0) return h;
    }
    return null;
  }

  return { petaSim, petaLimpahan, hariSemuaKritis, proyeksi, komposisi2026, financing, roundR, KAP_RDF, KAP_PSEL };
}));
