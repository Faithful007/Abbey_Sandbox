import React, { useState } from "react";

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');

      const { filename } = await uploadRes.json();

      const statsRes = await fetch(`http://localhost:3000/stats/${filename}`);
      if (!statsRes.ok) throw new Error('Failed to calculate statistics');
      
      const statsData = await statsRes.json();

      const dataRes = await fetch(`http://localhost:3000/uploads/${filename}`);
      if (!dataRes.ok) throw new Error('Failed to load data');
      
      const csvText = await dataRes.text();
      const rows = csvText.trim().split('\n');
      const headers = rows[0].split(',');
      const parsedData = rows.slice(1).map(row => {
        const values = row.split(',');
        return headers.reduce((obj, header, i) => {
          obj[header.trim()] = values[i]?.trim();
          return obj;
        }, {});
      });

      setData(parsedData);
      setStatistics(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setData(null);
    setStatistics(null);
    setError(null);
  };

  const exportJSON = () => {
    const exportData = {
      fileName: file?.name,
      statistics,
      data
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Statistical Analysis Dashboard</h1>

        {!data ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Upload CSV File</h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-lg text-gray-600 mb-2">
                  {file ? file.name : 'Click to select CSV file'}
                </p>
                <p className="text-sm text-gray-400">CSV files only</p>
              </label>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 mb-4">
                {error}
              </div>
            )}

            {file && (
              <button
                onClick={handleUpload}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Analyzing...' : 'Analyze Data'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics Overview */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Statistics Overview</h2>
                <div className="space-x-2">
                  <button
                    onClick={exportJSON}
                    className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition"
                  >
                    New Analysis
                  </button>
                </div>
              </div>

              <p className="text-gray-600 mb-4">File: <strong>{file?.name}</strong></p>

              {statistics?.columnStats && Object.keys(statistics.columnStats).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(statistics.columnStats).map(([column, stats]) => (
                    <div key={column} className="border rounded-lg p-4 bg-gray-50 hover:shadow-md transition">
                      <h3 className="font-semibold text-lg mb-3 text-indigo-600">{column}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Count:</span>
                          <span className="font-medium">{stats.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mean:</span>
                          <span className="font-medium">{stats.mean?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Median:</span>
                          <span className="font-medium">{stats.median?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Std Dev:</span>
                          <span className="font-medium">{stats.stdDev?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Min:</span>
                          <span className="font-medium">{stats.min?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Max:</span>
                          <span className="font-medium">{stats.max?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No numeric columns found</p>
              )}
            </div>

            {/* Data Preview */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Data Preview</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {data[0] && Object.keys(data[0]).map(header => (
                        <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        {Object.values(row).map((value, i) => (
                          <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.length > 10 && (
                <p className="mt-4 text-sm text-gray-500">Showing 10 of {data.length} rows</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}