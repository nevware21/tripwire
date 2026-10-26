# Runner Performance History

Every benchmark run recorded with `npm run bench -- --record` (see
[Performance](../performance.md#recording-a-run)) is checked in under
[`results/`](results/index.json) and charted here, so the numbers on the performance page can be
read against their history rather than trusted as a single snapshot. Each point is one recorded
run: the harness average over its measured runs for one suite, on one target, under one runner.
Hover a point for the run count, median, minimum and maximum, the commit, and the versions in
play. Records carry no file-system paths, host, user or branch names, or OS build numbers.

<div id="perf-history" class="perf-history">
  <div class="perf-controls">
    <fieldset><legend>Target</legend><span data-filter="target"></span></fieldset>
    <fieldset><legend>Suite</legend><span data-filter="suite"></span></fieldset>
    <fieldset><legend>Runner</legend><span data-filter="runner"></span></fieldset>
    <fieldset><legend>Coverage</legend>
      <label><input type="radio" name="coverage" value="false" checked> off</label>
      <label><input type="radio" name="coverage" value="true"> on</label>
    </fieldset>
    <fieldset><legend>Metric</legend>
      <label><input type="radio" name="metric" value="avgMs" checked> average</label>
      <label><input type="radio" name="metric" value="medianMs"> median</label>
      <label><input type="radio" name="metric" value="minMs"> minimum</label>
    </fieldset>
  </div>
  <div class="perf-chart-wrap"><svg id="perf-chart" viewBox="0 0 960 420" role="img" aria-label="Benchmark history chart"></svg></div>
  <div id="perf-legend" class="perf-legend"></div>
  <p id="perf-status" class="perf-status">Loading recorded runs…</p>
  <h2 id="latest">Latest recorded run</h2>
  <div id="perf-latest"></div>
  <h2 id="runs">All recorded runs</h2>
  <div id="perf-runs"></div>
</div>

<style>
.perf-history { --fg: #ddd; --muted: #999; --grid: rgba(255,255,255,0.12); --panel: #1b1d20; --border: #333; }
.perf-history { color: var(--fg); }
.perf-controls { display: flex; flex-wrap: wrap; gap: 0.6rem 1.2rem; margin: 0.8rem 0; }
.perf-controls fieldset { border: 1px solid var(--border); border-radius: 4px; padding: 0.2rem 0.6rem 0.4rem; margin: 0; }
.perf-controls legend { font-size: 0.8rem; color: var(--muted); padding: 0 0.3rem; }
.perf-controls label { margin-right: 0.7rem; white-space: nowrap; font-size: 0.9rem; }
.perf-chart-wrap { background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 0.4rem; overflow-x: auto; }
.perf-chart-wrap svg { width: 100%; max-width: 100%; height: auto; display: block; font: 12px system-ui, sans-serif; }
.perf-legend { display: flex; flex-wrap: wrap; gap: 0.3rem 1rem; margin: 0.6rem 0; font-size: 0.85rem; }
.perf-legend span::before { content: ""; display: inline-block; width: 0.9em; height: 0.9em; margin-right: 0.35em; border-radius: 2px; background: var(--c); vertical-align: -0.1em; }
.perf-status { color: var(--muted); font-size: 0.9rem; }
.perf-history table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
.perf-history th, .perf-history td { border-bottom: 1px solid var(--border); padding: 0.3rem 0.5rem; text-align: left; white-space: nowrap; }
.perf-history td.num, .perf-history th.num { text-align: right; font-variant-numeric: tabular-nums; }
.perf-history .faster { color: #4caf50; } .perf-history .slower { color: #ef5350; }
</style>

<script>
(function () {
  "use strict";
  var root = document.getElementById("perf-history");
  var status = document.getElementById("perf-status");
  var svg = document.getElementById("perf-chart");
  var COLORS = ["#4fc3f7", "#ffb74d", "#aed581", "#f06292", "#ba68c8", "#4db6ac", "#fff176", "#ff8a65", "#90a4ae", "#7986cb", "#a1887f", "#e57373"];
  var state = { records: [], filters: { target: {}, suite: {}, runner: {} }, hidden: {} };

  function fmtMs(ms) { return ms === null || ms === undefined ? "-" : (ms >= 1000 ? (ms / 1000).toFixed(2) + " s" : Math.round(ms) + " ms"); }
  function fmtDate(iso) { return iso.slice(0, 10); }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) { e.textContent = text; }
    return e;
  }
  function svgEl(tag, attrs, text) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) { e.textContent = text; }
    return e;
  }
  function checked(name) { var i = root.querySelector("input[name='" + name + "']:checked"); return i ? i.value : null; }

  // One series per suite/target/runner; points from every record that measured that arm with the chosen coverage.
  function buildSeries() {
    var coverage = checked("coverage") === "true";
    var metric = checked("metric");
    var map = {};
    state.records.forEach(function (rec) {
      rec.results.forEach(function (r) {
        if (!!r.coverage !== coverage || r.measured === 0) { return; }
        if (!state.filters.target[r.target] || !state.filters.suite[r.suite] || !state.filters.runner[r.runner]) { return; }
        var key = r.target + " / " + r.suite + " / " + r.runner;
        if (!map[key]) { map[key] = { key: key, target: r.target, suite: r.suite, runner: r.runner, points: [] }; }
        map[key].points.push({ t: new Date(rec.recordedAt).getTime(), v: r[metric], r: r, rec: rec });
      });
    });
    var series = Object.keys(map).sort().map(function (k) { return map[k]; });
    series.forEach(function (s, i) { s.color = COLORS[i % COLORS.length]; s.points.sort(function (a, b) { return a.t - b.t; }); });
    return series;
  }

  function draw() {
    while (svg.firstChild) { svg.removeChild(svg.firstChild); }
    var series = buildSeries().filter(function (s) { return !state.hidden[s.key]; });
    var legend = document.getElementById("perf-legend");
    legend.textContent = "";
    buildSeries().forEach(function (s) {
      var item = el("span", { style: "--c:" + s.color + (state.hidden[s.key] ? ";opacity:.4;text-decoration:line-through" : ""), role: "button", tabindex: "0" }, s.key);
      item.addEventListener("click", function () { state.hidden[s.key] = !state.hidden[s.key]; draw(); });
      legend.appendChild(item);
    });
    var pts = [];
    series.forEach(function (s) { pts = pts.concat(s.points); });
    if (!pts.length) { status.textContent = "No recorded runs match the current filters."; return; }
    status.textContent = state.records.length + " recorded run" + (state.records.length === 1 ? "" : "s") + ", " + series.length + " series shown. Click a legend entry to hide or show it.";

    var W = 960, H = 420, L = 70, R = 20, T = 20, B = 50;
    var tMin = Math.min.apply(null, pts.map(function (p) { return p.t; }));
    var tMax = Math.max.apply(null, pts.map(function (p) { return p.t; }));
    if (tMax === tMin) { tMin -= 86400000; tMax += 86400000; }
    var vMax = Math.max.apply(null, pts.map(function (p) { return p.v; })) * 1.1;
    var x = function (t) { return L + (t - tMin) / (tMax - tMin) * (W - L - R); };
    var y = function (v) { return T + (1 - v / vMax) * (H - T - B); };

    // Grid and axes.
    var step = Math.pow(10, Math.floor(Math.log10(vMax))); if (vMax / step < 3) { step /= 2; }
    for (var v = 0; v <= vMax; v += step) {
      svg.appendChild(svgEl("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: "var(--grid)" }));
      svg.appendChild(svgEl("text", { x: L - 8, y: y(v) + 4, "text-anchor": "end", fill: "var(--muted)" }, fmtMs(v)));
    }
    var dates = {};
    pts.forEach(function (p) { dates[fmtDate(new Date(p.t).toISOString())] = p.t; });
    Object.keys(dates).sort().forEach(function (d, i, all) {
      if (all.length > 12 && i % Math.ceil(all.length / 12) !== 0) { return; }
      svg.appendChild(svgEl("text", { x: x(dates[d]), y: H - B + 18, "text-anchor": "middle", fill: "var(--muted)" }, d));
    });
    svg.appendChild(svgEl("line", { x1: L, x2: L, y1: T, y2: H - B, stroke: "var(--muted)" }));
    svg.appendChild(svgEl("line", { x1: L, x2: W - R, y1: H - B, y2: H - B, stroke: "var(--muted)" }));

    series.forEach(function (s) {
      if (s.points.length > 1) {
        svg.appendChild(svgEl("polyline", { points: s.points.map(function (p) { return x(p.t) + "," + y(p.v); }).join(" "), fill: "none", stroke: s.color, "stroke-width": 2 }));
      }
      s.points.forEach(function (p) {
        var c = svgEl("circle", { cx: x(p.t), cy: y(p.v), r: 4.5, fill: s.color, stroke: "var(--panel)", "stroke-width": 1.5 });
        var ver = p.rec.versions || {};
        c.appendChild(svgEl("title", {}, s.key + "\n" + p.rec.recordedAt.replace("T", " ").slice(0, 16) + " UTC  commit " + (p.rec.git && p.rec.git.commit || "?") +
          "\n" + checked("metric").replace("Ms", "") + " " + fmtMs(p.v) + "  (" + p.r.measured + " run" + (p.r.measured === 1 ? "" : "s") + "; median " + fmtMs(p.r.medianMs) + ", min " + fmtMs(p.r.minMs) + ", max " + fmtMs(p.r.maxMs) + ")" +
          "\ntripwire " + (ver.tripwire || "?") + ", node " + (ver.node || "?") + (ver.chrome ? ", Chrome " + ver.chrome + " (puppeteer " + ver.puppeteer + ")" : "") +
          "\n" + (p.rec.machine ? (p.rec.machine.cpu + ", " + p.rec.machine.logicalProcessors + " threads, " + p.rec.machine.memoryGB + " GB, " + p.rec.machine.os) : "")));
        svg.appendChild(c);
      });
    });
  }

  function renderLatest() {
    var latest = document.getElementById("perf-latest");
    latest.textContent = "";
    if (!state.records.length) { return; }
    // Latest record per coverage setting, so the table shows both axes when both exist.
    [false, true].forEach(function (cov) {
      var recs = state.records.filter(function (r) { return !!r.options.coverage === cov; });
      if (!recs.length) { return; }
      var rec = recs[recs.length - 1];
      var ver = rec.versions || {};
      latest.appendChild(el("h3", {}, (cov ? "With coverage" : "Without coverage") + " — " + fmtDate(rec.recordedAt) + ", commit " + (rec.git && rec.git.commit || "?")));
      latest.appendChild(el("p", { class: "perf-status" }, rec.options.runs + " measured run" + (rec.options.runs === 1 ? "" : "s") + " per arm" + (rec.options.warmup ? " after a warm-up" : "") +
        (rec.options.typeCheck ? ", type-checked" : ", transpile-only") + ". tripwire " + (ver.tripwire || "?") + ", node " + (ver.node || "?") +
        (ver.chrome ? ", Chrome " + ver.chrome + " bundled with puppeteer " + ver.puppeteer : "") + (rec.machine ? ". " + rec.machine.cpu + ", " + rec.machine.logicalProcessors + " threads, " + rec.machine.memoryGB + " GB, " + rec.machine.os + "." : "")));
      var table = el("table");
      var head = el("tr"); ["Target", "Suite", "Runner", "Average", "Median", "Min", "Max", "vs tripwire"].forEach(function (h, i) { head.appendChild(el("th", i >= 3 ? { class: "num" } : {}, h)); });
      table.appendChild(head);
      var base = {};
      rec.results.forEach(function (r) { if (r.runner === "tripwire") { base[r.target + "/" + r.suite] = r.avgMs; } });
      rec.results.forEach(function (r) {
        var tr = el("tr");
        [r.target, r.suite, r.runner].forEach(function (c) { tr.appendChild(el("td", {}, c)); });
        [r.avgMs, r.medianMs, r.minMs, r.maxMs].forEach(function (v) { tr.appendChild(el("td", { class: "num" }, r.measured ? fmtMs(v) : "failed")); });
        var b = base[r.target + "/" + r.suite];
        var cmp = "";
        var cls = "num";
        if (r.runner !== "tripwire" && b && r.avgMs) { var pct = (r.avgMs - b) / r.avgMs * 100; cmp = (pct >= 0 ? "tripwire faster by " : "tripwire slower by ") + Math.abs(pct).toFixed(1) + "%"; cls += pct >= 0 ? " faster" : " slower"; }
        tr.appendChild(el("td", { class: cls }, cmp));
        table.appendChild(tr);
      });
      latest.appendChild(table);
    });
  }

  function renderRuns(index) {
    var runs = document.getElementById("perf-runs");
    runs.textContent = "";
    var table = el("table");
    var head = el("tr"); ["Recorded (UTC)", "Commit", "Coverage", "Runs", "Arms", "Failures", "File"].forEach(function (h) { head.appendChild(el("th", {}, h)); });
    table.appendChild(head);
    index.records.slice().reverse().forEach(function (e) {
      var tr = el("tr");
      [e.recordedAt.replace("T", " ").slice(0, 16), e.commit || "?", e.coverage ? "on" : "off", String(e.runs), String(e.arms), String(e.failures)].forEach(function (c) { tr.appendChild(el("td", {}, c)); });
      var td = el("td"); var a = el("a", { href: "results/" + e.file }, e.file); td.appendChild(a); tr.appendChild(td);
      table.appendChild(tr);
    });
    runs.appendChild(table);
    if (index.invalid && index.invalid.length) {
      runs.appendChild(el("p", { class: "perf-status" }, index.invalid.length + " file(s) in results/ failed validation and are not charted: " + index.invalid.map(function (i) { return i.file; }).join(", ")));
    }
  }

  function buildFilters() {
    ["target", "suite", "runner"].forEach(function (dim) {
      var values = {};
      state.records.forEach(function (rec) { rec.results.forEach(function (r) { values[r[dim]] = true; }); });
      var span = root.querySelector("[data-filter='" + dim + "']");
      span.textContent = "";
      Object.keys(values).sort().forEach(function (v) {
        state.filters[dim][v] = true;
        var label = el("label"); var input = el("input", { type: "checkbox", checked: "checked" });
        input.addEventListener("change", function () { state.filters[dim][v] = input.checked; draw(); });
        label.appendChild(input); label.appendChild(document.createTextNode(" " + v)); span.appendChild(label);
      });
    });
    root.querySelectorAll("input[type='radio']").forEach(function (i) { i.addEventListener("change", draw); });
  }

  fetch("results/index.json").then(function (r) {
    if (!r.ok) { throw new Error("results/index.json: HTTP " + r.status); }
    return r.json();
  }).then(function (index) {
    renderRuns(index);
    return Promise.all(index.records.map(function (e) { return fetch("results/" + e.file).then(function (r) { return r.json(); }); }));
  }).then(function (records) {
    state.records = records.sort(function (a, b) { return a.recordedAt < b.recordedAt ? -1 : 1; });
    if (!records.length) { status.textContent = "No runs recorded yet. Run the benchmark with --record to add the first."; return; }
    buildFilters(); renderLatest(); draw();
  }).catch(function (e) { status.textContent = "Could not load recorded runs: " + e.message; });
})();
</script>
