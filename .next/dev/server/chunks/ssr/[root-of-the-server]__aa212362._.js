module.exports = [
"[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react/jsx-dev-runtime", () => require("react/jsx-dev-runtime"));

module.exports = mod;
}),
"[project]/pages/dashboard.jsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Dashboard
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
(()=>{
    const e = new Error("Cannot find module '../../components/dashboard/FileUpload'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '../../components/dashboard/StatsOverview'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '../../components/dashboard/DistributionAnalysis'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '../../components/dashboard/CorrelationMatrix'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '../../components/dashboard/ChartDisplay'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '../../components/dashboard/DataPreview'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
;
;
;
;
;
;
;
function Dashboard() {
    const [file, setFile] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [statistics, setStatistics] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const handleFileUpload = async (uploadedFile)=>{
        setFile(uploadedFile);
        setLoading(true);
        setError(null);
        try {
            // Upload file
            const form = new FormData();
            form.append('file', uploadedFile);
            const uploadRes = await fetch('http://localhost:3000/upload', {
                method: 'POST',
                body: form
            });
            if (!uploadRes.ok) {
                const errorData = await uploadRes.json().catch(()=>({}));
                throw new Error(errorData.error || 'Upload failed');
            }
            const { filename } = await uploadRes.json();
            // Get statistics
            const statsRes = await fetch(`http://localhost:3000/stats/${filename}`);
            if (!statsRes.ok) {
                throw new Error('Failed to calculate statistics');
            }
            const statsData = await statsRes.json();
            // Parse CSV data for preview
            const dataRes = await fetch(`http://localhost:3000/uploads/${filename}`);
            if (!dataRes.ok) {
                throw new Error('Failed to load data preview');
            }
            const csvData = await dataRes.text();
            const [headers, ...rows] = csvData.trim().split('\n');
            const parsedData = rows.map((row)=>{
                const values = row.split(',');
                return headers.split(',').reduce((obj, header, i)=>{
                    obj[header.trim()] = values[i]?.trim();
                    return obj;
                }, {});
            });
            setData(parsedData);
            setStatistics(statsData);
        } catch (e) {
            setError(e.message);
            setFile(null);
        } finally{
            setLoading(false);
        }
    };
    const handleReset = ()=>{
        setFile(null);
        setData(null);
        setStatistics(null);
        setError(null);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8",
            children: !data ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(FileUpload, {
                onFileUpload: handleFileUpload,
                loading: loading,
                error: error
            }, void 0, false, {
                fileName: "[project]/pages/dashboard.jsx",
                lineNumber: 82,
                columnNumber: 11
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "space-y-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(StatsOverview, {
                        data: data,
                        fileName: file?.name,
                        statistics: statistics?.columnStats
                    }, void 0, false, {
                        fileName: "[project]/pages/dashboard.jsx",
                        lineNumber: 85,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(DistributionAnalysis, {
                        data: data,
                        statistics: statistics?.columnStats
                    }, void 0, false, {
                        fileName: "[project]/pages/dashboard.jsx",
                        lineNumber: 90,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(CorrelationMatrix, {
                        statistics: statistics?.correlations
                    }, void 0, false, {
                        fileName: "[project]/pages/dashboard.jsx",
                        lineNumber: 94,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(ChartDisplay, {
                        data: data,
                        statistics: statistics?.columnStats
                    }, void 0, false, {
                        fileName: "[project]/pages/dashboard.jsx",
                        lineNumber: 97,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(DataPreview, {
                        data: data
                    }, void 0, false, {
                        fileName: "[project]/pages/dashboard.jsx",
                        lineNumber: 101,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "flex gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                onClick: ()=>{
                                    const exportData = {
                                        fileName: file?.name,
                                        statistics,
                                        raw_data: data
                                    };
                                    const blob = new Blob([
                                        JSON.stringify(exportData, null, 2)
                                    ], {
                                        type: 'application/json'
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `statistical-analysis-${Date.now()}.json`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                },
                                className: "px-4 py-2 rounded-lg bg-indigo-600 text-white",
                                children: "Export JSON"
                            }, void 0, false, {
                                fileName: "[project]/pages/dashboard.jsx",
                                lineNumber: 104,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                onClick: handleReset,
                                className: "px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20",
                                children: "New Analysis"
                            }, void 0, false, {
                                fileName: "[project]/pages/dashboard.jsx",
                                lineNumber: 124,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/dashboard.jsx",
                        lineNumber: 103,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/dashboard.jsx",
                lineNumber: 84,
                columnNumber: 11
            }, this)
        }, void 0, false, {
            fileName: "[project]/pages/dashboard.jsx",
            lineNumber: 80,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/pages/dashboard.jsx",
        lineNumber: 79,
        columnNumber: 5
    }, this);
} // import React, { useState } from "react";
 // import FileUpload from "../components/dashboard/FileUpload";
 // import StatsOverview from "../components/dashboard/StatsOverview";
 // import DistributionAnalysis from "../components/dashboard/DistributionAnalysis";
 // import CorrelationMatrix from "../components/dashboard/CorrelationMatrix";
 // import ChartDisplay from "../components/dashboard/ChartDisplay";
 // import DataPreview from "../components/dashboard/DataPreview";
 // // NOTE: Your components expect Tailwind + shadcn/ui styles in place.
 // export default function Dashboard() {
 //   const [file, setFile] = useState(null);
 //   const [data, setData] = useState(null);
 //   const [statistics, setStatistics] = useState(null);
 //   const [loading, setLoading] = useState(false);
 //   const [error, setError] = useState(null);
 //   const handleFileUpload = async (uploadedFile) => {
 //     setFile(uploadedFile);
 //     setLoading(true);
 //     setError(null);
 //     try {
 //       const form = new FormData();
 //       form.append('file', uploadedFile);
 //       const res = await fetch('http://localhost:4000/api/upload', {
 //         method: 'POST',
 //         body: form
 //       });
 //       if (!res.ok) {
 //         const j = await res.json().catch(() => ({}));
 //         throw new Error(j.message || 'Upload failed');
 //       }
 //       const json = await res.json();
 //       setData(json.data);
 //       setStatistics(json.statistics);
 //     } catch (e) {
 //       setError(e.message);
 //     } finally {
 //       setLoading(false);
 //     }
 //   };
 //   const handleReset = () => {
 //     setFile(null);
 //     setData(null);
 //     setStatistics(null);
 //     setError(null);
 //   };
 //   return (
 //     <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
 //       <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
 //         {!data ? (
 //           <FileUpload onFileUpload={handleFileUpload} loading={loading} error={error} />
 //         ) : (
 //           <div className="space-y-8">
 //             <StatsOverview data={data} fileName={file?.name} statistics={statistics} />
 //             <DistributionAnalysis data={data} statistics={statistics} />
 //             <CorrelationMatrix statistics={statistics} />
 //             <ChartDisplay data={data} statistics={statistics.columnStats} />
 //             <DataPreview data={data} />
 //             <div className="flex gap-3">
 //               <button
 //                 onClick={() => {
 //                   const blob = new Blob([JSON.stringify({ fileName: file?.name, statistics, raw_data: data }, null, 2)], { type: 'application/json' });
 //                   const url = URL.createObjectURL(blob);
 //                   const a = document.createElement('a');
 //                   a.href = url;
 //                   a.download = `statistical-analysis-${Date.now()}.json`;
 //                   a.click();
 //                   URL.revokeObjectURL(url);
 //                 }}
 //                 className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
 //               >
 //                 Export JSON
 //               </button>
 //               <button onClick={handleReset} className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20">
 //                 New Analysis
 //               </button>
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

//# sourceMappingURL=%5Broot-of-the-server%5D__aa212362._.js.map