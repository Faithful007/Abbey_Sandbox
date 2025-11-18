module.exports = [
"[project]/pages/registration/list.jsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RegistrationList
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/router.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AuthContext$2e$jsx__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/AuthContext.jsx [ssr] (ecmascript)");
"use client";
;
;
;
;
function RegistrationList() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const [registrations, setRegistrations] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(true);
    const [searchQuery, setSearchQuery] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    const [stats, setStats] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [page, setPage] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(1);
    const [pagination, setPagination] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    const { token, role, name, logout } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AuthContext$2e$jsx__$5b$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        // Auth guard
        if (!token) {
            router.replace('/login');
            return;
        }
        // Only admins can access this page
        if (role !== 'admin') {
            router.replace('/dashboard');
            return;
        }
        fetchRegistrations();
        fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        page,
        token,
        role
    ]);
    async function fetchRegistrations() {
        try {
            setError('');
            const res = await fetch(`http://localhost:3000/api/registrations?page=${page}&limit=10`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setRegistrations(data.data || []);
            setPagination(data.pagination || null);
        } catch (e) {
            setError('Failed to fetch registrations (admin token required).');
            setRegistrations([]);
        } finally{
            setLoading(false);
        }
    }
    async function fetchStats() {
        try {
            const res = await fetch('http://localhost:3000/api/registrations-stats', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setStats(data.data);
        } catch  {
        // ignore stats errors
        }
    }
    async function handleSearch() {
        if (!searchQuery.trim()) return fetchRegistrations();
        try {
            setLoading(true);
            const res = await fetch(`http://localhost:3000/api/registrations/search/${encodeURIComponent(searchQuery)}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setRegistrations(data.data || []);
        } catch  {
            setError('Search failed.');
        } finally{
            setLoading(false);
        }
    }
    async function handleDelete(id) {
        if (!confirm('Are you sure you want to delete this registration?')) return;
        try {
            const res = await fetch(`http://localhost:3000/api/registrations/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error(await res.text());
            await fetchRegistrations();
            await fetchStats();
        } catch  {
            alert('Failed to delete registration');
        }
    }
    const handleLogout = ()=>{
        logout(); // Use AuthContext logout
        router.push('/login');
    };
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "text-xl text-gray-600",
                children: "Loading..."
            }, void 0, false, {
                fileName: "[project]/pages/registration/list.jsx",
                lineNumber: 107,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/pages/registration/list.jsx",
            lineNumber: 106,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "flex justify-between items-center mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h1", {
                            className: "text-3xl font-bold text-gray-800",
                            children: "BEC Registrations"
                        }, void 0, false, {
                            fileName: "[project]/pages/registration/list.jsx",
                            lineNumber: 116,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "flex gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                    onClick: ()=>router.push('/registration'),
                                    className: "bg-indigo-600 text-white py-2 px-6 rounded-lg hover:bg-indigo-700 transition",
                                    children: "+ New Registration"
                                }, void 0, false, {
                                    fileName: "[project]/pages/registration/list.jsx",
                                    lineNumber: 118,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                    onClick: handleLogout,
                                    className: "bg-gray-700 text-white py-2 px-6 rounded-lg hover:bg-gray-800 transition",
                                    children: "Sign out"
                                }, void 0, false, {
                                    fileName: "[project]/pages/registration/list.jsx",
                                    lineNumber: 124,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/registration/list.jsx",
                            lineNumber: 117,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/registration/list.jsx",
                    lineNumber: 115,
                    columnNumber: 9
                }, this),
                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4",
                    children: error
                }, void 0, false, {
                    fileName: "[project]/pages/registration/list.jsx",
                    lineNumber: 134,
                    columnNumber: 11
                }, this),
                stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-lg shadow p-6 mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-semibold mb-4",
                            children: "Statistics"
                        }, void 0, false, {
                            fileName: "[project]/pages/registration/list.jsx",
                            lineNumber: 141,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-2 md:grid-cols-4 gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "text-center p-4 bg-blue-50 rounded",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                            className: "text-3xl font-bold text-blue-600",
                                            children: stats.total
                                        }, void 0, false, {
                                            fileName: "[project]/pages/registration/list.jsx",
                                            lineNumber: 144,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-gray-600",
                                            children: "Total Registrations"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/registration/list.jsx",
                                            lineNumber: 145,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/registration/list.jsx",
                                    lineNumber: 143,
                                    columnNumber: 15
                                }, this),
                                stats.byUnit?.slice(0, 3).map((unit, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "text-center p-4 bg-green-50 rounded",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                                className: "text-3xl font-bold text-green-600",
                                                children: unit.count
                                            }, void 0, false, {
                                                fileName: "[project]/pages/registration/list.jsx",
                                                lineNumber: 149,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-gray-600",
                                                children: unit.unit_in_BEC
                                            }, void 0, false, {
                                                fileName: "[project]/pages/registration/list.jsx",
                                                lineNumber: 150,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, idx, true, {
                                        fileName: "[project]/pages/registration/list.jsx",
                                        lineNumber: 148,
                                        columnNumber: 17
                                    }, this))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/registration/list.jsx",
                            lineNumber: 142,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/registration/list.jsx",
                    lineNumber: 140,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-lg shadow p-4 mb-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                type: "text",
                                value: searchQuery,
                                onChange: (e)=>setSearchQuery(e.target.value),
                                onKeyPress: (e)=>e.key === 'Enter' && handleSearch(),
                                placeholder: "Search by name, email, or unit...",
                                className: "flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            }, void 0, false, {
                                fileName: "[project]/pages/registration/list.jsx",
                                lineNumber: 159,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                onClick: handleSearch,
                                className: "bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition",
                                children: "Search"
                            }, void 0, false, {
                                fileName: "[project]/pages/registration/list.jsx",
                                lineNumber: 167,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                onClick: ()=>{
                                    setSearchQuery('');
                                    fetchRegistrations();
                                },
                                className: "bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition",
                                children: "Clear"
                            }, void 0, false, {
                                fileName: "[project]/pages/registration/list.jsx",
                                lineNumber: 173,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/registration/list.jsx",
                        lineNumber: 158,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/pages/registration/list.jsx",
                    lineNumber: 157,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-lg shadow overflow-hidden",
                    children: registrations.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "p-8 text-center text-gray-500",
                        children: "No registrations found"
                    }, void 0, false, {
                        fileName: "[project]/pages/registration/list.jsx",
                        lineNumber: 187,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "overflow-x-auto",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("table", {
                                    className: "min-w-full divide-y divide-gray-200",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("thead", {
                                            className: "bg-gray-50",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("tr", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "ID"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 194,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "Name"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 195,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "Age"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 196,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "Email"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 197,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "Mobile"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 198,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "BEC Unit"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 199,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "Role"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 200,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "Actions"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 201,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/pages/registration/list.jsx",
                                                lineNumber: 193,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/pages/registration/list.jsx",
                                            lineNumber: 192,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("tbody", {
                                            className: "bg-white divide-y divide-gray-200",
                                            children: registrations.map((reg)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("tr", {
                                                    className: "hover:bg-gray-50",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm text-gray-900",
                                                            children: reg.id
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 207,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm text-gray-900",
                                                            children: [
                                                                reg.first_name,
                                                                " ",
                                                                reg.last_name
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 208,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm text-gray-900",
                                                            children: reg.age
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 209,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm text-gray-900",
                                                            children: reg.email
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 210,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm text-gray-900",
                                                            children: reg.mobile
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 211,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm text-gray-900",
                                                            children: reg.unit_in_BEC
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 212,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                                className: `px-2 py-1 rounded text-xs font-medium ${reg.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`,
                                                                children: reg.role || 'user'
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/registration/list.jsx",
                                                                lineNumber: 214,
                                                                columnNumber: 27
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 213,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>router.push(`/registration/edit/${reg.id}`),
                                                                    className: "text-indigo-600 hover:text-indigo-800 mr-3",
                                                                    children: "Edit"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/registration/list.jsx",
                                                                    lineNumber: 221,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>handleDelete(reg.id),
                                                                    className: "text-red-600 hover:text-red-800",
                                                                    children: "Delete"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/registration/list.jsx",
                                                                    lineNumber: 227,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 220,
                                                            columnNumber: 25
                                                        }, this)
                                                    ]
                                                }, reg.id, true, {
                                                    fileName: "[project]/pages/registration/list.jsx",
                                                    lineNumber: 206,
                                                    columnNumber: 23
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/pages/registration/list.jsx",
                                            lineNumber: 204,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/registration/list.jsx",
                                    lineNumber: 191,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/pages/registration/list.jsx",
                                lineNumber: 190,
                                columnNumber: 15
                            }, this),
                            pagination && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "bg-gray-50 px-6 py-4 flex items-center justify-between border-t",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "text-sm text-gray-700",
                                        children: [
                                            "Page ",
                                            pagination.page,
                                            " of ",
                                            pagination.totalPages,
                                            " (",
                                            pagination.total,
                                            " total)"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/registration/list.jsx",
                                        lineNumber: 242,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "flex gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setPage((p)=>Math.max(1, p - 1)),
                                                disabled: page === 1,
                                                className: "px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100",
                                                children: "Previous"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/registration/list.jsx",
                                                lineNumber: 246,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setPage((p)=>Math.min(pagination.totalPages, p + 1)),
                                                disabled: page === pagination.totalPages,
                                                className: "px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100",
                                                children: "Next"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/registration/list.jsx",
                                                lineNumber: 253,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/registration/list.jsx",
                                        lineNumber: 245,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/registration/list.jsx",
                                lineNumber: 241,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true)
                }, void 0, false, {
                    fileName: "[project]/pages/registration/list.jsx",
                    lineNumber: 185,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/pages/registration/list.jsx",
            lineNumber: 114,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/pages/registration/list.jsx",
        lineNumber: 113,
        columnNumber: 5
    }, this);
} // "use client";
 // import React, { useState, useEffect } from 'react';
 // import { useRouter } from 'next/router';
 // import { useAuth } from "../../components/AuthContext";
 // export default function RegistrationList() {
 //   const router = useRouter();
 //   const [registrations, setRegistrations] = useState([]);
 //   const [loading, setLoading] = useState(true);
 //   const [searchQuery, setSearchQuery] = useState('');
 //   const [stats, setStats] = useState(null);
 //   const [page, setPage] = useState(1);
 //   const [pagination, setPagination] = useState(null);
 //   const [error, setError] = useState('');
 //   const { token, role, name, logout } = useAuth();
 //   const [users, setUsers] = useState([]);
 //   // const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
 //   useEffect(() => {
 //     if (!token) {
 //       router.push('/login');
 //       return;
 //     }
 //     fetchRegistrations();
 //     fetchStats();
 //     // eslint-disable-next-line react-hooks/exhaustive-deps
 //   }, [page]);
 //   async function fetchRegistrations() {
 //     try {
 //       setError('');
 //       const res = await fetch(`http://localhost:3000/api/registrations?page=${page}&limit=10`, {
 //         headers: { Authorization: `Bearer ${token}` }
 //       });
 //       if (!res.ok) throw new Error(await res.text());
 //       const data = await res.json();
 //       setRegistrations(data.data || []);
 //       setPagination(data.pagination || null);
 //     } catch (e) {
 //       setError('Failed to fetch registrations (admin token required).');
 //       setRegistrations([]);
 //     } finally {
 //       setLoading(false);
 //     }
 //   }
 //   async function fetchStats() {
 //     try {
 //       const res = await fetch('http://localhost:3000/api/registrations-stats', {
 //         headers: { Authorization: `Bearer ${token}` }
 //       });
 //       if (!res.ok) throw new Error(await res.text());
 //       const data = await res.json();
 //       setStats(data.data);
 //     } catch {
 //       // ignore stats errors
 //     }
 //   }
 //   async function handleSearch() {
 //     if (!searchQuery.trim()) return fetchRegistrations();
 //     try {
 //       setLoading(true);
 //       const res = await fetch(
 //         `http://localhost:3000/api/registrations/search/${encodeURIComponent(searchQuery)}`,
 //         { headers: { Authorization: `Bearer ${token}` } }
 //       );
 //       if (!res.ok) throw new Error(await res.text());
 //       const data = await res.json();
 //       setRegistrations(data.data || []);
 //     } catch {
 //       setError('Search failed.');
 //     } finally {
 //       setLoading(false);
 //     }
 //   }
 //   async function handleDelete(id) {
 //     if (!confirm('Are you sure you want to delete this registration?')) return;
 //     try {
 //       const res = await fetch(`http://localhost:3000/api/registrations/${id}`, {
 //         method: 'DELETE',
 //         headers: { Authorization: `Bearer ${token}` }
 //       });
 //       if (!res.ok) throw new Error(await res.text());
 //       await fetchRegistrations();
 //       await fetchStats();
 //     } catch {
 //       alert('Failed to delete registration');
 //     }
 //   }
 //   const handleLogout = () => {
 //     localStorage.removeItem('token');
 //     localStorage.removeItem('role');
 //     router.push('/login');
 //   };
 //   return (
 //     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
 //       <div className="max-w-7xl mx-auto">
 //         <div className="flex justify-between items-center mb-8">
 //           <h1 className="text-3xl font-bold text-gray-800">BEC Registrations</h1>
 //           <div className="flex gap-2">
 //             <button
 //               onClick={() => router.push('/registration')}
 //               className="bg-indigo-600 text-white py-2 px-6 rounded-lg hover:bg-indigo-700 transition"
 //             >
 //               + New Registration
 //             </button>
 //             <button
 //               onClick={handleLogout}
 //               className="bg-gray-600 text-white py-2 px-6 rounded-lg hover:bg-gray-700 transition"
 //             >
 //               Logout
 //             </button>
 //           </div>
 //         </div>
 //         {error && (
 //           <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
 //             {error}
 //           </div>
 //         )}
 //         {stats && (
 //           <div className="bg-white rounded-lg shadow p-6 mb-6">
 //             <h2 className="text-xl font-semibold mb-4">Statistics</h2>
 //             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 //               <div className="text-center p-4 bg-blue-50 rounded">
 //                 <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
 //                 <p className="text-sm text-gray-600">Total Registrations</p>
 //               </div>
 //               {stats.byUnit?.slice(0, 3).map((unit, idx) => (
 //                 <div key={idx} className="text-center p-4 bg-green-50 rounded">
 //                   <p className="text-3xl font-bold text-green-600">{unit.count}</p>
 //                   <p className="text-sm text-gray-600">{unit.unit_in_BEC}</p>
 //                 </div>
 //               ))}
 //             </div>
 //           </div>
 //         )}
 //         <div className="bg-white rounded-lg shadow p-4 mb-6">
 //           <div className="flex gap-2">
 //             <input
 //               type="text"
 //               value={searchQuery}
 //               onChange={(e) => setSearchQuery(e.target.value)}
 //               onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
 //               placeholder="Search by name, email, or unit..."
 //               className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
 //             />
 //             <button
 //               onClick={handleSearch}
 //               className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
 //             >
 //               Search
 //             </button>
 //             <button
 //               onClick={() => {
 //                 setSearchQuery('');
 //                 fetchRegistrations();
 //               }}
 //               className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
 //             >
 //               Clear
 //             </button>
 //           </div>
 //         </div>
 //         <div className="bg-white rounded-lg shadow overflow-hidden">
 //           {loading ? (
 //             <div className="p-8 text-center">Loading...</div>
 //           ) : registrations.length === 0 ? (
 //             <div className="p-8 text-center text-gray-500">No registrations found</div>
 //           ) : (
 //             <>
 //               <div className="overflow-x-auto">
 //                 <table className="min-w-full divide-y divide-gray-200">
 //                   <thead className="bg-gray-50">
 //                     <tr>
 //                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
 //                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
 //                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
 //                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
 //                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
 //                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BEC Unit</th>
 //                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
 //                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
 //                     </tr>
 //                   </thead>
 //                   <tbody className="bg-white divide-y divide-gray-200">
 //                     {registrations.map((reg) => (
 //                       <tr key={reg.id} className="hover:bg-gray-50">
 //                         <td className="px-6 py-4 text-sm text-gray-900">{reg.id}</td>
 //                         <td className="px-6 py-4 text-sm text-gray-900">{reg.first_name} {reg.last_name}</td>
 //                         <td className="px-6 py-4 text-sm text-gray-900">{reg.age}</td>
 //                         <td className="px-6 py-4 text-sm text-gray-900">{reg.email}</td>
 //                         <td className="px-6 py-4 text-sm text-gray-900">{reg.mobile}</td>
 //                         <td className="px-6 py-4 text-sm text-gray-900">{reg.unit_in_BEC}</td>
 //                         <td className="px-6 py-4 text-sm">
 //                           <span className={`px-2 py-1 rounded text-xs ${
 //                             reg.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
 //                           }`}>
 //                             {reg.role}
 //                           </span>
 //                         </td>
 //                         <td className="px-6 py-4 text-sm">
 //                           <button
 //                             onClick={() => router.push(`/registration/edit/${reg.id}`)}
 //                             className="text-indigo-600 hover:text-indigo-800 mr-3"
 //                           >
 //                             Edit
 //                           </button>
 //                           <button
 //                             onClick={() => handleDelete(reg.id)}
 //                             className="text-red-600 hover:text-red-800"
 //                           >
 //                             Delete
 //                           </button>
 //                         </td>
 //                       </tr>
 //                     ))}
 //                   </tbody>
 //                 </table>
 //               </div>
 //               {pagination && (
 //                 <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
 //                   <div className="text-sm text-gray-700">
 //                     Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
 //                   </div>
 //                   <div className="flex gap-2">
 //                     <button
 //                       onClick={() => setPage(p => Math.max(1, p - 1))}
 //                       disabled={page === 1}
 //                       className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
 //                     >
 //                       Previous
 //                     </button>
 //                     <button
 //                       onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
 //                       disabled={page === pagination.totalPages}
 //                       className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100"
 //                     >
 //                       Next
 //                     </button>
 //                   </div>
 //                 </div>
 //               )}
 //             </>
 //           )}
 //         </div>
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

//# sourceMappingURL=%5Broot-of-the-server%5D__cf1886d5._.js.map