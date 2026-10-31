import { CONFIG } from "./config.js";
import {
  KINDS, FAMOUS, LEARN_HTML, classNote, heatNote, massCompare, formatMass,
  CRATER_COLOR, CRATER_STORIES, formatDiameter, craterSizeCompare, formatAge, eraNote,
} from "./kidfacts.js";

const $ = (id) => document.getElementById(id);
const THIS_YEAR = new Date().getFullYear();

const state = {
  all: [],                 // every feature
  byId: new Map(),
  fall: "all",             // "all" | "fell"
  kinds: new Set(Object.keys(KINDS)),
  minMass: 0,
  yearFrom: null,
  yearTo: null,
  craters: [],             // impact craters (not filtered by the meteorite filters)
  craterById: new Map(),
  showCraters: true,
  selected: null,          // { type: "m" | "c", id }
  globe: CONFIG.startGlobe,
};

// ---------------------------------------------------------------------------
// Map setup

// A plain fallback style used when the online basemap can't be reached
// (for example if the home server has no internet). Meteorites still show.
const FALLBACK_STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: "bg", type: "background", paint: { "background-color": "#bcd7ee" } }],
};

async function loadStyle() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(CONFIG.styleUrl, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.warn("Basemap unavailable, using plain background:", e);
    return FALLBACK_STYLE;
  }
}

// Pick a font the basemap's glyph server actually has, for cluster numbers.
function findFont(style) {
  if (!style.glyphs) return null;
  const fonts = new Set();
  for (const l of style.layers || []) {
    const f = l.layout && l.layout["text-font"];
    if (Array.isArray(f) && f.every((x) => typeof x === "string")) f.forEach((x) => fonts.add(x));
  }
  const list = [...fonts];
  return list.find((f) => /bold/i.test(f)) || list[0] || null;
}

const style = await loadStyle();
const clusterFont = findFont(style);

const map = new maplibregl.Map({
  container: "map",
  style,
  center: CONFIG.startCenter,
  zoom: CONFIG.startZoom,
  hash: "map",            // keeps the current view in the address bar (#map=zoom/lat/lon)
  attributionControl: { compact: true },
});
window.meteoriteMap = map; // handy for poking around in the browser console
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
map.addControl(new maplibregl.FullscreenControl(), "bottom-right");
map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-left");

const kindColor = ["match", ["get", "kind"],
  ...Object.entries(KINDS).flatMap(([k, v]) => [k, v.color]),
  "#e0803a"];
const massLog = ["ln", ["max", ["coalesce", ["get", "mass"], 1], 1]];

map.on("load", async () => {
  applyProjection();

  map.addSource("meteorites", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
    cluster: true,
    clusterRadius: 45,
    clusterMaxZoom: 7,
    promoteId: "id",
  });
  map.addSource("selected", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addSource("craters", { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "id" });
  map.addSource("crater-size", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "meteorites",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": ["step", ["get", "point_count"], "#ffd166", 50, "#f4a259", 500, "#e76f51", 3000, "#b5446e"],
      "circle-radius": ["step", ["get", "point_count"], 14, 50, 19, 500, 25, 3000, 32],
      "circle-stroke-width": 3,
      "circle-stroke-color": "rgba(255,255,255,0.85)",
      "circle-opacity": 0.92,
    },
  });
  if (clusterFont) {
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "meteorites",
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-font": [clusterFont],
        "text-size": 14,
        "text-allow-overlap": true,
      },
      paint: { "text-color": "#2b2118" },
    });
  }
  map.addLayer({
    id: "points",
    type: "circle",
    source: "meteorites",
    filter: ["!", ["has", "point_count"]],
    layout: { "circle-sort-key": massLog },   // big ones drawn on top
    paint: {
      "circle-color": kindColor,
      "circle-radius": ["interpolate", ["linear"], massLog, 0, 4, 7, 6, 11.5, 9, 14, 12, 18, 17],
      "circle-stroke-width": ["case", ["==", ["get", "fell"], 1], 3, 1],
      "circle-stroke-color": ["case", ["==", ["get", "fell"], 1], "#ffffff", "rgba(0,0,0,0.45)"],
    },
  });
  // The selected crater's real size, drawn to scale (visible when zoomed in).
  map.addLayer({
    id: "crater-size-fill",
    type: "fill",
    source: "crater-size",
    paint: { "fill-color": CRATER_COLOR, "fill-opacity": 0.12 },
  });
  map.addLayer({
    id: "crater-size-line",
    type: "line",
    source: "crater-size",
    paint: { "line-color": CRATER_COLOR, "line-width": 3, "line-dasharray": [2, 1.5] },
  });
  // Craters: hollow brown rings, bigger for bigger craters.
  map.addLayer({
    id: "craters",
    type: "circle",
    source: "craters",
    layout: { "circle-sort-key": ["coalesce", ["get", "diam"], 0] },
    paint: {
      "circle-color": "rgba(124,45,18,0.15)",
      // Smaller when zoomed out, so the world view isn't covered in rings.
      "circle-radius": ["interpolate", ["linear"], ["zoom"],
        1, ["interpolate", ["linear"], ["ln", ["*", ["coalesce", ["get", "diam"], 1], 1000]], 2.5, 3.5, 12, 9],
        6, ["interpolate", ["linear"], ["ln", ["*", ["coalesce", ["get", "diam"], 1], 1000]], 2.5, 6, 7, 10, 12, 20]],
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 1, 2, 6, 3.5],
      "circle-stroke-color": CRATER_COLOR,
    },
  });
  map.addLayer({
    id: "selected-ring",
    type: "circle",
    source: "selected",
    paint: {
      "circle-radius": 22,
      "circle-color": "rgba(255,255,0,0.15)",
      "circle-stroke-width": 4,
      "circle-stroke-color": "#ffdd00",
    },
  });

  await loadData();
  wireMapEvents();
});

function applyProjection() {
  map.setProjection({ type: state.globe ? "globe" : "mercator" });
  $("btn-globe").textContent = state.globe ? "🗺️ Flat map" : "🌍 Globe";
}

// ---------------------------------------------------------------------------
// Data

async function fetchGeo(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).features;
}

async function loadData() {
  // Craters are optional: if they fail to load, the meteorites still work.
  const cratersP = fetchGeo(CONFIG.cratersUrl).catch((e) => {
    console.warn("Couldn't load craters:", e);
    return [];
  });
  try {
    state.all = await fetchGeo(CONFIG.dataUrl);
    for (const f of state.all) state.byId.set(f.properties.id, f);
  } catch (e) {
    showError(`Couldn't load the meteorite data (${e.message}). Did you run scripts/build_data.py?`);
    return;
  }
  state.craters = await cratersP;
  for (const f of state.craters) state.craterById.set(f.properties.id, f);

  const years = state.all.map((f) => f.properties.year).filter((y) => y != null);
  $("year-from").placeholder = Math.min(...years);
  $("year-to").placeholder = THIS_YEAR;
  applyFilters();

  // Re-open a meteorite or crater from the address bar (e.g. a bookmarked link).
  const params = new URLSearchParams(location.hash.slice(1));
  const m = params.get("m"), c = params.get("c");
  if (m && state.byId.has(+m)) select(+m, { fly: false });
  else if (c && state.craterById.has(+c)) selectCrater(+c, { fly: false });
}

function passes(p) {
  if (state.fall === "fell" && !p.fell) return false;
  if (!state.kinds.has(p.kind)) return false;
  if (state.minMass && !(p.mass >= state.minMass)) return false;
  if (state.yearFrom != null && !(p.year >= state.yearFrom)) return false;
  if (state.yearTo != null && !(p.year <= state.yearTo)) return false;
  return true;
}

function applyFilters() {
  const features = state.all.filter((f) => passes(f.properties));
  map.getSource("meteorites")?.setData({ type: "FeatureCollection", features });
  const craters = state.showCraters ? state.craters : [];
  map.getSource("craters")?.setData({ type: "FeatureCollection", features: craters });
  const n = features.length, c = craters.length;
  $("count").textContent = `Showing ${n.toLocaleString()} meteorite${n === 1 ? "" : "s"}`
    + (c ? ` and ${c} crater${c === 1 ? "" : "s"}` : "");
}

// ---------------------------------------------------------------------------
// Map interaction

function wireMapEvents() {
  const hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "hover-pop" });

  for (const layer of ["clusters", "points", "craters"]) {
    map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", layer, () => {
      map.getCanvas().style.cursor = "";
      hoverPopup.remove();
    });
  }
  for (const [layer, label] of [["points", (p) => p.name], ["craters", (p) => `💥 ${p.name} crater`]]) {
    map.on("mousemove", layer, (e) => {
      const f = e.features[0];
      hoverPopup.setLngLat(f.geometry.coordinates).setText(label(f.properties)).addTo(map);
    });
  }

  // One click handler so a crater ring on top of a meteorite dot or a
  // cluster bubble wins, instead of both opening at once.
  map.on("click", async (e) => {
    const crater = map.queryRenderedFeatures(e.point, { layers: ["craters"] })[0];
    if (crater) { selectCrater(crater.properties.id, { fly: false }); return; }

    // Several meteorites can sit on the exact same spot (common in Antarctica),
    // so look for everything right around the click.
    const pad = 6;
    const box = [[e.point.x - pad, e.point.y - pad], [e.point.x + pad, e.point.y + pad]];
    const seen = new Set();
    const hits = map.queryRenderedFeatures(box, { layers: ["points"] })
      .filter((f) => !seen.has(f.properties.id) && seen.add(f.properties.id));
    if (hits.length === 1) { select(hits[0].properties.id, { fly: false }); return; }
    if (hits.length > 1) { showPicker(hits.map((f) => state.byId.get(f.properties.id))); return; }

    const cluster = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
    if (cluster) {
      const zoom = await map.getSource("meteorites").getClusterExpansionZoom(cluster.properties.cluster_id);
      map.easeTo({ center: cluster.geometry.coordinates, zoom: Math.min(zoom + 0.5, 16) });
    }
  });
}

function flyTo(f) {
  const [lon, lat] = f.geometry.coordinates;
  map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 8.5), speed: 1.4 });
}

function select(id, { fly = true } = {}) {
  const f = state.byId.get(id);
  if (!f) return;
  highlight({ type: "m", id }, f);
  showDetails(f);
  if (fly) flyTo(f);
}

function selectCrater(id, { fly = true } = {}) {
  const f = state.craterById.get(id);
  if (!f) return;
  highlight({ type: "c", id }, f);
  const km = f.properties.diam;
  map.getSource("crater-size").setData({ type: "FeatureCollection", features: km ? [circlePolygon(f.geometry.coordinates, km / 2)] : [] });
  showCraterDetails(f);
  if (fly) flyToCrater(f);
}

function highlight(sel, f) {
  state.selected = sel;
  map.getSource("selected").setData({ type: "FeatureCollection", features: [f] });
  map.getSource("crater-size").setData({ type: "FeatureCollection", features: [] });
  setHashParam("m", sel.type === "m" ? sel.id : null);
  setHashParam("c", sel.type === "c" ? sel.id : null);
}

function clearSelection() {
  state.selected = null;
  map.getSource("selected")?.setData({ type: "FeatureCollection", features: [] });
  map.getSource("crater-size")?.setData({ type: "FeatureCollection", features: [] });
  $("sidebar").hidden = true;
  document.body.classList.remove("sidebar-open");
  setHashParam("m", null);
  setHashParam("c", null);
}

// A circle of the given radius (km) on the ground, as a polygon.
function circlePolygon([lon, lat], km, steps = 72) {
  const R = 6371, d = km / R, la = (lat * Math.PI) / 180, lo = (lon * Math.PI) / 180;
  const ring = [];
  for (let i = 0; i <= steps; i++) {
    const b = (2 * Math.PI * i) / steps;
    const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
    const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
    ring.push([(lo2 * 180) / Math.PI, (la2 * 180) / Math.PI]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} };
}

// Zoom so the whole crater fits on screen, with its real-size outline showing.
function flyToCrater(f) {
  const km = f.properties.diam;
  if (!km) { flyTo(f); return; }
  const ring = circlePolygon(f.geometry.coordinates, km / 2).geometry.coordinates[0];
  const lons = ring.map((p) => p[0]), lats = ring.map((p) => p[1]);
  const bounds = [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
  const phone = window.innerWidth <= 700, open = !$("sidebar").hidden;
  const padding = phone
    ? { top: 110, left: 30, right: 30, bottom: open ? $("sidebar").offsetHeight + 20 : 60 }
    : { top: 90, left: 60, bottom: 60, right: open ? 420 : 60 };
  // On a short screen the padding could leave no room at all; fall back to a plain fly.
  if (padding.top + padding.bottom > window.innerHeight - 80) { flyTo(f); return; }
  map.fitBounds(bounds, { padding, maxZoom: 17, speed: 1.4 });
}

// Keep "m=<id>" alongside MapLibre's "map=..." in the hash.
function setHashParam(key, value) {
  const params = new URLSearchParams(location.hash.slice(1));
  if (value == null) params.delete(key);
  else params.set(key, value);
  const str = params.toString().replace(/%2F/g, "/");
  history.replaceState(null, "", str ? `#${str}` : location.pathname + location.search);
}

// ---------------------------------------------------------------------------
// Sidebar

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function showDetails(f) {
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  const kind = KINDS[p.kind];
  const story = FAMOUS[p.name];
  const ago = p.year != null ? THIS_YEAR - p.year : null;
  const cmp = massCompare(p.mass);
  const notes = [classNote(p.class), heatNote(p.class)].filter(Boolean);

  $("sidebar-content").innerHTML = `
    <div class="kind-banner" style="--kind:${kind.color}">
      <span class="kind-emoji">${kind.emoji}</span> ${esc(kind.label)} meteorite
    </div>
    <h2 class="m-name">${esc(p.name)}</h2>
    <div class="badge ${p.fell ? "badge-fell" : "badge-found"}">
      ${p.fell ? "👀 People saw it fall!" : "🔍 Found on the ground"}
    </div>

    ${story ? `<div class="story"><div class="story-title">⭐ Famous meteorite</div><p>${esc(story)}</p></div>` : ""}

    <dl class="facts">
      <dt>⚖️ Weight</dt>
      <dd><b>${esc(formatMass(p.mass))}</b>${cmp ? `<div class="sub">That's ${esc(cmp)}!</div>` : ""}</dd>

      <dt>📅 ${p.fell ? "Fell in" : "Found in"}</dt>
      <dd><b>${p.year ?? "Unknown"}</b>${ago != null ? `<div class="sub">about ${ago.toLocaleString()} year${ago === 1 ? "" : "s"} ago</div>` : ""}
        ${!p.fell ? `<div class="sub">It may have landed long before it was found.</div>` : ""}</dd>

      <dt>📍 Location</dt>
      <dd>${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? "E" : "W"}</dd>

      <dt>🔬 Type</dt>
      <dd><b>${esc(kind.label)}</b><div class="sub">${esc(kind.blurb)}</div>
        <div class="sub">Scientific class: <code>${esc(p.class)}</code></div>
        ${notes.map((n) => `<div class="sub">${esc(n)}</div>`).join("")}</dd>
    </dl>

    <div class="actions">
      <button class="btn" id="btn-flyto">🔍 Zoom to it</button>
      <a class="btn" target="_blank" rel="noopener" href="https://www.lpi.usra.edu/meteor/metbull.php?code=${p.id}">📖 Science record</a>
      <a class="btn" target="_blank" rel="noopener" href="https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(p.name + " meteorite")}">🌐 Wikipedia</a>
    </div>
  `;
  $("btn-flyto").onclick = () => flyTo(f);
  $("sidebar").hidden = false;
  document.body.classList.add("sidebar-open");
  $("sidebar").scrollTop = 0;
}

function showCraterDetails(f) {
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  const story = CRATER_STORIES[p.name];
  const cmp = craterSizeCompare(p.diam);
  const age = formatAge(p.age, THIS_YEAR);
  const era = eraNote(p.age);
  const wiki = p.wiki
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(p.wiki.replace(/ /g, "_"))}`
    : `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(p.name + " crater")}`;

  $("sidebar-content").innerHTML = `
    <div class="kind-banner" style="--kind:${CRATER_COLOR}">
      <span class="kind-emoji">💥</span> Impact crater
    </div>
    <h2 class="m-name">${esc(p.name)}</h2>
    ${p.place ? `<div class="sub place">📍 ${esc(p.place)}</div>` : ""}

    ${story ? `<div class="story"><div class="story-title">⭐ Famous crater</div><p>${esc(story)}</p></div>` : ""}

    <dl class="facts">
      <dt>📏 How wide</dt>
      <dd><b>${esc(formatDiameter(p.diam))}</b>${cmp ? `<div class="sub">${esc(cmp)}${/^about/.test(cmp) ? "!" : "."}</div>` : ""}
        ${p.diam ? `<div class="sub">The dashed circle on the map shows its real size. Zoom in or out to compare it with towns and roads.</div>` : ""}</dd>

      <dt>📅 When it was made</dt>
      <dd><b>${esc(age.main)}</b>${age.sub ? `<div class="sub">${esc(age.sub)}</div>` : ""}
        ${era ? `<div class="sub">${esc(era)}</div>` : ""}</dd>

      <dt>🌍 Location</dt>
      <dd>${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? "E" : "W"}</dd>
    </dl>

    <div class="actions">
      <button class="btn" id="btn-flyto">🔍 Zoom to it</button>
      <a class="btn" target="_blank" rel="noopener" href="${wiki}">🌐 Wikipedia</a>
    </div>
  `;
  $("btn-flyto").onclick = () => flyToCrater(f);
  $("sidebar").hidden = false;
  document.body.classList.add("sidebar-open");
  $("sidebar").scrollTop = 0;
}

// When several meteorites are stacked on one spot, let the user choose.
function showPicker(features) {
  features.sort((a, b) => (b.properties.mass ?? 0) - (a.properties.mass ?? 0));
  const shown = features.slice(0, 100);
  $("sidebar-content").innerHTML = `
    <h2 class="m-name">${features.length.toLocaleString()} meteorites here!</h2>
    <p class="sub">They were found very close together. Pick one (heaviest first):</p>
    <ul class="pick-list">
      ${shown.map((f) => `<li><button data-id="${f.properties.id}">
        <span class="dot" style="background:${KINDS[f.properties.kind].color}"></span>
        <span class="pick-name">${esc(f.properties.name)}</span>
        <span class="pick-mass">${esc(formatMass(f.properties.mass))}</span></button></li>`).join("")}
    </ul>
    ${features.length > shown.length ? `<p class="sub">…and ${features.length - shown.length} more. Zoom in further to see them.</p>` : ""}
  `;
  $("sidebar-content").querySelectorAll("[data-id]").forEach((b) => (b.onclick = () => select(+b.dataset.id, { fly: false })));
  $("sidebar").hidden = false;
  document.body.classList.add("sidebar-open");
  $("sidebar").scrollTop = 0;
}

// ---------------------------------------------------------------------------
// Controls

function buildKindChips() {
  $("kind-chips").innerHTML = Object.entries(KINDS).map(([k, v]) =>
    `<button class="chip on" data-kind="${k}" style="--kind:${v.color}" aria-pressed="true" title="${esc(v.blurb)}">
       <span class="dot"></span>${v.emoji} ${esc(v.label)}</button>`).join("");
  $("kind-chips").querySelectorAll(".chip").forEach((chip) => {
    chip.onclick = () => {
      const k = chip.dataset.kind;
      if (state.kinds.has(k)) state.kinds.delete(k); else state.kinds.add(k);
      chip.classList.toggle("on", state.kinds.has(k));
      chip.setAttribute("aria-pressed", state.kinds.has(k));
      applyFilters();
    };
  });
}

function setFall(v) {
  state.fall = v;
  document.querySelectorAll(".seg-btn").forEach((b) => {
    const on = b.dataset.fall === v;
    b.classList.toggle("active", on);
    b.setAttribute("aria-checked", on);
  });
  applyFilters();
}

function readYear(el) {
  const v = el.value.trim();
  return v === "" || isNaN(+v) ? null : +v;
}

function wireControls() {
  buildKindChips();
  document.querySelectorAll(".seg-btn").forEach((b) => (b.onclick = () => setFall(b.dataset.fall)));
  $("size").onchange = (e) => { state.minMass = +e.target.value; applyFilters(); };
  for (const id of ["year-from", "year-to"]) {
    $(id).oninput = () => {
      state.yearFrom = readYear($("year-from"));
      state.yearTo = readYear($("year-to"));
      applyFilters();
    };
  }
  const craterChip = $("crater-chip");
  craterChip.style.setProperty("--kind", CRATER_COLOR);
  const setCraters = (on) => {
    state.showCraters = on;
    craterChip.classList.toggle("on", on);
    craterChip.setAttribute("aria-pressed", on);
    applyFilters();
  };
  craterChip.onclick = () => setCraters(!state.showCraters);

  $("btn-reset").onclick = () => {
    setCraters(true);
    state.kinds = new Set(Object.keys(KINDS));
    state.minMass = 0; state.yearFrom = state.yearTo = null;
    $("size").value = "0"; $("year-from").value = ""; $("year-to").value = "";
    document.querySelectorAll("#kind-chips .chip").forEach((c) => { c.classList.add("on"); c.setAttribute("aria-pressed", "true"); });
    setFall("all");
  };

  $("filters-toggle").onclick = () => {
    const open = $("filters").classList.toggle("collapsed") === false;
    $("filters-toggle").setAttribute("aria-expanded", open);
  };
  if (window.matchMedia("(max-width: 700px)").matches) {
    $("filters").classList.add("collapsed");
    $("filters-toggle").setAttribute("aria-expanded", "false");
  }

  $("sidebar-close").onclick = clearSelection;
  $("btn-globe").onclick = () => {
    state.globe = !state.globe;
    if (map.getSource("meteorites")) applyProjection(); // otherwise applied on load
  };
  $("btn-learn").onclick = () => openModal("Learn about meteorites", LEARN_HTML);
  $("btn-famous").onclick = openFamous;
  $("modal-close").onclick = closeModal;
  $("modal").onclick = (e) => { if (e.target === $("modal")) closeModal(); };
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("modal").hidden) closeModal();
    else if (!$("search-results").hidden) $("search-results").hidden = true;
    else clearSelection();
  });

  wireSearch();
}

// Search ignores the filters, so you can always find a meteorite by name.
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function wireSearch() {
  const input = $("search");
  const list = $("search-results");
  let matches = [];

  // Craters are listed first: there are few of them, and "Chicxulub" or
  // "Meteor Crater" should not get buried under meteorites with similar names.
  const render = () => {
    const q = norm(input.value.trim());
    if (q.length < 2) { list.hidden = true; return; }
    const starts = [], contains = [];
    const scan = (features, crater) => {
      for (const f of features) {
        const n = norm(f.properties.name);
        if (n.startsWith(q)) starts.push({ f, crater });
        else if (n.includes(q)) contains.push({ f, crater });
        if (starts.length >= 10) break;
      }
    };
    scan(state.craters, true);
    scan(state.all, false);
    matches = [...starts, ...contains].slice(0, 10);
    list.innerHTML = matches.length
      ? matches.map(({ f, crater }, i) => `<li><button data-i="${i}">${crater
          ? `<span class="dot ring-dot" style="--kind:${CRATER_COLOR}"></span>${esc(f.properties.name)}<span class="sr-year">crater</span>`
          : `<span class="dot" style="background:${KINDS[f.properties.kind].color}"></span>${esc(f.properties.name)}<span class="sr-year">${f.properties.year ?? ""}</span>`}
          </button></li>`).join("")
      : `<li class="none">No meteorite or crater with that name on the map</li>`;
    list.hidden = false;
    list.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => choose(matches[+b.dataset.i])));
  };
  const choose = ({ f, crater }) => {
    list.hidden = true;
    input.value = f.properties.name;
    if (crater) {
      // Make sure the crater is visible on the map, then go there.
      if (!state.showCraters) $("crater-chip").click();
      selectCrater(f.properties.id);
    } else select(f.properties.id);
  };

  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && matches[0] && !list.hidden) choose(matches[0]); });
  input.addEventListener("focus", render);
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) list.hidden = true; });
}

// ---------------------------------------------------------------------------
// Modal

function openModal(title, html) {
  $("modal-title").textContent = title;
  $("modal-body").innerHTML = html;
  $("modal").hidden = false;
  $("modal-close").focus();
}
function closeModal() { $("modal").hidden = true; }

function openFamous() {
  const famous = state.all.filter((f) => FAMOUS[f.properties.name])
    .sort((a, b) => (b.properties.mass ?? 0) - (a.properties.mass ?? 0));
  const craters = state.craters.filter((f) => CRATER_STORIES[f.properties.name])
    .sort((a, b) => (b.properties.diam ?? 0) - (a.properties.diam ?? 0));
  openModal("⭐ Famous meteorites & craters", `
    <p>Tap one to fly there and read its story.</p>
    <h2>Meteorites</h2>
    <ul class="famous-list">
      ${famous.map((f) => {
        const p = f.properties, k = KINDS[p.kind];
        return `<li><button data-id="${p.id}">
          <span class="fam-emoji">${k.emoji}</span>
          <span class="fam-main"><b>${esc(p.name)}</b>
            <span class="sub">${p.fell ? "👀 Seen falling" : "🔍 Found"} · ${p.year ?? "?"} · ${esc(formatMass(p.mass))}</span></span>
        </button></li>`;
      }).join("")}
    </ul>
    ${craters.length ? `<h2>Impact craters</h2>
    <ul class="famous-list">
      ${craters.map((f) => {
        const p = f.properties;
        return `<li><button data-crater="${p.id}">
          <span class="fam-emoji">💥</span>
          <span class="fam-main"><b>${esc(p.name)}</b>
            <span class="sub">${esc(formatDiameter(p.diam))} wide · ${esc(formatAge(p.age, THIS_YEAR).main)}</span></span>
        </button></li>`;
      }).join("")}
    </ul>` : ""}`);
  $("modal-body").querySelectorAll("[data-id]").forEach((b) => (b.onclick = () => { closeModal(); select(+b.dataset.id); }));
  $("modal-body").querySelectorAll("[data-crater]").forEach((b) => (b.onclick = () => {
    closeModal();
    if (!state.showCraters) $("crater-chip").click();
    selectCrater(+b.dataset.crater);
  }));
}

function showError(msg) {
  $("load-error").textContent = msg;
  $("load-error").hidden = false;
  $("count").textContent = "";
}

wireControls();
