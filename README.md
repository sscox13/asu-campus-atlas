# Tempe Atlas

An interactive 3D map of Arizona State University's Tempe campus, built with Three.js and OpenStreetMap data.

**[Open the interactive map](https://sscox13.github.io/asu-campus-atlas/)**

## Explore

- 252 named building footprints with hover labels and search.
- Solid-color walls, textured roofs, and a greener campus base; illustrative materials rather than surveyed replicas.
- 867 trees at mapped locations.
- Toggleable north-up grid overview with 100-meter cells.
- Walking directions between buildings, with route markers, estimated distance and walking time, and an OpenStreetMap directions link.
- Download the [cleaned STL](asu-tempe-named-buildings.stl) or the [textured GLB](asu-tempe-campus-roof-textured.glb).

## Run locally

From this folder, run:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. Use a web server rather than opening index.html directly, so the browser can load the model and routing data. Three.js modules and fonts load from external CDNs.

## GitHub Pages

Publish from **main / (root)** under **Settings → Pages → Deploy from a branch**. No build step is required. The .nojekyll file tells Pages to serve static assets directly.

## Model and route details

- 402 unnamed or generically numbered footprints were removed from the viewer and STL.
- Horizontal scale 1:10,000; building heights exaggerated 2×. Import STL as millimeters.
- STL contains geometry; GLB includes building colors and roof textures. Trees, route markers, labels and the grid are viewer overlays.
- Routes use the October 24, 2026 OpenStreetMap path snapshot. Walking time assumes 75 meters per minute. Dashed endpoint links estimate connections to nearby paths; entrances are not verified. Routes may include stairs and do not account for live closures.
- One building lacks connected mapped access; the interface offers an external OpenStreetMap link when a local route is unavailable.

## Attribution

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the [Open Database License](https://opendatacommons.org/licenses/odbl/1-0/). See [ATTRIBUTION.txt](ATTRIBUTION.txt).

This independent project is not affiliated with or endorsed by Arizona State University.


Major street names are painted directly on the ground and can be toggled with Streets. Mapped landscape areas and street geometry come from the existing OpenStreetMap snapshot. Solid building walls use a polished sheen; separate window panes have been removed.
