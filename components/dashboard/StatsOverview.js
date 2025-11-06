import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Database, BarChart2, Activity, Sparkles } from "lucide-react";

export default function StatsOverview({ data, fileName, statistics }) {
  const columnStats = statistics.columnStats || {};
  const numericColumns = Object.keys(columnStats);
  const totalRows = data.length;
  const totalColumns = Object.keys(data[0] || {}).length;

  const overallStats = numericColumns.length > 0 ? {
    avgMean: numericColumns.reduce((sum, col) => sum + columnStats[col].mean, 0) / numericColumns.length,
    totalDataPoints: numericColumns.reduce((sum, col) => sum + columnStats[col].count, 0)
  } : null;

  const StatCard = ({ title, value, icon: Icon, gradient, iconBg, delay }) => (
    <Card 
      className="border-none shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <Sparkles className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="text-4xl font-bold mb-2 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          {value}
        </div>
        <div className="text-sm font-medium text-slate-600">{title}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Descriptive Statistics</h2>
          <p className="text-indigo-300 text-sm sm:text-base flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            {fileName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Observations"
          value={totalRows.toLocaleString()}
          icon={Database}
          gradient="from-indigo-500 to-indigo-600"
          iconBg="from-indigo-500 to-indigo-600"
          delay={0}
        />
        <StatCard
          title="Variables Analyzed"
          value={numericColumns.length}
          icon={BarChart2}
          gradient="from-teal-500 to-teal-600"
          iconBg="from-teal-500 to-teal-600"
          delay={100}
        />
        <StatCard
          title="Total Features"
          value={totalColumns}
          icon={Activity}
          gradient="from-purple-500 to-purple-600"
          iconBg="from-purple-500 to-purple-600"
          delay={200}
        />
        <StatCard
          title="Average Mean Value"
          value={overallStats ? overallStats.avgMean.toFixed(2) : 'N/A'}
          icon={TrendingUp}
          gradient="from-pink-500 to-pink-600"
          iconBg="from-pink-500 to-pink-600"
          delay={300}
        />
      </div>

      {/* Detailed Statistics Table */}
      <div className="grid grid-cols-1 gap-6">
        {numericColumns.map((column, idx) => {
          const stats = columnStats[column];
          return (
            <Card 
              key={column} 
              className="border-none shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden group hover:shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${400 + idx * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-6 sm:p-8 relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg"></div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 capitalize">
                    {column.replace(/_/g, ' ')}
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                  {/* Central Tendency */}
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Mean</div>
                    <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {stats.mean.toFixed(3)}
                    </div>
                  </div>
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Median</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.median.toFixed(3)}</div>
                  </div>
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Mode</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">
                      {stats.mode !== null ? stats.mode.toFixed(3) : 'N/A'}
                    </div>
                  </div>

                  {/* Dispersion */}
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Std Dev (σ)</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.stdDev.toFixed(3)}</div>
                  </div>
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Variance (σ²)</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.variance.toFixed(3)}</div>
                  </div>
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">CV (%)</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.cv.toFixed(2)}%</div>
                  </div>

                  {/* Range */}
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Min</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.min.toFixed(3)}</div>
                  </div>
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Max</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.max.toFixed(3)}</div>
                  </div>
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Range</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.range.toFixed(3)}</div>
                  </div>

                  {/* Quartiles */}
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Q1 (25%)</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.q1.toFixed(3)}</div>
                  </div>
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Q3 (75%)</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.q3.toFixed(3)}</div>
                  </div>
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">IQR</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.iqr.toFixed(3)}</div>
                  </div>

                  {/* Shape */}
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Skewness</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.skewness.toFixed(3)}</div>
                  </div>
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Kurtosis</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.kurtosis.toFixed(3)}</div>
                  </div>

                  {/* CI */}
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">95% CI Lower</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.ci95Lower.toFixed(3)}</div>
                  </div>
                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">95% CI Upper</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.ci95Upper.toFixed(3)}</div>
                  </div>

                  <div className="group/stat hover:scale-105 transition-transform duration-200">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Count (n)</div>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900">{stats.count}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}