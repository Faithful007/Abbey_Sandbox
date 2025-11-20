(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/components/AuthContext.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
const AuthCtx = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["createContext"])({
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
    _s();
    const [token, setToken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [role, setRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [name, setName] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [department, setDepartment] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Load persisted auth
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
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
        }
    }["AuthProvider.useEffect"], []);
    const login = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[login]": (t, r, userName, userDepartment)=>{
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
        }
    }["AuthProvider.useCallback[login]"], []);
    const setUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[setUser]": (userName, userDepartment)=>{
            if (userName !== undefined) {
                userName === null ? localStorage.removeItem("auth_name") : localStorage.setItem("auth_name", userName);
                setName(userName);
            }
            if (userDepartment !== undefined) {
                userDepartment === null ? localStorage.removeItem("auth_department") : localStorage.setItem("auth_department", userDepartment);
                setDepartment(userDepartment);
            }
        }
    }["AuthProvider.useCallback[setUser]"], []);
    const logout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[logout]": ()=>{
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
        }
    }["AuthProvider.useCallback[logout]"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthCtx.Provider, {
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
_s(AuthProvider, "23w8roP2zjuu/+e7u/1DwOjpNGs=");
_c = AuthProvider;
function useAuth() {
    _s1();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useContext"])(AuthCtx);
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
_s1(useAuth, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/pages/registration/list.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>RegistrationList
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/router.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AuthContext$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/AuthContext.jsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function RegistrationList() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [registrations, setRegistrations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [searchQuery, setSearchQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [stats, setStats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [page, setPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(1);
    const [pagination, setPagination] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])('');
    const { token, role, name, logout } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AuthContext$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["useAuth"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RegistrationList.useEffect": ()=>{
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
        }
    }["RegistrationList.useEffect"], [
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
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex justify-between items-center mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "text-3xl font-bold text-gray-800",
                            children: "BEC Registrations"
                        }, void 0, false, {
                            fileName: "[project]/pages/registration/list.jsx",
                            lineNumber: 116,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>router.push('/registration'),
                                    className: "bg-indigo-600 text-white py-2 px-6 rounded-lg hover:bg-indigo-700 transition",
                                    children: "+ New Registration"
                                }, void 0, false, {
                                    fileName: "[project]/pages/registration/list.jsx",
                                    lineNumber: 118,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4",
                    children: error
                }, void 0, false, {
                    fileName: "[project]/pages/registration/list.jsx",
                    lineNumber: 134,
                    columnNumber: 11
                }, this),
                stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-lg shadow p-6 mb-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-semibold mb-4",
                            children: "Statistics"
                        }, void 0, false, {
                            fileName: "[project]/pages/registration/list.jsx",
                            lineNumber: 141,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid grid-cols-2 md:grid-cols-4 gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-center p-4 bg-blue-50 rounded",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-3xl font-bold text-blue-600",
                                            children: stats.total
                                        }, void 0, false, {
                                            fileName: "[project]/pages/registration/list.jsx",
                                            lineNumber: 144,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
                                stats.byUnit?.slice(0, 3).map((unit, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-center p-4 bg-green-50 rounded",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-3xl font-bold text-green-600",
                                                children: unit.count
                                            }, void 0, false, {
                                                fileName: "[project]/pages/registration/list.jsx",
                                                lineNumber: 149,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-lg shadow p-4 mb-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleSearch,
                                className: "bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition",
                                children: "Search"
                            }, void 0, false, {
                                fileName: "[project]/pages/registration/list.jsx",
                                lineNumber: 167,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-lg shadow overflow-hidden",
                    children: registrations.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-8 text-center text-gray-500",
                        children: "No registrations found"
                    }, void 0, false, {
                        fileName: "[project]/pages/registration/list.jsx",
                        lineNumber: 187,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "overflow-x-auto",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "min-w-full divide-y divide-gray-200",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            className: "bg-gray-50",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "ID"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 194,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "Name"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 195,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "Age"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 196,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "Email"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 197,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "Mobile"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 198,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "BEC Unit"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 199,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase",
                                                        children: "Role"
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/registration/list.jsx",
                                                        lineNumber: 200,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
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
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            className: "bg-white divide-y divide-gray-200",
                                            children: registrations.map((reg)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    className: "hover:bg-gray-50",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm text-gray-900",
                                                            children: reg.id
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 207,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
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
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm text-gray-900",
                                                            children: reg.age
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 209,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm text-gray-900",
                                                            children: reg.email
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 210,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm text-gray-900",
                                                            children: reg.mobile
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 211,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm text-gray-900",
                                                            children: reg.unit_in_BEC
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/registration/list.jsx",
                                                            lineNumber: 212,
                                                            columnNumber: 25
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            className: "px-6 py-4 text-sm",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>router.push(`/registration/edit/${reg.id}`),
                                                                    className: "text-indigo-600 hover:text-indigo-800 mr-3",
                                                                    children: "Edit"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/registration/list.jsx",
                                                                    lineNumber: 221,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                            pagination && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-gray-50 px-6 py-4 flex items-center justify-between border-t",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                onClick: ()=>setPage((p)=>Math.max(1, p - 1)),
                                                disabled: page === 1,
                                                className: "px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100",
                                                children: "Previous"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/registration/list.jsx",
                                                lineNumber: 246,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
_s(RegistrationList, "STFzecpGz+Mz72zC004rs2Dtbzc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$router$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$AuthContext$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = RegistrationList;
var _c;
__turbopack_context__.k.register(_c, "RegistrationList");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/pages/registration/list.jsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/registration/list";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/pages/registration/list.jsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/pages/registration/list.jsx\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/pages/registration/list.jsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__7c913578._.js.map