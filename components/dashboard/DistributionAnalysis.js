
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell 
} from "recharts";

export default function DistributionAnalysis({ data, statistics }) {
  const columnStats = statistics.columnStats || {};
  const numericColumns = Object.keys(columnStats);
  const [selectedColumn, setSelectedColumn] = useState(numericColumns[0]);

  if (numericColumns.length === 0) return null;

  const stats = columnStats[selectedColumn];

  // Assess normality based on skewness and kurtosis
  const assessNormality = (skewness, kurtosis) => {
    const skewnessOk = Math.abs(skewness) < 1;
    const kurtosisOk = Math.abs(kurtosis) < 3;
    
    if (skewnessOk && kurtosisOk) {
      return { status: 'normal', text: 'Approximately Normal', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 };
    } else if (Math.abs(skewness) < 2 && Math.abs(kurtosis) < 5) {
      return { status: 'moderate', text: 'Moderately Skewed', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle };
    } else {
      return { status: 'skewed', text: 'Highly Skewed', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle };
    }
  };

  const normality = assessNormality(stats.skewness, stats.kurtosis);
  const NormalityIcon = normality.icon;

  // Create histogram data
  const createHistogram = () => {
    const values = data.map(row => parseFloat(row[selectedColumn])).filter(v => !isNaN(v));
    const numBins = Math.min(20, Math.ceil(Math.sqrt(values.length)));
    const min = stats.min;
    const max = stats.max;
    const binWidth = (max - min) / numBins;
    
    const bins = Array(numBins).fill(0).map((_, i) => ({
      range: `${(min + i * binWidth).toFixed(1)}-${(min + (i + 1) * binWidth).toFixed(1)}`,
      midpoint: min + (i + 0.5) * binWidth,
      count: 0
    }));

    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), numBins - 1);
      bins[binIndex].count++;
    });

    return bins;
  };

  const histogramData = createHistogram();
  const maxCount = Math.max(...histogramData.map(b => b.count));

  // Distribution interpretation
  const getSkewnessInterpretation = (skewness) => {
    if (skewness > 0.5) return "Right-skewed (positive): Tail extends to the right, mean > median";
    if (skewness < -0.5) return "Left-skewed (negative): Tail extends to the left, mean < median";
    return "Symmetric: Mean ≈ median, balanced distribution";
  };

  const getKurtosisInterpretation = (kurtosis) => {
    if (kurtosis > 1) return "Leptokurtic: Heavy tails, more outliers than normal distribution";
    if (kurtosis < -1) return "Platykurtic: Light tails, fewer outliers than normal distribution";
    return "Mesokurtic: Similar to normal distribution in tail behavior";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Probability Distribution Analysis</h2>
        <Tabs value={selectedColumn} onValueChange={setSelectedColumn}>
          <TabsList className="bg-white/10 backdrop-blur-sm border border-white/20">
            {numericColumns.slice(0, 4).map(col => (
              <TabsTrigger 
                key={col} 
                value={col} 
                className="capitalize data-[state=active]:bg-white/90 data-[state=active]:text-slate-900 text-white"
              >
                {col.replace(/_/g, ' ')}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Histogram */}
        <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm lg:col-span-2 hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Frequency Distribution</h3>
              <Badge className={`${normality.bg} ${normality.color} border-0`}>
                <NormalityIcon className="w-3 h-3 mr-1" />
                {normality.text}
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="range"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  stroke="#64748b"
                  style={{ fontSize: '10px' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {histogramData.map((entry, index) => {
                    const intensity = entry.count / maxCount;
                    const color = `rgba(99, 102, 241, ${0.3 + intensity * 0.7})`;
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution Properties */}
        <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribution Shape</h3>
            
            <div className="space-y-6">
              {/* Skewness */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Skewness</span>
                  <span className="text-lg font-bold text-slate-900">{stats.skewness.toFixed(3)}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${stats.skewness > 0 ? 'bg-blue-500' : 'bg-purple-500'}`}
                    style={{ 
                      width: `${Math.min(Math.abs(stats.skewness) * 25, 100)}%`,
                      marginLeft: stats.skewness < 0 ? 'auto' : '0'
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {getSkewnessInterpretation(stats.skewness)}
                </p>
              </div>

              {/* Kurtosis */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Kurtosis</span>
                  <span className="text-lg font-bold text-slate-900">{stats.kurtosis.toFixed(3)}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-500"
                    style={{ width: `${Math.min(Math.abs(stats.kurtosis) * 20, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {getKurtosisInterpretation(stats.kurtosis)}
                </p>
              </div>

              {/* Percentiles Visualization */}
              <div>
                <div className="text-sm font-medium text-slate-700 mb-3">Percentile Distribution</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">10th</span>
                    <span className="font-mono font-medium">{stats.p10.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">25th (Q1)</span>
                    <span className="font-mono font-medium">{stats.q1.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs bg-indigo-50 px-2 py-1 rounded">
                    <span className="text-slate-700 font-semibold">50th (Median)</span>
                    <span className="font-mono font-bold">{stats.median.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">75th (Q3)</span>
                    <span className="font-mono font-medium">{stats.q3.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">90th</span>
                    <span className="font-mono font-medium">{stats.p90.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Normality Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-900">
                    Normality is assessed using skewness (|value| {'<'} 1) and kurtosis (|value| {'<'} 3). 
                    For formal testing, consider Shapiro-Wilk or Kolmogorov-Smirnov tests.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
