/* "Try it in Power BI" boxes, keyed by page file name like quiz-data.js.
   Every expected figure comes from a DAX query run on the published H Mart PBIX. */
window.SRG_TRYIT = {
  'RowContextVsFilterContext.html': {
    task: 'In the FactSales table, add a calculated column. Each row works out its own profit, because a calculated column has a row context. Then sum the new column in a card.',
    code: "Line Gross Profit = 'FactSales'[NetSales] - 'FactSales'[COGS]",
    expect: 'The card shows ₹1,93,36,392.80, which matches the report’s Gross Profit.',
    wrong: "Bad Profit = 'FactSales'[NetSales] - 'FactSales'[COGS]",
    wrongAs: 'Enter the same formula as a measure.',
    why: 'You get an error saying a single value for the column cannot be determined. A measure has no current row, so it does not know which line you mean.'
  },
  'CalculatedColumnVsMeasureLab.html': {
    task: 'Create gross margin percent as a measure, so the ratio is worked out on whatever is visible.',
    code: "Margin % = DIVIDE(SUM('FactSales'[NetSales]) - SUM('FactSales'[COGS]), SUM('FactSales'[NetSales]))",
    expect: 'In a card: 10.95%. It stays correct in any slice.',
    wrong: "Line Margin % = DIVIDE('FactSales'[NetSales] - 'FactSales'[COGS], 'FactSales'[NetSales])",
    wrongAs: 'Enter this as a calculated column instead, and show it in a card.',
    why: 'Summed, it reads 3,371.66, or 3,37,166%. Averaged, it reads 13.52%, because a ₹50 line counts the same as a ₹50,000 line. Ratios belong in measures.'
  },
  'SumVsSumXLab.html': {
    task: 'Value every order line at list price. The multiplication must happen row by row, so use an iterator.',
    code: "Order Value = SUMX('FactSales', 'FactSales'[OrderedQuantity] * 'FactSales'[UnitListPrice])",
    expect: 'In a card: ₹19,77,48,139.92.',
    wrong: "Bad Order Value = SUM('FactSales'[OrderedQuantity]) * SUM('FactSales'[UnitListPrice])",
    wrongAs: 'Now multiply the two totals.',
    why: 'It shows ₹5,01,58,95,40,30,27.96, about ₹5 lakh crore. Total quantity times the sum of all prices is not a sale of anything.'
  },
  'FilterContextCamera.html': {
    task: 'Create this measure and show it in a table by DimProduct[Department]. Then add a slicer on FactSales[Channel] and select Retail.',
    code: "Lines = COUNTROWS('FactSales')",
    expect: 'Before the slicer: Food shows 11,311 and the total is 25,000. With Retail selected: Food shows 2,758 and the total is 6,048. The formula never changed, only what was in frame.',
    wrong: "Lines = COUNTROWS('FactSales')",
    wrongAs: 'Check a table with this same measure on another report page.',
    why: 'It still reads 25,000 unless the slicer is synced. A slicer sets the filter context for its own page only.'
  },
  'DAXFilterHierarchy.html': {
    task: 'Show the measure below in a table by DimProduct[Department], next to Net Sales.',
    code: "Food Sales = CALCULATE([Net Sales], KEEPFILTERS('DimProduct'[Department] = \"Food\"))",
    expect: 'The Food row shows ₹6,31,24,621.24 and every other row is blank. KEEPFILTERS adds to the filter already flowing in.',
    wrong: "Food Sales = CALCULATE([Net Sales], 'DimProduct'[Department] = \"Food\")",
    wrongAs: 'Remove KEEPFILTERS.',
    why: 'Now every row shows ₹6,31,24,621.24, even Beverages. CALCULATE replaced the filter on Department instead of combining with it.'
  },
  'ContextTransitionLab.html': {
    task: 'Find average sales per customer. [Net Sales] is a measure, so a hidden CALCULATE turns each customer row into a filter.',
    code: "Avg per Customer = AVERAGEX(VALUES('DimCustomer'[CustomerKey]), [Net Sales])",
    expect: 'In a card: ₹5,19,314.32, across 340 customers.',
    wrong: "Bad Avg = AVERAGEX(VALUES('DimCustomer'[CustomerKey]), SUM('FactSales'[NetSales]))",
    wrongAs: 'Replace the measure with a bare SUM.',
    why: 'It shows ₹17,65,66,868.01, the whole company. Without CALCULATE the customer row never becomes a filter, so every customer gets the grand total.'
  },
  'AllVsAllexceptVsAllselectedLab.html': {
    task: 'Show each department’s share of all sales, in a table by DimProduct[Department].',
    code: "% of All = DIVIDE([Net Sales], CALCULATE([Net Sales], ALL('DimProduct')))",
    expect: 'Food 35.75%, Beverages 23.07%, Baby & Wellness 3.42%, total 100%.',
    wrong: "Bad % = DIVIDE([Net Sales], CALCULATE([Net Sales], ALL('DimProduct'[Category])))",
    wrongAs: 'Clear only the Category column.',
    why: 'Every row reads 100%. The visual filters Department, and that filter was never removed, so each department divides by itself.'
  },
  'DateFilterContextTrain.html': {
    task: 'Show last year’s sales in a table by DateTable[FiscalYear].',
    code: "Sales PY = CALCULATE([Net Sales], SAMEPERIODLASTYEAR('DateTable'[Date]))",
    expect: 'FY 2025-26 shows ₹8,56,02,395.92, which is FY 2024-25’s Net Sales. FY 2024-25 is blank.',
    wrong: "Sales PY = CALCULATE([Net Sales], SAMEPERIODLASTYEAR('DateTable'[Date]))",
    wrongAs: 'Look at the FY 2026-27 row of the same table.',
    why: 'It shows ₹9,09,64,472.09, though that year has no sales yet: the date table runs ahead of the data. Wrap it as IF(ISBLANK([Net Sales]), BLANK(), [Sales PY]) to hide it.'
  },
  'StarSchema.html': {
    task: 'Count the customers who bought from each department, in a table by DimProduct[Department].',
    code: "Customers Bought = DISTINCTCOUNT('FactSales'[CustomerKey])",
    expect: 'Baby & Wellness 273, Dairy & Chilled 338, and the other four departments 340.',
    wrong: "Bad Customers = COUNTROWS('DimCustomer')",
    wrongAs: 'Count the dimension table instead.',
    why: 'Every row reads 340. The filter flows from Product to Sales and stops there, because it does not travel up to Customer. Counting in the fact table solves this without a two-way relationship.'
  },
  'RelationshipsAndCalcGroups.html': {
    task: 'Show sales by delivery date, in a table by DateTable[FiscalYear] next to Net Sales.',
    code: "Sales by Delivery = CALCULATE([Net Sales], USERELATIONSHIP('FactSales'[DeliveryDate], 'DateTable'[Date]))",
    expect: 'FY 2025-26: ₹9,11,04,327.10 by delivery against ₹9,09,64,472.09 by order. FY 2026-27 shows ₹4,13,521.47, for March orders delivered in April 2026.',
    wrong: "Bad Delivery = CALCULATE([Net Sales], USERELATIONSHIP('DateTable'[Date], 'FactSales'[OrderDate]))",
    wrongAs: 'Name the relationship that is already active.',
    why: 'The figures match Net Sales exactly, so nothing looks wrong. Always compare against the ordinary figure to prove the switch happened.'
  }
};

(function () {
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function codeBlock(code) {
    var wrap = el('div', 'ti-code');
    wrap.appendChild(el('code', '', code));
    var copy = el('button', 'ti-copy', 'Copy');
    copy.type = 'button';
    copy.setAttribute('aria-label', 'Copy this DAX');
    copy.addEventListener('click', function () {
      function done(msg) { copy.textContent = msg; setTimeout(function () { copy.textContent = 'Copy'; }, 1500); }
      // The clipboard API needs a secure context, so a local file falls back to a message.
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(function () { done('Copied'); }, function () { done('Select and copy'); });
      else done('Select and copy');
    });
    wrap.appendChild(copy);
    return wrap;
  }

  function init() {
    var file = location.pathname.split('/').pop();
    var t = window.SRG_TRYIT[file];
    if (!t) return;
    var root = el('section', 'tryit');
    root.setAttribute('aria-labelledby', 'tryit-title');
    root.appendChild(el('p', 'ti-kicker', 'Try it in Power BI'));
    var h = el('h2', '', 'Now prove it on real data');
    h.id = 'tryit-title';
    root.appendChild(h);
    var lead = el('p', 'ti-lead', 'Use the free H Mart report. You do not need to save anything. ');
    var a = el('a', '', 'Download the PBIX');
    var inPages = location.pathname.indexOf('/pages/') !== -1;
    a.href = (inPages ? '' : 'pages/') + 'HMartCaseStudy.html#downloads';
    lead.appendChild(a);
    root.appendChild(lead);
    root.appendChild(el('p', '', t.task));
    root.appendChild(codeBlock(t.code));
    var ex = el('p', 'ti-expect');
    ex.appendChild(el('strong', '', 'Expected: '));
    ex.appendChild(document.createTextNode(t.expect));
    root.appendChild(ex);
    var d = el('details', 'ti-mistake');
    d.appendChild(el('summary', '', 'Try this mistake, then diagnose it'));
    d.appendChild(el('p', '', t.wrongAs));
    d.appendChild(codeBlock(t.wrong));
    var why = el('p', '');
    why.appendChild(el('strong', '', 'What happens: '));
    why.appendChild(document.createTextNode(t.why));
    d.appendChild(why);
    root.appendChild(d);
    var footer = document.querySelector('.srg-footer');
    if (footer) footer.parentNode.insertBefore(root, footer);
    else document.body.appendChild(root);
  }
  // This script loads before quiz.js, so the box sits above the quick challenge.
  if (document.readyState === 'complete') init(); else document.addEventListener('DOMContentLoaded', init);
})();
