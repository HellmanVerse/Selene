import type { Analysis, Match } from "@/lib/types";
import {
  defaultAnalogWeights,
  factorLabels,
  targetEvidence,
  type AnalogWeights,
  type Factor,
} from "@/lib/analog";
const unknown: Record<Factor, string> = {
  terrain:
    "Regional slope, relief, roughness and profile are calculated from elevation data at a shared comparison scale.",
  geology:
    "Local mineralogy and surface materials have not been characterized in this evidence catalog. Spectral maps and field samples are needed.",
  temperature:
    "No local seasonal temperature series or thermal-inertia product has been extracted. THEMIS/TES and Earth station or satellite records are needed.",
  water:
    "No site-specific ice-depth or water-resource layer has been extracted. Distinguish ancient aqueous alteration from current accessible water.",
  dust: "No local particle-size, wind-speed or erosion-rate observations are registered. Atmospheric density changes transport thresholds on Mars.",
  biology:
    "No local biosignature-preservation comparison is registered. Earth biology can test detection methods but cannot establish life on Mars.",
  subsurface:
    "No surveyed cave or subsurface geometry is registered here. Candidate pits do not establish safe, accessible interiors.",
  operations:
    "Regional slopes support reconnaissance. Rover obstacles, navigation, communications, construction materials and access require local surveys.",
  illumination:
    "No site-specific shadow, seasonal solar-exposure or sky-view calculation is available. Latitude alone does not establish illumination.",
  environment:
    "Earth cannot reproduce Martian gravity, air pressure or radiation exposure in an outdoor field site. No equivalence score is assigned.",
};

export default function AnalogEvidence({
  body,
  lat,
  lon,
  analysis,
  candidate,
  weights,
  onWeights,
  busy,
}: {
  body: "moon" | "mars";
  lat: number;
  lon: number;
  analysis: Analysis | null;
  candidate?: Match;
  weights: AnalogWeights;
  onWeights: (weights: AnalogWeights) => void;
  busy: boolean;
}) {
  const context = analysis?.targetEvidence ?? targetEvidence(body, lat, lon);
  const bodyName = body === "mars" ? "Mars" : "Moon";
  const keys = Object.keys(factorLabels) as Factor[];
  const available = keys.filter(
    (key) => key === "terrain" || !!context.factors[key],
  );
  const unavailable = keys.filter((key) => !available.includes(key));
  const otherTotal = keys.reduce(
    (sum, key) => sum + (key === "terrain" ? 0 : weights[key]),
    0,
  );
  const control = (key: Factor) =>
    key !== "terrain" ? (
      <label className="factor-weight">
        Priority within other factors <output>{weights[key]}</output>
        <input
          aria-label={`${factorLabels[key]} importance`}
          type="range"
          min="0"
          max="100"
          value={weights[key]}
          onChange={(e) =>
            onWeights({
              ...weights,
              terrain: 70,
              [key]: Number(e.target.value),
            })
          }
        />
        <small>
          {otherTotal > 0 ? ((30 * weights[key]) / otherTotal).toFixed(1) : "0"}
          % of the overall score
        </small>
      </label>
    ) : null;
  return (
    <section
      className="analog-evidence"
      aria-labelledby="analog-heading"
      aria-busy={busy}
    >
      <div className="eyebrow mono">
        LOCATION EVIDENCE / EARTH ANALOG PRIORITIES
      </div>
      <h2 id="analog-heading">Analog factors</h2>
      {
        <>
          <p>
            <strong>70% terrain shape · 30% conditions.</strong> Shape uses the
            mean-centered profile comparison. Adjust the priorities below to
            divide the conditions’ 30%. Missing factors earn no credit; their
            share stays within the 30% and is never transferred to shape.
          </p>
          <button
            className="text-button"
            onClick={() => onWeights({ ...defaultAnalogWeights })}
          >
            Reset factor priorities
          </button>
          {otherTotal === 0 && (
            <p>
              Other-factor priorities are all zero. Shape still contributes 70%;
              the remaining 30% is unallocated.
            </p>
          )}
          {candidate?.analog && (
            <p className="evidence-summary" aria-live="polite">
              {busy
                ? "Updating ranking…"
                : `Weighted analog score ${candidate.score.toFixed(1)} / 100 · evidence coverage ${candidate.analog.coverage.toFixed(0)}% · shape similarity ${candidate.profileSimilarity.toFixed(1)} / 100`}
            </p>
          )}
        </>
      }
      <div className="evidence-grid">
        {available.map((key) => {
          const target = context.factors[key],
            earth = candidate?.analog?.earth?.factors[key],
            result = candidate?.analog?.factors.find((f) => f.key === key);
          return (
            <article key={key}>
              <h3>{factorLabels[key]}</h3>
              {target && (
                <small className="condition-scope">
                  {target.scope === "planetary"
                    ? `${bodyName} baseline · not a local measurement`
                    : "Regional evidence"}
                </small>
              )}
              <p>
                {key === "terrain"
                  ? "Fixed 70% of the overall score. Profiles are mean-centered and standardized before comparing their shapes; the chart retains elevation amplitude in meters."
                  : target?.text}
              </p>
              {target && (
                <a href={target.source} target="_blank" rel="noreferrer">
                  Planetary evidence ↗
                </a>
              )}
              {target &&
                target.scope !== "planetary" &&
                context.baselineFactors?.[key] && (
                  <div className="planet-baseline">
                    <small>{bodyName} baseline</small>
                    <p>{context.baselineFactors[key]?.text}</p>
                    <a
                      href={context.baselineFactors[key]?.source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Baseline source ↗
                    </a>
                  </div>
                )}
              {control(key)}
              {candidate && (
                <>
                  <h4>Earth: {candidate.name}</h4>
                  {earth && (
                    <small className="condition-scope">
                      {earth.scope === "planetary"
                        ? "Earth baseline · local conditions may vary"
                        : "Regional evidence"}
                    </small>
                  )}
                  <p>
                    {key === "terrain"
                      ? `Shape similarity: ${candidate.profileSimilarity.toFixed(1)} / 100.`
                      : (earth?.text ??
                        "Earth-site conditions have not been documented for this factor.")}
                  </p>
                  {earth && (
                    <a href={earth.source} target="_blank" rel="noreferrer">
                      Earth evidence ↗
                    </a>
                  )}
                  {result && (
                    <p className="small-note">
                      {key !== "terrain" &&
                        (result.score === null
                          ? "Local comparison unavailable; no condition credit. "
                          : `Documented condition credit ${result.score.toFixed(0)} / 100. ${result.shared.length ? result.shared.join(", ").replaceAll("-", " ") : "No shared conditions recorded."} `)}
                      Weighted contribution: {result.contribution.toFixed(1)}{" "}
                      points.
                    </p>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>
      {unavailable.length > 0 && (
        <details className="unavailable-factors">
          <summary>View unavailable factors</summary>
          <p>
            These factors lack evidence for the selected planetary location,
            Earth candidate, or both. You can change their priorities to search
            for candidates with relevant documentation. Missing evidence earns
            no credit.
          </p>
          <ul>
            {unavailable.map((key) => {
              const target = context.factors[key],
                earth = candidate?.analog?.earth?.factors[key];
              return (
                <li key={key}>
                  <h4>{factorLabels[key]}</h4>
                  <p>{!target ? unknown[key] : target.text}</p>
                  {target && (
                    <a href={target.source} target="_blank" rel="noreferrer">
                      Planetary evidence ↗
                    </a>
                  )}
                  {candidate && (
                    <p>
                      {earth
                        ? earth.text
                        : `No Earth evidence registered for ${candidate.name}.`}
                    </p>
                  )}
                  {earth && (
                    <a href={earth.source} target="_blank" rel="noreferrer">
                      Earth evidence ↗
                    </a>
                  )}
                  {control(key)}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
