# FarmBot DIY build files & affordable parts research

**Purpose:** Index official open-source build files and a practical sourcing matrix so you can buy/build an affordable FarmBot.  
**Not a Marketlist product:** Marketlist does not manufacture or sell robot kits. Self-hosted software: [FARMBOT_SELFHOST.md](FARMBOT_SELFHOST.md).

**Primary DIY path:** FarmBot **Express** (lower official DIY subtotal).  
**Larger option:** FarmBot **Genesis** (more capable, higher cost).

Hardware plans are **CC0** (public domain). FarmBot Inc. notes DIY sourcing is hard and unsupported beyond published docs; kit purchase includes support.

---

## 1. Official build-file index

| Resource | URL | Notes |
|----------|-----|--------|
| Express BOM (category totals) | https://express.farm.bot/v1.0/Extras/bom.html | Express / XL / MAX |
| Express electronics detail | https://express.farm.bot/v1.0/Extras/bom/electronics-and-wiring.html | Pi, Farmduino Express, motors, PSU |
| Express CAD (Onshape) | https://express.farm.bot/v1.0/Extras/cad.html | Export STEP/STL; CC0 |
| Farmduino Express PCB sources | Linked from Express electronics page | Schematic + board layout |
| Genesis BOM | https://genesis.farm.bot/v1.7/bom.html | Genesis / XL |
| Genesis CAD | https://genesis.farm.bot/v1.8/extras/cad.html | Onshape assemblies |
| FarmBot OS / ports | https://software.farm.bot/v15/docs/troubleshooting/connecting-farmbot-to-the-internet.html | 443, 8883, 3002 |
| Web App (self-host) | https://github.com/FarmBot/Farmbot-Web-App | Configure/manage UI |
| Community forum | https://forum.farmbot.org | DIY help (unofficial) |

---

## 2. Express official DIY totals (informational)

From FarmBot Express BOM docs (component list prices; **excluding** shipping, tax, waste, labor). Docs suggest budgeting **~+20%** if sourcing yourself.

| Category | Express qty | Official DIY subtotal |
|----------|-------------|----------------------|
| Extrusions | 4 | $80 |
| Plates and brackets | 16 | $188 |
| Plastic parts | 24 | $140 |
| Fasteners and hardware | 243 | $115 |
| Drivetrain | 25 | $224 |
| Electronics and wiring | 27 | $622 |
| Tubing | 23 | $107 |
| Supporting infrastructure* | 50 | $200 |
| **Grand total (listed)** | **410** | **~$1,664** |

\* Raised bed / soil / lumber varies widely; not in kit.

Express XL ~$2,237 · Express MAX ~$3,347 (same docs).

---

## 3. Affordable sourcing matrix (Express-first)

Estimates are **research ballparks** (USD, mid-2026 web pricing ranges). Always verify compatibility against Onshape exports and Farmduino pinouts before ordering.

| Category | Official approach | Affordable DIY approach | Example sources / aliases | Est. DIY range | Risk |
|----------|-------------------|-------------------------|---------------------------|----------------|------|
| Extrusions | FarmBot extrusion kit | 20×20 or 20×40 V-slot / T-slot cut to CAD lengths | OpenBuilds, Misumi, local aluminum supplier | $50–$120 | Hole pattern / length mismatch |
| Plates & brackets | Laser-cut kit plates | Export DXF/STEP from Onshape → local laser/CNC shop or SendCutSend | Aluminum 3–6 mm | $80–$180 | Tolerance; re-cut cost |
| Plastic parts | Injection / kit plastics | **3D print** STLs from Onshape (PETG preferred outdoors) | Prusa/Bambu filament; print farm | $30–$90 filament + time | UV/creep; reprint critical parts |
| Fasteners | Kit hardware pack | Bulk M5/M6, T-nuts, washers | McMaster-Carr, Bolt Depot, Amazon | $40–$90 | Wrong length/thread |
| Drivetrain | Timing belts, pulleys, gantry wheels | GT2 belts + matching pulleys; V-wheel kits | OpenBuilds, AliExpress (measure pitch) | $100–$200 | Belt stretch; wheel play |
| Electronics — SBC | Raspberry Pi (Express uses Pi / Pi Zero class per docs) | Buy **genuine** Pi from authorized reseller | PiShop, Adafruit, Digi-Key | $15–$75 | Counterfeits; availability |
| Electronics — Farmduino | Farmduino Express board | Order official board **or** fab from published Gerbers | JLCPCB / PCBWay + BOM; or buy assembled if sold | $40–$120 fab vs kit | Firmware flashing; connector footprint |
| Motors & drivers | Kit steppers | NEMA 17 steppers matching torque/current in docs | Stepperonline, Digi-Key | $60–$150 | Underrated motors stall |
| Power supply | 24V kit PSU | Mean Well or equivalent 24V with headroom | Digi-Key, Mouser | $40–$90 | **Safety — do not cheap unsafe PSUs** |
| Cables / UTM harness | Kit wiring | Molex / JST per schematic; custom harness | Digi-Key; crimp tools | $40–$100 | Pinout errors |
| Sensors / tools | Soil sensor, nozzle, seeder | Clone carefully from CAD or buy FarmBot tools | Official tools vs DIY print | $50–$200 | Water path leaks |
| Tubing / fittings | Kit tubing | Food-safe tubing + barbs sized to CAD | McMaster, irrigation suppliers | $30–$80 | Chemical compatibility |
| Supporting infrastructure | Raised bed | Untreated lumber / cedar bed, soil, water source | Local lumber yard | $100–$400 | Drainage; outdoor load |
| Camera | Kit camera | Pi Camera Module compatible with FBOS | Authorized Pi camera | $15–$50 | Cable length / focus |

### Top cost drivers (save here carefully)

1. **Electronics (~$622 listed)** — biggest line; don’t cheap the PSU or counterfeit Pi.  
2. **Drivetrain (~$224)** — measure belt pitch; cheap wheels add backlash.  
3. **Plates (~$188)** — laser cutting from your CAD is often cheaper than kit plates if you batch.  
4. **Plastics (~$140)** — print yourself for largest savings.  
5. **Infrastructure (~$200+)** — shop local lumber; skip “kit aesthetic.”

### Do not cheap out

- Power supply and mains wiring (fire/safety)  
- Genuine compute (Pi) and correct Farmduino firmware path  
- Structural fasteners in load paths  

---

## 4. Genesis delta

Genesis is the larger CNC-style bed robot (UTM tools, more extrusions, higher electronics cost). Use Genesis BOM + CAD when you need Genesis features; expect **substantially higher** DIY totals than Express. Prefer Express for a first affordable build unless you already own Genesis-compatible tooling.

---

## 5. Ballpark totals

| Path | Money (approx.) | Time / risk |
|------|-----------------|-------------|
| Official Express kit | Street kit price (check farm.bot shop) | Lowest risk; support |
| DIY Express (parts) | ~$1,600 listed + ~20% sourcing friction → **~$2,000** parts ballpark before tools/printer | High time; no official DIY support |
| DIY with heavy 3D print + local metal | Potentially **$1,200–$1,800** if prints succeed and plates are batched | High skill required |

Labor is unpaid in these figures — DIY often loses to kit on total cost of ownership.

---

## 6. Next physical steps (after software is up)

1. Create free Onshape account → copy Express CAD → export STLs for plastics and DXF/STEP for plates.  
2. Order **long-lead electronics** first (Pi, Farmduino/fab, PSU, steppers).  
3. Print structural plastics; cut plates; buy extrusions to measured lengths.  
4. Flash **FarmBot OS** pointing server at `farmbot.kecktech.net` (see FARMBOT_SELFHOST.md).  
5. Assemble per Express assembly docs; verify MQTT 8883 / HTTPS 443.  
6. Connect Marketlist Garden with a FarmBot API token from your self-hosted Web App.

---

## 7. Non-claims

- Marketlist does **not** sell FarmBot kits or Marketlist-branded robots.  
- This document is research for operators building hardware; prices change — re-check vendors before purchase.  
- Closed indoor gardens (Gardyn, AeroGarden, etc.) remain **manual log only** in Marketlist.
