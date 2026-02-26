import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
} from 'reactflow';
import TableNode from './TableNode';
import { useTheme } from '../ThemeContext';

const nodeTypes = {
  table: TableNode,
};

function DiagramCanvas({ schema, onTableClick }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();
  const { theme } = useTheme();

  // Convert schema to React Flow nodes and edges
  useEffect(() => {
    if (!schema || !schema.tables) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Create nodes from tables
    const newNodes = schema.tables.map((table, idx) => ({
      id: table.id,
      data: {
        label: table.name,
        columns: table.columns,
        primaryKeys: table.primaryKeys,
        rowCount: table.rowCount || 0,
        onClick: () => onTableClick(table),
      },
      position: { x: idx * 300, y: 0 },
      type: 'table',
    }));

    // Create edges from relationships
    const newEdges = schema.relationships.map((rel, idx) => ({
      id: `${rel.source_table}-${rel.target_table}-${idx}`,
      source: rel.source_table,
      target: rel.target_table,
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: theme === 'dark' ? '#fb923c' : '#1f2937',
      },
      label: rel.source_columns[0] || '',
      labelStyle: {
        fill: theme === 'dark' ? '#1e293b' : '#1f2937',
        fontSize: '14px',
        fontWeight: 'bold',
        fontFamily: 'ui-monospace, monospace',
        backgroundColor: theme === 'dark' ? '#cbd5e1' : '#f3f4f6',
        padding: '4px 8px',
      },
      style: {
        stroke: theme === 'dark' ? '#fb923c' : '#1f2937',
        strokeWidth: 3,
      },
    }));

    setNodes(newNodes);
    setEdges(newEdges);

    // Auto-layout using grid/matrix
    setTimeout(() => {
      autoLayoutMatrixNodes(newNodes);
    }, 50);
  }, [schema, setNodes, setEdges, onTableClick]);

  const autoLayoutMatrixNodes = (nodes) => {
    // Calculate grid dimensions to create a square matrix
    const totalTables = nodes.length;
    const cols = Math.ceil(Math.sqrt(totalTables));
    const rows = Math.ceil(totalTables / cols);

    // Large spacing for clarity - each table gets ample space
    const cellWidth = 500;   // Horizontal spacing between table centers
    const cellHeight = 400;  // Vertical spacing between table centers

    const layoutedNodes = nodes.map((node, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;

      return {
        ...node,
        position: {
          x: col * cellWidth,
          y: row * cellHeight,
        },
      };
    });

    setNodes(layoutedNodes);
    setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 100);
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background color={theme === 'dark' ? '#1e293b' : '#e5e7eb'} gap={16} />
      <Controls />
    </ReactFlow>
  );
}

export default DiagramCanvas;
