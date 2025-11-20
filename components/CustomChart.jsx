"use client";

import React from 'react';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label
} from 'recharts';

/**
 * CustomChart Component
 * Renders a customizable chart with user-defined axes and labels
 * 
 * @param {Object} config - Chart configuration
 * @param {Array} data - Dataset
 * @param {Function} onClose - Callback to close chart
 */
export default function CustomChart({ config, data, onClose }) {
  // Prepare chart data
  const chartData = data
    .map((row, index) => ({
      [config.xAxis]: row[config.xAxis],
      [config.yAxis]: row[config.yAxis],
      index
    }))
    .filter(item => 
      item[config.xAxis] !== null && 
      item[config.xAxis] !== undefined && 
      item[config.yAxis] !== null && 
      item[config.yAxis] !== undefined
    );

  // Format axis label with unit
  const formatAxisLabel = (title, unit) => {
    return unit ? `${title} (${unit})` : title;
  };

  // Render appropriate chart type
  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };

    const xAxisProps = {
      dataKey: config.xAxis,
      angle: -45,
      textAnchor: 'end',
      height: 100,
      tick: { fontSize: 11 }
    };

    const yAxisProps = {
      tick: { fontSize: 11 }
    };

    switch (config.chartType) {
      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} type="number" name={config.xAxisTitle}>
              <Label 
                value={formatAxisLabel(config.xAxisTitle, config.xAxisUnit)} 
                position="bottom" 
                offset={-20}
                style={{ fontSize: 14, fontWeight: 'bold' }}
              />
            </XAxis>
            <YAxis {...yAxisProps} type="number" name={config.yAxisTitle}>
              <Label 
                value={formatAxisLabel(config.yAxisTitle, config.yAxisUnit)} 
                angle={-90} 
                position="left"
                style={{ fontSize: 14, fontWeight: 'bold' }}
              />
            </YAxis>
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter 
              name={config.yAxis} 
              dataKey={config.yAxis} 
              fill="#6366f1" 
            />
          </ScatterChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps}>
              <Label 
                value={formatAxisLabel(config.xAxisTitle, config.xAxisUnit)} 
                position="bottom" 
                offset={-20}
                style={{ fontSize: 14, fontWeight: 'bold' }}
              />
            </XAxis>
            <YAxis {...yAxisProps}>
              <Label 
                value={formatAxisLabel(config.yAxisTitle, config.yAxisUnit)} 
                angle={-90} 
                position="left"
                style={{ fontSize: 14, fontWeight: 'bold' }}
              />
            </YAxis>
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={config.yAxis} 
              stroke="#6366f1" 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps}>
              <Label 
                value={formatAxisLabel(config.xAxisTitle, config.xAxisUnit)} 
                position="bottom" 
                offset={-20}
                style={{ fontSize: 14, fontWeight: 'bold' }}
              />
            </XAxis>
            <YAxis {...yAxisProps}>
              <Label 
                value={formatAxisLabel(config.yAxisTitle, config.yAxisUnit)} 
                angle={-90} 
                position="left"
                style={{ fontSize: 14, fontWeight: 'bold' }}
              />
            </YAxis>
            <Tooltip />
            <Legend />
            <Bar dataKey={config.yAxis} fill="#6366f1" />
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps}>
              <Label 
                value={formatAxisLabel(config.xAxisTitle, config.xAxisUnit)} 
                position="bottom" 
                offset={-20}
                style={{ fontSize: 14, fontWeight: 'bold' }}
              />
            </XAxis>
            <YAxis {...yAxisProps}>
              <Label 
                value={formatAxisLabel(config.yAxisTitle, config.yAxisUnit)} 
                angle={-90} 
                position="left"
                style={{ fontSize: 14, fontWeight: 'bold' }}
              />
            </YAxis>
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey={config.yAxis} 
              stroke="#6366f1" 
              fill="#6366f1" 
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-lg">
      {/* Chart Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-gray-800">{config.chartTitle}</h3>
        <button
          onClick={onClose}
          className="text-red-600 hover:text-red-800 font-bold text-xl"
          title="Remove chart"
        >
          ×
        </button>
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Chart Info */}
      <div className="mt-4 text-xs text-gray-500 border-t pt-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>Data Points:</strong> {chartData.length}
          </div>
          <div>
            <strong>Type:</strong> {config.chartType.charAt(0).toUpperCase() + config.chartType.slice(1)}
          </div>
        </div>
      </div>
    </div>
  );
}