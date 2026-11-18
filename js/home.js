// Beranda: scrollytelling. Peta (MapLibre) dan grafik (Plotly) bergantian sesuai langkah cerita.

// Butuh js/common.js (dimuat lebih dulu).
const load = loadData;

Promise.all([
  load('batas_kelurahan.geojson'),
  load('timbulan_kelurahan.json'),
  load('fasilitas.geojson'),
  load('composition.json'),
  load('story_bau.json'),
  load('default_projection.json'),
]).then(([kel, timb, fas, komp, bau, proj]) => init({ kel, timb, fas, komp, bau, proj }));

function init(d) {
  // Gabungkan atribut ke poligon kelurahan (berdasarkan nama, huruf besar)
  const key = (s) => s.toUpperCase().trim();
  const timbBy = Object.fromEntries(d.timb.map((r) => [key(r.nama), r.timbulan]));
  const st = (h) => Object.fromEntries(Object.entries(d.bau[h].status).map(([k, v]) => [key(k), v]));
  const s1 = st(1), s14 = st(14);
  d.kel.features.forEach((f) => {
    const k = key(f.properties.nama);
    f.properties.timbulan = timbBy[k] ?? null;
    f.properties.s1 = s1[k] ?? 'NA';
    f.properties.s14 = s14[k] ?? 'NA';
  });

  // Angka di teks cerita diisi dari data, bukan diketik manual
  const cnt = {};
  d.fas.features.forEach((f) => { cnt[f.properties.jenis] = (cnt[f.properties.jenis] || 0) + 1; });
  const nTps = ['TPS Tipe 1', 'TPS Tipe 2', 'TPS Tipe 3', 'TPS Tipe 4'].reduce((a, j) => a + (cnt[j] || 0), 0);
  setText('n_tps', `${fmt(nTps)} TPS`);
  setText('n_bs', `${fmt(cnt['Bank Sampah'] || 0)} bank sampah`);
  setText('n_tps3r', `${fmt(cnt['TPS 3R'] || 0)} TPS 3R`);
  setText('k1', fmt(d.bau[1].summary.n_kritis));
  setText('k14', fmt(d.bau[14].summary.n_kritis));

  const map = makeMap('map');

  map.on('load', () => {
    map.addSource('kel', { type: 'geojson', data: d.kel });
    map.addSource('fas', { type: 'geojson', data: d.fas });

    map.addLayer({ id: 'kel-fill', type: 'fill', source: 'kel', paint: { 'fill-color': timbulanColor(), 'fill-opacity': 0.8 } });
    map.addLayer({ id: 'kel-line', type: 'line', source: 'kel', paint: { 'line-color': '#fff', 'line-width': 0.5 } });
    map.addLayer({
      id: 'fas', type: 'circle', source: 'fas', layout: { visibility: 'none' },
      paint: {
        'circle-radius': ['match', ['get', 'jenis'], 'TPS 3R', 6, 'FPSA', 8, 'TPST', 8, 'Bank Sampah', 2.2, 3],
        'circle-color': ['match', ['get', 'jenis'],
          'Bank Sampah', '#7FB3E3', 'TPS 3R', '#F26B21', 'FPSA', '#C0392B', 'TPST', '#C0392B', '#0B2A5B'],
        'circle-stroke-color': '#fff', 'circle-stroke-width': 0.6, 'circle-opacity': 0.85,
      },
    });

    const steps = makeSteps(map, d);
    observeSteps(steps);
  });
}

function setText(k, v) { document.querySelectorAll(`[data-k="${k}"]`).forEach((el) => { el.textContent = v; }); }

function timbulanColor() {
  return ['case', ['==', ['get', 'timbulan'], null], '#E2E8F0',
    ['interpolate', ['linear'], ['get', 'timbulan'], 5, '#E8F2FB', 30, '#A9D3F0', 60, '#7FB3E3', 100, '#0B2A5B']];
}

function makeSteps(map, d) {
  const graphic = document.querySelector('.story-graphic');
  const legend = document.getElementById('legend');
  const showMap = () => graphic.classList.remove('show-chart');
  const showChart = () => graphic.classList.add('show-chart');
  const fly = (zoom = 10) => map.flyTo({ center: [106.83, -6.2], zoom, duration: 1200 });
  const statusLegend = statusLegendHTML;

  return {
    timbulan() {
      showMap(); fly(10);
      map.setLayoutProperty('fas', 'visibility', 'none');
      map.setPaintProperty('kel-fill', 'fill-color', timbulanColor());
      map.setPaintProperty('kel-fill', 'fill-opacity', 0.8);
      legend.innerHTML = '<b>Timbulan per kelurahan</b><div class="bar" style="background:linear-gradient(90deg,#E8F2FB,#A9D3F0,#7FB3E3,#0B2A5B)"></div><div class="ends"><span>5</span><span>100+ ton/hari</span></div>';
    },
    komposisi() {
      showChart();
      chartPanel(`<div class="chart-head"><h3>Komposisi sampah</h3><p>Porsi tiap jenis dari total timbulan, dan berapa persen yang sudah ada kapasitas olahnya</p></div><div id="komp-body" class="komp-body"></div>`);
      renderKomposisi(document.getElementById('komp-body'), d.komp);
    },
    fasilitas() {
      showMap(); fly(10.3);
      map.setPaintProperty('kel-fill', 'fill-color', '#F4F7FB');
      map.setPaintProperty('kel-fill', 'fill-opacity', 0.6);
      map.setLayoutProperty('fas', 'visibility', 'visible');
      legend.innerHTML = '<b>Fasilitas</b>' + [['TPS', '#0B2A5B'], ['Bank sampah', '#7FB3E3'], ['TPS 3R', '#F26B21'], ['FPSA / TPST', '#C0392B']]
        .map(([l, c]) => `<div class="row"><span class="sw" style="background:${c};border-radius:50%"></span>${l}</div>`).join('');
    },
    hari1() {
      showMap(); fly(10);
      map.setLayoutProperty('fas', 'visibility', 'none');
      map.setPaintProperty('kel-fill', 'fill-color', statusColor('s1'));
      map.setPaintProperty('kel-fill', 'fill-opacity', 0.85);
      legend.innerHTML = statusLegend('Status hari ke-1 (BAU)');
    },
    hari14() {
      showMap(); fly(10);
      map.setLayoutProperty('fas', 'visibility', 'none');
      map.setPaintProperty('kel-fill', 'fill-color', statusColor('s14'));
      map.setPaintProperty('kel-fill', 'fill-opacity', 0.85);
      legend.innerHTML = statusLegend('Status hari ke-14 (BAU)');
    },
    proyeksi() {
      showChart();
      const p = d.proj.data;
      const yr = p.map((r) => r.tahun);
      chartPanel(`<div class="chart-head"><h3>Timbulan vs kapasitas pengolahan</h3><p>Proyeksi 2026–2045, ton per hari</p></div>
        <ul class="line-legend">
          <li><i style="background:#16334E"></i>Timbulan</li>
          <li><i style="background:#7FB3E3"></i>Kapasitas, skenario moderat</li>
          <li><i class="dash" style="border-color:#C0392B"></i>Kapasitas tanpa intervensi</li>
          <li><i class="dash" style="border-color:#F26B21"></i>Target RPJMD</li>
        </ul><div id="plot" class="plot"></div>`);
      Plotly.newPlot('plot', [
        { x: yr, y: p.map((r) => r.timbulan), name: 'Timbulan', mode: 'lines', line: { color: '#16334E', width: 3, shape: 'spline' } },
        { x: yr, y: p.map((r) => r.target_rpjmd), name: 'Target RPJMD', mode: 'lines', line: { color: '#F26B21', width: 2, dash: 'dash' } },
        { x: yr, y: p.map((r) => r.kap_skenario), name: 'Kapasitas, skenario moderat', mode: 'lines', fill: 'tozeroy',
          line: { color: '#7FB3E3', width: 3, shape: 'spline' }, fillcolor: 'rgba(127,179,227,.20)' },
        { x: yr, y: p.map((r) => r.kap_baseline), name: 'Kapasitas tanpa intervensi', mode: 'lines', line: { color: '#C0392B', width: 2, dash: 'dot' } },
      ], {
        font: { family: 'Plus Jakarta Sans', color: '#16334E', size: 12 }, margin: { t: 10, l: 50, r: 10, b: 30 }, showlegend: false,
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: { showgrid: false, linecolor: '#E2E8F0', tickcolor: '#E2E8F0' },
        yaxis: { rangemode: 'tozero', separatethousands: true, gridcolor: '#EEF2F6', zeroline: false },
        hovermode: 'x unified',
        separators: ',.',
      }, { responsive: true, displayModeBar: false });
    },
  };
}

function chartPanel(html) {
  const el = document.getElementById('chart');
  el.querySelectorAll('.js-plotly-plot').forEach((g) => Plotly.purge(g));
  el.innerHTML = html;
}

function observeSteps(steps) {
  const els = document.querySelectorAll('.step');
  let current = null;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const name = e.target.dataset.step;
      if (name === current) return;
      current = name;
      els.forEach((s) => s.classList.toggle('active', s === e.target));
      steps[name]?.();
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  els.forEach((s) => io.observe(s));
  steps.timbulan();
  els[0].classList.add('active');
}
