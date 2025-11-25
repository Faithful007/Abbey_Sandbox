module.exports = [
"[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react/jsx-dev-runtime", () => require("react/jsx-dev-runtime"));

module.exports = mod;
}),
"[externals]/react [external] (react, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react", () => require("react"));

module.exports = mod;
}),
"[project]/components/AuthContext.jsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
"use client";
;
;
const AuthCtx = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["createContext"])({
    token: null,
    role: null,
    name: null,
    department: null,
    login: ()=>{},
    logout: ()=>{},
    setUser: ()=>{}
});
// Decode JWT claims (safe fallback)
function decodeClaims(token) {
    try {
        const parts = token.split(".");
        if (parts.length < 2) return {};
        const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const json = JSON.parse(decodeURIComponent(atob(payload).split("").map((c)=>"%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
        return json || {};
    } catch  {
        return {};
    }
}
function AuthProvider({ children }) {
    const [token, setToken] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [role, setRole] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [name, setName] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [department, setDepartment] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    // Load persisted auth
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        try {
            const t = localStorage.getItem("auth_token");
            const r = localStorage.getItem("auth_role");
            const n = localStorage.getItem("auth_name");
            const d = localStorage.getItem("auth_department");
            if (t) setToken(t);
            if (r) setRole(r);
            if (n) setName(n);
            if (d) setDepartment(d);
            // If name/department missing but token exists, attempt decode
            if (t && (!n || !d)) {
                const claims = decodeClaims(t);
                const derivedName = n || claims.name || claims.fullName || [
                    claims.given_name,
                    claims.family_name
                ].filter(Boolean).join(" ") || claims.username || null;
                const derivedDept = d || claims.department || claims.dept || claims.unit || claims.role || null;
                if (derivedName) {
                    setName(derivedName);
                    localStorage.setItem("auth_name", derivedName);
                }
                if (derivedDept) {
                    setDepartment(derivedDept);
                    localStorage.setItem("auth_department", derivedDept);
                }
            }
        } catch  {
        /* ignore */ }
    }, []);
    const login = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useCallback"])((t, r, userName, userDepartment)=>{
        try {
            if (t) {
                localStorage.setItem("auth_token", t);
                setToken(t);
            }
            if (r) {
                localStorage.setItem("auth_role", r);
                setRole(r);
            }
            // Auto derive name/department if not provided
            if ((!userName || !userDepartment) && t) {
                const claims = decodeClaims(t);
                userName = userName || claims.name || claims.fullName || [
                    claims.given_name,
                    claims.family_name
                ].filter(Boolean).join(" ") || claims.username || null;
                userDepartment = userDepartment || claims.department || claims.dept || claims.unit || claims.role || null;
            }
            if (userName) {
                localStorage.setItem("auth_name", userName);
                setName(userName);
            }
            if (userDepartment) {
                localStorage.setItem("auth_department", userDepartment);
                setDepartment(userDepartment);
            }
        } catch  {
        /* ignore */ }
    }, []);
    const setUser = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useCallback"])((userName, userDepartment)=>{
        if (userName !== undefined) {
            userName === null ? localStorage.removeItem("auth_name") : localStorage.setItem("auth_name", userName);
            setName(userName);
        }
        if (userDepartment !== undefined) {
            userDepartment === null ? localStorage.removeItem("auth_department") : localStorage.setItem("auth_department", userDepartment);
            setDepartment(userDepartment);
        }
    }, []);
    const logout = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useCallback"])(()=>{
        try {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("auth_role");
            localStorage.removeItem("auth_name");
            localStorage.removeItem("auth_department");
        } catch  {
        /* ignore */ }
        setToken(null);
        setRole(null);
        setName(null);
        setDepartment(null);
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(AuthCtx.Provider, {
        value: {
            token,
            role,
            name,
            department,
            login,
            logout,
            setUser
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/components/AuthContext.jsx",
        lineNumber: 159,
        columnNumber: 5
    }, this);
}
function useAuth() {
    return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useContext"])(AuthCtx);
} // "use client";
 // import React, { createContext, useContext, useEffect, useState } from 'react';
 // const AuthCtx = createContext({ token: null, role: null, login: () => {}, logout: () => {} });
 // export function AuthProvider({ children }) {
 //   const [token, setToken] = useState(null);
 //   const [role, setRole] = useState(null);
 //   useEffect(() => {
 //     const t = localStorage.getItem('auth_token');
 //     const r = localStorage.getItem('auth_role');
 //     if (t) setToken(t);
 //     if (r) setRole(r);
 //   }, []);
 //   const login = (t, r) => {
 //     localStorage.setItem('auth_token', t);
 //     localStorage.setItem('auth_role', r);
 //     setToken(t);
 //     setRole(r);
 //   };
 //   const logout = () => {
 //     localStorage.removeItem('auth_token');
 //     localStorage.removeItem('auth_role');
 //     setToken(null);
 //     setRole(null);
 //   };
 //   return (
 //     <AuthCtx.Provider value={{ token, role, login, logout }}>
 //       {children}
 //     </AuthCtx.Provider>
 //   );
 // }
 // export function useAuth() {
 //   return useContext(AuthCtx);
 // }
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/react/jsx-runtime [external] (react/jsx-runtime, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react/jsx-runtime", () => require("react/jsx-runtime"));

module.exports = mod;
}),
"[externals]/react-dom [external] (react-dom, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("react-dom", () => require("react-dom"));

module.exports = mod;
}),
"[project]/pages/_app.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>App
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AuthContext$2e$jsx__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/AuthContext.jsx [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/router.js [ssr] (ecmascript)");
;
;
;
;
function TopBar() {
    const { name, department } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AuthContext$2e$jsx__$5b$ssr$5d$__$28$ecmascript$29$__["useAuth"])() || {};
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const hide = router.pathname === "/login" || router.pathname.startsWith("/registration") || router.pathname.startsWith("/forgot-password");
    if (hide) return null;
    if (!name && !department) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "w-full bg-gradient-to-br from-blue-50 to-indigo-100 border-b border-gray-200/50 sticky top-0 z-40",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto px-6 py-3 flex items-center justify-start",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "text-sm text-gray-600",
                children: [
                    "Signed in as ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                        className: "font-medium text-gray-900",
                        children: name || "User"
                    }, void 0, false, {
                        fileName: "[project]/pages/_app.js",
                        lineNumber: 21,
                        columnNumber: 24
                    }, this),
                    department ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                        className: "text-gray-400",
                        children: " • "
                    }, void 0, false, {
                        fileName: "[project]/pages/_app.js",
                        lineNumber: 22,
                        columnNumber: 25
                    }, this) : null,
                    department ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                        className: "font-medium text-indigo-600",
                        children: department
                    }, void 0, false, {
                        fileName: "[project]/pages/_app.js",
                        lineNumber: 24,
                        columnNumber: 13
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/pages/_app.js",
                lineNumber: 20,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/pages/_app.js",
            lineNumber: 19,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/pages/_app.js",
        lineNumber: 18,
        columnNumber: 5
    }, this);
}
function App({ Component, pageProps }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AuthContext$2e$jsx__$5b$ssr$5d$__$28$ecmascript$29$__["AuthProvider"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(TopBar, {}, void 0, false, {
                fileName: "[project]/pages/_app.js",
                lineNumber: 35,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Component, {
                ...pageProps
            }, void 0, false, {
                fileName: "[project]/pages/_app.js",
                lineNumber: 36,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/_app.js",
        lineNumber: 34,
        columnNumber: 5
    }, this);
} // ...existing code...
 // import "../styles/globals.css"; // keep your global imports
 // import { AuthProvider, useAuth } from "../components/AuthContext";
 // import { useRouter } from "next/router";
 // function TopBar() {
 //   const { name, department, logout } = useAuth() || {};
 //   const router = useRouter();
 //   const hide =
 //     router.pathname === "/login" ||
 //     router.pathname.startsWith("/registration") ||
 //     router.pathname.startsWith("/forgot-password");
 //   if (hide) return null;
 //   if (!name && !department) return null;
 //   return (
 //     <div className="w-full bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
 //       <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
 //         <div className="text-sm text-gray-600">
 //           Signed in as <span className="font-medium text-gray-900">{name || "User"}</span>
 //           {department ? <span className="text-gray-400"> • </span> : null}
 //           {department ? (
 //             <span className="font-medium text-indigo-600">{department}</span>
 //           ) : null}
 //         </div>
 //         <button
 //           onClick={logout}
 //           className="bg-gray-800 text-white text-sm px-4 py-1.5 rounded-md hover:bg-gray-900"
 //         >
 //           Sign out
 //         </button>
 //       </div>
 //     </div>
 //   );
 // }
 // export default function App({ Component, pageProps }) {
 //   return (
 //     <AuthProvider>
 //       <TopBar />
 //       <Component {...pageProps} />
 //     </AuthProvider>
 //   );
 // }
 // ...existing code...
 // import '../styles/globals.css'
 // import { AuthProvider } from '../components/AuthContext';
 // export default function MyApp({ Component, pageProps }) {
 //   return (
 //     <AuthProvider>
 //       <Component {...pageProps} />
 //     </AuthProvider>
 //   );
 // }
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__919d4807._.js.map