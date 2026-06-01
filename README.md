[README.md](https://github.com/user-attachments/files/28463063/README.md)
# Ankunft: Gießen — Design System

A design system and developer **handoff** for the **multimediale Kartenapp** of the
**Lern- und Erinnerungsort Notaufnahmelager Gießen gGmbH**. It defines the visual
language, tokens, components and a high-fidelity, click-through UI kit of the four
core screens, so an app developer can build the cross-platform app (iOS / Android
or PWA) against a settled design.

> **Was ist das?** Eine Kartenapp, die die Geschichte des früheren Notaufnahmelagers
> Gießen als digitalen Stadtrundgang erfahrbar macht — geführt durch einen
> **Zeit-Slider**, der stufenlos durch die Jahrzehnte führt, während **Points of
> Interest (POIs)** auf der Karte erscheinen und verschwinden.

The look is modelled on apps like **berlinHistory**, the **Frankfurt History App**
and **Amigra** (Fluxguide gGmbH): map-first, calm, archival, "so einfach wie möglich".
The palette and typography are tuned to sit alongside the institution's website
(https://www.notaufnahmelager-giessen.de/).

---

## Sources this system was built from

| Source | What it is |
|---|---|
| `uploads/01_Einleitung_Kartenapp.docx` | Ausschreibung 2026 — Leistungsgegenstand, Ziele, Hauptfeatures, Zielgruppen, User Journeys (P1 Lukas, P2 Frau Yildiz, P3 Herr Grüner), Zeitplan. |
| `uploads/Willkommens-Screen.png` | Welcome / entry screen design |
| `uploads/Interaktive KArte.png` | Interactive map with time slider + POI preview window |
| `uploads/POI Details.png` | POI detail page (media, audio, facts, sources) |
| `uploads/Kuratierte Touren.png` | Curated/themed tours screen |
| https://www.notaufnahmelager-giessen.de/ | Institution homepage (JS-rendered; could not be auto-scraped — see CAVEATS). |

The original screens are preserved in `assets/reference/` for side-by-side comparison.

> **Note on scope.** The brief covers a full product (CMS/TYPO3 backend, 65+ POIs,
> offline cache, WCAG 2.1 AA, DE/EN/Leichte Sprache, Arabic-ready). This package is
> the **design layer**: tokens, components and the front-end recreation of the four
> hero screens. It is not production app code or a CMS.

---

## Content fundamentals

**Language.** German (Deutsch) is primary; the product also ships **English** and
**Leichte Sprache**, with Arabic planned. Special characters (ä ö ü ß) must always
render correctly — they appear in headlines ("Gießen", "Rödgener Straße").

**Voice & address.** Warm, dignified, invitational — never sensational. The reader
is addressed with the formal **„Sie"** ("Begeben **Sie** sich auf eine Zeitreise…",
"Entdecken **Sie** die Zeitgeschichte"). This respect-register fits a memorial /
educational institution.

**Tone.** Editorial and humane. Copy foregrounds **people and individual fates**
("persönliche Schicksale", "Biografien", "Zeitzeugenbericht"), framed by sober
scholarly context ("Wissenschaftliche Einordnung", "Daten & Fakten", cited quotes).
Hope and arrival sit alongside hardship — the name itself, *Ankunft* (arrival), is
the throughline.

**Casing.** Sentence/German noun-capitalisation for body and titles. **Eyebrows and
status labels are UPPERCASE** with wide tracking ("DIGITALE AUSSTELLUNG",
"KURATORISCHE AUSWAHL", "HISTORISCHER ORT", "AKTIV", "FEATURED", "DATEN & FAKTEN").

**Numerals.** Tabular, German formatting ("4.500 Personen", "1. September 1950",
years "1945 – 2024", durations "45 MIN", distances "1.2 KM").

**Emoji.** **None.** Iconography is line-based (see ICONOGRAPHY). Quotation marks use
German typographic forms „ … " where set by editors.

**Specific examples.**
- Hero: *„Ankunft: Gießen — Begeben Sie sich auf eine Zeitreise durch das
  Notaufnahmelager Gießen."*
- Tours eyebrow + hero: *„KURATORISCHE AUSWAHL / Entdecken Sie die Zeitgeschichte"*
  (with *Zeitgeschichte* set in red italic).
- Pull-quote: *„Gießen war mehr als ein Lager; es war eine transitorische Zone…"*
  — Prof. Dr. L. Schmidt, Archiv für Zeitgeschichte.

---

## Visual foundations

**Mood.** Warm archival "paper" — like a well-made museum guide. Calm, high-contrast,
trustworthy. The signature combination is **deep memorial navy + brick red on warm
cream**, with a **sage-green map** as the recurring canvas.

## Brand — official logo

The institution's logo (`assets/logo-nal.png` transparent · `assets/logo-nal.jpg` on
white, extracted from the supplied `Logo LuE NAL-2.pdf`) is **three woven bands** in
**red, black and blue** — crossing paths that read as migration / intertwined lives —
followed by a bold **condensed all-caps grotesque** wordmark:
**LERN- UND ERINNERUNGSORT** (red) · **NOTAUFNAHMELAGER** (black) · **GIESSEN** (blue).
This is the **source of truth** for the palette. (The wordmark face is a heavy
condensed sans — a Google-Fonts match such as *Roboto Condensed / Saira Condensed Bold*
is the closest if it must be re-set; normally use the logo artwork as-is.)

**Color.** See `colors_and_type.css`. Derived from the logo:
- **Logo red `#D72D33`** — the single accent: primary actions, active/aktiv state,
  the time-slider fill+knob, red-italic editorial emphasis, section rules, red POI pins.
- **Logo blue `#003C8F`** + deepened `#002B66` — brand blue (wordmark "Gießen", links,
  secondary accents).
- **Deep blue-navy `#001944`** — the app's structural dark (facts panel, promo cards,
  navy POI pins). A deepened relative of the brand blue, chosen for legibility of dark
  pins/labels over the sage map.
- **Logo black `#141414`** — available for high-contrast text / WCAG contrast mode.
- **Cream 50 `#FCF9F2`** — the app's warm reading "paper" (plus `#F5F2EA`, recessed
  `#EDECE6`, chip `#E5E2DB`, elevated white `#FFFFFF`). White is the logo's own field;
  cream is the app surface.
- **Map**: sage land `#B7C2A0`, Lahn water `#A9C4CF`, road lines `#F3F1E7`.
- Red is used **sparingly** — one accent per view. Navy/blue carry structure; cream carries calm.

**Type.** Display = **Zilla Slab** (slab serif, weights 500/600/**700**, plus *italic*
for red accents) — gives memorial gravitas. Body = **Source Sans 3** (humanist sans,
400/600/700) — highly legible and scalable for WCAG text-resizing. *(Substitution —
see CAVEATS / Fonts.)*

**Spacing.** 4-pt grid (`--s-1`=4 … `--s-12`=48). Generous screen padding (~24px).
Touch targets ≥ 44–50px (nav tabs, FABs, media buttons).

**Backgrounds.** Flat warm cream — **no gradients** as decoration. The only gradient
is a functional cream-to-transparent scrim behind the time slider so it reads over the
map. Imagery is **full-bleed photographic** inside rounded cards; the map is a
soft sage illustration. A faint dotted texture marks the "Auf Karte zeigen" CTA block.

**Imagery vibe.** Mixed: warm contemporary color photos (portrait, streets, tour
sites) and **black-&-white archival** photography in detail pages. Always inside
rounded frames with soft elevation.

**Corner radii.** Soft and friendly: 10 / 16 (buttons, chips) / 22 (cards, thumbs) /
28 (floating map UI, big media) / pill (badges, slider knob, location chip).

**Cards.** Cream or white fills, **soft low-spread navy-tinted shadows** (never harsh
black), hairline `rgba(0,25,68,.10)` borders where elevation alone isn't enough.
Floating map UI uses the strongest shadow (`--sh-float`). Dark cards (navy) are used
for emphasis blocks (facts, promo) with cream text at 62% for secondary lines.

**Elevation.** Four steps — hairline → card → preview window → floating. Warm tint:
`rgba(0,25,68,…)`, blur-forward, minimal spread.

**Borders & rules.** A short **3px brick-red rule** under hero headlines is a signature
motif. Pull-quotes use a 3px red left-border. Dividers are hairline navy-alpha.

**Transparency / blur.** Used lightly: the slider scrim; semi-opaque caption bars over
images; map label chips. No heavy glassmorphism.

**Motion.** Restrained and respectful. Press = **scale .97** on buttons / scale .99 on
cards; ~120ms ease. Tab/era color changes ~150ms. The **time slider** is the one
expressive interaction — dragging it continuously reveals/hides POIs and the year
bubble tracks the knob. No bounces, no flashy entrances.

**Hover/press.** Primary button darkens (brick 600→700) and scales down on press;
icon buttons get a faint navy wash; cards scale down slightly.

**Layout rules.** Mobile-first, single column. Fixed **bottom navigation** (Karte ·
Touren · Archiv · Info). On the map screen, controls **float over** the canvas (top
bar, media switcher, POI preview card, time slider). Content screens scroll under a
compact top app bar.

---

## Iconography

See `assets/` and the `Iconography` preview card.

- **Icon set: [Lucide](https://lucide.dev)** — line icons, **stroke-width 2**, rounded
  caps/joins. This is a **substitution** for the original screens' icons (the screens
  use a near-identical thin-line set; Lucide is the closest CDN-available match — see
  CAVEATS). Loaded from CDN: `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`.
- **Solid fills** are reserved for **POI pins** (teardrop) and the **active nav/media
  button** (filled navy). Everything else is outline.
- Core glyphs in use: `menu`, `navigation`, `search`, `map`, `compass`, `archive`,
  `info`, `map-pin`, `mic`, `file-text`, `image`, `play`, `volume-2`, `audio-lines`,
  `clock`, `route`, `external-link`, `arrow-right/left`, `chevron-right`,
  `book-marked` (brand mark), `landmark`, `languages`, `type`, `contrast`.
- **No emoji.** **No** decorative unicode dingbats. The brand mark is typographic
  ("Ankunft: **Gießen**", *Gießen* in red) paired with a `book-marked` glyph in a navy
  rounded square.
- **Map pins are teardrops** (rounded top, pointed tip marking the exact location):
  navy = standard POI, red = filtered/active category, enlarged + label tooltip = selected.

---

## Files in this system (index)

| Path | What |
|---|---|
| `README.md` | This file. |
| `SKILL.md` | Agent-Skill manifest (for use in Claude Code). |
| `colors_and_type.css` | **All design tokens** — colors, type, radii, shadows, spacing + base element styles. Import this first. |
| `preview/` | 21 Design-System cards (Type · Colors · Spacing · Components · Brand) shown in the Design System tab. |
| `assets/` | `logo-nal.png` (transparent) & `logo-nal.jpg` (on white) — official logo; `giessen-map.png` (cleaned sage map), POI/tour/portrait photos, `archive-heae-building.png`. |
| `assets/reference/` | The four original screen designs, for comparison. |
| `ui_kits/kartenapp/` | **The handoff UI kit** — interactive recreation of all four screens. See its own `README.md`. |
| `uploads/` | Original brief + source screens as delivered. |

### UI kits
- **`ui_kits/kartenapp/`** — Welcome · Interactive Map (time slider + POI preview) ·
  POI Detail · Curated Tours. Open `index.html`.

---

## CAVEATS / open questions for iteration

1. **Fonts are substitutions.** The screens' display face reads as a bold slab serif
   and the body as a humanist sans. I matched them to **Zilla Slab** + **Source Sans 3**
   (both free, Google Fonts). **Please confirm the institution's actual brand fonts**
   (the website may specify them) and send the files — I'll swap them in `fonts/`.
2. **Icons are substitutions.** Mapped to **Lucide**. If the app should use a specific
   set (or the website's), tell me and I'll switch.
3. **Palette now grounded in the official logo.** Reconciled to logo red `#D72D33`,
   blue `#003C8F`, black `#141414` (from the supplied `Logo LuE NAL-2.pdf`, extracted to
   `assets/logo-nal.*`). `notaufnahmelager-giessen.de` itself is JS-rendered and couldn't
   be auto-scraped; if a web brand sheet exists, share it for a final check.
4. **Imagery is cropped from the screen mockups** (lightly retouched to remove baked-in
   UI). For production, replace with real archival photography and the actual Gießen map
   tiles / layers.
