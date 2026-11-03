import type { Match } from "@/lib/types";
const factors = [
  [
    "Geology & materials",
    "Compare mineral assemblages, alteration and volcanic or sedimentary processes. Useful for instrument calibration and sample interpretation.",
    "CRISM / M³ · Earth Landsat spectroscopy",
    "https://pds-geosciences.wustl.edu/missions/mro/crism.htm",
  ],
  [
    "Temperature & exposure",
    "Compare seasonal extremes and surface thermal behavior for equipment and field operations. Earth atmosphere changes heat transfer.",
    "THEMIS / Diviner · NASA Earthdata thermal imagery",
    "https://earthdata.nasa.gov/",
  ],
  [
    "Water, ice & resources",
    "Check ice depth, permafrost, salinity and seasonal persistence before proposing a resource or drilling analog.",
    "SHARAD / lunar polar observations · Earth cryosphere products",
    "https://pds-geosciences.wustl.edu/missions/mro/sharad.htm",
  ],
  [
    "Dust, wind & erosion",
    "Compare sediment transport, particle size and landforms for mobility and dust testing. Mars atmospheric density changes transport thresholds.",
    "MARCI / surface observations · Earth aerosol products",
    "https://pds-atmospheres.nmsu.edu/",
  ],
  [
    "Biology & habitability",
    "Study preservation and detection of biosignatures in dry, salty or cold environments; distinguish modern Earth biology from planetary evidence.",
    "Rover observations · Earth field and laboratory studies",
    "https://astrobiology.nasa.gov/",
  ],
  [
    "Caves & subsurface",
    "Verify actual cave geometry, stability and access for navigation, robotics and habitat studies. Regional DEMs cannot resolve roofs or interiors.",
    "Orbital imagery · terrestrial cave surveys",
    "https://trek.nasa.gov/",
  ],
  [
    "Exploration operations",
    "Evaluate slopes at rover scale, obstacles, access, communications and construction properties with local surveys before field deployment.",
    "HiRISE / NAC terrain · local Earth surveys",
    "https://hirise.lpl.arizona.edu/dtm/",
  ],
];
export default function AnalogEvidence({
  body,
  candidate,
}: {
  body: "moon" | "mars";
  candidate?: Match;
}) {
  return (
    <section className="analog-evidence" aria-labelledby="analog-heading">
      <div className="eyebrow mono">BEYOND APPEARANCE / ANALOG EVIDENCE</div>
      <h2 id="analog-heading">
        What can Earth teach us about{" "}
        {body === "mars" ? "Mars" : "a lunar base"}?
      </h2>
      <p>
        {candidate
          ? `${candidate.name} is a terrain screening candidate. `
          : "Select a region to find terrain screening candidates. "}
        A useful analog can match one process well. Build the case by recording
        supporting observations, differences and an exploration experiment.
      </p>
      <article>
        <span className="pill">MEASURED</span>
        <h3>Terrain & topography</h3>
        <p>
          Equal physical windows and shared 10 km comparison spacing. Elevation,
          slope, relief and roughness support regional reconnaissance and
          test-area selection. Local obstacles and landing hazards require finer
          surveys.
        </p>
      </article>
      <div className="evidence-grid">
        {factors.map(([name, description, datasets, url]) => (
          <article key={name}>
            <span className="pill muted">RESEARCH LAYER · UNMEASURED</span>
            <h3>{name}</h3>
            <p>{description}</p>
            <a href={url} target="_blank" rel="noreferrer">
              {datasets} ↗
            </a>
          </article>
        ))}
      </div>
      <p className="small-note">
        Where the analogy breaks down: Earth gravity, air pressure, radiation
        and biology differ from both destinations. A terrain score alone cannot
        establish environmental similarity or suitability for a permanent base.
        Candidate place names describe representative centers, not approved
        landing or base sites.
      </p>
    </section>
  );
}
