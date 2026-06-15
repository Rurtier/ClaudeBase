# Build Plan: A Live LED Tokyo Train Map (Metroboard clone)

## Context

You found **Metroboard** by The Design Rules Company (designrules.co) — a piece of
wall art that lights up LEDs arranged in the shape of a city's subway map to show,
in real time, where every train currently is. You want to build your own version
for **Tokyo**.

This document (1) analyses what Metroboard actually is and how it works, (2) explains
the one part that makes Tokyo genuinely different from the US cities (the live data),
and (3) gives you **two concrete build options** — a beginner-friendly **Yamanote
Loop** build (recommended first project) and a more ambitious **+JR / Tokyo Metro**
build — with a recommended fabrication method, bill of materials, cost, difficulty,
and a step-by-step path for each.

Note: this is a physical/electronics + firmware project, not a change to this
repository. There is no code in this repo to modify; the "implementation" is a build
you do with hardware plus a small amount of microcontroller firmware.

---

## Part 1 — What Metroboard actually is (the analysis)

Pulled from the product page, its Kickstarter, and press coverage (PR Newswire,
Gizmodo):

**The concept**
- A framed wall panel with the subway map silkscreened/printed on it, and an LED at
  (or near) every station.
- Connected to home **Wi-Fi**. Every few seconds it asks the city's transit agency
  for live train data and lights the LEDs to show where trains are *right now*.
- Each LED is lit in **the official colour of that line** (e.g. red line = red LEDs).
- Marketed as "tech-art": it's deliberately a beautiful object, not a gadget.

**Physical / materials (their premium positioning)**
- Solid **walnut frame** with mitre-joint corners.
- **Brushed aluminium** face panel with the map printed on it.
- Cities offered: New York, Chicago, Boston, Washington D.C., Los Angeles, Bay Area.

**Price (this matters for "should I just buy one")**
- Retail **$229**; Kickstarter early-bird **$150** (via a $3 reservation for $80 off).
- Tokyo is **not** offered — which is exactly why building it yourself is the move.

**The key parts to replicate (decomposed)**
1. **The map artwork** — geometric, line-coloured, accurately placed stations.
2. **One addressable LED per station**, colour-controlled individually.
3. **A Wi-Fi microcontroller** that fetches live data and drives the LEDs.
4. **A live data source** that says which trains are between/at which stations.
5. **A nice enclosure** (frame + face panel) so it reads as art, not a breadboard.

---

## Part 2 — How it works technically (what you're recreating)

The hobbyist blueprint is well established. The best open-source reference is the
**Auckland LED Train Map** (github.com/CDFER/Auckland-LED-Train-Map), which is
essentially a Metroboard built in the open. Its recipe:

- **Microcontroller:** ESP32 (it used an ESP32-C3). ESP32 is the standard choice —
  cheap, built-in Wi-Fi, tons of tutorials, drives addressable LEDs easily.
- **LEDs:** ~150 **WS2812B** addressable RGB LEDs. "Addressable" = every LED has a
  chip inside, so one data wire controls all of them and each can be any colour. This
  is the single most important component choice and what makes line-colouring trivial.
- **Power:** 5V via USB-C, ≥1A.
- **Data:** fetched over Wi-Fi from a **GTFS-Realtime** feed (the worldwide standard
  format for live transit data), usually via a small caching server rather than the
  microcontroller parsing the raw feed itself.
- **Firmware:** flashed via a web installer; Wi-Fi set up through a captive-portal web
  page on first boot.

So "recreating Metroboard" = **ESP32 + a string of WS2812B LEDs behind a printed Tokyo
map + firmware that maps live train data → which LED lights up in which colour.**

---

## Part 3 — The Tokyo-specific crux: the live data

This is the part that's different from the US and the biggest technical risk, so read
this carefully.

- Tokyo has **no single transit map or operator**. Tokyo Metro (9 lines) + Toei (4
  lines) make up the subway; JR East runs the Yamanote loop and many others; plus
  numerous private railways (Odakyu, Keio, Tobu…). It's considered the most complex
  rail map in the world.
- The official live-data source is **ODPT — the Public Transportation Open Data Center**
  (odpt.org). It aggregates and cleans operator data and exposes it via a free API.
- **Crucially, real-time *train location* data exists** for the operators we care about:
  **JR East and Tokyo Metro both publish real-time train location + status**, and JR
  East also publishes **GTFS-Realtime**. This is what makes the Metroboard concept
  possible for Tokyo at all.
- **You must register** as a developer on the ODPT site to get a free **API key**.
  Some real-time datasets historically required agreeing to extra terms — confirm the
  license for each operator's real-time feed when you register.
- Data model: ODPT's `odpt:Train` objects give you a train's line, direction, and the
  section it's in (`fromStation` → `toStation`). That maps perfectly onto "light the LED
  between station A and B" or "light station A."

**Practical recommendation:** poll ODPT from a tiny always-on helper (a free-tier cloud
function or a Raspberry Pi), have *it* fetch + simplify the data, and have the ESP32
request that simplified JSON every ~5–10s. This mirrors how the Auckland and BART
builds avoid making the microcontroller parse heavy feeds, and lets you hide your API
key off-device.

---

## Recommended fabrication method (you asked me to choose)

**Recommendation: WS2812B LEDs mounted behind a printed/laser-cut face panel — NOT a
custom PCB.**

Why, for a beginner:
- The real Metroboard and the Auckland map use a **custom PCB with tiny surface-mount
  LEDs**. That gives a flawless finish but requires KiCad PCB design, ordering from
  JLCPCB, and reflow/SMD soldering — a steep first project with expensive mistakes.
- The **LEDs-behind-a-panel** approach gives ~90% of the visual result with a tiny
  fraction of the skill/tooling: you place pre-wired addressable LEDs (or trimmable
  strip) at each station hole, and the printed map hides the wiring. Beginner-friendly,
  cheap to iterate, very forgiving.
- You can always graduate to a custom PCB for "v2" once the firmware and data pipeline
  are proven.

**How the panel works:** print the map on the back of a translucent/acrylic or thick
matte panel, drill/laser a small hole at each station, push an LED into each hole from
behind, diffuse with a little hot glue or a printed diffuser, and frame it.

---

## Two build options (with comparison)

### Option A — Yamanote Loop  ⭐ Recommended first build

The Yamanote line is the iconic green loop through Shinjuku, Shibuya, Tokyo, Ueno,
Ikebukuro. It's a single JR East line, ~30 stations, one colour, one closed loop —
a *perfect* first version that still looks unmistakably "Tokyo."

- **LEDs:** ~30 (one per station), all green — simplest possible colour logic.
- **Data:** JR East real-time location via ODPT, one line only. Easy to filter.
- **Map:** a clean circle/oval — easy to lay out and drill accurately.
- **Great because:** you prove the whole pipeline (ODPT key → server → ESP32 → LEDs)
  with minimal parts, then scale up confidently.

### Option B — +JR (Yamanote + JR core) / multi-line

Add the major JR East lines (Chuo/Sobu, Keihin-Tohoku, etc.) and optionally Tokyo Metro
lines. Much closer to the full Metroboard "wow," much harder.

- **LEDs:** ~300–600+ depending on how many lines.
- **Data:** multiple operators/lines; per-line colour mapping; more API endpoints and
  edge cases (express vs local, through-running services).
- **Map:** dense, overlapping lines — accurate station placement is the hard part.
- **Power/wiring:** hundreds of LEDs need a proper 5V supply (several amps) and
  careful wiring, not USB-only.

### Comparison

| Factor | A: Yamanote Loop | B: +JR / multi-line |
|---|---|---|
| LED count | ~30 | ~300–600+ |
| Colours/lines | 1 | many |
| Map layout difficulty | Low (a loop) | High (dense, overlapping) |
| Data complexity | 1 line, 1 operator | many lines, multi-operator |
| Power | USB 5V ≥1A | dedicated 5V multi-amp PSU |
| Est. parts cost | ~$40–80 | ~$120–250+ |
| Build time (beginner) | A weekend or two | Several weekends |
| Risk of giving up | Low | Medium–High |
| Visual "wow" | Good, iconic | Excellent |

**My advice:** build **A first**, reuse 100% of its firmware/data code for **B**. A is
not throwaway work — it's the foundation, and a framed Yamanote loop is a lovely object
on its own.

---

## Bill of materials

### Shared core (both options)
- **ESP32 dev board** (e.g. ESP32-WROOM DevKitC) — ~$8. Built-in Wi-Fi.
- **WS2812B addressable RGB LEDs** — as individually-addressable strip you cut to
  length, or pre-wired "string"/"pixel" LEDs (easier to place at scattered stations).
- **5V power supply** — USB 5V/2A for A; a 5V/5–10A barrel/screw-terminal PSU for B.
- **Hookup wire**, **JST connectors**, a **logic-level / data resistor (~330–470Ω)** and
  a **1000µF capacitor** across the LED power (standard WS2812 protection).
- **Soldering iron + solder**, wire strippers, multimeter (basic kit ~$30).
- **Face panel:** acrylic or matte board, A3-ish for A, larger for B.
- **Picture frame** (or build a simple walnut/oak frame for the Metroboard look).
- **Diffusers:** hot glue, ping-pong-ball halves, or 3D-printed/printed diffuser dots.

### Software / accounts (free)
- **ODPT developer account + API key** (odpt.org). Register early — approval/terms can
  take time and is on the critical path.
- **Arduino IDE or PlatformIO** to flash the ESP32 (FastLED or Adafruit NeoPixel
  library for the LEDs).
- A place to run the **data-cache helper**: a Raspberry Pi you may own, or a free-tier
  serverless function (e.g. a scheduled function that re-serves simplified JSON).

### Option B extras
- Larger PSU and **power-injection** wiring (feed 5V at multiple points along long LED
  runs so colours don't sag/brown out).
- More patience for accurate multi-line map artwork (consider laser-cutting the panel
  and station holes at a makerspace).

---

## Firmware & data pipeline (the only "code" in this project)

1. **Helper service (recommended):** small script (Python/Node) that:
   - calls ODPT every ~5–10s for the line(s) you care about,
   - extracts each train's `fromStation`/`toStation` + line,
   - returns a compact JSON like `[{"led": 12, "color": "green"}, ...]`.
   - Keeps your API key off the device and reduces ESP32 load.
2. **ESP32 firmware:**
   - On first boot, host a Wi-Fi setup page (WiFiManager captive portal) so you don't
     hardcode credentials.
   - Every few seconds, HTTP GET the helper's JSON.
   - Map each train to its **LED index** via a lookup table you define (station → LED
     number) and set that pixel to the line colour with FastLED/NeoPixel.
   - Gentle fade/animation between updates looks much nicer than hard on/off.
3. **Station→LED mapping table** is the fiddly bit: you assign each physical LED an
   index as you wire it, and record which station it represents. Build this table
   incrementally — start with the Yamanote 30.

---

## Step-by-step build path (do A, then optionally B)

1. **Register for an ODPT API key** today (it's free but on the critical path).
2. **Prototype electronics on a breadboard:** ESP32 + a short WS2812B strip. Get
   "light pixel N green" working with FastLED. (No map yet.)
3. **Stand up the data helper** and confirm you can fetch live Yamanote train sections
   from ODPT and print them.
4. **Connect the two:** ESP32 polls helper → lights the matching pixels. This is the
   whole project working in miniature — celebrate here.
5. **Design the face panel:** lay out the Yamanote loop to scale, mark station
   positions, print, and make/drill the holes.
6. **Mount LEDs** behind each station hole, wire in order, record the station→LED map,
   add the cap + resistor + proper 5V power.
7. **Diffuse + frame.** Done — a live Yamanote map.
8. **(Option B)** Reuse all firmware. Expand the helper to more lines, add per-line
   colour mapping, design the denser panel, upgrade the power supply with injection.

---

## Difficulty, time, cost summary

- **Skill assumed:** beginner. The recommended panel method needs basic through-hole
  soldering and following Arduino tutorials — very learnable.
- **Hardest parts (in order):** (1) the live ODPT data + key/licensing, (2) accurate
  map artwork for Option B, (3) power wiring at scale for Option B.
- **Time:** Option A ≈ 1–2 weekends; Option B ≈ several weekends.
- **Cost:** Option A ≈ **$40–80**; Option B ≈ **$120–250+**. (For comparison, buying a
  Metroboard is $150–229 — but Tokyo isn't sold, so DIY is the only route.)

## Key considerations / risks

- **Data licensing is the #1 risk.** Confirm ODPT real-time terms allow your use;
  register early. If a real-time *location* feed is restricted, you can fall back to
  timetable + delay status (less "live" but still works).
- **Don't skip the capacitor + data resistor** on the LEDs — classic beginner WS2812
  failure.
- **Power, not data, is what bites at scale** (Option B): budget amps and inject power.
- **Start small.** The Yamanote build de-risks everything before you commit to a big,
  hole-drilled panel.

## How to verify it works

- **Bench test:** before any map, confirm the breadboard ESP32 lights the exact pixels
  that correspond to live trains by cross-checking against a live app (e.g. an official
  JR/Metro app or Mini Tokyo 3D) — the same trains should appear in the same places.
- **Data test:** hit your helper's JSON endpoint in a browser and confirm it updates
  every few seconds with plausible station sections.
- **End-to-end:** stand at the framed map and watch a train you can verify (e.g. ride
  the Yamanote, or watch a live tracker) move LED-by-LED around the loop.

---

## Sources
- Metroboard product: https://www.designrules.co/  ·  FAQ: https://www.designrules.co/support/faqs
- Launch / press: https://www.prnewswire.com/news-releases/two-train-nerds-launch-design-studio-set-to-release-live-subway-map-piece-for-six-us-cities-302236719.html  ·  https://gizmodo.com/this-beautiful-wall-art-shows-when-your-citys-trains-are-breaking-down-in-real-time-2000481516
- Kickstarter: https://www.kickstarter.com/projects/designrulesco/metroboard-a-mid-century-live-subway-map
- Open-source reference build (Auckland): https://github.com/CDFER/Auckland-LED-Train-Map
- Tokyo live data (ODPT): https://www.odpt.org/en/overview/  ·  https://challenge2025.odpt.org/en/opendata.html
- Tokyo network/maps context: https://www.nomadicnotes.com/tokyo-subway-maps/
