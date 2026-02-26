import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DiagramCanvas from './components/DiagramCanvas';
import TableModal from './components/TableModal';
import { ReactFlowProvider } from 'reactflow';
import { useTheme } from './ThemeContext';

function App() {
  const [schema, setSchema] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { theme } = useTheme();

  // Restore schema from localStorage on mount
  useEffect(() => {
    const savedSchema = localStorage.getItem('db_schema');
    if (savedSchema) {
      try {
        setSchema(JSON.parse(savedSchema));
      } catch (e) {
        console.error('Failed to restore schema:', e);
        localStorage.removeItem('db_schema');
      }
    }
  }, []);

  const handleDatabaseLoaded = (loadedSchema) => {
    setSchema(loadedSchema);
    // Save schema to localStorage for persistence
    localStorage.setItem('db_schema', JSON.stringify(loadedSchema));
    setIsLoading(false);
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);
    setShowModal(true);
  };

  const handleClearDatabase = () => {
    setSchema(null);
    setSelectedTable(null);
    setShowModal(false);
    localStorage.removeItem('db_schema');
  };

  return (
    <div className={`w-screen h-screen flex flex-col transition-colors ${
      theme === 'dark'
        ? 'bg-slate-950 text-slate-50'
        : 'bg-white text-gray-900'
    }`}>
      <Navbar 
        onDatabaseLoaded={handleDatabaseLoaded} 
        isLoading={isLoading}
        onClearDatabase={handleClearDatabase}
        hasDatabase={schema !== null}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {!schema ? (
          <div className={`w-full min-h-full flex flex-col items-center justify-center text-center px-4 py-12 transition-colors ${
            theme === 'dark' ? 'bg-slate-950' : 'bg-white'
          }`}>
            <div className="mb-8 animate-pulse">
              <div className={`w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transition-all ${
                theme === 'dark' ? 'shadow-orange-500/50' : 'shadow-orange-400'
              }`}>
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7m0 0c0 2.21-3.582 4-8 4s-8-1.79-8-4m16 0c0-2.21-3.582-4-8-4S4 4.79 4 7m12 4c0 .845-.338 1.635-.981 2.25M4 10.5c0 .845.338 1.635.981 2.25" />
                </svg>
              </div>
            </div>

            <h1 className={`text-4xl font-bold mb-4 ${
              theme === 'dark' ? 'text-slate-50' : 'text-gray-900'
            }`}>
              Welcome to DB Visualizer
            </h1>
            <p className={`text-lg mb-8 max-w-md ${
              theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
            }`}>
              Upload a database file to instantly visualize your schema as an interactive ER diagram
            </p>

            <div className={`rounded-lg shadow-md p-8 max-w-md w-full transition-all ${
              theme === 'dark'
                ? 'bg-slate-900 border border-slate-700 hover:border-orange-500 hover:shadow-lg hover:shadow-orange-500/30'
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <h3 className={`font-semibold mb-4 ${
                theme === 'dark' ? 'text-slate-100' : 'text-gray-900'
              }`}>
                Supported File Types
              </h3>
              <ul className={`space-y-2 text-sm mb-6 ${
                theme === 'dark' ? 'text-slate-300' : 'text-gray-600'
              }`}>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  SQLite (.db, .sqlite, .sqlite3)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  SQL scripts (.sql)
                </li>
              </ul>

              <div className={`rounded-lg p-4 text-sm transition-colors ${
                theme === 'dark'
                  ? 'bg-orange-900 bg-opacity-30 text-orange-200 border border-orange-800'
                  : 'bg-orange-50 text-orange-900 border border-orange-200'
              }`}>
                <p className="font-semibold mb-2">💡 Tip</p>
                <p>
                  Click the "Upload Database" button above or drag and drop your database file to get started.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <ReactFlowProvider>
            <DiagramCanvas schema={schema} onTableClick={handleTableClick} />
          </ReactFlowProvider>
        )}
      </div>

      {/* Table Modal */}
      <TableModal
        table={selectedTable}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}

export default App;
