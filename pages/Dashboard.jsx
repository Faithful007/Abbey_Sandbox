import React, { useState } from "react";
import FileUpload from "../components/dashboard/FileUpload";
import StatsOverview from "../components/dashboard/StatsOverview";
import DistributionAnalysis from "../components/dashboard/DistributionAnalysis";
import CorrelationMatrix from "../components/dashboard/CorrelationMatrix";
import ChartDisplay from "../components/dashboard/ChartDisplay";
import DataPreview from "../components/dashboard/DataPreview";

// NOTE: Your components expect Tailwind + shadcn/ui styles in place.

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (uploadedFile) => {
    setFile(uploadedFile);
    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append('file', uploadedFile);
      const res = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        body: form
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Upload failed');
      }
      const json = await res.json();
      setData(json.data);
      setStatistics(json.statistics);
    } catch (e) {
      setError(e.message);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!data ? (
          <FileUpload onFileUpload={handleFileUpload} loading={loading} error={error} />
        ) : (
          <div className="space-y-8">
            <StatsOverview data={data} fileName={file?.name} statistics={statistics} />
            <DistributionAnalysis data={data} statistics={statistics} />
            <CorrelationMatrix statistics={statistics} />
            <ChartDisplay data={data} statistics={statistics.columnStats} />
            <DataPreview data={data} />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify({ fileName: file?.name, statistics, raw_data: data }, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `statistical-analysis-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
              >
                Export JSON
              </button>
              <button onClick={handleReset} className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20">
                New Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
