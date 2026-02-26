import React, { useState } from 'react';
import axios from 'axios';
import { useTheme } from '../ThemeContext';

const API_BASE = 'http://localhost:8000';

function Navbar({ onDatabaseLoaded, isLoading, onClearDatabase, hasDatabase }) {
  const [dragActive, setDragActive] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    const allowedTypes = ['.db', '.sqlite', '.sqlite3', '.sql'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedTypes.includes(fileExt)) {
      alert('Please upload a valid database file (.db, .sqlite, .sqlite3, or .sql)');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE}/upload-db`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        onDatabaseLoaded(response.data.schema);
      }
    } catch (error) {
      alert(`Error uploading database: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <nav className={`sticky top-0 z-50 shadow-sm transition-colors ${
      theme === 'dark'
        ? 'bg-slate-900 border-b border-slate-700'
        : 'bg-white border-b border-gray-200'
    }`}>
      <div className="max-w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v12m6-12v12m6-12v12M3 15h18" />
            </svg>
          </div>
          <h1 className={`text-2xl font-bold ${
            theme === 'dark' ? 'text-slate-50' : 'text-gray-900'
          }`}>
            DB Visualizer
          </h1>
          <span className={`text-xs font-medium px-2 py-1 rounded ${
            theme === 'dark'
              ? 'text-slate-400 bg-slate-800'
              : 'text-gray-500 bg-gray-100'
          }`}>
            v1.0
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-medium transition-all ${
              theme === 'dark'
                ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700 border border-yellow-500 shadow-lg shadow-yellow-500/50 hover:shadow-yellow-500/75'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            }`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
            </svg>
          </button>

          {hasDatabase && (
            <button
              onClick={onClearDatabase}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 ${
                theme === 'dark'
                  ? 'text-slate-300 border border-orange-500 hover:bg-slate-800 hover:border-orange-400 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50'
                  : 'text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
              }`}
              title="Clear database and return to landing page"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          )}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative group ${dragActive ? 'ring-2 ring-orange-500' : ''}`}
          >
            <input
              type="file"
              id="file-upload"
              onChange={handleFileInput}
              accept=".db,.sqlite,.sqlite3,.sql"
              className="hidden"
              disabled={isLoading}
            />
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                isLoading
                  ? theme === 'dark'
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : theme === 'dark'
                  ? 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95 hover:shadow-lg hover:shadow-orange-500/50 border border-orange-500'
                  : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload Database
                </>
              )}
            </label>
            {!isLoading && (
              <div className={`absolute right-0 top-full mt-2 w-48 text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg ${
                theme === 'dark'
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-gray-800 text-gray-100'
              }`}>
                Drag and drop your database file here, or click to browse
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
