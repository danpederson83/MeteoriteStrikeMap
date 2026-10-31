// Settings you might want to change.
export const CONFIG = {
  // Basemap style. OpenFreeMap is free, needs no API key, and is built for MapLibre.
  // Other free options: "https://tiles.openfreemap.org/styles/bright",
  // "https://tiles.openfreemap.org/styles/positron" (plain, grey).
  // You can also self-host tiles later (see README) and point this at your own server.
  styleUrl: "https://tiles.openfreemap.org/styles/liberty",

  dataUrl: "data/meteorites.geojson",
  cratersUrl: "data/craters.geojson",

  // Where the map starts (longitude, latitude).
  startCenter: [10, 25],
  startZoom: 1.4,

  // Start as a 3D globe (true) or a flat map (false).
  startGlobe: true,
};
