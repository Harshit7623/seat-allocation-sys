import React, { useState } from 'react';
import { Layout } from 'lucide-react';

const LayoutPage = ({ showToast }) => {
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(6);

  const handleSaveLayout = () => {
    // TODO: Add API call to save layout
    // const response = await axios.post('/api/classroom/layout', { rows, cols });
    showToast('Layout saved successfully!', 'success');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="bg-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layout className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Classroom Layout</h1>
            <p className="text-gray-600 mt-2">Configure your classroom seating arrangement</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Rows
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Columns
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Seat Grid Preview */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seating Preview</h3>
            <div className="bg-gray-100 p-8 rounded-xl overflow-auto">
              <div className="inline-block min-w-full">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                  <div key={rowIndex} className="flex gap-2 mb-2">
                    {Array.from({ length: cols }).map((_, colIndex) => (
                      <div
                        key={colIndex}
                        className="w-12 h-12 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center text-xs font-medium text-gray-600 hover:border-green-500 cursor-pointer transition"
                      >
                        {rowIndex + 1}-{colIndex + 1}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Total seats: {rows * cols}
            </p>
          </div>

          <button
            onClick={handleSaveLayout}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
          >
            Save Layout Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayoutPage;