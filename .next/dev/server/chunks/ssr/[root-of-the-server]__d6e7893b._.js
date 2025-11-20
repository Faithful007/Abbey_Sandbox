module.exports = [
"[project]/components/ColumnDistributionChart.jsx [ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

const e = new Error("Could not parse module '[project]/components/ColumnDistributionChart.jsx'\n\nExpected '>', got 'name'");
e.code = 'MODULE_UNPARSABLE';
throw e;
}),
"[project]/pages/dashboard/index.jsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Dashboard page
 * - Upload a CSV file to your Express server
 * - Fetch server-calculated statistics
 * - Parse the CSV on the client for preview and per‑column distributions
 * - Render per‑column charts using ColumnDistributionChart (default = histogram)
 *
 * Requirements:
 * - Backend running at http://localhost:3000 (server/server.js)
 * - Frontend (Next.js) at http://localhost:3001
 * - Recharts installed: yarn add recharts
 * - Alias set in jsconfig.json: { "compilerOptions": { "baseUrl": ".", "paths": { "@components/*": ["components/*"] } } }
 */ __turbopack_context__.s([
    "default",
    ()=>Dashboard
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ColumnDistributionChart$2e$jsx__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ColumnDistributionChart.jsx [ssr] (ecmascript)");
;
;
;
// If you didn't set the alias above, use the relative import instead:
// import ColumnDistributionChart from "../../components/ColumnDistributionChart";
/** Minimal CSV splitter that respects double quotes.
 * Splits a line by commas not enclosed in quotes.
 */ const csvSplit = (line)=>line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
/** Parse CSV text into [{col: value, ...}, ...]
 * - Handles CRLF vs LF
 * - Trims headers
 * - Strips wrapping quotes in values
 */ function parseCSV(text) {
    const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l)=>l.length > 0);
    if (lines.length === 0) return {
        headers: [],
        rows: []
    };
    const headers = csvSplit(lines[0]).map((h)=>h.replace(/^"(.*)"$/, "$1").trim());
    const rows = lines.slice(1).map((line)=>{
        const parts = csvSplit(line).map((v)=>v.replace(/^"(.*)"$/, "$1").trim());
        const obj = {};
        headers.forEach((h, i)=>{
            obj[h] = parts[i] ?? "";
        });
        return obj;
    });
    return {
        headers,
        rows
    };
}
function Dashboard() {
    // Render charts only on client to avoid SSR mismatch with Recharts
    const [isClient, setIsClient] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    // Upload/analysis state
    const [file, setFile] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null); // parsed CSV rows (array of objects)
    const [headers, setHeaders] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]); // column names
    const [statistics, setStatistics] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null); // response from /stats/:filename
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>setIsClient(true), []);
    // Handle local file selection (CSV only)
    const handleFileChange = (e)=>{
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.name.toLowerCase().endsWith(".csv")) {
            setFile(selectedFile);
            setError(null);
        } else {
            setError("Please select a valid .csv file");
        }
    };
    // Upload to backend, fetch stats and the raw CSV, then parse
    const handleUpload = async ()=>{
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            // 1) Upload CSV to the Express server
            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await fetch("http://localhost:3000/upload", {
                method: "POST",
                body: formData
            });
            if (!uploadRes.ok) throw new Error("Upload failed");
            const { filename } = await uploadRes.json();
            // 2) Ask backend to compute statistics over the uploaded file
            const statsRes = await fetch(`http://localhost:3000/stats/${filename}`);
            if (!statsRes.ok) throw new Error("Failed to calculate statistics");
            const statsData = await statsRes.json();
            setStatistics(statsData);
            // 3) Fetch the raw CSV back for client-side parsing (preview + charts)
            const dataRes = await fetch(`http://localhost:3000/uploads/${filename}`);
            if (!dataRes.ok) throw new Error("Failed to load uploaded file");
            const csvText = await dataRes.text();
            // 4) Parse CSV into rows + headers
            const parsed = parseCSV(csvText);
            setHeaders(parsed.headers);
            setData(parsed.rows);
        } catch (err) {
            setError(err.message || "Unexpected error");
        } finally{
            setLoading(false);
        }
    };
    // Reset the UI for a new analysis
    const handleReset = ()=>{
        setFile(null);
        setData(null);
        setHeaders([]);
        setStatistics(null);
        setError(null);
    };
    // Export current analysis to JSON (file name, stats, and rows)
    const exportJSON = ()=>{
        const exportData = {
            fileName: file?.name,
            statistics,
            rows: data
        };
        const blob = new Blob([
            JSON.stringify(exportData, null, 2)
        ], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analysis-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    // Convenience: preview the first 10 rows
    const previewRows = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useMemo"])(()=>data ? data.slice(0, 10) : [], [
        data
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto p-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h1", {
                    className: "text-3xl sm:text-4xl font-bold text-gray-800 mb-6",
                    children: "Statistical Analysis Dashboard"
                }, void 0, false, {
                    fileName: "[project]/pages/dashboard/index.jsx",
                    lineNumber: 142,
                    columnNumber: 9
                }, this),
                !data ? // Upload panel
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-lg shadow p-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-semibold mb-4",
                            children: "Upload CSV File"
                        }, void 0, false, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 149,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                    id: "file-upload",
                                    type: "file",
                                    accept: ".csv",
                                    onChange: handleFileChange,
                                    className: "hidden"
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 152,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                    htmlFor: "file-upload",
                                    className: "cursor-pointer inline-block",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            className: "text-6xl mb-4",
                                            children: "📊"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 160,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                            className: "text-lg text-gray-600 mb-1",
                                            children: file ? file.name : "Click to select CSV file"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 161,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-gray-400",
                                            children: "CSV files only"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 164,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 159,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 151,
                            columnNumber: 13
                        }, this),
                        error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm",
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 169,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            onClick: handleUpload,
                            disabled: !file || loading,
                            className: "mt-6 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition",
                            children: loading ? "Analyzing..." : "Analyze Data"
                        }, void 0, false, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 174,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/dashboard/index.jsx",
                    lineNumber: 148,
                    columnNumber: 11
                }, this) : // Results: actions, stats, preview, charts
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "space-y-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                    className: "text-gray-600",
                                    children: [
                                        "File: ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("strong", {
                                            children: file?.name
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 188,
                                            columnNumber: 23
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 187,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "space-x-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                            onClick: exportJSON,
                                            className: "bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition",
                                            children: "Export JSON"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 191,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                            onClick: handleReset,
                                            className: "bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition",
                                            children: "New Analysis"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 197,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 190,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 186,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "bg-white rounded-lg shadow p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                                    className: "text-xl font-semibold mb-3",
                                    children: "Statistics Overview"
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 208,
                                    columnNumber: 15
                                }, this),
                                statistics?.columnStats && Object.keys(statistics.columnStats).length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
                                    children: Object.entries(statistics.columnStats).map(([column, stats])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            className: "border rounded-lg p-4 bg-gray-50",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                                                    className: "font-semibold text-indigo-600 mb-2",
                                                    children: column
                                                }, void 0, false, {
                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                    lineNumber: 213,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                    className: "text-sm space-y-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Count:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 216,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium",
                                                                    children: stats.count
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 217,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                            lineNumber: 215,
                                                            columnNumber: 25
                                                        }, this),
                                                        "mean" in stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Mean:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 221,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium",
                                                                    children: Number(stats.mean)?.toFixed?.(2)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 222,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                            lineNumber: 220,
                                                            columnNumber: 27
                                                        }, this),
                                                        "median" in stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Median:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 229,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium",
                                                                    children: Number(stats.median)?.toFixed?.(2)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 230,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                            lineNumber: 228,
                                                            columnNumber: 27
                                                        }, this),
                                                        "stdDev" in stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Std Dev:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 237,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium",
                                                                    children: Number(stats.stdDev)?.toFixed?.(2)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 238,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                            lineNumber: 236,
                                                            columnNumber: 27
                                                        }, this),
                                                        "min" in stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Min:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 245,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium",
                                                                    children: Number(stats.min)?.toFixed?.(2)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 246,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                            lineNumber: 244,
                                                            columnNumber: 27
                                                        }, this),
                                                        "max" in stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Max:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 253,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium",
                                                                    children: Number(stats.max)?.toFixed?.(2)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 254,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                            lineNumber: 252,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                    lineNumber: 214,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, column, true, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 212,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 210,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-gray-500",
                                    children: "No numeric statistics available."
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 264,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 207,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "bg-white rounded-lg shadow p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                                    className: "text-xl font-semibold mb-3",
                                    children: "Data Preview"
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 270,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "overflow-x-auto",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("table", {
                                        className: "min-w-full divide-y divide-gray-200",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("thead", {
                                                className: "bg-gray-50",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("tr", {
                                                    children: headers.map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("th", {
                                                            className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                            children: h
                                                        }, h, false, {
                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                            lineNumber: 276,
                                                            columnNumber: 25
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                    lineNumber: 274,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/pages/dashboard/index.jsx",
                                                lineNumber: 273,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("tbody", {
                                                className: "bg-white divide-y divide-gray-200",
                                                children: previewRows.map((row, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("tr", {
                                                        className: "hover:bg-gray-50",
                                                        children: headers.map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("td", {
                                                                className: "px-4 py-2 text-sm text-gray-800",
                                                                children: row[h]
                                                            }, h, false, {
                                                                fileName: "[project]/pages/dashboard/index.jsx",
                                                                lineNumber: 289,
                                                                columnNumber: 27
                                                            }, this))
                                                    }, idx, false, {
                                                        fileName: "[project]/pages/dashboard/index.jsx",
                                                        lineNumber: 287,
                                                        columnNumber: 23
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/pages/dashboard/index.jsx",
                                                lineNumber: 285,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/dashboard/index.jsx",
                                        lineNumber: 272,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 271,
                                    columnNumber: 15
                                }, this),
                                data.length > 10 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                    className: "mt-3 text-sm text-gray-500",
                                    children: [
                                        "Showing 10 of ",
                                        data.length,
                                        " rows"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 299,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 269,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "bg-white rounded-lg shadow p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                                    className: "text-xl font-semibold mb-4",
                                    children: "Column Distributions"
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 305,
                                    columnNumber: 15
                                }, this),
                                !isClient ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-gray-500",
                                    children: "Loading charts…"
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 307,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6",
                                    children: headers.map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ColumnDistributionChart$2e$jsx__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                            header: h,
                                            values: data.map((row)=>row[h])
                                        }, h, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 311,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 309,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 304,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/dashboard/index.jsx",
                    lineNumber: 184,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/pages/dashboard/index.jsx",
            lineNumber: 141,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/pages/dashboard/index.jsx",
        lineNumber: 140,
        columnNumber: 5
    }, this);
} // /**
 //  * Dashboard page
 //  * - Upload a CSV file to your Express server
 //  * - Fetch server-calculated statistics
 //  * - Parse the CSV on the client for preview and per‑column distributions
 //  * - Render per‑column charts using ColumnDistributionChart (default = histogram)
 //  *
 //  * Notes:
 //  * - Backend must be running on http://localhost:3000 (server/server.js)
 //  * - Frontend (Next.js) typically runs on http://localhost:3001 in dev
 //  * - Recharts must be installed: `yarn add recharts`
 //  */
 // import React, { useEffect, useMemo, useState } from "react";
 // import ColumnDistributionChart from "@components/ColumnDistributionChart";
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
 //   // Export current analysis to JSON (file name, stats, and first N rows)
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
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__d6e7893b._.js.map