# Apple Official Product Bezels

Monkr's Apple Watch, iPad Pro (M5), and iMac (M4) frames use Apple's
**official product bezel art** from
[Apple Design Resources](https://developer.apple.com/design/resources/)
(“Product Bezels” section) instead of programmatically drawn frames.

## `npm run sync-bezels` — the bezel sync tool

`tools/sync-bezels.mjs` keeps the library in sync with the resources page.
It discovers every published `Bezel-*.dmg` generically (no hardcoded device
list), so new device classes show up automatically.

```sh
npm run sync-bezels -- --dry-run            # discover + diff + overlap report
npm run sync-bezels                         # refresh managed sources (re-import on upstream change)
npm run sync-bezels -- --import "iPhone-17,iPad-Pro-(M5)"   # adopt + import new sources
npm run sync-bezels -- --force imac-m4      # re-fetch/re-import even if unchanged
npm run sync-bezels -- --only ipad …        # restrict any run to matching sources
npm run sync-bezels -- --cache-dir /tmp/bezels …            # reuse downloaded DMGs
```

Patterns are case-insensitive substrings; comma = OR.

What a run does, per managed source:

1. **Discover** — fetch the resources page, parse every `Bezel-*.dmg` link
   (name from the preceding `<h5>` heading). The DMG *filename* (which Apple
   revs with year/chip suffixes) is the version marker: a rename shows up as
   one `new` + one `removed`; a same-name URL move as `updated`.
2. **Diff** — against `static/devices/manifest.json` (the single source of
   truth: per source → URL, sha256, size, fetch date, device class, status,
   and the generated registry entries per model slug).
3. **Fetch + integrate** — download the DMG (sha256-recorded once at fetch),
   auto-accept the embedded license (`yes | hdiutil attach -nobrowse
   -readonly`), parse the `PNG/` variants into model + color + orientation
   (portrait art preferred), measure **every** color PNG with
   `tools/measure-bezel.mjs`, copy PNGs to `static/devices/<slug>/`,
   generate a `display.svg` mask from the measured cutout + per-corner radii
   (non-rect cutouts fall back to the bounding-box rect with a TODO), and
   emit registry entries into `src/lib/stores/devices.generated.json`.
4. **Summarize** — imported / shadowed / available / curated tables, TODOs
   (e.g. device classes that rocket's `DISPLAY_FOR` table can't map to an
   App Store Connect display type yet), and an overlap report of hand-tuned
   devices that have an official bezel available.

### Registry merge rule

`src/lib/stores/devices.svelte.ts` merges the two device sources at runtime
(`devices.merge.js`): **hand-tuned entries always win over generated entries
on id/slug collision.** Generated model slugs that collide with hand-tuned
slugs (directly, or via the alias table — Apple's “iPhone Air” is Monkr's
`iphone-17-air`) are imported as *shadowed*: measured and recorded in the
manifest, but **no assets are copied and no registry entry is emitted**, so
existing third-party frame art is never replaced silently. To switch a
device to official art: delete its hand-tuned entry + old assets, then
`sync-bezels --force <slug>`.

Source statuses in the manifest:

- `imported` — managed by the tool; refreshed when the upstream DMG changes
- `curated` — hand-imported (the watch frames): the tool tracks the source
  and flags upstream changes as TODOs but never touches the assets
- `available` — discovered but not adopted; adopt with `--import`

Known quirks: model years are taken from the DMG filename when present
(`…-2025.dmg`), else the fetch year — hand-tune if it matters. Apple's own
art can drift a couple of pixels between colors of the same model (iMac M4
Orange sits 2 px right of Blue); the tool tolerates ≤4 px cutout-origin
drift and TODOs anything larger.

Tests (fixture-based, no network): `npm test` → `tools/test/`.

## Source downloads (direct CDN, no login required)

The bezel `.dmg` links on the resources page are plain CDN URLs:

| Asset | URL |
| --- | --- |
| Apple Watch Series 11 (2025) | <https://devimages-cdn.apple.com/design/resources/download/Bezel-Apple-Watch-Series-11-2025.dmg> |
| Apple Watch Ultra 3 (2025) | <https://devimages-cdn.apple.com/design/resources/download/Bezel-Apple-Watch-Ultra-3-2025.dmg> |

```sh
curl -L -O "https://devimages-cdn.apple.com/design/resources/download/Bezel-Apple-Watch-Series-11-2025.dmg"
# The DMGs embed a license agreement prompt; accept it non-interactively:
yes | hdiutil attach -nobrowse -readonly Bezel-Apple-Watch-Series-11-2025.dmg
```

Each DMG contains `PNG/<Band>/<exact variant>.png` (transparent screen
cutout, 1×) plus layered `Photoshop/*.psd` masters and
`Apple Design Resources License.rtf`.

## Frames currently shipped

Synced by the tool (geometry in `static/devices/manifest.json` and
`src/lib/stores/devices.generated.json`):

| Slug | Source DMG | Frame PNG | Screen cutout | Corner radius |
| --- | --- | --- | --- | --- |
| `ipad-pro-m5-11` | Bezel-iPad-Pro-(M5).dmg | 1880×2640 | 1668×2420 @ (106,110) | 61 px |
| `ipad-pro-m5-13` | Bezel-iPad-Pro-(M5).dmg | 2300×3000 | 2064×2752 @ (118,124) | 61 px |
| `imac-m4-24` | Bezel-iMac-M4.dmg | 4760×4050 | 4480×2520 @ (140,150) | 0 px (square) |
| `studio-display` | Bezel-Studio-Displays.dmg | 5400×4160 | 5120×2880 @ (140,140) | 0 px (square) |

The iPad Pro cutouts are exactly the ASC screenshot sizes (1668×2420 /
2064×2752); the iMac cutout is the 4.5K panel at 16:9 (4480×2520); the
Studio Display cutout is the 27" 5K panel (5120×2880), with the stand
included in the frame art below it. All four Studio Display PNGs (2026 +
XDR 2026, each on dark/light background) share identical geometry, so the
tool groups them as color variants of one `studio-display` model. They are
marketing frames only — registry category `other` ("Misc" tab), no rocket
`DISPLAY_FOR` → ASC display-type mapping (the sync run TODOs this; expected).
`Bezel-iPhone-17.dmg` is also managed, but all four of its models (iPhone 17
/ Pro / Pro Max / Air, cutouts 1206×2622, 1320×2868, 1260×2736 — the exact
ASC sizes) are *shadowed* by Monkr's existing hand-tuned third-party iPhone
frames; see the merge rule above.

Hand-curated from the official PNGs (file names are Apple's, verbatim):

**`apple-watch-series-10-46mm`** (art: Apple Watch Series 11 46mm — the
S10/S11 46mm case and 416×496 screen are identical; the slug is kept for
downstream `DISPLAY_FOR` mappings):

| Monkr color slug | Apple file |
| --- | --- |
| `jet-black` | `Apple Watch S11 - 46mm - Aluminum Jet Black + Sport Band Black.png` |
| `rose-gold` | `Apple Watch S11 - 46mm - Aluminum Rose Gold + Sport Band Light Blush.png` |
| `silver` | `Apple Watch S11 - 46mm - Aluminum Silver + Sport Band Purple Fog.png` |
| `space-gray` | `Apple Watch S11 - 46mm - Aluminum Space Gray + Sport Band Black.png` |
| `titanium-gold` | `Apple Watch S11 - 46mm - Titanium Gold + Sport Band Light Blush.png` |
| `titanium-natural` | `Apple Watch S11 - 46mm - Titanium Natural + Sport Band Stone Gray.png` |
| `titanium-slate` | `Apple Watch S11 - 46mm - Titanium Slate + Sport Band Black.png` |

**`apple-watch-ultra-49mm`** (art: Apple Watch Ultra 3 49mm):

| Monkr color slug | Apple file |
| --- | --- |
| `black-titanium` | `AW Ultra 3 - Black + Ocean Band Black.png` |
| `natural-titanium` | `AW Ultra 3 - Natural + Ocean Band Anchor Blue.png` |
| `black-trail-loop` | `AW Ultra 3 - Black + Trail Loop Black Charcoal.png` |
| `natural-alpine-loop` | `AW Ultra 3 - Natural + Alpine Loop Terra Cotta.png` |

## Measured geometry (`tools/measure-bezel.mjs`)

Run `node tools/measure-bezel.mjs <file.png>` to print PNG dimensions and the
transparent screen-cutout bounds (alpha-channel scan: border flood-fill, the
cutout = largest enclosed transparent component; corner radius from a circle
fit of the cutout's top-left curve).

| Device | Frame PNG | Cutout (screen) | Cutout origin | Corner radius |
| --- | --- | --- | --- | --- |
| Series 11 46mm | 560×880 | 416×496 | (72, 192) | ≈112 px |
| Ultra 3 49mm | 600×960 | 422×514 | (89, 223) | ≈124 px |

- The Series 11 cutout is **exactly** the App Store Connect 46mm screenshot
  size (416×496) — screenshots map 1:1.
- The Ultra cutout is the ASC 410×502 screenshot plus a ~6 px flat-glass
  border on each side; screenshots are scaled up ~2.7% to fill it.
- Registry entries (`src/lib/stores/devices.svelte.ts`) carry this geometry:
  `pngW/pngH` = frame size, `svgW/svgH` = cutout size, `screenLeft/screenTop`
  = cutout origin as a percentage of the frame; `display.svg` is a rounded
  rect at the measured corner radius.

## Adding more official bezels

Preferred: `npm run sync-bezels -- --import <pattern>` (see above). The
manual flow still works for one-offs or hand-curated picks (how the watch
frames were made):

1. Download + mount the DMG as above (or download manually in a browser if a
   future asset becomes login-gated) and drop the chosen PNGs into
   `static/devices/_incoming/` (gitignored scratch space — any flat folder
   works).
2. Measure: `node tools/measure-bezel.mjs static/devices/_incoming/*.png`.
3. Copy each PNG to `static/devices/<device-slug>/<color-slug>.png`, write a
   `display.svg` rounded-rect mask at the cutout size/radius, and add or
   update the `DeviceMeta` entry with the measured geometry.
4. Mark the source `"status": "curated"` in `static/devices/manifest.json`
   (sha256 + URL) so sync runs diff clean and flag upstream changes.
5. `npm run build` and smoke-test via `monkr render`.

## Other official bezels available (not yet integrated)

As of 2026-06-11 the resources page also offers (run
`npm run sync-bezels -- --dry-run` for the live list): Apple TV,
Apple Watch Ultra 2 (2024), iPhone 16, iPad Air (M4), iPad (A16),
iPad mini (A17 Pro), MacBook Pro (M5), MacBook Air (M5), and MacBook Neo —
candidates for replacing Monkr's current third-party iPhone/iPad/Mac frame
art (the sync run prints the exact overlap report).

## License

Apple's design resources are licensed for **creating mock-ups of user
interfaces for software that runs on Apple operating systems** — which is
exactly what Monkr produces (App Store screenshots/mock-ups of your own
apps). They may be shown "in screen shots, images or other depictions of
such Mock-Ups." They may not be used to mock up non-Apple-OS software or be
embedded in unrelated products.

- Full text: `Apple Design Resources License.rtf` at the root of every bezel
  DMG ("LICENSE AGREEMENT FOR APPLE DESIGN RESOURCES — For macOS, iOS,
  watchOS, tvOS, and/or visionOS Application Uses").
- Terms hub linked from the resources page: <https://developer.apple.com/support/terms/>
