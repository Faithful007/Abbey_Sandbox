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
"[project]/__tests__/components/ColumnDistributionChart.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ColumnDistributionChart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$BarChart$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/BarChart.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/Bar.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/LineChart.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/Line.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$PieChart$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/PieChart.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$polar$2f$Pie$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/polar/Pie.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Cell.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$ScatterChart$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/ScatterChart.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Scatter$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/Scatter.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/XAxis.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/YAxis.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Tooltip.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/CartesianGrid.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/ResponsiveContainer.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
const PIE_COLORS = [
    "#6366f1",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6"
];
function isNum(s) {
    if (!s && s !== 0) return false;
    const n = parseFloat(String(s));
    return !isNaN(n) && isFinite(n);
}
function buildHistogram(values) {
    const nums = values.filter(isNum).map((v)=>parseFloat(v));
    if (nums.length === 0) return [];
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (min === max) return [
        {
            name: String(min),
            count: nums.length
        }
    ];
    const bins = 10;
    const width = (max - min) / bins;
    const buckets = Array(bins).fill(0);
    nums.forEach((n)=>{
        let idx = Math.floor((n - min) / width);
        if (idx >= bins) idx = bins - 1;
        buckets[idx]++;
    });
    return buckets.map((count, i)=>({
            name: `${(min + i * width).toFixed(1)}`,
            count
        }));
}
function buildCategorical(values) {
    const counts = {};
    values.forEach((v)=>{
        const key = v === null || v === undefined || v === "" ? "(empty)" : String(v);
        counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b)=>b[1] - a[1]).slice(0, 10).map(([name, count])=>({
            name,
            count
        }));
}
function buildScatter(values) {
    return values.map((v, i)=>({
            x: i,
            y: isNum(v) ? parseFloat(v) : null
        })).filter((p)=>p.y !== null);
}
function ColumnDistributionChart({ header, values }) {
    _s();
    const [chartType, setChartType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("histogram");
    const isNumeric = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ColumnDistributionChart.useMemo[isNumeric]": ()=>{
            const sample = values.slice(0, 100);
            return sample.filter(isNum).length / sample.length > 0.5;
        }
    }["ColumnDistributionChart.useMemo[isNumeric]"], [
        values
    ]);
    const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ColumnDistributionChart.useMemo[data]": ()=>{
            if (chartType === "scatter") return buildScatter(values);
            if (isNumeric) return buildHistogram(values);
            return buildCategorical(values);
        }
    }["ColumnDistributionChart.useMemo[data]"], [
        chartType,
        isNumeric,
        values
    ]);
    if (!data || data.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "border rounded p-4 bg-white",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                    className: "font-bold text-sm mb-2",
                    children: header
                }, void 0, false, {
                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                    lineNumber: 90,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "h-64 flex items-center justify-center text-gray-400",
                    children: "No data"
                }, void 0, false, {
                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                    lineNumber: 91,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
            lineNumber: 89,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "border rounded p-4 bg-white",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-between items-center mb-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "font-bold text-sm",
                        children: header
                    }, void 0, false, {
                        fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                        lineNumber: 99,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                        value: chartType,
                        onChange: (e)=>setChartType(e.target.value),
                        className: "text-xs border rounded px-2 py-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "histogram",
                                children: "Histogram"
                            }, void 0, false, {
                                fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                lineNumber: 105,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "bar",
                                children: "Bar"
                            }, void 0, false, {
                                fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                lineNumber: 106,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "line",
                                children: "Line"
                            }, void 0, false, {
                                fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                lineNumber: 107,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "pie",
                                children: "Pie"
                            }, void 0, false, {
                                fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                lineNumber: 108,
                                columnNumber: 11
                            }, this),
                            isNumeric && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "scatter",
                                children: "Scatter"
                            }, void 0, false, {
                                fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                lineNumber: 109,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                        lineNumber: 100,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                lineNumber: 98,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "w-full",
                style: {
                    height: "280px"
                },
                children: [
                    (chartType === "histogram" || chartType === "bar") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                        width: "100%",
                        height: "100%",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$BarChart$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BarChart"], {
                            data: data,
                            margin: {
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 40
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$client$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                                    strokeDasharray: "3 3"
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 117,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__["XAxis"], {
                                    dataKey: "name",
                                    angle: -45,
                                    textAnchor: "end",
                                    height: 70,
                                    interval: 0,
                                    tick: {
                                        fontSize: 10
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 118,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__["YAxis"], {
                                    tick: {
                                        fontSize: 10
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 126,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Tooltip"], {}, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 127,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Bar"], {
                                    dataKey: "count",
                                    fill: "#6366f1"
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 128,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                            lineNumber: 116,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                        lineNumber: 115,
                        columnNumber: 11
                    }, this),
                    chartType === "line" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                        width: "100%",
                        height: "100%",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$LineChart$2e$js__$5b$client$5d$__$28$ecmascript$29$__["LineChart"], {
                            data: data,
                            margin: {
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 40
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$client$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                                    strokeDasharray: "3 3"
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 136,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__["XAxis"], {
                                    dataKey: "name",
                                    angle: -45,
                                    textAnchor: "end",
                                    height: 70,
                                    tick: {
                                        fontSize: 10
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 137,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__["YAxis"], {
                                    tick: {
                                        fontSize: 10
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 144,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Tooltip"], {}, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 145,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Line"], {
                                    type: "monotone",
                                    dataKey: "count",
                                    stroke: "#ef4444",
                                    strokeWidth: 2
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 146,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                            lineNumber: 135,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                        lineNumber: 134,
                        columnNumber: 11
                    }, this),
                    chartType === "pie" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                        width: "100%",
                        height: "100%",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$PieChart$2e$js__$5b$client$5d$__$28$ecmascript$29$__["PieChart"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$polar$2f$Pie$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Pie"], {
                                    data: data,
                                    dataKey: "count",
                                    nameKey: "name",
                                    cx: "50%",
                                    cy: "50%",
                                    outerRadius: 90,
                                    label: true,
                                    children: data.map((entry, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Cell"], {
                                            fill: PIE_COLORS[i % PIE_COLORS.length]
                                        }, i, false, {
                                            fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                            lineNumber: 164,
                                            columnNumber: 19
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 154,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Tooltip"], {}, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 167,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                            lineNumber: 153,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                        lineNumber: 152,
                        columnNumber: 11
                    }, this),
                    chartType === "scatter" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
                        width: "100%",
                        height: "100%",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$ScatterChart$2e$js__$5b$client$5d$__$28$ecmascript$29$__["ScatterChart"], {
                            margin: {
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 20
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$client$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                                    strokeDasharray: "3 3"
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 175,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__["XAxis"], {
                                    type: "number",
                                    dataKey: "x",
                                    name: "Index",
                                    tick: {
                                        fontSize: 10
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 176,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__["YAxis"], {
                                    type: "number",
                                    dataKey: "y",
                                    name: "Value",
                                    tick: {
                                        fontSize: 10
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 177,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Tooltip"], {
                                    cursor: {
                                        strokeDasharray: "3 3"
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 178,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Scatter$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Scatter"], {
                                    data: data,
                                    fill: "#6366f1"
                                }, void 0, false, {
                                    fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                                    lineNumber: 179,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                            lineNumber: 174,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                        lineNumber: 173,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                lineNumber: 113,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "text-xs text-gray-500 mt-2",
                children: [
                    isNumeric ? "Numeric" : "Categorical",
                    " • ",
                    values.length,
                    " rows • ",
                    chartType
                ]
            }, void 0, true, {
                fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
                lineNumber: 185,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/__tests__/components/ColumnDistributionChart.jsx",
        lineNumber: 97,
        columnNumber: 5
    }, this);
} // /**
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
_s(ColumnDistributionChart, "q0LZ6rvqaJ+ATFH1eJHOG2PUcpI=");
_c = ColumnDistributionChart;
var _c;
__turbopack_context__.k.register(_c, "ColumnDistributionChart");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/pages/dashboard/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$_$5f$tests_$5f2f$components$2f$ColumnDistributionChart$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/__tests__/components/ColumnDistributionChart.jsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
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
    _s();
    // Render charts only on client to avoid SSR mismatch with Recharts
    const [isClient, setIsClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Upload/analysis state
    const [file, setFile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null); // parsed CSV rows (array of objects)
    const [headers, setHeaders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]); // column names
    const [statistics, setStatistics] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null); // response from /stats/:filename
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Dashboard.useEffect": ()=>setIsClient(true)
    }["Dashboard.useEffect"], []);
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
    const previewRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Dashboard.useMemo[previewRows]": ()=>data ? data.slice(0, 10) : []
    }["Dashboard.useMemo[previewRows]"], [
        data
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto p-6",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-3xl sm:text-4xl font-bold text-gray-800 mb-6",
                    children: "Statistical Analysis Dashboard"
                }, void 0, false, {
                    fileName: "[project]/pages/dashboard/index.jsx",
                    lineNumber: 142,
                    columnNumber: 9
                }, this),
                !data ? // Upload panel
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-lg shadow p-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-semibold mb-4",
                            children: "Upload CSV File"
                        }, void 0, false, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 149,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    htmlFor: "file-upload",
                                    className: "cursor-pointer inline-block",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-6xl mb-4",
                                            children: "📊"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 160,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-lg text-gray-600 mb-1",
                                            children: file ? file.name : "Click to select CSV file"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 161,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
                        error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm",
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 169,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-gray-600",
                                    children: [
                                        "File: ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
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
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-x-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: exportJSON,
                                            className: "bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition",
                                            children: "Export JSON"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 191,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
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
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white rounded-lg shadow p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-xl font-semibold mb-3",
                                    children: "Statistics Overview"
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 208,
                                    columnNumber: 15
                                }, this),
                                statistics?.columnStats && Object.keys(statistics.columnStats).length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
                                    children: Object.entries(statistics.columnStats).map(([column, stats])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "border rounded-lg p-4 bg-gray-50",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                    className: "font-semibold text-indigo-600 mb-2",
                                                    children: column
                                                }, void 0, false, {
                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                    lineNumber: 213,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-sm space-y-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Count:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 216,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                                        "mean" in stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Mean:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 221,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                                        "median" in stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Median:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 229,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                                        "stdDev" in stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Std Dev:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 237,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                                        "min" in stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Min:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 245,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                                        "max" in stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Max:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 253,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
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
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white rounded-lg shadow p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-xl font-semibold mb-3",
                                    children: "Data Preview"
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 270,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "overflow-x-auto",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                        className: "min-w-full divide-y divide-gray-200",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                className: "bg-gray-50",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    children: headers.map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
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
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                className: "bg-white divide-y divide-gray-200",
                                                children: previewRows.map((row, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        className: "hover:bg-gray-50",
                                                        children: headers.map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
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
                                data.length > 10 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
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
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white rounded-lg shadow p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-xl font-semibold mb-4",
                                    children: "Column Distributions"
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 305,
                                    columnNumber: 15
                                }, this),
                                !isClient ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-gray-500",
                                    children: "Loading charts…"
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 307,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6",
                                    children: headers.map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$_$5f$tests_$5f2f$components$2f$ColumnDistributionChart$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
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
_s(Dashboard, "fXe9ykWqxgN6R44XSJq8xuI3Y2Y=");
_c = Dashboard;
var _c;
__turbopack_context__.k.register(_c, "Dashboard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/pages/dashboard/index.jsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/dashboard";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/pages/dashboard/index.jsx [client] (ecmascript)");
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
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/pages/dashboard/index.jsx\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/pages/dashboard/index.jsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__96aa16a6._.js.map