// Main dashboard for data analysis and visualization

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import ColumnDistributionChart from "../../components/ColumnDistributionChart";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

/**
 * Split CSV line respecting quoted values
 * Handles commas inside quoted strings
 */
const csvSplit = (line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

/**
 * Parse CSV text into headers and rows
 * @param {string} text - Raw CSV text
 * @returns {Object} - { headers: Array, rows: Array }
 */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  // Extract headers from first line
  const headers = csvSplit(lines[0]).map((h) => h.replace(/^"(.*)"$/, "$1").trim());
  
  // Parse data rows
  const rows = lines.slice(1).map((line) => {
    const parts = csvSplit(line).map((v) => v.replace(/^"(.*)"$/, "$1").trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = parts[i] ?? "";
    });
    return obj;
  });

  return { headers, rows };
}

/**
 * Detect file type from filename extension
 * @param {string} filename - Name of file
 * @returns {string} - File extension
 */
function detectFileType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  return ext;
}

export default function Dashboard() {
  // Client-side rendering flag
  const [isClient, setIsClient] = useState(false);
  
  // File and data state
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [fileType, setFileType] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Editing state
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [dataVersion, setDataVersion] = useState(0); // Track data modifications

  // Refs for export
  const dashboardRef = useRef(null);
  const chartsRef = useRef(null);

  // Set client flag after mount
  useEffect(() => setIsClient(true), []);

  /**
   * Handle file selection
   * Validates file type and updates state
   */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = detectFileType(selectedFile.name);
      const allowedTypes = ['csv', 'json', 'xlsx', 'xls', 'txt'];
      
      if (allowedTypes.includes(ext)) {
        setFile(selectedFile);
        setFileType(ext);
        setError(null);
      } else {
        setError("Please select a valid file (CSV, JSON, Excel, or TXT)");
        setFile(null);
        setFileType(null);
      }
    }
  };

  /**
   * Upload file and fetch data/statistics
   * Handles multi-step process:
   * 1. Upload file
   * 2. Fetch statistics
   * 3. Fetch and parse data
   */
  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || "Upload failed");
      }
      
      const { filename, fileType: uploadedFileType } = await uploadRes.json();
      setFileType(uploadedFileType.replace('.', ''));

      // Step 2: Fetch statistics
      const statsRes = await fetch(`http://localhost:3000/stats/${filename}`);
      if (!statsRes.ok) throw new Error("Failed to calculate statistics");
      const statsData = await statsRes.json();
      setStatistics(statsData);

      // Step 3: Fetch parsed data
      const dataRes = await fetch(`http://localhost:3000/data/${filename}`);
      if (!dataRes.ok) throw new Error("Failed to load uploaded file");
      const jsonData = await dataRes.json();

      // Extract headers and rows
      if (jsonData.data && Array.isArray(jsonData.data)) {
        const rows = jsonData.data;
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        setHeaders(headers);
        setData(rows);
      } else {
        throw new Error("Invalid data format");
      }
      
      setDataVersion(0);
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset dashboard to initial state
   */
  const handleReset = () => {
    setFile(null);
    setData(null);
    setHeaders([]);
    setStatistics(null);
    setError(null);
    setEditingCell(null);
    setDataVersion(0);
    setFileType(null);
  };

  /**
   * Export dashboard analysis to PDF
   * Captures statistics, data preview, and charts
   */
  const exportPDF = async () => {
  if (!data || !statistics) return;
  
  setExporting(true);
  
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(99, 102, 241); // Indigo color
    pdf.text('Statistical Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // File information
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`File: ${file?.name}`, 20, yPosition);
    yPosition += 5;
    pdf.text(`Type: ${fileType?.toUpperCase()}`, 20, yPosition);
    yPosition += 5;
    pdf.text(`Modified: ${dataVersion > 0 ? 'Yes' : 'No'}`, 20, yPosition);
    yPosition += 5;
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition);
    yPosition += 10;

    // Statistics Overview
    pdf.setFontSize(14);
    pdf.setTextColor(0);
    pdf.text('Statistics Overview', 20, yPosition);
    yPosition += 8;

    if (statistics?.columnStats) {
      const statsData = [];
      Object.entries(statistics.columnStats).forEach(([column, stats]) => {
        if ('mean' in stats) {
          statsData.push([
            column,
            stats.count,
            stats.mean?.toFixed(2) || 'N/A',
            stats.median?.toFixed(2) || 'N/A',
            stats.stdDev?.toFixed(2) || 'N/A',
            stats.min?.toFixed(2) || 'N/A',
            stats.max?.toFixed(2) || 'N/A'
          ]);
        } else {
          statsData.push([
            column,
            stats.count,
            'N/A',
            'N/A',
            'N/A',
            'N/A',
            `${stats.unique} unique`
          ]);
        }
      });

      // Use autoTable function directly
      autoTable(pdf, {
        startY: yPosition,
        head: [['Column', 'Count', 'Mean', 'Median', 'Std Dev', 'Min', 'Max']],
        body: statsData,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 8 },
        margin: { left: 20, right: 20 }
      });

      yPosition = pdf.lastAutoTable.finalY + 10;
    }

    // Data Preview
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.text('Data Preview (First 20 rows)', 20, yPosition);
    yPosition += 8;

    const previewData = data.slice(0, 20).map(row => 
      headers.map(h => String(row[h] || ''))
    );

    // Use autoTable function directly
    autoTable(pdf, {
      startY: yPosition,
      head: [headers],
      body: previewData,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 7 },
      margin: { left: 20, right: 20 }
    });

    // Capture charts
    if (chartsRef.current) {
      pdf.addPage();
      yPosition = 20;
      pdf.setFontSize(14);
      pdf.text('Column Distribution Charts', 20, yPosition);
      yPosition += 10;

      const chartElements = chartsRef.current.querySelectorAll('.chart-container');
      
      for (let i = 0; i < chartElements.length; i++) {
        const chartElement = chartElements[i];
        
        try {
          const canvas = await html2canvas(chartElement, {
            scale: 2,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = 80;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (yPosition + imgHeight > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }

          pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        } catch (err) {
          console.error('Error capturing chart:', err);
        }
      }
    }

    // Save PDF
    pdf.save(`analysis-report-${Date.now()}.pdf`);
  } catch (err) {
    console.error('Error generating PDF:', err);
    alert('Error generating PDF: ' + err.message);
  } finally {
    setExporting(false);
  }
};
  /**
   * Export dashboard analysis to Excel
   * Creates multiple sheets for statistics, data, and summary
   */
  const exportExcel = () => {
    if (!data || !statistics) return;

    setExporting(true);

    try {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryData = [
        ['Statistical Analysis Report'],
        [],
        ['File Name', file?.name],
        ['File Type', fileType?.toUpperCase()],
        ['Total Rows', data.length],
        ['Total Columns', headers.length],
        ['Modified', dataVersion > 0 ? 'Yes' : 'No'],
        ['Generated', new Date().toLocaleString()],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Sheet 2: Statistics
      if (statistics?.columnStats) {
        const statsData = [
          ['Column', 'Count', 'Mean', 'Median', 'Std Dev', 'Min', 'Max', 'Unique Values']
        ];

        Object.entries(statistics.columnStats).forEach(([column, stats]) => {
          if ('mean' in stats) {
            statsData.push([
              column,
              stats.count,
              stats.mean?.toFixed(2) || 'N/A',
              stats.median?.toFixed(2) || 'N/A',
              stats.stdDev?.toFixed(2) || 'N/A',
              stats.min?.toFixed(2) || 'N/A',
              stats.max?.toFixed(2) || 'N/A',
              'N/A'
            ]);
          } else {
            statsData.push([
              column,
              stats.count,
              'N/A',
              'N/A',
              'N/A',
              'N/A',
              'N/A',
              stats.unique
            ]);
          }
        });

        const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
        XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');
      }

      // Sheet 3: Full Data
      const dataSheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

      // Sheet 4: Data Types
      const typesData = [['Column', 'Type', 'Sample Values']];
      headers.forEach(header => {
        const sampleValues = data.slice(0, 3).map(row => row[header]).join(', ');
        const isNumeric = statistics?.columnStats[header]?.mean !== undefined;
        typesData.push([header, isNumeric ? 'Numeric' : 'Categorical', sampleValues]);
      });
      const typesSheet = XLSX.utils.aoa_to_sheet(typesData);
      XLSX.utils.book_append_sheet(workbook, typesSheet, 'Column Types');

      // Write file
      XLSX.writeFile(workbook, `analysis-report-${Date.now()}.xlsx`);
    } catch (err) {
      console.error('Error generating Excel:', err);
      alert('Error generating Excel: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Get rows for preview (limited or all)
  const previewRows = useMemo(() => {
    if (!data) return [];
    return showAllRows ? data : data.slice(0, 20);
  }, [data, showAllRows]);

  /**
   * Start editing a cell
   * @param {number} rowIndex - Row index in data
   * @param {string} colName - Column name
   * @param {any} currentValue - Current cell value
   */
  const startEdit = (rowIndex, colName, currentValue) => {
    setEditingCell({ rowIndex, colName });
    setEditValue(currentValue);
  };

  /**
   * Save edited cell value
   * Updates data and triggers re-render
   */
  const saveEdit = (rowIndex, colName) => {
    if (editingCell) {
      const newData = [...data];
      newData[rowIndex][colName] = editValue;
      setData(newData);
      setEditingCell(null);
      setEditValue("");
      setDataVersion(v => v + 1); // Increment version to trigger updates
    }
  };

  /**
   * Cancel editing without saving
   */
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  /**
   * Create handler for chart value changes
   * Returns a function that updates specific column/row
   */
  const handleChartValueChange = useCallback((columnName) => {
    return (rowIndex, newValue) => {
      const newData = [...data];
      if (newData[rowIndex]) {
        newData[rowIndex][columnName] = newValue;
        setData(newData);
        setDataVersion(v => v + 1);
      }
    };
  }, [data]);

  /**
   * Recalculate statistics when data changes
   * Runs automatically on data updates
   */
  useEffect(() => {
    if (!data || data.length === 0) return;

    const calculateStats = () => {
      const columnStats = {};
      
      headers.forEach(header => {
        // Get non-empty values
        const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== "");
        const numericValues = values.filter(v => !isNaN(parseFloat(v))).map(v => parseFloat(v));
        
        // Determine if column is numeric (>50% numeric values)
        if (numericValues.length > values.length * 0.5) {
          // Calculate numeric statistics
          const sorted = [...numericValues].sort((a, b) => a - b);
          const sum = numericValues.reduce((acc, val) => acc + val, 0);
          const mean = sum / numericValues.length;
          const median = sorted[Math.floor(sorted.length / 2)];
          const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
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
          // Calculate categorical statistics
          columnStats[header] = {
            count: values.length,
            unique: new Set(values).size
          };
        }
      });

      setStatistics({ columnStats });
    };

    calculateStats();
  }, [data, headers, dataVersion]);

  /**
   * Get icon emoji for file type
   * @param {string} type - File extension
   * @returns {string} - Emoji icon
   */
  const getFileIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'csv': return '📊';
      case 'json': return '📋';
      case 'xlsx':
      case 'xls': return '📈';
      case 'txt': return '📄';
      default: return '📁';
    }
  };

  // Render component
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6" ref={dashboardRef}>
        {/* Page Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6">
          Statistical Analysis Dashboard
        </h1>

        {/* File Upload Section (shown when no data loaded) */}
        {!data ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Data File</h2>

            {/* File Drop Zone */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                id="file-upload"
                type="file"
                accept=".csv,.json,.xlsx,.xls,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer inline-block">
                <div className="text-6xl mb-4">{file ? getFileIcon(fileType) : '📁'}</div>
                <p className="text-lg text-gray-600 mb-1">
                  {file ? file.name : "Click to select a data file"}
                </p>
                <p className="text-sm text-gray-400">
                  Supported: CSV, JSON, Excel (.xlsx, .xls), TXT
                </p>
                {file && (
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    File Type: {fileType?.toUpperCase()}
                  </p>
                )}
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="mt-6 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? "Processing..." : "Analyze Data"}
            </button>

            {/* Supported File Types Grid */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-2xl mb-1">📊</div>
                <div className="font-medium">CSV</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-2xl mb-1">📋</div>
                <div className="font-medium">JSON</div>
              </div>
              <div className="p-3 bg-purple-50 rounded">
                <div className="text-2xl mb-1">📈</div>
                <div className="font-medium">Excel</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded">
                <div className="text-2xl mb-1">📄</div>
                <div className="font-medium">TXT</div>
              </div>
            </div>
          </div>
        ) : (
          // Data Analysis Section (shown after file loaded)
          <div className="space-y-8">
            {/* File Info and Action Buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{getFileIcon(fileType)}</span>
                <div>
                  <p className="text-gray-600">
                    File: <strong>{file?.name}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Type: <strong className="text-indigo-600">{fileType?.toUpperCase()}</strong> • 
                    Modified: <strong className={dataVersion > 0 ? 'text-green-600' : 'text-gray-600'}>
                      {dataVersion > 0 ? 'Yes' : 'No'}
                    </strong>
                  </p>
                </div>
              </div>
              <div className="space-x-2">
                <button
                  onClick={exportPDF}
                  disabled={exporting}
                  className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition text-sm disabled:opacity-50"
                >
                  {exporting ? '⏳ Generating...' : '📄 Export PDF'}
                </button>
                <button
                  onClick={exportExcel}
                  disabled={exporting}
                  className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                >
                  {exporting ? '⏳ Generating...' : '📊 Export Excel'}
                </button>
                <button
                  onClick={handleReset}
                  className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition text-sm"
                >
                  🔄 New Analysis
                </button>
              </div>
            </div>

            {/* Statistics Overview Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-3">
                Statistics Overview 
                {dataVersion > 0 && <span className="text-sm text-green-600 ml-2">(Live Updated)</span>}
              </h2>
              {statistics?.columnStats && Object.keys(statistics.columnStats).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(statistics.columnStats).map(([column, stats]) => (
                    <div key={column} className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-semibold text-indigo-600 mb-2">{column}</h3>
                      <div className="text-sm space-y-1">
                        {/* Basic count */}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Count:</span>
                          <span className="font-medium">{stats.count}</span>
                        </div>
                        {/* Numeric statistics */}
                        {"mean" in stats && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Mean:</span>
                              <span className="font-medium">{Number(stats.mean)?.toFixed?.(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Median:</span>
                              <span className="font-medium">{Number(stats.median)?.toFixed?.(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Std Dev:</span>
                              <span className="font-medium">{Number(stats.stdDev)?.toFixed?.(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Min:</span>
                              <span className="font-medium">{Number(stats.min)?.toFixed?.(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Max:</span>
                              <span className="font-medium">{Number(stats.max)?.toFixed?.(2)}</span>
                            </div>
                          </>
                        )}
                        {/* Categorical statistics */}
                        {"unique" in stats && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Unique:</span>
                            <span className="font-medium">{stats.unique}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No statistics available.</p>
              )}
            </div>

            {/* Editable Data Preview Table */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold">Data Preview (Editable)</h2>
                {data.length > 20 && (
                  <button
                    onClick={() => setShowAllRows(!showAllRows)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 underline"
                  >
                    {showAllRows ? 'Show Less' : `Show All ${data.length} Rows`}
                  </button>
                )}
              </div>
              {/* Usage Instructions */}
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Double-click any cell to edit. Press Enter to save or Escape to cancel. 
                  Changes will automatically update the charts below.
                </p>
              </div>
              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
                        {headers.map((h) => (
                          <td
                            key={h}
                            className="px-4 py-2 text-sm text-gray-800 cursor-pointer hover:bg-blue-50"
                            onDoubleClick={() => startEdit(idx, h, row[h])}
                            title="Double-click to edit"
                          >
                            {/* Show input when editing, otherwise show value */}
                            {editingCell?.rowIndex === idx && editingCell?.colName === h ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveEdit(idx, h)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit(idx, h);
                                  if (e.key === "Escape") cancelEdit();
                                }}
                                autoFocus
                                className="w-full px-2 py-1 border-2 border-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <span className={editingCell?.rowIndex === idx && editingCell?.colName === h ? 'font-bold' : ''}>
                                {row[h]}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Showing {previewRows.length} of {data.length} rows • Double-click any cell to edit
              </p>
            </div>

            {/* Interactive Charts Section */}
            <div className="bg-white rounded-lg shadow p-6" ref={chartsRef}>
              <h2 className="text-xl font-semibold mb-4">
                Column Distributions (Interactive)
                {dataVersion > 0 && <span className="text-sm text-green-600 ml-2">(Live Updated)</span>}
              </h2>
              {/* Chart Instructions */}
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>🎯 Interactive Charts:</strong> Click on bars, points, or pie slices to edit values. 
                  All changes sync with the data table above in real-time.
                </p>
              </div>
              {/* Charts Grid */}
              {!isClient ? (
                <p className="text-sm text-gray-500">Loading charts…</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {headers.map((h) => (
                    <div key={`${h}-${dataVersion}`} className="chart-container">
                      <ColumnDistributionChart
                        header={h}
                        values={data.map((row) => row[h])}
                        onValueChange={handleChartValueChange(h)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// // Main dashboard for data analysis and visualization

// import React, { useEffect, useMemo, useState, useCallback } from "react";
// import ColumnDistributionChart from "../../components/ColumnDistributionChart";

// /**
//  * Split CSV line respecting quoted values
//  * Handles commas inside quoted strings
//  */
// const csvSplit = (line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

// /**
//  * Parse CSV text into headers and rows
//  * @param {string} text - Raw CSV text
//  * @returns {Object} - { headers: Array, rows: Array }
//  */
// function parseCSV(text) {
//   const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0);
//   if (lines.length === 0) return { headers: [], rows: [] };

//   // Extract headers from first line
//   const headers = csvSplit(lines[0]).map((h) => h.replace(/^"(.*)"$/, "$1").trim());
  
//   // Parse data rows
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

// /**
//  * Detect file type from filename extension
//  * @param {string} filename - Name of file
//  * @returns {string} - File extension
//  */
// function detectFileType(filename) {
//   const ext = filename.toLowerCase().split('.').pop();
//   return ext;
// }

// export default function Dashboard() {
//   // Client-side rendering flag
//   const [isClient, setIsClient] = useState(false);
  
//   // File and data state
//   const [file, setFile] = useState(null);
//   const [data, setData] = useState(null);
//   const [headers, setHeaders] = useState([]);
//   const [statistics, setStatistics] = useState(null);
//   const [fileType, setFileType] = useState(null);
  
//   // UI state
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [showAllRows, setShowAllRows] = useState(false);
  
//   // Editing state
//   const [editingCell, setEditingCell] = useState(null);
//   const [editValue, setEditValue] = useState("");
//   const [dataVersion, setDataVersion] = useState(0); // Track data modifications

//   // Set client flag after mount
//   useEffect(() => setIsClient(true), []);

//   /**
//    * Handle file selection
//    * Validates file type and updates state
//    */
//   const handleFileChange = (e) => {
//     const selectedFile = e.target.files?.[0];
//     if (selectedFile) {
//       const ext = detectFileType(selectedFile.name);
//       const allowedTypes = ['csv', 'json', 'xlsx', 'xls', 'txt'];
      
//       if (allowedTypes.includes(ext)) {
//         setFile(selectedFile);
//         setFileType(ext);
//         setError(null);
//       } else {
//         setError("Please select a valid file (CSV, JSON, Excel, or TXT)");
//         setFile(null);
//         setFileType(null);
//       }
//     }
//   };

//   /**
//    * Upload file and fetch data/statistics
//    * Handles multi-step process:
//    * 1. Upload file
//    * 2. Fetch statistics
//    * 3. Fetch and parse data
//    */
//   const handleUpload = async () => {
//     if (!file) return;
//     setLoading(true);
//     setError(null);

//     try {
//       // Step 1: Upload file
//       const formData = new FormData();
//       formData.append("file", file);
//       const uploadRes = await fetch("http://localhost:3000/upload", {
//         method: "POST",
//         body: formData,
//       });
      
//       if (!uploadRes.ok) {
//         const errorData = await uploadRes.json();
//         throw new Error(errorData.error || "Upload failed");
//       }
      
//       const { filename, fileType: uploadedFileType } = await uploadRes.json();
//       setFileType(uploadedFileType.replace('.', ''));

//       // Step 2: Fetch statistics
//       const statsRes = await fetch(`http://localhost:3000/stats/${filename}`);
//       if (!statsRes.ok) throw new Error("Failed to calculate statistics");
//       const statsData = await statsRes.json();
//       setStatistics(statsData);

//       // Step 3: Fetch parsed data
//       const dataRes = await fetch(`http://localhost:3000/data/${filename}`);
//       if (!dataRes.ok) throw new Error("Failed to load uploaded file");
//       const jsonData = await dataRes.json();

//       // Extract headers and rows
//       if (jsonData.data && Array.isArray(jsonData.data)) {
//         const rows = jsonData.data;
//         const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
//         setHeaders(headers);
//         setData(rows);
//       } else {
//         throw new Error("Invalid data format");
//       }
      
//       setDataVersion(0);
//     } catch (err) {
//       setError(err.message || "Unexpected error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /**
//    * Reset dashboard to initial state
//    */
//   const handleReset = () => {
//     setFile(null);
//     setData(null);
//     setHeaders([]);
//     setStatistics(null);
//     setError(null);
//     setEditingCell(null);
//     setDataVersion(0);
//     setFileType(null);
//   };

//   /**
//    * Export current data as JSON
//    */
//   const exportJSON = () => {
//     const exportData = {
//       fileName: file?.name,
//       fileType: fileType,
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

//   /**
//    * Export current data as CSV
//    * Handles proper CSV formatting with quotes for values containing commas
//    */
//   const exportCSV = () => {
//     if (!data || data.length === 0) return;
    
//     const csvContent = [
//       headers.join(','),
//       ...data.map(row => 
//         headers.map(h => {
//           // const value = row[h] || '';
//           const value = row[h] != null ? String(row[h]) : '';
//           // Quote values containing commas or quotes
//           return value.includes(',') || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value;
//         }).join(',')
//       )
//     ].join('\n');
    
//     const blob = new Blob([csvContent], { type: 'text/csv' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = `export-${Date.now()}.csv`;
//     a.click();
//     URL.revokeObjectURL(url);
//   };

//   // Get rows for preview (limited or all)
//   const previewRows = useMemo(() => {
//     if (!data) return [];
//     return showAllRows ? data : data.slice(0, 20);
//   }, [data, showAllRows]);

//   /**
//    * Start editing a cell
//    * @param {number} rowIndex - Row index in data
//    * @param {string} colName - Column name
//    * @param {any} currentValue - Current cell value
//    */
//   const startEdit = (rowIndex, colName, currentValue) => {
//     setEditingCell({ rowIndex, colName });
//     setEditValue(currentValue);
//   };

//   /**
//    * Save edited cell value
//    * Updates data and triggers re-render
//    */
//   const saveEdit = (rowIndex, colName) => {
//     if (editingCell) {
//       const newData = [...data];
//       newData[rowIndex][colName] = editValue;
//       setData(newData);
//       setEditingCell(null);
//       setEditValue("");
//       setDataVersion(v => v + 1); // Increment version to trigger updates
//     }
//   };

//   /**
//    * Cancel editing without saving
//    */
//   const cancelEdit = () => {
//     setEditingCell(null);
//     setEditValue("");
//   };

//   /**
//    * Create handler for chart value changes
//    * Returns a function that updates specific column/row
//    */
//   const handleChartValueChange = useCallback((columnName) => {
//     return (rowIndex, newValue) => {
//       const newData = [...data];
//       if (newData[rowIndex]) {
//         newData[rowIndex][columnName] = newValue;
//         setData(newData);
//         setDataVersion(v => v + 1);
//       }
//     };
//   }, [data]);

//   /**
//    * Recalculate statistics when data changes
//    * Runs automatically on data updates
//    */
//   useEffect(() => {
//     if (!data || data.length === 0) return;

//     const calculateStats = () => {
//       const columnStats = {};
      
//       headers.forEach(header => {
//         // Get non-empty values
//         const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== "");
//         const numericValues = values.filter(v => !isNaN(parseFloat(v))).map(v => parseFloat(v));
        
//         // Determine if column is numeric (>50% numeric values)
//         if (numericValues.length > values.length * 0.5) {
//           // Calculate numeric statistics
//           const sorted = [...numericValues].sort((a, b) => a - b);
//           const sum = numericValues.reduce((acc, val) => acc + val, 0);
//           const mean = sum / numericValues.length;
//           const median = sorted[Math.floor(sorted.length / 2)];
//           const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
//           const stdDev = Math.sqrt(variance);
          
//           columnStats[header] = {
//             count: numericValues.length,
//             mean,
//             median,
//             stdDev,
//             min: Math.min(...numericValues),
//             max: Math.max(...numericValues)
//           };
//         } else {
//           // Calculate categorical statistics
//           columnStats[header] = {
//             count: values.length,
//             unique: new Set(values).size
//           };
//         }
//       });

//       setStatistics({ columnStats });
//     };

//     calculateStats();
//   }, [data, headers, dataVersion]);

//   /**
//    * Get icon emoji for file type
//    * @param {string} type - File extension
//    * @returns {string} - Emoji icon
//    */
//   const getFileIcon = (type) => {
//     switch(type?.toLowerCase()) {
//       case 'csv': return '📊';
//       case 'json': return '📋';
//       case 'xlsx':
//       case 'xls': return '📈';
//       case 'txt': return '📄';
//       default: return '📁';
//     }
//   };

//   // Render component
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
//       <div className="max-w-7xl mx-auto p-6">
//         {/* Page Title */}
//         <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6">
//           Statistical Analysis Dashboard
//         </h1>

//         {/* File Upload Section (shown when no data loaded) */}
//         {!data ? (
//           <div className="bg-white rounded-lg shadow p-6">
//             <h2 className="text-xl font-semibold mb-4">Upload Data File</h2>

//             {/* File Drop Zone */}
//             <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
//               <input
//                 id="file-upload"
//                 type="file"
//                 accept=".csv,.json,.xlsx,.xls,.txt"
//                 onChange={handleFileChange}
//                 className="hidden"
//               />
//               <label htmlFor="file-upload" className="cursor-pointer inline-block">
//                 <div className="text-6xl mb-4">{file ? getFileIcon(fileType) : '📁'}</div>
//                 <p className="text-lg text-gray-600 mb-1">
//                   {file ? file.name : "Click to select a data file"}
//                 </p>
//                 <p className="text-sm text-gray-400">
//                   Supported: CSV, JSON, Excel (.xlsx, .xls), TXT
//                 </p>
//                 {file && (
//                   <p className="text-xs text-green-600 mt-2 font-medium">
//                     File Type: {fileType?.toUpperCase()}
//                   </p>
//                 )}
//               </label>
//             </div>

//             {/* Error Message */}
//             {error && (
//               <div className="mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
//                 {error}
//               </div>
//             )}

//             {/* Upload Button */}
//             <button
//               onClick={handleUpload}
//               disabled={!file || loading}
//               className="mt-6 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
//             >
//               {loading ? "Processing..." : "Analyze Data"}
//             </button>

//             {/* Supported File Types Grid */}
//             <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
//               <div className="p-3 bg-blue-50 rounded">
//                 <div className="text-2xl mb-1">📊</div>
//                 <div className="font-medium">CSV</div>
//               </div>
//               <div className="p-3 bg-green-50 rounded">
//                 <div className="text-2xl mb-1">📋</div>
//                 <div className="font-medium">JSON</div>
//               </div>
//               <div className="p-3 bg-purple-50 rounded">
//                 <div className="text-2xl mb-1">📈</div>
//                 <div className="font-medium">Excel</div>
//               </div>
//               <div className="p-3 bg-yellow-50 rounded">
//                 <div className="text-2xl mb-1">📄</div>
//                 <div className="font-medium">TXT</div>
//               </div>
//             </div>
//           </div>
//         ) : (
//           // Data Analysis Section (shown after file loaded)
//           <div className="space-y-8">
//             {/* File Info and Action Buttons */}
//             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
//               <div className="flex items-center gap-2">
//                 <span className="text-3xl">{getFileIcon(fileType)}</span>
//                 <div>
//                   <p className="text-gray-600">
//                     File: <strong>{file?.name}</strong>
//                   </p>
//                   <p className="text-sm text-gray-500">
//                     Type: <strong className="text-indigo-600">{fileType?.toUpperCase()}</strong> • 
//                     Modified: <strong className={dataVersion > 0 ? 'text-green-600' : 'text-gray-600'}>
//                       {dataVersion > 0 ? 'Yes' : 'No'}
//                     </strong>
//                   </p>
//                 </div>
//               </div>
//               <div className="space-x-2">
//                 <button
//                   onClick={exportJSON}
//                   className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition text-sm"
//                 >
//                   📥 Export JSON
//                 </button>
//                 <button
//                   onClick={exportCSV}
//                   className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition text-sm"
//                 >
//                   📥 Export CSV
//                 </button>
//                 <button
//                   onClick={handleReset}
//                   className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition text-sm"
//                 >
//                   🔄 New Analysis
//                 </button>
//               </div>
//             </div>

//             {/* Statistics Overview Section */}
//             <div className="bg-white rounded-lg shadow p-6">
//               <h2 className="text-xl font-semibold mb-3">
//                 Statistics Overview 
//                 {dataVersion > 0 && <span className="text-sm text-green-600 ml-2">(Live Updated)</span>}
//               </h2>
//               {statistics?.columnStats && Object.keys(statistics.columnStats).length > 0 ? (
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                   {Object.entries(statistics.columnStats).map(([column, stats]) => (
//                     <div key={column} className="border rounded-lg p-4 bg-gray-50">
//                       <h3 className="font-semibold text-indigo-600 mb-2">{column}</h3>
//                       <div className="text-sm space-y-1">
//                         {/* Basic count */}
//                         <div className="flex justify-between">
//                           <span className="text-gray-600">Count:</span>
//                           <span className="font-medium">{stats.count}</span>
//                         </div>
//                         {/* Numeric statistics */}
//                         {"mean" in stats && (
//                           <>
//                             <div className="flex justify-between">
//                               <span className="text-gray-600">Mean:</span>
//                               <span className="font-medium">{Number(stats.mean)?.toFixed?.(2)}</span>
//                             </div>
//                             <div className="flex justify-between">
//                               <span className="text-gray-600">Median:</span>
//                               <span className="font-medium">{Number(stats.median)?.toFixed?.(2)}</span>
//                             </div>
//                             <div className="flex justify-between">
//                               <span className="text-gray-600">Std Dev:</span>
//                               <span className="font-medium">{Number(stats.stdDev)?.toFixed?.(2)}</span>
//                             </div>
//                             <div className="flex justify-between">
//                               <span className="text-gray-600">Min:</span>
//                               <span className="font-medium">{Number(stats.min)?.toFixed?.(2)}</span>
//                             </div>
//                             <div className="flex justify-between">
//                               <span className="text-gray-600">Max:</span>
//                               <span className="font-medium">{Number(stats.max)?.toFixed?.(2)}</span>
//                             </div>
//                           </>
//                         )}
//                         {/* Categorical statistics */}
//                         {"unique" in stats && (
//                           <div className="flex justify-between">
//                             <span className="text-gray-600">Unique:</span>
//                             <span className="font-medium">{stats.unique}</span>
//                           </div>
//                         )}
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <p className="text-sm text-gray-500">No statistics available.</p>
//               )}
//             </div>

//             {/* Editable Data Preview Table */}
//             <div className="bg-white rounded-lg shadow p-6">
//               <div className="flex justify-between items-center mb-3">
//                 <h2 className="text-xl font-semibold">Data Preview (Editable)</h2>
//                 {data.length > 20 && (
//                   <button
//                     onClick={() => setShowAllRows(!showAllRows)}
//                     className="text-sm text-indigo-600 hover:text-indigo-800 underline"
//                   >
//                     {showAllRows ? 'Show Less' : `Show All ${data.length} Rows`}
//                   </button>
//                 )}
//               </div>
//               {/* Usage Instructions */}
//               <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
//                 <p className="text-sm text-blue-800">
//                   <strong>💡 Tip:</strong> Double-click any cell to edit. Press Enter to save or Escape to cancel. 
//                   Changes will automatically update the charts below.
//                 </p>
//               </div>
//               {/* Data Table */}
//               <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                   <thead className="bg-gray-50 sticky top-0">
//                     <tr>
//                       <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
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
//                         <td className="px-4 py-2 text-sm text-gray-500">{idx + 1}</td>
//                         {headers.map((h) => (
//                           <td
//                             key={h}
//                             className="px-4 py-2 text-sm text-gray-800 cursor-pointer hover:bg-blue-50"
//                             onDoubleClick={() => startEdit(idx, h, row[h])}
//                             title="Double-click to edit"
//                           >
//                             {/* Show input when editing, otherwise show value */}
//                             {editingCell?.rowIndex === idx && editingCell?.colName === h ? (
//                               <input
//                                 type="text"
//                                 value={editValue}
//                                 onChange={(e) => setEditValue(e.target.value)}
//                                 onBlur={() => saveEdit(idx, h)}
//                                 onKeyDown={(e) => {
//                                   if (e.key === "Enter") saveEdit(idx, h);
//                                   if (e.key === "Escape") cancelEdit();
//                                 }}
//                                 autoFocus
//                                 className="w-full px-2 py-1 border-2 border-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
//                               />
//                             ) : (
//                               <span className={editingCell?.rowIndex === idx && editingCell?.colName === h ? 'font-bold' : ''}>
//                                 {row[h]}
//                               </span>
//                             )}
//                           </td>
//                         ))}
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//               <p className="mt-3 text-sm text-gray-500">
//                 Showing {previewRows.length} of {data.length} rows • Double-click any cell to edit
//               </p>
//             </div>

//             {/* Interactive Charts Section */}
//             <div className="bg-white rounded-lg shadow p-6">
//               <h2 className="text-xl font-semibold mb-4">
//                 Column Distributions (Interactive)
//                 {dataVersion > 0 && <span className="text-sm text-green-600 ml-2">(Live Updated)</span>}
//               </h2>
//               {/* Chart Instructions */}
//               <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
//                 <p className="text-sm text-yellow-800">
//                   <strong>🎯 Interactive Charts:</strong> Click on bars, points, or pie slices to edit values. 
//                   All changes sync with the data table above in real-time.
//                 </p>
//               </div>
//               {/* Charts Grid */}
//               {!isClient ? (
//                 <p className="text-sm text-gray-500">Loading charts…</p>
//               ) : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
//                   {headers.map((h) => (
//                     <ColumnDistributionChart
//                       key={`${h}-${dataVersion}`}
//                       header={h}
//                       values={data.map((row) => row[h])}
//                       onValueChange={handleChartValueChange(h)}
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

