# Apple Official Product Bezels

Monkr's Apple Watch frames use Apple's **official product bezel art** from
[Apple Design Resources](https://developer.apple.com/design/resources/)
(“Product Bezels” section) instead of programmatically drawn frames.

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

Selected from the official PNGs (file names are Apple's, verbatim):

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

1. Download + mount the DMG as above (or download manually in a browser if a
   future asset becomes login-gated) and drop the chosen PNGs into
   `static/devices/_incoming/` (gitignored scratch space — any flat folder
   works).
2. Measure: `node tools/measure-bezel.mjs static/devices/_incoming/*.png`.
3. Copy each PNG to `static/devices/<device-slug>/<color-slug>.png`, write a
   `display.svg` rounded-rect mask at the cutout size/radius, and add or
   update the `DeviceMeta` entry with the measured geometry.
4. `npm run build` and smoke-test via `monkr render`.

## Other official bezels available (not yet integrated)

As of 2026-06-11 the resources page also offers direct-download bezels for:
Apple TV, Apple Watch Ultra 2 (2024), iPhone 17, iPhone 16, iPad Pro (M5),
iPad Air (M4), iPad (A16), iPad mini (A17 Pro), MacBook Pro (M5),
MacBook Air (M5), MacBook Neo, iMac (M4), and Studio Displays — candidates
for replacing Monkr's current third-party iPhone/iPad/Mac frame art.

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
