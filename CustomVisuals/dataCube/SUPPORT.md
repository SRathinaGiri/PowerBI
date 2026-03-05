Support Document for DataCube 3D

Developer: S. Rathinagiri

Website: https://www.rathinagiri.in

Support Email: srg@rathinagiri.in
1. Introduction

DataCube 3D is a custom visual for Power BI designed to provide a high-performance, interactive 3D representation of your data. It allows users to rotate and explore data points across three axes for deeper spatial analysis.
2. Getting Started

To use DataCube 3D in your Power BI reports:

    Import: Click the ellipsis (...) in the Visualizations pane and select "Import a visual from a file" or "Get more visuals" (AppSource).

    Assign Data: Drag your fields into the following buckets:

        X-Axis: Numerical or Categorical field for width.

        Y-Axis: Numerical or Categorical field for height.

        Z-Axis: Numerical or Categorical field for depth.

        Value/Size: The metric that determines the size or color of the data points.

    Interaction: Click and drag the cube to rotate it. Use the scroll wheel to zoom in or out. You can drill down on X/Y/Z axis. For drilling down, you need to add a hierarchy as X/Y/Z axis.

3. Troubleshooting & FAQ

    Visual is blank: Ensure you have assigned data to all three required axes.

    Performance: For the best experience, limit the number of data points to under 10,000.

    Browser Support: This visual uses WebGL. Ensure your browser or Power BI Desktop environment has hardware acceleration enabled.

4. Technical Support

If you encounter bugs, have feature requests, or need help, please use one of the following:

    Issue Tracker: https://github.com/SRathinaGiri/PowerBI/issues

    Direct Contact: Please email me at srg@rathinagiri.in with a description of the issue and, if possible, a screenshot.

5. Version History

    v1.0.0.0: Initial release of DataCube 3D.
