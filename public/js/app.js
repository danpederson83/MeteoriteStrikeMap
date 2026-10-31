import { CONFIG } from "./config.js";
import { KINDS, FAMOUS, LEARN_HTML, classNote, heatNote, massCompare, formatMass } from "./kidfacts.js";

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
  selectedId: null,
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

async function loadData() {
  try {
    const res = await fetch(CONFIG.dataUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const geo = await res.json();
    state.all = geo.features;
    for (const f of state.all) state.byId.set(f.properties.id, f);
  } catch (e) {
    showError(`Couldn't load the meteorite data (${e.message}). Did you run scripts/build_data.py?`);
    return;
  }
  const years = state.all.map((f) => f.properties.year).filter((y) => y != null);
  $("year-from").placeholder = Math.min(...years);
  $("year-to").placeholder = Math.max(...years);
  applyFilters();

  // Re-open a meteorite from the address bar (e.g. a bookmarked link).
  const m = new URLSearchParams(location.hash.slice(1)).get("m");
  if (m && state.byId.has(+m)) select(+m, { fly: false });
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
  const n = features.length;
  $("count").textContent = `Showing ${n.toLocaleString()} meteorite${n === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------
// Map interaction

function wireMapEvents() {
  const hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: "hover-pop" });

  for (const layer of ["clusters", "points"]) {
    map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", layer, () => {
      map.getCanvas().style.cursor = "";
      hoverPopup.remove();
    });
  }
  map.on("mousemove", "points", (e) => {
    const p = e.features[0].properties;
    hoverPopup.setLngLat(e.features[0].geometry.coordinates).setText(p.name).addTo(map);
  });

  map.on("click", "clusters", async (e) => {
    const f = e.features[0];
    const zoom = await map.getSource("meteorites").getClusterExpansionZoom(f.properties.cluster_id);
    map.easeTo({ center: f.geometry.coordinates, zoom: Math.min(zoom + 0.5, 16) });
  });

  map.on("click", "points", (e) => {
    // Several meteorites can sit on the exact same spot (common in Antarctica),
    // so look for everything right around the click.
    const pad = 6;
    const box = [[e.point.x - pad, e.point.y - pad], [e.point.x + pad, e.point.y + pad]];
    const seen = new Set();
    const hits = map.queryRenderedFeatures(box, { layers: ["points"] })
      .filter((f) => !seen.has(f.properties.id) && seen.add(f.properties.id));
    if (hits.length === 1) select(hits[0].properties.id, { fly: false });
    else showPicker(hits.map((f) => state.byId.get(f.properties.id)));
  });
}

function flyTo(f) {
  const [lon, lat] = f.geometry.coordinates;
  map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 8.5), speed: 1.4 });
}

function select(id, { fly = true } = {}) {
  const f = state.byId.get(id);
  if (!f) return;
  state.selectedId = id;
  map.getSource("selected").setData({ type: "FeatureCollection", features: [f] });
  showDetails(f);
  setHashParam("m", id);
  if (fly) flyTo(f);
}

function clearSelection() {
  state.selectedId = null;
  map.getSource("selected")?.setData({ type: "FeatureCollection", features: [] });
  $("sidebar").hidden = true;
  document.body.classList.remove("sidebar-open");
  setHashParam("m", null);
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
  $("btn-reset").onclick = () => {
    state.kinds = new Set(Object.keys(KINDS));
    state.minMass = 0; state.yearFrom = state.yearTo = null;
    $("size").value = "0"; $("year-from").value = ""; $("year-to").value = "";
    document.querySelectorAll(".chip").forEach((c) => { c.classList.add("on"); c.setAttribute("aria-pressed", "true"); });
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

  const render = () => {
    const q = norm(input.value.trim());
    if (q.length < 2) { list.hidden = true; return; }
    const starts = [], contains = [];
    for (const f of state.all) {
      const n = norm(f.properties.name);
      if (n.startsWith(q)) starts.push(f);
      else if (n.includes(q)) contains.push(f);
      if (starts.length >= 10) break;
    }
    matches = [...starts, ...contains].slice(0, 10);
    list.innerHTML = matches.length
      ? matches.map((f, i) => `<li><button data-i="${i}"><span class="dot" style="background:${KINDS[f.properties.kind].color}"></span>${esc(f.properties.name)}
          <span class="sr-year">${f.properties.year ?? ""}</span></button></li>`).join("")
      : `<li class="none">No meteorite with that name on the map</li>`;
    list.hidden = false;
    list.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => choose(matches[+b.dataset.i])));
  };
  const choose = (f) => {
    list.hidden = true;
    input.value = f.properties.name;
    select(f.properties.id);
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
  openModal("⭐ Famous meteorites", `
    <p>Tap one to fly there and read its story.</p>
    <ul class="famous-list">
      ${famous.map((f) => {
        const p = f.properties, k = KINDS[p.kind];
        return `<li><button data-id="${p.id}">
          <span class="fam-emoji">${k.emoji}</span>
          <span class="fam-main"><b>${esc(p.name)}</b>
            <span class="sub">${p.fell ? "👀 Seen falling" : "🔍 Found"} · ${p.year ?? "?"} · ${esc(formatMass(p.mass))}</span></span>
        </button></li>`;
      }).join("")}
    </ul>`);
  $("modal-body").querySelectorAll("[data-id]").forEach((b) => (b.onclick = () => { closeModal(); select(+b.dataset.id); }));
}

function showError(msg) {
  $("load-error").textContent = msg;
  $("load-error").hidden = false;
  $("count").textContent = "";
}

wireControls();
