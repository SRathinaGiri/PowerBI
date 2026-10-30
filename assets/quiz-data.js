/* The challenges for each lesson, keyed by page file name (see quiz.js).
   Every lesson mixes three different formats, and consecutive lessons avoid
   repeating the same mix. All figures and names are synthetic. */
window.SRG_QUIZZES = {
  'PowerQueryExercises.html': [
    { type: 'match', prompt: 'Match each problem to the Power Query step that solves it.', pairs: [['Blanks under a merged region cell', 'Fill Down'], ['Months as separate columns', 'Unpivot'], ['Q1 and Q2 in separate sheets', 'Append'], ['Customers who never bought', 'Left Anti merge']], why: 'Name the shape of the problem first, and the step usually follows.' },
    { type: 'order', prompt: 'Put the steps for the title-row report in order.', items: ['Remove the top 2 rows', 'Promote headers', 'Filter out null regions'], why: 'Headers can only be promoted once the title rows are out of the way.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['Unpivot turns wide month columns into rows you can pivot and chart.', true], ['Merge adds more rows beneath a table, while Append adds columns beside it.', false], ['A left anti merge keeps rows with no match on the right.', true]], why: 'Append stacks rows. Merge brings in columns through a matching key.' }
  ],
  'QueryFolding.html': [
    { type: 'sort', prompt: 'On a SQL source, which way does each step usually go?', buckets: ['Usually folds', 'Often breaks folding'], items: [['Filter rows', 0], ['Remove columns', 0], ['Group by', 0], ['Add index column', 1], ['Table.Buffer', 1]], why: 'Steps with a direct SQL equivalent can be sent to the source.' },
    { type: 'order', prompt: 'Arrange these steps to keep folding as long as possible.', items: ['Filter rows', 'Remove columns', 'Group by', 'Add index column'], why: 'Put what can fold first, and steps that cannot fold last.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['A CSV file folds if you filter it first.', false], ['Everything after a non-folding step is always guaranteed to run locally.', false], ['A greyed-out View Native Query always proves nothing folded.', false]], why: 'Files have no engine to fold to, the engine may reorder steps, and View Native Query depends on the connector.' }
  ],
  'RelationshipsAndCalcGroups.html': [
    { type: 'match', prompt: 'Match each need to the feature.', pairs: [['Sales by delivery date', 'USERELATIONSHIP'], ['MTD for every measure', 'Calculation group'], ['The measure on the visual', 'SELECTEDMEASURE()']], why: 'One switches a relationship, and the others reuse one formula across measures.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['Two relationships between the same tables can be active at once.', false], ['USERELATIONSHIP changes the relationship for one calculation only.', true], ['A calculation group replaces every measure in a model.', false]], why: 'Only one path can be active, and base measures are still needed.' },
    { type: 'predict', prompt: 'H Mart’s last order is in March 2026. Predict the missing figure.', table: [['View', 'Apr-26 net sales'], ['By delivery date', '₹4,13,521.47'], ['By order date', '?']], ask: 'Apr-26 net sales by order date', prefix: '₹', answer: 0, why: 'No orders were placed in April, though goods ordered in March were still being delivered.' }
  ],
  'AskingAI.html': [
    { type: 'order', prompt: 'Put these in the order you should use them on a project.', items: ['Clarify the business question', 'Design the model', 'Write the measure', 'Reconcile the total'], why: 'What comes before how, and checking comes last.' },
    { type: 'sort', prompt: 'Is each item safe to paste into a public AI tool?', buckets: ['Safe', 'Keep out'], items: [['Column names', 0], ['Made-up sample rows', 0], ['A client’s PAN', 1], ['A client’s bank statement', 1]], why: 'Share the structure, never the client’s data.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['If the DAX runs without error, the number is right.', false], ['A good prompt names the exact tables and columns.', true], ['AI can invent legal sections, so verify them at the source.', true]], why: 'H Mart’s 926% target ran with no error at all.' }
  ],
  'stages-of-data-analysis.html': [
    { type: 'order', prompt: 'Rebuild the journey from the earliest stage to the latest.', items: ['Cross tab', 'Pivot table', 'Data cube', 'Interactive BI', 'AI-enabled BI'], why: 'Each stage keeps the same data and makes it easier to explore.' },
    { type: 'match', prompt: 'Match each stage to its navigation analogy.', pairs: [['Cross tab', 'Table of coordinates'], ['Pivot table', 'A 2D map you can turn'], ['Data cube', 'A globe'], ['Interactive BI', 'Phone map'], ['AI-enabled BI', 'Voice GPS']], why: 'The place never changed. Only the way of finding it did.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['Rotating a pivot table changes the grand total.', false], ['A data cube keeps answers ready for many angles of the same data.', true], ['AI-enabled BI removes the need to understand the data.', false]], why: 'A pivot only changes the view, and you still have to judge what AI tells you.' }
  ],
  'ElementsOfDataCube.html': [
    { type: 'sort', prompt: 'Which word fits each card?', buckets: ['Fact', 'Dimension', 'Measure'], items: [['₹450 on one sale slip', 0], ['Chennai', 1], ['Masala Tea', 1], ['15-08-2026', 1], ['Total Sales', 2], ['Average Bill Value', 2]], why: 'Facts record what happened, dimensions label it, and measures calculate over it.' },
    { type: 'order', prompt: 'Arrange the Time hierarchy from coarsest to finest.', items: ['Year', 'Quarter', 'Month', 'Day'], why: 'A hierarchy is one dimension seen at different levels.' },
    { type: 'predict', prompt: 'A slicer is set to Chennai. What does the Total Sales card show?', table: [['City', 'Product', 'Amount'], ['Chennai', 'Masala Tea', '₹450'], ['Chennai', 'Filter Coffee', '₹300'], ['Kochi', 'Masala Tea', '₹700'], ['Chennai', 'Millet Cookies', '₹250'], ['Chennai', 'Masala Tea', '₹120']], ask: 'Total Sales', prefix: '₹', answer: 1120, why: '450 + 300 + 250 + 120. The measure returns one value for the facts in view.' }
  ],
  'FactToWisdom.html': [
    { type: 'order', prompt: 'Climb the hourglass from the bottom to the top.', items: ['Fact', 'Data', 'Information', 'Knowledge', 'Intelligence', 'Wisdom'], why: 'Reality narrows to information at the neck, then widens again inside us.' },
    { type: 'sort', prompt: 'Which level does each statement sit at?', buckets: ['Information', 'Intelligence', 'Wisdom'], items: [['Chennai sales were ₹1,120 in August', 0], ['Total Sales by branch', 0], ['Move stock to Chennai this week', 1], ['Choose which branch gets the extra staff', 1], ['Should we be in this business five years from now?', 2]], why: 'A number informs, a choice now is intelligence, and foresight is wisdom.' },
    { type: 'fill', prompt: 'Complete the root of the word intelligence.', parts: ['Intelligence = ', 0, ' + ', 1, ' : to ', 2], bank: ['inter', 'legere', 'choose between', 'collect all', 'gather'], why: 'Inter + legere: to choose between. Comparing is what makes a decision possible.' }
  ],
  'DataProcessingR2R.html': [
    { type: 'match', prompt: 'You already know R2R from accounting. Pair each record with its step.', pairs: [['Journal entry', 'Recording'], ['Ledger accounts', 'Classifying'], ['Ledger entries in date order', 'Sorting'], ['Trial balance', 'Summarizing'], ['Financial statements', 'Reporting']], why: 'The same five steps run underneath every data system.' },
    { type: 'predict', prompt: 'Classify, then summarize. What is total Sales?', table: [['Voucher', 'Head', 'Amount'], ['V1', 'Sales', '₹2,000'], ['V2', 'Rent', '₹500'], ['V3', 'Sales', '₹3,000'], ['V4', 'Salary', '₹1,500']], ask: 'Total Sales', prefix: '₹', answer: 5000, why: 'Classifying picks V1 and V3. Summarizing replaces them with one total.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['A good report shows every detail it has.', false], ['Each event should be recorded once, as it happens.', true], ['Summarizing replaces many details with a few totals.', true]], why: 'A report shows what the decision-maker needs, not everything there is.' }
  ],
  'DataAnalyticsAPPASA.html': [
    { type: 'order', prompt: 'Put APPASA back together.', items: ['Ask', 'Prepare', 'Process', 'Analyze', 'Share', 'Act'], why: 'It starts with a question and ends with a decision, not with a chart.' },
    { type: 'match', prompt: 'Which step is this task?', pairs: [['Which branch is losing money?', 'Ask'], ['Collect the sales exports', 'Prepare'], ['Remove duplicate invoices', 'Process'], ['Compare margin across branches', 'Analyze'], ['Present the dashboard to the partner', 'Share'], ['Close the branch and review the result', 'Act']], why: 'Each task has one home, and that tells you which tool to reach for.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['Analytics ends when the dashboard is published.', false], ['No tool can frame the question for you.', true], ['Cleaning the data comes before finding the answer.', true]], why: 'Publishing is Share. The work ends at Act, when someone decides and learns.' }
  ],
  'KindsOfAnalytics.html': [
    { type: 'match', prompt: 'Which kind of analytics asks this?', pairs: [['What happened?', 'Descriptive'], ['Why did it happen?', 'Diagnostic'], ['What will happen?', 'Predictive'], ['What should I do?', 'Prescriptive'], ['What is interesting?', 'Exploratory'], ['Is it really true?', 'Confirmatory']], why: 'The question decides the kind, not the tool.' },
    { type: 'sort', prompt: 'Sales fell in Chennai. Name the kind of each sentence.', buckets: ['Descriptive', 'Diagnostic', 'Predictive', 'Prescriptive'], items: [['Sales fell 10% in August', 0], ['Two reps left, so visits dropped', 1], ['September will likely fall 5% more', 2], ['Hire one rep and offer a 3% scheme', 3]], why: 'Same story, four different questions.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['A forecast tells you what to do about the result.', false], ['A diagnosis needs what happened as its starting point.', true]], why: 'Predicting says what may happen. Prescribing says what to do about it.' }
  ],
  'OLAPConcept.html': [
    { type: 'sort', prompt: 'Is this work OLTP or OLAP?', buckets: ['OLTP', 'OLAP'], items: [['Book one railway ticket', 0], ['Update one customer’s address', 0], ['Record one ATM withdrawal', 0], ['Total sales by region for five years', 1], ['Compare margin across all products', 1]], why: 'OLTP handles one transaction at a time. OLAP reads across many rows.' },
    { type: 'match', prompt: 'Pair the ideas.', pairs: [['Row store', 'Suitcases'], ['Column store', 'Wardrobes'], ['OLTP design', 'Entity-relationship diagram'], ['OLAP design', 'Star schema']], why: 'Store and shape both follow from the work the system has to do.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['Counting every shoe is fastest with suitcases.', false], ['Checking in one traveller is simple with a suitcase.', true]], why: 'Each store is fast for its own kind of question.' }
  ],
  'OLAPDataCube.html': [
    { type: 'match', prompt: 'Pair each operation with what it does.', pairs: [['Pivot', 'Rotate the view'], ['Slice', 'Fix one dimension to one value'], ['Dice', 'Keep a smaller cube using several dimensions'], ['Drill down', 'Go to a finer level'], ['Roll up', 'Go to a coarser level']], why: 'Five moves, and the underlying data never changes.' },
    { type: 'predict', prompt: 'A cube has 3 products, 4 quarters and 5 cities. Slice it to one product.', ask: 'How many cells remain?', answer: 20, why: 'Slicing removes one dimension: 4 quarters × 5 cities = 20 cells.' },
    { type: 'sort', prompt: 'Name the move.', buckets: ['Slice', 'Dice', 'Drill down', 'Roll up'], items: [['Only FY 2026-27', 0], ['Chennai and Kochi, Tea and Coffee only', 1], ['Year to Quarter', 2], ['Month to Quarter', 3]], why: 'One value is a slice, a chosen block is a dice, and levels move you up or down.' }
  ],
  'PowerQueryJoins.html': [
    { type: 'match', prompt: 'Who gets a seat at the wedding?', pairs: [['Inner', 'Guests on both lists'], ['Left anti', 'Bride’s side only'], ['Right anti', 'Groom’s side only'], ['Left outer', 'The whole bride’s list'], ['Full outer', 'Everyone, shared guests once']], why: 'The join kind decides whose rows survive.' },
    { type: 'predict', prompt: 'The bride invites 5 guests and the groom invites 4. Two guests are on both lists. Merge with a full outer join.', ask: 'How many guests in the result?', answer: 7, why: '5 + 4 − 2 = 7. Shared guests appear only once.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['A left outer join keeps every row of the left list.', true], ['A left anti join returns the rows that matched.', false], ['An inner join can return fewer rows than either list.', true]], why: 'Anti keeps the rows that did not match. Outer keeps the whole list.' }
  ],
  'SemanticModel.html': [
    { type: 'order', prompt: 'Grow the model from the simplest to the richest shape.', items: ['Flat tables', 'Star', 'Snowflake', 'Star cluster', 'Galaxy'], why: 'Each shape adds structure so that more questions can be answered.' },
    { type: 'sort', prompt: 'Is this table a fact or a dimension?', buckets: ['Fact table', 'Dimension table'], items: [['Sales', 0], ['Returns', 0], ['Customer', 1], ['Product', 1], ['Date', 1]], why: 'Events go in facts, and the labels that describe them go in dimensions.' },
    { type: 'match', prompt: 'Recognise the shape.', pairs: [['One fact at the centre, dimensions around it', 'Star'], ['A dimension branches into another table', 'Snowflake'], ['Some dimensions flat, some branching', 'Star cluster'], ['Several facts share the same dimensions', 'Galaxy']], why: 'Shared dimensions are what let two fact tables be compared.' }
  ],
  'ModelComponents.html': [
    { type: 'match', prompt: 'Walk through the smart building.', pairs: [['Tables', 'Rooms'], ['Relationships', 'Corridors'], ['Hierarchies', 'Floors'], ['Measures', 'Meters'], ['Perspectives', 'Visitor maps'], ['Roles', 'Keycards'], ['Calculation groups', 'Master switch']], why: 'Every part of the model has a job in the building.' },
    { type: 'sort', prompt: 'Which component solves this?', buckets: ['Roles', 'Cultures', 'Calculation groups'], items: [['The Chennai manager sees only Chennai', 0], ['Each user sees only their own region', 0], ['Show field names in Tamil', 1], ['Apply YTD to every measure in one place', 2]], why: 'Keycards restrict, signs translate, and the master switch acts on many measures.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['A perspective stops users from reaching hidden data.', false], ['A relationship lets a filter travel between tables.', true]], why: 'A perspective only simplifies the view. Security comes from roles.' }
  ],
  'VertiPaqEngine.html': [
    { type: 'sort', prompt: 'How well will this column compress?', buckets: ['Compresses well', 'Compresses poorly'], items: [['State', 0], ['Month', 0], ['Product category', 0], ['Invoice number', 1], ['Timestamp to the second', 1]], why: 'Few distinct values means high repetition, and repetition is what compresses.' },
    { type: 'predict', prompt: 'A column has 10,00,000 rows and only 5 distinct values.', ask: 'How many values go in its dictionary?', answer: 5, why: 'The dictionary stores each distinct value once. The rows just point to them.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['Import mode has no memory cost.', false], ['Total Sales needs to read only the columns it uses.', true], ['Removing unused columns can make a model smaller.', true]], why: 'The desk is fast because the whole model sits on it, so keep it tidy.' }
  ],
  'StarSchema.html': [
    { type: 'fill', prompt: 'Complete the rule for a normal one-to-many relationship.', parts: ['A filter flows from the ', 0, ' table to the ', 1, ' table.'], bank: ['dimension', 'fact'], why: 'The one side filters the many side. That is the arrow on the relationship line.' },
    { type: 'predict', prompt: 'The Product slicer on the dimension table is set to Tea.', table: [['Sale', 'Product', 'Amount'], ['S1', 'Tea', '₹100'], ['S2', 'Coffee', '₹200'], ['S3', 'Tea', '₹300'], ['S4', 'Cookies', '₹150']], ask: 'Total Sales', prefix: '₹', answer: 400, why: 'The filter reaches S1 and S3 only: 100 + 300.' },
    { type: 'sort', prompt: 'Where does this column belong?', buckets: ['Fact table', 'Dimension table'], items: [['Amount', 0], ['Quantity', 0], ['Product name', 1], ['City', 1], ['Month name', 1]], why: 'Numbers to add go in the fact. Words to filter by go in dimensions.' }
  ],
  'RowContextVsFilterContext.html': [
    { type: 'sort', prompt: 'Which context does this create?', buckets: ['Row context', 'Filter context'], items: [['A calculated column', 0], ['SUMX walking through a table', 0], ['A slicer', 1], ['A row header in a matrix', 1], ['A CALCULATE filter argument', 1]], why: 'Row context is the roll call. Filter context is the door.' },
    { type: 'predict', prompt: 'The door says “Section B only”. What does SUM of Marks return?', table: [['Student', 'Section', 'Marks'], ['Ravi', 'A', '90'], ['Priya', 'B', '70'], ['Arjun', 'B', '80'], ['Kavya', 'A', '60']], ask: 'SUM of Marks', answer: 150, why: 'Only Priya and Arjun stay in the room: 70 + 80.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['Row context filters the table on its own.', false], ['Roll call visits only the students still in the room.', true]], why: 'Row context only points at one row. It takes a filter to send others out.' }
  ],
  'CalculatedColumnVsMeasureLab.html': [
    { type: 'sort', prompt: 'Calculated column or measure?', buckets: ['Calculated column', 'Measure'], items: [['Full name = First & Last, on each row', 0], ['Price band to use in a slicer', 0], ['Total Sales', 1], ['% of total that follows the slicer', 1]], why: 'Stored per row and filterable is a column. Calculated when asked is a measure.' },
    { type: 'match', prompt: 'Pair each with its behaviour.', pairs: [['Date of birth', 'Printed once on the certificate'], ['Age', 'Worked out when someone asks'], ['Calculated column', 'Computed at refresh and stored'], ['Measure', 'Computed at query time']], why: 'The calendar moves, so the age changes. The date of birth never does.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['A calculated column recalculates when you click a slicer.', false], ['A calculated column takes up model memory.', true], ['A measure is stored in every row of its table.', false]], why: 'A column is fixed at refresh. A measure stores only its formula.' }
  ],
  'SumVsSumXLab.html': [
    { type: 'predict', prompt: 'The waiter works line by line.', table: [['Dish', 'Qty', 'Rate'], ['Dosa', '2', '₹100'], ['Thali', '1', '₹300']], code: 'Bill = SUMX ( Lines, Lines[Qty] * Lines[Rate] )', ask: 'Bill', prefix: '₹', answer: 500, why: '2 × 100 + 1 × 300 = 500. The shortcut of 3 plates × ₹200 average would overcharge ₹600.' },
    { type: 'bug', prompt: 'This measure will not work. Which part is wrong?', tokens: ['Bill =', 'SUM', '(', 'Lines[Qty] * Lines[Rate]', ')'], bad: 1, why: 'SUM accepts a single column only. An expression per row needs SUMX.' },
    { type: 'fill', prompt: 'Now write it correctly.', parts: ['Bill = ', 0, ' ( ', 1, ', Lines[Qty] * ', 2, ' )'], bank: ['SUMX', 'Lines', 'Lines[Rate]', 'SUM', 'Lines[Total]'], why: 'An iterator takes the table first, then the expression to work out for each row.' }
  ],
  'FilterContextCamera.html': [
    { type: 'predict', prompt: 'Region = East is in the spotlight, and Year = 2024.', table: [['Region', 'Year', 'Sales'], ['East', '2024', '₹400'], ['West', '2024', '₹500'], ['East', '2023', '₹300'], ['East', '2024', '₹250']], ask: 'Total Sales', prefix: '₹', answer: 650, why: 'Only two rows pass both filters: 400 + 250.' },
    { type: 'sort', prompt: 'Does this change the spotlight?', buckets: ['Changes what is lit', 'Does not'], items: [['A slicer', 0], ['A page filter', 0], ['A row header', 0], ['A chart title', 1], ['A bar colour', 1]], why: 'Only filters decide who stands in the frame.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['The same measure gives different numbers because its formula changes.', false], ['Rows outside the spotlight are deleted from the table.', false], ['Filters from different places combine to narrow the spotlight.', true]], why: 'The camera is fixed and the data stays. Only the lighting changes.' }
  ],
  'DAXFilterHierarchy.html': [
    { type: 'order', prompt: 'Order these by scope, from the widest reach to the narrowest.', items: ['Report filter', 'Page filter', 'Slicer', 'Visual filter', 'Cell (row and column headers)'], why: 'Scope is how much of the report the filter reaches.' },
    { type: 'sort', prompt: 'Can CALCULATE override this?', buckets: ['Yes', 'No'], items: [['Page filter', 0], ['Slicer', 0], ['Visual filter', 0], ['Row-Level Security', 1]], why: 'RLS is the locked valve, and the engine always enforces it.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['Applying the report filter before the page filter changes the result.', false], ['Filters combine by intersection into one filter context.', true], ['KEEPFILTERS adds to the existing filter instead of replacing it.', true]], why: 'Filters merge into one query, so their order does not change the answer.' }
  ],
  'ContextTransitionLab.html': [
    { type: 'predict', prompt: 'The pile holds 12 notebooks. Ravi owns 3. In a calculated column on Students:', code: 'Notebooks = COUNTROWS ( Notebooks )', ask: 'What shows on Ravi’s row?', answer: 12, why: 'Row context alone does not filter the pile, so every student gets 12.' },
    { type: 'fill', prompt: 'Make it count only Ravi’s notebooks.', parts: ['Notebooks = ', 0, ' ( ', 1, ' ( Notebooks ) )'], bank: ['CALCULATE', 'COUNTROWS', 'FILTER', 'SUMX'], why: 'CALCULATE turns the current row into a filter that flows to the pile.' },
    { type: 'order', prompt: 'Replay what happens on Ravi’s row.', items: ['Roll call stops at Ravi', 'CALCULATE turns the row into a filter', 'The filter flows through the relationship', 'Only Ravi’s notebooks are counted'], why: 'That turn from row to filter is context transition.' }
  ],
  'AllVsAllexceptVsAllselectedLab.html': [
    { type: 'match', prompt: 'Out of whom is Ravi’s share?', pairs: [['ALL', 'The whole school'], ['ALLEXCEPT ( Class )', 'His class'], ['ALLSELECTED', 'Today’s hall']], why: 'Each function chooses a different denominator.' },
    { type: 'predict', prompt: 'A slicer selects only class 10-A. Ravi’s share uses ALL as the denominator.', table: [['Student', 'Class', 'Marks'], ['Ravi', '10-A', '50'], ['Priya', '10-A', '30'], ['Arjun', '10-B', '20']], ask: 'What is the denominator?', answer: 100, why: 'ALL removes every filter, the slicer too: 50 + 30 + 20.' },
    { type: 'fill', prompt: 'Build the share of the whole school.', parts: ['Share = ', 0, ' ( [Marks], ', 1, ' ( [Marks], ', 2, ' ( Students ) ) )'], bank: ['DIVIDE', 'CALCULATE', 'ALL', 'SUMX', 'VALUES'], why: 'DIVIDE handles zero safely, and CALCULATE changes the context for the denominator.' }
  ],
  'DateFilterContextTrain.html': [
    { type: 'predict', prompt: 'The matrix row is Q1 2025.', table: [['Quarter', 'Sales'], ['Q1 2024', '₹200'], ['Q2 2024', '₹250'], ['Q1 2025', '₹300'], ['Q2 2025', '₹350']], code: 'PY Total Sales = CALCULATE ( [Total Sales], SAMEPERIODLASTYEAR ( DateTable[Date] ) )', ask: 'PY Total Sales', prefix: '₹', answer: 200, why: 'The train leaves Q1 2025 and stops at the same quarter a year earlier.' },
    { type: 'bug', prompt: 'A student wrote this. Which part makes it wrong?', tokens: ['PY =', 'CALCULATE', '(', '[Total Sales],', 'SAMEPERIODLASTYEAR', '(', 'Sales[Amount]', ')', ')'], bad: 6, why: 'SAMEPERIODLASTYEAR needs a date column, ideally from the date table.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['The PY measure stores last year’s numbers in a new table.', false], ['Time intelligence shifts the dates in the filter context.', true]], why: 'Nothing is stored. The measure moves the filter and calculates again.' }
  ],
  'PowerBIChartGuide.html': [
    { type: 'match', prompt: 'Pick the right chart for the job.', pairs: [['Monthly sales trend', 'Line chart'], ['Top 10 customers by revenue', 'Horizontal bar'], ['Actual vs budget by branch', 'Clustered column'], ['Brands within each category', 'Treemap'], ['Channel share of three channels', 'Donut']], why: 'The question comes first. The chart follows.' },
    { type: 'myth', prompt: 'Myth or fact?', items: [['A pie chart suits 40 categories.', false], ['Long category names read better on a horizontal bar.', true], ['A line chart suits an ordered axis such as time.', true]], why: 'Too many slices cannot be compared, and lines imply order.' },
    { type: 'sort', prompt: 'What does this question need to show?', buckets: ['Trend', 'Ranking', 'Part of a whole'], items: [['Are sales rising this year?', 0], ['Which branch sold the most?', 1], ['Which five products lead?', 1], ['What share comes from the web?', 2]], why: 'Name what the question needs to show, and the chart usually picks itself.' }
  ]
};
