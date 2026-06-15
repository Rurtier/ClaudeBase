# Chat Summary — Tokyo Live LED Train Map

A summary of the conversation that produced `BUILD_PLAN.md`, captured for the record.

## The original request

The user shared a link to **Metroboard** by The Design Rules Company
(designrules.co) — a piece of wall art that uses LEDs arranged as a city's subway
map to show, in real time, where trains currently are. They asked me to:

1. Analyse the product page and pick out the key parts.
2. Produce a detailed plan to recreate it themselves, but for **Tokyo** train lines.
3. Cover everything involved: what needs to be bought, key considerations,
   difficulty, and anything else important.

## What the research found

- **Metroboard** is a Wi-Fi-connected framed panel (walnut frame, brushed-aluminium
  face) with one addressable LED per station. It polls the transit agency's live data
  every few seconds and lights each station's LED in that line's official colour.
  Retail **$229**, Kickstarter early-bird **$150**. Offered for six US cities
  (NYC, Chicago, Boston, DC, LA, Bay Area) — **Tokyo is not available**, so DIY is the
  only route.
- The proven hobbyist recipe is **ESP32 + WS2812B addressable RGB LEDs behind a printed
  map**, fetching live data over Wi-Fi. The best open-source reference is the
  **Auckland LED Train Map** (github.com/CDFER/Auckland-LED-Train-Map).
- **Tokyo's distinguishing challenge is the live data.** Tokyo has no single operator,
  but the official **ODPT (Public Transportation Open Data Center)** API exposes
  **real-time train location** for **JR East and Tokyo Metro** (JR East also publishes
  GTFS-Realtime). A free developer **API key** is required and is on the critical path.

## Decisions the user made

When asked to scope the project, the user chose:

1. **Network scope:** provide **two options with a comparison** — a single iconic
   **Yamanote Loop** build and a larger **+JR / multi-line** build.
2. **Fabrication method:** asked me to **recommend** one.
3. **Skill level:** **beginner**.

## Recommended direction

- **Fabrication:** mount **WS2812B LEDs behind a printed/drilled face panel** rather
  than designing a custom SMD PCB. It gives ~90% of the look at a fraction of the
  skill/risk — the right call for a beginner. A custom PCB is the natural "v2" upgrade.
- **Scope:** **build the Yamanote Loop first** (≈30 LEDs, one colour, a clean loop,
  one data feed). It proves the entire pipeline (ODPT key → cache helper → ESP32 →
  LEDs) cheaply, and 100% of its firmware/data code carries over to the larger +JR
  build later. It is a foundation, not throwaway work.

## Build options at a glance

| Factor | A: Yamanote Loop ⭐ | B: +JR / multi-line |
|---|---|---|
| LED count | ~30 | ~300–600+ |
| Colours/lines | 1 | many |
| Map layout difficulty | Low (a loop) | High (dense, overlapping) |
| Data complexity | 1 line, 1 operator | many lines, multi-operator |
| Power | USB 5V ≥1A | dedicated 5V multi-amp PSU + injection |
| Est. parts cost | ~$40–80 | ~$120–250+ |
| Build time (beginner) | 1–2 weekends | several weekends |
| Visual "wow" | Good, iconic | Excellent |

## Key risks flagged

- **Data licensing** is the #1 risk — confirm ODPT real-time terms and register early.
- **Don't skip the WS2812 capacitor + data resistor** (classic beginner failure).
- **Power, not data, bites at scale** — budget amps and inject power for the big build.

## Where the detail lives

The full build plan — Metroboard analysis, the ODPT data pipeline, both build options,
bill of materials, firmware/data-helper design, step-by-step path, difficulty/cost,
and how to verify it works — is in **`BUILD_PLAN.md`** in this folder.

## Possible next steps (not yet done)

- Draft the actual **ESP32 firmware** and the **ODPT data-helper script**.
- Produce an exact parts list with purchase links.
- Sketch the **Yamanote station → LED index** layout/mapping table.
