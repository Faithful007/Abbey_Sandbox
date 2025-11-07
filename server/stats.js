function percentile(sorted, p) {
    const n = sorted.length;
    const i = (p / 100) * (n - 1);
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    const w = i - lo;
    return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function calculateMode(values) {
    const freq = new Map();
    for (const v of values) freq.set(v, (freq.get(v) || 0) + 1);
    let best = null, max = 0;
    for (const [v, c] of freq.entries()) if (c > max) { max = c; best = v; }
    return max > 1 ? best : null;
}

function correlation(x, y) {
    const n = Math.min(x.length, y.length);
    const mx = x.slice(0, n).reduce((a,b)=>a+b,0)/n;
    const my = y.slice(0, n).reduce((a,b)=>a+b,0)/n;
    let num=0, dx2=0, dy2=0;
    for (let i=0;i<n;i++){
        const dx = x[i]-mx, dy = y[i]-my;
        num += dx*dy; dx2 += dx*dx; dy2 += dy*dy;
    }
    return num / Math.sqrt(dx2*dy2);
}

function calculateAdvancedStatistics(rows) {
    if (!rows || !rows.length) return { columnStats: {}, correlations: {} };

    const numericCols = {};
    const keys = Object.keys(rows[0] || {});
    for (const k of keys) {
        const vals = rows.map(r => parseFloat(r[k])).filter(v => !Number.isNaN(v));
        if (vals.length) numericCols[k] = vals;
    }

    const columnStats = {};
    for (const [k, values] of Object.entries(numericCols)) {
        const sorted = [...values].sort((a,b)=>a-b);
        const n = values.length;
        const mean = values.reduce((a,b)=>a+b,0)/n;
        const variance = values.reduce((acc,v)=> acc + Math.pow(v-mean,2),0)/n;
        const stdDev = Math.sqrt(variance);
        const skewness = values.reduce((acc,v)=> acc + Math.pow((v-mean)/stdDev,3),0)/n;
        const kurtosis = values.reduce((acc,v)=> acc + Math.pow((v-mean)/stdDev,4),0)/n - 3;
        const q1 = percentile(sorted,25), q3 = percentile(sorted,75);

        columnStats[k] = {
            count: n,
            mean,
            median: sorted[Math.floor(n/2)],
            mode: calculateMode(values),
            min: sorted[0],
            max: sorted[n-1],
            range: sorted[n-1]-sorted[0],
            stdDev, variance,
            cv: (stdDev/mean)*100,
            q1, q3, iqr: q3 - q1,
            p10: percentile(sorted,10),
            p90: percentile(sorted,90),
            skewness, kurtosis,
            avgAbsZScore: values.map(v => Math.abs((v-mean)/stdDev)).reduce((a,b)=>a+b,0)/n,
            se: stdDev / Math.sqrt(n),
            ci95Lower: mean - 1.96 * (stdDev / Math.sqrt(n)),
            ci95Upper: mean + 1.96 * (stdDev / Math.sqrt(n)),
        };
    }

    // correlations
    const cols = Object.keys(numericCols);
    const correlations = {};
    for (const c1 of cols) {
        correlations[c1] = {};
        for (const c2 of cols) {
            correlations[c1][c2] = correlation(numericCols[c1], numericCols[c2]);
        }
    }

    return { columnStats, correlations };
}

module.exports = {
    calculateAdvancedStatistics,
    percentile,
    correlation,
    calculateMode
};