// Node Palette - Drag and drop node types
import type { NodeType } from '@scenarioforge/core';

interface NodeTypeInfo {
  type: NodeType;
  name: string;
  description: string;
  icon: string;
  category: 'input' | 'transform' | 'output' | 'control';
}

const nodeTypes: NodeTypeInfo[] = [
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
];

const categories = [
  { id: 'input', name: 'Inputs', color: 'bg-green-100 text-green-800' },
  { id: 'transform', name: 'Transform', color: 'bg-blue-100 text-blue-800' },
  { id: 'output', name: 'Outputs', color: 'bg-red-100 text-red-800' },
  { id: 'control', name: 'Control', color: 'bg-purple-100 text-purple-800' },
];

function NodeTypeCard({ nodeType }: { nodeType: NodeTypeInfo }) {
  const onDragStart = (event: React.DragEvent) => {
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

export function NodePalette() {
  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Node Palette
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Drag nodes onto the canvas to add them
      </p>
      
      {categories.map((category) => {
        const categoryNodes = nodeTypes.filter((n) => n.category === category.id);
        
        if (categoryNodes.length === 0) return null;
        
        return (
          <div key={category.id} className="mb-4">
            <div className={`text-xs font-semibold px-2 py-1 rounded ${category.color} mb-2`}>
              {category.name}
            </div>
            <div className="space-y-2">
              {categoryNodes.map((nodeType) => (
                <NodeTypeCard key={nodeType.type} nodeType={nodeType} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
