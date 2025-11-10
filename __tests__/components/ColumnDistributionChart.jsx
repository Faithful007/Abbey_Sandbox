"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

function isNum(s) {
  if (!s && s !== 0) return false;
  const n = parseFloat(String(s));
  return !isNaN(n) && isFinite(n);
}

function buildHistogram(values) {
  const nums = values.filter(isNum).map(v => parseFloat(v));
  if (nums.length === 0) return [];
  
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return [{ name: String(min), count: nums.length }];
  
  const bins = 10;
  const width = (max - min) / bins;
  const buckets = Array(bins).fill(0);
  
  nums.forEach(n => {
    let idx = Math.floor((n - min) / width);
    if (idx >= bins) idx = bins - 1;
    buckets[idx]++;
  });
  
  return buckets.map((count, i) => ({
    name: `${(min + i * width).toFixed(1)}`,
    count
  }));
}

function buildCategorical(values) {
  const counts = {};
  values.forEach(v => {
    const key = v === null || v === undefined || v === "" ? "(empty)" : String(v);
    counts[key] = (counts[key] || 0) + 1;
  });
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

function buildScatter(values) {
  return values
    .map((v, i) => ({ x: i, y: isNum(v) ? parseFloat(v) : null }))
    .filter(p => p.y !== null);
}

export default function ColumnDistributionChart({ header, values }) {
  const [chartType, setChartType] = useState("histogram");

  const isNumeric = useMemo(() => {
    const sample = values.slice(0, 100);
    return sample.filter(isNum).length / sample.length > 0.5;
  }, [values]);

  const data = useMemo(() => {
    if (chartType === "scatter") return buildScatter(values);
    if (isNumeric) return buildHistogram(values);
    return buildCategorical(values);
  }, [chartType, isNumeric, values]);

  if (!data || data.length === 0) {
    return (
      <div className="border rounded p-4 bg-white">
        <h3 className="font-bold text-sm mb-2">{header}</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">No data</div>
      </div>
    );
  }

  return (
    <div className="border rounded p-4 bg-white">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">{header}</h3>
        <select
          value={chartType}
          onChange={e => setChartType(e.target.value)}
          className="text-xs border rounded px-2 py-1"
        >
          <option value="histogram">Histogram</option>
          <option value="bar">Bar</option>
          <option value="line">Line</option>
          <option value="pie">Pie</option>
          {isNumeric && <option value="scatter">Scatter</option>}
        </select>
      </div>

      <div className="w-full" style={{ height: "280px" }}>
        {(chartType === "histogram" || chartType === "bar") && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={70}
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === "line" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={70}
                tick={{ fontSize: 10 }}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartType === "pie" && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}

        {chartType === "scatter" && (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="Index" tick={{ fontSize: 10 }} />
              <YAxis type="number" dataKey="y" name="Value" tick={{ fontSize: 10 }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={data} fill="#6366f1" />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="text-xs text-gray-500 mt-2">
        {isNumeric ? "Numeric" : "Categorical"} • {values.length} rows • {chartType}
      </div>
    </div>
  );
}

// /**
//  * ColumnDistributionChart Component
//  * 
//  * Features:
//  * - Renders distribution charts for a single CSV column
//  * - Default chart type: Histogram (for numeric) or Bar (for categorical)
//  * - User can select: Histogram, Bar, Line, Pie, Scatter
//  * - Automatic numeric vs categorical detection
//  * - Bins numeric data using Sturges' rule
//  * - Groups long-tail categories into "Other"
//  * - Scatter plot only available for numeric columns
//  * 
//  * Props:
//  * @param {string} header - Column name
//  * @param {array} values - Array of raw cell values for this column
//  */



// import React, { useMemo, useState, useEffect } from "react";
// import {
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   LineChart,
//   Line,
//   PieChart,
//   Pie,
//   Cell,
//   ScatterChart,
//   Scatter,
//   XAxis,
//   YAxis,
//   Tooltip,
//   CartesianGrid,
//   LabelList,
//   Legend,
// } from "recharts";

// // Maximum number of categories to display before grouping into "Other"
// const MAX_CATEGORIES_DISPLAY = 15;

// // Color palette for pie chart slices
// const PIE_COLORS = [
//   "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6",
//   "#f97316", "#84cc16", "#0ea5e9", "#d946ef", "#dc2626", "#0891b2",
//   "#166534", "#6d28d9", "#4f46e5", "#9333ea"
// ];

// /**
//  * Check if a string value can be parsed as a finite number
//  */
// function isNumericString(s) {
//   if (s === null || s === undefined) return false;
//   const n = parseFloat(String(s).trim());
//   return Number.isFinite(n);
// }

// /**
//  * Build histogram bins for numeric data
//  * Uses Sturges' rule: bins = log2(n) + 1, capped between 5 and 25
//  */
// function buildNumericHistogram(values) {
//   const nums = values
//     .map(v => (isNumericString(v) ? parseFloat(v) : null))
//     .filter(v => v !== null);

//   if (nums.length === 0) return [];

//   const n = nums.length;
//   const min = Math.min(...nums);
//   const max = Math.max(...nums);

//   // Handle constant column (all values the same)
//   if (min === max) {
//     return [{ name: `${min}`, count: n, start: min, end: max }];
//   }

//   // Calculate number of bins using Sturges' rule
//   const binsCount = Math.max(5, Math.min(25, Math.ceil(Math.log2(n) + 1)));
//   const binWidth = (max - min) / binsCount;

//   // Initialize bins
//   const bins = Array.from({ length: binsCount }, (_, i) => ({
//     start: min + i * binWidth,
//     end: min + (i + 1) * binWidth,
//     count: 0
//   }));

//   // Populate bins with counts
//   nums.forEach(x => {
//     let idx = Math.floor((x - min) / binWidth);
//     if (idx >= bins.length) idx = bins.length - 1; // Include max in last bin
//     bins[idx].count += 1;
//   });

//   // Format for Recharts
//   return bins.map(b => ({
//     name: `${b.start.toFixed(2)}–${b.end.toFixed(2)}`,
//     count: b.count,
//     start: b.start,
//     end: b.end
//   }));
// }

// /**
//  * Build categorical frequency counts
//  * Top N categories shown individually, rest grouped as "Other"
//  */
// function buildCategoricalCounts(values) {
//   const counts = new Map();

//   values.forEach(raw => {
//     const key = (raw === undefined || raw === null || String(raw).trim() === "")
//       ? "(empty)"
//       : String(raw).trim();
//     counts.set(key, (counts.get(key) || 0) + 1);
//   });

//   // Sort by frequency descending
//   const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
//   const top = sorted.slice(0, MAX_CATEGORIES_DISPLAY);
//   const tail = sorted.slice(MAX_CATEGORIES_DISPLAY);
//   const tailTotal = tail.reduce((acc, [, count]) => acc + count, 0);

//   const data = top.map(([name, count]) => ({ name, count }));
//   if (tailTotal > 0) data.push({ name: "Other", count: tailTotal });

//   return data;
// }

// /**
//  * Build scatter plot data points (index vs value)
//  * Only for numeric columns
//  */
// function buildScatterPoints(values) {
//   const points = [];
//   values.forEach((v, i) => {
//     if (isNumericString(v)) {
//       points.push({ x: i, y: parseFloat(v) });
//     }
//   });
//   return points;
// }

// /**
//  * Sanitize chart type selection:
//  * - Falls back to "histogram" if invalid or incompatible
//  * - Prevents scatter for categorical columns
//  */
// function sanitizeChartType(requested, isNumeric) {
//   const allowed = ["histogram", "bar", "line", "pie", "scatter"];
  
//   // If no selection or invalid, default to histogram
//   if (!requested || !allowed.includes(requested)) {
//     return "histogram";
//   }
  
//   // Scatter only works for numeric columns
//   if (requested === "scatter" && !isNumeric) {
//     return "histogram";
//   }
  
//   return requested;
// }

// export default function ColumnDistributionChart({ header, values }) {
//   // User's chart selection (empty string = default histogram)
//   const [rawChartType, setRawChartType] = useState("");
//   const [mounted, setMounted] = useState(false);

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   /**
//    * Determine if column is numeric based on sample
//    * Considers numeric if >= 60% of sampled values are parseable numbers
//    */
//   const isNumeric = useMemo(() => {
//     const sample = values.slice(0, Math.min(300, values.length));
//     if (sample.length === 0) return false;
//     const numericCount = sample.filter(isNumericString).length;
//     return numericCount / sample.length >= 0.6;
//   }, [values]);

//   /**
//    * Precompute all possible data representations
//    * Only computed once when values or type changes
//    */
//   const { histogramBins, categoricalCounts, scatterPoints } = useMemo(() => {
//     if (isNumeric) {
//       return {
//         histogramBins: buildNumericHistogram(values),
//         categoricalCounts: [],
//         scatterPoints: buildScatterPoints(values)
//       };
//     } else {
//       return {
//         histogramBins: [],
//         categoricalCounts: buildCategoricalCounts(values),
//         scatterPoints: []
//       };
//     }
//   }, [values, isNumeric]);

//   // Apply fallback logic to ensure valid chart type
//   const chartType = sanitizeChartType(rawChartType, isNumeric);

//   /**
//    * Select the appropriate dataset for the current chart type
//    */
//   const activeData = useMemo(() => {
//     if (chartType === "scatter") {
//       return scatterPoints;
//     }
//     return isNumeric ? histogramBins : categoricalCounts;
//   }, [chartType, isNumeric, histogramBins, categoricalCounts, scatterPoints]);

//   /**
//    * Check for warnings (empty data, etc.)
//    */
//   const warning = useMemo(() => {
//     if (activeData.length === 0) {
//       return "No data available for this chart.";
//     }
//     return null;
//   }, [activeData]);

//   if (!mounted) {
//     return (
//       <div className="border rounded-lg p-4 bg-white flex flex-col">
//         <div className="h-64 flex items-center justify-center text-gray-400">
//           Loading chart...
//         </div>
//       </div>
//     );
//   }

//   /**
//    * Render the selected chart type
//    */
//   function renderChart() {
//     // Show warning if data is unavailable
//     if (warning) {
//       return (
//         <div className="flex items-center justify-center h-full">
//           <div className="text-xs text-red-600 p-2 border border-red-200 rounded bg-red-50">
//             {warning}
//           </div>
//         </div>
//       );
//     }

//     switch (chartType) {
//       case "histogram":
//       case "bar":
//         return (
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart data={activeData} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis
//                 dataKey="name"
//                 interval={0}
//                 angle={-45}
//                 textAnchor="end"
//                 tick={{ fontSize: 10 }}
//                 height={80}
//               />
//               <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
//               <Tooltip />
//               <Bar dataKey="count" fill={chartType === "histogram" ? "#6366f1" : "#10b981"}>
//                 {activeData.length <= 12 && (
//                   <LabelList dataKey="count" position="top" fontSize={10} />
//                 )}
//               </Bar>
//             </BarChart>
//           </ResponsiveContainer>
//         );

//       case "line":
//         return (
//           <ResponsiveContainer width="100%" height="100%">
//             <LineChart data={activeData} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis
//                 dataKey="name"
//                 interval={0}
//                 angle={-45}
//                 textAnchor="end"
//                 tick={{ fontSize: 10 }}
//                 height={80}
//               />
//               <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
//               <Tooltip />
//               <Line
//                 type="monotone"
//                 dataKey="count"
//                 stroke="#ef4444"
//                 strokeWidth={2}
//                 dot={{ fill: "#ef4444", r: 4 }}
//               />
//             </LineChart>
//           </ResponsiveContainer>
//         );

//       case "pie":
//         return (
//           <ResponsiveContainer width="100%" height="100%">
//             <PieChart>
//               <Tooltip />
//               <Pie
//                 data={activeData}
//                 dataKey="count"
//                 nameKey="name"
//                 cx="50%"
//                 cy="50%"
//                 outerRadius={80}
//                 label={({ name, percent }) => 
//                   activeData.length <= 8 ? `${name}: ${(percent * 100).toFixed(0)}%` : null
//                 }
//                 labelLine={activeData.length <= 8}
//               >
//                 {activeData.map((entry, i) => (
//                   <Cell key={`pie-cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
//                 ))}
//               </Pie>
//               <Legend 
//                 verticalAlign="bottom" 
//                 height={36}
//                 wrapperStyle={{ fontSize: '11px' }}
//               />
//             </PieChart>
//           </ResponsiveContainer>
//         );

//       case "scatter":
//         return (
//           <ResponsiveContainer width="100%" height="100%">
//             <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis
//                 type="number"
//                 dataKey="x"
//                 name="Row Index"
//                 tick={{ fontSize: 11 }}
//                 label={{ value: 'Row Index', position: 'bottom', offset: 0 }}
//               />
//               <YAxis
//                 type="number"
//                 dataKey="y"
//                 name="Value"
//                 tick={{ fontSize: 11 }}
//                 label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
//               />
//               <Tooltip cursor={{ strokeDasharray: "3 3" }} />
//               <Scatter 
//                 name={header} 
//                 data={activeData} 
//                 fill="#6366f1"
//                 shape="circle"
//               />
//             </ScatterChart>
//           </ResponsiveContainer>
//         );

//       default:
//         return (
//           <div className="flex items-center justify-center h-full text-gray-400">
//             Select a chart type
//           </div>
//         );
//     }
//   }

//   return (
//     <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
//       {/* Header with chart type selector */}
//       <div className="flex items-center justify-between mb-3 gap-2">
//         <h3 className="font-semibold text-sm sm:text-base text-indigo-700 truncate">
//           {header}
//         </h3>
//         <select
//           className="text-xs sm:text-sm border border-gray-300 rounded px-2 py-1 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
//           value={rawChartType}
//           onChange={(e) => setRawChartType(e.target.value)}
//           title="Select chart type (defaults to histogram)"
//         >
//           <option value="">Histogram (default)</option>
//           <option value="histogram">Histogram</option>
//           <option value="bar">Bar</option>
//           <option value="line">Line</option>
//           <option value="pie">Pie</option>
//           <option value="scatter" disabled={!isNumeric}>
//             Scatter {!isNumeric && "(numeric only)"}
//           </option>
//         </select>
//       </div>

//       {/* Chart rendering area - fixed height for proper rendering */}
//       <div className="h-80 w-full">
//         {renderChart()}
//       </div>

//       {/* Footer with metadata */}
//       <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 space-y-1">
//         <div>
//           Type: <span className="font-medium text-gray-700">{isNumeric ? "Numeric" : "Categorical"}</span> | 
//           Rows: <span className="font-medium text-gray-700">{values.length}</span> | 
//           Chart: <span className="font-medium text-gray-700">{chartType}</span>
//         </div>
//         <div className="text-gray-400 italic">
//           {chartType === "histogram" && "Histogram shows distribution across auto-generated bins"}
//           {chartType === "bar" && "Bar chart of frequency counts"}
//           {chartType === "line" && "Line chart connecting frequency points"}
//           {chartType === "pie" && "Pie chart showing proportional distribution"}
//           {chartType === "scatter" && "Scatter plot of raw values vs row index"}
//         </div>
//       </div>
//     </div>
//   );
// }

// // /**
// //  * ColumnDistributionChart.jsx
// //  * Reusable chart for a single column.
// //  * Default chart type: histogram (numeric) / bar (categorical).
// //  * User can switch: histogram, bar, line, pie, scatter (scatter only numeric).
// //  */

// // import React, { useMemo, useState } from "react";
// // import {
// //   ResponsiveContainer,
// //   BarChart,
// //   Bar,
// //   LineChart,
// //   Line,
// //   PieChart,
// //   Pie,
// //   Cell,
// //   ScatterChart,
// //   Scatter,
// //   XAxis,
// //   YAxis,
// //   Tooltip,
// //   CartesianGrid,
// //   LabelList,
// //   Legend,
// // } from "recharts";

// // const MAX_CATEGORIES_DISPLAY = 15;
// // const PIE_COLORS = [
// //   "#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#14b8a6",
// //   "#f97316","#84cc16","#0ea5e9","#d946ef","#dc2626","#0891b2",
// //   "#166534","#6d28d9","#4f46e5","#9333ea"
// // ];

// // function isNumericString(s) {
// //   if (s === null || s === undefined) return false;
// //   const n = parseFloat(String(s).trim());
// //   return Number.isFinite(n);
// // }

// // function buildNumericHistogram(values) {
// //   const nums = values.map(v => (isNumericString(v) ? parseFloat(v) : null)).filter(v => v !== null);
// //   if (nums.length === 0) return { bins: [] };
// //   const n = nums.length;
// //   const min = Math.min(...nums);
// //   const max = Math.max(...nums);
// //   if (min === max) {
// //     return { bins: [{ name: `${min}`, count: n, start: min, end: max }] };
// //   }
// //   const rawBins = Math.log2(n) + 1;
// //   const binCount = Math.max(5, Math.min(25, Math.ceil(rawBins)));
// //   const width = (max - min) / binCount;
// //   const bins = Array.from({ length: binCount }, (_, i) => {
// //     const start = min + i * width;
// //     const end = min + (i + 1) * width;
// //     return { start, end, count: 0 };
// //   });
// //   nums.forEach(x => {
// //     let idx = Math.floor((x - min) / width);
// //     if (idx >= bins.length) idx = bins.length - 1;
// //     bins[idx].count += 1;
// //   });
// //   return {
// //     bins: bins.map(b => ({
// //       name: `${b.start.toFixed(2)}–${b.end.toFixed(2)}`,
// //       count: b.count,
// //       start: b.start,
// //       end: b.end
// //     }))
// //   };
// // }

// // function buildCategoricalCounts(values) {
// //   const counts = new Map();
// //   values.forEach(raw => {
// //     const key = (raw === undefined || raw === null || String(raw).trim() === "")
// //       ? "(empty)"
// //       : String(raw).trim();
// //     counts.set(key, (counts.get(key) || 0) + 1);
// //   });
// //   const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
// //   const top = sorted.slice(0, MAX_CATEGORIES_DISPLAY);
// //   const tail = sorted.slice(MAX_CATEGORIES_DISPLAY);
// //   const tailTotal = tail.reduce((acc, [, c]) => acc + c, 0);
// //   const data = top.map(([name, count]) => ({ name, count }));
// //   if (tailTotal > 0) data.push({ name: "Other", count: tailTotal });
// //   return data;
// // }

// // function buildScatterPoints(values) {
// //   const pts = [];
// //   values.forEach((v, i) => {
// //     if (isNumericString(v)) pts.push({ x: i, y: parseFloat(v) });
// //   });
// //   return pts;
// // }

// // export default function ColumnDistributionChart({ header, values }) {
// //   const [chartType, setChartType] = useState("histogram");

// //   const isNumeric = useMemo(() => {
// //     const sample = values.slice(0, Math.min(300, values.length));
// //     const numericCount = sample.filter(isNumericString).length;
// //     return sample.length > 0 && (numericCount / sample.length >= 0.6);
// //   }, [values]);

// //   const { histogramBins, categoricalCounts, scatterPoints } = useMemo(() => {
// //     let histogramBins = [];
// //     let categoricalCounts = [];
// //     let scatterPoints = [];
// //     if (isNumeric) {
// //       histogramBins = buildNumericHistogram(values).bins;
// //       scatterPoints = buildScatterPoints(values);
// //     } else {
// //       categoricalCounts = buildCategoricalCounts(values);
// //     }
// //     return { histogramBins, categoricalCounts, scatterPoints };
// //   }, [values, isNumeric]);

// //   const activeData = useMemo(() => {
// //     if (chartType === "scatter") return isNumeric ? scatterPoints : [];
// //     if (isNumeric) return histogramBins;
// //     return categoricalCounts;
// //   }, [chartType, isNumeric, histogramBins, categoricalCounts, scatterPoints]);

// //   const compatibilityWarning = useMemo(() => {
// //     if (chartType === "scatter" && !isNumeric) return "Scatter plot only applies to numeric columns.";
// //     if (!activeData.length) return "No data for this chart.";
// //     return null;
// //   }, [chartType, isNumeric, activeData]);

// //   function renderChart() {
// //     if (compatibilityWarning) {
// //       return <div className="text-xs text-red-600 p-2 border border-red-200 rounded bg-red-50">{compatibilityWarning}</div>;
// //     }
// //     switch (chartType) {
// //       case "histogram":
// //       case "bar":
// //         return (
// //           <ResponsiveContainer width="100%" height="100%">
// //             <BarChart data={activeData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
// //               <CartesianGrid strokeDasharray="3 3" />
// //               <XAxis
// //                 dataKey="name"
// //                 angle={activeData.length > 10 ? -30 : 0}
// //                 textAnchor={activeData.length > 10 ? "end" : "middle"}
// //                 interval={0}
// //                 tick={{ fontSize: 11 }}
// //                 height={activeData.length > 10 ? 60 : 40}
// //               />
// //               <YAxis allowDecimals={false} />
// //               <Tooltip />
// //               <Legend />
// //               <Bar dataKey="count" fill={chartType === "histogram" ? "#6366f1" : "#10b981"}>
// //                 {activeData.length <= 12 && <LabelList dataKey="count" position="top" fontSize={11} />}
// //               </Bar>
// //             </BarChart>
// //           </ResponsiveContainer>
// //         );
// //       case "line":
// //         return (
// //           <ResponsiveContainer width="100%" height="100%">
// //             <LineChart data={activeData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
// //               <CartesianGrid strokeDasharray="3 3" />
// //               <XAxis
// //                 dataKey="name"
// //                 angle={activeData.length > 10 ? -30 : 0}
// //                 textAnchor={activeData.length > 10 ? "end" : "middle"}
// //                 interval={0}
// //                 tick={{ fontSize: 11 }}
// //                 height={activeData.length > 10 ? 60 : 40}
// //               />
// //               <YAxis allowDecimals={false} />
// //               <Tooltip />
// //               <Legend />
// //               <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={activeData.length <= 50} />
// //             </LineChart>
// //           </ResponsiveContainer>
// //         );
// //       case "pie":
// //         return (
// //           <ResponsiveContainer width="100%" height="100%">
// //             <PieChart>
// //               <Tooltip />
// //               <Legend />
// //               <Pie data={activeData} dataKey="count" nameKey="name" outerRadius="80%" label={activeData.length <= 12}>
// //                 {activeData.map((entry, i) => (
// //                   <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
// //                 ))}
// //               </Pie>
// //             </PieChart>
// //           </ResponsiveContainer>
// //         );
// //       case "scatter":
// //         return (
// //           <ResponsiveContainer width="100%" height="100%">
// //             <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
// //               <CartesianGrid strokeDasharray="3 3" />
// //               <XAxis type="number" dataKey="x" name="Index" tick={{ fontSize: 11 }} />
// //               <YAxis type="number" dataKey="y" name="Value" tick={{ fontSize: 11 }} />
// //               <Tooltip cursor={{ strokeDasharray: "3 3" }} />
// //               <Legend />
// //               <Scatter name={header} data={activeData} fill="#6366f1" />
// //             </ScatterChart>
// //           </ResponsiveContainer>
// //         );
// //       default:
// //         return <div className="text-xs text-gray-500">Unsupported chart.</div>;
// //     }
// //   }

// //   return (
// //     <div className="border rounded-lg p-4 bg-white flex flex-col">
// //       <div className="flex items-center justify-between mb-3 gap-2">
// //         <h3 className="font-semibold text-sm sm:text-base text-indigo-700 truncate">{header}</h3>
// //         <select
// //           className="text-xs sm:text-sm border rounded px-2 py-1 bg-gray-50"
// //           value={chartType}
// //           onChange={(e) => setChartType(e.target.value)}
// //         >
// //           <option value="histogram">Histogram</option>
// //             <option value="bar">Bar</option>
// //           <option value="line">Line</option>
// //           <option value="pie">Pie</option>
// //           <option value="scatter" disabled={!isNumeric}>Scatter</option>
// //         </select>
// //       </div>
// //       <div className="h-64 mb-2">{renderChart()}</div>
// //       <div className="mt-auto text-xs text-gray-500 space-y-1">
// //         <div>Type: {isNumeric ? "Numeric" : "Categorical"} | Rows: {values.length}</div>
// //       </div>
// //     </div>
// //   );
// // }