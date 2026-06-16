# Tokyo Live Rail Map — Proof of Concept (+JR scope)

A browser mock-up of the planned LED map. It draws the Yamanote loop + JR East core
lines (plus the Marunouchi and Ginza metro lines) as a glowing schematic and animates
trains around it. Each station acts like an "LED" that lights in the line colour when a
train is there — exactly what the physical board will do.

**Tracking method (for now):** trains are estimated from each line's **timetable**
(headway + per-stop travel time) with **simulated delays**, because live ODPT data
needs an approved API key. The data layer is swappable, so going live later is a
one-line change.

## Run it

It's plain HTML/CSS/JS with no build step or dependencies.

- **Quickest:** open `index.html` in a browser.
- **Recommended (so future `fetch`-based ODPT works):** serve it statically:
  ```bash
  cd tokyo-led-train-map/poc
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```

Use the header controls to pause/resume and change the clock speed (1×–10× sim-minutes
per real second). The side panel shows live per-line service status with simulated
delays.

## Offline use (PWA)

The app already runs with **no external dependencies and no network calls**, so it works
offline out of the box. On top of that it's an installable **Progressive Web App**:

- A service worker (`sw.js`) caches the app shell on first load, so it keeps working with
  no connection — handy for a wall display.
- A web manifest (`manifest.webmanifest` + `icon.svg`) makes it installable ("Add to Home
  Screen" / "Install app") and launchable full-screen.

Service workers only run over **http/https**, not `file://`, so to get offline caching and
install, load it via a server (e.g. `python3 -m http.server`, below) once — after that it
runs offline. Opening `index.html` directly still works; it just skips the install/cache layer.

## Files

| File | Role |
|------|------|
| `index.html` | Page shell + controls |
| `styles.css` | Dark "tech-art" styling |
| `network.js` | Stations, lines, colours, and schematic coordinates (the only file you edit to change the map) |
| `simulation.js` | `TimetableSimulationSource` (used now) **and** `OdptSource` (stub for live data) |
| `app.js` | SVG rendering + animation loop + UI |
| `manifest.webmanifest` / `icon.svg` | PWA install metadata + icon |
| `sw.js` | Service worker — offline caching of the app shell |

## The data-source contract

The UI only ever calls:

```js
source.getState(simMinutes) // -> { trains: [{lineId,color,x,y,station,delayed}], delays: {lineId:min} }
```

`TimetableSimulationSource` fabricates that from timetables. `OdptSource` will return the
same shape from the real feed.

## Switching to live ODPT data (once your key is approved)

1. **Keep the key off the page.** Stand up a tiny proxy (serverless function or small
   server) that calls ODPT with your key and returns the simplified JSON shape above.
   ODPT's `odpt:Train` objects give each train's line + `fromStation`/`toStation`, which
   map directly onto a station id (and therefore an LED).
2. In `app.js`, change one line:
   ```js
   // var source = new TimetableSimulationSource(network);
   var source = new OdptSource(network, { proxyUrl: '/api/odpt' });
   ```
3. Make sure the station ids in `network.js` match the ids you emit from the proxy.

Everything else — the map, the LEDs, the delay panel — stays the same. This same
`getState()` output is also what the ESP32 firmware will consume for the physical build.

## Caveats

- Map geometry is a **stylised schematic**, not geographically accurate.
- Train counts/positions are **plausible, not real** until ODPT is connected.
- Scope is a representative slice of "+JR", not every line/station.
