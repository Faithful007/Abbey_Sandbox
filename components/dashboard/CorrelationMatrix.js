
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

export default function CorrelationMatrix({ statistics }) {
  const correlations = statistics.correlations || {};
  const columns = Object.keys(correlations);

  if (columns.length < 2) {
    return null;
  }

  const getCorrelationColor = (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 0.8) return value > 0 ? 'bg-green-600' : 'bg-red-600';
    if (absValue >= 0.6) return value > 0 ? 'bg-green-500' : 'bg-red-500';
    if (absValue >= 0.4) return value > 0 ? 'bg-green-400' : 'bg-red-400';
    if (absValue >= 0.2) return value > 0 ? 'bg-green-300' : 'bg-red-300';
    return 'bg-slate-200';
  };

  const getCorrelationStrength = (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 0.8) return 'Very Strong';
    if (absValue >= 0.6) return 'Strong';
    if (absValue >= 0.4) return 'Moderate';
    if (absValue >= 0.2) return 'Weak';
    return 'Very Weak';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Correlation Matrix</h2>
          <p className="text-indigo-300 text-sm sm:text-base">Pearson correlation coefficients between variables</p>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-2 text-left font-semibold text-slate-700"></th>
                  {columns.map(col => (
                    <th key={col} className="p-2 text-center font-semibold text-slate-700 text-sm capitalize min-w-[100px]">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {columns.map(row => (
                  <tr key={row}>
                    <td className="p-2 font-semibold text-slate-700 text-sm capitalize">
                      {row.replace(/_/g, ' ')}
                    </td>
                    {columns.map(col => {
                      const value = correlations[row][col];
                      const isIdentity = row === col;
                      return (
                        <td key={col} className="p-1">
                          <div className="group relative">
                            <div 
                              className={`
                                h-16 flex items-center justify-center rounded-lg 
                                transition-all duration-200 cursor-pointer
                                ${isIdentity 
                                  ? 'bg-slate-800 text-white font-bold' 
                                  : `${getCorrelationColor(value)} text-white hover:scale-105 hover:shadow-lg`
                                }
                              `}
                            >
                              <span className="text-sm font-semibold">
                                {value.toFixed(2)}
                              </span>
                            </div>
                            
                            {!isIdentity && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                <div className="font-semibold">{getCorrelationStrength(value)}</div>
                                <div>{value > 0 ? 'Positive' : 'Negative'} correlation</div>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-600"></div>
                <span className="text-xs text-slate-600">Strong Positive (0.8-1.0)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-400"></div>
                <span className="text-xs text-slate-600">Moderate Positive (0.4-0.8)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-200"></div>
                <span className="text-xs text-slate-600">Weak (0-0.4)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-400"></div>
                <span className="text-xs text-slate-600">Moderate Negative (-0.8 to -0.4)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-600"></div>
                <span className="text-xs text-slate-600">Strong Negative (-1.0 to -0.8)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-900 space-y-1">
                <p><strong>Interpretation:</strong> Values range from -1 (perfect negative) to +1 (perfect positive correlation).</p>
                <p>• |r| {'≥'} 0.8: Very strong relationship</p>
                <p>• 0.6 {'≤'} |r| {'<'} 0.8: Strong relationship</p>
                <p>• 0.4 {'≤'} |r| {'<'} 0.6: Moderate relationship</p>
                <p>• |r| {'<'} 0.4: Weak relationship</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
