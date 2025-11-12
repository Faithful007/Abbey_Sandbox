// ...existing code...
// Main dashboard for data analysis and visualization

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import ColumnDistributionChart from "../../components/ColumnDistributionChart";
import ChartConfiguration from "../../components/ChartConfiguration";
import CustomChart from "../../components/CustomChart";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

const API_BASE =
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3000'; // <-- change to 3001 if your backend runs there

// Helper: client-side parsing fallback
async function clientParseFile(file, ext) {
  const textLike = ['csv','txt','json'];
  const arrayBufferLike = ['xlsx','xls'];
  const lower = ext.toLowerCase();

  // Read as text
  const readText = f =>
    new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(fr.error);
      fr.readAsText(f);
    });

  // Read as ArrayBuffer
  const readBuffer = f =>
    new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(fr.error);
      fr.readAsArrayBuffer(f);
    });

  if (textLike.includes(lower)) {
    const raw = await readText(file);
    if (lower === 'json') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
      return [parsed];
    }
    // CSV / TXT simple split (reuse csvSplit)
    const lines = raw.replace(/\r\n/g, '\n').split('\n').filter(l=>l.trim().length>0);
    if (!lines.length) return [];
    const headers = csvSplit(lines[0]).map(h=>h.replace(/^"(.*)"$/,'$1').trim());
    return lines.slice(1).map(line=>{
      const parts = csvSplit(line).map(v=>v.replace(/^"(.*)"$/,'$1').trim());
      const obj = {};
      headers.forEach((h,i)=> obj[h] = parts[i] ?? '');
      return obj;
    });
  }

  if (arrayBufferLike.includes(lower)) {
    const buf = await readBuffer(file);
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet);
  }

  throw new Error('Unsupported fallback parse type: ' + ext);
}

/**
 * Split CSV line respecting quoted values
 */
const csvSplit = (line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

/**
 * Parse CSV text (unused for server-side parsed uploads but retained)
 */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = csvSplit(lines[0]).map((h) => h.replace(/^"(.*)"$/, "$1").trim());
  const rows = lines.slice(1).map((line) => {
    const parts = csvSplit(line).map((v) => v.replace(/^"(.*)"$/, "$1").trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = parts[i] ?? ""; });
    return obj;
  });
  return { headers, rows };
}

/**
 * Detect file extension
 */
function detectFileType(filename) {
  return filename.toLowerCase().split('.').pop();
}

/**
 * Local statistics fallback
 */
function computeStatistics(rows) {
  if (!rows || rows.length === 0) return { columnStats: {} };
  const headers = Object.keys(rows[0] || {});
  const columnStats = {};
  headers.forEach(header => {
    const values = rows.map(r => r[header]).filter(v => v !== null && v !== undefined && v !== '');
    const numericValues = values.filter(v => !isNaN(parseFloat(v))).map(v => parseFloat(v));
    if (numericValues.length > 0 && numericValues.length > values.length * 0.5) {
      const sorted = [...numericValues].sort((a, b) => a - b);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const mean = sum / numericValues.length;
      const median = sorted.length % 2
        ? sorted[(sorted.length - 1) / 2]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
      const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
      columnStats[header] = {
        count: numericValues.length,
        mean,
        median,
        stdDev: Math.sqrt(variance),
        min: sorted[0],
        max: sorted[sorted.length - 1]
      };
    } else {
      columnStats[header] = {
        count: values.length,
        unique: new Set(values).size
      };
    }
  });
  return { columnStats };
}

export default function Dashboard() {
  const [isClient, setIsClient] = useState(false);
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [dataVersion, setDataVersion] = useState(0);
  const dashboardRef = useRef(null);
  const chartsRef = useRef(null);
  const [showChartConfig, setShowChartConfig] = useState(false);
  const [customCharts, setCustomCharts] = useState([]);

  useEffect(() => setIsClient(true), []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = detectFileType(selectedFile.name);
      const allowed = ['csv', 'json', 'xlsx', 'xls', 'txt'];
      if (allowed.includes(ext)) {
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
   * Upload then fetch data, then stats (with fallback)
   */
  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    let filename = null;
    let uploadedExt = fileType;

    try {
      // 1. Upload
      const formData = new FormData();
      formData.append("file", file);

      console.log('[Upload] POST', `${API_BASE}/upload`);
      const uploadRes = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        let serverMsg = '';
        try { serverMsg = (await uploadRes.json()).error; } catch {}
        throw new Error(serverMsg || `Upload failed (${uploadRes.status})`);
      }

      const uploadJson = await uploadRes.json();
      filename = uploadJson.filename;
      uploadedExt = uploadJson.fileType?.replace('.','') || detectFileType(file.name);
      setFileType(uploadedExt);
      console.log('[Upload] Success filename=', filename, 'ext=', uploadedExt);

      // 2. Fetch parsed data from server
      console.log('[Data] GET', `${API_BASE}/data/${filename}`);
      let rows = [];
      let serverDataOk = false;

      try {
        const dataRes = await fetch(`${API_BASE}/data/${filename}`);
        if (!dataRes.ok) {
          let srvErr = '';
          try { srvErr = (await dataRes.json()).error; } catch {}
          throw new Error(srvErr || `Data endpoint error (${dataRes.status})`);
        }
        const jsonData = await dataRes.json();
        if (jsonData.data && Array.isArray(jsonData.data)) {
          rows = jsonData.data;
          serverDataOk = true;
          console.log('[Data] Rows received:', rows.length);
        } else {
          throw new Error('Server returned invalid data structure');
        }
      } catch (e) {
        console.warn('[Data] Server fetch failed, using client fallback:', e.message);
        // 3. Client-side fallback parsing
        try {
          rows = await clientParseFile(file, uploadedExt);
          console.log('[Fallback] Parsed rows locally:', rows.length);
        } catch (pfErr) {
            console.error('[Fallback] Failed to parse locally:', pfErr);
            throw new Error(`Failed to load data (server + fallback). Root cause: ${e.message}`);
        }
      }

      const hdrs = rows.length ? Object.keys(rows[0]) : [];
      setHeaders(hdrs);
      setData(rows);

      // 4. Statistics (prefer server; fallback local)
      try {
        if (serverDataOk) {
          console.log('[Stats] GET', `${API_BASE}/stats/${filename}`);
          const statsRes = await fetch(`${API_BASE}/stats/${filename}`);
          if (statsRes.ok) {
            const statsJson = await statsRes.json();
            if (statsJson?.columnStats) {
              setStatistics(statsJson);
              console.log('[Stats] Server stats OK');
            } else {
              console.warn('[Stats] Missing columnStats key, computing locally.');
              setStatistics(computeStatistics(rows));
            }
          } else {
            console.warn('[Stats] Server stats status:', statsRes.status);
            setStatistics(computeStatistics(rows));
          }
        } else {
          setStatistics(computeStatistics(rows));
        }
      } catch (sErr) {
        console.warn('[Stats] Fallback to local stats:', sErr.message);
        setStatistics(computeStatistics(rows));
      }

      setDataVersion(0);
    } catch (err) {
      console.error('[UploadWorkflow] Error:', err);
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };
  const handleReset = () => {
    setFile(null);
    setData(null);
    setHeaders([]);
    setStatistics(null);
    setError(null);
    setEditingCell(null);
    setDataVersion(0);
    setFileType(null);
    setCustomCharts([]);
  };

  const exportPDF = async () => {
    if (!data || !statistics) return;
    setExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let y = 20;
      pdf.setFontSize(20);
      pdf.setTextColor(99,102,241);
      pdf.text('Statistical Analysis Report', pageWidth/2, y, { align:'center' });
      y += 10;
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`File: ${file?.name}`, 20, y); y+=5;
      pdf.text(`Type: ${fileType?.toUpperCase()}`, 20, y); y+=5;
      pdf.text(`Modified: ${dataVersion>0?'Yes':'No'}`, 20, y); y+=5;
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, y); y+=10;
      pdf.setFontSize(14);
      pdf.setTextColor(0);
      pdf.text('Statistics Overview', 20, y); y+=8;
      if (statistics?.columnStats) {
        const statsData = [];
        Object.entries(statistics.columnStats).forEach(([col, st])=>{
          if ('mean' in st) {
            statsData.push([col, st.count, st.mean?.toFixed(2)||'N/A', st.median?.toFixed(2)||'N/A', st.stdDev?.toFixed(2)||'N/A', st.min?.toFixed(2)||'N/A', st.max?.toFixed(2)||'N/A']);
          } else {
            statsData.push([col, st.count, 'N/A','N/A','N/A','N/A', `${st.unique} unique`]);
          }
        });
        autoTable(pdf,{
          startY:y,
          head:[['Column','Count','Mean','Median','Std Dev','Min','Max']],
          body:statsData,
          theme:'grid',
          headStyles:{ fillColor:[99,102,241] },
          styles:{ fontSize:8 },
          margin:{ left:20, right:20 }
        });
        y = pdf.lastAutoTable.finalY + 10;
      }
      if (y > pageHeight - 60) { pdf.addPage(); y=20; }
      pdf.setFontSize(14);
      pdf.text('Data Preview (First 20 rows)',20,y); y+=8;
      const preview = data.slice(0,20).map(r=> headers.map(h=> String(r[h]??'')));
      autoTable(pdf,{
        startY:y,
        head:[headers],
        body:preview,
        theme:'striped',
        headStyles:{ fillColor:[99,102,241] },
        styles:{ fontSize:7 },
        margin:{ left:20, right:20 }
      });
      if (chartsRef.current) {
        pdf.addPage(); y=20;
        pdf.setFontSize(14);
        pdf.text('Column Distribution Charts',20,y); y+=10;
        const chartEls = chartsRef.current.querySelectorAll('.chart-container');
        for (let i=0;i<chartEls.length;i++){
          const el = chartEls[i];
          try {
            const canvas = await html2canvas(el,{ scale:2, backgroundColor:'#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const imgW = 80;
            const imgH = (canvas.height * imgW) / canvas.width;
            if (y + imgH > pageHeight - 20) { pdf.addPage(); y=20; }
            pdf.addImage(imgData,'PNG',20,y,imgW,imgH);
            y += imgH + 10;
          } catch(e){ console.error('Chart capture failed', e); }
        }
      }
      pdf.save(`analysis-report-${Date.now()}.pdf`);
    } catch(e){
      console.error(e);
      alert('Error generating PDF: '+e.message);
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = () => {
    if (!data || !statistics) return;
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const summary = [
        ['Statistical Analysis Report'],
        [],
        ['File Name', file?.name],
        ['File Type', fileType?.toUpperCase()],
        ['Total Rows', data.length],
        ['Total Columns', headers.length],
        ['Modified', dataVersion>0?'Yes':'No'],
        ['Generated', new Date().toLocaleString()],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');
      if (statistics?.columnStats) {
        const stats = [['Column','Count','Mean','Median','Std Dev','Min','Max','Unique Values']];
        Object.entries(statistics.columnStats).forEach(([col, st])=>{
          if ('mean' in st) {
            stats.push([col, st.count, st.mean?.toFixed(2)||'N/A', st.median?.toFixed(2)||'N/A', st.stdDev?.toFixed(2)||'N/A', st.min?.toFixed(2)||'N/A', st.max?.toFixed(2)||'N/A', 'N/A']);
          } else {
            stats.push([col, st.count,'N/A','N/A','N/A','N/A','N/A', st.unique]);
          }
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stats), 'Statistics');
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Data');
      const types = [['Column','Type','Sample Values']];
      headers.forEach(h=>{
        const sample = data.slice(0,3).map(r=> r[h]).join(', ');
        const isNum = statistics?.columnStats[h]?.mean !== undefined;
        types.push([h, isNum?'Numeric':'Categorical', sample]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(types), 'Column Types');
      XLSX.writeFile(wb, `analysis-report-${Date.now()}.xlsx`);
    } catch(e){
      console.error(e);
      alert('Error generating Excel: '+e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleCreateCustomChart = (config) => {
    setCustomCharts([...customCharts, { id: Date.now(), config }]);
    setShowChartConfig(false);
  };
  const handleRemoveCustomChart = (id) => {
    setCustomCharts(customCharts.filter(c=> c.id !== id));
  };

  const previewRows = useMemo(()=> {
    if (!data) return [];
    return showAllRows ? data : data.slice(0,20);
  }, [data, showAllRows]);

  const startEdit = (rowIndex, colName, currentValue) => {
    setEditingCell({ rowIndex, colName });
    setEditValue(currentValue);
  };
  const saveEdit = (rowIndex, colName) => {
    if (editingCell) {
      const newData = [...data];
      newData[rowIndex][colName] = editValue;
      setData(newData);
      setEditingCell(null);
      setEditValue("");
      setDataVersion(v=> v+1);
    }
  };
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleChartValueChange = useCallback((columnName)=>{
    return (rowIndex, newValue)=>{
      const newData = [...data];
      if (newData[rowIndex]) {
        newData[rowIndex][columnName] = newValue;
        setData(newData);
        setDataVersion(v=> v+1);
      }
    };
  }, [data]);

  useEffect(()=>{
    if (!data || data.length === 0) return;
    const columnStats = {};
    headers.forEach(header=>{
      const values = data.map(r=> r[header]).filter(v=> v !== null && v !== undefined && v !== "");
      const nums = values.filter(v=> !isNaN(parseFloat(v))).map(v=> parseFloat(v));
      if (nums.length > values.length * 0.5 && nums.length > 0) {
        const sorted = [...nums].sort((a,b)=> a-b);
        const sum = nums.reduce((a,b)=> a+b,0);
        const mean = sum / nums.length;
        const median = sorted[Math.floor(sorted.length/2)];
        const variance = nums.reduce((acc,val)=> acc + Math.pow(val-mean,2),0)/nums.length;
        columnStats[header] = {
          count: nums.length,
          mean,
          median,
          stdDev: Math.sqrt(variance),
          min: Math.min(...nums),
          max: Math.max(...nums)
        };
      } else {
        columnStats[header] = { count: values.length, unique: new Set(values).size };
      }
    });
    setStatistics({ columnStats });
  }, [data, headers, dataVersion]);

  const getFileIcon = (type) => {
    switch(type?.toLowerCase()){
      case 'csv': return '📊';
      case 'json': return '📋';
      case 'xlsx':
      case 'xls': return '📈';
      case 'txt': return '📄';
      default: return '📁';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6" ref={dashboardRef}>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6">Statistical Analysis Dashboard</h1>
        {!data ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Data File</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input id="file-upload" type="file" accept=".csv,.json,.xlsx,.xls,.txt" onChange={handleFileChange} className="hidden" />
              <label htmlFor="file-upload" className="cursor-pointer inline-block">
                <div className="text-6xl mb-4">{file ? getFileIcon(fileType) : '📁'}</div>
                <p className="text-lg text-gray-600 mb-1">{file ? file.name : "Click to select a data file"}</p>
                <p className="text-sm text-gray-400">Supported: CSV, JSON, Excel (.xlsx, .xls), TXT</p>
                {file && <p className="text-xs text-green-600 mt-2 font-medium">File Type: {fileType?.toUpperCase()}</p>}
              </label>
            </div>
            {error && <div className="mt-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}
            <button onClick={handleUpload} disabled={!file || loading} className="mt-6 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
              {loading ? "Processing..." : "Analyze Data"}
            </button>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
              <div className="p-3 bg-blue-50 rounded"><div className="text-2xl mb-1">📊</div><div className="font-medium">CSV</div></div>
              <div className="p-3 bg-green-50 rounded"><div className="text-2xl mb-1">📋</div><div className="font-medium">JSON</div></div>
              <div className="p-3 bg-purple-50 rounded"><div className="text-2xl mb-1">📈</div><div className="font-medium">Excel</div></div>
              <div className="p-3 bg-yellow-50 rounded"><div className="text-2xl mb-1">📄</div><div className="font-medium">TXT</div></div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{getFileIcon(fileType)}</span>
                <div>
                  <p className="text-gray-600">File: <strong>{file?.name}</strong></p>
                  <p className="text-sm text-gray-500">Type: <strong className="text-indigo-600">{fileType?.toUpperCase()}</strong> • Modified: <strong className={dataVersion>0?'text-green-600':'text-gray-600'}>{dataVersion>0?'Yes':'No'}</strong></p>
                </div>
              </div>
              <div className="space-x-2">
  <button onClick={exportPDF} disabled={exporting} className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition text-sm disabled:opacity-50">
    {exporting ? '⏳ Generating...' : '📄 Export PDF'}
  </button>
  <button onClick={exportExcel} disabled={exporting} className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50">
    {exporting ? '⏳ Generating...' : '📊 Export Excel'}
  </button>
  <button onClick={()=> setShowChartConfig(true)} className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition text-sm">
    📊 Create Custom Chart
  </button>
  <button onClick={handleReset} className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition text-sm">
    🔄 New Analysis
  </button>
</div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-3">Statistics Overview {dataVersion>0 && <span className="text-sm text-green-600 ml-2">(Live Updated)</span>}</h2>
              {statistics?.columnStats && Object.keys(statistics.columnStats).length>0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(statistics.columnStats).map(([col, st])=>(
                    <div key={col} className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-semibold text-indigo-600 mb-2">{col}</h3>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between"><span className="text-gray-600">Count:</span><span className="font-medium">{st.count}</span></div>
                        {'mean' in st && <>
                          <div className="flex justify-between"><span className="text-gray-600">Mean:</span><span className="font-medium">{Number(st.mean)?.toFixed?.(2)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Median:</span><span className="font-medium">{Number(st.median)?.toFixed?.(2)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Std Dev:</span><span className="font-medium">{Number(st.stdDev)?.toFixed?.(2)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Min:</span><span className="font-medium">{Number(st.min)?.toFixed?.(2)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Max:</span><span className="font-medium">{Number(st.max)?.toFixed?.(2)}</span></div>
                        </>}
                        {'unique' in st && <div className="flex justify-between"><span className="text-gray-600">Unique:</span><span className="font-medium">{st.unique}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-500">No statistics available.</p>}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold">Data Preview (Editable)</h2>
                {data.length>20 && <button onClick={()=> setShowAllRows(!showAllRows)} className="text-sm text-indigo-600 hover:text-indigo-800 underline">{showAllRows?'Show Less':`Show All ${data.length} Rows`}</button>}
              </div>
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800"><strong>💡 Tip:</strong> Double-click any cell to edit. Press Enter to save or Escape to cancel.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      {headers.map(h=> <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewRows.map((row,idx)=>(
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-500">{idx+1}</td>
                        {headers.map(h=>(
                          <td key={h} className="px-4 py-2 text-sm text-gray-800 cursor-pointer hover:bg-blue-50" onDoubleClick={()=> startEdit(idx,h,row[h])}>
                            {editingCell?.rowIndex===idx && editingCell?.colName===h ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e)=> setEditValue(e.target.value)}
                                onBlur={()=> saveEdit(idx,h)}
                                onKeyDown={(e)=> {
                                  if (e.key==="Enter") saveEdit(idx,h);
                                  if (e.key==="Escape") cancelEdit();
                                }}
                                autoFocus
                                className="w-full px-2 py-1 border-2 border-indigo-500 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : <span>{row[h]}</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-gray-500">Showing {previewRows.length} of {data.length} rows</p>
            </div>

            {customCharts.length>0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Custom Charts <span className="text-sm text-gray-500 ml-2">({customCharts.length})</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customCharts.map(chart=>(
                    <CustomChart key={chart.id} config={chart.config} data={data} onClose={()=> handleRemoveCustomChart(chart.id)} />
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6" ref={chartsRef}>
              <h2 className="text-xl font-semibold mb-4">Column Distributions (Interactive){dataVersion>0 && <span className="text-sm text-green-600 ml-2">(Live Updated)</span>}</h2>
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800"><strong>🎯 Interactive Charts:</strong> Click on bars, points, or pie slices to edit values.</p>
              </div>
              {!isClient ? <p className="text-sm text-gray-500">Loading charts…</p> : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {headers.map(h=>(
                    <div key={`${h}-${dataVersion}`} className="chart-container">
                      <ColumnDistributionChart header={h} values={data.map(r=> r[h])} onValueChange={handleChartValueChange(h)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {showChartConfig && (
          <ChartConfiguration
            headers={headers}
            onApply={handleCreateCustomChart}
            onCancel={()=> setShowChartConfig(false)}
          />
        )}
      </div>
    </div>
  );
}
