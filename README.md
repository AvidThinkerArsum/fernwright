# Fernwright Design-Build (demo)

A one-page site for a fictional design-build remodeler in Kirkland, WA. The whole page is
one drawing set: every section is a numbered sheet (A-101 to A-107).

**Fernwright is a fictional business. Every figure, review, license number and credential
on the page is sample content.**

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export in ./out (Cloudflare Pages, GitHub Pages, any static host)
BASE_PATH=/fernwright npm run build   # when the site lives under a sub-path
```

`npm run build` first runs the linework precompute (see below) in a soft mode. It never fails the build:
without network access it prints a warning and the page traces the photo in the browser.

## Edit it

Everything editable is in `lib/site.ts`: name, short name, initials, town, phone, email,
registration number and its label, the licensing body, credentials (status, liability), photos,
the hero preset (photo, facts, callouts, milestones, engine settings), cost ranges, design fee,
stories, projects, reviews, the A-105 process steps, brief options and the two flags below.
Change `name` and `town` and every heading, title block, caption and the hero's project line
follow. Counts in the copy ("four projects", "five steps") follow the arrays, and each A-101
tab scales its own axis to its top figure, so new ranges need no other change.

- `showConceptBanner: true` is for pitching a real business. It adds an "Unofficial concept
  for {name}, not affiliated" bar; the registration number, credentials, email, principals and
  founding year read "to be added"; every figure and claim is tagged "sample"; the hero's AS
  BUILT stamp reads "CONCEPT · SAMPLE RECORD" instead of the business's name; and the footer
  note says the page is an unofficial concept, not affiliated with or endorsed by them.
- `fictional: true` only for the Fernwright demo itself: the footer says the business is
  invented. Set it to `false` for anyone real.

## The hero: one photo in, a drawing out

The hero is generated from a single daylight photo of a finished room. `lib/linework.ts`
runs: Gaussian blur → Sobel → non-maximum suppression → percentile hysteresis (with
`boost` regions that lift faint edges, such as white doors on a white wall) → `exclude`
regions (a bouquet, a ceiling grille) → speck removal → thinning → stroke tracing →
Douglas–Peucker → H/V `snap` with squared chamfers → `texture` filter (small closed loops
like recessed cans, clusters of short wiggly strokes like leaves or stone) → parallel-edge
`merge` (a stroke that runs alongside a longer one is the same edge twice). A Hough
transform finds the long construction lines, and a plywood-toned bitmap makes the
rough-in band above the laser.

Everything (linework, rough-in, photo, laser, callouts) sits in one SVG whose viewBox is the
photo's pixel size, so the layers stay registered at any viewport. The paper sheet sits on
top with the drawing window cut out of it, so when it falls away the full-bleed photo is
already underneath.

### Precomputed drawings

`npm run linework` (Node 22.15+) downloads each hero preset's and A-103 card's analysis
image from Pexels, runs the same engine and writes `public/linework/<photoId>-<hash>.json`.
The page fetches that file first (the hero's is preloaded in `<head>`), so the sheet plots
on first paint; the browser worker only runs for the rough-in bitmap, or when a photo or
its settings have changed and nobody re-ran the script. The hash covers the engine
version, analysis width and settings, so a stale file is simply ignored. Commit the JSON
files; they are vector data, not photos.

### Using a client's room

Add a preset to `HERO_PRESETS` in `lib/site.ts` with the photo, its facts and four
callouts, point `SITE.hero` at it and run `npm run linework`. `facts.town` defaults to
`SITE.town`. `bleedZoom` crops the as-built photo tighter (the shaker preset uses it to
lose a ceiling grille).

### Calibrate (dev only)

Open `http://localhost:3000/?calibrate`. You get sliders for every engine setting (blur,
thresholds, speck, merge, snap, texture, stroke length, simplify, construction lines),
a photo overlay, click-to-place anchors (callouts, phone labels, focus point, floor and
ceiling lines) and the full preset JSON (also printed to the console) to paste back into
`lib/site.ts`. Boost and exclude regions are edited in that JSON. `?preset=dining` swaps
in the second sample kitchen. Both are disabled in production builds unless you build
with `NEXT_PUBLIC_CALIBRATE=1`.

## Photos

Hotlinked from Pexels (free to use under the Pexels license), credited in the footer.
Nothing is copied into the repo.
