// Hierarchy Panel - Visualize and navigate graph hierarchy (subgraphs)
import { useState } from 'react';
import { useGraphStore } from '../../stores/graphStore';

interface BreadcrumbItem {
  id: string;
  name: string;
  depth: number;
}

export function HierarchyPanel() {
  const { currentGraph } = useGraphStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Current navigation path (would be managed by a navigation store in full implementation)
  const [currentPath, setCurrentPath] = useState<BreadcrumbItem[]>([
    { id: 'root', name: currentGraph?.name ?? 'Root Graph', depth: 0 }
  ]);
  
  // Find all SUBGRAPH nodes in current graph
  const subgraphNodes = currentGraph?.nodes?.filter(n => n.type === 'SUBGRAPH') ?? [];
  
  // Group nodes by their conceptual "cluster" (based on position proximity or tags)
  const nodeClusters = groupNodesByClusters(currentGraph?.nodes ?? []);
  
  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };
  
  const navigateToLevel = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>📊</span>
          Graph Hierarchy
        </h2>
        <span className="text-xs px-2 py-1 bg-indigo-600 text-white rounded">NEW</span>
      </div>
      
      <p className="text-xs text-gray-400">
        Navigate through nested subgraphs and visualize the model structure.
      </p>
      
      {/* Breadcrumb Navigation */}
      <div className="bg-gray-700 rounded-lg p-2">
        <div className="text-xs text-gray-400 mb-1">Current Path</div>
        <div className="flex items-center gap-1 flex-wrap">
          {currentPath.map((item, index) => (
            <div key={item.id} className="flex items-center">
              {index > 0 && <span className="text-gray-500 mx-1">›</span>}
              <button
                onClick={() => navigateToLevel(index)}
                className={`px-2 py-1 rounded text-xs ${
                  index === currentPath.length - 1
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {item.name}
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Hierarchy Tree */}
      <div className="bg-gray-700/50 rounded-lg p-3">
        <h3 className="text-sm font-medium text-gray-200 mb-2 flex items-center gap-2">
          <span>🌳</span>
          Structure
        </h3>
        
        {/* Root level */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 p-2 bg-gray-600 rounded">
            <span className="text-indigo-400">📂</span>
            <span className="text-sm text-white flex-1">{currentGraph?.name ?? 'Untitled'}</span>
            <span className="text-xs text-gray-400">
              {currentGraph?.nodes?.length ?? 0} nodes
            </span>
          </div>
          
          {/* Subgraph nodes */}
          {subgraphNodes.length > 0 && (
            <div className="ml-4 border-l-2 border-gray-600 pl-2 space-y-1">
              {subgraphNodes.map(node => (
                <SubgraphTreeItem 
                  key={node.id} 
                  node={node}
                  expanded={expandedNodes.has(node.id)}
                  onToggle={() => toggleExpanded(node.id)}
                />
              ))}
            </div>
          )}
          
          {/* Node clusters (conceptual groupings) */}
          {Object.keys(nodeClusters).length > 1 && (
            <div className="mt-3">
              <div className="text-xs text-gray-400 mb-2">Detected Clusters</div>
              <div className="ml-4 space-y-1">
                {Object.entries(nodeClusters).map(([cluster, nodes]) => (
                  <div key={cluster} className="flex items-center gap-2 p-1.5 bg-gray-700 rounded text-xs">
                    <span className="text-yellow-400">📦</span>
                    <span className="text-gray-300 flex-1">{cluster}</span>
                    <span className="text-gray-500">{nodes.length} nodes</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Quick Actions */}
      <QuickActionsSection />
      
      {/* Hierarchy Info */}
      <HierarchyInfoSection />
      
      {/* Metadata display */}
      {currentGraph?.metadata?.hierarchical ? (
        <div className="border-t border-gray-600 pt-4">
          <h3 className="text-sm font-medium text-gray-200 mb-2">Graph Metadata</h3>
          <pre className="text-xs bg-gray-700 p-2 rounded overflow-x-auto text-gray-300">
            {JSON.stringify(currentGraph.metadata.hierarchical, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function QuickActionsSection() {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-200">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        <button className="p-2 bg-gray-700 rounded text-xs text-gray-300 hover:bg-gray-600 flex items-center gap-2">
          <span>📦</span>
          <span>Create Subgraph</span>
        </button>
        <button className="p-2 bg-gray-700 rounded text-xs text-gray-300 hover:bg-gray-600 flex items-center gap-2">
          <span>📤</span>
          <span>Extract Selection</span>
        </button>
        <button className="p-2 bg-gray-700 rounded text-xs text-gray-300 hover:bg-gray-600 flex items-center gap-2">
          <span>🔍</span>
          <span>Expand All</span>
        </button>
        <button className="p-2 bg-gray-700 rounded text-xs text-gray-300 hover:bg-gray-600 flex items-center gap-2">
          <span>📁</span>
          <span>Collapse All</span>
        </button>
      </div>
    </div>
  );
}

function HierarchyInfoSection() {
  return (
    <div className="border-t border-gray-600 pt-4">
      <h3 className="text-sm font-medium text-gray-200 mb-2">Hierarchy Features</h3>
      <div className="text-xs text-gray-400 space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-indigo-400">📦</span>
          <div>
            <strong className="text-gray-300">Subgraph Nodes</strong>
            <p>Encapsulate complex logic into reusable components</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-green-400">🔗</span>
          <div>
            <strong className="text-gray-300">Exposed Ports</strong>
            <p>Define inputs/outputs visible at parent level</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-purple-400">🔍</span>
          <div>
            <strong className="text-gray-300">Drill-Down</strong>
            <p>Double-click subgraph to navigate inside</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-orange-400">⬆️</span>
          <div>
            <strong className="text-gray-300">Context Inheritance</strong>
            <p>Access $parent and $root from nested graphs</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tree item for subgraph node
function SubgraphTreeItem({ 
  node, 
  expanded, 
  onToggle 
}: { 
  node: any; 
  expanded: boolean; 
  onToggle: () => void;
}) {
  const nodeData = node.data ?? {};
  
  return (
    <div>
      <div 
        className="flex items-center gap-2 p-1.5 bg-gray-600 rounded hover:bg-gray-500 cursor-pointer"
        onClick={onToggle}
      >
        <span className="text-xs text-gray-400">{expanded ? '▼' : '▶'}</span>
        <span className="text-indigo-400">📦</span>
        <span className="text-sm text-white flex-1">{node.name}</span>
        {nodeData.nodeCount && (
          <span className="text-xs text-gray-400">{nodeData.nodeCount} nodes</span>
        )}
      </div>
      
      {expanded && (
        <div className="ml-4 mt-1 p-2 bg-gray-700/50 rounded text-xs text-gray-400 space-y-1">
          {nodeData.subgraphId && (
            <div>Graph ID: <span className="text-gray-300 font-mono">{nodeData.subgraphId}</span></div>
          )}
          {nodeData.description && (
            <div className="text-gray-300">{nodeData.description}</div>
          )}
          <button className="mt-2 px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700">
            🔍 Open Subgraph
          </button>
        </div>
      )}
    </div>
  );
}

// Group nodes by conceptual clusters based on position or tags
function groupNodesByClusters(nodes: any[]): Record<string, any[]> {
  if (nodes.length === 0) return {};
  
  // Simple clustering by node type prefix or tags
  const clusters: Record<string, any[]> = {};
  
  for (const node of nodes) {
    // Check for explicit cluster tag
    const clusterTag = node.tags?.find((t: string) => t.startsWith('cluster:'));
    let clusterName: string;
    
    if (clusterTag) {
      clusterName = clusterTag.replace('cluster:', '');
    } else {
      // Group by type
      clusterName = node.type;
    }
    
    if (!clusters[clusterName]) {
      clusters[clusterName] = [];
    }
    clusters[clusterName].push(node);
  }
  
  // Only return if we have meaningful clusters (not just one cluster with all nodes)
  if (Object.keys(clusters).length <= 1) {
    return {};
  }
  
  return clusters;
}
