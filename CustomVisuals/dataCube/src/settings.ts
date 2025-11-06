/*
 *  Power BI Visualizations
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

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class CubeCardSettings extends FormattingSettingsCard {
    scaleMode = new formattingSettings.ItemDropdown({
        name: "scaleMode",
        displayName: "Scale mode",
        value: { value: "height", displayName: "Height bars" },
        items: [
            { value: "height", displayName: "Height bars" },
            { value: "equal", displayName: "Equal-sized cubes" },
            { value: "uniform", displayName: "Uniform 3D scaling" }
        ]
    });
    inertia = new formattingSettings.ToggleSwitch({
        name: "inertia",
        displayName: "Inertia (rotate momentum)",
        value: true
    });
    defaultZoom = new formattingSettings.NumUpDown({
        name: "defaultZoom",
        displayName: "Default Zoom %",
        value: 100
    });
    cellSize = new formattingSettings.NumUpDown({
        name: "cellSize",
        displayName: "Cell size",
        value: 0.9
    });

    gap = new formattingSettings.NumUpDown({
        name: "gap",
        displayName: "Gap",
        value: 0.2
    });

    heightScale = new formattingSettings.NumUpDown({
        name: "heightScale",
        displayName: "Height scale",
        value: 6
    });

    opacity = new formattingSettings.NumUpDown({
        name: "opacity",
        displayName: "Opacity (0-1)",
        value: 1
    });

    showControls = new formattingSettings.ToggleSwitch({
        name: "showControls",
        displayName: "Show control panel",
        value: true
    });

    keySeparator = new formattingSettings.ItemDropdown({
        name: "keySeparator",
        displayName: "Key separator",
        value: { value: " ▸ ", displayName: "▸ (arrow)" },
        items: [
            { value: " ▸ ", displayName: "▸ (arrow)" },
            { value: " / ", displayName: "/ (slash)" },
            { value: " > ", displayName: "> (angle)" }
        ]
    });

    equalCubes = new formattingSettings.ToggleSwitch({
        name: "equalCubes",
        displayName: "Equal-sized cubes (legacy)",
        value: false
    });

    showValueLabels = new formattingSettings.ToggleSwitch({
        name: "showValueLabels",
        displayName: "Show value labels",
        value: false
    });

    labelSize = new formattingSettings.NumUpDown({
        name: "labelSize",
        displayName: "Label size",
        value: 12
    });
    labelColor = new formattingSettings.ColorPicker({
        name: "labelColor",
        displayName: "Label color",
        value: { value: "#111111" }
    });

    preventOverlap = new formattingSettings.ToggleSwitch({
        name: "preventOverlap",
        displayName: "Prevent height overlap",
        value: true
    });

    uniformScale = new formattingSettings.ToggleSwitch({
        name: "uniformScale",
        displayName: "Uniform 3D scaling (legacy)",
        value: false
    });

    volumeLinear = new formattingSettings.ToggleSwitch({
        name: "volumeLinear",
        displayName: "Volume ∝ value (cuberoot)",
        value: true
    });

    minCubeRatio = new formattingSettings.NumUpDown({
        name: "minCubeRatio",
        displayName: "Min cube ratio (0-1)",
        value: 0.2
    });

    topDim1 = new formattingSettings.NumUpDown({
        name: "topDim1",
        displayName: "Top N (Dim 1)",
        value: 10
    });

    topDim2 = new formattingSettings.NumUpDown({
        name: "topDim2",
        displayName: "Top N (Dim 2)",
        value: 10
    });

    topDim3 = new formattingSettings.NumUpDown({
        name: "topDim3",
        displayName: "Top N (Dim 3)",
        value: 10
    });

    minColor = new formattingSettings.ColorPicker({
        name: "minColor",
        displayName: "Min color",
        value: { value: "#4ea8de" }
    });

    maxColor = new formattingSettings.ColorPicker({
        name: "maxColor",
        displayName: "Max color",
        value: { value: "#9b5de5" }
    });

    midColor = new formattingSettings.ColorPicker({
        name: "midColor",
        displayName: "Mid color (diverging)",
        value: { value: "#eeeeee" }
    });

    colorByZ = new formattingSettings.ToggleSwitch({
        name: "colorByZ",
        displayName: "Color by Z index",
        value: true
    });
    sortMode = new formattingSettings.ItemDropdown({
        name: "sortMode",
        displayName: "Sort order",
        value: { value: "totals", displayName: "By totals (desc)" },
        items: [
            { value: "totals", displayName: "By totals (desc)" },
            { value: "keyAsc", displayName: "By key (asc)" }
        ]
    });

    colorMode = new formattingSettings.ItemDropdown({
        name: "colorMode",
        displayName: "Color mode",
        value: { value: "sequential", displayName: "Sequential" },
        items: [
            { value: "sequential", displayName: "Sequential" },
            { value: "diverging", displayName: "Diverging" },
            { value: "categorical", displayName: "Categorical (by Z)" }
        ]
    });

    showLegend = new formattingSettings.ToggleSwitch({
        name: "showLegend",
        displayName: "Show legend",
        value: true
    });

    showCubeEdges = new formattingSettings.ToggleSwitch({
        name: "showCubeEdges",
        displayName: "Show cube borders",
        value: true
    });
    edgeWidth = new formattingSettings.NumUpDown({
        name: "edgeWidth",
        displayName: "Border width",
        value: 1
    });
    edgeColor = new formattingSettings.ColorPicker({
        name: "edgeColor",
        displayName: "Border color",
        value: { value: "#ffffff" }
    });
    edgeOpacity = new formattingSettings.NumUpDown({
        name: "edgeOpacity",
        displayName: "Border opacity (0-1)",
        value: 0.6
    });
    edgesOnTop = new formattingSettings.ToggleSwitch({
        name: "edgesOnTop",
        displayName: "Edges always on top",
        value: false
    });

    showFaceKeys = new formattingSettings.ToggleSwitch({
        name: "showFaceKeys",
        displayName: "Show dimension keys on faces",
        value: false
    });

    name: string = "cube";
    displayName: string = "Cube";
    slices: Array<FormattingSettingsSlice> = [
        this.scaleMode,
        this.defaultZoom,
        this.inertia,
        this.cellSize,
        this.gap,
        this.heightScale,
        this.opacity,
        this.keySeparator,
        this.showControls
    ];
}

class ColorsCardSettings extends FormattingSettingsCard {
    colorMode = new formattingSettings.ItemDropdown({ name: "colorMode", displayName: "Color mode", value: { value: "sequential", displayName: "Sequential" }, items: [ { value: "sequential", displayName: "Sequential" }, { value: "diverging", displayName: "Diverging" }, { value: "categorical", displayName: "Categorical (by Z)" } ]});
    minColor = new formattingSettings.ColorPicker({ name: "minColor", displayName: "Min color", value: { value: "#4ea8de" } });
    midColor = new formattingSettings.ColorPicker({ name: "midColor", displayName: "Mid color (diverging)", value: { value: "#eeeeee" } });
    maxColor = new formattingSettings.ColorPicker({ name: "maxColor", displayName: "Max color", value: { value: "#9b5de5" } });
    colorByZ = new formattingSettings.ToggleSwitch({ name: "colorByZ", displayName: "Color by Z index", value: true });
    showLegend = new formattingSettings.ToggleSwitch({ name: "showLegend", displayName: "Show legend", value: true });
    name: string = "colors"; displayName: string = "Colors";
    slices: Array<FormattingSettingsSlice> = [this.colorMode, this.minColor, this.midColor, this.maxColor, this.colorByZ, this.showLegend];
}

class LabelsCardSettings extends FormattingSettingsCard {
    // Axis label options
    axisLabelSize = new formattingSettings.NumUpDown({ name: "axisLabelSize", displayName: "Axis label size", value: 12 });
    axisTextColor = new formattingSettings.ColorPicker({ name: "axisTextColor", displayName: "Axis text color", value: { value: "#ffffff" } });
    axisLabelBgColor = new formattingSettings.ColorPicker({ name: "axisLabelBgColor", displayName: "Axis label background", value: { value: "#000000" } });
    axisLabelBgOpacity = new formattingSettings.NumUpDown({ name: "axisLabelBgOpacity", displayName: "Axis label bg opacity (0-1)", value: 0.6 });
    // Tick label options
    tickLabelSize = new formattingSettings.NumUpDown({ name: "tickLabelSize", displayName: "Tick label size", value: 12 });
    tickTextColor = new formattingSettings.ColorPicker({ name: "tickTextColor", displayName: "Tick text color", value: { value: "#222222" } });
    // Rendering mode
    useSvgText = new formattingSettings.ToggleSwitch({ name: "useSvgText", displayName: "Render axis/ticks as SVG", value: true });
    name: string = "labels"; displayName: string = "Labels";
    slices: Array<FormattingSettingsSlice> = [this.useSvgText, this.axisLabelSize, this.axisTextColor, this.axisLabelBgColor, this.axisLabelBgOpacity, this.tickLabelSize, this.tickTextColor];
}

class BordersCardSettings extends FormattingSettingsCard {
    showCubeEdges = new formattingSettings.ToggleSwitch({ name: "showCubeEdges", displayName: "Show cube borders", value: true });
    edgeWidth = new formattingSettings.NumUpDown({ name: "edgeWidth", displayName: "Border width", value: 1 });
    edgeColor = new formattingSettings.ColorPicker({ name: "edgeColor", displayName: "Border color", value: { value: "#ffffff" } });
    edgeOpacity = new formattingSettings.NumUpDown({ name: "edgeOpacity", displayName: "Border opacity (0-1)", value: 0.6 });
    edgesOnTop = new formattingSettings.ToggleSwitch({ name: "edgesOnTop", displayName: "Edges always on top", value: false });
    name: string = "borders"; displayName: string = "Borders";
    slices: Array<FormattingSettingsSlice> = [this.showCubeEdges, this.edgeWidth, this.edgeColor, this.edgeOpacity, this.edgesOnTop];
}

class AdvancedCardSettings extends FormattingSettingsCard {
    showTooltipTotals = new formattingSettings.ToggleSwitch({ name: "tooltipShowTotals", displayName: "Show totals in tooltip", value: true });
    sortMode = new formattingSettings.ItemDropdown({ name: "sortMode", displayName: "Sort order", value: { value: "totals", displayName: "By totals (desc)" }, items: [ { value: "totals", displayName: "By totals (desc)" }, { value: "keyAsc", displayName: "By key (asc)" } ]});
    preventOverlap = new formattingSettings.ToggleSwitch({ name: "preventOverlap", displayName: "Prevent height overlap", value: true });
    uniformScale = new formattingSettings.ToggleSwitch({ name: "uniformScale", displayName: "Uniform 3D scaling (legacy)", value: false });
    volumeLinear = new formattingSettings.ToggleSwitch({ name: "volumeLinear", displayName: "Volume ? value (cuberoot)", value: true });
    minCubeRatio = new formattingSettings.NumUpDown({ name: "minCubeRatio", displayName: "Min cube ratio (0-1)", value: 0.2 });
    topDim1 = new formattingSettings.NumUpDown({ name: "topDim1", displayName: "Top N (Dim 1)", value: 10 });
    topDim2 = new formattingSettings.NumUpDown({ name: "topDim2", displayName: "Top N (Dim 2)", value: 10 });
    topDim3 = new formattingSettings.NumUpDown({ name: "topDim3", displayName: "Top N (Dim 3)", value: 10 });
    name: string = "advanced"; displayName: string = "Advanced";
    slices: Array<FormattingSettingsSlice> = [this.sortMode, this.preventOverlap, this.uniformScale, this.volumeLinear, this.minCubeRatio, this.topDim1, this.topDim2, this.topDim3, this.showTooltipTotals];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    cubeCard = new CubeCardSettings();
    colorsCard = new ColorsCardSettings();
    labelsCard = new LabelsCardSettings();
    bordersCard = new BordersCardSettings();
    advancedCard = new AdvancedCardSettings();
    axesCard = new class extends FormattingSettingsCard {
        showAxisInfo = new formattingSettings.ToggleSwitch({
            name: "showAxisInfo",
            displayName: "Show axis mapping",
            value: true
        });
        showAxisEdgeLabels = new formattingSettings.ToggleSwitch({
            name: "showAxisEdgeLabels",
            displayName: "Show axis edge labels",
            value: true
        });
        // label sizing/color options moved to Labels card
        showGridFrame = new formattingSettings.ToggleSwitch({
            name: "showGridFrame",
            displayName: "Show grid frame",
            value: true
        });
        showAxisTicks = new formattingSettings.ToggleSwitch({
            name: "showAxisTicks",
            displayName: "Show axis tick labels",
            value: true
        });
        // tick sizing moved to Labels card
        showInnerGrids = new formattingSettings.ToggleSwitch({
            name: "showInnerGrids",
            displayName: "Show inner grids per layer",
            value: true
        });
        showOrientation = new formattingSettings.ToggleSwitch({
            name: "showOrientation",
            displayName: "Show orientation gizmo",
            value: true
        });
        ticksBothSides = new formattingSettings.ToggleSwitch({
            name: "ticksBothSides",
            displayName: "Tick labels on both sides",
            value: true
        });
        name: string = "axes";
        displayName: string = "Axes";
        slices: Array<FormattingSettingsSlice> = [
            this.showAxisInfo,
            this.showAxisEdgeLabels,
            this.showGridFrame,
            this.showAxisTicks,
            this.showInnerGrids,
            this.showOrientation,
            this.ticksBothSides
        ];
    }();
    cards = [this.cubeCard, this.colorsCard, this.labelsCard, this.bordersCard, this.advancedCard, this.axesCard];
}
