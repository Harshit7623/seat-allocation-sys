import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../ThemeContext';

const API_BASE = 'http://localhost:8000';

function TableModal({ table, isOpen, onClose }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ has_previous: false, has_next: false, total_pages: 0, total: 0 });
  const [limit, setLimit] = useState(25);
  const { theme } = useTheme();

  useEffect(() => {
    if (isOpen && table) {
      fetchTableData(1);
    }
  }, [isOpen, table, limit]);

  const fetchTableData = async (page) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/table/${table.id}`, {
        params: { page, limit },
      });

      if (response.data.success) {
        setData(response.data.data);
        setPagination(response.data.pagination);
        setCurrentPage(page);
      }
    } catch (err) {
      setError(`Failed to load table data: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !table) return null;

  const columns = table.columns || [];
  const columnNames = columns.map((col) => col.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`rounded-lg shadow-2xl w-11/12 h-5/6 max-w-6xl flex flex-col transition-colors ${
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b transition-colors ${
          theme === 'dark'
            ? 'border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900'
            : 'border-gray-200 bg-gradient-to-r from-gray-50 to-white'
        }`}>
          <div>
            <h2 className={`text-2xl font-bold ${
              theme === 'dark' ? 'text-slate-50' : 'text-gray-900'
            }`}>
              {table.name}
            </h2>
            <p className={`text-sm mt-1 ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
            }`}>
              Total rows: <span className="font-semibold">{pagination?.total || 0}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors ${
              theme === 'dark'
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`mx-6 mt-4 p-4 rounded-lg text-sm transition-colors ${
            theme === 'dark'
              ? 'bg-red-950 border border-red-800 text-red-200'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className={`w-12 h-12 rounded-full border-4 animate-spin mx-auto mb-4 ${
                theme === 'dark'
                  ? 'border-slate-700 border-t-orange-600'
                  : 'border-gray-300 border-t-orange-600'
              }`}></div>
              <p className={theme === 'dark' ? 'text-slate-300' : 'text-gray-600'}>
                Loading table data...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className={`sticky top-0 z-10 transition-colors ${
                  theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'
                }`}>
                  <tr>
                    {columnNames.map((col) => {
                      const colInfo = columns.find((c) => c.name === col);
                      const isPrimaryKey = table.primaryKeys?.includes(col);
                      return (
                        <th
                          key={col}
                          className={`px-6 py-3 text-left text-xs font-semibold whitespace-nowrap transition-colors ${
                            theme === 'dark'
                              ? 'text-slate-200 bg-slate-800 border-b border-slate-700'
                              : 'text-gray-700 bg-gray-100 border-b border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isPrimaryKey && (
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 bg-yellow-500 text-white rounded text-xs font-bold"
                                title="Primary Key"
                              >
                                K
                              </span>
                            )}
                            <span>{col}</span>
                            <span className={`font-mono text-xs ml-1 ${
                              theme === 'dark' ? 'text-slate-400' : 'text-gray-400'
                            }`}>
                              ({colInfo?.type.split('(')[0].toUpperCase()})
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.length > 0 ? (
                    data.map((row, rowIdx) => (
                      <tr key={rowIdx} className={`border-b transition-colors ${
                        theme === 'dark'
                          ? 'border-slate-700 hover:bg-slate-800'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        {columnNames.map((col) => (
                          <td
                            key={`${rowIdx}-${col}`}
                            className={`px-6 py-3 text-sm font-mono whitespace-nowrap overflow-hidden text-ellipsis ${
                              theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                            }`}
                            title={String(row[col] || '')}
                          >
                            {row[col] === null ? (
                              <span className={`italic ${
                                theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
                              }`}>
                                NULL
                              </span>
                            ) : (
                              String(row[col]).substring(0, 100)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columnNames.length}
                        className={`px-6 py-8 text-center ${
                          theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
                        }`}
                      >
                        No data available in this table
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer - Pagination */}
            <div className={`px-6 py-4 border-t flex items-center justify-between transition-colors ${
              theme === 'dark'
                ? 'border-slate-700 bg-slate-800'
                : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center gap-4">
                <label className={`text-sm ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Rows per page:
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className={`ml-2 px-3 py-1 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                      theme === 'dark'
                        ? 'border-slate-600 bg-slate-700 text-slate-200 hover:border-slate-500'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                    }`}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-sm ${
                  theme === 'dark' ? 'text-slate-300' : 'text-gray-700'
                }`}>
                  Page <span className="font-semibold">{currentPage}</span> of{' '}
                  <span className="font-semibold">{pagination?.total_pages || 0}</span>
                </span>
                <button
                  onClick={() => fetchTableData(currentPage - 1)}
                  disabled={!pagination.has_previous || loading}
                  className={`px-3 py-1 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'border-orange-500 text-slate-300 hover:bg-slate-700 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50'
                      : 'border-gray-300 text-gray-700 hover:bg-white'
                  }`}
                >
                  ← Previous
                </button>
                <button
                  onClick={() => fetchTableData(currentPage + 1)}
                  disabled={!pagination.has_next || loading}
                  className={`px-3 py-1 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'border-orange-500 text-slate-300 hover:bg-slate-700 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50'
                      : 'border-gray-300 text-gray-700 hover:bg-white'
                  }`}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TableModal;
