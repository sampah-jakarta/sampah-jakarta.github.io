// Fungsi bersama untuk semua halaman.

const COLORS = { aman: '#2E7D32', siaga: '#EF7C00', kritis: '#C0392B' };
// Warna jenis sampah sama dengan dashboard lama (panel1.py JENIS_WARNA)
const JENIS_WARNA = { Organik: '#2E7D32', Anorganik: '#F5C518', Residu: '#90A4AE', B3: '#C0392B' };
const BASEMAP = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const JAKARTA = [106.83, -6.2];

const fmt = (n, d = 0) => Number(n).toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: 0 });
const fmtPct = (v) => `${fmt(v, 1)}%`;
const keyName = (s) => String(s || '').toUpperCase().trim();
const loadData = (f) => fetch(`data/${f}`).then((r) => r.json());

// Menu HP
document.querySelector('.nav-toggle')?.addEventListener('click', (e) => {
  const nav = document.querySelector('.topnav');
  nav.classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', nav.classList.contains('open'));
});

function makeMap(container, opts = {}) {
  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      sources: { base: { type: 'raster', tiles: [BASEMAP], tileSize: 256, attribution: 'Esri, HERE, Garmin, © OpenStreetMap' } },
      layers: [{ id: 'base', type: 'raster', source: 'base' }],
    },
    center: JAKARTA,
    zoom: 10,
    attributionControl: { compact: true },
    cooperativeGestures: true,
    ...opts,
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  return map;
}

function statusColor(prop) {
  return ['match', ['get', prop], 'AMAN', COLORS.aman, 'SIAGA', COLORS.siaga, 'KRITIS', COLORS.kritis, '#E2E8F0'];
}

function statusLegendHTML(title) {
  return `<b>${title}</b>` + ['AMAN', 'SIAGA', 'KRITIS']
    .map((s) => `<div class="row"><span class="sw" style="background:${COLORS[s.toLowerCase()]}"></span>${s}</div>`).join('');
}

// Donut komposisi + bar kapasitas olah per jenis. Dipakai di Beranda dan Timbulan.
function renderKomposisi(el, komp, { donutId = 'donut', note = true } = {}) {
  const total = komp.reduce((t, r) => t + r.timbulan_harian_ton, 0);
  const bars = komp.map((r) => {
    const c = JENIS_WARNA[r.jenis];
    return `<div class="kbar">
      <div class="kbar-head"><span class="kbar-name"><i style="background:${c}"></i>${r.jenis}</span>
        <span class="kbar-val">${fmtPct(r.pct_terolah)}</span></div>
      <div class="kbar-track"><div class="kbar-fill" style="width:${Math.max(r.pct_terolah, 1.5)}%;background:${c}"></div></div>
      <div class="kbar-sub">${fmt(r.kapasitas_harian_ton)} dari ${fmt(r.timbulan_harian_ton)} ton/hari</div>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="komp-grid">
      <div class="donut-wrap"><div id="${donutId}" class="donut"></div>
        <ul class="donut-legend">${komp.map((r) => `<li><i style="background:${JENIS_WARNA[r.jenis]}"></i>${r.jenis}<b>${fmtPct(r.pct_total)}</b></li>`).join('')}</ul>
      </div>
      <div class="kbars"><p class="kbars-title">Kapasitas olah terhadap timbulan</p>${bars}
        ${note ? '<p class="kbars-note">Residu dan B3 tercatat tertangani penuh (data DLH).</p>' : ''}</div>
    </div>`;
  Plotly.newPlot(donutId, [{
    type: 'pie', hole: 0.72, sort: false, direction: 'clockwise',
    labels: komp.map((r) => r.jenis), values: komp.map((r) => r.timbulan_harian_ton),
    marker: { colors: komp.map((r) => JENIS_WARNA[r.jenis]), line: { color: '#fff', width: 3 } },
    textinfo: 'none', hovertemplate: '<b>%{label}</b><br>%{value:,.0f} ton/hari · %{percent}<extra></extra>',
  }], {
    font: { family: 'Plus Jakarta Sans', color: '#16334E' }, showlegend: false,
    margin: { t: 0, l: 0, r: 0, b: 0 }, paper_bgcolor: 'rgba(0,0,0,0)', separators: ',.',
    annotations: [{ text: `<b style="font-size:26px">${fmt(total)}</b><br><span style="font-size:13px;color:#6B7C93">ton/hari</span>`,
      x: 0.5, y: 0.5, xref: 'paper', yref: 'paper', showarrow: false }],
  }, { responsive: true, displayModeBar: false });
}

const PLOT_LAYOUT = {
  font: { family: 'Plus Jakarta Sans', color: '#16334E', size: 12 },
  paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', separators: ',.',
  xaxis: { showgrid: false, linecolor: '#E2E8F0', tickcolor: '#E2E8F0' },
  yaxis: { gridcolor: '#EEF2F6', zeroline: false, separatethousands: true },
  hoverlabel: { bgcolor: '#fff', bordercolor: '#E2E8F0', font: { family: 'Plus Jakarta Sans', color: '#16334E' } },
};
