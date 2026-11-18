// Kontrol skenario bersama (Simulasi dan Pembiayaan). Teks sama dengan pages/controls.py dashboard lama.

const LEVELS = ['eksisting', 'minimum', 'moderat', 'maksimum'];
const LEVEL_NAMA = ['Eksisting', 'Minimum', 'Moderat', 'Maksimum'];

const SKENARIO = [
  { key: 'timbulan', judul: 'Pengurangan sampah', def: 'moderat',
    singkat: ['Pengurangan timbulan −3%', 'Pengurangan timbulan −4%', 'Pengurangan timbulan −8%', 'Pengurangan timbulan −12%'],
    asumsi: [
      '−3% kumulatif 2045 berdasarkan laju aktual nasional 2,12%/tahun tanpa program aktif — pertumbuhan konsumsi mengimbangi efisiensi yang ada. (Sumber: KLHK 2017; Waste4Change 2025)',
      '−4% kumulatif 2045 berdasarkan efek kampanye edukasi one-shot yang cenderung memudar dalam 2–3 tahun tanpa insentif finansial berkelanjutan. (Sumber: KLHK/SIPSN 2025)',
      '−8% kumulatif 2045 berdasarkan kombinasi edukasi RT dan kewajiban olah mandiri bisnis (Ingub 5/2026) — Bandung dengan program aktif penuh mencapai 14,46%, Jakarta diproyeksikan separuhnya. (Sumber: SIPSN 2023; Ingub DKI 5/2026)',
      '−12% kumulatif 2045 berdasarkan batas atas realistis kondisi fiskal terbatas — Jakstanas 30% tidak tercapai secara nasional, realisasinya hanya 19,7%. (Sumber: SIPSN 2023; Waste4Change 2025)'] },
  { key: 'tps3r', judul: 'Utilisasi TPS 3R', def: 'moderat',
    singkat: ['Utilisasi TPS 3R sebesar 21%', 'Utilisasi TPS 3R sebesar 35%', 'Utilisasi TPS 3R sebesar 55%', 'Utilisasi TPS 3R sebesar 70%'],
    asumsi: [
      '~21% utilisasi berdasarkan data aktual 2026 — terhambat input sampah bercampur, SDM terbatas, dan off-taker organik tidak reliabel. (Sumber: DLH Jakarta 2026; UNDIP 2024)',
      '35% utilisasi berdasarkan perbaikan kualitas input dari kewajiban pemilahan Ingub 5/2026 dan penambahan operator dasar — batas bawah TPS 3R terkelola di Indonesia versi ADB 2019. (Sumber: ADB 2019; Ingub DKI 5/2026; UNDIP 2024)',
      '55% utilisasi setara TPS 3R terbaik nasional — pelatihan SDM aktif dan off-taker organik berkontrak. Mendekati batas bawah regional ADB 2019 (~60%). (Sumber: ADB 2019; JURRITEK 2024; UNDIP 2024)',
      '70% utilisasi — titik tengah rentang best-practice regional ADB 2019 (60–80%) untuk TPS 3R well-managed di Indonesia: pemilahan konsisten, SDM terlatih, dan off-taker organik reliabel. (Sumber: ADB 2019; DLH Jakarta 2026)'] },
  { key: 'bs', judul: 'Bank sampah', def: 'moderat',
    singkat: ['10% dari 1.736 BSU terdaftar aktif (~174 unit)', '12% BSU aktif (~208 unit)', '18% BSU aktif (~313 unit)', '28% BSU aktif (~486 unit)'],
    asumsi: [
      '~10% BSU aktif dari 1.736 terdaftar berdasarkan data operasional 2026 — mayoritas tidak aktif karena tidak ada insentif finansial yang mempertahankan kegiatan. (Sumber: DLH Jakarta 2026)',
      '12% BSU aktif berdasarkan peningkatan permintaan dari Ingub 5/2026, tapi tanpa subsidi harga beli drop-out tetap ~50%. (Sumber: Ramayadi & Sariningsih 2020; PMC/NCBI 2025)',
      '18% BSU aktif berdasarkan dorongan Ingub tanpa subsidi signifikan — nasional 4.341 BSU hanya memproses <1% total sampah. (Sumber: PMC/NCBI 2025)',
      '28% BSU aktif (~488 unit) berdasarkan batas atas realistis dengan subsidi harga beli minimal untuk menutup biaya operasional BSU. (Sumber: PMC/NCBI 2025; Ramayadi & Sariningsih 2020)'] },
  { key: 'upgrade', judul: 'Upgrade TPS', def: 'eksisting',
    singkat: ['Tanpa upgrade TPS', '15 unit Tipe 3 diupgrade', '31 unit Tipe 3+4 diupgrade', '48 unit Tipe 3+4 diupgrade'],
    asumsi: [
      'Tanpa upgrade — 884 unit Tipe 3+4 beroperasi sebagai titik transfer penuh. Hanya 48 unit terverifikasi luas >200 m² memenuhi syarat Permen PU 03/2013. (Sumber: DLH Jakarta — Data TPS 7 Mei 2026; Permen PU 03/PRT/M/2013)',
      '15 unit Tipe 3 diupgrade menjadi TPS 3R — mayoritas di Jakarta Selatan. Kapasitas tambahan per kelurahan: jumlah unit eligible × 15/48 × 25 ton/hari × utilisasi TPS 3R (pct × reduksi). (Sumber: DLH Jakarta — Data TPS 7 Mei 2026; Permen PU 03/PRT/M/2013)',
      '31 unit diupgrade (15 Tipe 3 + 16 Tipe 4) — unit per kelurahan sesuai data lokasi aktual TPS eligible. Kapasitas: jumlah unit eligible × 31/48 × 25 ton/hari × utilisasi TPS 3R. (Sumber: DLH Jakarta — Data TPS 7 Mei 2026)',
      '48 unit diupgrade (seluruh eligible: 15 Tipe 3 + 33 Tipe 4) — kapasitas penuh: jumlah unit eligible per kelurahan × 25 ton/hari × utilisasi TPS 3R (pct × reduksi). ~400 unit lain berpotensi jika data luas lahan dilengkapi. (Sumber: DLH Jakarta 2026; Permen PU 03/PRT/M/2013)'] },
  { key: 'fpsa', judul: 'RDF kumulatif', def: 'eksisting',
    singkat: ['Kapasitas RDF 466 tpd', 'Kapasitas RDF 981 tpd', 'Kapasitas RDF 1.800 tpd', 'Kapasitas RDF 2.000 tpd'],
    asumsi: [
      '466 tpd RDF kumulatif berdasarkan realisasi Mei 2026 — Rorotan dalam fase trial, subsidi Rp 170 M/tahun sudah dikunci APBD 2026. (Sumber: DLH Jakarta — Zero OD 3 Jul 2026)',
      '981 tpd target Desember 2026 berdasarkan roadmap Zero OD — hambatan tersisa bersifat teknis dan sosial, bukan fiskal. (Sumber: DLH Jakarta — Zero OD 3 Jul 2026)',
      '1.800 tpd target Desember 2027 berdasarkan roadmap Zero OD — asumsi hambatan teknis selesai dan off-taker industri semen/pembangkit siap. (Sumber: DLH Jakarta — Zero OD 3 Jul 2026)',
      '2.000 tpd target Desember 2028 berdasarkan roadmap Zero OD — batas atas memperhitungkan residu 10–15% yang tidak bisa dikonversi ke RDF. (Sumber: DLH Jakarta — Zero OD 3 Jul 2026)'] },
  { key: 'psel', judul: 'PSEL', def: 'eksisting',
    singkat: ['Kapasitas PSEL 172 tpd', 'Kapasitas PSEL 948 tpd', 'Kapasitas PSEL 2.064 tpd', 'Kapasitas PSEL 2.582 tpd'],
    asumsi: [
      '172 tpd berdasarkan realisasi Mei 2026 — fase awal operasional PSEL. (Sumber: DLH Jakarta — Zero OD 3 Jul 2026)',
      '948 tpd target Desember 2026 berdasarkan roadmap Zero OD. (Sumber: DLH Jakarta — Zero OD 3 Jul 2026)',
      '2.064 tpd target Desember 2027 berdasarkan roadmap Zero OD. (Sumber: DLH Jakarta — Zero OD 3 Jul 2026)',
      '2.582 tpd target Desember 2028 berdasarkan roadmap Zero OD. (Sumber: DLH Jakarta — Zero OD 3 Jul 2026)'] },
];

// Bangun kartu slider. keys = dimensi yang dipakai halaman; onChange(state) dipanggil tiap perubahan.
function buildSkenario(grid, keys, onChange) {
  const items = SKENARIO.filter((s) => keys.includes(s.key));
  const state = Object.fromEntries(items.map((s) => [s.key, s.def]));
  grid.innerHTML = items.map((s, n) => `<div class="sken-card">
      <p class="sken-title"><span class="sken-no">${n + 1}</span>${s.judul}</p>
      <input type="range" min="0" max="3" step="1" value="${LEVELS.indexOf(s.def)}" data-key="${s.key}" class="range" aria-label="${s.judul}">
      <div class="sken-ticks">${LEVEL_NAMA.map((l) => `<span>${l.slice(0, 3)}.</span>`).join('')}</div>
      <p class="sken-level" data-level="${s.key}"></p>
      <p class="sken-desc" data-desc="${s.key}"></p>
    </div>`).join('');
  const refresh = () => items.forEach((s) => {
    const i = LEVELS.indexOf(state[s.key]);
    grid.querySelector(`[data-level="${s.key}"]`).textContent = LEVEL_NAMA[i];
    grid.querySelector(`[data-desc="${s.key}"]`).textContent = s.singkat[i];
    grid.querySelector(`input[data-key="${s.key}"]`).value = i;
  });
  grid.addEventListener('input', (e) => {
    if (!e.target.dataset.key) return;
    state[e.target.dataset.key] = LEVELS[Number(e.target.value)];
    refresh(); onChange({ ...state });
  });
  refresh();
  return {
    state: () => ({ ...state }),
    set(level) { items.forEach((s) => { state[s.key] = level; }); refresh(); onChange({ ...state }); },
  };
}

function renderAsumsi(el, keys) {
  el.innerHTML = SKENARIO.filter((s) => keys.includes(s.key)).map((s, n) => `<details class="asumsi-item">
      <summary><span class="sken-no">${n + 1}</span>${s.judul}</summary>
      <ul>${s.asumsi.map((a, i) => `<li><b>${LEVEL_NAMA[i]}.</b> ${a}</li>`).join('')}</ul>
    </details>`).join('');
}
