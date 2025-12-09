// Custom Node component for React Flow
import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useNavigationStore } from '../../stores/navigationStore';
import type { NodeDefinition } from '@scenarioforge/core';

// Node type colors - includes both base and advanced types
const nodeColors: Record<string, { bg: string; border: string; text: string }> = {
  // Base types
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
  
  // Advanced: Spatial/FEM
  MESH: { bg: 'bg-cyan-50', border: 'border-cyan-600', text: 'text-cyan-800' },
  ELEMENT: { bg: 'bg-cyan-50', border: 'border-cyan-500', text: 'text-cyan-800' },
  BOUNDARY_CONDITION: { bg: 'bg-cyan-50', border: 'border-cyan-500', text: 'text-cyan-800' },
  FIELD: { bg: 'bg-cyan-50', border: 'border-cyan-500', text: 'text-cyan-800' },
  
  // Advanced: Temporal
  INTEGRATOR: { bg: 'bg-amber-50', border: 'border-amber-600', text: 'text-amber-800' },
  DELAY_LINE: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-800' },
  STATE_MACHINE: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-800' },
  EVENT_QUEUE: { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-800' },
  
  // Advanced: Game Theory
  AGENT: { bg: 'bg-rose-50', border: 'border-rose-600', text: 'text-rose-800' },
  STRATEGY: { bg: 'bg-rose-50', border: 'border-rose-500', text: 'text-rose-800' },
  PAYOFF_MATRIX: { bg: 'bg-rose-50', border: 'border-rose-500', text: 'text-rose-800' },
  EQUILIBRIUM_FINDER: { bg: 'bg-rose-50', border: 'border-rose-500', text: 'text-rose-800' },
  POPULATION: { bg: 'bg-rose-50', border: 'border-rose-500', text: 'text-rose-800' },
  
  // Advanced: Optimization
  OBJECTIVE: { bg: 'bg-emerald-50', border: 'border-emerald-600', text: 'text-emerald-800' },
  SOLVER: { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-800' },
  OPTIMIZER: { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-800' },
  
  // Advanced: Stochastic
  MARKOV_CHAIN: { bg: 'bg-violet-50', border: 'border-violet-600', text: 'text-violet-800' },
  RANDOM_PROCESS: { bg: 'bg-violet-50', border: 'border-violet-500', text: 'text-violet-800' },
  MONTE_CARLO_ESTIMATOR: { bg: 'bg-violet-50', border: 'border-violet-500', text: 'text-violet-800' },
  
  // Advanced: Signal Processing
  FILTER: { bg: 'bg-sky-50', border: 'border-sky-600', text: 'text-sky-800' },
  CONVOLUTION: { bg: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-800' },
  FFT: { bg: 'bg-sky-50', border: 'border-sky-500', text: 'text-sky-800' },
  
  // Advanced: Memory/State
  BUFFER: { bg: 'bg-lime-50', border: 'border-lime-600', text: 'text-lime-800' },
  ACCUMULATOR: { bg: 'bg-lime-50', border: 'border-lime-500', text: 'text-lime-800' },
  LOOKUP_TABLE: { bg: 'bg-lime-50', border: 'border-lime-500', text: 'text-lime-800' },
  HISTORY: { bg: 'bg-lime-50', border: 'border-lime-500', text: 'text-lime-800' },
  
  // Advanced: Control
  PID_CONTROLLER: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-600', text: 'text-fuchsia-800' },
  MPC_CONTROLLER: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-500', text: 'text-fuchsia-800' },
  BANG_BANG: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-500', text: 'text-fuchsia-800' },
  
  // Advanced: Algebraic
  MATRIX_OP: { bg: 'bg-slate-100', border: 'border-slate-600', text: 'text-slate-800' },
  LINEAR_SYSTEM: { bg: 'bg-slate-100', border: 'border-slate-500', text: 'text-slate-800' },
  EIGENVALUE: { bg: 'bg-slate-100', border: 'border-slate-500', text: 'text-slate-800' },
  NONLINEAR_SYSTEM: { bg: 'bg-slate-100', border: 'border-slate-500', text: 'text-slate-800' },
};

// Node type icons - includes both base and advanced types
const nodeIcons: Record<string, string> = {
  // Base types
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
  
  // Advanced: Spatial/FEM
  MESH: '🕸️',
  ELEMENT: '🔷',
  BOUNDARY_CONDITION: '🔲',
  FIELD: '🌊',
  
  // Advanced: Temporal
  INTEGRATOR: '∫',
  DELAY_LINE: '⏱️',
  STATE_MACHINE: '🔀',
  EVENT_QUEUE: '📋',
  
  // Advanced: Game Theory
  AGENT: '🤖',
  STRATEGY: '🎯',
  PAYOFF_MATRIX: '🎲',
  EQUILIBRIUM_FINDER: '⚖️',
  POPULATION: '👥',
  
  // Advanced: Optimization
  OBJECTIVE: '🎯',
  SOLVER: '🔧',
  OPTIMIZER: '📉',
  
  // Advanced: Stochastic
  MARKOV_CHAIN: '🔗',
  RANDOM_PROCESS: '📊',
  MONTE_CARLO_ESTIMATOR: '🎰',
  
  // Advanced: Signal
  FILTER: '〰️',
  CONVOLUTION: '✳️',
  FFT: '📶',
  
  // Advanced: Memory
  BUFFER: '📥',
  ACCUMULATOR: '📈',
  LOOKUP_TABLE: '📑',
  HISTORY: '📜',
  
  // Advanced: Control
  PID_CONTROLLER: '🎛️',
  MPC_CONTROLLER: '🔮',
  BANG_BANG: '🔛',
  
  // Advanced: Algebraic
  MATRIX_OP: '▦',
  LINEAR_SYSTEM: '📐',
  EIGENVALUE: 'λ',
  NONLINEAR_SYSTEM: '🔄',
};

// Default colors for unknown types
const defaultColors = { bg: 'bg-gray-50', border: 'border-gray-500', text: 'text-gray-800' };

interface CustomNodeData extends NodeDefinition {
  label: string;
  computedOutput?: number | string;
}

function CustomNodeComponent({ data, selected }: NodeProps<CustomNodeData>) {
  const colors = nodeColors[data.type] ?? defaultColors;
  const icon = nodeIcons[data.type] ?? '📦';
  const nodeData = data.data ?? {};
  
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
        
        {/* SUBGRAPH node special rendering */}
        {data.type === 'SUBGRAPH' && (
          <SubgraphDetails nodeData={nodeData} nodeId={data.id} />
        )}
        
        {/* === ADVANCED NODE PREVIEWS === */}
        
        {/* Temporal Nodes */}
        {data.type === 'INTEGRATOR' && nodeData.method ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Method:</span>
            <span className="font-mono">{String(nodeData.method)}</span>
          </div>
        ) : null}
        {data.type === 'DIFFERENTIATOR' && nodeData.method ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Method:</span>
            <span className="font-mono">{String(nodeData.method)}</span>
          </div>
        ) : null}
        {data.type === 'DELAY' && nodeData.delaySteps !== undefined ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Delay:</span>
            <span className="font-mono">{String(nodeData.delaySteps)} steps</span>
          </div>
        ) : null}
        {data.type === 'STATE_MACHINE' && nodeData.currentState ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">State:</span>
            <span className="font-mono bg-purple-100 px-1 rounded">{String(nodeData.currentState)}</span>
          </div>
        ) : null}
        
        {/* Game Theory Nodes */}
        {data.type === 'AGENT' && nodeData.strategy ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Strategy:</span>
            <span className="font-mono">{String(nodeData.strategy)}</span>
          </div>
        ) : null}
        {data.type === 'NASH_EQUILIBRIUM' ? (
          <div className="text-xs text-center text-gray-500 italic">Nash solver</div>
        ) : null}
        {data.type === 'AUCTION' && nodeData.auctionType ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Type:</span>
            <span className="font-mono">{String(nodeData.auctionType)}</span>
          </div>
        ) : null}
        
        {/* Control Nodes */}
        {data.type === 'PID_CONTROLLER' ? (
          <div className="text-xs font-mono text-center bg-gray-100 rounded px-1">
            P:{String(nodeData.kp ?? '?')} I:{String(nodeData.ki ?? '?')} D:{String(nodeData.kd ?? '?')}
          </div>
        ) : null}
        {data.type === 'MPC_CONTROLLER' && nodeData.horizon !== undefined ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Horizon:</span>
            <span className="font-mono">{String(nodeData.horizon)}</span>
          </div>
        ) : null}
        
        {/* Stochastic Nodes */}
        {data.type === 'MARKOV_CHAIN' && nodeData.states ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">States:</span>
            <span className="font-mono">{Array.isArray(nodeData.states) ? nodeData.states.length : '?'}</span>
          </div>
        ) : null}
        {data.type === 'MONTE_CARLO' && nodeData.iterations !== undefined ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Iterations:</span>
            <span className="font-mono">{String(nodeData.iterations)}</span>
          </div>
        ) : null}
        {data.type === 'BAYESIAN' && nodeData.priorType ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Prior:</span>
            <span className="font-mono">{String(nodeData.priorType)}</span>
          </div>
        ) : null}
        
        {/* Signal Processing Nodes */}
        {data.type === 'FILTER' && nodeData.filterType ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Filter:</span>
            <span className="font-mono">{String(nodeData.filterType)}</span>
          </div>
        ) : null}
        {data.type === 'FFT' ? (
          <div className="text-xs text-center text-gray-500 italic">Frequency transform</div>
        ) : null}
        {data.type === 'CONVOLUTION' ? (
          <div className="text-xs text-center text-gray-500 italic">Signal convolution</div>
        ) : null}
        
        {/* Optimization Nodes */}
        {data.type === 'OPTIMIZER' && nodeData.algorithm ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Algo:</span>
            <span className="font-mono">{String(nodeData.algorithm)}</span>
          </div>
        ) : null}
        {data.type === 'SOLVER' && nodeData.solverType ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Type:</span>
            <span className="font-mono">{String(nodeData.solverType)}</span>
          </div>
        ) : null}
        
        {/* Memory Nodes */}
        {data.type === 'BUFFER' && nodeData.capacity !== undefined ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Capacity:</span>
            <span className="font-mono">{String(nodeData.capacity)}</span>
          </div>
        ) : null}
        {data.type === 'LOOKUP_TABLE' && nodeData.interpolation ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Interp:</span>
            <span className="font-mono">{String(nodeData.interpolation)}</span>
          </div>
        ) : null}
        {data.type === 'CACHE' && nodeData.evictionPolicy ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Policy:</span>
            <span className="font-mono">{String(nodeData.evictionPolicy)}</span>
          </div>
        ) : null}
        
        {/* Spatial Nodes */}
        {data.type === 'MESH' && nodeData.meshType ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Mesh:</span>
            <span className="font-mono">{String(nodeData.meshType)}</span>
          </div>
        ) : null}
        {data.type === 'SPATIAL_FIELD' && nodeData.fieldType ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Field:</span>
            <span className="font-mono">{String(nodeData.fieldType)}</span>
          </div>
        ) : null}
        {data.type === 'BOUNDARY' && nodeData.boundaryType ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">BC:</span>
            <span className="font-mono">{String(nodeData.boundaryType)}</span>
          </div>
        ) : null}
        
        {/* Algebraic Nodes */}
        {data.type === 'MATRIX_OP' && nodeData.operation ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Op:</span>
            <span className="font-mono">{String(nodeData.operation)}</span>
          </div>
        ) : null}
        {data.type === 'TENSOR_OP' && nodeData.operation ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Op:</span>
            <span className="font-mono">{String(nodeData.operation)}</span>
          </div>
        ) : null}
        {data.type === 'EIGEN' ? (
          <div className="text-xs text-center text-gray-500 italic">Eigenvalue analysis</div>
        ) : null}
        
        {/* Iterative Nodes */}
        {data.type === 'ITERATOR' && nodeData.maxIterations !== undefined ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Max iter:</span>
            <span className="font-mono">{String(nodeData.maxIterations)}</span>
          </div>
        ) : null}
        {data.type === 'CONVERGENCE_CHECK' && nodeData.tolerance !== undefined ? (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Tol:</span>
            <span className="font-mono">{String(nodeData.tolerance)}</span>
          </div>
        ) : null}
        
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

// Subgraph details component for SUBGRAPH node type
function SubgraphDetails({ nodeData, nodeId }: { nodeData: Record<string, unknown>; nodeId: string }) {
  const { drillDown, getSubgraph } = useNavigationStore();
  const subgraphId = nodeData.subgraphId as string | undefined;
  const hasSubgraph = subgraphId ? !!getSubgraph(subgraphId) : false;
  
  const handleDrillDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (subgraphId) {
      const subgraph = getSubgraph(subgraphId);
      if (subgraph) {
        drillDown(subgraphId, nodeId);
      } else {
        alert(`⚠️ Subgraph "${subgraphId}" not registered.\n\nLoad a demo sample with nested graphs to see this feature in action.`);
      }
    } else {
      alert('⚠️ No subgraphId configured for this node.');
    }
  };
  
  return (
    <div className="space-y-1">
      {subgraphId ? (
        <div className="flex justify-between">
          <span className="text-gray-500">Graph:</span>
          <span className="font-mono text-xs truncate max-w-[80px]">{subgraphId}</span>
        </div>
      ) : null}
      {nodeData.nodeCount !== undefined ? (
        <div className="flex justify-between">
          <span className="text-gray-500">Nodes:</span>
          <span className="font-mono">{String(nodeData.nodeCount)}</span>
        </div>
      ) : null}
      <button 
        className={`w-full mt-1 px-2 py-1 text-white text-xs rounded transition-colors flex items-center justify-center gap-1 ${
          hasSubgraph 
            ? 'bg-indigo-500 hover:bg-indigo-600' 
            : 'bg-gray-400 cursor-not-allowed'
        }`}
        onClick={handleDrillDown}
        title={hasSubgraph ? 'Click to view inside this subgraph' : 'No nested graph registered'}
      >
        <span>🔍</span>
        <span>{hasSubgraph ? 'Drill Down' : 'No Graph'}</span>
      </button>
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
