module.exports = [
"[project]/pages/login.jsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Login
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
function Login() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const [email, setEmail] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    const [password, setPassword] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const { login } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AuthContext$2e$jsx__$5b$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const handleSubmit = async (e)=>{
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            // Extract user info from response
            const token = data.token || data.accessToken;
            const role = data.role || data.user?.role || 'user';
            const userName = data.user?.name || data.user?.fullName || [
                data.user?.firstName,
                data.user?.lastName
            ].filter(Boolean).join(" ") || data.name || data.fullName || email.split('@')[0]; // fallback to email username
            const userDept = data.user?.department || data.department || data.user?.dept || data.dept || role; // fallback to role as department
            // Save to context and localStorage BEFORE navigation
            login(token, role, userName, userDept);
            // Add small delay to ensure state persists
            await new Promise((resolve)=>setTimeout(resolve, 100));
            // Redirect based on role
            if (role === 'admin') {
                await router.push('/registration/list');
            } else {
                await router.push('/dashboard');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Invalid email or password');
            setLoading(false);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            className: "max-w-md w-full bg-white rounded-2xl shadow-xl p-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "text-center mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                            className: "text-3xl font-bold text-gray-800",
                            children: "BEC Computational System"
                        }, void 0, false, {
                            fileName: "[project]/pages/login.jsx",
                            lineNumber: 76,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                            className: "text-gray-600 mt-2",
                            children: "Signin using your registered email"
                        }, void 0, false, {
                            fileName: "[project]/pages/login.jsx",
                            lineNumber: 77,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/login.jsx",
                    lineNumber: 75,
                    columnNumber: 9
                }, this),
                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg",
                    children: error
                }, void 0, false, {
                    fileName: "[project]/pages/login.jsx",
                    lineNumber: 81,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("form", {
                    onSubmit: handleSubmit,
                    className: "space-y-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                    htmlFor: "email",
                                    className: "block text-sm font-medium text-gray-700 mb-2",
                                    children: "Email"
                                }, void 0, false, {
                                    fileName: "[project]/pages/login.jsx",
                                    lineNumber: 88,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                    id: "email",
                                    type: "email",
                                    value: email,
                                    onChange: (e)=>setEmail(e.target.value),
                                    required: true,
                                    disabled: loading,
                                    className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100",
                                    placeholder: "Enter your email"
                                }, void 0, false, {
                                    fileName: "[project]/pages/login.jsx",
                                    lineNumber: 91,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/login.jsx",
                            lineNumber: 87,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between mb-2",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                                        htmlFor: "password",
                                        className: "block text-sm font-medium text-gray-700",
                                        children: "Password"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/login.jsx",
                                        lineNumber: 105,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/pages/login.jsx",
                                    lineNumber: 104,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                    id: "password",
                                    type: "password",
                                    value: password,
                                    onChange: (e)=>setPassword(e.target.value),
                                    required: true,
                                    disabled: loading,
                                    className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100",
                                    placeholder: "Enter your password"
                                }, void 0, false, {
                                    fileName: "[project]/pages/login.jsx",
                                    lineNumber: 109,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/login.jsx",
                            lineNumber: 103,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            type: "submit",
                            disabled: loading,
                            className: "w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed",
                            children: loading ? 'Logging in...' : 'Login'
                        }, void 0, false, {
                            fileName: "[project]/pages/login.jsx",
                            lineNumber: 121,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/login.jsx",
                    lineNumber: 86,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "mt-6 text-center space-y-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                            className: "text-sm text-gray-600",
                            children: [
                                "Don't have an account?",
                                ' ',
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                    onClick: ()=>router.push('/registration'),
                                    className: "text-indigo-600 hover:text-indigo-800 font-medium",
                                    disabled: loading,
                                    children: "Register"
                                }, void 0, false, {
                                    fileName: "[project]/pages/login.jsx",
                                    lineNumber: 133,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/login.jsx",
                            lineNumber: 131,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            type: "button",
                            onClick: ()=>router.push('/forgot-password'),
                            className: "text-sm text-indigo-600 hover:text-indigo-800 font-medium",
                            disabled: loading,
                            children: "Forgot password?"
                        }, void 0, false, {
                            fileName: "[project]/pages/login.jsx",
                            lineNumber: 141,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/login.jsx",
                    lineNumber: 130,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/pages/login.jsx",
            lineNumber: 74,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/pages/login.jsx",
        lineNumber: 73,
        columnNumber: 5
    }, this);
} // "use client";
 // import React, { useState } from 'react';
 // import { useRouter } from 'next/router';
 // import { useAuth } from "../components/AuthContext";
 // export default function Login() {
 //   const router = useRouter();
 //   const [email, setEmail] = useState('');
 //   const [password, setPassword] = useState('');
 //   const [error, setError] = useState('');
 //   const [loading, setLoading] = useState(false);
 //   const { login } = useAuth();
 //   const handleSubmit = async (e) => {
 //     e.preventDefault();
 //     setError('');
 //     setLoading(true);
 //     try {
 //       const response = await fetch('http://localhost:3000/api/login', {
 //         method: 'POST',
 //         headers: {
 //           'Content-Type': 'application/json'
 //         },
 //         body: JSON.stringify({ email, password })
 //       });
 //       const data = await response.json();
 //       if (!response.ok) {
 //         throw new Error(data.error || 'Login failed');
 //       }
 //       // Extract user info from response
 //       const token = data.token || data.accessToken;
 //       const role = data.role || data.user?.role;
 //       const userName = 
 //         data.user?.name ||
 //         data.user?.fullName ||
 //         [data.user?.firstName, data.user?.lastName].filter(Boolean).join(" ") ||
 //         data.name ||
 //         data.fullName ||
 //         email.split('@')[0]; // fallback to email username
 //       const userDept = 
 //         data.user?.department ||
 //         data.department ||
 //         data.user?.dept ||
 //         data.dept ||
 //         role; // fallback to role as department
 //       // Save to context and localStorage
 //       login(token, role, userName, userDept);
 //       // Redirect based on role
 //       if (role === 'admin') {
 //         router.push('/registration/list');
 //       } else {
 //         router.push('/dashboard');
 //       }
 //     } catch (err) {
 //       setError(err.message || 'Invalid email or password');
 //     } finally {
 //       setLoading(false);
 //     }
 //   };
 //   return (
 //     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
 //       <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
 //         <div className="text-center mb-8">
 //           <h2 className="text-3xl font-bold text-gray-800">BEC Computational System</h2>
 //           <p className="text-gray-600 mt-2">Signin using your registered email</p>
 //         </div>
 //         {error && (
 //           <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
 //             {error}
 //           </div>
 //         )}
 //         <form onSubmit={handleSubmit} className="space-y-6">
 //           <div>
 //             <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
 //               Email
 //             </label>
 //             <input
 //               id="email"
 //               type="email"
 //               value={email}
 //               onChange={(e) => setEmail(e.target.value)}
 //               required
 //               className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
 //               placeholder="Enter your email"
 //             />
 //           </div>
 //           <div>
 //             <div className="flex items-center justify-between mb-2">
 //               <label htmlFor="password" className="block text-sm font-medium text-gray-700">
 //                 Password
 //               </label>
 //             </div>
 //             <input
 //               id="password"
 //               type="password"
 //               value={password}
 //               onChange={(e) => setPassword(e.target.value)}
 //               required
 //               className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
 //               placeholder="Enter your password"
 //             />
 //           </div>
 //           <button
 //             type="submit"
 //             disabled={loading}
 //             className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
 //           >
 //             {loading ? 'Logging in...' : 'Login'}
 //           </button>
 //         </form>
 //         <div className="mt-6 text-center space-y-2">
 //           <p className="text-sm text-gray-600">
 //             Don't have an account?{' '}
 //             <button
 //               onClick={() => router.push('/registration')}
 //               className="text-indigo-600 hover:text-indigo-800 font-medium"
 //             >
 //               Register
 //             </button>
 //           </p>
 //           <button
 //             type="button"
 //             onClick={() => router.push('/forgot-password')}
 //             className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
 //           >
 //             Forgot password?
 //           </button>
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

//# sourceMappingURL=%5Broot-of-the-server%5D__465ba0da._.js.map