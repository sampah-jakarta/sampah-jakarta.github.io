// Halaman Timbulan (kondisi eksisting). Butuh js/common.js.

Promise.all([
  loadData('indicators.json'),
  loadData('composition.json'),
  loadData('eksisting_map_status.json'),
  loadData('batas_kelurahan.geojson'),
  loadData('timbulan_kelurahan.json'),
  loadData('timbulan_kota.json'),
  loadData('timbulan_kecamatan.json'),
  loadData('trends.json'),
  loadData('fasilitas.geojson'),
]).then(([inds, komp, eks, kel, timb, kota, kec, trends, fas]) => {
  stats(inds, komp, eks);
  maps(kel, timb, eks, fas);
  renderKomposisi(document.getElementById('komposisi'), komp, { donutId: 'donut-page' });
  cascade(kota, kec, timb, eks);
  trend(trends);
});

const setK = (k, v) => document.querySelectorAll(`[data-k="${k}"]`).forEach((el) => { el.textContent = v; });

// Kartu angka: logika sama dengan panel1.py (terkelola = organik + anorganik)
function stats(inds, komp, eks) {
  const total = inds.find((r) => r.indikator === 'total_timbulan')?.nilai ?? 0;
  const terolah = komp.filter((r) => r.jenis === 'Organik' || r.jenis === 'Anorganik')
    .reduce((t, r) => t + (r.kapasitas_harian_ton || 0), 0);
  setK('total', fmt(total));
  setK('terolah', fmt(terolah));
  setK('terolah_pct', `ton/hari · ${fmt((terolah / total) * 100, 2)}% dari timbulan`);
  setK('gap', fmt(total - terolah));
  setK('kritis', fmt(eks.summary.n_kritis));
}

function maps(kel, timb, eks, fas) {
  const timbBy = Object.fromEntries(timb.map((r) => [keyName(r.nama), r.timbulan]));
  const eksBy = Object.fromEntries(eks.data.map((r) => [keyName(r.kelurahan), r]));
  const fasBy = {};
  fas.features.forEach((f) => { const k = keyName(f.properties.kelurahan); if (k) fasBy[k] = (fasBy[k] || 0) + 1; });
  kel.features.forEach((f, i) => {
    const k = keyName(f.properties.nama);
    const e = eksBy[k] || {};
    f.id = i;
    Object.assign(f.properties, {
      timbulan: timbBy[k] ?? null, status: e.status_sim || 'NA', kecamatan: e.kecamatan || '',
      populasi: e.populasi, kap: e.kap_efektif, rasio: e.rasio_isi, nfas: fasBy[k] || 0,
    });
  });

  // Peta 1: timbulan
  const m1 = makeMap('map-timbulan');
  m1.on('load', () => {
    m1.addSource('kel', { type: 'geojson', data: kel });
    m1.addLayer({ id: 'fill', type: 'fill', source: 'kel', paint: {
      'fill-color': ['case', ['==', ['get', 'timbulan'], null], '#E2E8F0',
        ['interpolate', ['linear'], ['get', 'timbulan'], 5, '#E8F2FB', 30, '#A9D3F0', 60, '#7FB3E3', 100, '#0B2A5B']],
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.82] } });
    m1.addLayer({ id: 'line', type: 'line', source: 'kel', paint: { 'line-color': '#fff', 'line-width': 0.5 } });
    hoverPopup(m1, 'fill', (p) => `<b>${p.nama}</b><br>${p.timbulan == null ? '–' : fmt(p.timbulan, 1)} ton/hari`);
  });

  // Peta 2: status kapasitas
  document.getElementById('legend-status').innerHTML = statusLegendHTML('Status hari ke-1');
  const m2 = makeMap('map-status');
  m2.on('load', () => {
    m2.addSource('kel', { type: 'geojson', data: kel });
    m2.addLayer({ id: 'fill', type: 'fill', source: 'kel', paint: { 'fill-color': statusColor('status'),
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.95, 0.78] } });
    m2.addLayer({ id: 'line', type: 'line', source: 'kel', paint: { 'line-color': '#E8F2FB', 'line-width': 0.6 } });
    hoverPopup(m2, 'fill', (p) => `<b>${p.nama}</b> · ${p.status}`);
    m2.on('click', 'fill', (e) => {
      const p = e.features[0].properties;
      const row = (l, v) => `<tr><td>${l}</td><td>${v}</td></tr>`;
      new maplibregl.Popup({ maxWidth: '260px' }).setLngLat(e.lngLat).setHTML(
        `<div class="pop"><b>${p.nama}</b><span class="tag tag-${String(p.status).toLowerCase()}">${p.status}</span>
        <table>${row('Kecamatan', p.kecamatan || '–')}${row('Penduduk', p.populasi ? `${fmt(p.populasi)} jiwa` : '–')}
        ${row('Timbulan', p.timbulan == null ? '–' : `${fmt(p.timbulan, 1)} ton/hari`)}
        ${row('Kapasitas TPS', p.kap == null ? '–' : `${fmt(p.kap, 1)} ton/hari`)}
        ${row('Utilisasi', p.rasio == null || p.rasio === 'null' ? '–' : `${fmt(p.rasio * 100)}%`)}
        ${row('Fasilitas', `${p.nfas} unit`)}</table></div>`).addTo(m2);
    });
  });
}

function hoverPopup(map, layer, html) {
  const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
  let hovered = null;
  map.on('mousemove', layer, (e) => {
    map.getCanvas().style.cursor = 'pointer';
    const f = e.features[0];
    if (hovered !== null) map.setFeatureState({ source: 'kel', id: hovered }, { hover: false });
    hovered = f.id;
    map.setFeatureState({ source: 'kel', id: hovered }, { hover: true });
    pop.setLngLat(e.lngLat).setHTML(html(f.properties)).addTo(map);
  });
  map.on('mouseleave', layer, () => {
    map.getCanvas().style.cursor = '';
    if (hovered !== null) map.setFeatureState({ source: 'kel', id: hovered }, { hover: false });
    hovered = null;
    pop.remove();
  });
}

// Drilldown kota → kecamatan → kelurahan, sebagai bar HTML
function cascade(kota, kec, timb, eks) {
  const box = document.getElementById('cascade');
  const title = document.getElementById('cascade-title');
  const hint = document.getElementById('cascade-hint');
  const back = document.getElementById('cascade-back');
  const timbBy = Object.fromEntries(timb.map((r) => [keyName(r.nama), r.timbulan]));
  const kelByKec = {};
  eks.data.forEach((r) => { (kelByKec[r.kecamatan] ||= []).push({ nama: r.kelurahan, timbulan: timbBy[keyName(r.kelurahan)] ?? r.timbulan_harian }); });
  const stack = [];

  function draw(rows, t, h, onClick) {
    title.textContent = t; hint.textContent = h; back.hidden = stack.length === 0;
    const max = Math.max(...rows.map((r) => r.timbulan));
    rows = [...rows].sort((a, b) => b.timbulan - a.timbulan);
    box.innerHTML = rows.map((r, i) => `<button class="cbar" data-i="${i}" ${onClick ? '' : 'disabled'}>
      <span class="cbar-name">${r.nama}</span>
      <span class="cbar-track"><span class="cbar-fill" style="width:${(r.timbulan / max) * 100}%"></span></span>
      <span class="cbar-val">${fmt(r.timbulan, 1)}</span></button>`).join('');
    if (onClick) box.querySelectorAll('.cbar').forEach((b) => b.addEventListener('click', () => onClick(rows[b.dataset.i])));
  }
  const showKota = () => draw(kota, 'Timbulan per kota administrasi', 'ton/hari. Klik salah satu kota untuk melihat kecamatannya.', showKec);
  function showKec(k) {
    stack.push(showKota);
    draw(kec[k.nama] || [], `Kecamatan di ${k.nama}`, 'ton/hari. Klik kecamatan untuk melihat kelurahannya.', (c) => showKel(c, k));
  }
  function showKel(c, k) {
    stack.push(() => { stack.pop(); showKec(k); });
    draw(kelByKec[c.nama] || [], `Kelurahan di Kecamatan ${c.nama}`, 'ton/hari.', null);
  }
  back.addEventListener('click', () => { const f = stack.pop(); if (f) f(); });
  showKota();
}

function trend(rows) {
  const ok = rows.filter((r) => r.valid);
  Plotly.newPlot('trend', [{
    x: ok.map((r) => r.tanggal), y: ok.map((r) => r.tonase_harian), mode: 'lines+markers',
    line: { color: '#0B2A5B', width: 2.5, shape: 'spline' }, marker: { size: 5, color: '#0B2A5B' },
    fill: 'tozeroy', fillcolor: 'rgba(127,179,227,.18)',
    hovertemplate: '%{x|%b %Y}<br><b>%{y:,.0f}</b> ton/hari<extra></extra>',
  }], {
    ...PLOT_LAYOUT, margin: { t: 10, l: 50, r: 10, b: 40 }, showlegend: false,
    xaxis: { ...PLOT_LAYOUT.xaxis, tickformat: '%b %Y' },
    yaxis: { ...PLOT_LAYOUT.yaxis, rangemode: 'tozero' },
  }, { responsive: true, displayModeBar: false });
}
