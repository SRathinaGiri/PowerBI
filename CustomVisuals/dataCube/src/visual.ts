/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";
import * as THREE from "three";
import { valueFormatter } from "powerbi-visuals-utils-formattingutils";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.extensibility.ISelectionId;

import { VisualFormattingSettingsModel } from "./settings";

type DataView = powerbi.DataView;
type MatrixNode = powerbi.DataViewMatrixNode;

interface Cell {
    i0: number; // index along dim1
    i1: number; // index along dim2 (Y axis stacks)
    i2: number; // index along dim3
    v: number;  // value
    key0: string;
    key1: string;
    key2: string;
    sel?: ISelectionId; // leaf combination
    sel0?: ISelectionId; // selection id for axis X member at active depth
    sel1?: ISelectionId; // selection id for axis Y member at active depth
    sel2?: ISelectionId; // selection id for axis Z member at active depth
    node0?: MatrixNode; // node refs for custom selection building
    node1?: MatrixNode;
    node2?: MatrixNode;
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private container: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    // three.js
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private instanced?: THREE.InstancedMesh;
    private edgeInstanced?: THREE.InstancedMesh;
    private edgeLines?: THREE.LineSegments;
    private axisLabelsGroup?: THREE.Group;
    private gridGroup?: THREE.Group;
    private ticksGroup?: THREE.Group;

    // simple camera orbit controls
    private radius = 35;
    private theta = 0.9; // azimuth
    private phi = 1.0;   // polar
    private target = new THREE.Vector3(0, 0, 0);
    private selectionManager: ISelectionManager;
    private tooltipEl?: HTMLElement;
    private tooltipService?: any;
    private axisInfoEl?: HTMLElement;
    private pointer = new THREE.Vector2();
    private raycaster = new THREE.Raycaster();
    private instanceToCellIndex: number[] = [];
    private instanceMatrices: THREE.Matrix4[] = [];
    private baseInstanceColors: THREE.Color[] = [];
    private selectedInstances = new Set<number>();
    private selectionOutlineGroup?: THREE.Group;
    private selectionGlowGroup?: THREE.Group;
    private legendEl?: HTMLElement;
    // SVG overlay for crisp text (axis and ticks)
    private svgOverlay?: SVGSVGElement;
    private svgAxisGroup?: SVGGElement;
    private svgTicksGroup?: SVGGElement;
    private svgAxisLabels: Array<{ g: SVGGElement; pos: THREE.Vector3; n: THREE.Vector3 }> = [];
    private svgTickLabels: Array<{ g: SVGGElement; pos: THREE.Vector3; n: THREE.Vector3 }> = [];
    // orientation gizmo
    private gizmoCanvas?: HTMLCanvasElement;
    private gizmoRenderer?: THREE.WebGLRenderer;
    private gizmoScene?: THREE.Scene;
    private gizmoCamera?: THREE.PerspectiveCamera;
    private gizmoAxes?: THREE.Group;
    // mouse controls
    private isDragging = false;
    private isPanning = false;
    private dragLastX = 0;
    private dragLastY = 0;
    private inertiaThetaVel = 0;
    private inertiaPhiVel = 0;
    private inertiaRAF?: number;
    private rotateRAF?: number;
    private isRotating = false;
    private shouldAutoFit: boolean = true;

    // ui
    private controlsPanel?: HTMLElement;
    private controlsToggleBtn?: HTMLButtonElement;
    private zoomLabel?: HTMLElement;
    private fitRadiusBase?: number;
    private axisNames?: { x: string; y: string; z: string };
    private lastHoverCell?: Cell;
    // touch/gesture state
    private activePointers = new Map<number, { x: number; y: number }>();
    private lastMidpoint?: { x: number; y: number };
    private lastPinchDist?: number;
    private longPressTimer?: any;
    private lastTapTime?: number;
    private measureMeta?: { name: string; format?: string };
    private persistTimer?: any;

    // selection integration can be added later if needed

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.formattingSettingsService = new FormattingSettingsService();
        this.container = options.element;

        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        (canvas.style as any).touchAction = 'none';
        this.container.appendChild(canvas);
        canvas.addEventListener("pointermove", this.onPointerMove);
        canvas.addEventListener("pointerdown", this.onPointerDown);
        (window as any).addEventListener("pointerup", this.onPointerUp);
        canvas.addEventListener("wheel", this.onWheel as any, { passive: true } as any);
        canvas.addEventListener("click", this.onClick);
        canvas.addEventListener("contextmenu", this.onContextMenu);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        this.renderer.setClearColor(0x000000, 0); // transparent background
        (this.renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace || (this.renderer as any).outputColorSpace;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
        this.updateCamera();

        // ambient light to avoid harsh shading if we switch materials
        const ambient = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambient);

        // selection manager
        this.selectionManager = (this.host as any).createSelectionManager ? (this.host as any).createSelectionManager() : ({} as any);
        this.tooltipService = (this.host as any).tooltipService || (this.host as any).tooltipServiceWrapper || undefined;

        // build overlay controls (single bottom panel)
        this.buildControls();
        this.buildTooltip();
        this.buildAxisInfo();
        this.buildGizmo();
        this.buildSvgOverlay();
    }

    public update(options: VisualUpdateOptions) {
        const dv = options.dataViews && options.dataViews[0];
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dv);
        (this as any)._lastDataView = dv;
        // try reading persisted camera from metadata objects (for bookmarks)
        try {
            const objs: any = dv?.metadata?.objects as any;
            const view: any = objs?.view || {};
            const n = (v: any, fb: number) => (typeof v === 'number' && isFinite(v)) ? v : fb;
            this.theta = n(view.cameraTheta, this.theta);
            this.phi = n(view.cameraPhi, this.phi);
            this.radius = n(view.cameraRadius, this.radius);
            this.target.set(n(view.targetX, this.target.x), n(view.targetY, this.target.y), n(view.targetZ, this.target.z));
            const rz = n(view.rollZ, this.scene?.rotation?.z || 0);
            if (this.scene) this.scene.rotation.z = rz;
        } catch {}

        // cache axis names and measure metadata for tooltips/labels
        try {
            const lvls = dv?.matrix?.rows?.levels as any[] | undefined;
            const namesByAxis = [[], [], []] as string[][];
            (lvls || []).forEach((lvl: any) => {
                const src = lvl?.sources?.[0];
                const roles = src?.roles || {};
                const name = src?.displayName;
                if (roles.dim1) namesByAxis[0].push(name);
                else if (roles.dim2) namesByAxis[1].push(name);
                else if (roles.dim3) namesByAxis[2].push(name);
            });
            const joinN = (arr: string[], fallback: string) => arr.filter(Boolean).join(" / ") || fallback;
            this.axisNames = {
                x: joinN(namesByAxis[0], "Dim1"),
                y: joinN(namesByAxis[1], "Dim2"),
                z: joinN(namesByAxis[2], "Dim3")
            };
            const meas = dv?.matrix?.valueSources?.[0];
            this.measureMeta = { name: meas?.displayName || "Value", format: (meas as any)?.format };
        } catch { /* ignore */ }

        const width = Math.max(1, options.viewport.width);
        const height = Math.max(1, options.viewport.height);
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.updateGizmoSize();

        // Show/hide control panel based on setting
        try {
            const showControls = (this.formattingSettings?.cubeCard?.showControls?.value) !== false;
            if (this.controlsPanel) this.controlsPanel.style.display = showControls ? 'grid' : 'none';
            if (this.controlsToggleBtn) this.controlsToggleBtn.title = showControls ? 'Hide controls' : 'Show controls';
        } catch {}

        if (!dv || !dv.matrix) {
            this.clearScene();
            this.renderWithOverlays();
            return;
        }

        const parsed = this.parseMatrix(dv);
        (this as any)._lastData = parsed;
        this.updateAxisInfo(dv);
        this.buildInstanced(parsed);
        // auto-fit only initially or after Reset
        if (this.shouldAutoFit) {
            this.fitToCube(parsed);
        } else {
            this.updateZoomLabel();
        }
        this.renderWithOverlays();
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }

    private clearScene() {
        if (this.instanced) {
            this.scene.remove(this.instanced);
            this.instanced.geometry.dispose();
            (this.instanced.material as THREE.Material).dispose();
            this.instanced = undefined;
        }
        if (this.edgeInstanced) {
            this.scene.remove(this.edgeInstanced);
            this.edgeInstanced.geometry.dispose();
            (this.edgeInstanced.material as THREE.Material).dispose();
            this.edgeInstanced = undefined;
        }
        if (this.edgeLines) {
            this.scene.remove(this.edgeLines);
            this.edgeLines.geometry.dispose();
            (this.edgeLines.material as THREE.Material).dispose();
            this.edgeLines = undefined;
        }
        // value/face labels removed
        if (this.axisLabelsGroup) {
            this.scene.remove(this.axisLabelsGroup);
            this.disposeGroup(this.axisLabelsGroup);
            this.axisLabelsGroup = undefined;
        }
        if (this.gridGroup) {
            this.scene.remove(this.gridGroup);
            this.disposeGroup(this.gridGroup);
            this.gridGroup = undefined;
        }
        if (this.ticksGroup) {
            this.scene.remove(this.ticksGroup);
            this.disposeGroup(this.ticksGroup);
            this.ticksGroup = undefined;
        }
    }

    private disposeGroup(g: THREE.Group) {
        g.traverse((obj: any) => {
            if (obj.isSprite && obj.material) {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
            }
            if ((obj.type === 'Line' || obj.type === 'LineSegments') && obj.geometry) {
                obj.geometry.dispose();
                if (obj.material) (obj.material as THREE.Material).dispose();
            }
        });
    }

    private parseMatrix(dv: DataView) {
        const m = dv.matrix!;
        const root = m.rows!.root!;
        const levelsMeta = m.rows.levels || [];
        // Map each matrix level index to axis 0/1/2 based on role membership
        const axisOfLevel: number[] = levelsMeta.map((lvl: any) => {
            const roles = (lvl?.sources?.[0] as any)?.roles || {};
            if (roles.dim1) return 0; if (roles.dim2) return 1; if (roles.dim3) return 2; return -1;
        });
        // Track current level counts per axis to infer host "Drill on" changes between updates
        const levelCountsNow = [0,0,0];
        axisOfLevel.forEach(ax => { if (ax >= 0) levelCountsNow[ax]++; });
        const prevCounts = (this as any)._lastLevelCounts as number[] | undefined;
        let inferredDrillAxis: number | undefined = undefined;
        if (prevCounts && prevCounts.length === 3) {
            const deltas = levelCountsNow.map((c,i)=>c - prevCounts[i]);
            const maxDelta = Math.max(...deltas);
            if (maxDelta > 0 && deltas.filter(d=>d===maxDelta).length === 1) {
                inferredDrillAxis = deltas.indexOf(maxDelta);
            }
        }
        if (inferredDrillAxis === undefined) {
            // Fallback: assume the axis with the most levels is the drill target
            const maxLevels = Math.max(...levelCountsNow);
            inferredDrillAxis = Math.max(0, levelCountsNow.indexOf(maxLevels));
        }
        (this as any)._lastLevelCounts = levelCountsNow.slice();

        const key0 = new Set<string>();
        const key1 = new Set<string>();
        const key2 = new Set<string>();

        const raw: { p0: string[]; p1: string[]; p2: string[]; n0: MatrixNode[]; n1: MatrixNode[]; n2: MatrixNode[]; v: number; sel?: ISelectionId }[] = [];

        const ensure = (map: Map<string, number>, k: string, add: number) => {
            map.set(k, (map.get(k) || 0) + add);
        };

        const traverse = (node: MatrixNode, depth: number, pathValuesByAxis: string[][], pathNodesByAxis: MatrixNode[][]) => {
            // Include current node in the path (except root)
            let curPathVals = pathValuesByAxis;
            let curPathNodes = pathNodesByAxis;
            if (depth > 0) {
                const levelIdx = depth - 1;
                const axCur = axisOfLevel[levelIdx] ?? -1;
                if (axCur >= 0) {
                    curPathVals = [
                        (pathValuesByAxis[0] || []).slice(),
                        (pathValuesByAxis[1] || []).slice(),
                        (pathValuesByAxis[2] || []).slice()
                    ];
                    curPathNodes = [
                        (pathNodesByAxis[0] || []).slice(),
                        (pathNodesByAxis[1] || []).slice(),
                        (pathNodesByAxis[2] || []).slice()
                    ];
                    const valStr = String(node.value);
                    if (axCur === 0) key0.add(valStr);
                    if (axCur === 1) key1.add(valStr);
                    if (axCur === 2) key2.add(valStr);
                    curPathVals[axCur].push(valStr);
                    curPathNodes[axCur].push(node);
                }
            }

            // If this node has values, record a data point at the current depth (with current node included)
            if (node && node.values) {
                const valueGroup = node.values!;
                const keys = valueGroup ? Object.keys(valueGroup) : [];
                const measure = keys.length > 0 ? (valueGroup as any)[keys[0]] : undefined;
                const val = measure && measure.value != null ? Number(measure.value) : 0;

                // selection id (optional)
                let sel: ISelectionId | undefined;
                try {
                    const builder = (this.host as any).createSelectionIdBuilder ? (this.host as any).createSelectionIdBuilder() : undefined;
                    if (builder && builder.withMatrixNode) {
                        sel = builder.withMatrixNode(node, levelsMeta).createSelectionId();
                    }
                } catch { /* optional */ }

                raw.push({
                    p0: (curPathVals[0] || []).slice(),
                    p1: (curPathVals[1] || []).slice(),
                    p2: (curPathVals[2] || []).slice(),
                    n0: (curPathNodes[0] || []).slice(),
                    n1: (curPathNodes[1] || []).slice(),
                    n2: (curPathNodes[2] || []).slice(),
                    v: val,
                    sel
                });
            }

            const hasChildren = !!(node.children && node.children.length);
            if (!hasChildren) return;

            for (const child of node.children!) {
                traverse(child, depth + 1, curPathVals, curPathNodes);
            }
        };

        traverse(root, 0, [[], [], []], [[], [], []]);

        // Decide active (drilled) depth per axis using stable heuristic:
        // - Compute candidate depths from data (mode of observed depths)
        // - If a previous depth state exists and only one axis changed, update only that axis
        //   to respect the host's "Drill on" target, keeping other axes at prior depth.
        const depthCount0 = new Map<number, number>();
        const depthCount1 = new Map<number, number>();
        const depthCount2 = new Map<number, number>();
        const inc = (m: Map<number, number>, k: number) => m.set(k, (m.get(k) || 0) + 1);
        for (const r of raw) { inc(depthCount0, r.p0.length); inc(depthCount1, r.p1.length); inc(depthCount2, r.p2.length); }
        const mode = (m: Map<number, number>, fallback: number) => {
            let best = fallback, bestC = -1; for (const [k, c] of m) { if (c > bestC || (c === bestC && k > best)) { best = k; bestC = c; } } return best;
        };
        const cand0 = mode(depthCount0, 0), cand1 = mode(depthCount1, 0), cand2 = mode(depthCount2, 0);
        const max0 = Array.from(depthCount0.keys()).reduce((a,b)=>Math.max(a,b),0);
        const max1 = Array.from(depthCount1.keys()).reduce((a,b)=>Math.max(a,b),0);
        const max2 = Array.from(depthCount2.keys()).reduce((a,b)=>Math.max(a,b),0);
        let d0 = cand0, d1 = cand1, d2 = cand2;

        // Optional override from format pane (debug)
        const forceRaw: any = undefined; // debug force removed
        const force = typeof forceRaw === 'string' ? forceRaw : (forceRaw && forceRaw.value);
        if (force === 'x' || force === 'y' || force === 'z') {
            // Compute minimum observed depths so we can clamp non-forced axes
            const min0 = Array.from(depthCount0.keys()).reduce((a,b)=>Math.min(a,b), Number.POSITIVE_INFINITY);
            const min1 = Array.from(depthCount1.keys()).reduce((a,b)=>Math.min(a,b), Number.POSITIVE_INFINITY);
            const min2 = Array.from(depthCount2.keys()).reduce((a,b)=>Math.min(a,b), Number.POSITIVE_INFINITY);
            const safeMin0 = isFinite(min0) ? min0 : 0;
            const safeMin1 = isFinite(min1) ? min1 : 0;
            const safeMin2 = isFinite(min2) ? min2 : 0;
            // Force only the chosen axis to its max depth; freeze others at their minimum to avoid accidental drilling
            if (force === 'x') { d0 = max0; d1 = safeMin1; d2 = safeMin2; }
            if (force === 'y') { d0 = safeMin0; d1 = max1; d2 = safeMin2; }
            if (force === 'z') { d0 = safeMin0; d1 = safeMin1; d2 = max2; }
        } else {
            // Inference based on changes
            const prev = (this as any)._lastDepths as { d0:number; d1:number; d2:number } | undefined;
            if (prev) {
                const grow = [max0 - prev.d0, max1 - prev.d1, max2 - prev.d2];
                const maxGrow = Math.max(...grow);
                const growCount = grow.filter(g=>g>0).length;
                if (maxGrow > 0 && growCount === 1) {
                    const ax = grow.indexOf(maxGrow);
                    d0 = ax === 0 ? max0 : prev.d0;
                    d1 = ax === 1 ? max1 : prev.d1;
                    d2 = ax === 2 ? max2 : prev.d2;
                } else if (growCount === 0) {
                    // No growth -> maybe roll up; stick to candidates if they decreased otherwise keep prev
                    const dec = [prev.d0 - cand0, prev.d1 - cand1, prev.d2 - cand2];
                    const decCount = dec.filter(x=>x>0).length;
                    if (decCount === 1) { d0 = cand0; d1 = cand1; d2 = cand2; }
                    else { d0 = prev.d0; d1 = prev.d1; d2 = prev.d2; }
                } else {
                    // Multiple axes changed; keep previous for stability
                    d0 = prev.d0; d1 = prev.d1; d2 = prev.d2;
                }
            } else {
                // First run: choose the axis whose max exceeds mode the most
                const lift = [max0 - cand0, max1 - cand1, max2 - cand2];
                const bestLift = Math.max(...lift);
                if (bestLift > 0) {
                    const ax = lift.indexOf(bestLift);
                    d0 = ax === 0 ? max0 : cand0;
                    d1 = ax === 1 ? max1 : cand1;
                    d2 = ax === 2 ? max2 : cand2;
                } else {
                    d0 = cand0; d1 = cand1; d2 = cand2;
                }
            }
        }

        // Infer drill axis by which axis’s max depth moved forward relative to mode/previous
        const prev = (this as any)._lastDepths as { d0:number; d1:number; d2:number } | undefined;
        if (prev) {
            const grow = [max0 - prev.d0, max1 - prev.d1, max2 - prev.d2];
            const maxGrow = Math.max(...grow);
            const growCount = grow.filter(g=>g>0).length;
            if (maxGrow > 0 && growCount === 1) {
                const ax = grow.indexOf(maxGrow);
                d0 = ax === 0 ? max0 : prev.d0;
                d1 = ax === 1 ? max1 : prev.d1;
                d2 = ax === 2 ? max2 : prev.d2;
            } else if (growCount === 0) {
                // No growth -> maybe roll up; stick to candidates if they decreased otherwise keep prev
                const dec = [prev.d0 - cand0, prev.d1 - cand1, prev.d2 - cand2];
                const decCount = dec.filter(x=>x>0).length;
                if (decCount === 1) { d0 = cand0; d1 = cand1; d2 = cand2; }
                else { d0 = prev.d0; d1 = prev.d1; d2 = prev.d2; }
            } else {
                // Multiple axes changed; keep previous for stability
                d0 = prev.d0; d1 = prev.d1; d2 = prev.d2;
            }
        } else {
            // First run: choose the axis whose max exceeds mode the most
            const lift = [max0 - cand0, max1 - cand1, max2 - cand2];
            const bestLift = Math.max(...lift);
            if (bestLift > 0) {
                const ax = lift.indexOf(bestLift);
                d0 = ax === 0 ? max0 : cand0;
                d1 = ax === 1 ? max1 : cand1;
                d2 = ax === 2 ? max2 : cand2;
            } else {
                d0 = cand0; d1 = cand1; d2 = cand2;
            }
        }

        // Build final cells filtered to the active depths per axis
        const cfg = this.formattingSettings?.cubeCard;
        const adv = (this.formattingSettings as any)?.advancedCard || {};
        const sepRaw: any = (cfg as any)?.keySeparator?.value;
        const sep = (typeof sepRaw === 'string') ? sepRaw : (sepRaw && sepRaw.value) ? sepRaw.value : ' ▸ ';
        const buildCellsAtDepths = (dd0:number, dd1:number, dd2:number) => {
            const out: Cell[] = [];
            for (const r of raw) {
                if (r.p0.length !== dd0 || r.p1.length !== dd1 || r.p2.length !== dd2) continue;
                const v0 = r.p0.length ? r.p0.join(sep) : "All";
                const v1 = r.p1.length ? r.p1.join(sep) : "All";
                const v2 = r.p2.length ? r.p2.join(sep) : "All";
                key0.add(v0); key1.add(v1); key2.add(v2);
                // Build per-axis selection ids at these depths (if nodes exist)
                let s0: ISelectionId | undefined, s1: ISelectionId | undefined, s2: ISelectionId | undefined;
                let n0: MatrixNode | undefined, n1: MatrixNode | undefined, n2: MatrixNode | undefined;
                try {
                    const b = (this.host as any).createSelectionIdBuilder ? (this.host as any).createSelectionIdBuilder() : undefined;
                    if (b && b.withMatrixNode) {
                        if (dd0 > 0 && r.n0 && r.n0.length >= dd0) { n0 = r.n0[dd0-1]; s0 = b.withMatrixNode(n0, levelsMeta).createSelectionId(); }
                        if (dd1 > 0 && r.n1 && r.n1.length >= dd1) { n1 = r.n1[dd1-1]; s1 = b.withMatrixNode(n1, levelsMeta).createSelectionId(); }
                        if (dd2 > 0 && r.n2 && r.n2.length >= dd2) { n2 = r.n2[dd2-1]; s2 = b.withMatrixNode(n2, levelsMeta).createSelectionId(); }
                    }
                } catch { /* optional */ }
                out.push({ i0: 0, i1: 0, i2: 0, v: r.v, key0: v0, key1: v1, key2: v2, sel: r.sel, sel0: s0, sel1: s1, sel2: s2, node0: n0, node1: n1, node2: n2 });
            }
            return out;
        };

        let cells: Cell[] = buildCellsAtDepths(d0, d1, d2);
        if (cells.length === 0) {
            // Fallback 1: use candidate (modal) depths directly
            d0 = cand0; d1 = cand1; d2 = cand2;
            cells = buildCellsAtDepths(d0, d1, d2);
        }
        if (cells.length === 0) {
            // Fallback 2: use max observed depths so we always render something
            const max0 = raw.reduce((a,r)=>Math.max(a, r.p0.length), 0);
            const max1 = raw.reduce((a,r)=>Math.max(a, r.p1.length), 0);
            const max2 = raw.reduce((a,r)=>Math.max(a, r.p2.length), 0);
            d0 = max0; d1 = max1; d2 = max2;
            cells = buildCellsAtDepths(d0, d1, d2);
        }

        // Determine Top N per dimension (defaults to 10, min 1, max 50)
        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
        const top0 = clamp((adv?.topDim1?.value as number) ?? (cfg as any)?.topDim1?.value ?? 10, 1, 50);
        const top1 = clamp((adv?.topDim2?.value as number) ?? (cfg as any)?.topDim2?.value ?? 10, 1, 50);
        const top2 = clamp((adv?.topDim3?.value as number) ?? (cfg as any)?.topDim3?.value ?? 10, 1, 50);
        const srtRaw: any = adv?.sortMode?.value ?? (cfg as any)?.sortMode?.value; const sortMode = (typeof srtRaw === 'string') ? srtRaw : (srtRaw && srtRaw.value) ? srtRaw.value : 'totals';

        const pickTop = (map: Map<string, number>, n: number) =>
            Array.from(map.entries())
                .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
                .slice(0, n)
                .map(e => e[0]);

        // Compute totals per member at active depth for Top N
        const sum0 = new Map<string, number>();
        const sum1 = new Map<string, number>();
        const sum2 = new Map<string, number>();
        for (const c of cells) { ensure(sum0, c.key0, c.v); ensure(sum1, c.key1, c.v); ensure(sum2, c.key2, c.v); }

        const naturalSort = (arr: string[]) => arr.slice().sort((a,b)=>{
            const na = Number(a), nb = Number(b);
            const aNum = !isNaN(na) && /^-?\d+(?:\.\d+)?$/.test(a);
            const bNum = !isNaN(nb) && /^-?\d+(?:\.\d+)?$/.test(b);
            if (aNum && bNum) return na - nb;
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

        let order0: string[], order1: string[], order2: string[];
        if (sortMode === 'keyAsc') {
            order0 = naturalSort(Array.from(sum0.keys())).slice(0, top0);
            order1 = naturalSort(Array.from(sum1.keys())).slice(0, top1);
            order2 = naturalSort(Array.from(sum2.keys())).slice(0, top2);
        } else {
            order0 = pickTop(sum0, top0);
            order1 = pickTop(sum1, top1);
            order2 = pickTop(sum2, top2);
        }
        const topKeys0 = new Set<string>(order0);
        const topKeys1 = new Set<string>(order1);
        const topKeys2 = new Set<string>(order2);

        // Filter cells by top sets and build index maps
        const members0 = order0;
        const members1 = order1;
        const members2 = order2;

        const idx0 = new Map<string, number>(); members0.forEach((k, i) => idx0.set(k, i));
        const idx1 = new Map<string, number>(); members1.forEach((k, i) => idx1.set(k, i));
        const idx2 = new Map<string, number>(); members2.forEach((k, i) => idx2.set(k, i));

        const filtered: Cell[] = [];
        for (const c of cells) {
            if (!topKeys0.has(c.key0) || !topKeys1.has(c.key1) || !topKeys2.has(c.key2)) continue;
            c.i0 = idx0.get(c.key0)!;
            c.i1 = idx1.get(c.key1)!;
            c.i2 = idx2.get(c.key2)!;
            filtered.push(c);
        }

        // basic stats for scaling/coloring
        let minV = Infinity, maxV = -Infinity;
        for (const c of filtered) { minV = Math.min(minV, c.v); maxV = Math.max(maxV, c.v); }
        if (!isFinite(minV)) { minV = 0; maxV = 1; }

        // Totals for tooltip extras
        const sums0: Record<string, number> = {} as any; for (const [k,v] of sum0) sums0[k]=v;
        const sums1: Record<string, number> = {} as any; for (const [k,v] of sum1) sums1[k]=v;
        const sums2: Record<string, number> = {} as any; for (const [k,v] of sum2) sums2[k]=v;
        const grandTotal = filtered.reduce((a,c)=>a + (c.v||0), 0);

        const result = {
            cells: filtered,
            size0: members0.length || 1,
            size1: members1.length || 1,
            size2: members2.length || 1,
            members0,
            members1,
            members2,
            minV, maxV,
            depth0: d0, depth1: d1, depth2: d2,
            sums0, sums1, sums2, grandTotal,
            // debug
            debugCand: [cand0, cand1, cand2],
            debugMax: [raw.reduce((a,r)=>Math.max(a, r.p0.length), 0), raw.reduce((a,r)=>Math.max(a, r.p1.length), 0), raw.reduce((a,r)=>Math.max(a, r.p2.length), 0)],
            debugDrillAxis: (force === 'x' ? 0 : force === 'y' ? 1 : force === 'z' ? 2 : (typeof inferredDrillAxis === 'number' ? inferredDrillAxis : (this as any)._lastDrillAxis)),
            debugForced: force || 'auto'
        } as any;

        // persist computed depths to track subsequent drill changes
        (this as any)._lastDepths = { d0, d1, d2 };

        return result;
    }

    private buildInstanced(data: { cells: Cell[]; size0: number; size1: number; size2: number; members0: string[]; members1: string[]; members2: string[]; minV: number; maxV: number; }) {
        this.clearScene();

        const cfg = this.formattingSettings?.cubeCard;
        const cellSize = Number(cfg?.cellSize?.value ?? 0.9);
        const gap = Number(cfg?.gap?.value ?? 0.2);
        const heightScale = Number(cfg?.heightScale?.value ?? 6);
        // Determine scale mode via dropdown; fallback to legacy toggles
        const smVal: any = (cfg as any)?.scaleMode?.value;
        const scaleMode = (typeof smVal === 'string') ? smVal : (smVal && smVal.value ? String(smVal.value) : undefined);
        const equalCubes = scaleMode ? (scaleMode === 'equal') : !!cfg?.equalCubes?.value;
        const uniform3D = scaleMode ? (scaleMode === 'uniform') : !!cfg?.uniformScale?.value;
        const advCfg: any = (this.formattingSettings as any)?.advancedCard || {};
        const preventOverlap = advCfg?.preventOverlap?.value !== false; // default true

        const colorsCfg: any = (this.formattingSettings as any)?.colorsCard || {};
        const minColorHex = (colorsCfg?.minColor?.value as any)?.value || (cfg as any)?.minColor?.value?.value || "#4ea8de";
        const maxColorHex = (colorsCfg?.maxColor?.value as any)?.value || (cfg as any)?.maxColor?.value?.value || "#9b5de5";
        const midColorHex = (colorsCfg?.midColor?.value as any)?.value || (cfg as any)?.midColor?.value?.value || "#eeeeee";
        const minColor = new THREE.Color(minColorHex);
        const maxColor = new THREE.Color(maxColorHex);
        const midColor = new THREE.Color(midColorHex);
        const colorByZ = (colorsCfg?.colorByZ?.value !== undefined)
            ? (colorsCfg.colorByZ.value !== false)
            : (((cfg as any)?.colorByZ?.value !== false)); // legacy toggle
        const cmodeRaw: any = (colorsCfg as any)?.colorMode?.value ?? (cfg as any)?.colorMode?.value; // sequential | diverging | categorical
        const colorMode = (typeof cmodeRaw === 'string') ? cmodeRaw : (cmodeRaw && cmodeRaw.value) ? cmodeRaw.value : 'sequential';

        // use a unit cube; instance matrix scales to desired size
        const geo = new THREE.BoxGeometry(1, 1, 1);
        // MeshBasicMaterial ignores lighting; ensures colors appear as set
        const opacityVal = Number(cfg?.opacity?.value ?? 1);
        const isOpaque = opacityVal >= 1;
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: !isOpaque,
            opacity: opacityVal,
            // Write depth even when semi-transparent to occlude inner edges
            depthWrite: true,
            depthTest: true
        });

        const count = data.cells.length;
        const mesh = new THREE.InstancedMesh(geo, mat, count);
        const m4 = new THREE.Matrix4();
        this.instanceToCellIndex = new Array(count);
        this.baseInstanceColors = new Array(count);
        this.selectedInstances.clear();
        this.instanceMatrices = new Array(count);

        const step = cellSize + gap;
        const offset = new THREE.Vector3(
            -(data.size0 - 1) * step * 0.5,
            0,
            -(data.size2 - 1) * step * 0.5
        );

        const range = Math.max(1e-6, data.maxV - data.minV);

        // palette for categorical (Z members)
        const catPalette = [
            '#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ab','#2d6cdf','#7f3c8d'
        ].map(h => new THREE.Color(h));

        data.cells.forEach((c, i) => {
            const normVal = (c.v - data.minV) / range; // 0..1 by value
            const normZ = (data.size2 > 1) ? (c.i2 / (data.size2 - 1)) : 0.5; // 0..1 by Z
            let col: THREE.Color;
            if (colorMode === 'categorical') {
                const pal = catPalette;
                col = pal[c.i2 % pal.length].clone();
            } else if (colorMode === 'diverging') {
                // center at 0 if range crosses 0, otherwise midpoint
                const center = (data.minV < 0 && data.maxV > 0) ? 0 : (data.minV + data.maxV) * 0.5;
                const t = (c.v - center) / (Math.max(Math.abs(data.maxV - center), Math.abs(center - data.minV)) || 1);
                if (t < 0) {
                    const tt = Math.max(0, Math.min(1, -t));
                    col = minColor.clone().lerp(midColor, 1 - tt);
                } else {
                    const tt = Math.max(0, Math.min(1, t));
                    col = midColor.clone().lerp(maxColor, tt);
                }
            } else {
                const t = Math.max(0, Math.min(1, colorByZ ? normZ : normVal));
                col = minColor.clone().lerp(maxColor, t);
            }

            const x = c.i0 * step + offset.x;
            const z = c.i2 * step + offset.z;
            const yBase = c.i1 * step;

            let sx = cellSize, sy = cellSize, sz = cellSize;
            let posY = yBase + cellSize * 0.5; // center of the cell by default

            if (equalCubes) {
                // sx/sy/sz already set to cellSize (full cell)
            } else if (uniform3D) {
                const minRatio = Math.max(0, Math.min(1, Number(cfg?.minCubeRatio?.value ?? 0.2)));
                const base = Math.max(0, Math.min(1, (normVal || 0)));
                const edgeNorm = (advCfg?.volumeLinear?.value !== false) ? Math.cbrt(base) : base;
                const ratio = minRatio + (1 - minRatio) * edgeNorm;
                sx = sy = sz = cellSize * ratio;
            } else {
                // height-only mode (legacy). X/Z use cell footprint, Y uses value scale
                let h = Math.max(0.02, (normVal || 0) * heightScale);
                if (preventOverlap) {
                    const maxH = Math.max(0.05, step - 0.05);
                    if (h > maxH) h = maxH;
                }
                sx = cellSize; sy = h; sz = cellSize;
                posY = yBase + h * 0.5; // sit on the layer base
            }

            m4.identity().makeScale(sx, sy, sz).setPosition(x, posY, z);
            mesh.setMatrixAt(i, m4);
            this.instanceMatrices[i] = m4.clone();

            this.baseInstanceColors[i] = col.clone();
            (mesh as any).setColorAt(i, col);
            this.instanceToCellIndex[i] = i;
        });

        mesh.instanceMatrix.needsUpdate = true;
        if ((mesh as any).instanceColor) (mesh as any).instanceColor.needsUpdate = true;

        this.scene.add(mesh);
        this.instanced = mesh;
        this.applySelectionHighlight();

        // Optional edges overlay using EdgesGeometry merged into a single LineSegments
        const bordersCfg: any = (this.formattingSettings as any)?.bordersCard || {};
        if ((bordersCfg?.showCubeEdges?.value ?? cfg?.showCubeEdges?.value) !== false) {
            const edgeColorHex = ((bordersCfg?.edgeColor?.value as any)?.value) || (cfg?.edgeColor?.value as any)?.value || "#ffffff";
            const edgeOpacity = Math.max(0, Math.min(1, Number(((bordersCfg as any)?.edgeOpacity?.value ?? (cfg as any)?.edgeOpacity?.value ?? 0.6))));
            const baseEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
            const basePos = baseEdges.getAttribute('position') as THREE.BufferAttribute;
            const positions: number[] = [];
            const v = new THREE.Vector3();
            const inflate = 1.003; // pull edges slightly outside faces to avoid z-fighting
            for (let i = 0; i < count; i++) {
                mesh.getMatrixAt(i, m4);
                for (let j = 0; j < basePos.count; j++) {
                    v.fromBufferAttribute(basePos, j).multiplyScalar(inflate).applyMatrix4(m4);
                    positions.push(v.x, v.y, v.z);
                }
            }
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            const width = Number(((bordersCfg as any)?.edgeWidth?.value ?? (cfg as any)?.edgeWidth?.value ?? 1));
            const onTopCfg = (((bordersCfg as any)?.edgesOnTop?.value) ?? (cfg as any)?.edgesOnTop?.value) !== false;
            const onTop = onTopCfg && !isOpaque; // force occlusion when cubes are opaque
            const matL = new THREE.LineBasicMaterial({
                color: new THREE.Color(edgeColorHex),
                linewidth: width,
                transparent: true,
                opacity: edgeOpacity,
                depthTest: !onTop,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1
            } as any);
            const lines = new THREE.LineSegments(g, matL);
            this.scene.add(lines);
            this.edgeLines = lines;
            baseEdges.dispose();
        }

        // Value/face labels removed for performance

        // Axis edge labels (X, Y, Z)
        const axesCfg = (this.formattingSettings as any)?.axesCard;
        const showEdge = axesCfg?.showAxisEdgeLabels?.value !== false;
        if (showEdge) {
            this.buildAxisEdgeLabels(step, cellSize, data);
        } else {
            if (this.axisLabelsGroup) { this.scene.remove(this.axisLabelsGroup); this.disposeGroup(this.axisLabelsGroup); this.axisLabelsGroup = undefined; }
            if (this.svgAxisGroup) { while (this.svgAxisGroup.firstChild) this.svgAxisGroup.removeChild(this.svgAxisGroup.firstChild); }
            this.svgAxisLabels = [] as any;
        }
        const showGrid = axesCfg?.showGridFrame?.value !== false;
        const showTicks = axesCfg?.showAxisTicks?.value !== false;
        if (showGrid || showTicks) {
            this.buildGridAndTicks(step, cellSize, data as any, !!showGrid, !!showTicks);
        } else {
            if (this.gridGroup) { this.scene.remove(this.gridGroup); this.disposeGroup(this.gridGroup); this.gridGroup = undefined; }
            if (this.ticksGroup) { this.scene.remove(this.ticksGroup); this.disposeGroup(this.ticksGroup); this.ticksGroup = undefined; }
            if (this.svgTicksGroup) { while (this.svgTicksGroup.firstChild) this.svgTicksGroup.removeChild(this.svgTicksGroup.firstChild); }
            this.svgTickLabels = [] as any;
        }

        // Build legend overlay
        this.buildLegend(data, colorMode, minColorHex, midColorHex, maxColorHex);
    }

    private buildLegend(data: any, colorMode: string, minHex: string, midHex: string, maxHex: string) {
        if (this.legendEl) { this.legendEl.remove(); this.legendEl = undefined; }
        const show = ((this.formattingSettings as any)?.colorsCard?.showLegend?.value) !== false;
        if (!show) return;
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.top = '10px';
        el.style.right = '10px';
        el.style.padding = '6px 8px';
        el.style.background = 'rgba(255,255,255,0.85)';
        el.style.borderRadius = '6px';
        el.style.fontSize = '12px';
        el.style.color = '#222';
        el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';

        const title = document.createElement('div');
        title.textContent = this.measureMeta?.name || 'Value';
        title.style.fontWeight = '600';
        title.style.marginBottom = '4px';
        el.appendChild(title);

        if (colorMode === 'categorical') {
            const list = document.createElement('div');
            list.style.display = 'grid';
            list.style.gridTemplateColumns = 'auto auto';
            list.style.gap = '4px 10px';
            const members = (data.members2 || []) as string[];
            const maxItems = 12;
            const catPalette = ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7','#9c755f','#bab0ab','#2d6cdf','#7f3c8d'];
            const n = Math.min(members.length, maxItems);
            for (let i = 0; i < n; i++) {
                const row = document.createElement('div');
                row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.gap = '6px';
                const sw = document.createElement('span'); sw.style.display = 'inline-block'; sw.style.width = '12px'; sw.style.height='12px'; sw.style.borderRadius='2px'; sw.style.background = catPalette[i % catPalette.length];
                const tx = document.createElement('span'); tx.textContent = String(members[i]);
                row.appendChild(sw); row.appendChild(tx); list.appendChild(row);
            }
            if (members.length > maxItems) {
                const more = document.createElement('div'); more.textContent = `+${members.length - maxItems} more`; more.style.opacity='0.7'; list.appendChild(more);
            }
            el.appendChild(list);
        } else {
            // gradient ramp
            const w = 160, h = 12; const can = document.createElement('canvas'); can.width = w; can.height = h; const ctx = can.getContext('2d')!;
            const grd = ctx.createLinearGradient(0,0,w,0);
            if (colorMode === 'diverging') {
                grd.addColorStop(0, minHex); grd.addColorStop(0.5, midHex); grd.addColorStop(1, maxHex);
            } else {
                grd.addColorStop(0, minHex); grd.addColorStop(1, maxHex);
            }
            ctx.fillStyle = grd; ctx.fillRect(0,0,w,h);
            ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.strokeRect(0.5,0.5,w-1,h-1);
            el.appendChild(can);
            // labels row
            const labels = document.createElement('div'); labels.style.display='flex'; labels.style.justifyContent='space-between'; labels.style.marginTop='2px';
            const fmt = (n: number) => { try { return this.measureMeta?.format ? valueFormatter.create({ format: this.measureMeta!.format!, cultureSelector: (this.host as any)?.locale }).format(n as any) : n.toLocaleString(); } catch { return n.toLocaleString(); } };
            const minL = document.createElement('span'); minL.textContent = fmt(data.minV);
            labels.appendChild(minL);
            if (colorMode === 'diverging') { const c = (data.minV < 0 && data.maxV > 0) ? 0 : (data.minV + data.maxV) * 0.5; const m = document.createElement('span'); m.textContent = fmt(c); labels.appendChild(m); }
            const maxL = document.createElement('span'); maxL.textContent = fmt(data.maxV); labels.appendChild(maxL);
            el.appendChild(labels);
        }

        this.container.appendChild(el);
        this.legendEl = el;
    }

    private fitToCube(data: { size0: number; size1: number; size2: number; }) {
        const cfg = this.formattingSettings?.cubeCard;
        const cellSize = Number(cfg?.cellSize?.value ?? 0.9);
        const gap = Number(cfg?.gap?.value ?? 0.2);
        const step = cellSize + gap;
        const exX = Math.max(0, (data.size0 - 1) * step) + cellSize;
        const exY = Math.max(0, (data.size1 - 1) * step) + cellSize;
        const exZ = Math.max(0, (data.size2 - 1) * step) + cellSize;
        const radius = 0.6 * Math.sqrt(exX * exX + exY * exY + exZ * exZ);
        // Zoomed out so cube occupies ~50% of canvas
        this.radius = Math.max(8, radius * 3.0);
        this.target.set(0, (data.size1 - 1) * step * 0.5, 0);
        this.updateCamera();
        this.fitRadiusBase = this.radius;
        // apply default zoom % from settings
        const pct = Math.max(1, Number(this.formattingSettings?.cubeCard?.defaultZoom?.value ?? 100));
        this.radius = this.fitRadiusBase / (pct / 100);
        this.updateCamera();
        this.updateZoomLabel();
    }

    private resetView() {
        // Next update should refit to cube and apply default zoom
        this.shouldAutoFit = true;
        const data: any = (this as any)._lastData;
        if (data) {
            this.fitToCube({ size0: data.size0, size1: data.size1, size2: data.size2 });
        } else {
            this.updateCamera();
        }
    }

    private updateCamera() {
        const r = this.radius;
        const x = r * Math.sin(this.phi) * Math.cos(this.theta) + this.target.x;
        const y = r * Math.cos(this.phi) + this.target.y;
        const z = r * Math.sin(this.phi) * Math.sin(this.theta) + this.target.z;
        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.target);
        this.schedulePersistView();
    }

    private buildControls() {
        const panel = document.createElement("div");
        panel.style.position = "absolute";
        panel.style.bottom = "10px";
        panel.style.right = "10px";
        panel.style.display = "grid";
        panel.style.gridTemplateColumns = "112px auto"; // left 3x3 pad, right area
        panel.style.gridTemplateRows = "auto auto auto";
        panel.style.columnGap = "10px";
        panel.style.rowGap = "6px";
        panel.style.background = "rgba(255,255,255,0.7)";
        panel.style.borderRadius = "8px";
        panel.style.padding = "6px";
        panel.style.fontSize = "18px";
        panel.style.userSelect = "none";

        const mkBtn = (label: string, handler: () => void, title?: string) => {
            const b = document.createElement("button");
            b.textContent = label;
            b.style.border = "1px solid #ccc";
            b.style.borderRadius = "6px";
            b.style.width = "32px"; b.style.height = "32px";
            b.style.fontSize = "18px";
            b.style.background = "#fff";
            const tt = title || label;
            b.title = tt; (b as any)["aria-label"] = tt;
            b.addEventListener("click", () => { handler(); this.updateZoomLabel(); this.renderWithOverlays(); });
            return b;
        };

        // 3x3 navigation pad on the left (corners rotate/roll, edges pan, center recenters)
        const pad = document.createElement("div");
        pad.style.display = "grid";
        pad.style.gridTemplateColumns = "32px 32px 32px";
        pad.style.gridTemplateRows = "32px 32px 32px";
        pad.style.gap = "6px";
        (pad.style as any).gridColumn = "1 / 2";
        (pad.style as any).gridRow = "1 / span 3";

        const panStep = () => Math.max(0.5, this.radius * 0.05);
        const pan = (dx: number, dy: number) => {
            this.camera.updateMatrix();
            const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0).normalize();
            const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1).normalize();
            const s = panStep();
            this.target.addScaledVector(right, dx * s);
            this.target.addScaledVector(up, dy * s);
            this.shouldAutoFit = false;
            this.updateCamera();
        };
        const mkCell = (label: string, handler?: () => void) => mkBtn(label, handler || (() => {}));

        // row1
        pad.appendChild(mkCell("↶", () => { this.theta -= 0.2; this.shouldAutoFit = false; this.updateCamera(); }));
        pad.appendChild(mkCell("⬆️", () => pan(0, 1)));
        pad.appendChild(mkCell("↷", () => { this.theta += 0.2; this.shouldAutoFit = false; this.updateCamera(); }));
        // row2
        pad.appendChild(mkCell("⬅️", () => pan(-1, 0)));
        pad.appendChild(mkCell("●", () => { this.target.set(0, 0, 0); this.shouldAutoFit = false; this.updateCamera(); }));
        pad.appendChild(mkCell("➡️", () => pan(1, 0)));
        // row3
        pad.appendChild(mkCell("⟲", () => { this.scene.rotation.z -= 0.1; this.schedulePersistView(); }));
        pad.appendChild(mkCell("⬇️", () => pan(0, -1)));
        pad.appendChild(mkCell("⟳", () => { this.scene.rotation.z += 0.1; this.schedulePersistView(); }));

        // Helper to make a compact row with 4 buttons
        const makeRow = (items: HTMLElement[], gridRow: number) => {
            const row = document.createElement("div");
            row.style.display = "grid";
            row.style.gridTemplateColumns = "repeat(4, 32px)";
            row.style.gap = "6px";
            (row.style as any).gridColumn = "2 / 3";
            (row.style as any).gridRow = `${gridRow} / ${gridRow+1}`;
            items.forEach(it => row.appendChild(it));
            panel.appendChild(row);
        };

        // Row A: tilt up/down, zoom -, zoom +
        makeRow([
            mkBtn("⤴️", () => { this.phi = Math.max(0.2, this.phi - 0.1); this.shouldAutoFit = false; this.updateCamera(); }),
            mkBtn("⤵️", () => { this.phi = Math.min(Math.PI - 0.2, this.phi + 0.1); this.shouldAutoFit = false; this.updateCamera(); }),
            mkBtn("➖", () => { this.radius = Math.min(200, this.radius + 2); this.shouldAutoFit = false; this.updateCamera(); }),
            mkBtn("➕", () => { this.radius = Math.max(5, this.radius - 2); this.shouldAutoFit = false; this.updateCamera(); })
        ], 1);

        // Row B: presets F, T, L, R
        makeRow([
            mkBtn("F", () => { this.theta = 0; this.phi = Math.PI/2; this.shouldAutoFit = false; this.updateCamera(); }),
            mkBtn("T", () => { this.theta = 0; this.phi = 0.26; this.shouldAutoFit = false; this.updateCamera(); }),
            mkBtn("L", () => { this.theta = Math.PI/2; this.phi = Math.PI/2; this.shouldAutoFit = false; this.updateCamera(); }),
            mkBtn("R", () => { this.theta = -Math.PI/2; this.phi = Math.PI/2; this.shouldAutoFit = false; this.updateCamera(); })
        ], 2);

        // Row C: I1, I2, Play/Pause, Drill Up
        const playBtn = mkBtn(this.isRotating ? "⏸️" : "▶️", () => {
            this.isRotating = !this.isRotating;
            const tick = () => {
                if (!this.isRotating) { this.rotateRAF = undefined; return; }
                this.theta += 0.01; this.updateCamera(); this.renderWithOverlays();
                this.rotateRAF = requestAnimationFrame(tick);
            };
            if (this.isRotating && !this.rotateRAF) this.rotateRAF = requestAnimationFrame(tick);
        });
        const drillBtn = mkBtn("↑", () => {
            try {
                const rect = (this.renderer.domElement as HTMLCanvasElement).getBoundingClientRect();
                (this.selectionManager as any).showContextMenu(undefined, { position: { x: rect.width/2, y: rect.height/2 } });
            } catch {}
        });
        makeRow([
            mkBtn("I1", () => { this.theta = 0.9; this.phi = 1.0; this.shouldAutoFit = false; this.updateCamera(); }),
            mkBtn("I2", () => { this.theta = 2.2; this.phi = 1.0; this.shouldAutoFit = false; this.updateCamera(); }),
            playBtn
        ], 3);

        // Row D: optional in-visual axis drill controls
        const showDrill = false;
        if (showDrill) {
            const dx = mkBtn("X↓", async () => { await this.drillAxisExplicit(0); });
            const dy = mkBtn("Y↓", async () => { await this.drillAxisExplicit(1); });
            const dz = mkBtn("Z↓", async () => { await this.drillAxisExplicit(2); });
            makeRow([dx, dy, dz, mkBtn('↺', () => { try { (this.selectionManager as any).showContextMenu(undefined, { position: { x: 24, y: this.container.clientHeight - 24 } }); } catch {} })], 4);
        }

        // Left pad added last so it sits left of rows
        panel.appendChild(pad);

        // Zoom percentage label at top-left of visual (outside control panel)
        const zoom = document.createElement("div");
        zoom.style.position = 'absolute';
        zoom.style.left = '90px'; // to the right of orientation gizmo
        zoom.style.top = '10px';
        zoom.style.padding = '3px 6px';
        zoom.style.background = 'rgba(0,0,0,0.5)';
        zoom.style.color = '#fff';
        zoom.style.borderRadius = '4px';
        zoom.style.fontSize = '12px';
        zoom.style.fontWeight = '600';
        zoom.textContent = 'Zoom: 100%';
        this.container.appendChild(zoom);
        this.zoomLabel = zoom;

        this.container.style.position = "relative";
        this.container.appendChild(panel);
        this.controlsPanel = panel;

        // Small on-visual toggle to show/hide the cockpit
        const toggle = document.createElement('button');
        toggle.textContent = '≡';
        toggle.title = 'Show/Hide controls';
        toggle.style.position = 'absolute';
        toggle.style.top = '10px';
        toggle.style.right = '10px';
        toggle.style.width = '28px';
        toggle.style.height = '28px';
        toggle.style.borderRadius = '6px';
        toggle.style.border = '1px solid #ccc';
        toggle.style.background = '#fff';
        toggle.style.fontSize = '16px';
        toggle.style.cursor = 'pointer';
        toggle.style.opacity = '0.9';
        toggle.onclick = () => {
            const currentlyVisible = this.controlsPanel?.style.display !== 'none';
            const next = !currentlyVisible;
            if (this.controlsPanel) this.controlsPanel.style.display = next ? 'grid' : 'none';
            // Persist setting so bookmarks/report keep the preference
            try {
                (this.host as any).persistProperties({ merge: [{ objectName: 'cube', selector: null, properties: { showControls: next } }] });
            } catch {}
        };
        this.container.appendChild(toggle);
        this.controlsToggleBtn = toggle;

        // Add helpful titles to buttons for accessibility/clarity
        const titleMap: Record<string, string> = {
            '↶': 'Yaw Left', '↷': 'Yaw Right', '⤺': 'Roll Left', '⤻': 'Roll Right',
            '↑': 'Pan Up', '↓': 'Pan Down', '←': 'Pan Left', '→': 'Pan Right', '•': 'Center',
            '⤴': 'Pitch Up', '⤵': 'Pitch Down', '−': 'Zoom Out', '+': 'Zoom In',
            'F': 'Front', 'T': 'Top', 'L': 'Left', 'R': 'Right',
            'I1': 'Preset 1', 'I2': 'Preset 2', '▶': 'Start Auto Rotate', '⏸': 'Pause Auto Rotate'
        } as any;
        Array.from(panel.querySelectorAll('button')).forEach((b: any) => {
            const t = titleMap[b.textContent] || b.title;
            if (t) { b.title = t; b.setAttribute('aria-label', t); }
        });
    }

    // in-visual drill helpers removed; rely on native PBI drill
    private async drillAxisExplicit(ax: 0|1|2) { /* no-op (removed) */ }

    private updateZoomLabel() {
        if (!this.zoomLabel) return;
        const base = this.fitRadiusBase || this.radius || 1;
        const pct = Math.round((base / this.radius) * 100);
        this.zoomLabel.textContent = `Zoom: ${pct}%`;
    }

    private buildTooltip() {
        const tip = document.createElement("div");
        tip.style.position = "absolute";
        tip.style.pointerEvents = "none";
        tip.style.padding = "6px 8px";
        tip.style.background = "rgba(0,0,0,0.75)";
        tip.style.color = "#fff";
        tip.style.borderRadius = "4px";
        tip.style.fontSize = "12px";
        tip.style.whiteSpace = "pre";
        tip.style.display = "none";
        this.container.appendChild(tip);
        this.tooltipEl = tip;
    }

    private buildAxisInfo() {
        const el = document.createElement("div");
        el.style.position = "absolute";
        el.style.left = "10px";
        el.style.bottom = "10px";
        el.style.padding = "3px 6px";
        el.style.background = "rgba(0,0,0,0.65)";
        el.style.borderRadius = "4px";
        el.style.fontSize = "12px";
        el.style.color = "#fff";
        el.style.whiteSpace = "pre";
        el.style.userSelect = "none";
        this.container.appendChild(el);
        this.axisInfoEl = el;
    }

    private updateAxisInfo(dv: DataView) {
        const show = this.formattingSettings?.axesCard?.showAxisInfo?.value !== false;
        if (!this.axisInfoEl) return;
        if (!show) { this.axisInfoEl.style.display = "none"; return; }
        // Build concatenated axis names from roles
        const lvls = dv.matrix?.rows?.levels as any[] | undefined;
        const namesByAxis = [[], [], []] as string[][];
        (lvls || []).forEach((lvl: any) => {
            const src = lvl?.sources?.[0];
            const roles = src?.roles || {};
            const name = src?.displayName;
            if (roles.dim1) namesByAxis[0].push(name);
            else if (roles.dim2) namesByAxis[1].push(name);
            else if (roles.dim3) namesByAxis[2].push(name);
        });
        const joinN = (arr: string[], fb: string) => arr.filter(Boolean).join(" / ") || fb;
        const name0 = joinN(namesByAxis[0], "Dim1");
        const name1 = joinN(namesByAxis[1], "Dim2");
        const name2 = joinN(namesByAxis[2], "Dim3");
        // Compact mapping label only
        this.axisInfoEl.textContent = `x: ${name0}  y: ${name1}  z: ${name2}`;
        this.axisInfoEl.style.cursor = 'pointer';
        // clicking opens context menu so users can drill up via host menu
        this.axisInfoEl.onclick = () => {
            try {
                (this.selectionManager as any).showContextMenu(undefined, { position: { x: 20, y: this.container.clientHeight - 20 } });
            } catch {}
        };
        this.axisInfoEl.style.display = "block";
    }

    private buildAxisEdgeLabels(step: number, cellSize: number, data: { size0: number; size1: number; size2: number; }) {
        if (this.axisLabelsGroup) {
            this.scene.remove(this.axisLabelsGroup);
            this.disposeGroup(this.axisLabelsGroup);
            this.axisLabelsGroup = undefined;
        }
        // If SVG text is enabled, use overlay instead of sprites
        const useSvg = (this as any).formattingSettings?.labelsCard?.useSvgText?.value === true || (this as any).formattingSettings?.axesCard?.useSvgText?.value === true;
        if (useSvg) { this.buildAxisEdgeLabelsSvg(step, cellSize, data); return; }
        const lvls = (this as any).formattingSettingsLastLevels || undefined;
        // Try to get names from last update call
        const dv: DataView | undefined = (this as any)._lastDataView;
        let name0 = "Dim1", name1 = "Dim2", name2 = "Dim3";
        try {
            const levels = (dv as any)?.matrix?.rows?.levels as any[] | undefined;
            const namesByAxis = [[], [], []] as string[][];
            (levels || []).forEach((lvl: any) => {
                const src = lvl?.sources?.[0];
                const roles = src?.roles || {};
                const n = src?.displayName;
                if (roles.dim1) namesByAxis[0].push(n);
                else if (roles.dim2) namesByAxis[1].push(n);
                else if (roles.dim3) namesByAxis[2].push(n);
            });
            const joinN = (arr: string[], fb: string) => arr.filter(Boolean).join(" / ") || fb;
            name0 = joinN(namesByAxis[0], name0);
            name1 = joinN(namesByAxis[1], name1);
            name2 = joinN(namesByAxis[2], name2);
        } catch {}

        const group = new THREE.Group();
        const labelPx = Number(((this.formattingSettings as any)?.labelsCard?.axisLabelSize?.value) ?? 12);
        const halfX = (data.size0 - 1) * step * 0.5;
        const halfY = (data.size1 - 1) * step * 0.5;
        const halfZ = (data.size2 - 1) * step * 0.5;
        const margin = Math.max(step, cellSize) * 1.2;

        // Truncate very long axis labels and keep variable width up to 20 chars
        const trunc = (t: string, n: number) => (t?.length || 0) > n ? (t.slice(0, Math.max(0, n - 1)) + "…") : t;
        name0 = trunc(name0, 20);
        name1 = trunc(name1, 20);
        name2 = trunc(name2, 20);

        // Badge background color and opacity from settings
        const bgHex = (((this.formattingSettings as any)?.labelsCard?.axisLabelBgColor?.value) as any)?.value || '#000000';
        const bgOpacity = Number((this.formattingSettings as any)?.labelsCard?.axisLabelBgOpacity?.value ?? 0.6);
        const bgRgba = hexToRgba(bgHex, Math.max(0, Math.min(1, bgOpacity)));
        const axisTextColor = (((this.formattingSettings as any)?.labelsCard?.axisTextColor?.value) as any)?.value || '#ffffff';

        // Keep axis badges compact and subtle
        const s = Math.max(0.6, Math.min(1.0, cellSize * 0.7));
        const sprX = this.makeTextSprite(name0, labelPx, axisTextColor, bgRgba);
        // Preserve aspect ratio; scale uniformly by multiplier
        sprX.scale.multiplyScalar(s);
        sprX.position.set(halfX + margin, 0, -halfZ - margin);
        group.add(sprX);

        const sprY = this.makeTextSprite(name1, labelPx, axisTextColor, bgRgba);
        sprY.scale.multiplyScalar(s);
        sprY.position.set(-halfX - margin, halfY + margin, -halfZ - margin);
        group.add(sprY);

        const sprZ = this.makeTextSprite(name2, labelPx, axisTextColor, bgRgba);
        sprZ.scale.multiplyScalar(s);
        sprZ.position.set(-halfX - margin, 0, halfZ + margin);
        group.add(sprZ);

        this.scene.add(group);
        this.axisLabelsGroup = group;
    }

    private buildAxisEdgeLabelsSvg(step: number, cellSize: number, data: { size0: number; size1: number; size2: number; }) {
        this.ensureSvgOverlay();
        if (!this.svgOverlay || !this.svgAxisGroup) return;
        // Clear previous
        while (this.svgAxisGroup.firstChild) this.svgAxisGroup.removeChild(this.svgAxisGroup.firstChild);
        this.svgAxisLabels = [];

        // names detection is same as sprite version
        const dv: DataView | undefined = (this as any)._lastDataView;
        let name0 = "Dim1", name1 = "Dim2", name2 = "Dim3";
        try {
            const levels = (dv as any)?.matrix?.rows?.levels as any[] | undefined;
            const namesByAxis = [[], [], []] as string[][];
            (levels || []).forEach((lvl: any) => {
                const src = lvl?.sources?.[0];
                const roles = src?.roles || {};
                const n = src?.displayName;
                if (roles.dim1) namesByAxis[0].push(n);
                else if (roles.dim2) namesByAxis[1].push(n);
                else if (roles.dim3) namesByAxis[2].push(n);
            });
            const joinN = (arr: string[], fb: string) => arr.filter(Boolean).join(" / ") || fb;
            name0 = joinN(namesByAxis[0], name0);
            name1 = joinN(namesByAxis[1], name1);
            name2 = joinN(namesByAxis[2], name2);
        } catch {}

        const labelPx = Number(((this.formattingSettings as any)?.labelsCard?.axisLabelSize?.value) ?? 12);
        const halfX = (data.size0 - 1) * step * 0.5;
        const halfY = (data.size1 - 1) * step * 0.5;
        const halfZ = (data.size2 - 1) * step * 0.5;
        const margin = Math.max(step, cellSize) * 1.2;
        const trunc = (t: string, n: number) => (t?.length || 0) > n ? (t.slice(0, Math.max(0, n - 1)) + "…") : t;
        name0 = trunc(name0, 20); name1 = trunc(name1, 20); name2 = trunc(name2, 20);
        const bgHex = (((this.formattingSettings as any)?.labelsCard?.axisLabelBgColor?.value) as any)?.value || '#000000';
        const bgOpacity = Number((this.formattingSettings as any)?.labelsCard?.axisLabelBgOpacity?.value ?? 0.6);
        const bgRgba = hexToRgba(bgHex, Math.max(0, Math.min(1, bgOpacity)));
        const axisTextColor = (((this.formattingSettings as any)?.labelsCard?.axisTextColor?.value) as any)?.value || '#ffffff';

        const mk = (text: string, pos: THREE.Vector3, n: THREE.Vector3) => {
            const g = document.createElementNS('http://www.w3.org/2000/svg','g');
            const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
            const t = document.createElementNS('http://www.w3.org/2000/svg','text');
            t.textContent = text;
            t.setAttribute('font-size', String(labelPx));
            t.setAttribute('font-family','Arial, Helvetica, sans-serif');
            t.setAttribute('font-weight','600');
            t.setAttribute('fill', axisTextColor);
            t.setAttribute('dominant-baseline','middle');
            t.setAttribute('text-anchor','start');
            this.svgAxisGroup!.appendChild(g);
            g.appendChild(rect); g.appendChild(t);
            // measure then set rect
            const bbox = t.getBBox();
            const pad = Math.ceil(labelPx * 0.22);
            const rectW = bbox.width + pad * 2;
            const rectH = bbox.height + pad * 2;
            rect.setAttribute('rx', String(Math.floor(labelPx * 0.22)));
            rect.setAttribute('ry', String(Math.floor(labelPx * 0.22)));
            rect.setAttribute('width', String(rectW));
            rect.setAttribute('height', String(rectH));
            rect.setAttribute('fill', bgRgba);
            // offset text inside rect
            t.setAttribute('x', String(pad));
            t.setAttribute('y', String(rectH / 2));
            // anchor group at top-left of rect; will be moved in updateSvgOverlay
            g.setAttribute('transform','translate(0,0)');
            this.svgAxisLabels.push({ g, pos, n });
        };
        mk(name0, new THREE.Vector3(halfX + margin, 0, -halfZ - margin), new THREE.Vector3(1, 0, -1).normalize());
        mk(name1, new THREE.Vector3(-halfX - margin, halfY + margin, -halfZ - margin), new THREE.Vector3(-1, 0, -1).normalize());
        mk(name2, new THREE.Vector3(-halfX - margin, 0, halfZ + margin), new THREE.Vector3(-1, 0, 1).normalize());
    }

    private buildGridAndTicks(step: number, cellSize: number, data: { size0: number; size1: number; size2: number; members0: string[]; members1: string[]; members2: string[]; }, showGrid: boolean, showTicks: boolean) {
        if (this.gridGroup) { this.scene.remove(this.gridGroup); this.disposeGroup(this.gridGroup); this.gridGroup = undefined; }
        if (this.ticksGroup) { this.scene.remove(this.ticksGroup); this.disposeGroup(this.ticksGroup); this.ticksGroup = undefined; }

        const group = new THREE.Group();
        const ticks = new THREE.Group();
        const halfX = (data.size0 - 1) * step * 0.5;
        const halfY = (data.size1 - 1) * step * 0.5;
        const halfZ = (data.size2 - 1) * step * 0.5;
        const baseY = 0;

        if (showGrid) {
            const mkLine = (points: number[], color: number) => {
                const g = new THREE.BufferGeometry();
                g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
                const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
                return new THREE.LineSegments(g, m);
            };
            const r = 0xe74c3c, gcol = 0x2ecc71, b = 0x3498db;
            // X edges
            const xPts = [
                -halfX, baseY, -halfZ,  halfX, baseY, -halfZ,
                -halfX, baseY,  halfZ,  halfX, baseY,  halfZ,
                -halfX, baseY + 2*halfY, -halfZ,  halfX, baseY + 2*halfY, -halfZ,
                -halfX, baseY + 2*halfY,  halfZ,  halfX, baseY + 2*halfY,  halfZ,
            ];
            group.add(mkLine(xPts, r));
            // Z edges
            const zPts = [
                -halfX, baseY, -halfZ, -halfX, baseY,  halfZ,
                halfX,  baseY, -halfZ,  halfX, baseY,  halfZ,
                -halfX, baseY + 2*halfY, -halfZ, -halfX, baseY + 2*halfY,  halfZ,
                halfX,  baseY + 2*halfY, -halfZ,  halfX, baseY + 2*halfY,  halfZ,
            ];
            group.add(mkLine(zPts, b));
            // Y edges
            const yPts = [
                -halfX, baseY, -halfZ, -halfX, baseY + 2*halfY, -halfZ,
                halfX,  baseY, -halfZ,  halfX, baseY + 2*halfY, -halfZ,
                -halfX, baseY,  halfZ, -halfX, baseY + 2*halfY,  halfZ,
                halfX,  baseY,  halfZ,  halfX, baseY + 2*halfY,  halfZ,
            ];
            group.add(mkLine(yPts, gcol));

            // Base plane grid
            const grid = new THREE.Group();
            const grey = 0x9aa5b1;
            for (let i = 0; i < data.size0; i++) {
                const x = -halfX + i * step;
                grid.add(mkLine([x, baseY, -halfZ, x, baseY, halfZ], grey));
            }
            for (let k = 0; k < data.size2; k++) {
                const z = -halfZ + k * step;
                grid.add(mkLine([-halfX, baseY, z, halfX, baseY, z], grey));
            }
            group.add(grid);

            // Inner grids on each Y layer (optional)
            const axesCfg = (this.formattingSettings as any)?.axesCard;
            if (axesCfg?.showInnerGrids?.value !== false) {
                for (let j = 1; j < data.size1; j++) {
                    const gy = j * step; // layer height
                    const g2 = new THREE.Group();
                    for (let i = 0; i < data.size0; i++) {
                        const x = -halfX + i * step;
                        g2.add(mkLine([x, gy, -halfZ, x, gy, halfZ], grey));
                    }
                    for (let k = 0; k < data.size2; k++) {
                        const z = -halfZ + k * step;
                        g2.add(mkLine([-halfX, gy, z, halfX, gy, z], grey));
                    }
                    group.add(g2);
                }
            }
        }

        if (showTicks) {
            const useSvg = (this as any).formattingSettings?.labelsCard?.useSvgText?.value === true || (this as any).formattingSettings?.axesCard?.useSvgText?.value === true;
            if (useSvg) {
                this.buildTicksSvg(step, cellSize, { size0: data.size0, size1: data.size1, size2: data.size2, members0: data.members0, members1: data.members1, members2: data.members2 });
            } else {
            const labelPx = Number((this.formattingSettings as any)?.labelsCard?.tickLabelSize?.value ?? 12);
        const s = Math.max(0.7, cellSize * 0.8);
        const bothSides = ((this.formattingSettings as any)?.axesCard?.ticksBothSides?.value) !== false;
        const trunc10 = (t: string) => (t?.length || 0) > 10 ? (t.slice(0, 9) + "…") : t;
        const tickTextColor = (((this.formattingSettings as any)?.labelsCard?.tickTextColor?.value) as any)?.value || '#222';
            for (let i = 0; i < data.members0.length; i++) {
                const x = -halfX + i * step;
                const spr = this.makeTextSprite(trunc10(String(data.members0[i])), labelPx, tickTextColor);
                spr.scale.multiplyScalar(s);
                spr.position.set(x, baseY - cellSize * 0.6, -halfZ - cellSize * 0.6);
                ticks.add(spr);
                if (bothSides) {
                    const spr2 = this.makeTextSprite(trunc10(String(data.members0[i])), labelPx, tickTextColor);
                    spr2.scale.multiplyScalar(s);
                    spr2.position.set(x, baseY - cellSize * 0.6, halfZ + cellSize * 0.6);
                    ticks.add(spr2);
                }
            }
            for (let k = 0; k < data.members2.length; k++) {
                const z = -halfZ + k * step;
                const spr = this.makeTextSprite(trunc10(String(data.members2[k])), labelPx, tickTextColor);
                spr.scale.multiplyScalar(s);
                spr.position.set(-halfX - cellSize * 0.6, baseY - cellSize * 0.6, z);
                ticks.add(spr);
                if (bothSides) {
                    const spr2 = this.makeTextSprite(trunc10(String(data.members2[k])), labelPx, tickTextColor);
                    spr2.scale.multiplyScalar(s);
                    spr2.position.set(halfX + cellSize * 0.6, baseY - cellSize * 0.6, z);
                    ticks.add(spr2);
                }
            }
            for (let j = 0; j < data.members1.length; j++) {
                const y = j * step;
                const spr = this.makeTextSprite(trunc10(String(data.members1[j])), labelPx, tickTextColor);
                spr.scale.multiplyScalar(s);
                spr.position.set(-halfX - cellSize * 0.6, y, -halfZ - cellSize * 0.6);
                ticks.add(spr);
                if (bothSides) {
                    const spr2 = this.makeTextSprite(trunc10(String(data.members1[j])), labelPx, tickTextColor);
                    spr2.scale.multiplyScalar(s);
                    spr2.position.set(halfX + cellSize * 0.6, y, halfZ + cellSize * 0.6);
                    ticks.add(spr2);
                }
            }
            }
        }

        if (showGrid) { this.scene.add(group); this.gridGroup = group; }
        if (showTicks) { this.scene.add(ticks); this.ticksGroup = ticks; }
    }

    private buildTicksSvg(step: number, cellSize: number, data: { size0: number; size1: number; size2: number; members0: string[]; members1: string[]; members2: string[]; }) {
        this.ensureSvgOverlay();
        if (!this.svgOverlay || !this.svgTicksGroup) return;
        while (this.svgTicksGroup.firstChild) this.svgTicksGroup.removeChild(this.svgTicksGroup.firstChild);
        this.svgTickLabels = [];
        const labelPx = Number((this.formattingSettings as any)?.labelsCard?.tickLabelSize?.value ?? 12);
        const halfX = (data.size0 - 1) * step * 0.5;
        const halfZ = (data.size2 - 1) * step * 0.5;
        const baseY = 0;
        const trunc10 = (t: string) => (t?.length || 0) > 10 ? (t.slice(0, 9) + "…") : t;
        const bothSides = ((this.formattingSettings as any)?.axesCard?.ticksBothSides?.value) !== false;
        const tickTextColor = (((this.formattingSettings as any)?.labelsCard?.tickTextColor?.value) as any)?.value || '#222';
        const mk = (text: string, pos: THREE.Vector3, n: THREE.Vector3) => {
            const g = document.createElementNS('http://www.w3.org/2000/svg','g');
            const t = document.createElementNS('http://www.w3.org/2000/svg','text');
            t.textContent = text; t.setAttribute('font-size', String(labelPx));
            t.setAttribute('font-family','Arial, Helvetica, sans-serif');
            t.setAttribute('fill',tickTextColor);
            this.svgTicksGroup!.appendChild(g); g.appendChild(t);
            const bbox = t.getBBox();
            t.setAttribute('x', String(-bbox.width/2));
            t.setAttribute('y', String(bbox.height/2));
            g.setAttribute('transform','translate(0,0)');
            this.svgTickLabels.push({ g, pos, n });
        };
        for (let i = 0; i < data.members0.length; i++) {
            const x = -halfX + i * step;
            mk(trunc10(String(data.members0[i])), new THREE.Vector3(x, baseY - cellSize * 0.6, -halfZ - cellSize * 0.6), new THREE.Vector3(0,0,-1));
            if (bothSides) mk(trunc10(String(data.members0[i])), new THREE.Vector3(x, baseY - cellSize * 0.6, halfZ + cellSize * 0.6), new THREE.Vector3(0,0,1));
        }
        for (let k = 0; k < data.members2.length; k++) {
            const z = -halfZ + k * step;
            mk(trunc10(String(data.members2[k])), new THREE.Vector3(-halfX - cellSize * 0.6, baseY - cellSize * 0.6, z), new THREE.Vector3(-1,0,0));
            if (bothSides) mk(trunc10(String(data.members2[k])), new THREE.Vector3(halfX + cellSize * 0.6, baseY - cellSize * 0.6, z), new THREE.Vector3(1,0,0));
        }
        for (let j = 0; j < data.members1.length; j++) {
            const y = j * step;
            // near front-left and far-right corners
            mk(trunc10(String(data.members1[j])), new THREE.Vector3(-halfX - cellSize * 0.6, y, -halfZ - cellSize * 0.6), new THREE.Vector3(-1,0,-1).normalize());
            if (bothSides) mk(trunc10(String(data.members1[j])), new THREE.Vector3(halfX + cellSize * 0.6, y, halfZ + cellSize * 0.6), new THREE.Vector3(1,0,1).normalize());
        }
    }

    private onPointerMove = (ev: PointerEvent) => {
        if ((ev as any).pointerType === 'touch') {
            // track pointers
            this.activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        }
        const rect = (ev.target as HTMLCanvasElement).getBoundingClientRect();
        this.pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

        // If dragging, apply rotation or pan instead of tooltip
        if (this.isDragging) {
            // touch gestures: 2 fingers → pan + pinch zoom; 1 finger → rotate
            if ((ev as any).pointerType === 'touch') {
                if (this.activePointers.size >= 2) {
                    const pts = Array.from(this.activePointers.values());
                    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
                    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                    if (this.lastMidpoint) {
                        const dx = mid.x - this.lastMidpoint.x;
                        const dy = mid.y - this.lastMidpoint.y;
                        this.camera.updateMatrix();
                        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0).normalize();
                        const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1).normalize();
                        const s = Math.max(0.3, this.radius * 0.003);
                        this.target.addScaledVector(right, -dx * s);
                        this.target.addScaledVector(up, dy * s);
                    }
                    if (this.lastPinchDist) {
                        const scale = dist / Math.max(1, this.lastPinchDist);
                        this.radius = Math.min(200, Math.max(5, this.radius / Math.max(0.2, Math.min(5, scale))))
                    }
                    this.lastMidpoint = mid; this.lastPinchDist = dist; this.updateCamera();
                    if (this.tooltipEl) this.tooltipEl.style.display = 'none';
                    this.renderWithOverlays();
                    return;
                } else {
                    // one finger rotate
                    const dx = ev.clientX - this.dragLastX;
                    const dy = ev.clientY - this.dragLastY;
                    this.dragLastX = ev.clientX; this.dragLastY = ev.clientY;
                    const rotS = 0.005;
                    this.theta += dx * rotS;
                    this.phi = Math.min(Math.PI - 0.2, Math.max(0.2, this.phi - dy * rotS));
                    this.updateCamera();
                    this.inertiaThetaVel = dx * rotS; this.inertiaPhiVel = -dy * rotS;
                    if (this.tooltipEl) this.tooltipEl.style.display = 'none';
                    this.renderWithOverlays();
                    return;
                }
            }
            const dx = ev.clientX - this.dragLastX;
            const dy = ev.clientY - this.dragLastY;
            this.dragLastX = ev.clientX; this.dragLastY = ev.clientY;
            if (this.isPanning) {
                // pan in screen space
                this.camera.updateMatrix();
                const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 0).normalize();
                const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrix, 1).normalize();
                const s = Math.max(0.3, this.radius * 0.003);
                this.target.addScaledVector(right, -dx * s);
                this.target.addScaledVector(up, dy * s);
                this.updateCamera();
            } else {
                const rotS = 0.005;
                this.theta += dx * rotS;
                this.phi = Math.min(Math.PI - 0.2, Math.max(0.2, this.phi - dy * rotS));
                this.updateCamera();
                // store velocities for inertia
                this.inertiaThetaVel = dx * rotS;
                this.inertiaPhiVel = -dy * rotS;
            }
            if (this.tooltipEl) this.tooltipEl.style.display = "none";
            this.renderWithOverlays();
            return;
        }

        if (!this.instanced) return;
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hits = this.raycaster.intersectObject(this.instanced, true) as any[];
        if (hits && hits.length) {
            const i = (hits[0] as any).instanceId as number;
            if (i != null) {
                const cellIndex = this.instanceToCellIndex[i];
                if (cellIndex != null) {
                    // Show tooltip with axis keys and value
                    const data = (this as any)._lastData as any;
                    const cell = data?.cells?.[cellIndex];
                    if (cell) {
                        // If report page tooltip is enabled, delegate to host and skip custom HTML tooltip
                        const useRpt = ((this.formattingSettings as any)?.tooltipCard?.useReportTooltip?.value) || ((this.formattingSettings as any)?.tooltip?.useReportTooltip?.value);
                        if (useRpt && this.tooltipService && (this.tooltipService.show || this.tooltipService.move)) {
                            const args: any = {
                                dataItems: [{
                                    displayName: this.measureMeta?.name || 'Value',
                                    value: String(cell.v)
                                }],
                                identities: [cell.sel || cell.sel0 || cell.sel1 || cell.sel2].filter(Boolean),
                                coordinates: { x: ev.clientX, y: ev.clientY },
                                isTouchEvent: false
                            };
                            try { (this.tooltipService.show||this.tooltipService.move).call(this.tooltipService, args); } catch {}
                            if (this.tooltipEl) this.tooltipEl.style.display = 'none';
                            return;
                        }
                        const names = this.axisNames || { x: "x", y: "y", z: "z" };
                        const meas = this.measureMeta || { name: "Value", format: undefined };
                        let valStr: string;
                        try {
                            if (meas.format) {
                                valStr = valueFormatter.create({ format: meas.format, cultureSelector: (this.host as any)?.locale }).format(cell.v as any);
                            } else {
                                valStr = cell.v != null ? Number(cell.v).toLocaleString() : "";
                            }
                        } catch {
                            valStr = cell.v != null ? Number(cell.v).toLocaleString() : "";
                        }
                        const adv: any = (this.formattingSettings as any)?.advancedCard || {};
                        // Default to true unless explicitly disabled (read setting object showTooltipTotals)
                        const showTotals = adv?.showTooltipTotals?.value !== false;
                        const fmt = (n: number) => {
                            try { return meas.format ? valueFormatter.create({ format: meas.format, cultureSelector: (this.host as any)?.locale }).format(n as any) : n.toLocaleString(); } catch { return n.toLocaleString(); }
                        };
                        const s0 = (data.sums0 && data.sums0[cell.key0]) || 0;
                        const s1 = (data.sums1 && data.sums1[cell.key1]) || 0;
                        const s2 = (data.sums2 && data.sums2[cell.key2]) || 0;
                        const pct = data.grandTotal ? ` (${Math.round((cell.v / data.grandTotal) * 1000)/10}%)` : '';
                        // Build table-like HTML
                        const row = (label: string, value: string) => `<div style="display:flex;justify-content:space-between;gap:12px"><span>${label}</span><span style="font-weight:600">${value}</span></div>`;
                        let html = '';
                        html += row(`${names.x} (x)`, cell.key0);
                        html += row(`${names.y} (y)`, cell.key1);
                        html += row(`${names.z} (z)`, cell.key2);
                        html += `<hr style="border:0;border-top:1px solid rgba(255,255,255,0.2);margin:4px 0">`;
                        html += row(meas.name, `${valStr}${pct}`);
                        if (showTotals) {
                            html += `<div style="margin-top:4px"></div>`;
                            html += row(`X total`, fmt(s0));
                            html += row(`Y total`, fmt(s1));
                            html += row(`Z total`, fmt(s2));
                        }
                        // no-op to avoid unused variable warning for html string built above
                        void (html);
                        this.tooltipEl.style.left = `${ev.clientX - rect.left + 10}px`;
                        this.tooltipEl.style.top = `${ev.clientY - rect.top + 10}px`;
                        this.tooltipEl.style.whiteSpace = "normal";
                        // Replace insecure innerHTML with safe DOM building
                        const tooltip = this.tooltipEl as HTMLElement;
                        while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
                        const addRow = (label: string, value: string) => {
                            const rowEl = document.createElement("div");
                            rowEl.style.display = "flex";
                            rowEl.style.justifyContent = "space-between";
                            rowEl.style.gap = "12px";
                            const l = document.createElement("span");
                            l.textContent = label;
                            const v = document.createElement("span");
                            v.textContent = value;
                            v.style.fontWeight = "600";
                            rowEl.appendChild(l);
                            rowEl.appendChild(v);
                            tooltip.appendChild(rowEl);
                        };
                        const addSeparator = () => {
                            const sep = document.createElement("div");
                            sep.style.borderTop = "1px solid rgba(255,255,255,0.2)";
                            sep.style.margin = "4px 0";
                            tooltip.appendChild(sep);
                        };
                        addRow(`${names.x} (x)`, String(cell.key0));
                        addRow(`${names.y} (y)`, String(cell.key1));
                        addRow(`${names.z} (z)`, String(cell.key2));
                        addSeparator();
                        addRow(meas.name, `${valStr}${pct}`);
                        if (showTotals) {
                            const spacer = document.createElement("div");
                            spacer.style.marginTop = "4px";
                            tooltip.appendChild(spacer);
                            addRow(`${String(cell.key0)} total`, fmt(s0));
                            addRow(`${String(cell.key1)} total`, fmt(s1));
                            addRow(`${String(cell.key2)} total`, fmt(s2));
                        }
                        this.tooltipEl.style.display = "block";
                        // remember last hovered cell for custom drill buttons
                        this.lastHoverCell = cell as any;
                        return;
                    }
                }
            }
        }
        if (this.tooltipEl) this.tooltipEl.style.display = "none";
    };

    private onPointerDown = (ev: PointerEvent) => {
        if ((ev as any).pointerType === 'touch') {
            this.activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
            // long-press context menu
            if (this.longPressTimer) clearTimeout(this.longPressTimer);
            this.longPressTimer = setTimeout(() => {
                try {
                    const rect = (ev.target as HTMLCanvasElement).getBoundingClientRect();
                    (this.selectionManager as any).showContextMenu(undefined, { position: { x: ev.clientX - rect.left, y: ev.clientY - rect.top } });
                } catch {}
            }, 600);
        }
        this.isDragging = true;
        this.isPanning = !!ev.shiftKey;
        this.dragLastX = ev.clientX; this.dragLastY = ev.clientY;
        // stop inertia
        this.inertiaThetaVel = 0; this.inertiaPhiVel = 0;
        if (this.inertiaRAF) { cancelAnimationFrame(this.inertiaRAF); this.inertiaRAF = undefined; }
        this.shouldAutoFit = false;
    };

    private onPointerUp = (ev: PointerEvent) => {
        if ((ev as any).pointerType === 'touch') {
            this.activePointers.delete(ev.pointerId);
            this.lastMidpoint = undefined; this.lastPinchDist = undefined;
            if (this.longPressTimer) { clearTimeout(this.longPressTimer); this.longPressTimer = undefined; }
            // double-tap reset
            const now = performance.now();
            if (this.lastTapTime && (now - this.lastTapTime) < 300) {
                this.resetView(); this.renderWithOverlays();
            }
            this.lastTapTime = now;
        }
        const wasPanning = this.isPanning;
        this.isDragging = false;
        this.isPanning = false;
        // start inertia if enabled and it was rotation
        const enable = this.formattingSettings?.cubeCard?.inertia?.value !== false;
        if (enable && !wasPanning && (Math.abs(this.inertiaThetaVel) > 1e-5 || Math.abs(this.inertiaPhiVel) > 1e-5)) {
            const step = () => {
                this.theta += this.inertiaThetaVel;
                this.phi = Math.min(Math.PI - 0.2, Math.max(0.2, this.phi + this.inertiaPhiVel));
                this.inertiaThetaVel *= 0.92;
                this.inertiaPhiVel *= 0.92;
                this.updateCamera();
                this.renderWithOverlays();
                if (Math.abs(this.inertiaThetaVel) > 1e-4 || Math.abs(this.inertiaPhiVel) > 1e-4) {
                    this.inertiaRAF = requestAnimationFrame(step);
                } else {
                    this.inertiaRAF = undefined;
                }
            };
            this.inertiaRAF = requestAnimationFrame(step);
        }
    };

    private onWheel = (ev: WheelEvent) => {
        const s = Math.exp((ev.deltaY || 0) * 0.001);
        this.radius = Math.min(200, Math.max(5, this.radius * s));
        this.shouldAutoFit = false;
        this.updateCamera();
        this.updateZoomLabel();
        this.renderWithOverlays();
    };

    private schedulePersistView() {
        if (!this.host || !(this.host as any).persistProperties) return;
        if (this.persistTimer) clearTimeout(this.persistTimer);
        this.persistTimer = setTimeout(() => {
            try {
                (this.host as any).persistProperties({ merge: [{ objectName: 'view', selector: null, properties: {
                    cameraTheta: this.theta,
                    cameraPhi: this.phi,
                    cameraRadius: this.radius,
                    targetX: this.target.x,
                    targetY: this.target.y,
                    targetZ: this.target.z,
                    rollZ: this.scene?.rotation?.z || 0
                } }]});
            } catch {}
        }, 300);
    }

    private onClick = async (ev: MouseEvent) => {
        if (!this.instanced) return;
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hits = this.raycaster.intersectObject(this.instanced, true) as any[];
        if (hits && hits.length) {
            const i = (hits[0] as any).instanceId as number;
            if (i != null) {
                const data = (this as any)._lastData as any;
                const cellIndex = this.instanceToCellIndex[i];
                const cell = data?.cells?.[cellIndex];
                if (cell) {
                    // Sequential drill order: X -> Y -> Z (ignores forced/inferred axis for click)
                    const counts = (this as any)._lastLevelCounts as number[] || [1,1,1];
                    const depths = { d0: (this as any)._lastData?.depth0 || 0, d1: (this as any)._lastData?.depth1 || 0, d2: (this as any)._lastData?.depth2 || 0 };
                    const axis = (depths.d0 < (counts[0]||0)) ? 0 : (depths.d1 < (counts[1]||0)) ? 1 : 2;
                    let selForAxis: ISelectionId | undefined = undefined;
                    if (axis === 0) selForAxis = cell.sel0 || cell.sel;
                    else if (axis === 1) selForAxis = cell.sel1 || cell.sel;
                    else selForAxis = cell.sel2 || cell.sel;
                    const targetSel = selForAxis || cell.sel;
                    if (targetSel) {
                        const multi = !!(ev.ctrlKey || (ev as any).metaKey);
                        await this.selectionManager.select([targetSel], multi);
                    }
                    const multi = !!(ev.ctrlKey || (ev as any).metaKey);
                    // local highlight
                    if (!multi) this.selectedInstances.clear();
                    if (this.selectedInstances.has(i)) this.selectedInstances.delete(i); else this.selectedInstances.add(i);
                    this.applySelectionHighlight();
                }
            }
        }
        else {
            // Clicked empty space: clear selection
            try { await this.selectionManager.clear(); } catch { /* ignore */ }
            this.selectedInstances.clear();
            this.applySelectionHighlight();
        }
    };

    private onContextMenu = async (ev: MouseEvent) => {
        ev.preventDefault();
        const rect = (ev.target as HTMLCanvasElement).getBoundingClientRect();
        // compute pointer from the event position to avoid stale pointer state
        const px = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
        const py = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
        this.pointer.set(px, py);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hits = this.raycaster.intersectObject(this.instanced as any, true) as any[];
        let sel: ISelectionId | undefined;
        if (hits && hits.length) {
            const i = (hits[0] as any).instanceId as number;
            const data = (this as any)._lastData as any;
            const cellIndex = this.instanceToCellIndex[i];
            const cell = data?.cells?.[cellIndex];
            sel = cell?.sel;
        }
        try {
            await (this.selectionManager as any).showContextMenu(sel || undefined, {
                position: { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
            });
        } catch { /* optional in older API */ }
    };

    private makeTextSprite(text: string, fontPx: number, fill = "#111", bg?: string) {
        const can = createTextCanvas(text, fontPx, fill, bg);
        const tex = new THREE.CanvasTexture(can);
        tex.needsUpdate = true;
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.NearestFilter; // keep glyphs crisp
        try { (tex as any).anisotropy = (this.renderer as any)?.capabilities?.getMaxAnisotropy?.() || 1; } catch {}
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, alphaTest: 0.2 });
        const spr = new THREE.Sprite(mat);
        const ar = can.width / can.height;
        spr.scale.set(ar, 1, 1);
        return spr as THREE.Sprite;
    }

    private applySelectionHighlight() {
        if (!this.instanced) return;
        const anySel = this.selectedInstances.size > 0;
        const brighten = (c: THREE.Color) => c.clone().lerp(new THREE.Color(0xffffff), 0.5);
        const darken = (c: THREE.Color) => c.clone().multiplyScalar(0.6);
        const mesh: any = this.instanced as any;
        for (let i = 0; i < this.baseInstanceColors.length; i++) {
            const base = this.baseInstanceColors[i] || new THREE.Color(0xffffff);
            const col = anySel ? (this.selectedInstances.has(i) ? brighten(base) : darken(base)) : base;
            mesh.setColorAt(i, col);
        }
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        // Rebuild selection outlines and glow sprites
        if (this.selectionOutlineGroup) { this.scene.remove(this.selectionOutlineGroup); this.disposeGroup(this.selectionOutlineGroup); this.selectionOutlineGroup = undefined; }
        if (this.selectionGlowGroup) { this.scene.remove(this.selectionGlowGroup); this.disposeGroup(this.selectionGlowGroup); this.selectionGlowGroup = undefined; }

        if (anySel) {
            const outline = new THREE.Group();
            const glow = new THREE.Group();
            const baseEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
            const posAttr = baseEdges.getAttribute('position') as THREE.BufferAttribute;
            const inflate = 1.006;
            const col = new THREE.Color(0xffffff);
            const matL = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9, linewidth: 2, depthTest: false });
            const v = new THREE.Vector3();
            this.selectedInstances.forEach((i) => {
                const m = this.instanceMatrices[i];
                if (!m) return;
                const g = new THREE.BufferGeometry();
                const arr: number[] = [];
                for (let j = 0; j < posAttr.count; j++) { v.fromBufferAttribute(posAttr, j).multiplyScalar(inflate).applyMatrix4(m); arr.push(v.x, v.y, v.z); }
                g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
                const lines = new THREE.LineSegments(g, matL);
                outline.add(lines);
                // glow sprite at center
                const center = new THREE.Vector3(); center.setFromMatrixPosition(m);
                const spr = makeGlowSprite(Math.max(0.8, 0.9), '#ffffff');
                spr.position.copy(center);
                glow.add(spr);
            });
            this.scene.add(outline); this.selectionOutlineGroup = outline;
            this.scene.add(glow); this.selectionGlowGroup = glow;
            baseEdges.dispose();
        }
        this.renderWithOverlays();
    }

    // Rendering helpers and orientation gizmo
    private renderWithOverlays() {
        this.renderer.render(this.scene, this.camera);
        this.renderGizmo();
        this.updateSvgOverlay();
    }

    private buildGizmo() {
        // Create once; toggle visibility via setting
        if (this.gizmoRenderer) return;
        const can = document.createElement('canvas');
        can.style.position = 'absolute';
        can.style.left = '10px';
        can.style.top = '10px';
        can.style.width = '72px';
        can.style.height = '72px';
        can.style.pointerEvents = 'none';
        this.container.appendChild(can);
        const r = new THREE.WebGLRenderer({ canvas: can, alpha: true, antialias: true });
        (r as any).outputColorSpace = (THREE as any).SRGBColorSpace || (r as any).outputColorSpace;
        r.setClearColor(0x000000, 0);
        this.gizmoCanvas = can; this.gizmoRenderer = r;
        const s = new THREE.Scene(); this.gizmoScene = s;
        const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100); this.gizmoCamera = cam; cam.position.set(0,0,6); cam.lookAt(0,0,0);
        const axes = new THREE.Group();
        const mk = (dir: THREE.Vector3, color: number, label: string) => {
            const mat = new THREE.LineBasicMaterial({ color });
            const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, dir.x, dir.y, dir.z], 3));
            const line = new THREE.Line(geo, mat); axes.add(line);
            const spr = this.makeTextSprite(label, 12, '#fff'); spr.position.copy(dir.clone().multiplyScalar(1.2)); axes.add(spr);
        };
        mk(new THREE.Vector3(1,0,0), 0xe74c3c, 'X');
        mk(new THREE.Vector3(0,1,0), 0x2ecc71, 'Y');
        mk(new THREE.Vector3(0,0,1), 0x3498db, 'Z');
        s.add(axes); this.gizmoAxes = axes;
        this.updateGizmoSize();
    }

    private updateGizmoSize() {
        if (!this.gizmoRenderer || !this.gizmoCanvas) return;
        const cssW = 72, cssH = 72;
        this.gizmoRenderer.setSize(cssW, cssH, false);
        const show = this.formattingSettings?.axesCard?.showOrientation?.value !== false;
        this.gizmoCanvas.style.display = show ? 'block' : 'none';
    }

    private renderGizmo() {
        if (!this.gizmoRenderer || !this.gizmoAxes || !this.gizmoScene || !this.gizmoCamera) return;
        if (this.formattingSettings?.axesCard?.showOrientation?.value === false) return;
        const q = this.camera.quaternion.clone().invert();
        this.gizmoAxes.setRotationFromQuaternion(q);
        this.gizmoRenderer.render(this.gizmoScene, this.gizmoCamera);
    }

    // SVG overlay helpers
    private buildSvgOverlay() {
        if (this.svgOverlay) return;
        const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('width','100%');
        svg.setAttribute('height','100%');
        svg.style.position = 'absolute';
        svg.style.left = '0'; svg.style.top = '0';
        svg.style.pointerEvents = 'none';
        this.container.appendChild(svg);
        const gAxis = document.createElementNS('http://www.w3.org/2000/svg','g');
        const gTicks = document.createElementNS('http://www.w3.org/2000/svg','g');
        svg.appendChild(gAxis); svg.appendChild(gTicks);
        this.svgOverlay = svg; this.svgAxisGroup = gAxis; this.svgTicksGroup = gTicks;
    }
    private ensureSvgOverlay() { if (!this.svgOverlay) this.buildSvgOverlay(); }
    private updateSvgOverlay() {
        const useSvg = (this as any).formattingSettings?.labelsCard?.useSvgText?.value === true || (this as any).formattingSettings?.axesCard?.useSvgText?.value === true;
        if (!this.svgOverlay) return;
        // Size matches container
        const w = this.container.clientWidth || 0; const h = this.container.clientHeight || 0;
        this.svgOverlay.setAttribute('viewBox', `0 0 ${w} ${h}`);
        this.svgOverlay.style.display = useSvg ? 'block' : 'none';
        if (!useSvg) return;
        const project = (p: THREE.Vector3) => {
            const v = p.clone().project(this.camera);
            const x = (v.x * 0.5 + 0.5) * w;
            const y = (-v.y * 0.5 + 0.5) * h;
            return { x, y };
        };
        const arr = [...this.svgAxisLabels, ...this.svgTickLabels];
        const camPos = this.camera.position.clone();
        for (const it of arr) {
            const { x, y } = project(it.pos);
            it.g.setAttribute('transform', `translate(${x},${y})`);
            // simple facing test to hide back-side labels
            const view = camPos.clone().sub(it.pos);
            const facing = it.n ? (it.n.clone().normalize().dot(view) > 0) : true;
            (it.g as any).style.display = facing ? 'block' : 'none';
        }
    }
}

// Text sprite utility
function createTextCanvas(text: string, fontPx: number, fill: string, bg?: string) {
    // Balanced padding with centered text for uniform badges
    const pad = bg ? Math.ceil(fontPx * 0.16) : Math.ceil(fontPx * 0.08);
    const font = `600 ${fontPx}px Arial, Helvetica, sans-serif`;
    const tmp = document.createElement("canvas").getContext("2d")!;
    tmp.font = font;
    const metrics = tmp.measureText(text);
    const contentW = Math.ceil(metrics.width);
    const contentH = Math.ceil(fontPx * 1.28);
    const boxW = contentW + pad * 2;
    const boxH = contentH + pad * 2;
    const dpr = (window.devicePixelRatio || 1);
    const can = document.createElement("canvas");
    can.width = Math.max(2, nextPow2(Math.ceil(boxW * dpr)));
    can.height = Math.max(2, nextPow2(Math.ceil(boxH * dpr)));
    const c = can.getContext("2d")!;
    c.clearRect(0, 0, can.width, can.height);
    c.scale(dpr, dpr);
    const viewW = can.width / dpr;
    const viewH = can.height / dpr;
    const rectX = (viewW - boxW) / 2;
    const rectY = (viewH - boxH) / 2;
    if (bg) {
        c.fillStyle = bg;
        const r = Math.floor(fontPx * 0.22);
        roundRect(c, rectX, rectY, boxW, boxH, r);
        c.fill();
    }
    // centered text
    c.font = font;
    c.fillStyle = fill;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, viewW / 2, viewH / 2);
    return can;
}

function nextPow2(v: number) { let p = 1; while (p < v) p <<= 1; return p; }
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// end Visual

// Simple glow sprite
function makeGlowSprite(scale: number, color: string) {
    const size = 128;
    const can = document.createElement('canvas');
    can.width = can.height = size;
    const ctx = can.getContext('2d')!;
    const grd = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grd.addColorStop(0, hexToRgba(color, 0.9));
    grd.addColorStop(0.4, hexToRgba(color, 0.25));
    grd.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = grd; ctx.fillRect(0,0,size,size);
    const tex = new THREE.CanvasTexture(can);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(scale, scale, 1);
    return spr as THREE.Sprite;
}
function hexToRgba(hex: string, a: number) {
    const h = hex.replace('#','');
    const n = parseInt(h.length===3? h.split('').map(x=>x+x).join(''):h, 16);
    const r = (n>>16)&255, g=(n>>8)&255, b=n&255;
    return `rgba(${r},${g},${b},${a})`;
}
















