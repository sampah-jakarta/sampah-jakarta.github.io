// Halaman Dampak. Angka dari js/dampak-model.js (port panel6.py).
const D = Dampak;
const setK = (k, v) => document.querySelectorAll(`[data-k="${k}"]`).forEach((el) => { el.textContent = v; });
const T = (v, d = 1) => `Rp ${Number(v).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d })} T`;
const C_KES = '#C0392B', C_LNG = '#EF7C00', C_PRD = '#7FB3E3';

const RISET = [
  ['Pengelolaan sampah menyeluruh menurunkan kasus DBD dan leptospirosis', 'Studi manajemen lingkungan menunjukkan pengelolaan sampah yang baik menekan indeks vektor: rumah dengan jentik turun hingga 55% dan kepadatan pupa turun 73%; intervensi terpadu di Makassar menurunkan 83% kasus DBD selama 8 tahun. Untuk leptospirosis, infestasi tikus adalah prediktor terkuat (PLoS NTD); menghilangkan sisa makanan dan menutup sampah terbuka memutus sumbernya. Angka di sini konservatif (hanya mengkredit porsi pengelolaan sampah): minimum — DBD turun 5,7%, leptospirosis 7,6%; moderat — 22% dan 26%; maksimum — 40% dan 45%.'],
  ['Menutup TPS terbuka mengurangi gangguan pernapasan', 'TPA/TPS terbuka menyebarkan debu halus (PM2.5) yang memicu penyakit pernapasan warga sekitar, dikonfirmasi studi dumpsite Chennai dan Sabak, Kelantan. Uji coba penutupan TPS terbuka di Rorotan (DLH Jakarta 2023) menurunkan polutan halus 15% dalam radius 1 km. Minimum: turun 5%. Moderat: turun 38%. Maksimum (seluruh open dumping ditutup/diupgrade): turun 65%.'],
  ['Mengalihkan sampah organik serta PSEL/RDF memangkas metana Bantargebang', 'IPCC AR6: pengungkit terkuat menurunkan metana adalah mengalihkan sampah organik dari landfill dan menangkap gas sedini mungkin. PSEL/RDF mengurangi emisi ~30% per ton dibanding landfill. Minimum: turun 5%. Moderat (RDF Rorotan penuh): turun 50%. Maksimum (organik dialihkan + PSEL/RDF penuh + gas capture): turun 85%.'],
  ['Cakupan pengumpulan penuh mengurangi sampah ke sungai dan laut', 'Studi kebocoran plastik laut (Jambeck 2015 dan turunannya): hingga 71,8% sampah salah-kelola disebabkan tidak adanya layanan pengumpulan. Minimum: pencemaran sungai turun 8%. Moderat: turun 32%. Maksimum: turun 65%.'],
  ['Catatan: angka ini untuk perencanaan, bukan audit', 'Estimasi bersifat indikatif. Biaya kesehatan dihitung dari data nasional yang disesuaikan dengan proporsi Jakarta; biaya lingkungan sebagian mengacu studi di lokasi sebanding. Biaya intervensi hanya mencakup operasional fasilitas yang ada, belum termasuk pembangunan baru. Untuk hasil lebih akurat diperlukan data penyakit berbasis sampah tingkat DKI, studi nilai properti sekitar TPS Jakarta, dan penilaian kerusakan ekosistem Ciliwung dan Teluk Jakarta.'],
];
const BCR_NOTE = {
  minimum: 'Efisiensi per rupiah tinggi karena biaya kecil sudah mencegah kerugian yang paling mudah diatasi, tetapi kerugian yang belum tercegah masih besar — lihat penghematan bersih yang lebih kecil.',
  moderat: 'Rasio ini mengukur kerugian yang dicegah per rupiah investasi, bukan total dampak. Bandingkan juga dengan penghematan bersih di atas.',
  maksimum: 'Efisiensi per rupiah lebih rendah karena langkah awal (mengaktifkan TPS 3R yang ada) murah dan berdampak besar, sedangkan transformasi penuh butuh investasi jauh lebih besar. Total kerugian yang dicegah tetap paling besar.',
};

// Segmented control skenario
const seg = document.getElementById('seg');
seg.innerHTML = Object.entries(D.SKENARIO).map(([k, s]) => `<button role="radio" data-s="${k}">${s.label}</button>`).join('');
seg.addEventListener('click', (e) => { if (e.target.dataset.s) render(e.target.dataset.s); });

document.getElementById('dampak-legend').innerHTML = [['Biaya kesehatan', C_KES], ['Kerusakan lingkungan', C_LNG], ['Produktivitas hilang', C_PRD]]
  .map(([l, c]) => `<li><i style="background:${c};height:10px;width:10px;border-radius:3px"></i>${l}</li>`).join('')
  + '<li class="only-sken"><i class="dash" style="border-color:#9AA5B1"></i>Tanpa intervensi (acuan)</li><li class="only-sken"><i class="dash" style="border-color:#2E7D32"></i>Biaya intervensi</li>';

function render(key) {
  const s = D.SKENARIO[key];
  const r = D.ringkasan(key);
  const ser = D.series(key);
  const inaksi = key === 'inaksi';
  seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', b.dataset.s === key));
  document.getElementById('sken-desc').textContent = s.desc;
  const delta = (p) => (inaksi || !p ? 'per tahun (2026)' : `per tahun · −${p}% dibanding tanpa intervensi`);
  setK('kes', T(r.kes2026)); setK('kes_d', delta(r.red.kes));
  setK('lng', T(r.lng2026)); setK('lng_d', delta(r.red.lng));
  setK('prd', T(r.prd2026)); setK('prd_d', delta(r.red.prd));
  setK('tot', T(r.tot2026)); setK('tot_d', delta(r.red.tot));
  setK('tot_note', inaksi ? 'Bertambah 3,5% setiap tahun bila tidak ada perubahan' : `Skenario ${s.label.toLowerCase()}`);
  document.querySelectorAll('.only-sken').forEach((el) => { el.style.display = inaksi ? 'none' : ''; });

  const traces = [];
  if (!inaksi) traces.push({ x: D.YEARS, y: D.BASE_TOT, name: 'Tanpa intervensi', mode: 'lines', line: { color: '#9AA5B1', width: 1.5, dash: 'dash' }, hovertemplate: 'Tanpa intervensi: Rp %{y:.1f} T<extra></extra>' });
  [['kes', 'Biaya kesehatan', C_KES, 'rgba(192,57,43,.22)'], ['lng', 'Kerusakan lingkungan', C_LNG, 'rgba(239,124,0,.22)'], ['prd', 'Produktivitas hilang', C_PRD, 'rgba(127,179,227,.35)']]
    .forEach(([k, n, c, f]) => traces.push({ x: D.YEARS, y: ser[k], name: n, stackgroup: 'a', mode: 'lines', line: { color: c, width: 1.5 }, fillcolor: f, hovertemplate: `${n}: Rp %{y:.1f} T<extra></extra>` }));
  if (!inaksi) traces.push({ x: D.YEARS, y: ser.inv, name: 'Biaya intervensi', mode: 'lines', line: { color: '#2E7D32', width: 2, dash: 'dot' }, hovertemplate: 'Biaya intervensi: Rp %{y:.2f} T<extra></extra>' });
  const last = ser.kes[19] + ser.lng[19] + ser.prd[19];
  Plotly.react('dampak-chart', traces, {
    ...PLOT_LAYOUT, showlegend: false, hovermode: 'x unified', margin: { t: 10, l: 50, r: 20, b: 30 },
    xaxis: { ...PLOT_LAYOUT.xaxis, dtick: 4 },
    yaxis: { ...PLOT_LAYOUT.yaxis, rangemode: 'tozero', title: { text: 'Rp triliun/tahun', font: { size: 11 } } },
    annotations: inaksi ? [] : [{ x: 2045, y: last, text: `−Rp ${fmt(r.saving2045, 1)} T dibanding tanpa intervensi`, showarrow: true, arrowhead: 2, arrowcolor: '#2E7D32', ax: -110, ay: -40, font: { size: 11, color: '#2E7D32' }, bgcolor: 'rgba(255,255,255,.9)', bordercolor: '#2E7D32', borderwidth: 1, borderpad: 4 }],
  }, { responsive: true, displayModeBar: false });

  document.getElementById('savings').innerHTML = inaksi
    ? `<div class="panel-head"><h2>Dampak skenario</h2></div><p class="body-text">Pilih salah satu skenario intervensi di atas untuk melihat kerugian yang dapat dicegah dan perkiraan biayanya.</p>
       <div class="big-num"><span>Total kerugian 2026–2045</span><b>${T(D.BASE_TOT.reduce((a, b) => a + b, 0), 0)}</b><small>dari ${T(D.BASE_TOT[0])} (2026) menjadi ${T(D.BASE_TOT[19])} (2045) per tahun</small></div>`
    : `<div class="panel-head"><h2>Dampak skenario ${s.label.toLowerCase()}</h2></div>
       <p class="kbars-title">Reduksi kerugian dibanding tanpa intervensi</p>
       <div class="red-rows">${[['Biaya kesehatan', r.red.kes, C_KES], ['Kerusakan lingkungan', r.red.lng, C_LNG], ['Produktivitas', r.red.prd, '#0B2A5B']]
        .map(([l, p, c]) => `<div><span>${l}</span><b style="color:${c}">−${p}%</b></div>`).join('')}</div>
       <div class="big-num"><span>Penghematan bersih 2026–2045</span><b>${T(r.net, 0)}</b><small>kerugian yang dicegah dikurangi biaya intervensi</small></div>
       <div class="bcr"><span>Rasio manfaat-biaya</span><b>${fmt(r.bcr, 1)}×</b></div>
       <p class="source-note">${BCR_NOTE[key]}</p>`;
}

// Ruang cadangan (sama dengan _safety_capacity_box)
(function safety() {
  const MU = 7400, SIGMA = 400, Z = 2.05, L = 3;
  const sc = Math.round(Z * SIGMA * Math.sqrt(L));
  const total = MU + Math.round(sc / L);
  setK('sc_formula', `2,05 × ${SIGMA} × √${L} ≈ ${fmt(sc)} ton/hari`);
  document.getElementById('safety').innerHTML = [
    ['Rata-rata harian', `${fmt(MU)} ton/hari`, 'sampah masuk Bantargebang (2022–2026)', 'var(--navy)'],
    ['Naik-turun harian', `±${fmt(SIGMA)} ton/hari`, 'variasi normal: musim, hari raya, pertumbuhan kawasan', 'var(--blue-mid)'],
    ['Target aman', '98%', 'cukup pada 98 dari 100 hari', 'var(--orange)'],
    ['Ruang cadangan', `${fmt(sc)} ton/hari`, 'minimum di atas proyeksi rata-rata', 'var(--kritis)'],
    ['Target kapasitas', `≥ ${fmt(total)} ton/hari`, 'proyeksi + ruang cadangan', 'var(--aman)'],
  ].map(([l, v, sub, c]) => `<div class="metric" style="border-top-color:${c}"><span>${l}</span><b style="color:${c}">${v}</b><small>${sub}</small></div>`).join('');
}());

// Langkah, komponen, reduksi, riset
document.getElementById('steps').innerHTML = [
  ['Baseline kerugian', `Jumlah seluruh komponen biaya = ${T(D.BASE_TOT[0])}/tahun (2026)`, 'var(--kritis)'],
  ['Proyeksi 2026–2045', 'Kerugian tumbuh 3,5% per tahun (penduduk + intensitas kontak lingkungan)', 'var(--orange)'],
  ['Efek skenario', 'Kerugian tiap kategori × (1 − reduksi kategori berbasis riset)', 'var(--blue-mid)'],
  ['Kerugian yang dicegah', 'Baseline − skenario, per tahun dan kumulatif', 'var(--aman)'],
].map(([t, d, c], i) => `<div class="metric" style="border-top-color:${c}"><span style="color:${c}">Langkah ${i + 1}</span><b class="step-t">${t}</b><small>${d}</small></div>`).join('');

document.getElementById('komponen').innerHTML = [['Biaya kesehatan', D.KES_2026, D.KES, C_KES], ['Kerusakan lingkungan', D.LNG_2026, D.LNG, C_LNG], ['Produktivitas hilang', D.PRD_2026, D.PRD, '#0B2A5B']]
  .map(([t, tot, comps, c]) => `<div class="komp-col"><div class="komp-col-head" style="border-color:${c};color:${c}"><span>${t}</span><b>${T(tot)}/tahun</b></div>
    ${comps.map(([l, v, src]) => `<div class="komp-item" style="border-left-color:${c}"><div><b>${l}</b><span style="color:${c}">Rp ${fmt(v, 2)} T (${fmt(v / tot * 100)}%)</span></div><small>${src}</small></div>`).join('')}</div>`).join('');

const RED_BASIS = [
  ['Kesehatan', 'red_kes', C_KES, 'DBD (indeks vektor turun 55–73%; intervensi terpadu −83% Makassar, PMC6695203), leptospirosis (kontrol tikus dan sampah terbuka, PLoS NTD), diare (air-sanitasi −24,5%, PMC8998175), ISPA (tutup open dumping, PMC6981880)'],
  ['Lingkungan', 'red_lng', C_LNG, 'Metana (IPCC AR6 WG3: alihkan organik + gas capture, maks −85%), sungai dan plastik laut (Jambeck 2015: 71,8% kebocoran dari sampah tak terkumpul), degradasi tanah (remediasi lahan, KLHK 2022)'],
  ['Produktivitas', 'red_prd', '#0B2A5B', 'Hari kerja hilang (proporsional reduksi penyakit, World Bank WSP), depresiasi properti (80% nilai pulih pasca-penutupan TPA — OII Landfill LA; US EPA brownfield)'],
];
document.getElementById('reduksi').innerHTML = '<div class="red-row red-head"><span>Kategori</span><span>Min</span><span>Mod</span><span>Maks</span><span>Dasar riset</span></div>'
  + RED_BASIS.map(([l, k, c, b]) => `<div class="red-row"><b style="color:${c}">${l}</b>${['minimum', 'moderat', 'maksimum']
    .map((s) => `<b style="color:${c}">−${Math.round(D.SKENARIO[s][k] * 100)}%</b>`).join('')}<small>${b}</small></div>`).join('');
document.getElementById('riset').innerHTML = RISET.map(([t, b]) => `<details class="asumsi-item"><summary>${t}</summary><p class="body-text">${b}</p></details>`).join('');

render('inaksi');
