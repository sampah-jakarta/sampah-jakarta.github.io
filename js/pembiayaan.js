// Halaman Pembiayaan. Biaya dari Sim.financing (paritas dengan R); alokasi sumber dana dari data/donor.json
// (tabel sim.ref_pembiayaan_*), sama dengan panel5.py.

const KOMPONEN = [
  ['infrastruktur', 'Infrastruktur', '#0B2A5B'], ['operasional', 'Operasional (RDF + FPSA)', '#7FB3E3'],
  ['pembinaan', 'Pembinaan', '#F26B21'], ['monev', 'Monev', '#7A8B96'],
];
const HARGA = [
  ['Upgrade TPS → TPS 3R', 'per unit', 'Rp 5 miliar'], ['Bank sampah unit baru', 'per unit', 'Rp 150 juta'],
  ['Pembinaan bank sampah', 'per unit/tahun', 'Rp 50 juta'], ['Operasional RDF Rorotan', 'per tahun (kapasitas penuh)', 'Rp 150 miliar'],
  ['Operasional FPSA baru', 'per tahun', 'Rp 350 miliar'], ['Operasional PSEL (WtE)', 'per tahun (kapasitas penuh)', 'Rp 850 miliar'],
  ['Program pengurangan sampah', 'per paket skenario', 'Rp 150–600 miliar'], ['Monev & koordinasi OPD', 'dari total program', '3%'],
];
const SKEMA = [
  ['APBD DKI Jakarta', 'Sumber utama operasional TPS 3R, pembinaan bank sampah, pemantauan, dan armada pengangkutan. Fleksibel dan langsung di bawah kendali Bappeda/DLH, tetapi tidak memadai untuk infrastruktur skala besar seperti RDF atau fasilitas sampah menjadi energi.', '#7FB3E3'],
  ['KPBU (Kerja Sama Pemerintah dan Badan Usaha)', 'Untuk fasilitas berkapasitas besar seperti RDF, PLTSa, dan FPSA, dengan model availability payment atau pembayaran berbasis layanan seperti di RDF Rorotan. Landasan hukum: Perpres 38/2015 dan PMK 190/2018.', '#0B2A5B'],
  ['DAK Lingkungan Hidup (APBN)', 'Hibah pemerintah pusat melalui KLHK untuk TPS 3R komunal dan sarana pemilahan. DKI Jakarta kerap tidak memenuhi syarat karena kapasitas fiskalnya dinilai tinggi, sehingga perlu advokasi khusus.', '#F26B21'],
  ['Retribusi persampahan', 'Tarif jasa kebersihan rumah tangga dan komersial untuk membiayai operasional. Tarif diferensial berbasis volume memberi insentif bagi penghasil sampah terbesar untuk mengurangi timbulan.', '#C0392B'],
  ['Obligasi / sukuk hijau daerah', 'Pembiayaan jangka panjang (20–30 tahun) untuk PLTSa dan fasilitas daur ulang skala besar. Kerangka acuan: Green Bond Principles dan POJK 60/2017.', '#0B2A5B'],
  ['Hibah internasional', 'Untuk proyek percontohan dan kajian kebijakan, seperti TPS 3R skala komunitas dan ekonomi sirkular. Sumber yang bisa diadvokasi: JICA, ADB, World Bank/IFC, GEF, SECO, GGGI, dan C40 Cities.', '#0D8B7A'],
];

const setK = (k, v) => document.querySelectorAll(`[data-k="${k}"]`).forEach((el) => { el.textContent = v; });
// Format sama dengan panel5.py _rp(): triliun jika ≥ 1.000 miliar
const rp = (m) => (m >= 1000 ? `Rp ${fmt(m / 1000, 1)} T` : `Rp ${fmt(m)} M`);

Promise.all([loadData('sim_ref.json'), loadData('donor.json')]).then(([ref, pemb]) => {
  const src = Object.fromEntries(pemb.sources.map((s) => [s.kode, s]));

  document.getElementById('harga').innerHTML = '<thead><tr><th>Item</th><th>Satuan</th><th>Estimasi</th></tr></thead><tbody>'
    + HARGA.map(([i, s, v]) => `<tr><td>${i}</td><td class="muted">${s}</td><td class="harga-val">${v}</td></tr>`).join('') + '</tbody>';
  document.getElementById('bar-legend').innerHTML = KOMPONEN.map(([, l, c]) => `<li><i style="background:${c};height:10px;width:10px;border-radius:3px"></i>${l}</li>`).join('');
  document.getElementById('skema').innerHTML = SKEMA.map(([t, b, c], i) => `<article class="skema-card" style="border-top-color:${c}">
      <span class="sken-no" style="background:${c}">${i + 1}</span><h3>${t}</h3><p>${b}</p></article>`).join('');
  alokasi(pemb, src);
  donors(pemb.donor);

  const update = (sken) => {
    const res = Sim.financing(ref, sken);
    const d = res.data;
    const total = res.total_keseluruhan;
    const komp = Object.fromEntries(KOMPONEN.map(([k]) => [k, d.reduce((t, r) => t + r[k], 0)]));
    const dana = {};
    Object.entries(komp).forEach(([k, v]) => Object.entries(pemb.alokasi[k] || {}).forEach(([s, pct]) => {
      dana[s] = (dana[s] || 0) + v * pct / 100;
    }));
    const apbd = dana.apbd || 0;
    setK('total', rp(total));
    setK('ops', rp(komp.operasional)); setK('ops_pct', `${fmt(komp.operasional / total * 100)}% dari total`);
    setK('apbd', rp(apbd)); setK('apbd_pct', `${fmt(apbd / total * 100)}% dari total`);
    setK('gap', rp(total - apbd)); setK('gap_pct', `${fmt(100 - apbd / total * 100)}% gap pendanaan`);

    const per = d.map((r) => r.periode.replace(' ', '<br>'));
    Plotly.react('anggaran', KOMPONEN.map(([k, l, c]) => ({
      type: 'bar', name: l, x: per, y: d.map((r) => r[k]), marker: { color: c },
      hovertemplate: `${l}: %{y:,.0f} miliar<extra></extra>`,
    })), {
      ...PLOT_LAYOUT, barmode: 'stack', bargap: 0.45, showlegend: false, margin: { t: 30, l: 55, r: 10, b: 50 },
      yaxis: { ...PLOT_LAYOUT.yaxis, title: { text: 'Miliar Rp', font: { size: 11 } } },
      annotations: d.map((r, i) => ({ x: per[i], y: r.total, text: `<b>${rp(r.total)}</b>`, showarrow: false, yanchor: 'bottom', yshift: 4, font: { size: 11, color: '#0B2A5B' } })),
    }, { responsive: true, displayModeBar: false });

    const ordered = Object.entries(dana).sort((a, b) => b[1] - a[1]);
    Plotly.react('donut-dana', [{
      type: 'pie', hole: 0.68, sort: false, direction: 'clockwise', textinfo: 'none',
      labels: ordered.map(([k]) => src[k]?.nama || k), values: ordered.map(([, v]) => v),
      marker: { colors: ordered.map(([k]) => src[k]?.warna || '#ccc'), line: { color: '#fff', width: 3 } },
      customdata: ordered.map(([, v]) => rp(v)), hovertemplate: '<b>%{label}</b><br>%{percent} · %{customdata}<extra></extra>',
    }], {
      ...PLOT_LAYOUT, showlegend: false, margin: { t: 0, l: 0, r: 0, b: 0 },
      annotations: [{ text: `<b style="font-size:20px">${rp(total)}</b><br><span style="font-size:11px;color:#6B7C93">total 2025–2045</span>`, x: 0.5, y: 0.5, xref: 'paper', yref: 'paper', showarrow: false }],
    }, { responsive: true, displayModeBar: false });
    document.getElementById('dana-list').innerHTML = ordered.map(([k, v]) => `<div class="dana-row">
      <i style="background:${src[k]?.warna || '#ccc'}"></i><span>${src[k]?.nama || k}</span>
      <em>${fmt(v / total * 100)}%</em><b>${rp(v)}</b></div>`).join('');
  };

  const ctl = buildSkenario(document.getElementById('sken-grid'), ['timbulan', 'bs', 'upgrade'], update);
  document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => ctl.set(b.dataset.preset)));
  update(ctl.state());
});

function alokasi(pemb, src) {
  document.getElementById('alokasi').innerHTML = KOMPONEN.map(([k, l]) => {
    const a = Object.entries(pemb.alokasi[k] || {}).sort((x, y) => y[1] - x[1]);
    const bar = a.map(([s, p]) => `<span style="width:${p}%;background:${src[s]?.warna || '#ccc'}" title="${src[s]?.nama || s} ${p}%"></span>`).join('');
    const rows = a.map(([s, p]) => `<li><i style="background:${src[s]?.warna || '#ccc'}"></i><b>${p}%</b> ${src[s]?.nama || s}<small>${pemb.catatan?.[k]?.[s] || ''}</small></li>`).join('');
    return `<div class="alok"><p class="alok-title">${l}</p><div class="alok-bar">${bar}</div><ul>${rows}</ul></div>`;
  }).join('');
}

function donors(list) {
  const tipe = [...new Set(list.flatMap((d) => d.tipe.split('·').map((t) => t.trim())))].sort();
  const sel = document.getElementById('donor-filter');
  tipe.forEach((t) => sel.insertAdjacentHTML('beforeend', `<option>${t}</option>`));
  const draw = () => {
    const f = sel.value;
    document.getElementById('donor').innerHTML = list.filter((d) => !f || d.tipe.includes(f)).map((d) => `<article class="donor-card">
      <p class="donor-org">${d.donor}</p><h3>${d.program}</h3><p class="donor-amt">${d.besaran}</p>
      <div class="chips">${d.tipe.split('·').map((t) => `<span class="chip">${t.trim()}</span>`).join('')}</div>
      <p class="donor-desc">${d.fokus}</p>
      ${d.url ? `<a href="${d.url}" target="_blank" rel="noopener">Sumber ↗</a>` : ''}</article>`).join('');
  };
  sel.addEventListener('change', draw);
  draw();
}
