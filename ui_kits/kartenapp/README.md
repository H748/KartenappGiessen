# UI Kit — Ankunft: Gießen Kartenapp

A high-fidelity, click-through recreation of the four core screens of the
multimediale Kartenapp. It is a **design recreation**, not production app code —
interactions are mostly cosmetic, but the visuals, layout and component structure
are intended to be pixel-faithful to the delivered designs.

Open **`index.html`** to run it. Start on the Welcome screen → *Rundgang starten*
to reach the map.

## Screens & flow

| Screen | File | Highlights |
|---|---|---|
| **Welcome** | `WelcomeScreen.jsx` | Hero (eyebrow chip, slab title, lead, two CTAs), portrait, two feature cards (Karte / Touren), institutional footer. |
| **Interactive Map** | `MapScreen.jsx` | Floating top bar (menu · location pill · GPS) and media switcher; sage Gießen map; **teardrop POI pins** that appear/disappear with the **time slider**; selected pin shows a label + a floating **POI preview card**; the year bubble tracks the slider knob. |
| **POI Detail** | `DetailScreen.jsx` | Era rail, *HISTORISCHER ORT* eyebrow, slab title + red rule, archival hero + thumbs, **Zeitzeugen audio player**, pull-quote, "Wissenschaftliche Einordnung", navy **Daten & Fakten** panel, **Quellen** source rows, "Auf Karte zeigen" CTA. |
| **Curated Tours** | `ToursScreen.jsx` | *KURATORISCHE AUSWAHL* + red-italic hero, featured tour card (Featured badge, stats), navy promo card with avatar stack, standard tour card, Archiv-Spezial card. |

Shared chrome lives in **`Shared.jsx`** (`Icon`, `Button`, `Eyebrow`, `StatusBar`,
`BottomNav`, `TopBar`); **`App.jsx`** is the root with screen/tab state; **`app.css`**
holds all kit-specific styles (it imports the system tokens from
`../../colors_and_type.css`).

## Interactions you can try
- **Drag the time slider** (Karte) — POIs from different eras fade in/out; the year
  bubble follows the knob. Default year 1958.
- **Tap a pin** to select it → its label appears and the **preview card** updates.
- **Tap the preview card** or a **tour card** → POI Detail.
- **Bottom nav**: Karte ↔ Touren. (Info is a placeholder — not in the delivered
  designs. The Archiv tab was removed at the client's request.)

## Notes
- Icons: Lucide via CDN; re-rendered after each state change.
- Fonts & icon set are **substitutions** — see the root `README.md` CAVEATS.
- The `Info` tab is intentionally a placeholder (no design provided). The `Archiv`
  tab was removed per client request.
