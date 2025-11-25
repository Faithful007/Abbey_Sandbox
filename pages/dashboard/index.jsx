import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import ColumnDistributionChart from "../../components/ColumnDistributionChart";
import ChartConfiguration from "../../components/ChartConfiguration";
import CustomChart from "../../components/CustomChart";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { useRouter } from "next/router";
import { useAuth } from "../../components/AuthContext";

const API_BASE =
  (typeof window !== "undefined" && window.__API_BASE__) ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3000";

const csvSplit = (line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

function detectFileType(filename) {
  return filename.toLowerCase().split(".").pop();
}

async function clientParseFile(file, ext) {
  const lower = ext.toLowerCase();
  const readText = (f) =>
    new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(fr.error);
      fr.readAsText(f);
    });
  const readBuffer = (f) =>
    new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(fr.error);
      fr.readAsArrayBuffer(f);
    });
  if (["csv", "txt", "json"].includes(lower)) {
    const raw = await readText(file);
    if (lower === "json") {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.data && Array.isArray(parsed.data)) return parsed.data;
      return [parsed];
    }
    const lines = raw.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
    if (!lines.length) return [];
    const headers = csvSplit(lines[0]).map((h) => h.replace(/^"(.*)"$/, "$1").trim());
    return lines.slice(1).map((line) => {
      const parts = csvSplit(line).map((v) => v.replace(/^"(.*)"$/, "$1").trim());
      const obj = {};
      headers.forEach((h, i) => (obj[h] = parts[i] ?? ""));
      return obj;
    });
  }
  if (["xlsx", "xls"].includes(lower)) {
    const buf = await readBuffer(file);
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet);
  }
  throw new Error("Unsupported file type");
}

function computeStatistics(rows) {
  if (!rows?.length) return { columnStats: {} };
  const headers = Object.keys(rows[0]);
  const columnStats = {};
  headers.forEach((header) => {
    const values = rows.map((r) => r[header]).filter((v) => v !== "" && v !== null && v !== undefined);
    const nums = values.filter((v) => !isNaN(parseFloat(v))).map((v) => parseFloat(v));
    if (nums.length > 0 && nums.length >= values.length * 0.5) {
      const sorted = [...nums].sort((a, b) => a - b);
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / nums.length;
      const median =
        sorted.length % 2
          ? sorted[(sorted.length - 1) / 2]
          : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
      const variance = nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / nums.length;
      columnStats[header] = {
        count: nums.length,
        mean,
        median,
        stdDev: Math.sqrt(variance),
        min: sorted[0],
        max: sorted[sorted.length - 1],
      };
    } else {
      columnStats[header] = { count: values.length, unique: new Set(values).size };
    }
  });
  return { columnStats };
}

export default function Dashboard() {
  const router = useRouter();
  const { token, name, department, logout } = useAuth();
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [data, setData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [dataVersion, setDataVersion] = useState(0);
  const [showChartConfig, setShowChartConfig] = useState(false);
  const [customCharts, setCustomCharts] = useState([]);
  const chartsRef = useRef(null);

  // Auth guard
  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = detectFileType(f.name);
    if (!["csv", "json", "xlsx", "xls", "txt"].includes(ext)) {
      setError("Invalid file type");
      return;
    }
    setFile(f);
    setFileType(ext);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const upRes = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
      if (!upRes.ok) throw new Error(`Upload failed (${upRes.status})`);
      const upJson = await upRes.json();
      const serverFilename = upJson.filename;
      let rows = [];
      try {
        const dataRes = await fetch(`${API_BASE}/data/${serverFilename}`);
        if (!dataRes.ok) throw new Error("Server parse failed");
        const j = await dataRes.json();
        if (!Array.isArray(j.data)) throw new Error("Bad data shape");
        rows = j.data;
      } catch {
        rows = await clientParseFile(file, fileType);
      }
      setData(rows);
      setHeaders(rows.length ? Object.keys(rows[0]) : []);
      try {
        const statsRes = await fetch(`${API_BASE}/stats/${serverFilename}`);
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStatistics(s?.columnStats ? s : computeStatistics(rows));
        } else {
          setStatistics(computeStatistics(rows));
        }
      } catch {
        setStatistics(computeStatistics(rows));
      }
      setDataVersion(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const previewRows = useMemo(
    () => (data ? (showAllRows ? data : data.slice(0, 20)) : []),
    [data, showAllRows]
  );

  const startEdit = (rowIndex, colName, value) => {
    setEditingCell({ rowIndex, colName });
    setEditValue(value);
  };
  const saveEdit = (rowIndex, colName) => {
    if (!data) return;
    const copy = [...data];
    copy[rowIndex][colName] = editValue;
    setData(copy);
    setEditingCell(null);
    setEditValue("");
    setDataVersion((v) => v + 1);
  };
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  useEffect(() => {
    if (!data?.length) return;
    setStatistics(computeStatistics(data));
  }, [dataVersion]);

  const signOut = () => {
    logout();
    router.push("/login");
  };

  const getFileIcon = (t) => {
    switch (t?.toLowerCase()) {
      case "csv":
        return "📊";
      case "json":
        return "📋";
      case "xlsx":
      case "xls":
        return "📈";
      case "txt":
        return "📄";
      default:
        return "📁";
    }
  };

  // Export functions with user info
  const exportToCSV = () => {
    if (!data?.length) return;
    setExporting(true);
    try {
      const userName = name || "User";
      const userDept = department || "N/A";
      const timestamp = new Date().toLocaleString();
      
      // Header with user info
      let csv = `BEC Computational Analysis Report\n`;
      csv += `Generated by: ${userName}\n`;
      csv += `Department: ${userDept}\n`;
      csv += `Date: ${timestamp}\n`;
      csv += `File: ${file?.name || "Data"}\n\n`;
      
      // Column headers
      csv += headers.map(h => `"${h}"`).join(",") + "\n";
      
      // Data rows
      data.forEach(row => {
        csv += headers.map(h => {
          const val = row[h] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(",") + "\n";
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `BEC_Analysis_${userName.replace(/\s+/g, "_")}_${Date.now()}.csv`;
      link.click();
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = () => {
    if (!data?.length) return;
    setExporting(true);
    try {
      const userName = name || "User";
      const userDept = department || "N/A";
      const timestamp = new Date().toLocaleString();

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Info sheet
      const infoData = [
        ["BEC Computational Analysis Report"],
        ["Generated by:", userName],
        ["Department:", userDept],
        ["Date:", timestamp],
        ["File:", file?.name || "Data"],
        []
      ];
      const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
      XLSX.utils.book_append_sheet(wb, infoSheet, "Info");

      // Data sheet
      const dataSheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, dataSheet, "Data");

      // Statistics sheet
      if (statistics?.columnStats) {
        const statsData = [["Column", "Metric", "Value"]];
        Object.entries(statistics.columnStats).forEach(([col, stat]) => {
          if ("mean" in stat) {
            statsData.push([col, "Count", stat.count]);
            statsData.push([col, "Mean", stat.mean.toFixed(2)]);
            statsData.push([col, "Median", stat.median.toFixed(2)]);
            statsData.push([col, "Std Dev", stat.stdDev.toFixed(2)]);
            statsData.push([col, "Min", stat.min.toFixed(2)]);
            statsData.push([col, "Max", stat.max.toFixed(2)]);
          } else {
            statsData.push([col, "Count", stat.count]);
            statsData.push([col, "Unique", stat.unique]);
          }
        });
        const statsSheet = XLSX.utils.aoa_to_sheet(statsData);
        XLSX.utils.book_append_sheet(wb, statsSheet, "Statistics");
      }

      XLSX.writeFile(wb, `BEC_Analysis_${userName.replace(/\s+/g, "_")}_${Date.now()}.xlsx`);
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!data?.length) return;
    setExporting(true);
    try {
      const userName = name || "User";
      const userDept = department || "N/A";
      const timestamp = new Date().toLocaleString();

      const pdf = new jsPDF("p", "mm", "a4");
      let yPos = 20;

      // Title
      pdf.setFontSize(18);
      pdf.setFont(undefined, "bold");
      pdf.text("BEC Computational Analysis Report", 105, yPos, { align: "center" });
      yPos += 10;

      // User info
      pdf.setFontSize(10);
      pdf.setFont(undefined, "normal");
      pdf.text(`Generated by: ${userName}`, 20, yPos);
      yPos += 6;
      pdf.text(`Department: ${userDept}`, 20, yPos);
      yPos += 6;
      pdf.text(`Date: ${timestamp}`, 20, yPos);
      yPos += 6;
      pdf.text(`File: ${file?.name || "Data"}`, 20, yPos);
      yPos += 10;

      // Statistics summary
      if (statistics?.columnStats) {
        pdf.setFontSize(14);
        pdf.setFont(undefined, "bold");
        pdf.text("Statistics Summary", 20, yPos);
        yPos += 8;

        const statsTable = [];
        Object.entries(statistics.columnStats).forEach(([col, stat]) => {
          if ("mean" in stat) {
            statsTable.push([
              col,
              stat.count,
              stat.mean.toFixed(2),
              stat.median.toFixed(2),
              stat.stdDev.toFixed(2),
              stat.min.toFixed(2),
              stat.max.toFixed(2)
            ]);
          } else {
            statsTable.push([col, stat.count, "-", "-", "-", "-", "-"]);
          }
        });

        autoTable(pdf, {
          startY: yPos,
          head: [["Column", "Count", "Mean", "Median", "Std Dev", "Min", "Max"]],
          body: statsTable,
          theme: "striped",
          headStyles: { fillColor: [79, 70, 229] },
          margin: { left: 20, right: 20 },
          styles: { fontSize: 8 }
        });

        yPos = pdf.lastAutoTable.finalY + 10;
      }

      // Add new page for data
      pdf.addPage();
      yPos = 20;

      pdf.setFontSize(14);
      pdf.setFont(undefined, "bold");
      pdf.text("Data Preview", 20, yPos);
      yPos += 8;

      // Data table (first 50 rows)
      const dataRows = data.slice(0, 50).map(row => headers.map(h => row[h] ?? ""));
      autoTable(pdf, {
        startY: yPos,
        head: [headers],
        body: dataRows,
        theme: "grid",
        headStyles: { fillColor: [79, 70, 229] },
        margin: { left: 10, right: 10 },
        styles: { fontSize: 7, cellPadding: 2 }
      });

      if (data.length > 50) {
        pdf.text(`Showing first 50 of ${data.length} rows`, 20, pdf.lastAutoTable.finalY + 10);
      }

      // Charts (if available and space permits)
      if (chartsRef.current && pdf.internal.pages.length < 20) {
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.setFont(undefined, "bold");
        pdf.text("Charts", 20, 20);

        try {
          const canvas = await html2canvas(chartsRef.current, { scale: 2 });
          const imgData = canvas.toDataURL("image/png");
          const imgWidth = 170;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, "PNG", 20, 30, imgWidth, imgHeight);
        } catch (chartErr) {
          console.warn("Chart capture failed:", chartErr);
        }
      }

      pdf.save(`BEC_Analysis_${userName.replace(/\s+/g, "_")}_${Date.now()}.pdf`);
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-end mb-4">
          <button
            onClick={signOut}
            className="bg-gray-700 text-white py-2 px-6 rounded hover:bg-gray-800"
          >
            Sign out
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-6">BEC Computational Analysis Dashboard</h1>

        {!data ? (
          <div className="bg-white shadow rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Data File</h2>
            <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center">
              <input
                id="file-upload"
                type="file"
                accept=".csv,.json,.xlsx,.xls,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer inline-block">
                <div className="text-6xl mb-4">{file ? getFileIcon(fileType) : "📁"}</div>
                <p className="text-lg text-gray-600 mb-1">
                  {file ? file.name : "Click to select a data file"}
                </p>
                <p className="text-sm text-gray-400">Supported: CSV, JSON, Excel, TXT</p>
                {file && (
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    Type: {fileType?.toUpperCase()}
                  </p>
                )}
              </label>
            </div>
            {error && (
              <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="mt-6 w-full bg-indigo-600 text-white py-3 rounded font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Analyze Data"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{getFileIcon(fileType)}</span>
                <div>
                  <p className="text-gray-600">
                    File: <strong>{file?.name}</strong>
                  </p>
                  <p className="text-sm text-gray-500">
                    Type: <strong className="text-indigo-600">{fileType?.toUpperCase()}</strong> • Modified:{" "}
                    <strong className={dataVersion > 0 ? "text-green-600" : "text-gray-600"}>
                      {dataVersion > 0 ? "Yes" : "No"}
                    </strong>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={exportToCSV}
                  disabled={exporting}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  {exporting ? "Exporting..." : "Export CSV"}
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={exporting}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {exporting ? "Exporting..." : "Export Excel"}
                </button>
                <button
                  onClick={exportToPDF}
                  disabled={exporting}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  {exporting ? "Exporting..." : "Export PDF"}
                </button>
              </div>
            </div>

            <div className="bg-white shadow rounded p-6 mb-8">
              <h2 className="text-xl font-semibold mb-3">Analysis Overview</h2>
              {statistics?.columnStats && Object.keys(statistics.columnStats).length ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(statistics.columnStats).map(([col, st]) => (
                    <div key={col} className="border rounded p-4 bg-gray-50">
                      <h3 className="font-semibold text-indigo-600 mb-2">{col}</h3>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Count:</span>
                          <span className="font-medium">{st.count}</span>
                        </div>
                        {"mean" in st && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Mean:</span>
                              <span className="font-medium">{st.mean.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Median:</span>
                              <span className="font-medium">{st.median.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Std Dev:</span>
                              <span className="font-medium">{st.stdDev.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Min:</span>
                              <span className="font-medium">{st.min.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Max:</span>
                              <span className="font-medium">{st.max.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        {"unique" in st && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Unique:</span>
                            <span className="font-medium">{st.unique}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No statistics.</p>
              )}
            </div>

            <div className="bg-white shadow rounded p-6 mb-8">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold">Data Preview</h2>
                {data.length > 20 && (
                  <button
                    onClick={() => setShowAllRows((v) => !v)}
                    className="text-sm text-indigo-600 underline"
                  >
                    {showAllRows ? "Show Less" : `Show All (${data.length})`}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
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
                            className="px-4 py-2 text-sm text-gray-800 cursor-pointer"
                            onDoubleClick={() => startEdit(idx, h, row[h])}
                          >
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
                                className="w-full px-2 py-1 border-2 border-indigo-500 rounded"
                              />
                            ) : (
                              row[h]
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Showing {previewRows.length} of {data.length} rows
              </p>
            </div>

            {headers.length > 0 && (
              <div className="bg-white shadow rounded p-6" ref={chartsRef}>
                <h2 className="text-xl font-semibold mb-4">Column Distributions</h2>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {headers.map((h) => (
                    <div key={h} className="chart-container">
                      <ColumnDistributionChart
                        header={h}
                        values={data.map((r) => r[h])}
                        onValueChange={() => {}}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {showChartConfig && (
          <ChartConfiguration
            headers={headers}
            onApply={(cfg) => {
              setCustomCharts((prev) => [...prev, { id: Date.now(), config: cfg }]);
              setShowChartConfig(false);
            }}
            onCancel={() => setShowChartConfig(false)}
          />
        )}

        {customCharts.length > 0 && (
          <div className="bg-white shadow rounded p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">Custom Charts</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {customCharts.map((c) => (
                <CustomChart
                  key={c.id}
                  config={c.config}
                  data={data}
                  onClose={() =>
                    setCustomCharts((prev) => prev.filter((x) => x.id !== c.id))
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

