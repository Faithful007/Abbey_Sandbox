"use client";

import React, { useState } from 'react';

/**
 * ChartConfiguration Component
 * Allows users to configure chart axes, titles, and units before plotting
 * 
 * @param {Array} headers - Column headers from the dataset
 * @param {Function} onApply - Callback when configuration is applied
 * @param {Function} onCancel - Callback when cancelled
 */
export default function ChartConfiguration({ headers, onApply, onCancel }) {
  const [config, setConfig] = useState({
    xAxis: headers[0] || '',
    yAxis: headers[1] || '',
    chartType: 'scatter',
    xAxisTitle: headers[0] || 'X Axis',
    yAxisTitle: headers[1] || 'Y Axis',
    xAxisUnit: '',
    yAxisUnit: '',
    chartTitle: 'Custom Chart'
  });

  const handleApply = () => {
    if (!config.xAxis || !config.yAxis) {
      alert('Please select both X and Y axes');
      return;
    }
    onApply(config);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Configure Custom Chart</h2>
        
        <div className="space-y-4">
          {/* Chart Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Type
            </label>
            <select
              value={config.chartType}
              onChange={(e) => setConfig({ ...config, chartType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="scatter">Scatter Plot</option>
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="area">Area Chart</option>
            </select>
          </div>

          {/* Chart Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Title
            </label>
            <input
              type="text"
              value={config.chartTitle}
              onChange={(e) => setConfig({ ...config, chartTitle: e.target.value })}
              placeholder="Enter chart title"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* X Axis Configuration */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold text-blue-900 mb-3">X Axis (Horizontal)</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Column
                  </label>
                  <select
                    value={config.xAxis}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      xAxis: e.target.value,
                      xAxisTitle: e.target.value 
                    })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Axis Title
                  </label>
                  <input
                    type="text"
                    value={config.xAxisTitle}
                    onChange={(e) => setConfig({ ...config, xAxisTitle: e.target.value })}
                    placeholder="e.g., Time, Date, Category"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit (optional)
                  </label>
                  <input
                    type="text"
                    value={config.xAxisUnit}
                    onChange={(e) => setConfig({ ...config, xAxisUnit: e.target.value })}
                    placeholder="e.g., seconds, meters, kg"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Y Axis Configuration */}
            <div className="border rounded-lg p-4 bg-green-50">
              <h3 className="font-semibold text-green-900 mb-3">Y Axis (Vertical)</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Column
                  </label>
                  <select
                    value={config.yAxis}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      yAxis: e.target.value,
                      yAxisTitle: e.target.value 
                    })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Select --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Axis Title
                  </label>
                  <input
                    type="text"
                    value={config.yAxisTitle}
                    onChange={(e) => setConfig({ ...config, yAxisTitle: e.target.value })}
                    placeholder="e.g., Value, Price, Temperature"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit (optional)
                  </label>
                  <input
                    type="text"
                    value={config.yAxisUnit}
                    onChange={(e) => setConfig({ ...config, yAxisUnit: e.target.value })}
                    placeholder="e.g., °C, $, %"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-700 mb-2">Preview Configuration</h4>
            <div className="text-sm space-y-1 text-gray-600">
              <p><strong>Chart:</strong> {config.chartTitle}</p>
              <p><strong>Type:</strong> {config.chartType.charAt(0).toUpperCase() + config.chartType.slice(1)}</p>
              <p>
                <strong>X Axis:</strong> {config.xAxisTitle}
                {config.xAxisUnit && ` (${config.xAxisUnit})`}
                {config.xAxis && ` - Column: ${config.xAxis}`}
              </p>
              <p>
                <strong>Y Axis:</strong> {config.yAxisTitle}
                {config.yAxisUnit && ` (${config.yAxisUnit})`}
                {config.yAxis && ` - Column: ${config.yAxis}`}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Create Chart
          </button>
        </div>
      </div>
    </div>
  );
}