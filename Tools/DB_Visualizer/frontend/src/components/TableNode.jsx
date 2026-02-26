import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { useTheme } from '../ThemeContext';

const TableNode = memo(({ data }) => {
  const { columns = [], primaryKeys = [], onClick, label, rowCount = 0 } = data;
  const { theme } = useTheme();

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`rounded-lg border-2 shadow-lg hover:shadow-xl transition-all hover:border-orange-400 cursor-pointer overflow-hidden ${
        theme === 'dark'
          ? 'bg-slate-800 border-slate-700 hover:shadow-orange-500/50 hover:border-orange-400'
          : 'bg-white border-gray-200'
      }`}
      style={{ width: '320px' }}
    >
      {/* Table Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-5 py-4 border-b border-orange-800">
        <h3 className="font-bold text-base truncate" title={label}>
          {label}
        </h3>
        <p className="text-sm text-orange-100 mt-2">{columns.length} columns • {rowCount} entries</p>
      </div>

      {/* Columns List */}
      <div className="max-h-56 overflow-y-auto">
        {columns.length > 0 ? (
          columns.map((column, idx) => {
            const isPrimaryKey = primaryKeys.includes(column.name);
            return (
              <div
                key={idx}
                className={`px-5 py-3 text-sm font-mono flex items-start justify-between gap-2 ${
                  theme === 'dark'
                    ? `border-b border-slate-700 ${isPrimaryKey ? 'bg-yellow-900 bg-opacity-30' : ''}`
                    : `border-b border-gray-100 ${isPrimaryKey ? 'bg-yellow-50' : ''}`
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isPrimaryKey && (
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 bg-yellow-500 text-white rounded text-xs font-bold"
                        title="Primary Key"
                      >
                        K
                      </span>
                    )}
                    <span className={`font-semibold ${
                      theme === 'dark' ? 'text-slate-100' : 'text-gray-900'
                    }`}>
                      {column.name}
                    </span>
                  </div>
                </div>
                <span className={`whitespace-nowrap text-xs ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
                }`}>
                  {column.type.split('(')[0].toUpperCase()}
                </span>
              </div>
            );
          })
        ) : (
          <div className={`px-5 py-3 text-sm ${
            theme === 'dark' ? 'text-slate-500' : 'text-gray-400'
          }`}>
            No columns
          </div>
        )}
      </div>

      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

TableNode.displayName = 'TableNode';

export default TableNode;
