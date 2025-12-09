// Node Palette - Drag and drop node types including advanced computational primitives
import { useState } from 'react';
import type { NodeType } from '@scenarioforge/core';

interface NodeTypeInfo {
  type: NodeType;
  name: string;
  description: string;
  icon: string;
  category: 'input' | 'transform' | 'output' | 'control' | 'hierarchical' 
           | 'spatial' | 'temporal' | 'game_theory' | 'optimization' 
           | 'stochastic' | 'signal' | 'memory' | 'algebraic';
}

const nodeTypes: NodeTypeInfo[] = [
  // ============================================
  // BASIC NODE TYPES
  // ============================================
  
  // Input nodes
  {
    type: 'DATA_SOURCE',
    name: 'Data Source',
    description: 'External data input',
    icon: '📊',
    category: 'input',
  },
  {
    type: 'CONSTANT',
    name: 'Constant',
    description: 'Fixed value',
    icon: '🔢',
    category: 'input',
  },
  {
    type: 'PARAMETER',
    name: 'Parameter',
    description: 'Adjustable parameter with range',
    icon: '🎚️',
    category: 'input',
  },
  {
    type: 'DISTRIBUTION',
    name: 'Distribution',
    description: 'Random distribution sampler',
    icon: '📈',
    category: 'input',
  },
  
  // Transform nodes
  {
    type: 'TRANSFORMER',
    name: 'Transformer',
    description: 'Transform inputs with expression',
    icon: '⚙️',
    category: 'transform',
  },
  {
    type: 'AGGREGATOR',
    name: 'Aggregator',
    description: 'Combine multiple inputs',
    icon: '∑',
    category: 'transform',
  },
  {
    type: 'DECISION',
    name: 'Decision',
    description: 'Conditional branching',
    icon: '❓',
    category: 'control',
  },
  
  // Output nodes
  {
    type: 'OUTPUT',
    name: 'Output',
    description: 'Final output node',
    icon: '📤',
    category: 'output',
  },
  
  // Control nodes
  {
    type: 'CONSTRAINT',
    name: 'Constraint',
    description: 'Define optimization constraints',
    icon: '🚫',
    category: 'control',
  },
  
  // Hierarchical nodes
  {
    type: 'SUBGRAPH',
    name: 'Subgraph',
    description: 'Nested graph (drill down)',
    icon: '📦',
    category: 'hierarchical',
  },
  
  // ============================================
  // ADVANCED NODE TYPES - Spatial/Mesh
  // ============================================
  {
    type: 'MESH',
    name: 'Mesh',
    description: 'Computational domain geometry (FEM/CFD)',
    icon: '🕸️',
    category: 'spatial',
  },
  {
    type: 'ELEMENT',
    name: 'Element',
    description: 'Finite element formulation',
    icon: '🔷',
    category: 'spatial',
  },
  {
    type: 'BOUNDARY_CONDITION',
    name: 'Boundary Condition',
    description: 'Domain boundary constraints',
    icon: '🔲',
    category: 'spatial',
  },
  {
    type: 'FIELD',
    name: 'Field',
    description: 'Solution/coefficient field on mesh',
    icon: '🌊',
    category: 'spatial',
  },
  
  // ============================================
  // ADVANCED NODE TYPES - Temporal/Integration
  // ============================================
  {
    type: 'INTEGRATOR',
    name: 'Integrator',
    description: 'ODE/PDE time integration',
    icon: '∫',
    category: 'temporal',
  },
  {
    type: 'DELAY_LINE',
    name: 'Delay Line',
    description: 'Time delays in dynamic systems',
    icon: '⏱️',
    category: 'temporal',
  },
  {
    type: 'STATE_MACHINE',
    name: 'State Machine',
    description: 'Discrete state dynamics (FSM)',
    icon: '🔀',
    category: 'temporal',
  },
  {
    type: 'EVENT_QUEUE',
    name: 'Event Queue',
    description: 'Discrete event scheduling',
    icon: '📋',
    category: 'temporal',
  },
  
  // ============================================
  // ADVANCED NODE TYPES - Game Theory
  // ============================================
  {
    type: 'AGENT',
    name: 'Agent',
    description: 'Autonomous decision-making entity',
    icon: '🤖',
    category: 'game_theory',
  },
  {
    type: 'STRATEGY',
    name: 'Strategy',
    description: 'Game-theoretic strategy',
    icon: '🎯',
    category: 'game_theory',
  },
  {
    type: 'PAYOFF_MATRIX',
    name: 'Payoff Matrix',
    description: 'Game payoff definitions',
    icon: '🎲',
    category: 'game_theory',
  },
  {
    type: 'EQUILIBRIUM_FINDER',
    name: 'Equilibrium Finder',
    description: 'Nash/Correlated equilibrium solver',
    icon: '⚖️',
    category: 'game_theory',
  },
  {
    type: 'POPULATION',
    name: 'Population',
    description: 'Population dynamics for evolutionary games',
    icon: '👥',
    category: 'game_theory',
  },
  
  // ============================================
  // ADVANCED NODE TYPES - Optimization
  // ============================================
  {
    type: 'OBJECTIVE',
    name: 'Objective',
    description: 'Optimization objective function',
    icon: '🎯',
    category: 'optimization',
  },
  {
    type: 'SOLVER',
    name: 'Solver',
    description: 'Linear/nonlinear equation solver',
    icon: '🔧',
    category: 'optimization',
  },
  {
    type: 'OPTIMIZER',
    name: 'Optimizer',
    description: 'General optimization solver',
    icon: '📉',
    category: 'optimization',
  },
  
  // ============================================
  // ADVANCED NODE TYPES - Stochastic
  // ============================================
  {
    type: 'MARKOV_CHAIN',
    name: 'Markov Chain',
    description: 'Stochastic state transitions',
    icon: '🔗',
    category: 'stochastic',
  },
  {
    type: 'RANDOM_PROCESS',
    name: 'Random Process',
    description: 'Continuous stochastic processes',
    icon: '📊',
    category: 'stochastic',
  },
  {
    type: 'MONTE_CARLO_ESTIMATOR',
    name: 'MC Estimator',
    description: 'Monte Carlo statistical estimation',
    icon: '🎰',
    category: 'stochastic',
  },
  
  // ============================================
  // ADVANCED NODE TYPES - Signal Processing
  // ============================================
  {
    type: 'FILTER',
    name: 'Filter',
    description: 'Digital signal filtering',
    icon: '〰️',
    category: 'signal',
  },
  {
    type: 'CONVOLUTION',
    name: 'Convolution',
    description: 'Signal convolution',
    icon: '✳️',
    category: 'signal',
  },
  {
    type: 'FFT',
    name: 'FFT',
    description: 'Fourier transform operations',
    icon: '📶',
    category: 'signal',
  },
  
  // ============================================
  // ADVANCED NODE TYPES - Memory/State
  // ============================================
  {
    type: 'BUFFER',
    name: 'Buffer',
    description: 'Data buffering/queueing',
    icon: '📥',
    category: 'memory',
  },
  {
    type: 'ACCUMULATOR',
    name: 'Accumulator',
    description: 'Running aggregation',
    icon: '📈',
    category: 'memory',
  },
  {
    type: 'LOOKUP_TABLE',
    name: 'Lookup Table',
    description: 'Interpolated data lookup',
    icon: '📑',
    category: 'memory',
  },
  {
    type: 'HISTORY',
    name: 'History',
    description: 'Time series storage',
    icon: '📜',
    category: 'memory',
  },
  
  // ============================================
  // ADVANCED NODE TYPES - Control Systems
  // ============================================
  {
    type: 'PID_CONTROLLER',
    name: 'PID Controller',
    description: 'Proportional-integral-derivative control',
    icon: '🎛️',
    category: 'control',
  },
  {
    type: 'MPC_CONTROLLER',
    name: 'MPC Controller',
    description: 'Model predictive control',
    icon: '🔮',
    category: 'control',
  },
  {
    type: 'BANG_BANG',
    name: 'Bang-Bang',
    description: 'On/off control',
    icon: '🔛',
    category: 'control',
  },
  
  // ============================================
  // ADVANCED NODE TYPES - Algebraic
  // ============================================
  {
    type: 'MATRIX_OP',
    name: 'Matrix Op',
    description: 'Linear algebra operations',
    icon: '▦',
    category: 'algebraic',
  },
  {
    type: 'LINEAR_SYSTEM',
    name: 'Linear System',
    description: 'Ax = b solver',
    icon: '📐',
    category: 'algebraic',
  },
  {
    type: 'EIGENVALUE',
    name: 'Eigenvalue',
    description: 'Eigenvalue/eigenvector computation',
    icon: 'λ',
    category: 'algebraic',
  },
  {
    type: 'NONLINEAR_SYSTEM',
    name: 'Nonlinear System',
    description: 'F(x) = 0 solver',
    icon: '🔄',
    category: 'algebraic',
  },
];

const categories = [
  // Basic categories
  { id: 'input', name: 'Inputs', color: 'bg-green-100 text-green-800', section: 'basic' },
  { id: 'transform', name: 'Transform', color: 'bg-blue-100 text-blue-800', section: 'basic' },
  { id: 'output', name: 'Outputs', color: 'bg-red-100 text-red-800', section: 'basic' },
  { id: 'control', name: 'Control', color: 'bg-purple-100 text-purple-800', section: 'basic' },
  { id: 'hierarchical', name: 'Hierarchical', color: 'bg-indigo-100 text-indigo-800', section: 'basic' },
  
  // Advanced categories
  { id: 'spatial', name: '🕸️ Spatial/FEM', color: 'bg-cyan-100 text-cyan-800', section: 'advanced' },
  { id: 'temporal', name: '⏱️ Temporal', color: 'bg-amber-100 text-amber-800', section: 'advanced' },
  { id: 'game_theory', name: '🎲 Game Theory', color: 'bg-rose-100 text-rose-800', section: 'advanced' },
  { id: 'optimization', name: '📉 Optimization', color: 'bg-emerald-100 text-emerald-800', section: 'advanced' },
  { id: 'stochastic', name: '🎰 Stochastic', color: 'bg-violet-100 text-violet-800', section: 'advanced' },
  { id: 'signal', name: '📶 Signal', color: 'bg-sky-100 text-sky-800', section: 'advanced' },
  { id: 'memory', name: '📥 Memory', color: 'bg-lime-100 text-lime-800', section: 'advanced' },
  { id: 'algebraic', name: '▦ Algebraic', color: 'bg-fuchsia-100 text-fuchsia-800', section: 'advanced' },
];

function NodeTypeCard({ nodeType }: { nodeType: NodeTypeInfo }) {
  const onDragStart = (event: React.DragEvent) => {
    console.log('Drag started for:', nodeType.type);
    event.dataTransfer.setData('application/node-type', nodeType.type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 p-2 bg-gray-700 rounded border border-gray-600 
                 cursor-grab hover:border-blue-400 hover:bg-gray-600 transition-all
                 active:cursor-grabbing"
    >
      <span className="text-xl">{nodeType.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-100 truncate">
          {nodeType.name}
        </div>
        <div className="text-xs text-gray-400 truncate">
          {nodeType.description}
        </div>
      </div>
    </div>
  );
}

function CategorySection({ 
  category, 
  nodes, 
  defaultExpanded = true 
}: { 
  category: typeof categories[0]; 
  nodes: NodeTypeInfo[]; 
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  if (nodes.length === 0) return null;
  
  return (
    <div className="mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full text-left text-xs font-semibold px-2 py-1.5 rounded ${category.color} mb-2 flex items-center justify-between transition-all hover:opacity-90`}
      >
        <span>{category.name}</span>
        <span className="text-xs opacity-60">
          {isExpanded ? '▼' : '▶'} ({nodes.length})
        </span>
      </button>
      {isExpanded && (
        <div className="space-y-2 pl-1">
          {nodes.map((nodeType) => (
            <NodeTypeCard key={nodeType.type} nodeType={nodeType} />
          ))}
        </div>
      )}
    </div>
  );
}

export function NodePalette() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const basicCategories = categories.filter(c => c.section === 'basic');
  const advancedCategories = categories.filter(c => c.section === 'advanced');
  
  // Filter nodes by search term
  const filteredNodes = searchTerm.trim() 
    ? nodeTypes.filter(n => 
        n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : nodeTypes;

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Node Palette
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        Drag nodes onto the canvas
      </p>
      
      {/* Search box */}
      <input
        type="text"
        placeholder="🔍 Search nodes..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 mb-4 text-sm bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      
      {/* If searching, show flat filtered list */}
      {searchTerm.trim() ? (
        <div className="space-y-2">
          {filteredNodes.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No nodes found</p>
          ) : (
            filteredNodes.map((nodeType) => (
              <NodeTypeCard key={nodeType.type} nodeType={nodeType} />
            ))
          )}
        </div>
      ) : (
        <>
          {/* Basic node types */}
          <div className="mb-4">
            {basicCategories.map((category) => {
              const categoryNodes = nodeTypes.filter((n) => n.category === category.id);
              return (
                <CategorySection 
                  key={category.id} 
                  category={category} 
                  nodes={categoryNodes}
                  defaultExpanded={true}
                />
              );
            })}
          </div>
          
          {/* Advanced section toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full mb-3 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-md hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2"
          >
            <span>{showAdvanced ? '▼' : '▶'}</span>
            <span>Advanced Nodes</span>
            <span className="text-xs opacity-70">({nodeTypes.filter(n => advancedCategories.some(c => c.id === n.category)).length} types)</span>
          </button>
          
          {/* Advanced node types */}
          {showAdvanced && (
            <div className="border-l-2 border-purple-500 pl-2">
              {advancedCategories.map((category) => {
                const categoryNodes = nodeTypes.filter((n) => n.category === category.id);
                return (
                  <CategorySection 
                    key={category.id} 
                    category={category} 
                    nodes={categoryNodes}
                    defaultExpanded={false}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
