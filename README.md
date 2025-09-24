**Power BI Infographics: Visualizing Complex Concepts**

A collection of interactive, animated infographics designed to demystify complex Power BI concepts like Star Schemas and DAX Filter Contexts.

🌟 About This Project

This repository is dedicated to making advanced Power BI topics easy and fun to learn. By using interactive web-based animations, we transform intricate ideas into simple, visual metaphors, helping you grasp key concepts faster and more effectively.

Our goal is to provide a go-to resource for developers, data analysts, and anyone looking to level up their Power BI skills.

🎨 Animations Included

Each animation is a self-contained HTML file that you can open directly in your web browser. The content is organized inside the
`pages/` directory to keep the project root tidy, and shared assets live under `assets/`.

**1. OLTP Vs. OLAP**

An interactive infographic that visually demonstrates OLTP vs OLAP: at a Glance and why Columnstore databases are used in analytics.
   
**2. OLAP - Data Cube Operations**

An interactive infographic that visually demonstrates OLAP data cube operations—Pivoting, Dicing, Slicing, Drilling Down, and Rolling up—through dynamic 3D cube animations linked with tabular data.

**3. The Star Schema Filter Flow**

An interactive visual that demonstrates how filters cascade from dimension tables to the central fact table in a star schema. It highlights the standard unidirectional relationships and the special bidirectional relationship used for the customer dimension.

**4. The DAX Filter Context Water Plant**

This infographic visualizes the DAX filter context hierarchy as a water filtration plant. It shows how filters from different levels (Report, Page, Visual, etc.) are applied sequentially and how the powerful CALCULATE() function can override these filters, with the exception of Row-Level Security (RLS).

**5. Date Filter Context Train**

An animation that uses a train yard metaphor to explain how time-intelligence calculations move between current, previous, and next date periods in DAX.

**6. Stages of Data Analysis**

Two complementary diagrams that outline the iterative stages of an analytics project—from clarifying the business question through shaping, modeling, and presenting the insight.

🚀 How to Use

Simply clone this repository and open any of the HTML files in your browser. The animations are built with vanilla HTML, CSS, and JavaScript, so no special software or server is required.
Bash

# Clone the repository
git clone https://github.com/SRathinagGiri/PowerBI.git

# Navigate to the project folder
cd PowerBI

# Open an animation
open pages/StarSchema.html

# Explore the stages of data analysis page
open pages/stages-of-data-analysis.html

# Download the practice workbook (optional)
open assets/resources/PBI.xlsx

➡️ What's Next?

This project is a living document, and there are many ways you can help it grow. Here are a few ideas for what to do next:

    Create New Infographics: Develop new animations for other complex Power BI concepts. Some ideas include:

        Data Lineage: Visualize the journey of data from its source to a final report.

        DAX FILTER() vs. KEEPFILTERS(): An interactive demo explaining the subtle but important differences.

        Many-to-Many Relationships: Show how bridge tables work to connect two dimension tables.

    Improve Existing Infographics: Enhance the current animations with new features, better explanations, or more streamlined code.

    Add New Concepts: Create a new folder for a different data analysis tool, such as Python or SQL, and build a set of infographics for that ecosystem.

    Contribute to the Code:

        Refine the CSS: Make the existing styles more modular and reusable.

        Improve Accessibility: Add ARIA labels and keyboard navigation to make the infographics accessible to all users.

        Optimize Performance: Minify the code or optimize the SVG assets to make the files load faster.

Your contribution, no matter how big or small, will help make the world of data analytics more accessible to everyone.

🤝 Contributions

We welcome contributions! If you have an idea for a new infographic or want to improve an existing one, please feel free to open an issue or a pull request. This project is a community effort to make learning Power BI accessible to everyone.

✨ Credits & Acknowledgments

    Project Idea & Development: S. Rathinagiri, ChatGPT and Gemini

    Built with: HTML, CSS, JavaScript, and SVG animations

    Icons: Material Design Icons

    Inspiration: The DAX Filter Context Water Plant was inspired by similar visualizations in the data community.

📜 License

This project is licensed under the MIT License. See the LICENSE file for more details.
