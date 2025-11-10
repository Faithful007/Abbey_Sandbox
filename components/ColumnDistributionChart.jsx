"use client";

import React, { useMemo, useState, useCallback } from "react";
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
  ResponsiveContainer,
} from "recharts";

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

function isNum(s) {
  if (!s && s !== 0) return false;
  const n = parseFloat(String(s));
  return !isNaN(n) && isFinite(n);
}

function buildHistogram(values, bins = 10) {
  const nums = values.filter(isNum).map(v => parseFloat(v));
  if (nums.length === 0) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return [{ name: String(min), count: nums.length, binStart: min, binEnd: max }];
  const width = (max - min) / bins;
  const buckets = Array(bins).fill(null).map((_, i) => ({
    binStart: min + i * width,
    binEnd: min + (i + 1) * width,
    count: 0,
    indices: []
  }));
  
  nums.forEach((n, idx) => {
    let binIdx = Math.floor((n - min) / width);
    if (binIdx >= bins) binIdx = bins - 1;
    buckets[binIdx].count++;
    buckets[binIdx].indices.push(idx);
  });
  
  return buckets.map((bucket, i) => ({
    name: `${bucket.binStart.toFixed(1)}`,
    count: bucket.count,
    binStart: bucket.binStart,
    binEnd: bucket.binEnd,
    indices: bucket.indices
  }));
}

function buildCategorical(values, maxCategories = 10) {
  const counts = new Map();
  values.forEach((v, idx) => {
    const key = v === null || v === undefined || v === "" ? "(empty)" : String(v);
    if (!counts.has(key)) {
      counts.set(key, { count: 0, indices: [] });
    }
    counts.get(key).count++;
    counts.get(key).indices.push(idx);
  });
  
  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, maxCategories);
  
  return sorted.map(([name, data]) => ({ 
    name, 
    count: data.count, 
    indices: data.indices 
  }));
}

function buildScatter(values, pointSize = 5) {
  return values
    .map((v, i) => ({ x: i, y: isNum(v) ? parseFloat(v) : null, size: pointSize, index: i }))
    .filter(p => p.y !== null);
}

export default function ColumnDistributionChart({ header, values, onValueChange }) {
  const [chartType, setChartType] = useState("histogram");
  const [bins, setBins] = useState(10);
  const [maxCategories, setMaxCategories] = useState(10);
  const [pointSize, setPointSize] = useState(5);
  const [barWidth, setBarWidth] = useState(20);
  const [lineWidth, setLineWidth] = useState(2);
  const [pieRadius, setPieRadius] = useState(80);
  const [draggedItem, setDraggedItem] = useState(null);

  const isNumeric = useMemo(() => {
    const sample = values.slice(0, 100);
    return sample.filter(isNum).length / sample.length > 0.5;
  }, [values]);

  const data = useMemo(() => {
    if (chartType === "scatter") return buildScatter(values, pointSize);
    if (isNumeric) return buildHistogram(values, bins);
    return buildCategorical(values, maxCategories);
  }, [chartType, isNumeric, values, bins, maxCategories, pointSize]);

  // Handle bar click to enable editing
  const handleBarClick = useCallback((data, index) => {
    if (!data || !data.indices) return;
    
    const newValue = prompt(
      `Edit value for ${data.name}\nCurrent count: ${data.count}\nEnter new value for all ${data.count} items:`,
      data.indices.length > 0 ? values[data.indices[0]] : ""
    );
    
    if (newValue !== null && onValueChange) {
      data.indices.forEach(idx => {
        onValueChange(idx, newValue);
      });
    }
  }, [values, onValueChange]);

  // Handle scatter point drag
  const handleScatterClick = useCallback((data) => {
    if (!data || data.index === undefined) return;
    
    const newValue = prompt(
      `Edit value at row ${data.index}\nCurrent value: ${data.y}`,
      data.y
    );
    
    if (newValue !== null && onValueChange) {
      onValueChange(data.index, newValue);
    }
  }, [onValueChange]);

  if (!data || data.length === 0) {
    return (
      <div className="border rounded p-4 bg-white">
        <h3 className="font-bold text-sm mb-2">{header}</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">No data</div>
      </div>
    );
  }

  const CustomBar = (props) => {
    const { x, y, width, height, fill, payload, index } = props;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={fill}
          style={{ cursor: 'pointer' }}
          onClick={() => handleBarClick(payload, index)}
          onMouseEnter={(e) => e.target.style.opacity = 0.7}
          onMouseLeave={(e) => e.target.style.opacity = 1}
        />
      </g>
    );
  };

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={pointSize}
        fill="#6366f1"
        style={{ cursor: 'pointer' }}
        onClick={() => handleScatterClick(payload)}
        onMouseEnter={(e) => e.target.setAttribute('r', pointSize + 2)}
        onMouseLeave={(e) => e.target.setAttribute('r', pointSize)}
      />
    );
  };

  return (
    <div className="border rounded p-4 bg-white">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-sm">{header}</h3>
        <select value={chartType} onChange={e => setChartType(e.target.value)} className="text-xs border rounded px-2 py-1">
          <option value="histogram">Histogram</option>
          <option value="bar">Bar</option>
          <option value="line">Line</option>
          <option value="pie">Pie</option>
          {isNumeric && <option value="scatter">Scatter</option>}
        </select>
      </div>

      <div className="mb-1 text-xs text-blue-600 italic">
        Click on {chartType === "scatter" ? "points" : "bars"} to edit values
      </div>

      <div className="mb-2 flex flex-wrap gap-3 text-xs">
        {isNumeric && (chartType === "histogram" || chartType === "bar") && (
          <label className="flex items-center gap-1">
            Bins:
            <input type="range" min="5" max="30" value={bins} onChange={e => setBins(parseInt(e.target.value))} className="w-20" />
            <span className="text-gray-600">{bins}</span>
          </label>
        )}
        
        {!isNumeric && (chartType === "bar" || chartType === "line" || chartType === "pie") && (
          <label className="flex items-center gap-1">
            Categories:
            <input type="range" min="5" max="20" value={maxCategories} onChange={e => setMaxCategories(parseInt(e.target.value))} className="w-20" />
            <span className="text-gray-600">{maxCategories}</span>
          </label>
        )}

        {(chartType === "histogram" || chartType === "bar") && (
          <label className="flex items-center gap-1">
            Bar Width:
            <input type="range" min="10" max="50" value={barWidth} onChange={e => setBarWidth(parseInt(e.target.value))} className="w-20" />
            <span className="text-gray-600">{barWidth}px</span>
          </label>
        )}

        {chartType === "line" && (
          <label className="flex items-center gap-1">
            Line Width:
            <input type="range" min="1" max="5" value={lineWidth} onChange={e => setLineWidth(parseInt(e.target.value))} className="w-20" />
            <span className="text-gray-600">{lineWidth}px</span>
          </label>
        )}

        {chartType === "pie" && (
          <label className="flex items-center gap-1">
            Pie Radius:
            <input type="range" min="50" max="120" value={pieRadius} onChange={e => setPieRadius(parseInt(e.target.value))} className="w-20" />
            <span className="text-gray-600">{pieRadius}px</span>
          </label>
        )}

        {chartType === "scatter" && (
          <label className="flex items-center gap-1">
            Point Size:
            <input type="range" min="2" max="15" value={pointSize} onChange={e => setPointSize(parseInt(e.target.value))} className="w-20" />
            <span className="text-gray-600">{pointSize}px</span>
          </label>
        )}
      </div>

      <div className="w-full" style={{ height: "280px" }}>
        {(chartType === "histogram" || chartType === "bar") && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} interval={0} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar 
                dataKey="count" 
                fill={chartType === "histogram" ? "#6366f1" : "#10b981"} 
                barSize={barWidth}
                shape={<CustomBar />}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === "line" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#ef4444" 
                strokeWidth={lineWidth}
                dot={{ r: lineWidth + 1, style: { cursor: 'pointer' } }}
                onClick={handleBarClick}
              />
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
                outerRadius={pieRadius} 
                label={data.length <= 8}
                onClick={(data, index) => handleBarClick(data, index)}
                style={{ cursor: 'pointer' }}
              >
                {data.map((entry, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
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
              <Scatter 
                data={data} 
                fill="#6366f1" 
                shape={<CustomDot />}
              />
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

// "use client";

// import React, { useMemo, useState } from "react";
// import {
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
//   ResponsiveContainer,
// } from "recharts";

// const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

// function isNum(s) {
//   if (!s && s !== 0) return false;
//   const n = parseFloat(String(s));
//   return !isNaN(n) && isFinite(n);
// }

// function buildHistogram(values, bins = 10) {
//   const nums = values.filter(isNum).map(v => parseFloat(v));
//   if (nums.length === 0) return [];
//   const min = Math.min(...nums);
//   const max = Math.max(...nums);
//   if (min === max) return [{ name: String(min), count: nums.length }];
//   const width = (max - min) / bins;
//   const buckets = Array(bins).fill(0);
//   nums.forEach(n => {
//     let idx = Math.floor((n - min) / width);
//     if (idx >= bins) idx = bins - 1;
//     buckets[idx]++;
//   });
//   return buckets.map((count, i) => ({
//     name: `${(min + i * width).toFixed(1)}`,
//     count
//   }));
// }

// function buildCategorical(values, maxCategories = 10) {
//   const counts = {};
//   values.forEach(v => {
//     const key = v === null || v === undefined || v === "" ? "(empty)" : String(v);
//     counts[key] = (counts[key] || 0) + 1;
//   });
//   return Object.entries(counts)
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, maxCategories)
//     .map(([name, count]) => ({ name, count }));
// }

// function buildScatter(values) {
//   return values
//     .map((v, i) => ({ x: i, y: isNum(v) ? parseFloat(v) : null }))
//     .filter(p => p.y !== null);
// }

// export default function ColumnDistributionChart({ header, values }) {
//   const [chartType, setChartType] = useState("histogram");
//   const [bins, setBins] = useState(10);
//   const [maxCategories, setMaxCategories] = useState(10);

//   const isNumeric = useMemo(() => {
//     const sample = values.slice(0, 100);
//     return sample.filter(isNum).length / sample.length > 0.5;
//   }, [values]);

//   const data = useMemo(() => {
//     if (chartType === "scatter") return buildScatter(values);
//     if (isNumeric) return buildHistogram(values, bins);
//     return buildCategorical(values, maxCategories);
//   }, [chartType, isNumeric, values, bins, maxCategories]);

//   if (!data || data.length === 0) {
//     return (
//       <div className="border rounded p-4 bg-white">
//         <h3 className="font-bold text-sm mb-2">{header}</h3>
//         <div className="h-64 flex items-center justify-center text-gray-400">No data</div>
//       </div>
//     );
//   }

//   return (
//     <div className="border rounded p-4 bg-white">
//       <div className="flex justify-between items-center mb-2">
//         <h3 className="font-bold text-sm">{header}</h3>
//         <select value={chartType} onChange={e => setChartType(e.target.value)} className="text-xs border rounded px-2 py-1">
//           <option value="histogram">Histogram</option>
//           <option value="bar">Bar</option>
//           <option value="line">Line</option>
//           <option value="pie">Pie</option>
//           {isNumeric && <option value="scatter">Scatter</option>}
//         </select>
//       </div>
//       <div className="mb-2 flex gap-3 text-xs">
//         {(chartType === "histogram" && isNumeric) && (
//           <label className="flex items-center gap-1">
//             Bins: <input type="range" min="5" max="30" value={bins} onChange={e => setBins(parseInt(e.target.value))} className="w-20" />
//             <span className="text-gray-600">{bins}</span>
//           </label>
//         )}
//         {(chartType === "bar" || chartType === "pie") && !isNumeric && (
//           <label className="flex items-center gap-1">
//             Categories: <input type="range" min="5" max="20" value={maxCategories} onChange={e => setMaxCategories(parseInt(e.target.value))} className="w-20" />
//             <span className="text-gray-600">{maxCategories}</span>
//           </label>
//         )}
//       </div>
//       <div className="w-full" style={{ height: "280px" }}>
//         {(chartType === "histogram" || chartType === "bar") && (
//           <ResponsiveContainer width="100%" height="100%">
//             <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} interval={0} tick={{ fontSize: 10 }} />
//               <YAxis tick={{ fontSize: 10 }} />
//               <Tooltip />
//               <Bar dataKey="count" fill="#6366f1" />
//             </BarChart>
//           </ResponsiveContainer>
//         )}
//         {chartType === "line" && (
//           <ResponsiveContainer width="100%" height="100%">
//             <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 10 }} />
//               <YAxis tick={{ fontSize: 10 }} />
//               <Tooltip />
//               <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} />
//             </LineChart>
//           </ResponsiveContainer>
//         )}
//         {chartType === "pie" && (
//           <ResponsiveContainer width="100%" height="100%">
//             <PieChart>
//               <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
//                 {data.map((entry, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         )}
//         {chartType === "scatter" && (
//           <ResponsiveContainer width="100%" height="100%">
//             <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis type="number" dataKey="x" name="Index" tick={{ fontSize: 10 }} />
//               <YAxis type="number" dataKey="y" name="Value" tick={{ fontSize: 10 }} />
//               <Tooltip cursor={{ strokeDasharray: "3 3" }} />
//               <Scatter data={data} fill="#6366f1" />
//             </ScatterChart>
//           </ResponsiveContainer>
//         )}
//       </div>
//       <div className="text-xs text-gray-500 mt-2">
//         {isNumeric ? "Numeric" : "Categorical"} • {values.length} rows • {chartType}
//       </div>
//     </div>
//   );
// }