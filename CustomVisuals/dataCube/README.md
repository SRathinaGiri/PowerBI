# Data Cube 3D – Power BI Custom Visual

A high‑performance 3D “Data Cube” visual for Power BI that renders three categorical dimensions (X/Y/Z) as a grid of cubes, with measure magnitude encoded by cube height/volume and color. Crisp SVG labels, smooth interactions, and a clean formatting pane make it production‑ready.

## Highlights

- Three‑dimensional cube grid (X, Y, Z) with instanced rendering
- SVG text for axis badges and tick labels (sharp at any zoom)
- Back‑face hiding for SVG labels (rear labels don’t show through)
- Clean control panel with accessible tooltips (Yaw/Pan/Roll/Zoom)
- Detailed tooltips with member totals (e.g., “Technology total”)
- Optional Report Page Tooltips support
- Legend, color modes, cube borders, inner grids, and more

## Install / Build

- Dev server: `npm run start`
- Package visual: `npm run package`
- The packaged `.pbiviz` is placed in `dist/` (import into Power BI Desktop).

## Using the Visual

1. Add fields to the visual’s data roles:
   - `Dim 1` → X axis
   - `Dim 2` → Y axis
   - `Dim 3` → Z axis
   - `Value` → Measure
2. Rotate, pan, and zoom with the on‑visual control panel or mouse.
3. Hover for tooltips; click to select; Ctrl/Cmd‑click for multi‑select.

## Formatting Options (Key)

- Labels (SVG by default)
  - Axis label: size, text color, background color, background opacity
  - Tick labels: size, text color
  - Render axis/ticks as SVG (default On)
- Axes
  - Show axis edge labels, show axis tick labels, tick labels on both sides
  - Show grid frame, inner grids per layer, orientation gizmo
- Cube
  - Scale mode (Height bars / Equal), default zoom, cell size, gap, height scale, opacity
  - Show control panel, key separator
- Colors
  - Sequential / Diverging / Categorical; min/mid/max colors; color by Z; legend toggle
- Borders
  - Show cube borders, width/color/opacity, draw on top
- Advanced
  - Sort order (totals/key), prevent height overlap, uniform scaling (legacy), volume linearity
  - Min cube ratio, Top‑N per dimension
  - Show totals in tooltip (On by default)
- Tooltip
  - Use report page tooltip (delegates to Power BI tooltips)

## Tooltips

- Default tooltip shows X/Y/Z member values, formatted value, percent of grand total, and (optionally) per‑member totals:
  - “Technology total”, “East total”, “2014 total”
- Toggle totals in: Advanced → Show totals in tooltip.
- To use report page tooltips, enable: Tooltip → Use report page tooltip.

## Interaction / Controls

- Mouse: drag to orbit, wheel to zoom, Shift+drag to pan.
- Panel buttons include descriptive titles: Yaw Left/Right, Pan Up/Down/Left/Right, Center, Roll Left/Right, Pitch Up/Down, Zoom In/Out, Front/Top/Left/Right, Preset 1/2, Start/Pause Auto Rotate.

## Design Choices

- SVG labels for clarity and scalability; back‑face hiding for realism.
- Per‑cube value/face labels removed to keep rendering fast and clean (tooltips convey details).

## Performance Notes

- Instanced geometry enables thousands of cubes.
- Tick/axis labels are lightweight SVG elements updated each frame with projected positions.

## Accessibility

- All control panel buttons expose `title`/`aria-label` tooltips.
- Configurable label colors for higher contrast.

## Known Limits / Roadmap

- Full depth occlusion of SVG labels by foreground cubes is not computed; back‑face hiding covers the common case.
- Potential future additions: optional depth‑aware occlusion, per‑axis presets, keyboard navigation improvements.

## Repository Structure

- `src/visual.ts` – main visual implementation (three.js + SVG overlays)
- `src/settings.ts` – formatting pane settings model
- `style/visual.less` – minimal styles for overlays
- `capabilities.json` – data roles, objects, tooltips capability

---

For issues or feature requests, please open an issue with a clear description, data sample, and screenshot if possible.

