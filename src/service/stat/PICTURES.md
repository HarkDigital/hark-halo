# The stat bands' pictures: the briefs

One picture per service page's "By the numbers" band (band.ts, canvas.ts, picture.ts), one file per
picture in `pictures/`. These are the design contracts, written after a critique of the first bands
(small dashboard widgets: captions, readouts, legends, box-shadow "neon", a rainbow sweep, dead after
the strike) against the heroes above them (full-bleed canvas scenes, real bloom, one lead colour, alive).

## The frame (every picture)

- A second hero: the band is a full-width strip about 68vh tall; the picture is a canvas scene on the
  hero's three layers (sharp / glow / haze, `Pen` from scenes/kit.ts) filling the whole band, on true
  black. The number and its sentence sit over the left ~36% (`env.copyX` is where the copy ends on a
  laptop); the subject composes right of it, but light, atmosphere and the odd hairline may run under
  the copy's scrim or off an edge. At least ~85% of the pixels stay dark.
- One subject per band, drawn with the kit's marks: tubes, arcs, streaks, beads, lit fills with white-hot
  cores and real bloom. No filled rounded rectangles, no fake UI, no icons or pictograms, no arrows.
- Glass before light: the unlit shapes stand in the room from the first still frame (p = e = t = 0).
- The strike has physics: an electrode flares white, the colour front runs along the tube behind a
  white-hot head, the core lags and catches up when the front stops, a `strike()` stutter (its own seed
  per element), a settle. A counted value ("10 years", "28%", "65", "19%", "32%", "43%") counts with p:
  what is lit equals the number every frame, never ahead. A word value ("$1M+", "Page 1", "Hours",
  "Part 107", "Now", "1 in 4") strikes at a named event in the picture (`key`), never a timer.
- Alive after the strike for as long as it is on screen: breath (5–8% on 3–6 s periods, out of phase),
  a rare micro-flicker in one element at a time, motes or light moving on glass, and an answer to the
  cursor within ~160 px (brighten, swell, a cold glint on dark glass, a lean of the bloom). The cursor
  never changes what is lit, never moves a measured thing. Nothing ever replays. Frames are pure in
  (p, e, t, pointer) so the dev seek draws any instant.
- One lead colour per picture (NA unless the brief says), the others only by role; never NA→NB→NC by
  position. The room's light is cast by the picture (a wash on the glow layer scaled by what is lit),
  not by CSS. The number stays pure white.
- Labels: at most three, tiny tracked caps, only where they carry meaning; no captions, readouts,
  legends, keys, axes, ticks. Nothing in the picture restates the number or derives a figure.
- Honest to the letter: nothing the number and sentence do not say. No invented amounts, splits, times,
  altitudes, rates. The viewer's own clock is the only live data allowed (Now).
- Framed (tablet / portrait, `env.framed`): composed centred and wholly inside a wide short box under
  the centred copy. Narrow (phone, `env.narrow`, ~44vh): the same subject with fewer elements, never a
  different picture; ten is still ten, 1 in 4 is still four.
- Budget: Path2D and gradients built in `init`, no per-frame allocation beyond a few small paths, a few
  hundred draw calls a frame at most, 60 fps on a phone.

---

## software-development · "10 years" · `{ kind: 'years', from: 2016, to: 2026 }` — Ten Standing Tubes

Ten fat neon tubes standing in a row on a mirror floor, like a light installation: one per year, all
the same height (a year is a year). Lead NA. `lead: [0, 0]`, `dur: 2800`.

- Wide: floor at y_f = 0.73h (no line drawn: the floor exists as reflections and pools). Tube axes from
  x = 0.44w (tube 1) to 0.93w (tube 10), equal spacing; each from y_f up to 0.19h. Weight w ≈ 5.5
  (`pen.tube`: 19 px sleeve, 5.5 px NA gas, white-hot core). Electrode beads r 2.2 at both ends (white
  0.18 unlit, 0.3 lit). Tube 10 (this year) burns a touch whiter: core at w·0.55, colour mix(NA, WHITE, 0.3).
- Floor: under each lit tube a reflection: `pen.streak` from (x, y_f + 0.42·Hh) up to (x, y_f), NA, 0.4 ×
  the tube's on, w·0.8; a foot pool on the glow layer (ellipse rx w·5, ry w·1.1, NA 0.10 × on); a floor
  haze on the glow layer: a rect from 0.28w to the right edge, y_f ± a little, vertical gradient peaking
  at y_f, NA 0.045 × p (runs under the scrim and off the right edge).
- Motes: 24, white-hot NA beads r 0.8–1.5 bound to a tube, rising slowly through its lit gas; only while
  that tube is lit.
- Strike: tube k rises while 10p runs k−1 → k (rise_k = clamp(10p − (k−1))): base electrode flares (on 1,
  r 3.6 → 0.3, r 2.2 by rise 0.5); the NA front runs up (glow + colour strokes to rise·Hh; the white core
  to clamp((rise − 0.15)/0.85) so it lags and catches at the top); for rise < 0.4 the gas on =
  0.35 + 0.65·strike(rise/0.4·0.42, k); at rise = 1 the top electrode flares and an extra glow stroke
  w·4 at 0.5 decays over 120 ms; the reflection follows 80 ms behind. The number ticks to k the frame
  tube k's front tops. The ease makes a strum: tube 1 in ~100 ms, tube 10 over ~1.3 s.
- Life: breath per tube (T 3.6 + 0.3k s, phase 1.3k), cores steady; one tube hiccups every 5.3 s (70 ms
  dip to 0.55 then 1.15); reflections waver; motes rise. Cursor (b = (1 − d/160)^1.5 to the tube's axis):
  extra glow stroke at w·2.6·(1 + 1.2b) alpha 0.35b, core ×(1 + 0.5b), sleeve hairline 0.16 → 0.30 even
  unlit, reflection ×(1 + 0.8b); motes within 120 px lean away 12 px.
- Labels: "2016" right-aligned at x_1 − 12, y = y_f − 5; "2026" left-aligned at x_10 + 12, same y, hi.
- Framed: axes 0.14w → 0.86w, tops 0.20h, floor 0.72h, w = clamp(3.6, h/95, 5), reflection 0.26·Hh at
  0.3, haze across the box, 14 motes. Narrow: axes 0.09w → 0.91w, tops 0.14h, floor 0.80h, w 3 (sleeve
  10, core 1.2), no reflection or haze (foot pools at half size), 8 motes, labels under the ends at
  y_f + 12 (2016 left-aligned at x_1 − 4, 2026 right-aligned at x_10 + 4).
- Honesty: ten tubes, 2016 and 2026 fixed (n = to − from). Equal height; no baseline, no month ticks,
  nothing accumulating, no projects or amounts. Not the hero (a circuit grid of thin lanes with packets).

## custom-crm · "28%" · `{ kind: 'arc', share: 0.28 }` — The Selling Arc

One large glass ring hanging face-on in black, 28% of it lit NA clockwise from twelve o'clock. Nothing
inside it, no ticks, no hands. `lead: [0, 0]`, `dur: 2600`.

- Wide: centre C = (copyX + 0.52·(w − copyX), 0.50h) (≈ 0.69w); r = min(0.38h, 0.30·(w − copyX)). The
  ring is one Path2D circle: `pen.glass(ring, 0.16, 12)` on the sharp layer only. The lit arc:
  `pen.neon(P.arc(C, r, −90°, −90° + p·share·360°), NA, on, 3.4)`; the last 4° behind the front drawn
  as colour + glow only (the core lags, catching up 0.3 s after the stop); `pen.streak` over the final
  7° to a white-hot head (`pen.fill` r 3.6 while running, r 2.6 at rest). Electrode: a white bead r 2.2 at
  twelve (glass 0.18 before, white-hot during, 0.5 after).
- Glass lit by its neighbour: the dark ring just past the head carries a white highlight (0.40 falling to
  0.14 over 40°) and a 0.22 term behind the electrode; conic gradient or 3–4 short arcs.
- Room light (glow layer): a radial centred 0.35r toward the lit arc's midpoint, radius 0.75w, NA
  0.08 × p × breath → 0: runs under the scrim and off the top/right edges. Motes: 36 white points
  1–1.8 px across the whole band at 0.10–0.22 × p, drifting 6–14 px/s; within 200 px of the lit arc
  they warm to NA at up to 0.7 (cap 10 a frame).
- Strike: e 0 → 0.07 the ring's glass warms 0.10 → 0.16 and the electrode strikes with `strike()`; the
  front runs with p; for its first 0.42 s the arc's on = max(0.35, strike(age, 5)); at p → 1 the head
  flares (streak 18 px outward, 0.25 s), the arc stutters once (floor 0.5), the core catches up, settle.
- Life: on = 0.93 + 0.07 sin(2πt/4.6), glow 1.1× out of phase; a dip to 0.8 every 7–12 s; a cold white
  highlight (hairline 0.55 peak over 22°) laps the dark glass once every 24 s, hidden over the lit
  range; motes drift. Cursor within 160 px of the circumference: over dark glass a second highlight at
  the cursor's angle (0.6 × near, 18°); over the lit arc an extra glow stroke ±10° at 1.6× width and
  the core brightens; motes pushed outward 20 px/s.
- Labels: none. Framed: C = (0.5w, 0.52h), diameter 0.72h, 20 motes, room light r 0.6w. Narrow: C centred,
  diameter min(0.6w, 0.78h), glass 9, neon 2.8, 12 motes, room light 0.05 at r 0.9w.
- Honesty: one whole, 28% of it lit; the dark 72% is "most of the rest". No hours, days, 40, per-day
  split, no numerals (twelve is only where the gas enters). Not the hero (a pipeline board of cards).

## web-design · "65" (PORTFOLIO_WORK.length) · `{ kind: 'lamps' }` — Lights from the Hill

A long exposure of a valley town at night seen from a hill: one lamp per live site, nothing else.
The count is n = the value; a new site adds a lamp and moves none. Lead NA. `lead: [0, 0.15]`, `dur: 2600`.

- Wide: sky above y = 0.40h is true black apart from a light dome on the glow layer (ellipse at
  (0.71w, 0.45h), radii 0.30w × 0.11h, NA 0.09 × lit/n). Horizon: one glass hairline at 0.40h from 0.26w
  (fading in from under the scrim) off the right edge, white 0.08. Ground: a plan-view unit square
  projected to a trapezoid: far edge (v = 0) y 0.43h, x 0.52w → 0.93w; near edge (v = 1) y 0.90h,
  x 0.44w → 0.97w; y(v) = 0.43h + 0.47h·v^1.6. Lamps placed in plan by a fixed-seed LCG with a minimum
  spacing (0.07 in plan, 11 px projected), accepted in sequence so lamp i is the same on every visit.
- Each lamp: `pen.fill` disc r(v) = 1.6 + 2.2v, brightness 0.6 + 0.4v, colour NA cooled toward
  mix(NA, NB, 0.3) at the far string (atmospheric perspective, by depth only); lamps with v > 0.45 add
  a glow-only halo r 3r at 0.3b. Unlit: a 0.8 px white ring at 0.12–0.20, batched.
- Motes: 12 one-pixel white points in the air above the horizon (y 0.18h–0.40h), 4–9 px/s.
- Strike: order by key = 0.72u + 0.28v + 0.12·jitter (a loose sweep far-left to near-right). Lamp i is
  dark while p·n < i; mid-strike (stutter, its ring fading) while p·n ∈ [i, i+1); lit and counted at
  p·n ≥ i+1 (floor(p·n) = lit = the number, one lamp mid-strike). On completing, a flare: brightness
  ×(1 + 0.9e^(−age/0.18)), core ×(1 + 0.5e^(−age/0.12)), age from the eased clock inverted
  (e_i = 1 − (1 − (i+1)/n)^(1/3)). The dome rises with lit/n. The last, nearest lamp lands the crescendo.
- Life: each lamp breathes ±6% on its own 3–6 s period; one lamp micro-flickers every ~1.2 s (dips to
  0.5 for 60–90 ms, never off); the dome breathes ±8% on 7 s; motes drift. Cursor: a lit lamp
  brightens up to +60% and swells +50% within 160 px; an unlit ring gets a cold highlight; parallax by
  depth dx = −(pointer.x − 0.70w)/w·10·(v − 0.35) lerped 4/s (horizon and motes still).
- Labels: none. Framed: horizon 0.30h from 0.06w to 0.94w fading at the ends; field far edge 0.33h
  (0.22w–0.78w), near 0.90h (0.10w–0.90w), v^1.35; r(v) = 1.4 + 1.9v; 8 motes; parallax halved. Narrow:
  no horizon, no motes; far edge 0.14h (0.14w–0.86w), near 0.86h (0.05w–0.95w), v^1.25;
  r(v) = 1.1 + 1.5v; halos only for v > 0.6; the dome at (0.5w, 0.12h) 0.40w × 0.14h; parallax off.
- Honesty: n lit lamps, one per site, the number = lamps lit every frame; no site named, sized or
  ranked; the order is a sweep, not a timeline; no axis or map. Not the hero (a blueprint drawing).
  Risk: a starfield — keep the sky empty, the perspective strong, the horizon faint.

## ecommerce · "$1M+" · `{ kind: 'past', mark: '$1M' }` — Past the Mark

An open column of dark glass standing on the band's bottom hairline, one level mark across it labelled
$1M, and NA light welled up inside past the mark, still rising; the glass has no top. Word value:
`key: e >= 0.62`. `lead: [0, 0]`, `dur: 3200`.

- Wide: walls at x = 0.59w and 0.81w (0.22w wide, clamped 240–360 px), two vertical glass hairlines
  (`pen.glass` 0.12, w 3) from y = h up, fading to 0 between 0.50h and 0.08h (no top). A faint body fill
  white 0.022 with the same fade. At the base a shallow glass ellipse (rx = half width, ry 0.055rx) as
  the foot. The mark: one level glass hairline at y = 0.44h from x = 0.52w (fading in; never under the
  copy) off the right edge, white 0.14, w 3; the segment inside the walls is redrawn lit once crossed
  (white neon 0.45, w 1.6, with a 40 px leak past each wall at 0.18 on the glow layer).
- The light: below the surface y_s, the column rect filled with a vertical gradient (NA 0.42 at the
  surface → 0.14 at 0.16h below → 0.07 at the base; glow 0.60 → 0.20 → 0.10); a white 0.35 → 0 band
  18 px under the meniscus; the meniscus: an ellipse (rx = half width, ry 0.055rx) at y_s whose front arc
  is `pen.neon` NA on 1.0 w 2 and back arc 0.35 w 1.2, interior NA 0.18 (glow 0.30); above the surface
  a faint plume on the glow layer (NA 0.10 → 0.03 at the top). A floor pool on the glow layer (ellipse
  at the base, rx 0.32w, ry 0.035h, NA 0.12 → 0, × lit) runs under the scrim. 28 motes rise through
  the light at 12–28 px/s, dimming above the surface and leaving through the top hairline.
- Strike: e 0–0.06 the foot's front arc lights (stutter) with a white point; e 0.06–0.62 the rise:
  y_s = (h − 6) − ((h − 6) − 0.44h)·(1 − (1 − u)^2.6), a pour arriving on the mark at e = 0.62 (KEY:
  the mark's inner segment flares white-hot with strike(), the leak jumps, the bloom lifts under the
  copy, "$1M+" strikes); e 0.62–0.76 the surge to 0.34h with an 8% overshoot (no stutter on the fill);
  e 0.76–1 settle; then the glacial well: y_s = 0.34h − 0.18h·(1 − exp(−(t − t1)/720)) (about 9 px the
  first minute, never arriving at 0.16h).
- Life: meniscus ripple 1.4 sin(2πx/(0.5·width) + 0.9t) + 0.8 sin(2πx/(0.23·width) − 1.7t); the column
  breathes 0.92–1.00 on 4.8 s; gas flicker ±2%; the mark's inner segment glints every 7–11 s; motes.
  Cursor: a 70 px white glass streak on the nearest wall at the pointer's y (0.4 × near); a white-hot
  bead swelling on the meniscus at the pointer's x (gaussian σ40, up to 0.6); a ring emitted on the
  surface every 0.9 s while the pointer is inside the column above the surface (rx 0 → 70 over 1.3 s,
  at most 4); motes within 100 px drift aside.
- Labels: "$1M" right-aligned 16 px left of the left wall, baseline 6 px above the mark, hi.
- Framed: column centred, 0.24w wide (220–320), mark across the full box width at 0.46h, pool rx 0.34w,
  20 motes. Narrow: column 0.25w–0.75w, mark edge to edge at 0.40h, surface rests at 0.30h (limit 0.14h),
  12 motes, no pool, ripple 1 px.
- Honesty: a mark called $1M; the light passed it; it goes on with no top. No $0, no months, no curve,
  no rate, no amount above the mark, no stopping height. Not the hero (a horizontal pulse trace).
  Risk: a fundraising thermometer: keep it wide, open-topped, no bulb, no ticks, the light gas-like.

## seo-geo · "Page 1" · `{ kind: 'first' }` — Hall of Pages

A dark gallery: one tall sheet of glass stands near, lit NB; behind it identical sheets recede in
one-point perspective to the right until they vanish. Only the first is lit. Lead NB. Word value:
`key: e >= 0.78`. `lead: [0.5, 0.5]`, `dur: 2600`.

- Wide: page one: a portrait rectangle (no radius), left edge copyX + 0.07w (cap 0.46w), width 0.185w,
  top 0.16h, bottom 0.80h (≈ 1 : 1.55). `pen.tube` NB w 2.4 (sleeve 8 px at 0.16 shows before light);
  inside only `pen.wash(rect, NB, 0.035 × on)`. The hall: nine more sheets k = 2..10 projected toward
  VP = (0.93w, 0.46h), corner_k = VP + (corner_1 − VP)·s_k, s_k = 1/(1 + 0.8(k − 1)); glass only
  (`pen.glass`, hairline 0.8 over a 1.5 + 1.5s_k body) at alphas 0.26, 0.19, 0.14, 0.10, 0.075, 0.055,
  0.04, 0.03, 0.02; nothing inside any sheet. Floor: page one's reflection only: two vertical
  `pen.streak`s NB from its bottom corners down to 0.97h at 0.28 × on. Spill: a radial on the glow layer
  centred on page one's left edge midpoint, r 0.28w, NB 0.10 × on (runs under the scrim). 14 motes in a
  box 1.3× page one, visible as it lights.
- Strike: still frame: hall and page one's sleeve at 0.35× rest. e 0–0.32 the hall arrives far to near
  (each sheet eases to rest 0.03 later than the one behind); page one's sleeve to 0.22. e 0.36–0.40 a
  white-hot bead swells at the top-left corner (r 2 → 5, small NB bloom). e 0.40–0.78 the NB front runs
  clockwise round the perimeter by dash reveal (`pen.dash([F, 1e5])`, F = perimeter·u, a mild ease-in
  over the first 8%), a white-hot head r 3.4 rides it, the core lags 70 px (a separate 1 px hot stroke).
  e = 0.78 THE JOIN CLOSES: a white flare at the corner (bead r 9, NB disc r 26, gone by 0.86); the
  outline takes with strike(age, 3) over 0.42 s; the wash, spill, reflection and motes come up with the
  same on; "Page 1" strikes. e 0.80–1 the ghosts retreat a few px toward VP (s_k × (1 − 0.045·easeOut))
  and dim 30%.
- Life: on = 0.93 + 0.07 sin(1.31t); every 7–11 s one of page one's four edges dips to 0.72 for 80 ms;
  every 6.5 s a cold highlight (36 px white segment, 0.22 × (1 − k/12)) slides down the near vertical
  edge of each ghost in turn, near to far; motes drift. Cursor: the VP eases 5/s toward the cursor by up
  to 22 px × 12 px (page one pinned; sheet k moves by (1 − s_k)); a ghost within 160 px lifts +0.12;
  within 160 px of page one's outline the glow stroke ×1.6 and the wash 0.035 → 0.075.
- Labels: none. Framed: page one dead centre, height 0.70h, width 0.60 × height; five ghosts each way
  toward two VPs at (0.06w, 0.47h) and (0.94w, 0.47h); reflection shortened to 0.10h; 10 motes.
  Narrow: page one left edge 0.10w, width 0.34w, top 0.13h, bottom 0.84h; VP (0.97w, 0.46h); three
  ghosts (0.26, 0.19, 0.12); no reflection, no tilt; spill r 0.5w; 6 motes.
- Honesty: a first page, the only one lit; others behind it, dark, receding, uncounted (the hall fades
  below perception; nothing is numbered, nothing drawn inside any sheet). No rankings, rates, brand
  colours. Not the hero (the radar's rings, sweep and blips).

## page-speed · "32%" · `{ kind: 'loads', from: 1, to: 3, rise: 0.32 }` — Past the Line

Two straight glass tubes lying horizontally in the dark, one above the other, both starting from the
same left point; a plumb line hangs from the end of the upper one. The lower runs past that line by
0.32 of the upper's length, in NC. Counted from the crossing: the picture sets `countFrom: 1/1.32`
(canvas.ts: p = easeOut(clamp01((e − countFrom)/(1 − countFrom)))) and `key: e >= countFrom`.
`lead: [0, 1]`, `dur: 3000`.

- Wide: x0 = max(copyX + 72, 0.46w); x1 = 0.95w; L = (x1 − x0)/1.32; the upper tube on y = 0.44h from
  x0 to x0 + L; the lower on y = 0.56h from x0 to x0 + 1.32L. `pen.tube` w 5 (17 px sleeve, 2 px core).
  Four cap beads r 3.2 (glass 0.3 before light; after: `pen.fill` r 2.6 NA at the three green ends,
  r 2.8 NC at the purple end). The plumb line: a 1 px glass hairline (0.12) from the upper tube's right
  cap straight down through the lower tube to the bottom edge, fading to 0 by 0.96h. Colour by role:
  upper NA; lower NA to x0 + L, NC beyond (the extra); where NA meets NC under the line the round caps
  overlap into a white weld. Heads while a front runs: a white bead r 3 with a 40 px `pen.streak` of the
  local colour behind it; the `pen.neon` body ends 22 px behind the head (the core lags) and closes
  150 ms after the front caps.
- Room light (glow): a radial NA at (x0 + L, 0.5h), r 0.5w, 0.045 × litAmount × breath (under the copy
  to ~0.15w, off the top and bottom); a smaller NC radial on the purple stretch, r 0.18w, 0.07 × p.
  12 motes in the right 60% from e > 0.3.
- Strike (e over 3 s = the sentence's three seconds): e = 0 both electrodes flare (white r 6 → rest over
  0.3 s) and both fronts set off; stutter for the first 0.42 s (seeds 1, 2). The upper front runs L in
  one second (e 0–0.333) and caps (flare, core catches up, breathing begins); the lower crawls at a
  third of the speed (reach = L·e/0.7576). e = 0.7576 (2.27 s): the lower front reaches the line: the
  plumb line flares white (`pen.neon` 0.9, w 1.2) decaying to a resting 0.2 between the tubes; the
  number strikes and counts from 0; past the line the gas is NC with length 0.32L·p (the number =
  floor(32p), always equal to the purple). e = 1 the lower cap flares white, the weld settles, the NC
  wash is full.
- Life: green breath 0.90 + 0.06 sin(1.1t) (lower out of phase); the purple is uneasy: 0.88 +
  0.08 sin(1.7t + 1) plus a 120 ms dip to 0.6 about one 5 s window in three; washes breathe; motes.
  Cursor (q to the nearest tube's axis): a 36 px white glass glint on the sleeve's upper edge at the
  cursor's x (0.3q), lit or not; an extra `pen.neon` 110 px sub-path in the local colour at 0.22q w 6;
  over the purple an extra glow stroke w 11 at 0.3q.
- Labels: "1 S" right-aligned at x0 − 16 centred on the upper tube; "3 S" the same on the lower, hi.
- Framed: x0 = 0.15w, x1 = 0.93w, tubes on 0.40h / 0.60h, w 4.5, 8 motes. Narrow: x0 = 0.16w,
  x1 = 0.95w, tubes on 0.40h / 0.60h, w 4, the plumb line to 0.12h below the lower tube, no motes, no
  NC wash, one NA wash r 0.6w at 0.04.
- Honesty: two loads started together; one took one second and one three (the fronts' running times
  are literally 1 s and 3 s); the second is 1.32× the first. No bounce rate, no scale, no third time.
  Not the hero (a speed dial with a needle and radial streaks).

## ai-consulting · "Hours" · `{ kind: 'sand' }` — The Hourglass Runs Back

One hourglass of dark glass standing right of centre, its sand lit NA and running the wrong way: up
from the lower bulb, through the waist, into the upper. Hours coming back. Illustrative: it counts
nothing. Word value: `key` = the first grain crosses the waist upward (e ≥ 0.46). `lead: [0, 0]`,
`dur: 2600`.

- Wide: centre C = (copyX + 0.52·(w − copyX), 0.50h); height G = 0.66h; bulb width 0.56G. The glass:
  two bulbs as one outline (two mirrored teardrop/bell profiles meeting at a waist 0.06G wide), drawn
  with `pen.glass` 0.16 w 3 plus a body fill white 0.02; no frame, no posts, no end plates (a glass
  vessel, not a prop): the top and bottom are flat glass lines 0.42G wide. A cold fixed highlight: a
  hairline down the left of each bulb at 0.08.
- The sand: a resting heap in the LOWER bulb: a filled shape on both layers (NA 0.18 sharp / 0.30 glow,
  its top edge a soft mound 0.14G high across the bulb's lower width) with a white-hot edge line
  (`pen.neon` NA w 1.6) along the mound; a matching thin heap grows in the UPPER bulb's base as grains
  arrive. The stream: 40 grains (narrow 18), white-hot beads r 1.0–1.6 (`pen.fill` NA; the six
  brightest also on the glow layer) rising from the lower mound's top, converging into the waist,
  then fanning slightly as they rise and land on the upper heap; positions pure in t (a per-grain seed,
  speed 70–110 px/s, a 1.5 px sway); the stream is continuous and never stops, the lower heap never
  empties and the upper heap stops growing at 0.10G (it is a loop, not a measure).
- Room light (glow): a radial on the waist, rx 0.42w, ry 0.5h, NA 0.055 × lit × breath, under the
  scrim to ~0.28w. 8 dust motes outside the glass in its light (wide, framed).
- Strike: e 0–0.08 glass warms 0.10 → 0.16; e 0.08–0.30 the lower heap lights from its base up (a
  vertical reveal with a white-hot front, stutter on the mound edge); e 0.30–0.46 the first grains lift
  off the mound and climb toward the waist; e = 0.46 KEY: the first grain passes the waist upward (a
  white flare r 4 at the waist, 0.3 s) and "Hours" strikes; e 0.46–1 the stream establishes, the upper
  heap begins; after e = 1 the stream runs for as long as the band is on screen.
- Life: the heap edges breathe 0.93 + 0.07 sin(2πt/4.8); the waist glows with each grain passing (a
  tiny white pulse); a rare micro-flicker on the lower heap's edge; motes. Cursor within 160 px of the
  glass: a cold glint on the nearer wall at the pointer's y (56 px, 0.4 × near); the stream leans
  2–4 px toward the pointer above the waist (light only, the grains' paths bend by a gaussian); the
  heap edge under the pointer brightens.
- Labels: none. Framed: centred, G = 0.74h, 24 grains, room light inside the box. Narrow: centred,
  G = 0.76h, 18 grains, no motes, no cursor beyond a touch while down.
- Honesty: hours (an hourglass) and returned (it runs backward, forever); no figure, no level that is
  a reading (the heaps are fixed shapes), no day, week, percentage, rate or real time. Not the hero
  (motes sifting through lanes and a filter bar: nothing here flows sideways, nothing is sorted).

## company-knowledge-ai · "19%" · `{ kind: 'gauge', share: 0.19 }` — The Gauge Glass

A boiler's sight glass: one vertical glass tube between two fittings standing on a bench right of
centre, NB gas risen exactly 19% of the way up it with a bright reading edge; 81% dark glass above.
Lead NB. `lead: [0.5, 0.5]`, `dur: 2600`.

- Wide: axis x = 0.70w; top fitting y 0.10h, base fitting 0.90h, measured length H = 0.80h. Walls: two
  hairlines at x ± 10 (`pen.glass` 0.16 w 3, one Path2D) with a white 0.03 body fill 20 px wide; a
  fixed cold highlight hairline at x − 6 at 0.06. Fittings: flat glass bars 26 × 3 px at each end
  (0.22). Electrode beads r 4.5 just inside each fitting (glass 0.2 unlit). The bench: one glass
  hairline (0.08, w 4) across the full width at 0.90h (under the scrim, off both edges). No ticks.
- The gas: `pen.neon` on the axis from the base up to base − L, L = p·0.19·H, NB w 12 (glow 31, core
  4.8, round caps accounted for so the top edge is exactly base − L); the core drawn with a 4-stop
  vertical gradient; the meniscus: a shallow concave white-hot arc across the inner 14 px, sagitta 2.
  The pool: a radial on the glow layer, NB, ellipse 260 × 90 on the base fitting, 0.22 × lagged p.
- Strike: t 0–0.25 a cold white glint (`pen.streak` 48 px, w 1.2, 0.5) runs DOWN the left wall from the
  top fitting to the base while the walls brighten 0.10 → 0.16; at e = 0 the base electrode fires
  (white `pen.fill` with strike(), then an ember of 0.3); e 0–1 the front rises with p, the core
  lagging ~130 ms, the pool a beat behind; the number ticks each hundredth. e = 1: the meniscus flares
  (×1.5 width, +0.5 glow, exp decay 0.12 s), one stutter on the top 12% of the slug (brightness only),
  the top electrode answers with a white glint 0.18 → 0.05.
- Life: gas 0.88 + 0.07 sin(1.25t), core 0.90 + 0.06 sin(1.9t + 2), pool on the gas; a slow ripple up
  the core gradient; a core dip to 0.55 for 80 ms every ~9 s; a 36 px white highlight drifts up and
  down the UNLIT part of the left wall (0.3). Cursor (k within 160 px of the axis): the wall highlight
  slides to the pointer's y (dark part only); over the slug the glow ×(1 + 0.45k), gas +0.12k, pool
  +0.1k, meniscus +0.2k.
- Labels: none. Framed: centred, from 0.08h to 0.88h, bench at 0.88h across the box. Narrow: centred,
  0.10h–0.90h, sleeve 16, gas 9 (core 3.6), fittings 20, no bench, no pool, no highlight drift.
- Honesty: one whole, 19% lit between two fittings both in view. No hours, days, 40, per-day split,
  decimal, graduations. Not the hero (a constellation of glyphs and threads). Distinct from the
  ecommerce column (wide, open, green, past a mark) by being narrow, sealed, blue, a reading.

## aerial-media · "Part 107" · `{ kind: 'sign', text: '107', cite: '14 CFR' }` — The Citation Tube

The licence as a real neon sign: ONE continuous glass tube bent through the digits 1 0 7, two
electrodes, two feed wires, glass jumpers and standoffs, nothing else. Monoline geometric digits from
`P.line` / `P.arc` (not text). "14 CFR" above-left completes the citation. Lead NA. Word value:
`key: e >= 0.78`. `lead: [0, 0]`, `dur: 2800`.

- Wide: cap height H = 0.50h, capped so the sign fits 0.50w–0.88w (H ≤ 0.229w); cap line yT = 0.22h,
  baseline yB = 0.72h; sign width 1.66H centred at 0.69w (xL = 0.69w − 0.83H). Digits: "1" a vertical
  stem at xL (length H). "0" a stadium, left side x0 = xL + 0.22H, right x0 + 0.64H, straight sides from
  yT + 0.32H to yB − 0.32H, semicircular caps r 0.32H; its path starts at the top centre and runs
  clockwise (length 2.731H). "7": bar from x7L = xL + 1.08H to x7L + 0.58H on yT, then one diagonal to
  the foot (x7L + 0.14H, yB) (length 1.672H). Jumpers (glass only, never lit, `pen.glass` 0.10 w 3):
  along the cap line from the stem's top to the 0's top centre, and from there to the 7's bar-left.
  Electrodes: A = the stem continued 0.05h below the baseline to a bead at (xL, 0.77h); B = the 7's
  diagonal continued past the foot to y 0.77h; beads: glass ring r 4 (0.3) before light, after a white-
  hot `pen.fill` r 2.6 inside an NA bloom r 5. Feeds: glass hairlines (0.08, w 2) at y 0.77h from x = 0
  (under the scrim) to A, and from B off the right edge. Standoffs: eight glass rings r 3.5 (0.22) on
  the tube. Sleeve `pen.glass` w 11 at 0.16 on every lit path; neon w 3.2 NA (glow 8.3, core 1.3).
  Sample every lit path every ~6 px in init (point-at-length, nearest-point).
- Strike: e 0.02–0.12 a `pen.streak` (NA, 0.9, w 2.2, 0.12w long) runs along the left feed from under the
  scrim to A; e 0.12–0.20 A flares (strike(), bloom 4 → 12 → 5); e 0.14–0.78 the gas front runs A → B at
  constant speed over Ltot = 6.683H (stub, 1, jumper dark, 0, jumper dark, 7, stub): per lit path
  `pen.dash([lit_k, 1e6])` for glow + colour (0.85), the core dashed separately 0.06·Ltot behind; a white
  bead r 3.5 at the front with a brighter NA window 0.08H long behind it; through the jumpers nothing
  lights. e = 0.78 KEY: the front reaches B; B flares; the exit streak runs off the right edge (e 0.80–
  0.92); the core catches up; the whole tube stutters as one gas column: on = 0.85 + 0.30·strike((e −
  0.78)·2.8, 1); "Part 107" strikes. e 0.93–1 settle (1.15 → 1.0).
- Life: glow and colour ×(0.94 + 0.06 sin(2πt/5.2)), the core steady; every 6.5 s a dim headless window
  0.12·Ltot of +10% (no core, no head) travels A → B at 0.35·Ltot/s; a whole-tube dip to 0.8 for 0.1 s
  when hash(floor(t/8.3)) < 0.35; the electrode beads pulse 0.75–1.0 on 3.7 s and 4.9 s. Cursor: within
  160 px of the nearest sample an extra `pen.neon` window 0.3H long at 0.5(1 − d/160), w 1.3×; the
  nearer electrode to 1.0; the glow layer leans ((px − cx)·0.012, (py − cy)·0.012) clamped ±6 px.
- Labels: "14 CFR" left-aligned at x = xL, y = yT − 26, not hi.
- Framed: centred, H = 0.46h, yB 0.70h, w 3.0, feeds to the box's edges. Narrow: centred, H = 0.44h,
  w 2.4 (core 1.0), sleeve 8, standoffs dropped, label at yT − 18, entry streak 0.2w.
- Honesty: the licence is 14 CFR Part 107 (true); the sign spells the rule's number, the label its
  title. No altitude, flight, path, drone, airspace, certificate number, count. Not the hero (terrain
  contours and a drone's survey path). Risk: diner cliché: geometric monoline, one colour, no border.

## hack-remediation · "Now" · `{ kind: 'now' }` — The Clock Says Now

A clock with no rim and no numerals standing right of centre in the dark, reading the viewer's own
time: twelve dim embers for hours, hour and minute hands in NA tube with white-hot cores, a thin NC
second hand sweeping with a white-hot tip, dust visible only where the dial lights it. "Now" strikes at
the second hand's first movement. `lead: [0, 0]`, `dur: 3000`, `key: e >= 0.72`, `live: true`, no labels.

- Wide: C = ((copyX + w)/2, 0.50h), R = min(0.39h, 0.30·(w − copyX)). Twelve ticks pointing inward from
  radius R: quarters len max(0.085R, 12) `pen.tube` w 2.6, others max(0.05R, 8) w 2.0, resting embers
  0.42 / 0.30 (× breath), never written at. Hands as Path2D along local +x, drawn under
  save/translate/rotate on BOTH layers: hour 0.52R `pen.tube` w 3.2; minute 0.82R w 2.4 (resting 0.95);
  second: tail −0.18R to tip 0.90R, bare `pen.neon` NC w 1.2 (never thinner) with a tip bead r 2.4
  (`pen.fill` NC), a counterweight bead r 1.8, and a five-degree trail of five one-degree arcs at 0.90R
  behind the tip at 0.30/0.22/0.14/0.08/0.03 (computed from the current angle, never accumulated); the
  second hand does not exist before the key moment (a stopped second hand is a lie). Centre bead:
  glass r 4.5 until the hour hand lights, then `pen.fill` NA r 3.0 at 0.9·on_h. Room wash (glow only):
  an ellipse rx 1.9R, ry 1.35R, NA 0.07 × lit × breath, leaning with the cursor. Dust: 40 motes seeded by
  hash (never Math.random: init reruns on the minute), rising 6–14 px/s with an 8 px sway, alpha
  a0·L(d)·lit where L = 1.6 inside the dial fading to 0 by 1.9R.
- Time: one injectable clock `clock()` (dev: `window.__statClock` fixes the epoch for screenshots); read
  once per frame: continuous angles (hour = (hh + mm/60 + ss/3600)/12, minute, second = (ss + f)/60);
  per-second flare g = max(0, 1 − f·6).
- Strike: e 0–0.04 an electrode bead swells at the top of the 12 tick (r 4); e 0.04–0.28 the ticks
  strike clockwise from 12, one every 65 ms, each strike(a_i, i) then cooling to its ember over 0.5 s
  (no travelling head, no persisting ring); e 0.30–0.33 the electrode dies and the 12 tick flares again;
  e 0.38 the hour hand strikes IN PLACE at the real hour: the colour front runs pivot → tip over 250 ms
  (dash-split strokes: sleeve full, glow + colour to L_front, the core two frames behind), then stutters
  and settles by ~0.56; e 0.54 the minute hand the same; e 0.72 KEY: the second hand appears already
  sweeping (strike((e − 0.72)·3, 22)), "Now" strikes with its first lit frame; the trail grows in;
  e 0.72–1 the wash rises to 0.07, the dust to full.
- Life: the clock itself (the sweep, the creep); the tip flares each whole second; breath: ticks
  ×(0.94 + 0.06 sin(2πt/4.6)), hands ×(0.95 + 0.05 sin(2πt/3.4 + 1.2)), second ×(0.95 + 0.05 sin(2πt/3.1
  + 1.3)), wash 0.92 + 0.08 sin(2πt/5.2 + 2.4); a tick (never a hand) flickers to half for one 1/30 s slot
  about every 7 s. Cursor (wide, framed): hands swell +0.2q and ×(1 + 0.25q) width within 160 px; ticks
  within 90 px warm +0.25; over the disc a clipped white glint (0.06) at the pointer; a 40° cold glass
  arc on the invisible rim at the pointer's bearing (0.2 × q_e); the wash leans up to 28 px (lerp 0.08);
  dust within 160 px ×2 and 4 px toward the pointer.
- Framed: C centred, R = min(0.40h, 0.22w), 24 motes, wash inside the box (rx min(1.5R, 0.48w), ry
  min(1.2R, 0.48h)). Narrow: C centred, R = min(0.40h, 0.32w), ticks at the minimum lengths, hands hour
  w 2.6 / minute 2.0 / second 1.0 (tip r 2.0), no trail, dust, glint, edge highlight or swell.
- Honesty: the viewer's current local time, to the second, and that it is passing: checkable against
  their own screen. No numerals, AM/PM, date, zone, no hours before or after, nothing dimming toward
  anything, no cost or deadline shaped. NC on the second hand is colour by role. Not the hero (a
  glitching grid repaired by a scanline).

## security · "94" · `{ kind: 'impacts' }` — Hail on the Glass

A sheet of dark glass standing right of centre, and the day's attacks hitting it: each a white-hot
strike with a short purple splash and a ring on the glass, leaving a purple ember where it landed.
The embers are the number: one per attack, the count is the value (SiteLock 2020: 94 a day), so the
eased count makes a hailstorm that slows to single hits. Nothing gets through: the glass stays dark.
Lead NC (the threat colour, as the hero uses it). `lead: [1, 1]`, `dur: 3000`. No "24/7" anywhere: the
band must never read as round-the-clock support.

- Wide: the pane from x0 = copyX + 0.08w to 0.92w, y 0.19h–0.81h, square corners: a body fill white
  0.015, `pen.glass` 0.08 → 0.14 w 4, a fixed sheen down its left third (0.02). The hits: n seeded
  places on the pane (hash, a minimum gap of 0.45·sqrt(area/n), 14 px inside the edge) in a seeded
  order: attacks come from anywhere, never a sweep.
- Strike: hit i is dark while p·n < i; mid-strike while p·n ∈ [i, i+1) (a white-hot point swelling
  1.6 → 5.6); landed at p·n ≥ i+1 with age from the eased clock inverted (e_i = 1 − (1 − (i+1)/n)^(1/3);
  the last hit ages on t): for 0.4 s a splash: a white flash (r 6 → 1.6), six short NC streaks
  (`pen.streak`, 12–24 px at seeded angles, growing as the flash fades), a glass ring (`pen.glass`
  circle r 4 → 30, 0.3 → 0, clipped to the pane). Then the ember: `pen.fill` NC r 1.8 at 0.55 with a
  glow-only disc r 6 at 0.25·on. The number = floor(p·n) = embers.
- Life: embers breathe ±8% on 2–5 s periods, out of phase; one dims to 0.4 for 80 ms every 4.1 s; a
  cold glint (a soft white band, 0.045) crosses the pane left to right every 9 s; every 6.3 s a stray
  NC spark drifts in from the right edge and dies at the glass (nothing gets through; the count never
  changes). Cursor: a white radial glint on the glass at the pointer (0.06, clipped to the pane);
  embers within 120 px warm ×1.6 and swell ×1.4.
- Room: an NC wash on the pane's centre r 0.45w at 0.05 × lit; a pool under the pane 0.4pw × 0.05h
  at 0.12 × lit.
- Labels: none. Framed: the pane 0.72w × 0.68h centred. Narrow: 0.84w × 0.72h, embers r 1.4, four
  streaks a splash, no stray sparks, no pool.
- Honesty: n impacts, one per attack of the average website's day; no times of day, no kinds of
  attack, no map, nothing about who responds or when. Not the hero (a round shield of arcs and a
  diamond with threats glancing off): a flat dark pane, no rings but the impact rings that vanish.
  Distinct from seo's lit sheet (NB outline, ghosts) and ada's window (a lit green pane): an unlit
  pane covered in purple embers.

## ada-accessibility · "1 in 4" · `{ kind: 'window', of: 4 }` — One Pane Lit

One large window of dark glass standing right of centre: two panes by two in a thin glass frame, and
one of the four lit from within, its light pooling on the floor. Word value: `key` = the pane strikes
(e ≥ 0.52). Lead NA. `lead: [0, 0]`, `dur: 2600`.

- Wide: the window: outer rect centred at (copyX + 0.54·(w − copyX), 0.50h), height 0.62h, width
  0.78 × height; the frame (outer rect + the central mullion and transom) drawn with `pen.glass` 0.22
  w 4 (a 0.8 px hairline in a faint body), corners square; a sill: a slightly wider glass bar 6 px tall
  under the frame (0.26). Each pane's glass: a body fill white 0.02 with a diagonal sheen parallelogram
  (white 0.03, sharp layer) from its top edge (0.12–0.34 of its width) to its bottom (0.66–0.88).
  Nothing else drawn inside the dark panes.
- The lit pane (lower right): a `pen.wash` of the pane rect in NA at 0.22 (glow 0.36) with a vertical
  gradient brighter at its bottom; its four edges as `pen.neon` NA w 2.0 with white-hot cores (the
  light catching the frame); a white-hot bead r 2.4 at the pane's lower inner corner (the electrode).
  The floor: a light shaft on the glow layer: a trapezoid from the lit pane's bottom edge widening
  down to the bottom hairline, NA 0.16 → 0 (and a sharp-layer copy at 0.05); a floor pool ellipse under
  it (rx 0.26w, ry 0.05h, NA 0.12 → 0) running under the scrim's tail. 16 motes in the shaft of light
  only (white 0.08–0.22, drifting slowly, visible × on). Room wash (glow): a radial on the lit pane,
  r 0.45w, NA 0.05 × on.
- Strike: e 0–0.10 the frame and panes' glass warm 0.14 → 0.22; e 0.10–0.30 a hum: the lit pane's wash
  rises to 0.06 and falls twice (a tube warming); e 0.30–0.52 the electrode bead flares white at the
  pane's corner and the NA front runs round the pane's four edges (dash reveal, white head, lagging
  core); e = 0.52 KEY: the pane strikes on as one: wash and edges with strike((e − 0.52)·2.6, 4), the
  shaft and pool jump with it, "1 in 4" strikes; e 0.52–1 settle, the motes fade into the shaft.
- Life: the wash breathes 0.93 + 0.07 sin(2πt/4.4), edges out of phase; a rare micro-dip (one edge,
  80 ms, every ~9 s); the dark panes' sheen passes a cold glint every 8 s (one pane after another, 0.6 s
  each); motes drift in the shaft. Cursor: within 160 px of a dark pane its sheen slides with the hand
  and brightens to 0.07 (a cold highlight, the pane stays dark); within 160 px of the lit pane the glow
  ×1.4 and the wash +0.08; the shaft leans 6 px toward the pointer (glow only).
- Labels: none. Framed: the window centred, height 0.74h, width 0.78 × height, shaft shortened to the
  box's bottom, 10 motes. Narrow: centred, height 0.70h, no shaft (pool only, small), no motes, the lit
  pane still the lower right; a touch while down glints the dark panes.
- Honesty: four identical panes, one lit: one in every four, nothing else. No figures of people, no
  icon, no second colour, nothing counted beyond four. Illustrative: a word value. Not the hero (a
  focus ring / lens). Distinct from seo's lit sheet: a 2 × 2 window with a filled lit pane and a floor,
  not an outlined page with ghosts behind it.

## wordpress · "43%" · `{ kind: 'beads', share: 43, of: 100 }` — The Bead Curtain

A hundred glass beads hung on ten hairline strands from the top of the band, ten beads a strand;
forty-three of them lit from the bottom up, strand by strand from the left, so the lit block is four
whole strands and three beads of the fifth: 43 of 100 at a glance. Lead NA. `lead: [0, 0]`, `dur: 2800`.

- Wide: strands at x_j = 0.47w + j·(0.46w/9), j = 0..9, hanging from the top hairline (the one edge the
  subject touches) to y = 0.86h: glass hairlines `pen.glass` 0.10 w 2 (one Path2D). Beads: ten per strand
  at y_k = 0.20h + k·(0.66h/9), k = 0 (top) .. 9 (bottom): glass spheres r 5.5 (`pen.glass` on a circle,
  0.18, w 1.5, plus a white 0.04 body and a tiny fixed highlight dot at upper-left, 0.14), batched as
  one Path2D for the unlit. Lit bead: `pen.fill` NA r 5.0 (white-hot core, NA bloom) plus a glow-only
  disc r 14 at 0.22 (the bead's big soft bloom) and the strand's hairline above and below it lit NA for
  one bead-pitch (0.25). Lit order: strand 0 bottom to top (k 9 → 0), then strand 1, …: bead index
  i = j·10 + (9 − k). A floor pool (glow): an ellipse under each lit strand's foot (rx 0.05w, ry 0.03h,
  NA 0.10) and a room wash radial on the lit block's centroid r 0.5w NA 0.05 × lit/of. 10 motes drifting
  among the strands in the lit block's light.
- Strike: bead i lights while share·p runs i → i + 1 (one bead mid-strike at any frame: a white-hot
  flash at 1.4r for its first 0.42 s via strike(age, i), then the settled NA bead); the number =
  floor(p·share) ticks the frame a bead settles. The ease makes the first strands run up in a rush and
  the fifth strand's three beads land one by one. At p = 1 the last bead flares (r ×1.6, 0.3 s) and
  settles.
- Life: each lit bead breathes ±6% on its own 3–6 s period; one bead at a time micro-flickers every
  ~1.5 s (dips to 0.5 for 60 ms, never off); the strands sway: every strand's x offset = 1.5·sin(0.6t +
  0.7j) px (beads with it, the lit count untouched); the pools breathe; motes. Cursor: within 160 px a
  lit bead brightens +50% and its bloom swells ×1.5; an unlit bead's highlight dot brightens to 0.5
  (cold glint); the strands within reach sway 4 px away from the hand (eased), never changing a bead's
  state.
- Labels: none. Framed: strands 0.14w → 0.86w from the box's top to 0.86h, beads r 5, 8 motes. Narrow:
  strands 0.08w → 0.92w, beads y 0.12h → 0.88h, r 3.2 (bloom r 9), no motes, pools small.
- Honesty: 43 of 100, lit in order, nothing else; the strands and beads are one lattice with no axis;
  no site is a bead. Not the hero (content blocks flying in to a page). Distinct from the lamp town
  (a landscape of free points) by being a hung, ordered curtain.

---

## Seeing them

`node scripts/stat-shot.mjs` captures every band at rest (`?settled`), `--seek=1.3` a frame that long
after the trigger (`window.__statSeek`), `--mobile` / `--tablet` / `--w= --h=` other sizes, `--page`
the band in its page; it needs the no-HMR server (`npx vite --config vite.shots.config.ts --port 5179`).
The clock picture reads `window.__statClock` (dev only) so its frames repeat.

## Band-wide (stat.css / canvas.ts), from the critique

- The number is pure white: no coloured text-shadow on `.svc-stat-n` (and no hover glow).
- The band's own CSS washes go: the room's light is cast by each picture on the glow layer.
- `countFrom` on a picture (page-speed): p = easeOut(clamp01((e − countFrom)/(1 − countFrom))).
- Collision map (no two bands share a device): standing tubes (software) / ring (crm) / lamps (web) /
  open column (ecommerce) / lit sheet in a hall (seo) / two horizontal tubes (speed) / hourglass (ai) /
  sealed gauge glass (knowledge) / bent-tube sign (aerial) / clock (hack) / hail on dark glass
  (security) / window (ada) / bead curtain (wordpress).
