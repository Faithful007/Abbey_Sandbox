
import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import BoxPlot from "./Plots";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { RotateCcw, TrendingUp, Save } from "lucide-react";
import BoxPlot from "./BoxPlot";
import PresetManager from "./PresetManager";

export default function ChartDisplay({ data, statistics }) {
  const numericColumns = Object.keys(statistics);
  
  const [chartConfig, setChartConfig] = useState({
    type: 'line',
    primaryColumn: numericColumns[0] || '',
    secondaryColumn: numericColumns[1] || '',
    color: '#6366f1',
    showTrendline: false,
    showGrid: true,
    minValue: null,
    maxValue: null,
    opacity: 100
  });

  const [dataFilter, setDataFilter] = useState({
    minIndex: 1,
    maxIndex: data.length,
    enabled: false
  });

  const [showPresetManager, setShowPresetManager] = useState(false);

  React.useEffect(() => {
    if (numericColumns.length > 0 && !chartConfig.primaryColumn) {
      setChartConfig(prev => ({
        ...prev,
        primaryColumn: numericColumns[0],
        secondaryColumn: numericColumns[1] || numericColumns[0]
      }));
    }
  }, [numericColumns, chartConfig.primaryColumn]);

  // Update max index when data changes
  useEffect(() => {
    setDataFilter(prev => ({
      ...prev,
      maxIndex: data.length
    }));
  }, [data.length]);

  const chartData = useMemo(() => {
    const filtered = data.map((row, index) => ({
      index: index + 1,
      ...Object.fromEntries(
        numericColumns.map(col => [col, parseFloat(row[col]) || 0])
      )
    })).filter(item => {
      if (!dataFilter.enabled) return true;
      return item.index >= dataFilter.minIndex && item.index <= dataFilter.maxIndex;
    });

    return filtered;
  }, [data, numericColumns, dataFilter]);

  const calculateTrendline = (data, column) => {
    const n = data.length;
    const sumX = data.reduce((sum, d) => sum + d.index, 0);
    const sumY = data.reduce((sum, d) => sum + d[column], 0);
    const sumXY = data.reduce((sum, d) => sum + d.index * d[column], 0);
    const sumXX = data.reduce((sum, d) => sum + d.index * d.index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map(d => ({
      index: d.index,
      trendline: slope * d.index + intercept
    }));
  };

  const trendlineData = chartConfig.showTrendline ? 
    calculateTrendline(chartData, chartConfig.primaryColumn) : [];

  const handleReset = () => {
    setChartConfig({
      type: 'line',
      primaryColumn: numericColumns[0] || '',
      secondaryColumn: numericColumns[1] || '',
      color: '#6366f1',
      showTrendline: false,
      showGrid: true,
      minValue: null,
      maxValue: null,
      opacity: 100
    });
    setDataFilter({
      minIndex: 1,
      maxIndex: data.length,
      enabled: false
    });
  };

  const handleApplyPreset = (preset) => {
    // Apply chart configuration
    setChartConfig(prev => ({
      ...prev,
      type: preset.chartConfig.type,
      primaryColumn: numericColumns.includes(preset.chartConfig.primaryColumn) 
        ? preset.chartConfig.primaryColumn 
        : numericColumns[0],
      secondaryColumn: numericColumns.includes(preset.chartConfig.secondaryColumn)
        ? preset.chartConfig.secondaryColumn
        : numericColumns[1] || numericColumns[0],
      color: preset.chartConfig.color,
      showTrendline: preset.chartConfig.showTrendline,
      showGrid: preset.chartConfig.showGrid,
      opacity: preset.chartConfig.opacity,
      minValue: preset.chartConfig.minValue,
      maxValue: preset.chartConfig.maxValue
    }));

    // Apply data filter
    setDataFilter({
      minIndex: preset.dataFilter.enabled ? preset.dataFilter.minIndex : 1,
      maxIndex: preset.dataFilter.enabled ? Math.min(preset.dataFilter.maxIndex, data.length) : data.length,
      enabled: preset.dataFilter.enabled
    });
  };

  const colorPresets = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Green', value: '#10b981' },
  ];

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    const axisProps = {
      stroke: "#64748b",
      style: { fontSize: '12px' }
    };

    const tooltipProps = {
      contentStyle: { 
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
      }
    };

    switch (chartConfig.type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis dataKey="index" {...axisProps} />
            <YAxis 
              {...axisProps} 
              domain={[chartConfig.minValue || 'auto', chartConfig.maxValue || 'auto']}
            />
            <Tooltip {...tooltipProps} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={chartConfig.primaryColumn}
              stroke={chartConfig.color}
              strokeWidth={3}
              dot={{ fill: chartConfig.color, r: 4 }}
              activeDot={{ r: 6 }}
              opacity={chartConfig.opacity / 100}
            />
            {chartConfig.showTrendline && (
              <Line
                data={trendlineData}
                type="monotone"
                dataKey="trendline"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Trendline"
              />
            )}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis dataKey="index" {...axisProps} />
            <YAxis 
              {...axisProps}
              domain={[chartConfig.minValue || 'auto', chartConfig.maxValue || 'auto']}
            />
            <Tooltip {...tooltipProps} />
            <Legend />
            <Bar 
              dataKey={chartConfig.primaryColumn}
              fill={chartConfig.color}
              radius={[8, 8, 0, 0]}
              opacity={chartConfig.opacity / 100}
            />
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis dataKey="index" {...axisProps} />
            <YAxis 
              {...axisProps}
              domain={[chartConfig.minValue || 'auto', chartConfig.maxValue || 'auto']}
            />
            <Tooltip {...tooltipProps} />
            <Legend />
            <Area
              type="monotone"
              dataKey={chartConfig.primaryColumn}
              stroke={chartConfig.color}
              fill={chartConfig.color}
              fillOpacity={chartConfig.opacity / 100}
            />
            {chartConfig.showTrendline && (
              <Line
                data={trendlineData}
                type="monotone"
                dataKey="trendline"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Trendline"
              />
            )}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            {chartConfig.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
            <XAxis 
              dataKey={chartConfig.primaryColumn}
              name={chartConfig.primaryColumn}
              {...axisProps}
              domain={[chartConfig.minValue || 'auto', chartConfig.maxValue || 'auto']}
            />
            <YAxis 
              dataKey={chartConfig.secondaryColumn}
              name={chartConfig.secondaryColumn}
              {...axisProps}
            />
            <Tooltip {...tooltipProps} cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter 
              name={`${chartConfig.primaryColumn} vs ${chartConfig.secondaryColumn}`}
              data={chartData}
              fill={chartConfig.color}
              opacity={chartConfig.opacity / 100}
            />
            {chartConfig.showTrendline && trendlineData.length > 0 && (
              <ReferenceLine
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                segment={[
                  { x: chartData[0]?.[chartConfig.primaryColumn], y: trendlineData[0]?.trendline },
                  { x: chartData[chartData.length - 1]?.[chartConfig.primaryColumn], y: trendlineData[chartData.length - 1]?.trendline }
                ]}
              />
            )}
          </ScatterChart>
        );

      case 'boxplot':
        return (
          <BoxPlot 
            data={data}
            column={chartConfig.primaryColumn}
            statistics={statistics}
            color={chartConfig.color}
          />
        );

      default:
        return null;
    }
  };

  if (numericColumns.length === 0) {
    return (
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <p className="text-slate-500">No numeric columns found for visualization</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Interactive Visualizations</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowPresetManager(true)}
            className="flex-1 sm:flex-none gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 backdrop-blur-sm"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Presets</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReset}
            className="flex-1 sm:flex-none gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 backdrop-blur-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Chart Settings</h3>
              
              {/* Chart Type */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs text-slate-600">Chart Type</Label>
                <Select 
                  value={chartConfig.type} 
                  onValueChange={(value) => setChartConfig(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                    <SelectItem value="scatter">Scatter Plot</SelectItem>
                    <SelectItem value="boxplot">Box Plot</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Primary Column */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs text-slate-600">
                  {chartConfig.type === 'scatter' ? 'X-Axis Variable' : 'Variable'}
                </Label>
                <Select 
                  value={chartConfig.primaryColumn} 
                  onValueChange={(value) => setChartConfig(prev => ({ ...prev, primaryColumn: value }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {numericColumns.map(col => (
                      <SelectItem key={col} value={col} className="capitalize">
                        {col.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Secondary Column for Scatter */}
              {chartConfig.type === 'scatter' && (
                <div className="space-y-2 mb-4">
                  <Label className="text-xs text-slate-600">Y-Axis Variable</Label>
                  <Select 
                    value={chartConfig.secondaryColumn} 
                    onValueChange={(value) => setChartConfig(prev => ({ ...prev, secondaryColumn: value }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {numericColumns.map(col => (
                        <SelectItem key={col} value={col} className="capitalize">
                          {col.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Color Selection */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs text-slate-600">Color Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {colorPresets.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => setChartConfig(prev => ({ ...prev, color: preset.value }))}
                      className={`h-9 rounded-lg transition-all ${
                        chartConfig.color === preset.value 
                          ? 'ring-2 ring-offset-2 ring-slate-900 scale-105' 
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>

              {/* Opacity */}
              <div className="space-y-2 mb-4">
                <Label className="text-xs text-slate-600 flex justify-between">
                  <span>Opacity</span>
                  <span className="font-mono">{chartConfig.opacity}%</span>
                </Label>
                <Slider
                  value={[chartConfig.opacity]}
                  onValueChange={([value]) => setChartConfig(prev => ({ ...prev, opacity: value }))}
                  min={20}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Toggles */}
              {chartConfig.type !== 'boxplot' && (
                <>
                  <div className="flex items-center justify-between py-2">
                    <Label className="text-xs text-slate-600">Show Grid</Label>
                    <Switch
                      checked={chartConfig.showGrid}
                      onCheckedChange={(checked) => setChartConfig(prev => ({ ...prev, showGrid: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <Label className="text-xs text-slate-600 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Trendline
                    </Label>
                    <Switch
                      checked={chartConfig.showTrendline}
                      onCheckedChange={(checked) => setChartConfig(prev => ({ ...prev, showTrendline: checked }))}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Data Filtering */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-xs text-slate-600 font-semibold">Filter Data Range</Label>
                <Switch
                  checked={dataFilter.enabled}
                  onCheckedChange={(checked) => setDataFilter(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              {dataFilter.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600 flex justify-between">
                      <span>Start Index</span>
                      <span className="font-mono">{dataFilter.minIndex}</span>
                    </Label>
                    <Slider
                      value={[dataFilter.minIndex]}
                      onValueChange={([value]) => setDataFilter(prev => ({ 
                        ...prev, 
                        minIndex: Math.min(value, prev.maxIndex - 1) 
                      }))}
                      min={1}
                      max={data.length}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600 flex justify-between">
                      <span>End Index</span>
                      <span className="font-mono">{dataFilter.maxIndex}</span>
                    </Label>
                    <Slider
                      value={[dataFilter.maxIndex]}
                      onValueChange={([value]) => setDataFilter(prev => ({ 
                        ...prev, 
                        maxIndex: Math.max(value, prev.minIndex + 1) 
                      }))}
                      min={1}
                      max={data.length}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                    Showing {dataFilter.maxIndex - dataFilter.minIndex + 1} of {data.length} data points
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart Display */}
        <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm lg:col-span-3 group hover:shadow-2xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
          <CardContent className="p-6 relative">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 capitalize">
                {chartConfig.type === 'scatter' 
                  ? `${chartConfig.primaryColumn} vs ${chartConfig.secondaryColumn}`.replace(/_/g, ' ')
                  : chartConfig.primaryColumn.replace(/_/g, ' ')
                }
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {chartConfig.type === 'line' && 'Time series visualization with trend analysis'}
                {chartConfig.type === 'bar' && 'Comparative distribution across observations'}
                {chartConfig.type === 'area' && 'Cumulative view with filled area under curve'}
                {chartConfig.type === 'scatter' && 'Bivariate relationship and correlation analysis'}
                {chartConfig.type === 'boxplot' && 'Distribution summary with quartiles and outliers'}
              </p>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              {renderChart()}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Preset Manager Modal */}
      <PresetManager
        open={showPresetManager}
        onClose={() => setShowPresetManager(false)}
        currentConfig={{ chartConfig, dataFilter }}
        onApplyPreset={handleApplyPreset}
      />
    </div>
  );
}
