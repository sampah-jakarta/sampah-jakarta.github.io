// Model biaya inaksi (opportunity cost) — port dari platform/packages/web/src/web/pages/panel6.py.
// Satuan Rp triliun/tahun, tumbuh 3,5%/tahun 2026–2045. Paritas dicek di tests/test_dampak.html.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Dampak = factory();
}(typeof self !== 'undefined' ? self : this, () => {
  // round() Python: setengah tepat -> genap
  function pyRound(x, d = 0) {
    const m = 10 ** d, y = x * m;
    if (Number.isInteger(y * 2) && !Number.isInteger(y)) { const f = Math.floor(y); return (f % 2 === 0 ? f : f + 1) / m; }
    return Number(x.toFixed(d));
  }
  const YEARS = Array.from({ length: 20 }, (_, i) => 2026 + i);
  const grow = (base, rate = 0.035) => { const out = []; let v = base; YEARS.forEach(() => { out.push(pyRound(v, 2)); v *= 1 + rate; }); return out; };

  // ── Komponen biaya 2026 ──
  const KES = [
    ['DBD & penyakit vektor', pyRound(1078000 * 0.14 * 8700000 / 1e12, 2), 'KEMENKES 2024 · 1.078.000 kasus nasional × 14% Jakarta × Rp 8,7 juta/kasus (UGM 2024)'],
    ['Leptospirosis', pyRound(4.9 * 0.22, 2), 'Nery et al. 2023 (PMC10482283) · Indonesia Rp 4,9 T/tahun × 22% porsi Jakarta'],
    ['Diare & penyakit air', pyRound(56.0 * 0.037 * 0.12, 2), 'World Bank WSP 2008 (harga 2026) · Rp 56 T nasional × 3,7% populasi × 12% fraksi sampah'],
    ['ISPA sekitar TPS/TPA', pyRound(1140000 * 2500000 / 1e12, 2), 'DLH Jakarta 2023 · 1,14 juta warga radius 1 km dari 2.668 TPS × Rp 2,5 juta/kapita'],
  ];
  const LNG = [
    ['Emisi metana Bantargebang', pyRound((52560 * 28 * 51 * 16200 / 1e12) + (500000 * 2000000 / 1e12), 2), 'Carbon Mapper/UCLA Apr 2026: 52.560 tCH₄/tahun × GWP 28 × USD 51/tCO₂e + eksternalitas 500.000 warga sekitar'],
    ['Pencemaran sungai Jakarta', pyRound(167.6e9 * 650 / 20 / 1e12, 2), 'BPK DKI 2024: Rp 167,6 M/km × 650 km normalisasi sungai Jakarta, dianualisasi 20 tahun'],
    ['Plastik laut & Teluk Jakarta', pyRound(420e9 / 1e12, 2), 'MMAF 2024: kerugian industri perikanan pesisir Jakarta akibat plastik laut'],
    ['Degradasi tanah & air tanah', pyRound((89 + 15 * 3) * 18e9 / 20 / 1e12, 2), 'KLHK 2022: 89 ha Bantargebang + 15 TPA legacy × Rp 18 M/ha biaya remediasi, dianualisasi 20 tahun'],
  ];
  const PRD = [
    ['Hari kerja hilang', pyRound(1.5 * 6100000 * 322290 / 1e12, 2), 'World Bank WSP: 1,5 hari/pekerja/tahun × 6,1 juta pekerja Jakarta (BPS 2024) × Rp 322.290/hari (UMP DKI 2026 + overhead 1,4×)'],
    ['Depresiasi properti sekitar TPS', pyRound(0.0635 * 1200e6 * 500 * 2668 * 0.03 * 0.35 / 1e12, 2), 'UGM 2023 (harga hedonik TPA Manggar): −6,35% nilai properti radius 1 km × 500 unit/TPS × 2.668 TPS × yield 3%/tahun'],
  ];
  const sumv = (a) => a.reduce((t, [, v]) => t + v, 0);
  const KES_2026 = sumv(KES), LNG_2026 = sumv(LNG), PRD_2026 = sumv(PRD);
  const BASE_KES = grow(KES_2026), BASE_LNG = grow(LNG_2026), BASE_PRD = grow(PRD_2026);
  const BASE_TOT = BASE_KES.map((v, i) => pyRound(v + BASE_LNG[i] + BASE_PRD[i], 2));

  const SKENARIO = {
    inaksi: { label: 'Tanpa intervensi', desc: 'Tidak ada perubahan kebijakan. Kerugian kesehatan, lingkungan, dan pendapatan warga terus bertambah setiap tahun.', red_kes: 0, red_lng: 0, red_prd: 0, inv_base: 0, inv_rate: 0 },
    minimum: { label: 'Minimum', desc: 'Langkah awal dengan anggaran terbatas: lebih banyak TPS 3R diaktifkan, 20% bank sampah beroperasi penuh, dan edukasi pilah sampah di kelurahan percontohan.', red_kes: 0.06, red_lng: 0.07, red_prd: 0.05, inv_base: 0.85, inv_rate: 0.022 },
    moderat: { label: 'Moderat', desc: 'Program aktif lintas wilayah: TPS 3R beroperasi lebih optimal, 40% bank sampah aktif, fasilitas pengolahan ditingkatkan, dan RDF Rorotan berjalan penuh.', red_kes: 0.31, red_lng: 0.37, red_prd: 0.27, inv_base: 1.50, inv_rate: 0.047 },
    maksimum: { label: 'Maksimum', desc: 'Transformasi menyeluruh menuju Zero Open Dumping: hampir semua sampah organik dialihkan ke komposting/biodigester, PSEL dan RDF beroperasi penuh, 70% bank sampah aktif, seluruh TPS terbuka ditutup atau diupgrade, dan gas metana Bantargebang ditangkap.', red_kes: 0.54, red_lng: 0.71, red_prd: 0.49, inv_base: 3.00, inv_rate: 0.090 },
  };

  function series(key) {
    const s = SKENARIO[key];
    return {
      kes: BASE_KES.map((v) => pyRound(v * (1 - s.red_kes), 2)),
      lng: BASE_LNG.map((v) => pyRound(v * (1 - s.red_lng), 2)),
      prd: BASE_PRD.map((v) => pyRound(v * (1 - s.red_prd), 2)),
      inv: YEARS.map((_, i) => pyRound(s.inv_base * (1 + s.inv_rate) ** i, 2)),
    };
  }

  // Ringkasan sama dengan _stat_cards dan _savings_card di panel6.py
  function ringkasan(key) {
    const { kes, lng, prd, inv } = series(key);
    const tot2026 = pyRound(kes[0] + lng[0] + prd[0], 1);
    const pct = (b, v) => pyRound((1 - v / b) * 100);
    const cumBase = BASE_TOT.reduce((a, b) => a + b, 0);
    const cumScen = kes.reduce((a, v, i) => a + v + lng[i] + prd[i], 0);
    const cumInv = inv.reduce((a, b) => a + b, 0);
    return {
      kes2026: kes[0], lng2026: lng[0], prd2026: prd[0], tot2026,
      red: { kes: pct(BASE_KES[0], kes[0]), lng: pct(BASE_LNG[0], lng[0]), prd: pct(BASE_PRD[0], prd[0]), tot: pct(BASE_TOT[0], tot2026) },
      net: pyRound(cumBase - cumScen - cumInv, 0),
      bcr: cumInv > 0 ? pyRound((cumBase - cumScen) / cumInv, 1) : 0,
      saving2045: pyRound(BASE_TOT[19] - (kes[19] + lng[19] + prd[19]), 1),
    };
  }

  return { YEARS, KES, LNG, PRD, KES_2026, LNG_2026, PRD_2026, BASE_KES, BASE_LNG, BASE_PRD, BASE_TOT, SKENARIO, series, ringkasan, pyRound };
}));
