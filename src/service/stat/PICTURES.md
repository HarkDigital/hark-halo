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
- The hand, two ways, and plainly: on a laptop the pointer (hover) changes the picture's pose as
  well as its light within ~160 px (a lean, a swell, a tilt, a sway, a follow, a riffle); on a phone
  there is no hover, so `pointer.scroll` (0..1 as the band crosses the viewport, 0.5 centred) and
  `pointer.scrollV` (viewport heights a second, signed, down positive) are the hand: the picture tilts,
  leans, sways, sloshes or sweeps with the scroll, continuously, so scrolling past it moves it. Never
  the measured thing, never the count. And nothing ever sits still after the strike.
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

## software-development · "84%" · `{ kind: 'ledger', share: 84, of: 100 }` — The Ledger

A sheet of glass ruled with a hundred lines in four columns, standing right of centre; 84 of them
filled in by hand: a stroke of neon handwriting on each, written live by a white-hot nib as the number
counts, in reading order, the sixteen blanks lying dark. The strokes are strokes, never words. After
the strike the nib never stops: every second or so it dims a written line and writes it again (the
manual process, every day). Lead NA. `lead: [0, 0]`, `dur: 2800`. Replaces the ten rings (and the
"10 years" copy: the stat is now the customer's problem, like the other bands').

- Wide: the sheet from x = copyX + 0.08w to 0.94w, y 0.14h–0.88h, a faint body (white 0.015), a
  hairline edge, a sheen that slides with the scroll. Four columns of 25 ruled lines (white 0.07,
  batched). Each line's stroke: a seeded polyline from its left end over 55–95% of the column, with
  handwriting's rhythm (a sine of period ~6 steps plus a seeded wobble, amplitude 0.3 × the pitch),
  built in init with its length.
- Which are blank: a seeded set of 16; the 84 written take their order in reading order.
- Strike: the nib (a white-hot bead r 2.6 with a small NA wash) flares at e = 0 on the first line;
  line i is written while 84p runs i → i+1 (`neonTo` dash reveal, the core 10% behind, the nib at the
  front); a written line stutters on (strike(age, seed), floor 0.4) then breathes ±5%. The number =
  floor(84p) = lines written. The ease writes the first lines in a rush and the last slowly.
- Life: the retyping clock (state, advanced by dt × (1 + 3·|scrollV|)): every 1.4 s a seeded written
  line dims to 0.3 over 0.12 s, then the nib rewrites it over 0.6 s; one line flickers every 2.1 s;
  the nib parks at the last line's end between jobs, eased 14/s toward its work.
- Hover (laptop): the nib follows the hand to the nearest written line within 60 px and re-inks it
  (an extra glow window ±40 px, the line ×1.3); blank lines under the hand get a cold glint. Scroll
  (phone): the sheet tilts in parallax (24 px × 10 px), the sheen slides, the retyping runs up to four
  times as fast while scrolling.
- Labels: none. Framed: the sheet 0.76w × 0.76h centred. Narrow: 0.9w × 0.8h, pad 10, no cursor.
- Honesty: 84 of 100 lines filled in by hand; the strokes carry no words or figures; nothing about
  which processes, hours or costs. Source in pages.ts (Wakefield Research for SAP Concur, 2017). Not
  the hero (a circuit grid). Distinct from the ream (a stack edge-on, no writing) and the pane of
  embers (points, purple).

## custom-crm · "28%" · `{ kind: 'ream', share: 0.28 }` — The Ream

A stack of a hundred sheets of glass seen edge-on, standing on a floor right of centre: the bottom
28 lit green (the selling), the 72 above dark glass (the paper: admin and data entry). The lit block
is the number. Hover riffles the stack; scroll fans it open. Lead NA. `lead: [0, 0]`, `dur: 2600`.
Replaces the ring.

- Wide: stack width W = 0.5·(w − copyX) from x0 = copyX + 0.1w; 100 sheets, pitch 3 px (stack
  300 px tall), centred vertically; sheet k (1 bottom .. 100 top) at y_k = yb − (k − 1)·pitch − off_k
  (off_k is the riffle/fan offset, below). Each sheet: its front edge, a hairline x0 → x0 + W at y_k
  (white 0.14 on 0.8 px; batched in one Path2D for the dark ones), plus a short depth edge at its
  right end: (x0 + W, y_k) → (x0 + W + 14, y_k − 5) (the stack's end face, a parallelogram); the
  stack's top sheet also draws its top face as a faint parallelogram (white 0.03). A floor hairline
  under the stack from under the scrim to the right edge (0.08).
- Lit sheet: `pen.neon(line, NA, on, 1.2)` (its depth edge too), so the lit block is a slab of
  ruled light with a white-hot core on every line; the block's glow pools below the stack (a wash
  NA 0.12 at the floor) and casts upward through the dark sheets (a faint NA 0.03 wash on the three
  sheets above the lit top).
- Strike: sheet k lights while 100p runs k−1 → k, bottom up (a white-hot front runs its length from
  the left end in that unit, `neonTo` with the core 20 px behind); for its first 0.42 s after landing
  the sheet stutters (strike(age, k), floor 0.35); the number = floor(100p·share... NB: the count is
  floor(p·28): sheet k lights while 28p runs k−1 → k, k = 1..28; at p = 1 the top lit sheet flares.
- Life: the lit block breathes ±6% (each sheet slightly out of phase); one lit sheet dips to 0.5 for
  60 ms every 2.5 s; a cold glint runs down the stack's end face every 8 s; dust in the lit block's
  light.
- Hover: riffle: for sheets within 120 px of the cursor's y, off_k = 24·g(k) where g is a gaussian
  (σ 40 px) of (y_k − pointer.y), sheets above the cursor lifting and those below pressing down
  (sign by side), eased 8/s; the riffled sheets' edges brighten (dark: 0.14 → 0.3; lit: on ×1.3).
  Scroll (phone): the stack fans open with scroll: pitch 3 → 7 px as scroll runs 0.25 → 0.75 (the
  stack grows taller, centred), and the whole stack leans 6 px·(scroll − 0.5).
- Labels: none. Framed: W = 0.7w centred, pitch 3. Narrow: W = 0.84w, pitch 2.6, no depth edges on
  the dark sheets (one batched path), fan 2.6 → 5.
- Honesty: 28 of 100 sheets lit; nothing about hours, days, splits; the paper reads as the rest of
  the week only through the sentence. Not the hero (a pipeline board). Distinct from the ten rings,
  the bead curtain's successor and every other band: the only stack.

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

## ecommerce · "$1M+" · `{ kind: 'bars', mark: '$1M' }` — Past the Mark, Year After Year

A row of open columns of dark glass standing on the band's bottom hairline, every one of them with
green light risen past the one level mark labelled $1M, the row running off the right edge of the
band (year after year, and on). Word value: `key: e >= 0.48` (the first column crosses). `lead: [0, 0]`,
`dur: 3400`. Replaces the single column.

- Wide: columns of width cw = 0.07w, gap 0.035w, the first at x = copyX + 0.1w, as many as fit to
  the right edge plus one cut by it (so they cannot be counted: about 6 on a laptop). Each column as
  the old picture's: two wall hairlines dissolving upward (no top), a faint body, a foot ellipse;
  the mark: one level glass hairline at y = 0.46h from x = copyX + 0.04w (fading in) off the right
  edge, its segment inside each column lit white once that column crosses. The light in a column:
  the old picture's gradient body (NA 0.3 at the surface → 0.07 → 0.025), a white band under the
  surface, a rippling white-hot meniscus (`pen.neon` NA w 2 + white 0.9 px), a plume above, motes
  rising out of the top.
- Strike: column j (0 = left) starts its pour at e_j = 0.04 + 0.1j: the surface rises from the base to
  the mark over 0.44 e (1 − (1 − u)^2.6), crosses it (the mark's inner segment flares white-hot with
  strike(), the bloom lifts), surges 0.07h past, settles; the first crossing at e ≈ 0.48 is the KEY
  moment ("$1M+" strikes); the rest follow in cascade (the last, cut by the edge, crosses at e ≈ 1).
  After e = 1 every column creeps upward glacially at its own rate (0.4–0.9 px/min), their heights
  drifting apart by a few px and back (pure in t: y_j = rest_j − 0.18h·(1 − exp(−(t − t1)/(600 + 200·
  hash(j)))) + 3·sin(2πt/(40 + 9j))): no height is ever a figure.
- Life: meniscus ripples (two waves, out of phase per column); the columns breathe out of phase; the
  marks' inner segments glint now and then; motes; a cold glint drifts along the mark line every 9 s.
- Hover: the column under or within 100 px of the cursor swells: its light brightens ×1.3, its
  surface lifts 6 px (light only, eased), its mark segment glints white, its walls glint at the
  pointer's y; the others rest. Scroll (phone): the light sloshes with the scroll: every surface tilts
  by scrollV·4° (damped spring, 2.5 Hz, ζ 0.3) and the row parallaxes 10 px·(scroll − 0.5); a glint
  runs along the mark with scroll.
- Labels: "$1M" right-aligned at the mark's left end (x = copyX + 0.1w − 16), 6 px above the line,
  hi. Framed: columns cw 0.09w gap 0.045w from 0.06w, running off the right edge; mark at 0.48h
  across the box. Narrow: cw 0.14w gap 0.06w from 0.06w, off the right edge; mark edge to edge at
  0.42h; no plume, fewer motes.
- Honesty: a mark called $1M; every column's light is past it; the row goes on past the edge and no
  column can be counted or read as a year with a figure: no $0, no months, no years, no amounts,
  no stopping height. Not the hero (a horizontal pulse trace).

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

## ai-consulting · "Hours" · `{ kind: 'spool' }` — The Spool

A glass reel right of centre, turning, winding in a line of green light that runs in from under the
copy: time reeled back. Illustrative: it counts nothing, nothing is marked, the wound coil grows
without ever being a figure. Word value: `key: e >= 0.6` (the line's head reaches the reel and the
first turn wraps). `lead: [0, 0]`, `dur: 3000`. Replaces the hourglass.

- Wide: the reel: centre C = (copyX + 0.58·(w − copyX), 0.5h), flange radius R = 0.3h, hub radius
  0.07h; drawn as the near flange (a glass circle `pen.glass` 0.14 w 3), the far flange offset 10 px
  up-right at 0.08 (depth), four glass spokes from hub to flange that ROTATE with the reel (angle
  θ = ∫ω), the hub a glass circle with a white-hot bead once lit; a stand: two glass legs from the
  hub's height down to a floor hairline (0.08) that runs under the scrim and off the right edge.
- The line: NA `pen.neon` w 2.4 from x = 0 (under the scrim) running level at y = C.y + R·0.92 to the
  reel's underside tangent point, then onto the reel: the wound coil is drawn as a spiral from the
  hub outward to radius r_w (`pen.neon` w 1.6 on the spiral path rebuilt in init for its max turns and
  dash-revealed to the wound length) plus a glow-layer annulus hub..r_w at 0.25 (the mass of wound
  light); r_w grows with the wound length: r_w = hub + 0.9·(R − hub)·(1 − exp(−wound/(4·R))), wound =
  ∫ω·R dt (pure in t once ω is a function of t, see hover). Along the incoming line a dim headless
  window of extra brightness travels toward the reel at the rim's speed (the line moving), every
  1.5 s; a white-hot bead marks where the line meets the reel.
- Strike: e 0–0.1 glass warms; e 0.1–0.6 the line's head (a white-hot bead with a `pen.streak`
  tail) runs in from the left edge to the reel's underside (easeOut), the line lighting behind it;
  e = 0.6 KEY: the head meets the reel, the hub flares white, the reel starts turning (ω eases to its
  cruise 0.5 rad/s over 0.6 s), the first turn wraps (the spiral's first 360° draws in), "Hours"
  strikes; e 0.6–1 the spokes come up lit (faint NA 0.3), the stand's feet glint.
- Life: the reel turns forever (the spokes, the coil's slow growth, the line's travelling windows);
  breath on the line and coil; the hub bead pulses with each turn; dust in the light; every 11 s a
  cold glint crosses the near flange.
- Hover: within 200 px of the reel, ω rises toward 1.6 rad/s (eased 3/s; the windows along the line
  speed up with it) and the coil's glow swells ×1.4; near the line (within 60 px of its y) the line
  runs hotter at the pointer's x (an extra `pen.neon` 120 px window, 0.5·near) and the pointer's
  nearest point on the line gets a white-hot bead. Scroll (phone): ω = 0.5 + 2.2·clamp01(|scrollV|)
  rad/s (scrolling spins the reel faster; never backward), and the reel's depth offset (the far
  flange) leans 8 px·(scroll − 0.5).
- Labels: none. Framed: C centred (0.5w, 0.5h), R = 0.3h, the line from the box's left edge. Narrow:
  C = (0.56w, 0.5h), R = 0.28h, the line from x = 0, w 2.
- Honesty: hours (time as a line) returned (reeled in, toward you); no marks, ticks, figures or
  real time; the coil's size is a motion, not a reading. Not the hero (motes sifting through lanes).

## company-knowledge-ai · "19%" · `{ kind: 'orb', share: 0.19 }` — The Orb

A large glass sphere on a plinth right of centre, blue light pooled in its bottom with a level, the
lit part exactly `share` of the disc's area. The level is horizontal and never changes; the sphere
rolls under the hand and the light sloshes. Lead NB. `lead: [0.5, 0.5]`, `dur: 2600`. Replaces the
gauge glass.

- Wide: C = (copyX + 0.52·(w − copyX), 0.5h), R = 0.36h. The sphere: `pen.glass(circle, 0.14, 4)`
  plus a faint body (white 0.015) and, INSIDE the glass, three faint meridian hairlines (ellipses of
  rx = R·|cos φ_i|, ry = R, white 0.05) that rotate with the roll (φ_i += roll); two fixed
  highlights: a crescent at upper-left (a 50° glass arc at 0.86R, white 0.3 w 4, soft ends) and a
  dot (white 0.5 r 3); the plinth: a glass ellipse (rx 0.5R, ry 0.08R) under the sphere, and a
  floor pool (NB wash) that breathes with the light. The level: the chord at height y_L such that the
  circular segment below it has area p·share·πR² (solve the segment equation by bisection each
  frame; cheap). The lit segment: a fill clipped to the circle below the chord: NB 0.3 at the surface
  → 0.08 at the bottom (glow 0.5 → 0.12); a white band 14 px under the surface; the surface: a
  white-hot chord (`pen.neon` NB w 2 + white 0.9) rippling (1.5 px, two waves) and sloshing: the chord
  tilts by angle s (a damped spring driven by the roll's velocity and the scroll's, max 7°, 2 Hz,
  ζ 0.35), rotating about the chord's midpoint so the AREA stays the share (the tilt is light only).
- Strike: e 0–0.08 glass warms; the plinth's front arc lights (a white point); e 0.08–1 the level
  rises with p (the number = floor(19p) = the lit area's share, every frame); the core lags 100 ms; at
  p = 1 the surface flares (×1.5, decay 0.12 s) and one stutter on the top 10% of the lit segment.
- Life: ripples; breath; a glint sweeps round the dark glass every 10 s (the crescent brightens as it
  passes); 10 motes rise inside the lit segment and die at the surface; the pool breathes.
- Hover: the sphere rolls toward the cursor: target roll = (pointer.x − C.x)/R·0.6 rad about a
  vertical axis (the meridians and the highlights' positions move; the crescent's angle shifts by
  roll·0.3), eased 4/s, back to 0 when the pointer leaves; the roll's velocity drives the slosh; over
  the dark glass a cold glint at the pointer (radial white 0.06 clipped to the circle). Scroll
  (phone): roll = (scroll − 0.5)·2.4 rad (scrolling rolls the orb) and scrollV drives the slosh.
- Labels: none. Framed: C centred, R = 0.36h. Narrow: C centred, R = min(0.36h, 0.4w), w 3.
- Honesty: one whole, 19% of its area lit; no hours, days, splits, ticks; the slosh and roll are light
  and glass, the level's area never changes. Not the hero (a constellation).

## aerial-media · "Part 107" · `{ kind: 'drone' }` — The Aircraft

A quadcopter in glass and neon, licensed, hovering right of centre: a glass body and arms, four
rotors spinning to lit rings, port and starboard lights, a camera under it, its shadow on the
floor. It stands on the floor, its lights come on, the rotors spin up, and it lifts off: "Part 107"
strikes at lift-off. Then it hovers, and follows the hand. Word value: `key: e >= 0.6`. Lead NA with
NC by role (the port light). `lead: [0, 0]`, `dur: 3200`. Replaces the 107 sign.

- Wide: the floor: a glass hairline at y_f = 0.8h from under the scrim off the right edge (0.1); the
  aircraft's rest point X0 = (copyX + 0.55·(w − copyX), y_f − 0.03h) and hover point H0 = (X0.x,
  y_f − 0.3h). Scale S = 0.26h (the span from rotor centre to rotor centre). Seen from a low 3/4 view:
  the body a hexagon (glass, 0.09S tall, 0.22S wide) with a top plate line; four arms (glass w 3) to
  the rotor pods at (±0.5S, −0.16S) [rear, drawn smaller: 0.86 scale] and (±0.5S, +0.12S) [front];
  each rotor: a glass ellipse (rx 0.26S·pod, ry 0.09S·pod) with TWO blades (NA `pen.neon` w 1.6)
  rotating at angle ω·t (+90° apart per rotor, the right pair contra-rotating); at speed (ω > 20
  rad/s) the blades draw as the ellipse's lit ring (`pen.neon` NA w 1.4 at 0.6) plus a soft NA disc
  wash (0.08) and the blades as two faint smears; a hub bead on each. Nav lights: a `pen.fill` NC
  bead r 2.4 on each left pod, NA on each right pod (aviation: red port, green starboard; colour by
  role); a white strobe on the tail (a 60 ms flash every 1.2 s). The camera: a glass sphere r 0.05S
  under the body on a short glass stalk, a lens bead (white-hot once on) that looks toward the hand.
  Two landing legs (glass) from the body to y 0.2S below it. The shadow: an NA wash ellipse on the
  floor under the aircraft, rx 0.5S·k, ry 0.08S·k, alpha 0.14·k, k = 1 − 0.6·height/0.3h (smaller and
  fainter the higher it flies).
- Strike: e 0–0.12 the aircraft stands on the floor, all glass; e 0.12–0.2 the nav lights blink on
  (two blinks, then steady) and the camera lens lights; e 0.2–0.6 the rotors spin up: ω rises 0 → 60
  rad/s (ease-in), the blades blurring into rings, the floor shadow brightening with downwash (a
  faint NA ripple ring expanding on the floor every 0.4 s); e = 0.6 KEY: lift-off: the legs leave the
  floor, the aircraft rises X0 → H0 over e 0.6–1 (easeOut) with a slight forward tilt (5°) that
  levels off; "Part 107" strikes.
- Life: hover bob (±4 px, 2.3 s) and drift (±10 px, 7 s, in x) around H0; rotors spinning (the ring's
  brightness shimmering); nav lights' slow pulse and the strobe; the camera lens glints; the shadow
  follows underneath; 12 motes of dust in the downwash drifting outward under it.
- Hover (desktop): the aircraft flies toward the cursor: target = pointer, clamped to the right region
  (x ≥ copyX + 0.1w, y from 0.15h to y_f − 0.1h), eased 2.2/s with the drift added; it banks into the
  motion: roll = clamp(vx·0.0012, ±12°) tilting the whole drawing and the rotor ellipses (the near
  side's rotors drawn larger), pitch by vy; the camera lens tracks the cursor; the shadow follows on
  the floor. When the cursor leaves, it returns to H0. Scroll (phone): altitude follows the scroll:
  height above the floor = 0.1h + 0.3h·clamp01((scroll − 0.25)/0.5) (climbing as the band rises
  through the viewport), banking by scrollV (roll = clamp(scrollV·8°, ±12°)), the shadow shrinking as
  it climbs.
- Labels: none. Framed: the aircraft centred, S = 0.28h, floor at 0.82h. Narrow: centred, S = 0.3w,
  floor 0.84h, hover 0.26h above it, no motes.
- Honesty: an aircraft, licensed (the sentence says so); no altitude figures, no map, no path, no
  flight log; the lights' colours are aviation's. Related to the hero (a drone's survey path over
  terrain) by subject at the owner's request, but a different picture: one aircraft seen close, on
  the ground and lifting off, no terrain, no contours, no path.

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

## security · "94" · `{ kind: 'impacts' }` — Hail on the Glass, alive

As built (a sheet of dark glass taking the day's 94 attacks, each a white-hot strike leaving a purple
ember; the embers are the count), with life after the strike so it never sits still: probes keep
coming and nothing gets through; the hand is a shield; the pane tilts with the scroll.

- Probes: from e ≥ 1, every 0.5–1.1 s (seeded schedule on t) a spark (NC `pen.streak` 40 px with a
  white head r 2) flies in from the right edge or the top edge at 600–900 px/s toward a seeded
  point on the pane and bursts there: a white flash (r 5 → 0, 0.25 s), four short NC streaks, a glass
  ring (r 4 → 26, 0.3 s) — and NO ember: the count stays 94. Up to three in flight. The embers near a
  burst warm briefly (+0.2 within 60 px).
- Hover (desktop): the cursor is a shield: a probe within 140 px of the pointer veers away (its path
  bends off the pointer's radius) and fizzes out in a purple puff before the glass; the embers within
  120 px warm ×1.6 and swell; the glass glints at the pointer (the white radial, 0.06). Scroll
  (phone): parallax: each ember shifts by its own depth (hash) × (scroll − 0.5)·30 px horizontally
  and ·14 px vertically, the pane's outline by a third of that (the pane in slight 3D); incoming
  probes come from above when scrolling down (scrollV > 0) and from below when scrolling up; a cold
  glint sweeps the pane with the scroll (position = scroll).
- Everything else as built (the strike, the embers' breath, the glint every 9 s, the pool, the room).
- Honesty: the probes burst and leave nothing: attacks keep coming, nothing gets through, the day's
  count is the day's count; no response times, no kinds, no map.

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

## wordpress · "43%" · `{ kind: 'reeds', share: 43, of: 100 }` — The Reed Bed

A hundred thin stalks of glass standing in a dark field right of centre, 43 of them lit green from the
floor to a white-hot tip, the whole bed swaying in a slow wind; the hand parts the reeds, the scroll
sends a gust through them. Lead NA. `lead: [0, 0]`, `dur: 2800`. Replaces the bead curtain.

- Wide: the field: a floor hairline at y_f = 0.84h from under the scrim off the right edge (0.08);
  100 stalks at seeded x in [copyX + 0.08w, 0.96w] with a minimum spacing of 0.5·(width/100), each
  with a seeded depth d ∈ [0, 1] (far = small): height h_i = (0.3 + 0.38·(1 − d))·h·(0.85 + 0.3·hash),
  weight w_i = 1.4 + 1.6·(1 − d), drawn far to near. A stalk: a quadratic curve from (x_i, y_f) up
  to its tip, bending by its sway: tip = (x_i + sway_i, y_f − h_i), control at (x_i + 0.3·sway_i,
  y_f − 0.55h_i); glass `pen.glass(0.1 + 0.06·(1 − d), 2 + w_i·0.6)`; lit: `pen.neon(NA, on, w_i·0.9)`
  with a white-hot tip bead `pen.fill` r 1.2 + 1.2·(1 − d).
- Which are lit: a seeded subset of 43 (hash < 0.43 with a fixed seed, topped up or trimmed to
  exactly 43), lit in a seeded order as the count runs: stalk i lights while 43p runs k−1 → k (its
  index k in the order): the gas runs from the floor to the tip in that unit (`neonTo` along the curve,
  the core 15% behind, a white head), then stutters (strike(age, i), floor 0.35) and settles; the
  number = floor(43p) = stalks fully lit. The floor pool: an NA wash under each lit stalk's foot
  (rx 18, ry 5, 0.1) and a room wash on the bed (0.05 × lit/43).
- Wind (life): sway_i = A_i·sin(ωt − k·x_i + φ_i) + 0.3·A_i·sin(2.3ωt + φ_i) with ω = 0.9, k = 2π/
  (0.5w), A_i = 10 + 12·(1 − d) px: a slow wave travelling across the bed; the lit stalks breathe
  ±6%; one lit stalk flickers (dip 0.5, 60 ms) every 1.8 s; the tips' beads twinkle; 12 motes drift
  low over the floor.
- Hover (desktop): the reeds part: stalks within 200 px of the pointer bend away from it: extra sway
  = sign(x_i − pointer.x)·38·g(d_px/200)·(1 − d·0.5) (g a smooth falloff), eased 6/s so the bed closes
  behind the hand; lit stalks within reach brighten ×1.3; the pointer low in the bed (below the
  tips) also brightens the glass of the dark stalks it touches (a cold glint at the pointer's y).
  Scroll (phone): a gust: the wave's amplitude A_i × (1 + 4·clamp01(|scrollV|)) and the whole bed
  leans 16 px·clamp(scrollV, ±1) in the scroll's direction (down: the gust blows right), easing back
  over a second; the wave's speed doubles while scrolling.
- Labels: none. Framed: the field across 0.08w–0.92w, floor 0.86h. Narrow: 0.05w–0.95w, floor
  0.86h, heights 0.25–0.6h, weights ×0.8, no motes.
- Honesty: 43 of 100 stalks lit; the field is a field, the wind is wind; no site is a stalk. Not the
  hero (content blocks assembling). Distinct: the only picture with wind.

---

## Seeing them

`node scripts/stat-shot.mjs` captures every band at rest (`?settled`), `--seek=1.3` a frame that long
after the trigger (`window.__statSeek`), `--mobile` / `--tablet` / `--w= --h=` other sizes, `--page`
the band in its page, `--scroll=0.65` with the band's scroll input (the phone's hand) held at that
progress; it needs the no-HMR server (`npx vite --config vite.shots.config.ts --port 5179`).
The clock picture reads `window.__statClock` (dev only) so its frames repeat.

## Band-wide (stat.css / canvas.ts), from the critique

- The number is pure white: no coloured text-shadow on `.svc-stat-n` (and no hover glow).
- The band's own CSS washes go: the room's light is cast by each picture on the glow layer.
- `countFrom` on a picture (page-speed): p = easeOut(clamp01((e − countFrom)/(1 − countFrom))).
- Collision map (no two bands share a device): a ledger written by hand (software) / a stack of sheets (crm) / lamps
  (web) / a row of columns past a mark (ecommerce) / a lit sheet in a hall (seo) / two horizontal tubes
  (speed) / a reel winding (ai) / a glass orb (knowledge) / an aircraft (aerial) / a clock (hack) / hail
  on dark glass (security) / a window (ada) / a reed bed (wordpress).
