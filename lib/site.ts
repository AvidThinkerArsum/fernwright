/**
 * Everything editable lives here. Change the name and town and every heading,
 * title block and caption re-threads. Every figure, review, availability state,
 * license number and credential below is SAMPLE content for a demonstration.
 */
import { money } from "./format";

// Pexels CDN (free to use under the Pexels licence). Hotlinked, never copied into the repo.
export const pexels = (id: string, w = 2400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export type Photo = { id: string; w: number; h: number; alt: string; credit: string };

export const PHOTOS = {
  kitchenShaker: { id: "2724749", w: 2400, h: 1600, credit: "Mark McCammon", alt: "A white shaker kitchen with an island under a linear cage pendant and a window over the sink" },
  kitchenDining: { id: "1080721", w: 2400, h: 1600, credit: "Mark McCammon", alt: "A white kitchen with an island, pendants and a dining nook by the windows" },
  kitchenOpen: { id: "2635038", w: 2400, h: 1602, credit: "Terry Magallanes", alt: "An open kitchen with four wooden stools at a long island under glass pendants" },
  bath: { id: "6908361", w: 2400, h: 1600, credit: "Max Vakhtbovych", alt: "A bathroom with a freestanding tub below a tall window onto fir trees and a wood vanity" },
  hearth: { id: "19227215", w: 2400, h: 3600, credit: "Curtis Adams", alt: "A stone fireplace wall with fir shelves and built-in cabinets over an oak floor" },
  mudroom: { id: "19846374", w: 2400, h: 1600, credit: "Lisa Anna", alt: "A bright entry hall with an oak bench, wall hooks and a white oak floor" },
  hands: { id: "8447774", w: 2400, h: 1600, credit: "Los Muertos Crew", alt: "A carpenter in flannel measuring a board with a tape" },
  dusk: { id: "5524166", w: 2400, h: 1600, credit: "Clay Elliot", alt: "A shingled craftsman house at dusk, its porch and dormer windows lit, under tall pines and a red Japanese maple" },
} satisfies Record<string, Photo>;

/** One callout on the hero drawing. Positions are fractions of the photo (0–1; <0 or >1 = in the margin). */
export type Callout = {
  n: string;
  title: string;
  spec: string;
  at: [number, number];
  /** Desktop: label sits in the paper margin above or below the drawing, at fraction `x` of its width. */
  desk: { x: number; side: "top" | "bottom"; align: "start" | "end" };
  /** Phone: label sits inside the crop at `at` (fractions of the photo), nudged to stay on screen. */
  phone: { at: [number, number]; align: "start" | "end" };
};

export type EngineParams = {
  /** Gaussian blur sigma, in analysis pixels (analysis image is 1200px wide). */
  blur: number;
  /** Share of thinned edge pixels treated as strong edges (hysteresis high threshold). */
  density: number;
  /** Low threshold as a fraction of the high threshold. */
  low: number;
  /** Connected edge groups smaller than this many pixels are removed as specks. */
  speck: number;
  /** Traced strokes shorter than this (px) are dropped. */
  minStroke: number;
  /** Douglas–Peucker tolerance in px. */
  simplify: number;
  /** How many Hough construction lines to draw. */
  lines: number;
  /** How far construction lines overshoot their corners, as a fraction of photo width. */
  overshoot: number;
  /** A stroke running within about 1+2×merge px of a longer one is the same edge drawn twice, and is dropped. Default 2; 0 = off. */
  merge?: number;
  /** Segments within this many degrees of horizontal/vertical snap to exact H/V, and chamfered corners are squared. Default 3.5; 0 = off. */
  snap?: number;
  /** Drops clusters of short, wiggly strokes (foliage, stone, bouquets) and small closed loops (recessed cans). Default 1; 0 = off; higher = stricter. */
  texture?: number;
  /** Regions (fractions of the photo: x0, y0, x1, y1) where faint edges are boosted by k, e.g. white doors on a white wall. */
  boost?: { r: [number, number, number, number]; k: number }[];
  /** Regions (fractions of the photo) left out of the drawing entirely. */
  exclude?: [number, number, number, number][];
};

/** Values the engine uses when the optional knobs are left out. */
export const ENGINE_DEFAULTS = { merge: 2, snap: 3.5, texture: 1 } as const;

/** The numeric engine settings the calibrate sliders can drive. */
export type EngineSlider = "blur" | "density" | "low" | "speck" | "minStroke" | "simplify" | "lines" | "overshoot" | "merge" | "snap" | "texture";

export type HeroPreset = {
  photo: Photo;
  /** Where the full-bleed crop centres (fractions of the photo). */
  focus: [number, number];
  /** As-built only: how much further the full-bleed photo is scaled past "cover" (1 = none), to crop a vent or a busy edge. */
  bleedZoom?: number;
  /** Horizontal centre of the phone crop. */
  phoneFocus: number;
  /** Laser-level datum: floor and ceiling lines (fractions of photo height) and ceiling height in inches. */
  floorY: number;
  ceilingY: number;
  ceilingIn: number;
  engine: EngineParams;
  /** `town` defaults to SITE.town, so the hero follows the business. */
  facts: { room: string; town?: string; sheet: string; price: number; weeks: number; invoiced: number };
  callouts: Callout[];
  milestones: { week: number; label: string }[];
};

const MILESTONES = [
  { week: 1, label: "DEMO + DUST WALLS UP" },
  { week: 2, label: "FRAMING" },
  { week: 3, label: "PLUMBING + ELECTRICAL ROUGH-IN" },
  { week: 5, label: "INSPECTION PASSED" },
  { week: 6, label: "INSULATION + DRYWALL" },
  { week: 8, label: "CABINETS SET" },
  { week: 9, label: "COUNTERS TEMPLATED" },
  { week: 10, label: "COUNTERS IN" },
  { week: 11, label: "TILE + TRIM" },
  { week: 12, label: "FIXTURES + PENDANT" },
  { week: 13, label: "PUNCH LIST" },
  { week: 14, label: "FINAL INSPECTION PASSED" },
];

/**
 * Hero presets. A client supplies one daylight photo of a room they finished plus
 * its facts; `?calibrate` (dev only) prints this object after you place anchors.
 * After changing a preset's photo or engine, run `npm run linework` so the drawing
 * ships precomputed (see scripts/precompute-linework.mjs).
 */
export const HERO_PRESETS = {
  shaker: {
    photo: PHOTOS.kitchenShaker,
    focus: [0.5, 0.62],
    bleedZoom: 1.1,
    phoneFocus: 0.5,
    floorY: 0.985,
    ceilingY: 0.02,
    ceilingIn: 108,
    engine: {
      blur: 1.8,
      density: 0.28,
      low: 0.35,
      speck: 26,
      minStroke: 16,
      simplify: 1.5,
      lines: 18,
      overshoot: 0.045,
      merge: 2,
      snap: 3.5,
      texture: 1.3,
      // The white uppers on the white back wall barely register; lift them.
      boost: [{ r: [0.2, 0.34, 0.8, 0.54], k: 3 }],
      // The bouquet, the ceiling grille and the stand mixer by the sink are not architecture.
      exclude: [
        [0.44, 0.505, 0.55, 0.635],
        [0.18, 0.16, 0.28, 0.2],
        [0.715, 0.53, 0.79, 0.605],
      ],
    },
    facts: { room: "Kitchen", sheet: "A-201", price: 148600, weeks: 14, invoiced: 148600 },
    callouts: [
      {
        n: "01",
        title: "ISLAND 9′-6″ × 4′-0″",
        spec: "HONED QUARTZITE",
        at: [0.4, 0.735],
        desk: { x: 0.1, side: "bottom", align: "start" },
        // Phone chips sit above the floor line, so the build starts with nothing under the laser's tag.
        phone: { at: [0.14, 0.8], align: "start" },
      },
      {
        n: "02",
        title: "SINK RUN 11′-2″",
        spec: "WINDOW CENTERED ON SINK",
        at: [0.79, 0.63],
        desk: { x: 0.99, side: "bottom", align: "end" },
        phone: { at: [0.9, 0.72], align: "end" },
      },
      {
        n: "03",
        title: "UPPERS 42″ TO CROWN",
        spec: "PAINTED SHAKER, SOFT-CLOSE",
        at: [0.3, 0.42],
        desk: { x: 0.02, side: "top", align: "start" },
        phone: { at: [0.14, 0.14], align: "start" },
      },
      {
        n: "04",
        title: "CAGE PENDANT 48″",
        spec: "34″ ABOVE ISLAND, ON DIMMER",
        at: [0.48, 0.4],
        desk: { x: 0.99, side: "top", align: "end" },
        phone: { at: [0.86, 0.1], align: "end" },
      },
    ],
    milestones: MILESTONES,
  },
  /** Second kitchen, used to prove the engine works on a photo it wasn't tuned for. */
  dining: {
    photo: PHOTOS.kitchenDining,
    focus: [0.55, 0.55],
    phoneFocus: 0.55,
    floorY: 0.99,
    ceilingY: 0.02,
    ceilingIn: 108,
    engine: { blur: 1.8, density: 0.28, low: 0.35, speck: 26, minStroke: 16, simplify: 1.2, lines: 18, overshoot: 0.045 },
    facts: { room: "Kitchen", sheet: "A-201", price: 126400, weeks: 12, invoiced: 126400 },
    callouts: [
      {
        n: "01",
        title: "ISLAND 8′-0″ × 3′-6″",
        spec: "QUARTZ, EASED EDGE",
        at: [0.62, 0.7],
        desk: { x: 0.3, side: "bottom", align: "start" },
        phone: { at: [0.3, 0.9], align: "start" },
      },
      {
        n: "02",
        title: "DINING NOOK WINDOWS",
        spec: "SILLS RAISED 4″",
        at: [0.12, 0.5],
        desk: { x: 0.0, side: "bottom", align: "start" },
        phone: { at: [0.3, 0.72], align: "start" },
      },
      {
        n: "03",
        title: "UPPERS 42″ TO CROWN",
        spec: "PAINTED SHAKER, SOFT-CLOSE",
        at: [0.87, 0.3],
        desk: { x: 0.99, side: "top", align: "end" },
        phone: { at: [0.94, 0.3], align: "end" },
      },
      {
        n: "04",
        title: "THREE GLASS PENDANTS",
        spec: "30″ ABOVE ISLAND",
        at: [0.62, 0.22],
        desk: { x: 0.02, side: "top", align: "start" },
        phone: { at: [0.3, 0.07], align: "start" },
      },
    ],
    milestones: MILESTONES.filter((m) => m.week <= 12).map((m) => (m.week === 12 ? { ...m, label: "FINAL INSPECTION PASSED" } : m)),
  },
} satisfies Record<string, HeroPreset>;

export type Tier = { name: "Refresh" | "Remodel" | "Reconfigure"; lo: number; hi: number; weeks: string; what: string };
export type CostProject = { key: string; label: string; tiers: [Tier, Tier, Tier] };
export type ProcessStep = { n: string; title: string; span: readonly [number, number]; body: string };

const TOWN = "Kirkland";
const DESIGN_FEE = { lo: 6500, hi: 12500 };

export const SITE = {
  name: "Fernwright Design-Build",
  shortName: "Fernwright",
  /** Two letters for brief numbers (FW-26-0142). Leave out to derive from shortName. */
  initials: "FW",
  town: TOWN,
  state: "WA",
  region: "the Eastside",
  founded: 2011,
  phone: "(425) 555-0142",
  phoneHref: "tel:+14255550142",
  email: "studio@fernwright.example",
  hours: "Mon–Fri, 7:30 to 4:30",
  /** Contractor registration. Demo value. */
  registration: "FERNWDB000XX",
  licenseLabel: "WA contractor reg. no.",
  /** Who registers contractors, and where anyone can look the number up. */
  licensing: {
    state: "Washington",
    body: "Labor & Industries",
    short: "L&I",
  },
  licenseLookup: "https://secure.lni.wa.gov/verify/",
  /** Shown on A-104. Sample values; they read "to be added" in concept mode, like the registration number. */
  credentials: {
    status: "Active · bonded · insured",
    liability: "$2,000,000",
  },
  principals: [
    { name: "Nora Ellison", role: "Design" },
    { name: "Sam Ruiz", role: "Build" },
  ],
  townsServed: ["Kirkland", "Bellevue", "Redmond", "Sammamish", "Issaquah", "Woodinville", "Bothell", "Mercer Island", "Newcastle"],
  /** True only for the Fernwright demo itself: the footer says the business is invented. */
  fictional: true,
  /** When true: slim "unofficial concept" bar, registration, email, principals and founding year read "to be added", figures and claims tagged "sample". */
  showConceptBanner: false,

  hero: HERO_PRESETS.shaker as HeroPreset,

  /** Paid design phase, credited in full to construction. */
  designFee: DESIGN_FEE,
  /** Below this we're probably not the right fit, and we say so. */
  floor: 60000,
  costs: [
    {
      key: "kitchen",
      label: "Kitchen",
      tiers: [
        { name: "Refresh", lo: 60000, hi: 85000, weeks: "6–8", what: "Same layout. New cabinets or fronts, counters, tile, lighting and appliances." },
        { name: "Remodel", lo: 95000, hi: 150000, weeks: "10–14", what: "Same footprint, new plan: the sink moves, the island arrives, circuits and venting are redone." },
        { name: "Reconfigure", lo: 150000, hi: 240000, weeks: "14–20", what: "Walls move. A beam, relocated plumbing, an engineer’s stamp and a full permit set." },
      ],
    },
    {
      key: "bath",
      label: "Primary bath",
      tiers: [
        { name: "Refresh", lo: 60000, hi: 75000, weeks: "5–7", what: "Same layout. Tile, vanity, fixtures, lighting, a fan that actually vents outside." },
        { name: "Remodel", lo: 80000, hi: 110000, weeks: "8–10", what: "Curbless shower, heated floor, plumbing moved within the room." },
        { name: "Reconfigure", lo: 110000, hi: 160000, weeks: "10–14", what: "Borrow a closet or bedroom. Walls, drains and venting all move." },
      ],
    },
    {
      key: "main",
      label: "Main floor",
      tiers: [
        { name: "Refresh", lo: 90000, hi: 140000, weeks: "8–10", what: "Floors, paint, trim, lighting and a kitchen refresh across one level." },
        { name: "Remodel", lo: 150000, hi: 240000, weeks: "12–16", what: "Kitchen remodel plus the rooms around it, stair and fireplace included." },
        { name: "Reconfigure", lo: 240000, hi: 380000, weeks: "16–24", what: "Open the kitchen to the living room: beams, posts, engineering, new flow." },
      ],
    },
    {
      key: "lower",
      label: "Lower level / ADU",
      tiers: [
        { name: "Refresh", lo: 70000, hi: 100000, weeks: "8–10", what: "Finish a lower level: egress, insulation, drywall, floors and a powder room." },
        { name: "Remodel", lo: 110000, hi: 170000, weeks: "12–16", what: "A lower-level suite with a full bath, wet bar and proper sound separation." },
        { name: "Reconfigure", lo: 190000, hi: 300000, weeks: "18–26", what: "A legal ADU: separate entry, kitchen, bath, fire separation, permits." },
      ],
    },
  ] as CostProject[],

  stories: [
    {
      fear: "The quote was $80k. The bill was $130k.",
      clause: "§ 3.1 · Fixed price",
      answer: "Your price is fixed the day you sign. It moves only by a written change order, priced before the work and signed by you. No allowances set low to make the number look friendly.",
    },
    {
      fear: "They vanished for three weeks in the middle of demo.",
      clause: "§ 5.2 · Friday reports",
      answer: "Every Friday by 5: photos, what got done, what’s next and whether we’re on schedule. If a report is late, $250 comes off the final invoice.",
    },
    {
      fear: "The designer drew something the builder said couldn’t be built.",
      clause: "§ 2.4 · One team",
      answer: "The people who draw it price it and build it. Our lead carpenter checks every sheet before you see a number.",
    },
    {
      fear: "A different crew showed up every week.",
      clause: "§ 5.1 · Named lead",
      answer: "One lead carpenter from demo to punch list, named in your contract. Subcontractors are named too, before they arrive.",
    },
    {
      fear: "Six months later, a leak, and nobody picked up.",
      clause: "§ 8.1 · Warranty",
      answer: "Two years on workmanship, in writing, answered by the same people. You also get an as-built binder showing every pipe, wire and shutoff.",
    },
  ],

  projects: [
    {
      photo: PHOTOS.kitchenOpen,
      // Leave the counter clutter and the plank floor out; lift the white uppers off the white wall.
      engine: {
        minStroke: 18,
        simplify: 1.4,
        texture: 1.8,
        boost: [{ r: [0.1, 0.17, 0.37, 0.5], k: 2.5 }],
        exclude: [
          [0.1, 0.46, 0.66, 0.585],
          [0.0, 0.875, 0.84, 1.0],
        ],
      },
      room: "KITCHEN + DINING",
      town: "Bellevue",
      house: "1972 RAMBLER",
      weeks: 14,
      range: "$150–170K",
      note: "A wall came out, the range moved, and four stools fit where a peninsula used to pinch.",
    },
    { photo: PHOTOS.bath, room: "PRIMARY BATH", town: "Sammamish", house: "1979 SPLIT-LEVEL", weeks: 9, range: "$80–95K", note: "The tub moved under the window. The shower lost its curb and gained a bench." },
    {
      photo: PHOTOS.hearth,
      // Fieldstone traces as a field of blobs, so the stone face (and the logs) are left out and only
      // the chimney's outline, the mantel, the firebox and the fir shelves are drawn.
      engine: {
        blur: 2.4,
        density: 0.1,
        low: 0.45,
        speck: 50,
        minStroke: 40,
        simplify: 1.4,
        lines: 8,
        texture: 2,
        exclude: [
          [0.33, 0.03, 0.812, 0.497],
          [0.745, 0.49, 0.812, 0.8],
          [0.33, 0.545, 0.398, 0.8],
          [0.398, 0.545, 0.745, 0.598],
          [0.658, 0.598, 0.745, 0.8],
          [0.418, 0.63, 0.638, 0.79],
        ],
      },
      room: "HEARTH + BUILT-INS",
      town: "Issaquah",
      house: "1994 TWO-STORY",
      weeks: 6,
      range: "$60–70K",
      note: "Stone refaced, a gas insert, and fir shelves scribed to a wall that wasn’t straight.",
    },
    { photo: PHOTOS.mudroom, room: "ENTRY + MUDROOM", town: "Woodinville", house: "2003 CRAFTSMAN", weeks: 5, range: "$60–68K", note: "A closet became a bench, hooks at kid height, and a floor that takes rain boots." },
  ],

  reviews: [
    { quote: "They gave us a price in writing before anyone swung a hammer, and the final invoice matched it to the dollar. I didn’t know that was possible.", name: "Dana", town: TOWN, project: "Kitchen, 2025" },
    { quote: "The Friday reports were the whole thing for me. Photos, what’s next, what’s late. We never once had to chase anybody.", name: "Marcus", town: "Redmond", project: "Main floor, 2024" },
    { quote: "On the first call they told us our bath budget was too small for what we wanted, and exactly why. We saved for a year and hired them.", name: "Priya", town: "Sammamish", project: "Primary bath, 2025" },
  ],

  /** A-105: every project, in this order. Spans are in weeks on a typical kitchen. */
  process: {
    weeks: 22,
    steps: [
      { n: "01", title: "A free 20-minute call", span: [0, 0], body: "Budget comes up in the first five minutes. If we’re not the right fit, we say so and name someone who is." },
      {
        n: "02",
        title: "A paid design phase",
        span: [1, 5],
        body: `${money(DESIGN_FEE.lo)}–${money(DESIGN_FEE.hi)}, credited in full to construction. Measured drawings, selections, engineering if needed, a permit set.`,
      },
      { n: "03", title: "One fixed price", span: [6, 6], body: "One number, signed. It changes only by a change order you have seen priced and signed first." },
      { n: "04", title: "Build, with Friday reports", span: [7, 20], body: "A named lead carpenter on site. Every Friday by 5: photos, what got done, what’s next, what’s late." },
      { n: "05", title: "The as-built binder", span: [21, 21], body: "Drawings updated to what’s actually in your walls, every finish and model number, the warranty and a shutoff map." },
    ] as ProcessStep[],
  },

  briefOptions: {
    /** Project choices follow the A-101 cost tabs, plus one catch-all. */
    other: "Something else",
    /** Budget bands for "Something else"; a known project shows its own A-101 tiers instead. */
    budget: ["$60–100K", "$100–175K", "$175–300K", "$300K+"],
    notSure: "Not sure yet",
    timing: ["Within 3 months", "3–6 months", "6–12 months", "Just planning"],
    heard: ["Referral", "Google", "Houzz", "Angi", "Other"],
  },
};

export type Site = typeof SITE;
export type Project = (typeof SITE.projects)[number];

/** Engine settings for the A-103 cards: a lighter hand than the hero, per-project overrides on top. */
const CARD_ENGINE: EngineParams = { blur: 1.6, density: 0.26, low: 0.38, speck: 18, minStroke: 12, simplify: 1.1, lines: 10, overshoot: 0.04 };
export const cardEngine = (p: Project): EngineParams => ({ ...CARD_ENGINE, ...("engine" in p ? (p.engine as Partial<EngineParams>) : {}) });
export const CARD_ANALYSIS_W = 900;

/** "Kirkland, WA" style helper so the town threads everywhere. */
export const where = (town = SITE.town) => `${town}, ${SITE.state}`;

/** The hero preset's town, defaulting to the business's own. */
export const heroTown = (p: HeroPreset) => p.facts.town ?? SITE.town;

/** Build year, inlined by next.config.ts so server and client agree. */
export const YEAR = Number(process.env.NEXT_PUBLIC_BUILD_YEAR) || 2026;
