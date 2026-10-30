"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  Search,
  Crosshair,
  Layers,
  Download,
  Check,
  X,
  Globe2,
  Mountain,
  SlidersHorizontal,
  ExternalLink,
  MoveUpRight,
  Info,
  LoaderCircle,
  Orbit,
  BookOpen,
  MapPin,
} from "lucide-react";
import { locations } from "@/lib/locations";
import type { Analysis, Weights, Match } from "@/lib/types";
import Profile from "@/components/Profile";
import { coordinates } from "@/lib/terrain";
const Globe = dynamic(() => import("@/components/Globe"), { ssr: false });
const Earth = dynamic(() => import("@/components/GoogleEarth"), { ssr: false });
const TerrainMesh = dynamic(() => import("@/components/TerrainMesh"), {
  ssr: false,
});
const presets: Record<string, Weights> = {
  "Terrain reconnaissance": { slope: 40, relief: 25, roughness: 25, std: 10 },
  "Rover field testing": { slope: 60, relief: 10, roughness: 25, std: 5 },
  "Geological fieldwork": { slope: 15, relief: 40, roughness: 25, std: 20 },
};
const sourceLinks = [
  [
    "NASA LOLA",
    "Global elevation · active",
    "https://pds-geosciences.wustl.edu/missions/lro/lola.htm",
  ],
  [
    "LROC / NASA SVS",
    "Globe imagery · visual context only",
    "https://svs.gsfc.nasa.gov/4720/",
  ],
  [
    "Mapzen Terrain Tiles",
    "Earth elevation · active mixed-source composite",
    "https://registry.opendata.aws/terrain-tiles/",
  ],
  [
    "Tilezen attribution",
    "USGS, NASA SRTM, GMTED, ArcticDEM and other providers",
    "https://github.com/tilezen/joerd/blob/master/docs/attribution.md",
  ],
  [
    "SLDEM2015",
    "Regional elevation · not ingested",
    "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/sldem2015/",
  ],
  [
    "LROC",
    "NAC stereo terrain products · not ingested",
    "https://www.lroc.asu.edu/",
  ],
  [
    "NASA Diviner",
    "Thermal products · not ingested",
    "https://pds-geosciences.wustl.edu/missions/lro/diviner.htm",
  ],
  [
    "Moon Mineralogy Mapper",
    "Mineralogy · not ingested",
    "https://pds-imaging.jpl.nasa.gov/volumes/m3.html",
  ],
  [
    "NASA Moon Trek",
    "Independent lunar map context",
    "https://trek.nasa.gov/moon/",
  ],
  [
    "USGS Gazetteer",
    "Lunar feature reference; library uses representative centers",
    "https://planetarynames.wr.usgs.gov/",
  ],
  [
    "NASA Apollo landing sites",
    "Landing coordinate reference",
    "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html",
  ],
  [
    "Natural Earth",
    "Public-domain land boundaries for Earth screening",
    "https://www.naturalearthdata.com/",
  ],
];
const number = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { maximumFractionDigits: digits });
function save(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function kml(c: Match) {
  return `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Torsion Earth candidate</name><Placemark><name>${c.name.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</name><LookAt><longitude>${c.lon}</longitude><latitude>${c.lat}</latitude><range>150000</range><tilt>65</tilt><heading>0</heading></LookAt><Point><coordinates>${c.lon},${c.lat},0</coordinates></Point></Placemark></Document></kml>`;
}
export default function Home() {
  const [lat, setLat] = useState(-43.31),
    [lon, setLon] = useState(-11.36),
    [latInput, setLatInput] = useState("-43.31"),
    [lonInput, setLonInput] = useState("-11.36");
  const [site, setSite] = useState("Tycho"),
    [locationInput, setLocationInput] = useState("Tycho"),
    [radius, setRadius] = useState(100),
    [mission, setMission] = useState("Terrain reconnaissance"),
    [weights, setWeights] = useState<Weights>(
      presets["Terrain reconnaissance"],
    );
  const [modal, setModal] = useState<
      "library" | "sources" | "method" | "compare" | "export" | null
    >(null),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("All regions");
  const [analysis, setAnalysis] = useState<Analysis | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(0),
    [surface, setSurface] = useState(false);
  const result = useRef<HTMLElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    request = useRef(0),
    controller = useRef<AbortController | null>(null);
  const candidate = analysis?.candidates[selected];
  let draft: { lat: number; lon: number } | null = null;
  try {
    if (latInput.trim() && lonInput.trim())
      draft = coordinates(Number(latInput), Number(lonInput));
  } catch {
    /* Incomplete coordinate drafts are never sent to the API. */
  }
  const stale =
    !!analysis &&
    (!draft ||
      Math.abs(analysis.lat - draft.lat) > 1e-8 ||
      Math.abs(analysis.lon - draft.lon) > 1e-8 ||
      analysis.radius !== radius ||
      JSON.stringify(analysis.weights) !== JSON.stringify(weights));
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [modal]);
  function choose(la: number, lo: number, name = "Custom region") {
    setLat(la);
    setLon(lo);
    setLatInput(la.toFixed(5));
    setLonInput(lo.toFixed(5));
    setSite(name);
    setLocationInput(name === "Custom region" ? "" : name);
    setError("");
  }
  function locate() {
    void analyze(false);
  }
  const analyze = useCallback(
    async (scrollToResults = false) => {
      const id = ++request.current;
      controller.current?.abort();
      let point: { lat: number; lon: number };
      try {
        if (!latInput.trim() || !lonInput.trim())
          throw new Error("Enter both lunar coordinates.");
        point = coordinates(Number(latInput), Number(lonInput));
        if (Object.values(weights).every((value) => value === 0))
          throw new Error(
            "Choose at least one positive matching importance, or restore a mission preset.",
          );
      } catch (e) {
        setBusy(false);
        setError(
          e instanceof Error ? e.message : "Enter valid lunar coordinates.",
        );
        return;
      }
      setLat(point.lat);
      setLon(point.lon);
      const landmark = locations.find(
        (p) =>
          Math.abs(p.lat - point.lat) < 1e-5 &&
          Math.abs(p.lon - point.lon) < 1e-5,
      );
      setSite(landmark?.name ?? "Custom region");
      const abort = new AbortController();
      controller.current = abort;
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...point, radius, weights }),
          signal: abort.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (id !== request.current) return;
        setAnalysis(data);
        setSelected(0);
        if (scrollToResults)
          setTimeout(
            () =>
              result.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              }),
            80,
          );
      } catch (e) {
        if (
          id === request.current &&
          !(e instanceof DOMException && e.name === "AbortError")
        )
          setError(e instanceof Error ? e.message : "Analysis unavailable.");
      } finally {
        if (id === request.current) setBusy(false);
      }
    },
    [latInput, lonInput, radius, weights],
  );
  useEffect(() => {
    setBusy(true);
    setError("");
    const timer = setTimeout(() => {
      void analyze(false);
    }, 650);
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
      request.current++;
    };
  }, [analyze]);
  const filtered = locations.filter(
    (p) =>
      (category === "All regions" || p.category === category) &&
      p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const exportReport = (format: string) => {
    if (!analysis) return;
    if (format === "json")
      save(
        JSON.stringify(
          {
            ...analysis,
            sources: sourceLinks,
            method:
              "metrics-v1; spherical local grids; 10 km comparison; exponential weighted absolute differences",
          },
          null,
          2,
        ),
        "torsion-report.json",
        "application/json",
      );
    if (format === "csv") {
      const keys = [
        "min",
        "max",
        "mean",
        "median",
        "std",
        "relief",
        "slope",
        "maxSlope",
        "roughness",
        "ruggedness",
      ] as const;
      save(
        "metric,unit,moon_native,moon_10km,earth_candidate_10km\n" +
          keys
            .map(
              (k) =>
                `${k},${k.toLowerCase().includes("slope") ? "degrees" : "meters"},${analysis.metrics[k]},${analysis.comparison[k]},${candidate?.metrics[String(analysis.radius)][k] ?? ""}`,
            )
            .join("\n"),
        "torsion-comparison.csv",
        "text/csv",
      );
    }
    if (format === "kml" && candidate)
      save(
        kml(candidate),
        "torsion-earth-candidate.kml",
        "application/vnd.google-earth.kml+xml",
      );
    if (format === "print") {
      setModal(null);
      setTimeout(() => window.print(), 100);
    }
  };
  return (
    <>
      <header className="header">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Orbit size={22} />
          </span>
          Torsion<span className="brand-tag mono">LUNAR</span>
        </a>
        <nav>
          <a href="#explore">Explorer</a>
          <button onClick={() => setModal("method")}>Methodology</button>
          <button onClick={() => setModal("sources")}>
            Data sources <ArrowUpRight size={12} />
          </button>
        </nav>
        <a
          className="github-link mono"
          href="https://github.com/HellmanVerse/Selene"
          target="_blank"
          rel="noreferrer"
        >
          GITHUB <ArrowUpRight size={13} />
        </a>
      </header>
      <main>
        <section className="intro" id="explore">
          <div className="section-meta mono">
            <span aria-hidden="true" />
            <span>01 / EXPLORE THE MOON</span>
          </div>
          <div className="hero">
            <div className="hero-copy">
              <h1>
                Another world.
                <br />
                <span>Closer to home.</span>
              </h1>
              <p>Find Earth’s closest terrain analogs to the Moon.</p>
              <button
                className="button primary hero-cta"
                onClick={() =>
                  document
                    .getElementById("region-controls")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              >
                Explore a lunar region <ArrowRight size={16} />
              </button>
              <div className="hero-proof mono">
                <span>
                  <Crosshair size={13} /> ANY LUNAR COORDINATE
                </span>
                <span>
                  <Layers size={13} /> NASA LOLA ELEVATION
                </span>
              </div>
            </div>
            <div className="hero-globe">
              <div className="globe-corner mono">
                <span>MOON / LUNA</span>
                <span>MEAN RADIUS 1,737.4 KM</span>
              </div>
              <Globe
                lat={lat}
                lon={lon}
                name={site}
                onSelect={(la, lo) => choose(la, lo)}
              />
              <div className="globe-bottom mono">
                <span>
                  <span className="tiny-cross">+</span> DRAG TO ORBIT · CLICK TO
                  SELECT · SCROLL TO ZOOM
                </span>
                <span>NASA / LRO</span>
              </div>
            </div>
          </div>
          <div className="workflow mono">
            <span className="active">
              <b>01</b> EXPLORE MOON
            </span>
            <ArrowRight />
            <span className={analysis ? "active" : ""}>
              <b>02</b> ANALYZE TERRAIN
            </span>
            <ArrowRight />
            <span className={analysis ? "active" : ""}>
              <b>03</b> DISCOVER ANALOGS
            </span>
            <ArrowRight />
            <span>
              <b>04</b> COMPARE & EXPORT
            </span>
          </div>
        </section>
        <section className="workspace" id="region-controls">
          <aside className="region-panel">
            <div className="panel-heading">
              <span className="mono">YOUR LUNAR REGION</span>
              <span className="pill">LEVEL A</span>
            </div>
            <div className="selected-site">
              <div className="site-icon">
                <Crosshair size={22} />
              </div>
              <div>
                <h2>{site}</h2>
                <p>
                  {site === "Custom region"
                    ? "User-selected lunar coordinates"
                    : locations.find((p) => p.name === site)?.category}{" "}
                  <span> / MOON</span>
                </p>
              </div>
            </div>
            <label className="location-entry">
              <span>Lunar location</span>
              <div className="search-box">
                <Search size={14} />
                <input
                  aria-label="Lunar location"
                  list="lunar-locations"
                  placeholder="Type a lunar location…"
                  value={locationInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setLocationInput(value);
                    const place = locations.find(
                      (p) =>
                        p.name.toLowerCase() === value.trim().toLowerCase(),
                    );
                    if (place) choose(place.lat, place.lon, place.name);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    const place = locations.find(
                      (p) =>
                        p.name.toLowerCase() ===
                        locationInput.trim().toLowerCase(),
                    );
                    if (place) choose(place.lat, place.lon, place.name);
                    else
                      setError(
                        "Choose a lunar location from the suggestions or enter its coordinates below.",
                      );
                  }}
                />
              </div>
            </label>
            <datalist id="lunar-locations">
              {locations.map((p) => (
                <option key={p.name} value={p.name} />
              ))}
            </datalist>
            <p className="automatic-hint">
              Choose a suggested location or enter coordinates. Terrain
              measurements update automatically.
            </p>
            <button
              className="library-button"
              onClick={() => setModal("library")}
            >
              <Search size={14} /> Browse location library{" "}
              <span>
                {locations.length} <ArrowUpRight size={13} />
              </span>
            </button>
            <div className="coordinate-label mono">
              <span>OR ENTER COORDINATES</span>
              <Info size={12} />
            </div>
            <div className="coordinates">
              <label>
                Latitude <span>°N</span>
                <input
                  aria-label="Lunar latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={latInput}
                  onChange={(e) => {
                    setLatInput(e.target.value);
                    setLocationInput("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") locate();
                  }}
                />
              </label>
              <label>
                Longitude <span>°E</span>
                <input
                  aria-label="Lunar longitude"
                  type="number"
                  min="-180"
                  max="360"
                  step="any"
                  value={lonInput}
                  onChange={(e) => {
                    setLonInput(e.target.value);
                    setLocationInput("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") locate();
                  }}
                />
              </label>
              <button aria-label="Apply coordinates" onClick={locate}>
                <Crosshair size={17} />
              </button>
            </div>
            <div className="radius-row">
              <label htmlFor="radius">Region radius</label>
              <select
                id="radius"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              >
                <option value="50">50 km</option>
                <option value="100">100 km</option>
                <option value="150">150 km</option>
              </select>
            </div>
            <div className="selection-summary mono">
              {number(radius * 2)} × {number(radius * 2)} KM SQUARE ANALYSIS
              WINDOW
            </div>
          </aside>
          <div className="mission-panel">
            <div className="panel-heading">
              <span className="mono">MEASURED LUNAR TERRAIN</span>
              <span className="pill">AUTOMATIC</span>
            </div>
            <h2>
              Your location.
              <br />
              <span>Its terrain, measured.</span>
            </h2>
            <p>
              Slope, relief, roughness, and elevation variation are calculated
              from NASA elevation data for your selected region.
            </p>
            <dl
              className="auto-metrics"
              aria-label="Measured lunar terrain"
              aria-busy={busy}
              aria-live="polite"
            >
              {(
                [
                  ["Slope", "slope", "°"],
                  ["Relief", "relief", "m"],
                  ["Roughness", "roughness", "m"],
                  ["Elevation variation", "std", "m"],
                ] as const
              ).map(([label, key, unit]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {busy ? (
                      <span className="measuring">
                        <LoaderCircle size={11} className="spin" /> Measuring…
                      </span>
                    ) : analysis && !stale ? (
                      <>
                        {number(analysis.metrics[key], key === "slope" ? 2 : 0)}{" "}
                        <span>{unit}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="automatic-hint">
              {busy
                ? "Gathering terrain data for your selection…"
                : analysis && !stale
                  ? "Measured automatically · NASA LOLA · 1.895 km grid"
                  : "Enter a valid location to gather terrain data."}
            </p>
            <details className="advanced-mission">
              <summary>
                Advanced matching preferences <span>Optional</span>
                <ChevronDown size={13} />
              </summary>
              <p>
                These settings change the importance of each characteristic when
                ranking Earth matches. They do not enter or change the measured
                terrain values.
              </p>
              <select
                aria-label="Mission preset"
                value={mission}
                onChange={(e) => {
                  const m = e.target.value;
                  setMission(m);
                  if (presets[m]) setWeights(presets[m]);
                }}
              >
                {Object.keys(presets).map((k) => (
                  <option key={k}>{k}</option>
                ))}
                <option>Custom weights</option>
              </select>
              <div className="weights">
                {(Object.keys(weights) as (keyof Weights)[]).map((k) => (
                  <label key={k}>
                    <span>
                      {k === "std"
                        ? "Elevation variation"
                        : k[0].toUpperCase() + k.slice(1)}
                      <b className="mono">{weights[k]}</b>
                    </span>
                    <input
                      aria-label={`${k} matching importance`}
                      type="range"
                      min="0"
                      max="100"
                      value={weights[k]}
                      onChange={(e) => {
                        setMission("Custom weights");
                        setWeights({ ...weights, [k]: Number(e.target.value) });
                      }}
                    />
                  </label>
                ))}
              </div>
            </details>
          </div>
          <div className="ready-panel">
            <div className="panel-heading">
              <span className="mono">BUILT ON OBSERVATIONS</span>
              <Layers size={15} />
            </div>
            <div className="data-status">
              <i className="status-dot" />
              <strong>Global baseline ready</strong>
              <span className="mono">LOLA / LDEM_16</span>
            </div>
            <dl>
              <div>
                <dt>Grid spacing</dt>
                <dd>1.895 km N–S</dd>
              </div>
              <div>
                <dt>Matching sample spacing</dt>
                <dd>10 km</dd>
              </div>
              <div>
                <dt>Earth regions screened</dt>
                <dd>632</dd>
              </div>
              <div>
                <dt>Acquisition</dt>
                <dd>2009–2016</dd>
              </div>
            </dl>
            <button className="text-button" onClick={() => setModal("sources")}>
              View coverage & limitations <ArrowUpRight size={13} />
            </button>
            <div className="analysis-action">
              <p>
                Terrain data and Earth matches update automatically.
                <br />
                No synthetic elevation or invented scores.
              </p>
              <button
                className="button primary"
                onClick={() => {
                  if (analysis && !stale)
                    result.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  else void analyze(true);
                }}
                disabled={busy || Object.values(weights).every((v) => v === 0)}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="spin" size={16} /> Analyzing NASA
                    terrain…
                  </>
                ) : (
                  <>
                    View Earth analogs <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="live-announcement" aria-live="polite">
          {busy
            ? "Analyzing lunar terrain and matching Earth regions."
            : analysis
              ? `Analysis complete. ${analysis.candidateCount} Earth regions screened.`
              : ""}
        </div>
        {analysis && (
          <section className="results" ref={result}>
            <div className="results-heading">
              <div>
                <div className="eyebrow mono">
                  02 / A CONNECTION ACROSS WORLDS
                </div>
                <h2>Earth, through a lunar lens.</h2>
                <p>
                  {analysis.candidateCount} regions screened. Ranked by measured
                  topography at a shared 10 km spacing.
                </p>
              </div>
              <button
                className="button outline"
                onClick={() => setModal("export")}
              >
                <Download size={15} /> Export report
              </button>
            </div>
            {stale && (
              <div className="stale">
                <Info size={15} />{" "}
                {busy
                  ? "Updating terrain measurements and Earth matches for your selection…"
                  : "These results describe the previous selection. Current measurements are unavailable until the new analysis succeeds."}
                <button onClick={() => void analyze(false)} disabled={busy}>
                  Retry analysis <ArrowRight size={13} />
                </button>
              </div>
            )}
            <div className="metric-strip">
              {[
                ["Mean elevation", analysis.metrics.mean, "m"],
                ["Regional relief", analysis.metrics.relief, "m"],
                ["Mean resolved slope", analysis.metrics.slope, "°"],
                ["Plane-residual roughness", analysis.metrics.roughness, "m"],
              ].map(([label, value, unit]) => (
                <div key={String(label)}>
                  <span>{label}</span>
                  <strong>
                    {number(Number(value), unit === "°" ? 2 : 0)}
                    <small>{unit}</small>
                  </strong>
                  <span className="mono">NASA LOLA · 1.895 KM GRID</span>
                </div>
              ))}
            </div>
            <div className="discovery">
              <div className="candidate-list">
                <div className="panel-heading">
                  <span className="mono">TOP EARTH CANDIDATES</span>
                  <span className="mono">MORPHOLOGY</span>
                </div>
                {analysis.candidates.map((c, i) => (
                  <button
                    className={`candidate ${selected === i ? "selected" : ""}`}
                    key={c.name}
                    onClick={() => setSelected(i)}
                  >
                    <span className="rank mono">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="candidate-name">
                      <strong>{c.name}</strong>
                      <small>
                        {c.catalog
                          ? "Reference location"
                          : "Global screen · outside reference catalog"}{" "}
                        · {number(c.resolution / 1000, 1)} km tile spacing
                      </small>
                    </span>
                    <span className="score mono">
                      {c.score.toFixed(1)}
                      <small>/100</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
                <p className="small-note">
                  Similarity index, not a probability. Sites outside the catalog
                  are screening candidates; their scientific novelty has not
                  been established.
                </p>
              </div>
              {candidate && (
                <div className="earth-panel">
                  <div className="earth-panel-heading">
                    <span className="mono">
                      <i className="status-dot" />
                      03 / EARTH EXPLORER
                    </span>
                    <span className="mono">
                      {candidate.lat.toFixed(3)}°, {candidate.lon.toFixed(3)}°
                    </span>
                  </div>
                  <Earth
                    lat={candidate.lat}
                    lon={candidate.lon}
                    name={candidate.name}
                    elevation={
                      candidate.metrics[String(analysis.radius)].profile[
                        Math.floor(
                          candidate.metrics[String(analysis.radius)].profile
                            .length / 2,
                        )
                      ]
                    }
                  />
                  <div className="earth-caption">
                    <div>
                      <span className="eyebrow mono">
                        SELECTED ANALOG CANDIDATE
                      </span>
                      <h3>{candidate.name}</h3>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => setModal("compare")}
                    >
                      Compare terrain <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="earth-links">
                    <a
                      href={`https://earth.google.com/web/@${candidate.lat},${candidate.lon},0a,150000d,35y,0h,65t,0r`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Earth <ExternalLink size={12} />
                    </a>
                    <button onClick={() => exportReport("kml")}>
                      Download KML <Download size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="terrain-section">
              <div className="terrain-profile">
                <div className="panel-heading">
                  <span className="mono">LUNAR TERRAIN PROFILE</span>
                  <button
                    className="text-button"
                    onClick={() => setSurface(!surface)}
                  >
                    {surface ? "Show profile" : "Inspect 3D surface"}{" "}
                    <Mountain size={13} />
                  </button>
                </div>
                {surface ? (
                  <TerrainMesh grid={analysis.grid} />
                ) : (
                  <Profile values={analysis.metrics.profile} />
                )}
                <p className="small-note">
                  West–east transect through the analysis center. Lunar
                  elevations are relative to a 1,737.4 km sphere. Native raster
                  extraction uses nearest neighbors.
                </p>
              </div>
              <div className="slope-panel">
                <div className="panel-heading">
                  <span className="mono">RESOLVED SLOPE DISTRIBUTION</span>
                  <span className="pill">REGIONAL</span>
                </div>
                <div className="slope-bars">
                  {analysis.metrics.histogram.map((n, i) => {
                    const total = analysis.metrics.histogram.reduce(
                        (a, b) => a + b,
                        0,
                      ),
                      pct = (n / total) * 100;
                    return (
                      <div key={i}>
                        <span className="mono">
                          {
                            ["0–1°", "1–2°", "2–5°", "5–10°", "10–20°", "≥20°"][
                              i
                            ]
                          }
                        </span>
                        <div>
                          <i style={{ width: `${Math.max(pct, 1)}%` }} />
                        </div>
                        <b className="mono">{pct.toFixed(1)}%</b>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <details className="limitations">
              <summary>
                Scientific limitations & provenance <ChevronDown size={15} />
              </summary>
              <ul>
                {analysis.limitations.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <p className="mono">
                PRODUCT LDEM_16 V3.1 · GENERATED{" "}
                {new Date(analysis.created).toISOString()} · GRID VALIDITY{" "}
                {analysis.coverage}%
              </p>
              <code>SHA-256 {String(analysis.source.sha256)}</code>
            </details>
          </section>
        )}
        {!analysis && (
          <section className="explainer">
            <div className="eyebrow mono">SAME SHAPES. DIFFERENT WORLDS.</div>
            <div>
              <h2>
                A better place to prepare
                <br />
                for the next giant leap.
              </h2>
              <p>
                From impact basins to volcanic plains, Earth holds terrain that
                can help us understand the Moon. Torsion makes those connections
                measurable—and their limitations visible.
              </p>
            </div>
            <div className="principles">
              <article>
                <span className="mono">01 / EXPLORE</span>
                <Globe2 size={22} />
                <h3>The whole lunar surface.</h3>
                <p>
                  Choose a landmark or any coordinate. The global LOLA grid
                  provides the baseline.
                </p>
              </article>
              <article>
                <span className="mono">02 / MEASURE</span>
                <Mountain size={22} />
                <h3>Let the terrain speak.</h3>
                <p>
                  Compare slope, relief, elevation variation, and regional
                  roughness from elevation data.
                </p>
              </article>
              <article>
                <span className="mono">03 / CONNECT</span>
                <MoveUpRight size={22} />
                <h3>Find a starting point.</h3>
                <p>
                  Explore ranked Earth candidates, inspect the differences, and
                  export your evidence.
                </p>
              </article>
            </div>
          </section>
        )}
      </main>
      <footer>
        <a className="brand" href="#">
          <Orbit size={20} />
          Torsion
        </a>

        <div>
          <button onClick={() => setModal("sources")}>
            Sources & limitations <ArrowUpRight size={12} />
          </button>
          <a href="https://github.com/HellmanVerse/Selene">
            Source code <ArrowUpRight size={12} />
          </a>
        </div>
      </footer>
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setModal(null);
        }}
        className={`dialog ${modal === "compare" ? "wide" : ""}`}
      >
        <div className="dialog-inner">
          <div className="dialog-header">
            <span className="eyebrow mono">
              TORSION /{" "}
              {modal === "library"
                ? "LOCATION LIBRARY"
                : modal === "sources"
                  ? "DATA TRANSPARENCY"
                  : modal === "method"
                    ? "METHODOLOGY"
                    : modal === "export"
                      ? "EXPORT RESEARCH"
                      : "TERRAIN COMPARISON"}
            </span>
            <button aria-label="Close dialog" onClick={() => setModal(null)}>
              <X size={19} />
            </button>
          </div>
          {modal === "library" && (
            <>
              <h2>Where will you begin?</h2>
              <p>
                Representative locations for exploration. These points are not
                feature boundaries; the chosen analysis window determines the
                sampled region.
              </p>
              <div className="search-box">
                <Search size={16} />
                <input
                  placeholder="Search lunar locations…"
                  aria-label="Search lunar locations"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="categories">
                {[
                  "All regions",
                  ...new Set(locations.map((l) => l.category)),
                ].map((c) => (
                  <button
                    className={category === c ? "active" : ""}
                    key={c}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="location-list">
                {filtered.map((l) => (
                  <button
                    key={l.name}
                    onClick={() => {
                      choose(l.lat, l.lon, l.name);
                      setModal(null);
                    }}
                  >
                    <span>
                      <strong>{l.name}</strong>
                      <small>{l.category}</small>
                    </span>
                    <span className="mono">
                      {l.lat.toFixed(2)}°, {l.lon.toFixed(2)}°{" "}
                      <ArrowUpRight size={13} />
                    </span>
                  </button>
                ))}
                {!filtered.length && (
                  <p>
                    No matching landmarks. You can enter any lunar coordinates
                    in the explorer.
                  </p>
                )}
              </div>
            </>
          )}
          {modal === "sources" && (
            <>
              <h2>
                The source is part
                <br />
                of the science.
              </h2>
              <p>
                What is measured, what is interpolated, and what remains
                unavailable.
              </p>
              <div className="source-level">
                <div>
                  <span className="pill">A · ACTIVE</span>
                  <h3>Global lunar topography</h3>
                </div>
                <p>
                  LDEM_16 v3.1 · 5,760 × 2,880 samples · 16 pixels/degree · 0.5
                  m encoded height increments · 1.895 km north–south grid
                  spacing. East–west spacing contracts with latitude.
                </p>
                <p>
                  Acquired 13 July 2009–29 November 2016. Created 15 March 2019.
                  All 16,588,800 grid cells passed the ingestion validity check.
                  This is 100% grid validity, not 100% direct laser observation.
                  Interpolation and 45° band-edge artifacts limit
                  interpretation. Vertical uncertainty is not quantified here.
                </p>
              </div>
              <div className="source-level">
                <div>
                  <span className="pill muted">B · NOT INGESTED</span>
                  <h3>Regional enhancement</h3>
                </div>
                <p>
                  SLDEM2015 provides higher-resolution midlatitude topography
                  (approximately 60°S–60°N). Diviner and M³ products require
                  product-specific coverage and calibration. They are not used
                  for numerical results in this deployment.
                </p>
              </div>
              <div className="source-level">
                <div>
                  <span className="pill muted">C · NOT INGESTED</span>
                  <h3>Local terrain & hazards</h3>
                </div>
                <p>
                  NAC-derived terrain is available at selected sites. Local
                  coverage is not verified in this deployment; boulder,
                  crater-shape, regolith, illumination, thermal, and detailed
                  traversability metrics remain unavailable.
                </p>
              </div>
              <div className="source-level">
                <h3>Earth screening</h3>
                <p>
                  632 land-centered regions on a 5-degree lattice from 65°S to
                  80°N, plus named references. Measured Mapzen zoom-4 elevation
                  tiles use a mixture of source DEMs. Matching uses 10 km sample
                  spacing and equal-sized square windows. Tile spacing is up to
                  9.8 km at the equator. Source acquisition dates and vertical
                  uncertainty vary and are not supplied per tile. Coastal
                  windows may include water. This is not a complete search of
                  Earth.
                </p>
              </div>
              <div className="source-list">
                {sourceLinks.map(([name, note, url]) => (
                  <a key={name} href={url} target="_blank" rel="noreferrer">
                    <span>
                      <strong>{name}</strong>
                      <small>{note}</small>
                    </span>
                    <ArrowUpRight size={16} />
                  </a>
                ))}
              </div>
            </>
          )}
          {modal === "method" && (
            <>
              <h2>Evidence over intuition.</h2>
              <p>
                Torsion uses a deterministic terrain comparison. Numerical
                scores are calculated from data, never generated by a language
                model.
              </p>
              <ol className="method-list">
                <li>
                  <b>Select a region.</b> Any body-fixed lunar coordinate, with
                  east-positive longitude. A spherical azimuthal-equidistant
                  local grid handles poles and the longitude seam.
                </li>
                <li>
                  <b>Extract elevation.</b> The selected NASA LOLA band files
                  are decompressed server-side. Native nearest-neighbor samples
                  support regional terrain metrics; the browser receives only
                  the region and a display mesh.
                </li>
                <li>
                  <b>Calculate descriptors.</b> Elevation statistics,
                  finite-difference slopes, eight-neighbor RMS ruggedness, and
                  RMS residuals from a least-squares plane. The profile is the
                  center west–east transect.
                </li>
                <li>
                  <b>Match at a shared scale.</b> Lunar and Earth windows use
                  the same physical extent and 10 km sample spacing. Earth
                  metrics are preprocessed from measured elevation tiles, then
                  cached.
                </li>
                <li>
                  <b>Rank and explain.</b> Four parameter similarities are
                  weighted by your mission settings. The score is a similarity
                  index, not a confidence level.
                </li>
              </ol>
              <div className="formula mono">
                sᵢ = 100 × exp(−|earthᵢ − moonᵢ| / scaleᵢ)
                <br />
                score = Σ(weightᵢ × sᵢ) / Σ(weightᵢ)
              </div>
              <p>
                Reference scales: slope 3°, relief 3,000 m, roughness 600 m,
                elevation standard deviation 1,000 m. These are transparent
                heuristic scales, not empirically calibrated mission thresholds.
                Preset weights are editable research preferences.
              </p>
              <p>
                Terrestrial gravity, atmosphere, radiation, temperature,
                materials and access do not reproduce lunar conditions. Those
                similarities are unmeasured. No site is certified suitable for
                fieldwork or landing.
              </p>
              <button
                className="button outline"
                onClick={() => setModal("sources")}
              >
                Inspect data & limitations <BookOpen size={15} />
              </button>
            </>
          )}
          {modal === "compare" && analysis && candidate && (
            <>
              <h2>Comparison</h2>
              <p>
                Lunar region {analysis.lat.toFixed(3)}°,{" "}
                {analysis.lon.toFixed(3)}° ↔ {candidate.name}. Both comparison
                columns use 10 km sample spacing, a {analysis.radius * 2} km
                square window, and meter-based gradients.
              </p>
              <div className="compare-profile">
                <Profile
                  values={analysis.comparison.profile}
                  other={candidate.metrics[String(analysis.radius)].profile}
                  large
                />
                <div className="legend">
                  <span>
                    <i />
                    Moon · NASA LOLA
                  </span>
                  <span>
                    <i />
                    Earth · Mapzen terrain
                  </span>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Moon</th>
                    <th>Earth</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      "min",
                      "max",
                      "mean",
                      "median",
                      "std",
                      "relief",
                      "slope",
                      "maxSlope",
                      "roughness",
                      "ruggedness",
                    ] as const
                  ).map((k) => (
                    <tr key={k}>
                      <td>
                        {
                          {
                            min: "Minimum elevation",
                            max: "Maximum elevation",
                            mean: "Mean elevation",
                            median: "Median elevation",
                            std: "Elevation std. deviation",
                            relief: "Regional relief",
                            slope: "Mean resolved slope",
                            maxSlope: "Maximum resolved slope",
                            roughness: "Plane-residual roughness",
                            ruggedness: "8-neighbor RMS ruggedness",
                          }[k]
                        }
                      </td>
                      <td>
                        {number(analysis.comparison[k], 2)}{" "}
                        {k.toLowerCase().includes("slope") ? "°" : "m"}
                      </td>
                      <td>
                        {number(
                          candidate.metrics[String(analysis.radius)][k],
                          2,
                        )}{" "}
                        {k.toLowerCase().includes("slope") ? "°" : "m"}
                      </td>
                      <td>
                        {number(
                          candidate.metrics[String(analysis.radius)][k] -
                            analysis.comparison[k],
                          2,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3>Why this candidate ranked here</h3>
              <div className="similarities">
                {(Object.keys(candidate.similarity) as (keyof Weights)[]).map(
                  (k) => (
                    <div key={k}>
                      <span>{k === "std" ? "Elevation variation" : k}</span>
                      <strong className="mono">
                        {candidate.similarity[k].toFixed(1)} / 100
                      </strong>
                      <small>
                        Weight {analysis.weights[k]} · signed difference{" "}
                        {number(candidate.differences[k], 2)}{" "}
                        {k === "slope" ? "°" : "m"}
                      </small>
                    </div>
                  ),
                )}
              </div>
              <p className="small-note">
                Absolute lunar and terrestrial elevations use different datums
                and are displayed for context only. They do not contribute to
                the score. Environmental and material similarity: unavailable.
              </p>
              <button
                className="button primary"
                onClick={() => setModal("export")}
              >
                Export comparison <Download size={14} />
              </button>
            </>
          )}
          {modal === "export" && analysis && (
            <>
              <h2>
                Take the evidence
                <br />
                with you.
              </h2>
              <p>
                Exports include the coordinates and measured results from your
                completed analysis. The JSON report includes source provenance,
                algorithm settings, and limitations.
              </p>
              <div className="export-options">
                {[
                  [
                    "json",
                    "Full scientific report",
                    "JSON · metrics, rankings, sources & limitations",
                  ],
                  [
                    "csv",
                    "Terrain comparison",
                    "CSV · Moon and selected Earth candidate",
                  ],
                  [
                    "kml",
                    "Explore in Google Earth",
                    "KML · selected candidate and tilted camera",
                  ],
                  [
                    "print",
                    "Print / save as PDF",
                    "Use your browser’s print dialog",
                  ],
                ].map(([f, title, note]) => (
                  <button key={f} onClick={() => exportReport(f)}>
                    <Download size={19} />
                    <span>
                      <strong>{title}</strong>
                      <small>{note}</small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
