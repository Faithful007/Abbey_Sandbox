import React, { useEffect, useMemo, useState, useCallback } from "react";
import ColumnDistributionChart from "../../components/ColumnDistributionChart";

const csvSplit = (line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = csvSplit(lines[0]).map((h) => h.replace(/^"(.*)"$/, "$1").trim());
  const rows = lines.slice(1).map((line) => {
    const parts = csvSplit(line).map((v) => v.replace(/^"(.*)"$/, "$1").trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = parts[i] ?? "";
    });
    return obj;
  });

  return { headers, rows };
}

export default function Dashboard() {
  const [isClient, setIsClient] = useState(false);
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [dataVersion, setDataVersion] = useState(0); // Force chart re-render

  useEffect(() => setIsClient(true), []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.toLowerCase().endsWith(".csv")) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please select a valid .csv file");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { filename } = await uploadRes.json();

      const statsRes = await fetch(`http://localhost:3000/stats/${filename}`);
      if (!statsRes.ok) throw new Error("Failed to calculate statistics");
      const statsData = await statsRes.json();
      setStatistics(statsData);

      const dataRes = await fetch(`http://localhost:3000/uploads/${filename}`);
      if (!dataRes.ok) throw new Error("Failed to load uploaded file");
      const csvText = await dataRes.text();

      const parsed = parseCSV(csvText);
      setHeaders(parsed.headers);
      setData(parsed.rows);
      setDataVersion(0);
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setData(null);
    setHeaders([]);
    setStatistics(null);
    setError(null);
    setEditingCell(null);
    setDataVersion(0);
  };

  const exportJSON = () => {
    const exportData = {
      fileName: file?.name,
      statistics,
      rows: data,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show all rows instead of just 10
  const [showAllRows, setShowAllRows] = useState(false);
  const previewRows = useMemo(() => {
    if (!data) return [];
    return showAllRows ? data : data.slice(0, 20);
  }, [data, showAllRows]);

  const startEdit = (rowIndex, colName, currentValue) => {
    setEditingCell({ rowIndex, colName });
    setEditValue(currentValue);
  };

  const saveEdit = (rowIndex, colName) => {
    if (editingCell) {
      const newData = [...data];
      newData[rowIndex][colName] = editValue;
      setData(newData);
      setEditingCell(null);
      setEditValue("");
      setDataVersion(v => v + 1); // Trigger chart update
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  // Handle value change from chart
  const handleChartValueChange = useCallback((columnName) => {
    return (rowIndex, newValue) => {
      const newData = [...data];
      if (newData[rowIndex]) {
        newData[rowIndex][columnName] = newValue;
        setData(newData);
        setDataVersion(v => v + 1); // Trigger chart update
      }
    };
  }, [data]);

  // Recalculate statistics when data changes
  useEffect(() => {
    if (!data || data.length === 0) return;

    const calculateStats = () => {
      const columnStats = {};
      
      headers.forEach(header => {
        const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== "");
        const numericValues = values.filter(v => !isNaN(parseFloat(v))).map(v => parseFloat(v));
        
        if (numericValues.length > values.length * 0.5) {
          // Numeric column
          const sorted = [...numericValues].sort((a, b) => a - b);
          const sum = numericValues.reduce((acc, val) => acc + val, 0);
          const mean = sum / numericValues.length;
          const median = sorted[Math.floor(sorted.length / 2)];
          const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
          const stdDev = Math.sqrt(variance);
          
          columnStats[header] = {
            count: numericValues.length,
            mean,
            median,
            stdDev,
            min: Math.min(...numericValues),
            max: Math.max(...numericValues)
          };
        } else {
          // Categorical column
          columnStats[header] = {
            count: values.length,
            unique: new Set(values).size
          };
        }
      });

      setStatistics({ columnStats });
    };

    calculateStats();
  }, [data, headers, dataVersion]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6">
          Statistical Analysis Dashboard
        </h1>

        {!data ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer inline-block">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-lg text-gray-600 mb-1">
                  {file ? file.name : "Click to select CSV file"}
                </p>
                <p className="text-sm text-gray-400">CSV files only</p>
              </label>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="mt-6 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? "Analyzing..." : "Analyze Data"}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-gray-600">
                File: <strong>{file?.name}</strong> • Modified: <strong className="text-green-600">{dataVersion > 0 ? 'Yes' : 'No'}</strong>
              </p>
              <div className="space-x-2">
                <button
                  onClick={exportJSON}
                  className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition"
                >
                  Export JSON
                </button>
                <button
                  onClick={handleReset}
                  className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition"
                >
                  New Analysis
                </button>
              </div>
            </div>

            {/* Statistics Overview - Auto-updates */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-3">
                Statistics Overview 
                {dataVersion > 0 && <span className="text-sm text-green-600 ml-2">(Live Updated)</span>}
              </h2>
              {statistics?.columnStats && Object.keys(statistics.columnStats).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(statistics.columnStats).map(([column, stats]) => (
                    <div key={column} className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-semibold text-indigo-600 mb-2">{column}</h3>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Count:</span>
                          <span className="font-medium">{stats.count}</span>
                        </div>
                        {"mean" in stats && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Mean:</span>
                              <span className="font-medium">{Number(stats.mean)?.toFixed?.(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Median:</span>
                              <span className="font-medium">{Number(stats.median)?.toFixed?.(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Std Dev:</span>
                              <span className="font-medium">{Number(stats.stdDev)?.toFixed?.(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Min:</span>
                              <span className="font-medium">{Number(stats.min)?.toFixed?.(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Max:</span>
                              <span className="font-medium">{Number(stats.max)?.toFixed?.(2)}</span>
                            </div>
                          </>
                        )}
                        {"unique" in stats && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Unique:</span>
                            <span className="font-medium">{stats.unique}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No statistics available.</p>
              )}
            </div>

            {/* Editable Data Preview */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold">Data Preview (Editable)</h2>
                {data.length > 20 && (
                  <button
                    onClick={() => setShowAllRows(!showAllRows)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                  >
                    {showAllRows ? 'Show Less' : `Show All ${data.length} Rows`}
                  </button>
                )}
              </div>
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Double-click any cell to edit. Press Enter to save or Escape to cancel. 
                  Changes will automatically update the charts below.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        {headers.map((h) => (
                          <td
                            key={h}
                            className="px-4 py-2 text-sm text-gray-800 cursor-pointer hover:bg-blue-50"
                            onDoubleClick={() => startEdit(idx, h, row[h])}
                            title="Double-click to edit"
                          >
                            {editingCell?.rowIndex === idx && editingCell?.colName === h ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveEdit(idx, h)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(idx, h);
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                autoFocus
                                className="w-full px-2 py-1 border-2 border-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <span className={editingCell?.rowIndex === idx && editingCell?.colName === h ? 'font-bold' : ''}>
                                {row[h]}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Showing {previewRows.length} of {data.length} rows • Double-click any cell to edit
              </p>
            </div>

            {/* Interactive Column Distributions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                Column Distributions (Interactive)
                {dataVersion > 0 && <span className="text-sm text-green-600 ml-2">(Live Updated)</span>}
              </h2>
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>🎯 Interactive Charts:</strong> Click on bars, points, or pie slices to edit values. 
                  All changes sync with the data table above in real-time.
                </p>
              </div>
              {!isClient ? (
                <p className="text-sm text-gray-500">Loading charts…</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {headers.map((h) => (
                    <ColumnDistributionChart
                      key={`${h}-${dataVersion}`}
                      header={h}
                      values={data.map((row) => row[h])}
                      onValueChange={handleChartValueChange(h)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// /**
//  * Dashboard page
//  * - Upload a CSV file to your Express server
//  * - Fetch server-calculated statistics
//  * - Parse the CSV on the client for preview and per‑column distributions
//  * - Render per‑column charts using ColumnDistributionChart (default = histogram)
//  *
//  * Requirements:
//  * - Backend running at http://localhost:3000 (server/server.js)
//  * - Frontend (Next.js) at http://localhost:3001
//  * - Recharts installed: yarn add recharts
//  * - Alias set in jsconfig.json: { "compilerOptions": { "baseUrl": ".", "paths": { "@components/*": ["components/*"] } } }
//  */

// import React, { useEffect, useMemo, useState } from "react";
// import ColumnDistributionChart from "../../components/ColumnDistributionChart";
// // If you didn't set the alias above, use the relative import instead:
// // import ColumnDistributionChart from "../../components/ColumnDistributionChart";

// /** Minimal CSV splitter that respects double quotes.
//  * Splits a line by commas not enclosed in quotes.
//  */
// const csvSplit = (line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

// /** Parse CSV text into [{col: value, ...}, ...]
//  * - Handles CRLF vs LF
//  * - Trims headers
//  * - Strips wrapping quotes in values
//  */
// function parseCSV(text) {
//   const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0);
//   if (lines.length === 0) return { headers: [], rows: [] };

//   const headers = csvSplit(lines[0]).map((h) => h.replace(/^"(.*)"$/, "$1").trim());
//   const rows = lines.slice(1).map((line) => {
//     const parts = csvSplit(line).map((v) => v.replace(/^"(.*)"$/, "$1").trim());
//     const obj = {};
//     headers.forEach((h, i) => {
//       obj[h] = parts[i] ?? "";
//     });
//     return obj;
//   });

//   return { headers, rows };
// }

// export default function Dashboard() {
//   // Render charts only on client to avoid SSR mismatch with Recharts
//   const [isClient, setIsClient] = useState(false);

//   // Upload/analysis state
//   const [file, setFile] = useState(null);
//   const [data, setData] = useState(null);                 // parsed CSV rows (array of objects)
//   const [headers, setHeaders] = useState([]);             // column names
//   const [statistics, setStatistics] = useState(null);     // response from /stats/:filename
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   useEffect(() => setIsClient(true), []);

//   // Handle local file selection (CSV only)
//   const handleFileChange = (e) => {
//     const selectedFile = e.target.files?.[0];
//     if (selectedFile && selectedFile.name.toLowerCase().endsWith(".csv")) {
//       setFile(selectedFile);
//       setError(null);
//     } else {
//       setError("Please select a valid .csv file");
//     }
//   };

//   // Upload to backend, fetch stats and the raw CSV, then parse
//   const handleUpload = async () => {
//     if (!file) return;
//     setLoading(true);
//     setError(null);

//     try {
//       // 1) Upload CSV to the Express server
//       const formData = new FormData();
//       formData.append("file", file);
//       const uploadRes = await fetch("http://localhost:3000/upload", {
//         method: "POST",
//         body: formData,
//       });
//       if (!uploadRes.ok) throw new Error("Upload failed");
//       const { filename } = await uploadRes.json();

//       // 2) Ask backend to compute statistics over the uploaded file
//       const statsRes = await fetch(`http://localhost:3000/stats/${filename}`);
//       if (!statsRes.ok) throw new Error("Failed to calculate statistics");
//       const statsData = await statsRes.json();
//       setStatistics(statsData);

//       // 3) Fetch the raw CSV back for client-side parsing (preview + charts)
//       const dataRes = await fetch(`http://localhost:3000/uploads/${filename}`);
//       if (!dataRes.ok) throw new Error("Failed to load uploaded file");
//       const csvText = await dataRes.text();

//       // 4) Parse CSV into rows + headers
//       const parsed = parseCSV(csvText);
//       setHeaders(parsed.headers);
//       setData(parsed.rows);
//     } catch (err) {
//       setError(err.message || "Unexpected error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Reset the UI for a new analysis
//   const handleReset = () => {
//     setFile(null);
//     setData(null);
//     setHeaders([]);
//     setStatistics(null);
//     setError(null);
//   };

//   // Export current analysis to JSON (file name, stats, and rows)
//   const exportJSON = () => {
//     const exportData = {
//       fileName: file?.name,
//       statistics,
//       rows: data,
//     };
//     const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `analysis-${Date.now()}.json`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   // Convenience: preview the first 10 rows
//   const previewRows = useMemo(() => (data ? data.slice(0, 10) : []), [data]);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
//       <div className="max-w-7xl mx-auto p-6">
//         <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6">
//           Statistical Analysis Dashboard
//         </h1>

//         {!data ? (
//           // Upload panel
//           <div className="bg-white rounded-lg shadow p-6">
//             <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>

//             <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
//               <input
//                 id="file-upload"
//                 type="file"
//                 accept=".csv"
//                 onChange={handleFileChange}
//                 className="hidden"
//               />
//               <label htmlFor="file-upload" className="cursor-pointer inline-block">
//                 <div className="text-6xl mb-4">📊</div>
//                 <p className="text-lg text-gray-600 mb-1">
//                   {file ? file.name : "Click to select CSV file"}
//                 </p>
//                 <p className="text-sm text-gray-400">CSV files only</p>
//               </label>
//             </div>

//             {error && (
//               <div className="mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
//                 {error}
//               </div>
//             )}

//             <button
//               onClick={handleUpload}
//               disabled={!file || loading}
//               className="mt-6 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
//             >
//               {loading ? "Analyzing..." : "Analyze Data"}
//             </button>
//           </div>
//         ) : (
//           // Results: actions, stats, preview, charts
//           <div className="space-y-8">
//             {/* Top actions */}
//             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
//               <p className="text-gray-600">
//                 File: <strong>{file?.name}</strong>
//               </p>
//               <div className="space-x-2">
//                 <button
//                   onClick={exportJSON}
//                   className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition"
//                 >
//                   Export JSON
//                 </button>
//                 <button
//                   onClick={handleReset}
//                   className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition"
//                 >
//                   New Analysis
//                 </button>
//               </div>
//             </div>

//             {/* Statistics overview from backend */}
//             <div className="bg-white rounded-lg shadow p-6">
//               <h2 className="text-xl font-semibold mb-3">Statistics Overview</h2>
//               {statistics?.columnStats && Object.keys(statistics.columnStats).length > 0 ? (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                   {Object.entries(statistics.columnStats).map(([column, stats]) => (
//                     <div key={column} className="border rounded-lg p-4 bg-gray-50">
//                       <h3 className="font-semibold text-indigo-600 mb-2">{column}</h3>
//                       <div className="text-sm space-y-1">
//                         <div className="flex justify-between">
//                           <span className="text-gray-600">Count:</span>
//                           <span className="font-medium">{stats.count}</span>
//                         </div>
//                         {"mean" in stats && (
//                           <div className="flex justify-between">
//                             <span className="text-gray-600">Mean:</span>
//                             <span className="font-medium">
//                               {Number(stats.mean)?.toFixed?.(2)}
//                             </span>
//                           </div>
//                         )}
//                         {"median" in stats && (
//                           <div className="flex justify-between">
//                             <span className="text-gray-600">Median:</span>
//                             <span className="font-medium">
//                               {Number(stats.median)?.toFixed?.(2)}
//                             </span>
//                           </div>
//                         )}
//                         {"stdDev" in stats && (
//                           <div className="flex justify-between">
//                             <span className="text-gray-600">Std Dev:</span>
//                             <span className="font-medium">
//                               {Number(stats.stdDev)?.toFixed?.(2)}
//                             </span>
//                           </div>
//                         )}
//                         {"min" in stats && (
//                           <div className="flex justify-between">
//                             <span className="text-gray-600">Min:</span>
//                             <span className="font-medium">
//                               {Number(stats.min)?.toFixed?.(2)}
//                             </span>
//                           </div>
//                         )}
//                         {"max" in stats && (
//                           <div className="flex justify-between">
//                             <span className="text-gray-600">Max:</span>
//                             <span className="font-medium">
//                               {Number(stats.max)?.toFixed?.(2)}
//                             </span>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <p className="text-sm text-gray-500">No numeric statistics available.</p>
//               )}
//             </div>

//             {/* Data preview (first 10 rows) */}
//             <div className="bg-white rounded-lg shadow p-6">
//               <h2 className="text-xl font-semibold mb-3">Data Preview</h2>
//               <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                   <thead className="bg-gray-50">
//                     <tr>
//                       {headers.map((h) => (
//                         <th
//                           key={h}
//                           className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
//                         >
//                           {h}
//                         </th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody className="bg-white divide-y divide-gray-200">
//                     {previewRows.map((row, idx) => (
//                       <tr key={idx} className="hover:bg-gray-50">
//                         {headers.map((h) => (
//                           <td key={h} className="px-4 py-2 text-sm text-gray-800">
//                             {row[h]}
//                           </td>
//                         ))}
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//               {data.length > 10 && (
//                 <p className="mt-3 text-sm text-gray-500">Showing 10 of {data.length} rows</p>
//               )}
//             </div>

//             {/* Column distributions: each card lets user pick chart type (default = histogram) */}
//             <div className="bg-white rounded-lg shadow p-6">
//               <h2 className="text-xl font-semibold mb-4">Column Distributions</h2>
//               {!isClient ? (
//                 <p className="text-sm text-gray-500">Loading charts…</p>
//               ) : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
//                   {headers.map((h) => (
//                     <ColumnDistributionChart
//                       key={h}
//                       header={h}
//                       values={data.map((row) => row[h])}
//                     />
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // /**
// //  * Dashboard page
// //  * - Upload a CSV file to your Express server
// //  * - Fetch server-calculated statistics
// //  * - Parse the CSV on the client for preview and per‑column distributions
// //  * - Render per‑column charts using ColumnDistributionChart (default = histogram)
// //  *
// //  * Notes:
// //  * - Backend must be running on http://localhost:3000 (server/server.js)
// //  * - Frontend (Next.js) typically runs on http://localhost:3001 in dev
// //  * - Recharts must be installed: `yarn add recharts`
// //  */

// // import React, { useEffect, useMemo, useState } from "react";
// // import ColumnDistributionChart from "@components/ColumnDistributionChart";
// // // import ColumnDistributionChart from "../../components/ColumnDistributionChart";

// // /** Minimal CSV splitter that respects double quotes.
// //  * Splits a line by commas not enclosed in quotes.
// //  */
// // const csvSplit = (line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

// // /** Parse CSV text into [{col: value, ...}, ...]
// //  * - Handles CRLF vs LF
// //  * - Trims headers
// //  * - Strips wrapping quotes in values
// //  */
// // function parseCSV(text) {
// //   const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0);
// //   if (lines.length === 0) return { headers: [], rows: [] };

// //   const headers = csvSplit(lines[0]).map((h) => h.replace(/^"(.*)"$/, "$1").trim());
// //   const rows = lines.slice(1).map((line) => {
// //     const parts = csvSplit(line).map((v) => v.replace(/^"(.*)"$/, "$1").trim());
// //     const obj = {};
// //     headers.forEach((h, i) => {
// //       obj[h] = parts[i] ?? "";
// //     });
// //     return obj;
// //   });

// //   return { headers, rows };
// // }

// // export default function Dashboard() {
// //   // Render charts only on client to avoid SSR mismatch with Recharts
// //   const [isClient, setIsClient] = useState(false);

// //   // Upload/analysis state
// //   const [file, setFile] = useState(null);
// //   const [data, setData] = useState(null);                 // parsed CSV rows (array of objects)
// //   const [headers, setHeaders] = useState([]);             // column names
// //   const [statistics, setStatistics] = useState(null);     // response from /stats/:filename
// //   const [loading, setLoading] = useState(false);
// //   const [error, setError] = useState(null);

// //   useEffect(() => setIsClient(true), []);

// //   // Handle local file selection (CSV only)
// //   const handleFileChange = (e) => {
// //     const selectedFile = e.target.files?.[0];
// //     if (selectedFile && selectedFile.name.toLowerCase().endsWith(".csv")) {
// //       setFile(selectedFile);
// //       setError(null);
// //     } else {
// //       setError("Please select a valid .csv file");
// //     }
// //   };

// //   // Upload to backend, fetch stats and the raw CSV, then parse
// //   const handleUpload = async () => {
// //     if (!file) return;
// //     setLoading(true);
// //     setError(null);

// //     try {
// //       // 1) Upload CSV to the Express server
// //       const formData = new FormData();
// //       formData.append("file", file);
// //       const uploadRes = await fetch("http://localhost:3000/upload", {
// //         method: "POST",
// //         body: formData,
// //       });
// //       if (!uploadRes.ok) throw new Error("Upload failed");
// //       const { filename } = await uploadRes.json();

// //       // 2) Ask backend to compute statistics over the uploaded file
// //       const statsRes = await fetch(`http://localhost:3000/stats/${filename}`);
// //       if (!statsRes.ok) throw new Error("Failed to calculate statistics");
// //       const statsData = await statsRes.json();
// //       setStatistics(statsData);

// //       // 3) Fetch the raw CSV back for client-side parsing (preview + charts)
// //       const dataRes = await fetch(`http://localhost:3000/uploads/${filename}`);
// //       if (!dataRes.ok) throw new Error("Failed to load uploaded file");
// //       const csvText = await dataRes.text();

// //       // 4) Parse CSV into rows + headers
// //       const parsed = parseCSV(csvText);
// //       setHeaders(parsed.headers);
// //       setData(parsed.rows);
// //     } catch (err) {
// //       setError(err.message || "Unexpected error");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // Reset the UI for a new analysis
// //   const handleReset = () => {
// //     setFile(null);
// //     setData(null);
// //     setHeaders([]);
// //     setStatistics(null);
// //     setError(null);
// //   };

// //   // Export current analysis to JSON (file name, stats, and first N rows)
// //   const exportJSON = () => {
// //     const exportData = {
// //       fileName: file?.name,
// //       statistics,
// //       rows: data,
// //     };
// //     const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
// //     const url = URL.createObjectURL(blob);
// //     const a = document.createElement("a");
// //     a.href = url;
// //     a.download = `analysis-${Date.now()}.json`;
// //     a.click();
// //     URL.revokeObjectURL(url);
// //   };

// //   // Convenience: preview the first 10 rows
// //   const previewRows = useMemo(() => (data ? data.slice(0, 10) : []), [data]);

// //   return (
// //     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
// //       <div className="max-w-7xl mx-auto p-6">
// //         <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6">
// //           Statistical Analysis Dashboard
// //         </h1>

// //         {!data ? (
// //           // Upload panel
// //           <div className="bg-white rounded-lg shadow p-6">
// //             <h2 className="text-xl font-semibold mb-4">Upload CSV File</h2>

// //             <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
// //               <input
// //                 id="file-upload"
// //                 type="file"
// //                 accept=".csv"
// //                 onChange={handleFileChange}
// //                 className="hidden"
// //               />
// //               <label htmlFor="file-upload" className="cursor-pointer inline-block">
// //                 <div className="text-6xl mb-4">📊</div>
// //                 <p className="text-lg text-gray-600 mb-1">
// //                   {file ? file.name : "Click to select CSV file"}
// //                 </p>
// //                 <p className="text-sm text-gray-400">CSV files only</p>
// //               </label>
// //             </div>

// //             {error && (
// //               <div className="mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
// //                 {error}
// //               </div>
// //             )}

// //             <button
// //               onClick={handleUpload}
// //               disabled={!file || loading}
// //               className="mt-6 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
// //             >
// //               {loading ? "Analyzing..." : "Analyze Data"}
// //             </button>
// //           </div>
// //         ) : (
// //           // Results: actions, stats, preview, charts
// //           <div className="space-y-8">
// //             {/* Top actions */}
// //             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
// //               <p className="text-gray-600">
// //                 File: <strong>{file?.name}</strong>
// //               </p>
// //               <div className="space-x-2">
// //                 <button
// //                   onClick={exportJSON}
// //                   className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition"
// //                 >
// //                   Export JSON
// //                 </button>
// //                 <button
// //                   onClick={handleReset}
// //                   className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition"
// //                 >
// //                   New Analysis
// //                 </button>
// //               </div>
// //             </div>

// //             {/* Statistics overview from backend */}
// //             <div className="bg-white rounded-lg shadow p-6">
// //               <h2 className="text-xl font-semibold mb-3">Statistics Overview</h2>
// //               {statistics?.columnStats && Object.keys(statistics.columnStats).length > 0 ? (
// //                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
// //                   {Object.entries(statistics.columnStats).map(([column, stats]) => (
// //                     <div key={column} className="border rounded-lg p-4 bg-gray-50">
// //                       <h3 className="font-semibold text-indigo-600 mb-2">{column}</h3>
// //                       <div className="text-sm space-y-1">
// //                         <div className="flex justify-between">
// //                           <span className="text-gray-600">Count:</span>
// //                           <span className="font-medium">{stats.count}</span>
// //                         </div>
// //                         {"mean" in stats && (
// //                           <div className="flex justify-between">
// //                             <span className="text-gray-600">Mean:</span>
// //                             <span className="font-medium">
// //                               {Number(stats.mean)?.toFixed?.(2)}
// //                             </span>
// //                           </div>
// //                         )}
// //                         {"median" in stats && (
// //                           <div className="flex justify-between">
// //                             <span className="text-gray-600">Median:</span>
// //                             <span className="font-medium">
// //                               {Number(stats.median)?.toFixed?.(2)}
// //                             </span>
// //                           </div>
// //                         )}
// //                         {"stdDev" in stats && (
// //                           <div className="flex justify-between">
// //                             <span className="text-gray-600">Std Dev:</span>
// //                             <span className="font-medium">
// //                               {Number(stats.stdDev)?.toFixed?.(2)}
// //                             </span>
// //                           </div>
// //                         )}
// //                         {"min" in stats && (
// //                           <div className="flex justify-between">
// //                             <span className="text-gray-600">Min:</span>
// //                             <span className="font-medium">
// //                               {Number(stats.min)?.toFixed?.(2)}
// //                             </span>
// //                           </div>
// //                         )}
// //                         {"max" in stats && (
// //                           <div className="flex justify-between">
// //                             <span className="text-gray-600">Max:</span>
// //                             <span className="font-medium">
// //                               {Number(stats.max)?.toFixed?.(2)}
// //                             </span>
// //                           </div>
// //                         )}
// //                       </div>
// //                     </div>
// //                   ))}
// //                 </div>
// //               ) : (
// //                 <p className="text-sm text-gray-500">No numeric statistics available.</p>
// //               )}
// //             </div>

// //             {/* Data preview (first 10 rows) */}
// //             <div className="bg-white rounded-lg shadow p-6">
// //               <h2 className="text-xl font-semibold mb-3">Data Preview</h2>
// //               <div className="overflow-x-auto">
// //                 <table className="min-w-full divide-y divide-gray-200">
// //                   <thead className="bg-gray-50">
// //                     <tr>
// //                       {headers.map((h) => (
// //                         <th
// //                           key={h}
// //                           className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
// //                         >
// //                           {h}
// //                         </th>
// //                       ))}
// //                     </tr>
// //                   </thead>
// //                   <tbody className="bg-white divide-y divide-gray-200">
// //                     {previewRows.map((row, idx) => (
// //                       <tr key={idx} className="hover:bg-gray-50">
// //                         {headers.map((h) => (
// //                           <td key={h} className="px-4 py-2 text-sm text-gray-800">
// //                             {row[h]}
// //                           </td>
// //                         ))}
// //                       </tr>
// //                     ))}
// //                   </tbody>
// //                 </table>
// //               </div>
// //               {data.length > 10 && (
// //                 <p className="mt-3 text-sm text-gray-500">Showing 10 of {data.length} rows</p>
// //               )}
// //             </div>

// //             {/* Column distributions: each card lets user pick chart type (default = histogram) */}
// //             <div className="bg-white rounded-lg shadow p-6">
// //               <h2 className="text-xl font-semibold mb-4">Column Distributions</h2>
// //               {!isClient ? (
// //                 <p className="text-sm text-gray-500">Loading charts…</p>
// //               ) : (
// //                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
// //                   {headers.map((h) => (
// //                     <ColumnDistributionChart
// //                       key={h}
// //                       header={h}
// //                       values={data.map((row) => row[h])}
// //                     />
// //                   ))}
// //                 </div>
// //               )}
// //             </div>
// //           </div>
// //         )}
// //       </div>
// //     </div>
// //   );
// // }