// Custom Node component for React Flow
import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { NodeDefinition, NodeType } from '@scenarioforge/core';
import { useGraphStore } from '../../stores/graphStore';
import { useNavigationStore } from '../../stores/navigationStore';

// Node type colors
const nodeColors: Record<NodeType, { bg: string; border: string; text: string }> = {
  DATA_SOURCE: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-800' },
  TRANSFORMER: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-800' },
  DISTRIBUTION: { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-800' },
  AGGREGATOR: { bg: 'bg-orange-50', border: 'border-orange-500', text: 'text-orange-800' },
  OUTPUT: { bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-800' },
  PARAMETER: { bg: 'bg-yellow-50', border: 'border-yellow-500', text: 'text-yellow-800' },
  DECISION: { bg: 'bg-pink-50', border: 'border-pink-500', text: 'text-pink-800' },
  CONSTANT: { bg: 'bg-gray-50', border: 'border-gray-500', text: 'text-gray-800' },
  CONSTRAINT: { bg: 'bg-teal-50', border: 'border-teal-500', text: 'text-teal-800' },
  SUBGRAPH: { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-800' },
};

// Node type icons
const nodeIcons: Record<NodeType, string> = {
  DATA_SOURCE: '📊',
  TRANSFORMER: '⚙️',
  DISTRIBUTION: '📈',
  AGGREGATOR: '∑',
  OUTPUT: '📤',
  PARAMETER: '🎚️',
  DECISION: '❓',
  CONSTANT: '🔢',
  CONSTRAINT: '🚫',
  SUBGRAPH: '📦',
};

interface CustomNodeData extends NodeDefinition {
  label: string;
  computedOutput?: number | string;
}

function CustomNodeComponent({ data, selected }: NodeProps<CustomNodeData>) {
  const colors = nodeColors[data.type] ?? nodeColors.CONSTANT;
  const icon = nodeIcons[data.type] ?? '📦';
  const nodeData = data.data ?? {};
  const { loadGraph, graphs } = useGraphStore();
  const { navigateToSubgraph, setGraphName } = useNavigationStore();
  
  const handleDrillDown = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (data.type === 'SUBGRAPH' && data.subgraphId) {
      // Find the subgraph
      const subgraph = graphs.find(g => g.id === data.subgraphId);
      if (subgraph) {
        navigateToSubgraph(data.subgraphId, subgraph.name);
        setGraphName(data.subgraphId, subgraph.name);
        await loadGraph(data.subgraphId);
      }
    }
  };
  
  return (
    <div
      className={`
        min-w-[150px] rounded-lg shadow-md border-2
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
      `}
    >
      {/* Input Handles */}
      {data.inputPorts?.map((port, index) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{
            top: `${((index + 1) / (data.inputPorts.length + 1)) * 100}%`,
            background: '#64748b',
            width: 10,
            height: 10,
          }}
          title={port.name}
        />
      ))}
      
      {/* Default input handle if no ports defined */}
      {(!data.inputPorts || data.inputPorts.length === 0) && (
        <Handle
          type="target"
          position={Position.Left}
          id={`${data.id}-input`}
          style={{
            background: '#64748b',
            width: 10,
            height: 10,
          }}
        />
      )}
      
      {/* Header */}
      <div className={`px-3 py-2 border-b ${colors.border} bg-white bg-opacity-50 rounded-t-lg`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className={`font-semibold text-sm ${colors.text}`}>
            {data.name || data.label}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {data.type.toLowerCase().replace('_', ' ')}
        </div>
      </div>
      
      {/* Body - show key data fields */}
      <div className="px-3 py-2 text-xs space-y-1">
        {data.type === 'CONSTANT' && nodeData.value !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-500">Value:</span>
            <span className="font-mono">{String(nodeData.value)}</span>
          </div>
        )}
        
        {data.type === 'PARAMETER' && (
          <>
            {nodeData.min !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-500">Range:</span>
                <span className="font-mono">
                  [{String(nodeData.min)}, {String(nodeData.max)}]
                </span>
              </div>
            )}
          </>
        )}
        
        {data.type === 'DISTRIBUTION' && nodeData.distributionType ? (
          <div className="flex justify-between">
            <span className="text-gray-500">Type:</span>
            <span className="font-mono">{String(nodeData.distributionType)}</span>
          </div>
        ) : null}
        
        {data.type === 'TRANSFORMER' && nodeData.expression ? (
          <div className="text-gray-600 font-mono bg-gray-100 px-1 rounded text-center">
            {(() => {
              const expr = String(nodeData.expression);
              // For multi-line or long expressions, show indicator instead
              if (expr.includes('\n') || expr.length > 40) {
                return <span className="text-gray-500 italic text-xs">📝 Complex expression</span>;
              }
              // For short expressions, show truncated
              return <span className="truncate block">{expr.length > 30 ? expr.slice(0, 27) + '...' : expr}</span>;
            })()}
          </div>
        ) : null}
        
        {data.type === 'AGGREGATOR' && nodeData.aggregationType ? (
          <div className="flex justify-between">
            <span className="text-gray-500">Aggregation:</span>
            <span className="font-mono">{String(nodeData.aggregationType)}</span>
          </div>
        ) : null}
        
        {data.type === 'DECISION' && nodeData.condition ? (
          <div className="truncate text-gray-600 font-mono bg-gray-100 px-1 rounded">
            {String(nodeData.condition)}
          </div>
        ) : null}
        
        {data.type === 'CONSTRAINT' && nodeData.constraintExpression ? (
          <div className="truncate text-gray-600 font-mono bg-gray-100 px-1 rounded">
            {String(nodeData.constraintExpression)}
          </div>
        ) : null}
        
        {/* Subgraph drill-down button */}
        {data.type === 'SUBGRAPH' && data.subgraphId && (
          <button
            onClick={handleDrillDown}
            className="w-full mt-2 px-2 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600 transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Drill Down
          </button>
        )}
        
        {/* Show computed output if available */}
        {data.computedOutput !== undefined && (
          <div className="flex justify-between border-t pt-1 mt-1 border-gray-200">
            <span className="text-gray-500">Output:</span>
            <span className="font-mono font-semibold">
              {typeof data.computedOutput === 'number'
                ? data.computedOutput.toFixed(4)
                : String(data.computedOutput)}
            </span>
          </div>
        )}
      </div>
      
      {/* Output Handles */}
      {data.outputPorts?.map((port, index) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{
            top: `${((index + 1) / (data.outputPorts.length + 1)) * 100}%`,
            background: '#3b82f6',
            width: 10,
            height: 10,
          }}
          title={port.name}
        />
      ))}
      
      {/* Default output handle if no ports defined */}
      {(!data.outputPorts || data.outputPorts.length === 0) && (
        <Handle
          type="source"
          position={Position.Right}
          id={`${data.id}-output`}
          style={{
            background: '#3b82f6',
            width: 10,
            height: 10,
          }}
        />
      )}
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
