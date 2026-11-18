// Halaman Infrastruktur. Butuh js/common.js.

// Warna dan ukuran titik sama dengan dashboard lama (panel2.py JENIS_COLOR)
const JENIS = [
  ['TPS Tipe 1', '#90CAF9', 3], ['TPS Tipe 2', '#2196F3', 3.5], ['TPS Tipe 3', '#1565C0', 4], ['TPS Tipe 4', '#0D2F6E', 4.5],
  ['TPS 3R', '#43A047', 6], ['Bank Sampah', '#FFB300', 2.5], ['Saringan', '#7B1FA2', 5],
  ['FPSA', '#E53935', 9], ['PSEL', '#D81B60', 9], ['TPST', '#757575', 11],
];
const WARNA = Object.fromEntries(JENIS.map(([j, c]) => [j, c]));
const WILAYAH = ['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Barat', 'Jakarta Selatan', 'Jakarta Timur', 'Kepulauan Seribu'];

// Tabel kapasitas: angka dari dokumen resmi (sama dengan _KAP_ROWS di panel2.py)
const KAP_ROWS = [
  { nama: 'TPST Bantargebang', sumber: 'Renstra DLH DKI 2025–2029', kap: '7.800 ton/hari', pct: 101, beban: '101%', badge: ['Overcapacity', 'danger'] },
  { nama: 'RDF / FPSA', sumber: 'Paparan KLH, 27 April 2026', kap: '2.500 ton/hari', pct: 19, beban: '19%', badge: ['Underutilized', 'danger'] },
  { nama: 'PSEL', sumber: 'DLH Jakarta, Zero OD, 3 Juli 2026', kap: '2.582 ton/hari', kapSub: 'target penuh 2028', pct: 7, beban: '7%', bebanSub: '172 ton/hari, realisasi Mei 2026', badge: ['Fase awal', 'info'] },
  { nama: 'TPS 3R', sumber: 'Paparan KLH, 27 April 2026', kap: '750 ton/hari', pct: 19, beban: '19%', badge: ['Underutilized', 'danger'] },
  { nama: 'Bank Sampah', sumber: '1.736 unit, data DLH 2026', kap: 'Kapasitas total belum tersedia', muted: true, pct: 0, beban: '22,21 kg/hari per unit', badge: ['Belum terukur', 'muted'] },
  { nama: 'Cakupan wilayah', sumber: 'Observasi data spasial', kap: '267 kelurahan', pct: 12, beban: '33 kelurahan tanpa fasilitas', badge: ['Tanpa fasilitas', 'danger'], barColor: 'var(--kritis)' },
];

const setK = (k, v) => document.querySelectorAll(`[data-k="${k}"]`).forEach((el) => { el.textContent = v; });

Promise.all([loadData('fasilitas_all.geojson'), loadData('batas_wilayah.geojson')]).then(([fas, wil]) => {
  fas.features.forEach((f) => {
    if (!WARNA[f.properties.jenis]) f.properties.jenis = 'Lainnya';
    if (/seribu/i.test(f.properties.kota || '')) f.properties.kota = 'Kepulauan Seribu';
  });
  const by = {};
  fas.features.forEach((f) => { by[f.properties.jenis] = (by[f.properties.jenis] || 0) + 1; });
  const tps = ['TPS Tipe 1', 'TPS Tipe 2', 'TPS Tipe 3', 'TPS Tipe 4'].reduce((a, j) => a + (by[j] || 0), 0);
  setK('total', fmt(fas.features.length));
  setK('tps', fmt(tps));
  setK('tps3r', fmt(by['TPS 3R'] || 0));
  setK('bs', fmt(by['Bank Sampah'] || 0));
  setK('besar', fmt((by.FPSA || 0) + (by.TPST || 0) + (by.PSEL || 0)));

  buildFilter(by);
  buildMap(fas, wil);
  kapTable();
  wilayahCards(fas);
});

function buildFilter(by) {
  const sel = document.getElementById('wilayah');
  WILAYAH.forEach((w) => sel.insertAdjacentHTML('beforeend', `<option value="${w}">${w}</option>`));
  document.getElementById('jenis-list').innerHTML = JENIS.filter(([j]) => by[j]).map(([j, c]) =>
    `<label class="jenis-item"><input type="checkbox" value="${j}" checked>
      <i style="background:${c}"></i><span>${j}</span><b>${fmt(by[j])}</b></label>`).join('');
}

function buildMap(fas, wil) {
  const map = makeMap('map-infra', { zoom: 10.2 });
  const pop = new maplibregl.Popup({ maxWidth: '280px' });
  map.on('load', () => {
    map.addSource('wil', { type: 'geojson', data: wil });
    map.addLayer({ id: 'wil-line', type: 'line', source: 'wil', paint: { 'line-color': '#0B2A5B', 'line-width': 1, 'line-opacity': 0.35 } });
    map.addSource('fas', { type: 'geojson', data: fas });
    map.addLayer({
      id: 'fas', type: 'circle', source: 'fas',
      paint: {
        'circle-color': ['match', ['get', 'jenis'], ...JENIS.flatMap(([j, c]) => [j, c]), '#888'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'],
          10, ['match', ['get', 'jenis'], ...JENIS.flatMap(([j, , r]) => [j, r]), 3],
          14, ['match', ['get', 'jenis'], ...JENIS.flatMap(([j, , r]) => [j, r * 2]), 6]],
        'circle-stroke-color': '#fff', 'circle-stroke-width': 0.8, 'circle-opacity': 0.9,
      },
    });
    // Fasilitas besar digambar di atas titik kecil
    map.moveLayer('fas');

    map.on('mouseenter', 'fas', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'fas', () => { map.getCanvas().style.cursor = ''; });
    map.on('click', 'fas', (e) => {
      const p = e.features[0].properties;
      const row = (l, v) => (v === undefined || v === null || v === 'null' || v === '' ? '' : `<tr><td>${l}</td><td>${v}</td></tr>`);
      pop.setLngLat(e.lngLat).setHTML(`<div class="pop"><b>${p.nama}</b>
        <div class="pop-jenis"><i style="background:${WARNA[p.jenis] || '#888'}"></i>${p.jenis}</div>
        <table>${row('Kota', p.kota)}${row('Kelurahan', p.kelurahan)}
        ${row('Kapasitas', p.kapasitas_tpd != null && p.kapasitas_tpd !== 'null' ? `${fmt(p.kapasitas_tpd, 1)} ton/hari` : null)}
        ${row('Utilisasi', p.utilisasi_pct != null && p.utilisasi_pct !== 'null' ? `${fmt(p.utilisasi_pct)}%` : null)}
        ${row('Status', p.status)}</table></div>`).addTo(map);
    });

    const apply = () => {
      const jenis = [...document.querySelectorAll('#jenis-list input:checked')].map((i) => i.value);
      const w = document.getElementById('wilayah').value;
      const filter = ['all', ['in', ['get', 'jenis'], ['literal', jenis]]];
      if (w) filter.push(['==', ['get', 'kota'], w]);
      map.setFilter('fas', filter);
      const n = fas.features.filter((f) => jenis.includes(f.properties.jenis) && (!w || f.properties.kota === w)).length;
      setK('tampil', fmt(n));
      // Zoom ke wilayah terpilih
      const pts = fas.features.filter((f) => !w || f.properties.kota === w).map((f) => f.geometry.coordinates);
      if (w && pts.length) {
        const b = pts.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(pts[0], pts[0]));
        map.fitBounds(b, { padding: 40, maxZoom: 13, duration: 800 });
      } else if (!w) {
        map.flyTo({ center: JAKARTA, zoom: 10.2, duration: 800 });
      }
    };
    document.getElementById('jenis-list').addEventListener('change', apply);
    document.getElementById('wilayah').addEventListener('change', apply);
    document.getElementById('pilih-semua').addEventListener('click', () => {
      document.querySelectorAll('#jenis-list input').forEach((i) => { i.checked = true; }); apply();
    });
    document.getElementById('hapus-semua').addEventListener('click', () => {
      document.querySelectorAll('#jenis-list input').forEach((i) => { i.checked = false; }); apply();
    });
    apply();
  });
}

function kapTable() {
  const head = '<div class="kap-row kap-head"><span>Fasilitas</span><span>Kapasitas</span><span>Beban / utilisasi aktual</span><span>Kesenjangan</span></div>';
  const rows = KAP_ROWS.map((r) => {
    const color = r.barColor || (r.pct > 100 ? 'var(--kritis)' : '#A3B18A');
    return `<div class="kap-row">
      <span><b>${r.nama}</b><small>${r.sumber}</small></span>
      <span class="${r.muted ? 'muted' : ''}">${r.kap}${r.kapSub ? `<small>${r.kapSub}</small>` : ''}</span>
      <span><span class="kap-bar"><span style="width:${Math.min(r.pct, 100)}%;background:${color}"></span></span>
        <span class="${r.muted ? 'muted' : ''}">${r.beban}${r.bebanSub ? `<small>${r.bebanSub}</small>` : ''}</span></span>
      <span class="kap-badge-cell"><span class="badge badge-${r.badge[1]}">${r.badge[0]}</span></span>
    </div>`;
  }).join('');
  document.getElementById('kap-table').innerHTML = head + rows;
}

function wilayahCards(fas) {
  const groups = [['TPS', (j) => j.startsWith('TPS Tipe'), '#1565C0'], ['TPS 3R', (j) => j === 'TPS 3R', '#43A047'],
    ['Bank sampah', (j) => j === 'Bank Sampah', '#FFB300'], ['Lainnya', (j) => !j.startsWith('TPS') && j !== 'Bank Sampah', '#757575']];
  document.getElementById('wilayah-cards').innerHTML = WILAYAH.map((w) => {
    const fs = fas.features.filter((f) => f.properties.kota === w);
    const rows = groups.map(([l, test, c]) => {
      const n = fs.filter((f) => test(f.properties.jenis)).length;
      return `<li><i style="background:${c}"></i>${l}<b>${fmt(n)}</b></li>`;
    }).join('');
    return `<article class="wil-card"><h3>${w}</h3><p class="wil-total">${fmt(fs.length)} <span>fasilitas</span></p><ul>${rows}</ul></article>`;
  }).join('');
}
