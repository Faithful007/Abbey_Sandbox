import React, { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, File, AlertCircle, Loader2, Sparkles, FileSpreadsheet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function FileUpload({ onFileUpload, loading, error }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(file => 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') ||
      file.name.endsWith('.csv')
    );

    if (excelFile) {
      onFileUpload(excelFile);
    }
  }, [onFileUpload]);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center justify-center py-8 sm:py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="w-full max-w-3xl border-none shadow-2xl bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-200 to-purple-200 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-pink-200 to-indigo-200 rounded-full blur-3xl opacity-30 -ml-32 -mb-32"></div>
        
        <div className="relative p-6 sm:p-12">
          {error && (
            <Alert variant="destructive" className="mb-6 animate-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-3xl p-8 sm:p-12 transition-all duration-300 transform
              ${dragActive 
                ? 'border-indigo-500 bg-indigo-50/50 scale-105 shadow-lg shadow-indigo-200' 
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50 hover:scale-[1.02]'
              }
              ${loading ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="hidden"
              disabled={loading}
            />
            
            <div className="flex flex-col items-center">
              {loading ? (
                <>
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/50">
                      <Loader2 className="w-12 h-12 text-white animate-spin" />
                    </div>
                    <div className="absolute -top-2 -right-2">
                      <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 text-center">
                    Analyzing Your Data
                  </h3>
                  <p className="text-slate-600 text-center text-sm sm:text-base">
                    Computing advanced statistics and probability distributions...
                  </p>
                  <div className="mt-6 flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative mb-6 sm:mb-8 group">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-2xl shadow-indigo-500/50">
                      <Upload className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
                    </div>
                    <div className="absolute -top-3 -right-3 animate-bounce">
                      <Sparkles className="w-8 h-8 text-indigo-500" />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 text-center">
                    Drop Your Excel File Here
                  </h3>
                  <p className="text-slate-600 mb-6 sm:mb-8 text-center text-sm sm:text-base">
                    Or click the button below to browse
                  </p>
                  
                  <Button
                    onClick={handleButtonClick}
                    className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-xl shadow-indigo-500/50 gap-2 px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold rounded-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1"
                    size="lg"
                  >
                    <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
                    Choose File
                  </Button>

                  <div className="flex items-center gap-3 sm:gap-6 mt-6 sm:mt-8">
                    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-indigo-100 border border-indigo-200">
                      <File className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs sm:text-sm font-medium text-indigo-700">.xlsx</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-purple-100 border border-purple-200">
                      <File className="w-4 h-4 text-purple-600" />
                      <span className="text-xs sm:text-sm font-medium text-purple-700">.xls</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-pink-100 border border-pink-200">
                      <File className="w-4 h-4 text-pink-600" />
                      <span className="text-xs sm:text-sm font-medium text-pink-700">.csv</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-indigo-100 shadow-inner">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2">
                  Advanced Statistical Analysis Includes:
                </p>
                <ul className="text-xs sm:text-sm text-slate-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                    Probability distribution analysis (skewness, kurtosis, normality tests)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    Comprehensive descriptive statistics with confidence intervals
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
                    Correlation matrices and interactive visualizations
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}