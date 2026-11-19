// Halaman Simulasi. Hitungan memakai js/sim.js (paritas dengan simulasi R, lihat tests/test_sim.html).

const KEYS = ['timbulan', 'tps3r', 'bs', 'upgrade', 'fpsa', 'psel'];
const setK = (k, v) => document.querySelectorAll(`[data-k="${k}"]`).forEach((el) => { el.textContent = v; });

Promise.all([loadData('sim_ref.json'), loadData('batas_kelurahan.geojson'), loadData('indicators.json'), loadData('tetangga.json')])
  .then(([ref, kel, inds, tetangga]) => {
    const totalTimbulan = inds.find((r) => r.indikator === 'total_timbulan')?.nilai ?? 9058.9;
    kel.features.forEach((f, i) => { f.id = i; });
    const kelIndex = Object.fromEntries(kel.features.map((f, i) => [keyName(f.properties.nama), i]));

    let sken = null;
    let hari = 1;
    const map = makeMap('map-sim', { zoom: 10.2 });
    let mapReady = false;

    const updateMap = () => {
      if (!mapReady) return;
      const opts = { sken_tps3r: sken.tps3r, sken_upgrade: sken.upgrade, sken_bs: sken.bs, sken_fpsa: sken.fpsa, sken_psel: sken.psel };
      const res = Sim.petaLimpahan(ref, tetangga, { hari, ...opts });
      kel.features.forEach((f) => { f.properties.status = 'NA'; });
      res.data.forEach((d) => {
        const i = kelIndex[keyName(d.kelurahan)];
        if (i === undefined) return;
        Object.assign(kel.features[i].properties, {
          status: d.status_sim, kecamatan: d.kecamatan, timbulan: d.timbulan_harian, kap: d.kap_total,
          residual: d.residual_harian, akumulasi: d.akumulasi, hari_kritis: d.hari_kritis, masuk: d.limpahan_masuk,
        });
      });
      map.getSource('kel').setData(kel);
      const s = res.summary;
      setK('n_aman', fmt(s.n_aman)); setK('n_siaga', fmt(s.n_siaga)); setK('n_kritis', fmt(s.n_kritis));
      document.getElementById('interp').textContent = interpretasi(hari, s);
      const hs = Sim.hariSemuaKritis(ref, tetangga, opts);
      setK('semua', hs ? `Seluruh kelurahan kritis pada hari ke-${hs}` : 'Tidak semua kelurahan menjadi kritis pada skenario ini');
      document.getElementById('semua-box').classList.toggle('bad', !!hs);
    };

    const updateProj = () => {
      const res = Sim.proyeksi(ref, sken);
      const d = res.data;
      const d26 = d[0];
      const kap26 = d26.kap_skenario;
      const pct = Math.min(Sim.roundR(kap26 / totalTimbulan * 100, 1), 100);
      setK('timbulan', fmt(totalTimbulan));
      setK('terkelola', fmt(kap26));
      setK('bgb', fmt(Math.max(totalTimbulan - kap26, 0)));
      setK('pct', `${fmt(pct, 1)}%`);
      const card = document.getElementById('card-pct');
      card.style.borderTopColor = pct >= 62 ? 'var(--aman)' : 'var(--orange)';
      card.querySelector('.stat-num').style.color = pct >= 62 ? 'var(--aman)' : 'var(--orange)';

      const yr = d.map((r) => r.tahun);
      Plotly.react('proj', [
        { x: yr, y: d.map((r) => r.timbulan), name: 'Timbulan', line: { color: '#F26B21', width: 3, shape: 'spline' } },
        { x: yr, y: d.map((r) => r.kap_skenario), name: 'Kapasitas skenario', line: { color: '#1565C0', width: 3, shape: 'spline' },
          fill: 'tozeroy', fillcolor: 'rgba(21,101,192,.08)' },
        { x: yr, y: d.map((r) => r.kap_baseline), name: 'Baseline', line: { color: '#7A8B96', width: 2, dash: 'dot' } },
        { x: yr, y: d.map((r) => r.target_rpjmd), name: 'Target RPJMD', line: { color: '#0B2A5B', width: 2, dash: 'dash' } },
      ], {
        ...PLOT_LAYOUT, margin: { t: 10, l: 55, r: 10, b: 30 }, showlegend: false, hovermode: 'x unified',
        yaxis: { ...PLOT_LAYOUT.yaxis, rangemode: 'tozero' },
        shapes: [
          { type: 'line', x0: 2027, x1: 2027, yref: 'paper', y0: 0, y1: 1, line: { color: '#C0392B', dash: 'dash', width: 1.5 } },
          { type: 'line', x0: 2030, x1: 2030, yref: 'paper', y0: 0, y1: 1, line: { color: '#2E7D32', dash: 'dot', width: 1.5 } },
        ],
        annotations: [
          { x: 2027, y: 1, yref: 'paper', text: 'Bantargebang dibatasi', showarrow: false, xanchor: 'left', yanchor: 'top', font: { size: 10.5, color: '#C0392B' } },
          { x: 2030, y: 0.92, yref: 'paper', text: 'Zero OD', showarrow: false, xanchor: 'left', yanchor: 'top', font: { size: 10.5, color: '#2E7D32' } },
        ],
      }, { responsive: true, displayModeBar: false });

      targets(res, d);
      komposisi(res.komposisi);
    };

    const onChange = (st) => { sken = st; updateProj(); updateMap(); };
    const ctl = buildSkenario(document.getElementById('sken-grid'), KEYS, onChange);
    sken = ctl.state();
    document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => ctl.set(b.dataset.preset)));
    renderAsumsi(document.getElementById('asumsi'), KEYS);
    document.getElementById('legend-sim').innerHTML = statusLegendHTML('Status kelurahan');
    updateProj();

    map.on('load', () => {
      map.addSource('kel', { type: 'geojson', data: kel });
      map.addLayer({ id: 'fill', type: 'fill', source: 'kel', paint: { 'fill-color': statusColor('status'), 'fill-opacity': 0.8 } });
      map.addLayer({ id: 'line', type: 'line', source: 'kel', paint: { 'line-color': '#fff', 'line-width': 0.5 } });
      mapReady = true;
      updateMap();
      map.on('mouseenter', 'fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'fill', () => { map.getCanvas().style.cursor = ''; });
      map.on('click', 'fill', (e) => {
        const p = e.features[0].properties;
        const row = (l, v) => `<tr><td>${l}</td><td>${v}</td></tr>`;
        const n = (v, u) => (v == null || v === 'null' ? '–' : `${fmt(v, 1)} ${u}`);
        const hk = p.hari_kritis == null || p.hari_kritis === 'null' ? 'belum' : `hari ke-${p.hari_kritis}`;
        new maplibregl.Popup({ maxWidth: '270px' }).setLngLat(e.lngLat).setHTML(
          `<div class="pop"><b>${p.nama}</b><span class="tag tag-${String(p.status).toLowerCase()}">${p.status}</span>
          <table>${row('Kecamatan', p.kecamatan || '–')}${row('Timbulan', n(p.timbulan, 'ton/hari'))}
          ${row('Kapasitas total', n(p.kap, 'ton/hari'))}${row('Sisa tak terolah', n(p.residual, 'ton/hari'))}
          ${row('Limpahan diterima', n(p.masuk, 'ton'))}${row('Tumpukan', n(p.akumulasi, 'ton'))}${row('Menjadi kritis', hk)}</table></div>`).addTo(map);
      });
    });

    // Slider hari + putar
    const slider = document.getElementById('hari');
    const setHari = (h) => { hari = h; slider.value = h; setK('hari', h); updateMap(); };
    slider.addEventListener('input', () => setHari(Number(slider.value)));
    let timer = null;
    const playBtn = document.getElementById('play');
    const stopPlay = () => { clearInterval(timer); timer = null; playBtn.textContent = '▶ Putar'; };
    playBtn.addEventListener('click', () => {
      if (timer) return stopPlay();
      if (hari >= 15) setHari(0);
      playBtn.textContent = '⏸ Jeda';
      timer = setInterval(() => { if (hari >= 15) stopPlay(); else setHari(hari + 1); }, 900);
    });
    document.getElementById('stop').addEventListener('click', () => { stopPlay(); setHari(0); });
  });

// Teks interpretasi sama dengan panel3.py
function interpretasi(hari, s) {
  const total = s.n_aman + s.n_siaga + s.n_kritis;
  const pk = Math.round(s.n_kritis / total * 100);
  if (hari === 0) return `Hari ke-0: sistem dimulai dalam kondisi bersih. Semua ${total} kelurahan AMAN karena tumpukan sampah belum terjadi.`;
  if (s.n_kritis === 0) return `Hari ke-${hari}: tidak ada kelurahan KRITIS. Kapasitas TPS lokal dan fasilitas kota (RDF/PSEL) pada skenario ini mencukupi. ${s.n_aman} kelurahan AMAN, ${s.n_siaga} SIAGA.`;
  if (pk >= 70) return `Hari ke-${hari}: ${s.n_kritis} dari ${total} kelurahan (${pk}%) KRITIS. Kapasitas terlampaui dan limpahannya ikut memenuhi kelurahan tetangga.`;
  if (pk >= 30) return `Hari ke-${hari}: ${s.n_kritis} kelurahan (${pk}%) KRITIS, ${s.n_siaga} SIAGA, ${s.n_aman} AMAN. Sisa dari kelurahan yang penuh mengalir ke tetangganya, sehingga jumlah kelurahan KRITIS terus bertambah.`;
  return `Hari ke-${hari}: ${s.n_aman} kelurahan AMAN, ${s.n_siaga} SIAGA, ${s.n_kritis} KRITIS. Kelurahan dengan kapasitas lebih masih mampu menampung limpahan dari tetangganya.`;
}

function targets(res, d) {
  const d26 = d[0];
  const r30 = d.find((r) => r.tahun === 2030);
  const ok29 = res.summary.target_2029_tercapai;
  const ok30 = r30 && r30.kap_skenario >= r30.timbulan;
  const def = d26.defisit;
  const card = (label, val, note, good) => `<div class="target ${good === true ? 't-ok' : good === false ? 't-bad' : ''}">
    <p class="t-label">${label}</p><p class="t-val">${val}</p><p class="t-note">${note}</p></div>`;
  document.getElementById('targets').innerHTML = [
    card('Target RPJMD 2029', ok29 ? 'Tercapai' : 'Belum tercapai', 'Kapasitas ≥ target Ind. 11.6', ok29),
    card(def < 0 ? 'Surplus 2026' : 'Defisit 2026', `${fmt(Math.abs(def))} ton/hari`,
      def < 0 ? 'Kapasitas melebihi timbulan' : 'Timbulan − kapasitas skenario', def < 0),
    card('Tahun seimbang', res.summary.tahun_seimbang ?? '–', 'Kapasitas mendekati timbulan (defisit < 500 ton/hari)', null),
    card('Zero Open Dumping 2030', ok30 ? 'Tercapai' : 'Belum tercapai', 'Kapasitas ≥ timbulan di tahun 2030', ok30),
  ].join('');
}

function komposisi(k) {
  const jenis = k.per_jenis.map((r) => {
    const c = JENIS_WARNA[r.jenis];
    return `<div class="kbar"><div class="kbar-head"><span class="kbar-name"><i style="background:${c}"></i>${r.jenis}</span>
      <span class="kbar-val">${fmtPct(r.pct)}</span></div>
      <div class="kbar-track"><div class="kbar-fill" style="width:${Math.max(r.pct, 1.5)}%;background:${c}"></div></div>
      <div class="kbar-sub">${fmt(r.kapasitas)} dari ${fmt(r.timbulan)} ton/hari terolah</div></div>`;
  }).join('');
  const maxF = Math.max(...k.fasilitas.map((f) => f.kapasitas), 1);
  const fas = k.fasilitas.map((f) => `<div class="fbar"><span>${f.nama}</span>
      <span class="cbar-track"><span class="cbar-fill" style="width:${f.kapasitas / maxF * 100}%;background:${f.warna}"></span></span>
      <b>${fmt(f.kapasitas)}</b></div>`).join('');
  document.getElementById('komp-sim').innerHTML = `<div class="komp-sim-grid">
    <div class="kbars"><p class="kbars-title">Kapasitas olah per jenis</p>${jenis}
      <p class="kbars-note">Residu mencakup residu murni ditambah sisa organik dan anorganik yang tidak terolah.</p></div>
    <div><p class="kbars-title">Kapasitas per fasilitas (ton/hari)</p><div class="fbars">${fas}</div>
      <div class="komp-total"><div><span>Timbulan 2026</span><b>${fmt(k.timbulan_total)}</b></div>
        <div><span>Terolah sistem</span><b>${fmt(k.terolah_total)}</b></div>
        <div><span>Ke Bantargebang</span><b class="red">${fmt(k.gap_bantargebang)}</b></div></div></div>
  </div>`;
}
