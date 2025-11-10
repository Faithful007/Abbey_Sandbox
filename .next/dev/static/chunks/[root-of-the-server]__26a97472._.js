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
"[project]/components/ColumnDistributionChart.jsx [client] (ecmascript)", ((__turbopack_context__) => {
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
function buildHistogram(values, bins = 10) {
    const nums = values.filter(isNum).map((v)=>parseFloat(v));
    if (nums.length === 0) return [];
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (min === max) return [
        {
            name: String(min),
            count: nums.length,
            binStart: min,
            binEnd: max
        }
    ];
    const width = (max - min) / bins;
    const buckets = Array(bins).fill(null).map((_, i)=>({
            binStart: min + i * width,
            binEnd: min + (i + 1) * width,
            count: 0,
            indices: []
        }));
    nums.forEach((n, idx)=>{
        let binIdx = Math.floor((n - min) / width);
        if (binIdx >= bins) binIdx = bins - 1;
        buckets[binIdx].count++;
        buckets[binIdx].indices.push(idx);
    });
    return buckets.map((bucket, i)=>({
            name: `${bucket.binStart.toFixed(1)}`,
            count: bucket.count,
            binStart: bucket.binStart,
            binEnd: bucket.binEnd,
            indices: bucket.indices
        }));
}
function buildCategorical(values, maxCategories = 10) {
    const counts = new Map();
    values.forEach((v, idx)=>{
        const key = v === null || v === undefined || v === "" ? "(empty)" : String(v);
        if (!counts.has(key)) {
            counts.set(key, {
                count: 0,
                indices: []
            });
        }
        counts.get(key).count++;
        counts.get(key).indices.push(idx);
    });
    const sorted = Array.from(counts.entries()).sort((a, b)=>b[1].count - a[1].count).slice(0, maxCategories);
    return sorted.map(([name, data])=>({
            name,
            count: data.count,
            indices: data.indices
        }));
}
function buildScatter(values, pointSize = 5) {
    return values.map((v, i)=>({
            x: i,
            y: isNum(v) ? parseFloat(v) : null,
            size: pointSize,
            index: i
        })).filter((p)=>p.y !== null);
}
function ColumnDistributionChart({ header, values, onValueChange }) {
    _s();
    const [chartType, setChartType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("histogram");
    const [bins, setBins] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(10);
    const [maxCategories, setMaxCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(10);
    const [pointSize, setPointSize] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(5);
    const [barWidth, setBarWidth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(20);
    const [lineWidth, setLineWidth] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(2);
    const [pieRadius, setPieRadius] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(80);
    const [draggedItem, setDraggedItem] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
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
            if (chartType === "scatter") return buildScatter(values, pointSize);
            if (isNumeric) return buildHistogram(values, bins);
            return buildCategorical(values, maxCategories);
        }
    }["ColumnDistributionChart.useMemo[data]"], [
        chartType,
        isNumeric,
        values,
        bins,
        maxCategories,
        pointSize
    ]);
    // Handle bar click to enable editing
    const handleBarClick = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ColumnDistributionChart.useCallback[handleBarClick]": (data, index)=>{
            if (!data || !data.indices) return;
            const newValue = prompt(`Edit value for ${data.name}\nCurrent count: ${data.count}\nEnter new value for all ${data.count} items:`, data.indices.length > 0 ? values[data.indices[0]] : "");
            if (newValue !== null && onValueChange) {
                data.indices.forEach({
                    "ColumnDistributionChart.useCallback[handleBarClick]": (idx)=>{
                        onValueChange(idx, newValue);
                    }
                }["ColumnDistributionChart.useCallback[handleBarClick]"]);
            }
        }
    }["ColumnDistributionChart.useCallback[handleBarClick]"], [
        values,
        onValueChange
    ]);
    // Handle scatter point drag
    const handleScatterClick = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "ColumnDistributionChart.useCallback[handleScatterClick]": (data)=>{
            if (!data || data.index === undefined) return;
            const newValue = prompt(`Edit value at row ${data.index}\nCurrent value: ${data.y}`, data.y);
            if (newValue !== null && onValueChange) {
                onValueChange(data.index, newValue);
            }
        }
    }["ColumnDistributionChart.useCallback[handleScatterClick]"], [
        onValueChange
    ]);
    if (!data || data.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "border rounded p-4 bg-white",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                    className: "font-bold text-sm mb-2",
                    children: header
                }, void 0, false, {
                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                    lineNumber: 141,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "h-64 flex items-center justify-center text-gray-400",
                    children: "No data"
                }, void 0, false, {
                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                    lineNumber: 142,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/ColumnDistributionChart.jsx",
            lineNumber: 140,
            columnNumber: 7
        }, this);
    }
    const CustomBar = (props)=>{
        const { x, y, width, height, fill, payload, index } = props;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: x,
                y: y,
                width: width,
                height: height,
                fill: fill,
                style: {
                    cursor: 'pointer'
                },
                onClick: ()=>handleBarClick(payload, index),
                onMouseEnter: (e)=>e.target.style.opacity = 0.7,
                onMouseLeave: (e)=>e.target.style.opacity = 1
            }, void 0, false, {
                fileName: "[project]/components/ColumnDistributionChart.jsx",
                lineNumber: 151,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/ColumnDistributionChart.jsx",
            lineNumber: 150,
            columnNumber: 7
        }, this);
    };
    const CustomDot = (props)=>{
        const { cx, cy, payload } = props;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
            cx: cx,
            cy: cy,
            r: pointSize,
            fill: "#6366f1",
            style: {
                cursor: 'pointer'
            },
            onClick: ()=>handleScatterClick(payload),
            onMouseEnter: (e)=>e.target.setAttribute('r', pointSize + 2),
            onMouseLeave: (e)=>e.target.setAttribute('r', pointSize)
        }, void 0, false, {
            fileName: "[project]/components/ColumnDistributionChart.jsx",
            lineNumber: 169,
            columnNumber: 7
        }, this);
    };
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
                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                        lineNumber: 185,
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
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 187,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "bar",
                                children: "Bar"
                            }, void 0, false, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 188,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "line",
                                children: "Line"
                            }, void 0, false, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 189,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "pie",
                                children: "Pie"
                            }, void 0, false, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 190,
                                columnNumber: 11
                            }, this),
                            isNumeric && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "scatter",
                                children: "Scatter"
                            }, void 0, false, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 191,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                        lineNumber: 186,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ColumnDistributionChart.jsx",
                lineNumber: 184,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-1 text-xs text-blue-600 italic",
                children: [
                    "Click on ",
                    chartType === "scatter" ? "points" : "bars",
                    " to edit values"
                ]
            }, void 0, true, {
                fileName: "[project]/components/ColumnDistributionChart.jsx",
                lineNumber: 195,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-2 flex flex-wrap gap-3 text-xs",
                children: [
                    isNumeric && (chartType === "histogram" || chartType === "bar") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "flex items-center gap-1",
                        children: [
                            "Bins:",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: "5",
                                max: "30",
                                value: bins,
                                onChange: (e)=>setBins(parseInt(e.target.value)),
                                className: "w-20"
                            }, void 0, false, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 203,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-gray-600",
                                children: bins
                            }, void 0, false, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 204,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                        lineNumber: 201,
                        columnNumber: 11
                    }, this),
                    !isNumeric && (chartType === "bar" || chartType === "line" || chartType === "pie") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "flex items-center gap-1",
                        children: [
                            "Categories:",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: "5",
                                max: "20",
                                value: maxCategories,
                                onChange: (e)=>setMaxCategories(parseInt(e.target.value)),
                                className: "w-20"
                            }, void 0, false, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 211,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-gray-600",
                                children: maxCategories
                            }, void 0, false, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 212,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                        lineNumber: 209,
                        columnNumber: 11
                    }, this),
                    (chartType === "histogram" || chartType === "bar") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "flex items-center gap-1",
                        children: [
                            "Bar Width:",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: "10",
                                max: "50",
                                value: barWidth,
                                onChange: (e)=>setBarWidth(parseInt(e.target.value)),
                                className: "w-20"
                            }, void 0, false, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 219,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-gray-600",
                                children: [
                                    barWidth,
                                    "px"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 220,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                        lineNumber: 217,
                        columnNumber: 11
                    }, this),
                    chartType === "line" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "flex items-center gap-1",
                        children: [
                            "Line Width:",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: "1",
                                max: "5",
                                value: lineWidth,
                                onChange: (e)=>setLineWidth(parseInt(e.target.value)),
                                className: "w-20"
                            }, void 0, false, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 227,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-gray-600",
                                children: [
                                    lineWidth,
                                    "px"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 228,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                        lineNumber: 225,
                        columnNumber: 11
                    }, this),
                    chartType === "pie" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "flex items-center gap-1",
                        children: [
                            "Pie Radius:",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: "50",
                                max: "120",
                                value: pieRadius,
                                onChange: (e)=>setPieRadius(parseInt(e.target.value)),
                                className: "w-20"
                            }, void 0, false, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 235,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-gray-600",
                                children: [
                                    pieRadius,
                                    "px"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 236,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                        lineNumber: 233,
                        columnNumber: 11
                    }, this),
                    chartType === "scatter" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "flex items-center gap-1",
                        children: [
                            "Point Size:",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "range",
                                min: "2",
                                max: "15",
                                value: pointSize,
                                onChange: (e)=>setPointSize(parseInt(e.target.value)),
                                className: "w-20"
                            }, void 0, false, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 243,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-gray-600",
                                children: [
                                    pointSize,
                                    "px"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ColumnDistributionChart.jsx",
                                lineNumber: 244,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                        lineNumber: 241,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ColumnDistributionChart.jsx",
                lineNumber: 199,
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
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 253,
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
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 254,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__["YAxis"], {
                                    tick: {
                                        fontSize: 10
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 255,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Tooltip"], {}, void 0, false, {
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 256,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Bar$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Bar"], {
                                    dataKey: "count",
                                    fill: chartType === "histogram" ? "#6366f1" : "#10b981",
                                    barSize: barWidth,
                                    shape: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomBar, {}, void 0, false, {
                                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                                        lineNumber: 261,
                                        columnNumber: 24
                                    }, void 0)
                                }, void 0, false, {
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 257,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ColumnDistributionChart.jsx",
                            lineNumber: 252,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                        lineNumber: 251,
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
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 270,
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
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 271,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$client$5d$__$28$ecmascript$29$__["YAxis"], {
                                    tick: {
                                        fontSize: 10
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 272,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Tooltip"], {}, void 0, false, {
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 273,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Line$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Line"], {
                                    type: "monotone",
                                    dataKey: "count",
                                    stroke: "#ef4444",
                                    strokeWidth: lineWidth,
                                    dot: {
                                        r: lineWidth + 1,
                                        style: {
                                            cursor: 'pointer'
                                        }
                                    },
                                    onClick: handleBarClick
                                }, void 0, false, {
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 274,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ColumnDistributionChart.jsx",
                            lineNumber: 269,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                        lineNumber: 268,
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
                                    outerRadius: pieRadius,
                                    label: data.length <= 8,
                                    onClick: (data, index)=>handleBarClick(data, index),
                                    style: {
                                        cursor: 'pointer'
                                    },
                                    children: data.map((entry, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Cell"], {
                                            fill: PIE_COLORS[i % PIE_COLORS.length]
                                        }, i, false, {
                                            fileName: "[project]/components/ColumnDistributionChart.jsx",
                                            lineNumber: 300,
                                            columnNumber: 42
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 289,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Tooltip"], {}, void 0, false, {
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 302,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ColumnDistributionChart.jsx",
                            lineNumber: 288,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                        lineNumber: 287,
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
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 310,
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
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 311,
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
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 312,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Tooltip"], {
                                    cursor: {
                                        strokeDasharray: "3 3"
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 313,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Scatter$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Scatter"], {
                                    data: data,
                                    fill: "#6366f1",
                                    shape: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomDot, {}, void 0, false, {
                                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                                        lineNumber: 317,
                                        columnNumber: 24
                                    }, void 0)
                                }, void 0, false, {
                                    fileName: "[project]/components/ColumnDistributionChart.jsx",
                                    lineNumber: 314,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ColumnDistributionChart.jsx",
                            lineNumber: 309,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/ColumnDistributionChart.jsx",
                        lineNumber: 308,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ColumnDistributionChart.jsx",
                lineNumber: 249,
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
                fileName: "[project]/components/ColumnDistributionChart.jsx",
                lineNumber: 324,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ColumnDistributionChart.jsx",
        lineNumber: 183,
        columnNumber: 5
    }, this);
} // "use client";
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
_s(ColumnDistributionChart, "AL/nsr39UVTA0PGF6XrFJm9TzxI=");
_c = ColumnDistributionChart;
var _c;
__turbopack_context__.k.register(_c, "ColumnDistributionChart");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/pages/dashboard/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Dashboard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ColumnDistributionChart$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ColumnDistributionChart.jsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
const csvSplit = (line)=>line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
function parseCSV(text) {
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
    const [isClient, setIsClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [file, setFile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [headers, setHeaders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [statistics, setStatistics] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editingCell, setEditingCell] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editValue, setEditValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [dataVersion, setDataVersion] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(0); // Force chart re-render
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Dashboard.useEffect": ()=>setIsClient(true)
    }["Dashboard.useEffect"], []);
    const handleFileChange = (e)=>{
        const selectedFile = e.target.files?.[0];
        if (selectedFile && selectedFile.name.toLowerCase().endsWith(".csv")) {
            setFile(selectedFile);
            setError(null);
        } else {
            setError("Please select a valid .csv file");
        }
    };
    const handleUpload = async ()=>{
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await fetch("http://localhost:3000/upload", {
                method: "POST",
                body: formData
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
        } finally{
            setLoading(false);
        }
    };
    const handleReset = ()=>{
        setFile(null);
        setData(null);
        setHeaders([]);
        setStatistics(null);
        setError(null);
        setEditingCell(null);
        setDataVersion(0);
    };
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
    // Show all rows instead of just 10
    const [showAllRows, setShowAllRows] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const previewRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Dashboard.useMemo[previewRows]": ()=>{
            if (!data) return [];
            return showAllRows ? data : data.slice(0, 20);
        }
    }["Dashboard.useMemo[previewRows]"], [
        data,
        showAllRows
    ]);
    const startEdit = (rowIndex, colName, currentValue)=>{
        setEditingCell({
            rowIndex,
            colName
        });
        setEditValue(currentValue);
    };
    const saveEdit = (rowIndex, colName)=>{
        if (editingCell) {
            const newData = [
                ...data
            ];
            newData[rowIndex][colName] = editValue;
            setData(newData);
            setEditingCell(null);
            setEditValue("");
            setDataVersion((v)=>v + 1); // Trigger chart update
        }
    };
    const cancelEdit = ()=>{
        setEditingCell(null);
        setEditValue("");
    };
    // Handle value change from chart
    const handleChartValueChange = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "Dashboard.useCallback[handleChartValueChange]": (columnName)=>{
            return ({
                "Dashboard.useCallback[handleChartValueChange]": (rowIndex, newValue)=>{
                    const newData = [
                        ...data
                    ];
                    if (newData[rowIndex]) {
                        newData[rowIndex][columnName] = newValue;
                        setData(newData);
                        setDataVersion({
                            "Dashboard.useCallback[handleChartValueChange]": (v)=>v + 1
                        }["Dashboard.useCallback[handleChartValueChange]"]); // Trigger chart update
                    }
                }
            })["Dashboard.useCallback[handleChartValueChange]"];
        }
    }["Dashboard.useCallback[handleChartValueChange]"], [
        data
    ]);
    // Recalculate statistics when data changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Dashboard.useEffect": ()=>{
            if (!data || data.length === 0) return;
            const calculateStats = {
                "Dashboard.useEffect.calculateStats": ()=>{
                    const columnStats = {};
                    headers.forEach({
                        "Dashboard.useEffect.calculateStats": (header)=>{
                            const values = data.map({
                                "Dashboard.useEffect.calculateStats.values": (row)=>row[header]
                            }["Dashboard.useEffect.calculateStats.values"]).filter({
                                "Dashboard.useEffect.calculateStats.values": (v)=>v !== null && v !== undefined && v !== ""
                            }["Dashboard.useEffect.calculateStats.values"]);
                            const numericValues = values.filter({
                                "Dashboard.useEffect.calculateStats.numericValues": (v)=>!isNaN(parseFloat(v))
                            }["Dashboard.useEffect.calculateStats.numericValues"]).map({
                                "Dashboard.useEffect.calculateStats.numericValues": (v)=>parseFloat(v)
                            }["Dashboard.useEffect.calculateStats.numericValues"]);
                            if (numericValues.length > values.length * 0.5) {
                                // Numeric column
                                const sorted = [
                                    ...numericValues
                                ].sort({
                                    "Dashboard.useEffect.calculateStats.sorted": (a, b)=>a - b
                                }["Dashboard.useEffect.calculateStats.sorted"]);
                                const sum = numericValues.reduce({
                                    "Dashboard.useEffect.calculateStats.sum": (acc, val)=>acc + val
                                }["Dashboard.useEffect.calculateStats.sum"], 0);
                                const mean = sum / numericValues.length;
                                const median = sorted[Math.floor(sorted.length / 2)];
                                const variance = numericValues.reduce({
                                    "Dashboard.useEffect.calculateStats": (acc, val)=>acc + Math.pow(val - mean, 2)
                                }["Dashboard.useEffect.calculateStats"], 0) / numericValues.length;
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
                        }
                    }["Dashboard.useEffect.calculateStats"]);
                    setStatistics({
                        columnStats
                    });
                }
            }["Dashboard.useEffect.calculateStats"];
            calculateStats();
        }
    }["Dashboard.useEffect"], [
        data,
        headers,
        dataVersion
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
                    lineNumber: 193,
                    columnNumber: 9
                }, this),
                !data ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white rounded-lg shadow p-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xl font-semibold mb-4",
                            children: "Upload CSV File"
                        }, void 0, false, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 199,
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
                                    lineNumber: 202,
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
                                            lineNumber: 210,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-lg text-gray-600 mb-1",
                                            children: file ? file.name : "Click to select CSV file"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 211,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm text-gray-400",
                                            children: "CSV files only"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 214,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 209,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 201,
                            columnNumber: 13
                        }, this),
                        error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm",
                            children: error
                        }, void 0, false, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 219,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleUpload,
                            disabled: !file || loading,
                            className: "mt-6 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition",
                            children: loading ? "Analyzing..." : "Analyze Data"
                        }, void 0, false, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 224,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/dashboard/index.jsx",
                    lineNumber: 198,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
                                            lineNumber: 236,
                                            columnNumber: 23
                                        }, this),
                                        " • Modified: ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            className: "text-green-600",
                                            children: dataVersion > 0 ? 'Yes' : 'No'
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 236,
                                            columnNumber: 65
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 235,
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
                                            lineNumber: 239,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: handleReset,
                                            className: "bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition",
                                            children: "New Analysis"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 245,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 238,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 234,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white rounded-lg shadow p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-xl font-semibold mb-3",
                                    children: [
                                        "Statistics Overview",
                                        dataVersion > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-sm text-green-600 ml-2",
                                            children: "(Live Updated)"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 258,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 256,
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
                                                    lineNumber: 264,
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
                                                                    lineNumber: 267,
                                                                    columnNumber: 27
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium",
                                                                    children: stats.count
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 268,
                                                                    columnNumber: 27
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                            lineNumber: 266,
                                                            columnNumber: 25
                                                        }, this),
                                                        "mean" in stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex justify-between",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-gray-600",
                                                                            children: "Mean:"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                                            lineNumber: 273,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "font-medium",
                                                                            children: Number(stats.mean)?.toFixed?.(2)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                                            lineNumber: 274,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 272,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex justify-between",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-gray-600",
                                                                            children: "Median:"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                                            lineNumber: 277,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "font-medium",
                                                                            children: Number(stats.median)?.toFixed?.(2)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                                            lineNumber: 278,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 276,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex justify-between",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-gray-600",
                                                                            children: "Std Dev:"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                                            lineNumber: 281,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "font-medium",
                                                                            children: Number(stats.stdDev)?.toFixed?.(2)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                                            lineNumber: 282,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 280,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex justify-between",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-gray-600",
                                                                            children: "Min:"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                                            lineNumber: 285,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "font-medium",
                                                                            children: Number(stats.min)?.toFixed?.(2)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                                            lineNumber: 286,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 284,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex justify-between",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-gray-600",
                                                                            children: "Max:"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                                            lineNumber: 289,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "font-medium",
                                                                            children: Number(stats.max)?.toFixed?.(2)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                                            lineNumber: 290,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 288,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true),
                                                        "unique" in stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-gray-600",
                                                                    children: "Unique:"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 296,
                                                                    columnNumber: 29
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium",
                                                                    children: stats.unique
                                                                }, void 0, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 297,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                            lineNumber: 295,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                    lineNumber: 265,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, column, true, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 263,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 261,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-gray-500",
                                    children: "No statistics available."
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 305,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 255,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white rounded-lg shadow p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-between items-center mb-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                            className: "text-xl font-semibold",
                                            children: "Data Preview (Editable)"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 312,
                                            columnNumber: 17
                                        }, this),
                                        data.length > 20 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>setShowAllRows(!showAllRows),
                                            className: "text-sm text-indigo-600 hover:text-indigo-800 underline",
                                            children: showAllRows ? 'Show Less' : `Show All ${data.length} Rows`
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 314,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 311,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-3 p-3 bg-blue-50 border border-blue-200 rounded",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-blue-800",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: "💡 Tip:"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/dashboard/index.jsx",
                                                lineNumber: 324,
                                                columnNumber: 19
                                            }, this),
                                            " Double-click any cell to edit. Press Enter to save or Escape to cancel. Changes will automatically update the charts below."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/dashboard/index.jsx",
                                        lineNumber: 323,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 322,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "overflow-x-auto",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                        className: "min-w-full divide-y divide-gray-200",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                className: "bg-gray-50 sticky top-0",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase",
                                                            children: "#"
                                                        }, void 0, false, {
                                                            fileName: "[project]/pages/dashboard/index.jsx",
                                                            lineNumber: 332,
                                                            columnNumber: 23
                                                        }, this),
                                                        headers.map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                                className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                                                                children: h
                                                            }, h, false, {
                                                                fileName: "[project]/pages/dashboard/index.jsx",
                                                                lineNumber: 334,
                                                                columnNumber: 25
                                                            }, this))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                    lineNumber: 331,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/pages/dashboard/index.jsx",
                                                lineNumber: 330,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                className: "bg-white divide-y divide-gray-200",
                                                children: previewRows.map((row, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        className: "hover:bg-gray-50",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-4 py-2 text-sm text-gray-500",
                                                                children: idx + 1
                                                            }, void 0, false, {
                                                                fileName: "[project]/pages/dashboard/index.jsx",
                                                                lineNumber: 346,
                                                                columnNumber: 25
                                                            }, this),
                                                            headers.map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "px-4 py-2 text-sm text-gray-800 cursor-pointer hover:bg-blue-50",
                                                                    onDoubleClick: ()=>startEdit(idx, h, row[h]),
                                                                    title: "Double-click to edit",
                                                                    children: editingCell?.rowIndex === idx && editingCell?.colName === h ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "text",
                                                                        value: editValue,
                                                                        onChange: (e)=>setEditValue(e.target.value),
                                                                        onBlur: ()=>saveEdit(idx, h),
                                                                        onKeyDown: (e)=>{
                                                                            if (e.key === "Enter") saveEdit(idx, h);
                                                                            if (e.key === "Escape") cancelEdit();
                                                                        },
                                                                        autoFocus: true,
                                                                        className: "w-full px-2 py-1 border-2 border-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/pages/dashboard/index.jsx",
                                                                        lineNumber: 355,
                                                                        columnNumber: 31
                                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: editingCell?.rowIndex === idx && editingCell?.colName === h ? 'font-bold' : '',
                                                                        children: row[h]
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/pages/dashboard/index.jsx",
                                                                        lineNumber: 368,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                }, h, false, {
                                                                    fileName: "[project]/pages/dashboard/index.jsx",
                                                                    lineNumber: 348,
                                                                    columnNumber: 27
                                                                }, this))
                                                        ]
                                                    }, idx, true, {
                                                        fileName: "[project]/pages/dashboard/index.jsx",
                                                        lineNumber: 345,
                                                        columnNumber: 23
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/pages/dashboard/index.jsx",
                                                lineNumber: 343,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/dashboard/index.jsx",
                                        lineNumber: 329,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 328,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-3 text-sm text-gray-500",
                                    children: [
                                        "Showing ",
                                        previewRows.length,
                                        " of ",
                                        data.length,
                                        " rows • Double-click any cell to edit"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 379,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 310,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white rounded-lg shadow p-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-xl font-semibold mb-4",
                                    children: [
                                        "Column Distributions (Interactive)",
                                        dataVersion > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-sm text-green-600 ml-2",
                                            children: "(Live Updated)"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 388,
                                            columnNumber: 37
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 386,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-yellow-800",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                                children: "🎯 Interactive Charts:"
                                            }, void 0, false, {
                                                fileName: "[project]/pages/dashboard/index.jsx",
                                                lineNumber: 392,
                                                columnNumber: 19
                                            }, this),
                                            " Click on bars, points, or pie slices to edit values. All changes sync with the data table above in real-time."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/dashboard/index.jsx",
                                        lineNumber: 391,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 390,
                                    columnNumber: 15
                                }, this),
                                !isClient ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-gray-500",
                                    children: "Loading charts…"
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 397,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6",
                                    children: headers.map((h)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ColumnDistributionChart$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                                            header: h,
                                            values: data.map((row)=>row[h]),
                                            onValueChange: handleChartValueChange(h)
                                        }, `${h}-${dataVersion}`, false, {
                                            fileName: "[project]/pages/dashboard/index.jsx",
                                            lineNumber: 401,
                                            columnNumber: 21
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/pages/dashboard/index.jsx",
                                    lineNumber: 399,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/pages/dashboard/index.jsx",
                            lineNumber: 385,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/dashboard/index.jsx",
                    lineNumber: 233,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/pages/dashboard/index.jsx",
            lineNumber: 192,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/pages/dashboard/index.jsx",
        lineNumber: 191,
        columnNumber: 5
    }, this);
} // /**
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
_s(Dashboard, "YfFTTLMW72mNIxAmlxPK+5X6w7g=");
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

//# sourceMappingURL=%5Broot-of-the-server%5D__26a97472._.js.map