# TerraMatch / Selene

A lunar-only Next.js + TypeScript terrain explorer. Its monochrome interface uses Geist typography and takes visual cues from Vercel Ship. The interactive lunar globe uses NASA SVS LROC imagery. Terrain measurements come from genuine NASA LOLA LDEM_16 data; a deterministic engine compares them to 632 measured Earth regions.

## Run

Node 22+ and pnpm 11.25.0:

```sh
pnpm install
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

All baseline assets are checked in. A fresh install does **not** download a global DEM. No credentials are required for baseline terrain analysis or the alternative 3D Earth globe. NASA rasters are server-only, gzip-compressed in latitude bands; the browser receives only a regional result and display mesh. Large production COGs belong in object storage, not this frontend repository.

## Scientific method

- Coordinate system: lunar Mean Earth / Polar Axis DE421, east-positive. Input longitude −180…360, normalized to −180…180. Latitude −90…90.
- Product: LDEM_16 v3.1, 5,760 × 2,880, little-endian signed int16, multiply DN by 0.5 for elevation meters relative to a sphere of radius 1,737,400 m. Raw label and SHA-256 are preserved in `data/`.
- Acquisition: 2009-07-13 through 2016-11-29. Product creation: 2019-03-15. Native spacing: 1,895.21 m N–S, latitude-dependent E–W. All 16,588,800 grid cells are valid. This is grid validity, **not** direct laser footprint coverage. Interpolation and 45-degree band boundary artifacts remain possible.
- Extraction: a local spherical azimuthal-equidistant square grid; nearest-neighbor raster values preserve original measurements and work across seams and poles. Requested radius denotes the half-width; a native window rounds down to complete cells.
- Metrics: min/max/mean/median/std, relief, finite-difference slopes, slope histogram, RMS residuals from a least-squares plane, eight-neighbor RMS ruggedness, and center west–east profiles. Roughness is regional topography, not regolith grain size. These definitions are implemented in both the Python preparation pipeline and TypeScript runtime.
- Earth screen: 622 land-centered lattice regions every 5 degrees (65°S–80°N) plus 10 familiar references, masked with Natural Earth land boundaries. Not a complete search. Coastal windows may include water.
- Earth source: 110 public Mapzen zoom-4 Terrarium elevation tiles, mixed source DEMs, up to ~9.8 km pixel spacing at equator. Per-tile acquisition dates/vertical uncertainty are unavailable. Source-resolution claims must not be inferred from resampled spacing.
- Matching: both bodies are sampled on equal-sized square grids at 10 km spacing; cached Earth features exist for 50, 100 and 150 km radii. The score is a weighted mean of `100 * exp(-abs(Earth - Moon)/scale)`, for mean slope (3° scale), relief (3,000 m), plane-residual roughness (600 m) and elevation std. deviation (1,000 m). Scales and mission presets are editable heuristic research choices, not calibrated probabilities or suitability thresholds. Mean absolute elevation is excluded because datums differ.
- Reports: JSON (full analysis/provenance/limitations), CSV (comparison), KML (Earth location and tilted camera), browser print/PDF.

## Coverage and acceptance status

**Working:** global baseline extraction, arbitrary coordinates including poles and far side, native regional metrics, broad measured Earth candidate screen, editable mission weights, animated alternative 3D Earth navigation, side-by-side numerical comparison, terrain profiles/3D lunar surface, source disclosures, report exports, responsive UI, automated scientific tests.

**Unavailable, explicitly disclosed:** SLDEM regional enhancement, local NAC DTMs, validated crater morphology, Diviner thermal analysis, M³ material comparisons, illumination models, rover path/traversability simulation, and high-resolution hazard detection. The extension service below supports real COG ingestion but is not provisioned with optional products. Do not describe this deployment as satisfying those acceptance criteria. An interpolated 1.895 km grid cannot resolve small hazards. Quantified vertical/derived uncertainty is not available. No environment, materials, accessibility, safety or geological suitability score is invented.

**Google 3D:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` enables Google's supported Maps JavaScript `maps3d` library. A configured Cloud project, API authorization, referrer restrictions and billing are required. Without a key, an interactive Three.js Earth globe animates to the selected coordinates; Google Earth deep links and KML remain available. Photorealistic Google 3D is not verified without a valid key.

## Rebuild measured assets

```sh
python -m pip install -r requirements.txt
python scripts/prepare_data.py
```

This downloads the 33 MB NASA source, validates label/size/sentinel cells, preserves checksums, packages 18 server bands, downloads visualization textures, and samples Earth tiles on a global land lattice. Raw downloads stay in ignored `data/raw/`; immutable derived results are versioned. Inspect archive labels when refreshing products; do not silently reinterpret updated formats.

## Optional Python COG extension

`processing/` contains a FastAPI/Rasterio/NumPy/SciPy/PyProj service for a coverage catalog of actual lunar COGs, local extraction and higher-resolution terrain metrics. It is an optional service scaffold, not an active source in the deployed app. Run its dependencies separately. Coverage entries must include real bounds, dates, product IDs, resolution and source links; empty catalog means unavailable. For large rasters use object storage with HTTP range access and raster pyramids. Expensive new analyses should run as background jobs with a cache keyed by source hash, coordinates, radius, spacing and algorithm version. No object store, worker or enhanced dataset is provisioned by this repository.

## Deployment

Import `HellmanVerse/Selene` into Vercel with Next.js detection and Node 22. Production uses `main`. Baseline source files are traced into the analysis function with `outputFileTracingIncludes`. API has a 60-second ceiling. To enable Google 3D, set the browser key in the Vercel environment and redeploy. Never put an unrestricted secret key into this public variable. CI validates types, scientific tests and production build. No secret or huge global raster is sent to the browser.

## Attribution

- NASA / GSFC / LOLA science team: https://pds-geosciences.wustl.edu/missions/lro/lola.htm
- Source label: https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_16.lbl
- NASA Scientific Visualization Studio, Ernie Wright / Noah Petro, CGI Moon Kit: https://svs.gsfc.nasa.gov/4720/ (imagery optimized for appearance; never used for scientific metrics).
- Earth texture: NASA Blue Marble, distributed through the Three.js examples.
- © Mapzen, OpenStreetMap and others. Terrain Tiles accessed 2026-10-29: https://registry.opendata.aws/terrain-tiles/
- Source providers and full attribution: https://github.com/tilezen/joerd/blob/master/docs/attribution.md and https://github.com/tilezen/joerd/blob/master/docs/data-sources.md
- Natural Earth public-domain boundaries: https://www.naturalearthdata.com/
- USGS lunar feature reference: https://planetarynames.wr.usgs.gov/ . Library entries are approximate representative centers, not verified polygon boundaries.
- NASA Apollo coordinate reference: https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html
- Regional/local archives: SLDEM2015 (PDS), LROC, Diviner (PDS), M³ (PDS Imaging), NASA Moon Trek. Their links and ingestion status appear inside the app.

Independent research software; NASA does not endorse this application.
