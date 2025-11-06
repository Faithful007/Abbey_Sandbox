import React from "react";

export default function BoxPlot({ data, column, statistics, color }) {
  const stats = statistics[column];
  
  if (!stats) return null;

  // SVG dimensions
  const width = 600;
  const height = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 60 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Calculate scale
  const dataMin = stats.min;
  const dataMax = stats.max;
  const dataRange = dataMax - dataMin;
  const padding = dataRange * 0.1;
  
  const yMin = dataMin - padding;
  const yMax = dataMax + padding;
  const yRange = yMax - yMin;

  const scale = (value) => {
    return plotHeight - ((value - yMin) / yRange) * plotHeight;
  };

  // Box plot dimensions
  const boxWidth = plotWidth * 0.3;
  const centerX = plotWidth / 2;

  // Calculate outliers
  const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v));
  const lowerFence = stats.q1 - 1.5 * stats.iqr;
  const upperFence = stats.q3 + 1.5 * stats.iqr;
  const outliers = values.filter(v => v < lowerFence || v > upperFence);

  return (
    <svg 
      width="100%" 
      height={height} 
      viewBox={`0 0 ${width} ${height}`}
      className="mx-auto"
    >
      {/* Title */}
      <text
        x={width / 2}
        y={20}
        textAnchor="middle"
        className="text-sm font-semibold fill-slate-700"
      >
        Box Plot Distribution
      </text>

      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {/* Y-axis */}
        <line
          x1={0}
          y1={0}
          x2={0}
          y2={plotHeight}
          stroke="#cbd5e1"
          strokeWidth={2}
        />

        {/* Y-axis labels and grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const value = yMin + ratio * yRange;
          const y = scale(value);
          return (
            <g key={ratio}>
              <line
                x1={0}
                y1={y}
                x2={plotWidth}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={-10}
                y={y}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-xs fill-slate-600"
              >
                {value.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Whiskers */}
        <line
          x1={centerX}
          y1={scale(stats.min)}
          x2={centerX}
          y2={scale(stats.q1)}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="4 4"
        />
        <line
          x1={centerX}
          y1={scale(stats.q3)}
          x2={centerX}
          y2={scale(stats.max)}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="4 4"
        />

        {/* Whisker caps */}
        <line
          x1={centerX - boxWidth / 4}
          y1={scale(stats.min)}
          x2={centerX + boxWidth / 4}
          y2={scale(stats.min)}
          stroke={color}
          strokeWidth={2}
        />
        <line
          x1={centerX - boxWidth / 4}
          y1={scale(stats.max)}
          x2={centerX + boxWidth / 4}
          y2={scale(stats.max)}
        />

        {/* Box (IQR) */}
        <rect
          x={centerX - boxWidth / 2}
          y={scale(stats.q3)}
          width={boxWidth}
          height={scale(stats.q1) - scale(stats.q3)}
          fill={color}
          fillOpacity={0.3}
          stroke={color}
          strokeWidth={2}
          rx={4}
        />

        {/* Median line */}
        <line
          x1={centerX - boxWidth / 2}
          y1={scale(stats.median)}
          x2={centerX + boxWidth / 2}
          y2={scale(stats.median)}
          stroke={color}
          strokeWidth={3}
        />

        {/* Mean marker */}
        <circle
          cx={centerX}
          cy={scale(stats.mean)}
          r={6}
          fill="white"
          stroke={color}
          strokeWidth={2}
        />
        <circle
          cx={centerX}
          cy={scale(stats.mean)}
          r={3}
          fill={color}
        />

        {/* Outliers */}
        {outliers.map((outlier, idx) => (
          <circle
            key={idx}
            cx={centerX + (Math.random() - 0.5) * boxWidth * 0.6}
            cy={scale(outlier)}
            r={4}
            fill="#ef4444"
            opacity={0.7}
          />
        ))}

        {/* Labels */}
        <g transform={`translate(${plotWidth + 20}, 0)`}>
          <text y={scale(stats.max)} className="text-xs fill-slate-600" alignmentBaseline="middle">
            Max: {stats.max.toFixed(2)}
          </text>
          <text y={scale(stats.q3)} className="text-xs fill-slate-600" alignmentBaseline="middle">
            Q3: {stats.q3.toFixed(2)}
          </text>
          <text y={scale(stats.median)} className="text-xs fill-slate-700 font-semibold" alignmentBaseline="middle">
            Median: {stats.median.toFixed(2)}
          </text>
          <text y={scale(stats.mean)} className="text-xs fill-slate-600" alignmentBaseline="middle">
            Mean: {stats.mean.toFixed(2)}
          </text>
          <text y={scale(stats.q1)} className="text-xs fill-slate-600" alignmentBaseline="middle">
            Q1: {stats.q1.toFixed(2)}
          </text>
          <text y={scale(stats.min)} className="text-xs fill-slate-600" alignmentBaseline="middle">
            Min: {stats.min.toFixed(2)}
          </text>
        </g>

        {/* X-axis label */}
        <text
          x={centerX}
          y={plotHeight + 40}
          textAnchor="middle"
          className="text-sm font-medium fill-slate-700 capitalize"
        >
          {column.replace(/_/g, ' ')}
        </text>

        {/* Legend */}
        <g transform={`translate(10, ${plotHeight - 80})`}>
          <rect x={0} y={0} width={120} height={75} fill="white" stroke="#e2e8f0" strokeWidth={1} rx={4} />
          
          <line x1={10} y1={15} x2={30} y2={15} stroke={color} strokeWidth={3} />
          <text x={35} y={15} alignmentBaseline="middle" className="text-xs fill-slate-700">
            Median
          </text>

          <circle cx={20} cy={32} r={4} fill="white" stroke={color} strokeWidth={2} />
          <circle cx={20} cy={32} r={2} fill={color} />
          <text x={35} y={32} alignmentBaseline="middle" className="text-xs fill-slate-700">
            Mean
          </text>

          <rect x={10} y={42} width={20} height={12} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={1} />
          <text x={35} y={48} alignmentBaseline="middle" className="text-xs fill-slate-700">
            IQR (Q1-Q3)
          </text>

          <circle cx={20} cy={65} r={3} fill="#ef4444" opacity={0.7} />
          <text x={35} y={65} alignmentBaseline="middle" className="text-xs fill-slate-700">
            Outliers
          </text>
        </g>
      </g>
    </svg>
  );
}