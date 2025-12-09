// Graph Canvas - Main React Flow canvas with hierarchical navigation
import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  OnConnect,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from 'reactflow';
import { useGraphStore } from '../../stores/graphStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { CustomNode } from '../nodes/CustomNode';
import { createNestedGraphsForDemo } from '../../data/nestedGraphRegistry';
import type { NodeDefinition, EdgeDefinition, NodeType, Graph } from '@scenarioforge/core';

// Custom node types
const nodeTypes = {
  custom: CustomNode,
};

// Convert our node format to React Flow format
function toFlowNode(node: NodeDefinition): Node {
  return {
    id: node.id,
    type: 'custom',
    position: node.position,
    data: {
      ...node,
      label: node.name,
    },
  };
}

// Convert our edge format to React Flow format
function toFlowEdge(edge: EdgeDefinition): Edge {
  return {
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    sourceHandle: edge.sourcePortId,
    targetHandle: edge.targetPortId,
    animated: edge.animated,
    label: edge.label,
    style: {
      strokeWidth: edge.style?.strokeWidth ?? 2,
      stroke: edge.style?.strokeColor ?? '#64748b',
    },
  };
}

export function GraphCanvas() {
  const {
    currentGraph,
    selectNode,
    selectEdge,
    addNode,
    addEdge: addGraphEdge,
    updateNode,
  } = useGraphStore();
  
  const {
    navigationStack,
    getCurrentGraph,
    isAtRoot,
    navigateUp,
    navigateToLevel,
    resetNavigation,
    registerSubgraph,
  } = useNavigationStore();
  
  const { screenToFlowPosition } = useReactFlow();
  
  // Determine which graph to display - subgraph if navigated, else root
  const subgraph = getCurrentGraph();
  const displayGraph: Graph | null = subgraph ?? currentGraph;
  
  // Reset navigation and register nested graphs when root graph changes
  useEffect(() => {
    if (currentGraph) {
      resetNavigation(currentGraph);
      
      // Auto-register any nested subgraphs from metadata
      let nestedGraphs = (currentGraph.metadata?.nestedGraphs as Record<string, Graph>) ?? {};
      
      // If no nested graphs in metadata, check if this is a known demo sample
      // and generate them dynamically (handles localStorage persistence case)
      if (Object.keys(nestedGraphs).length === 0) {
        nestedGraphs = createNestedGraphsForDemo(currentGraph.name);
      }
      
      for (const [subgraphId, subgraphData] of Object.entries(nestedGraphs)) {
        console.log('Auto-registering subgraph:', subgraphId);
        registerSubgraph(subgraphId, subgraphData);
      }
    }
  }, [currentGraph?.id, currentGraph?.name, resetNavigation, registerSubgraph]);

  // Convert graph data to React Flow format
  const initialNodes = useMemo(
    () => (displayGraph?.nodes ?? []).map(toFlowNode),
    [displayGraph?.id] // Only recalculate when graph changes
  );
  
  const initialEdges = useMemo(
    () => (displayGraph?.edges ?? []).map(toFlowEdge),
    [displayGraph?.id]
  );

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  // Sync with store when graph changes
  useEffect(() => {
    if (displayGraph) {
      setNodes(displayGraph.nodes.map(toFlowNode));
      setEdges(displayGraph.edges.map(toFlowEdge));
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [displayGraph, setNodes, setEdges]);

  // Handle node changes (position, selection)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      
      // Update positions in store (only for root graph)
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && c.position
      );
      
      if (positionChanges.length > 0 && currentGraph && isAtRoot()) {
        for (const change of positionChanges) {
          if (change.type === 'position' && change.position) {
            updateNode(change.id, { position: change.position });
          }
        }
      }
    },
    [setNodes, currentGraph, updateNode, isAtRoot]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    async (connection: Connection) => {
      if (!currentGraph || !connection.source || !connection.target) return;
      
      // Find source and target nodes
      const sourceNode = currentGraph.nodes.find((n) => n.id === connection.source);
      const targetNode = currentGraph.nodes.find((n) => n.id === connection.target);
      
      if (!sourceNode || !targetNode) return;
      
      // Find or create ports
      let sourcePortId = connection.sourceHandle;
      let targetPortId = connection.targetHandle;
      
      // If no handles specified, use first available ports
      if (!sourcePortId && sourceNode.outputPorts.length > 0) {
        sourcePortId = sourceNode.outputPorts[0].id;
      }
      if (!targetPortId && targetNode.inputPorts.length > 0) {
        targetPortId = targetNode.inputPorts[0].id;
      }
      
      // Create ports if they don't exist
      if (!sourcePortId) {
        sourcePortId = `${sourceNode.id}-output`;
      }
      if (!targetPortId) {
        targetPortId = `${targetNode.id}-input`;
      }
      
      try {
        await addGraphEdge({
          sourceNodeId: connection.source,
          sourcePortId,
          targetNodeId: connection.target,
          targetPortId,
        });
      } catch (error) {
        console.error('Failed to create edge:', error);
      }
    },
    [currentGraph, addGraphEdge]
  );

  // Handle node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle edge click
  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  // Handle drop from palette
  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      
      if (!currentGraph) {
        console.log('No current graph for drop');
        return;
      }
      
      const type = event.dataTransfer.getData('application/node-type') as NodeType;
      console.log('Dropped node type:', type);
      if (!type) {
        console.log('No node type in drag data');
        return;
      }
      
      // Convert screen coordinates to flow coordinates
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      try {
        await addNode({
          type,
          name: `New ${type.toLowerCase().replace('_', ' ')}`,
          position,
          inputPorts: [{ name: 'input', dataType: 'any' }],
          outputPorts: [{ name: 'output', dataType: 'any' }],
        });
      } catch (error) {
        console.error('Failed to add node:', error);
      }
    },
    [currentGraph, addNode, screenToFlowPosition]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  if (!currentGraph) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">No graph selected</p>
          <p className="text-sm mt-2">Create or select a graph to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full w-full flex flex-col"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {/* Breadcrumb Navigation Bar - shows when inside a subgraph */}
      {!isAtRoot() && (
        <div className="bg-indigo-900 border-b border-indigo-700 px-4 py-2 flex items-center gap-2">
          <button
            onClick={navigateUp}
            className="px-2 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-sm flex items-center gap-1"
          >
            <span>⬆️</span>
            <span>Back to Parent</span>
          </button>
          
          <div className="flex items-center gap-1 ml-4">
            {navigationStack.map((level, index) => (
              <div key={level.graphId} className="flex items-center">
                {index > 0 && <span className="text-indigo-400 mx-1">›</span>}
                <button
                  onClick={() => navigateToLevel(index)}
                  className={`px-2 py-1 rounded text-sm ${
                    index === navigationStack.length - 1
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'text-indigo-300 hover:text-white hover:bg-indigo-700'
                  }`}
                >
                  {index === 0 ? '🏠' : '📦'} {level.graphName}
                </button>
              </div>
            ))}
          </div>
          
          <div className="ml-auto text-xs text-indigo-300">
            Depth: {navigationStack.length - 1} | Viewing subgraph
          </div>
        </div>
      )}
      
      <div className="flex-1">
        <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background color="#374151" gap={15} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const colors: Record<string, string> = {
              DATA_SOURCE: '#16a34a',
              TRANSFORMER: '#2563eb',
              DISTRIBUTION: '#9333ea',
              AGGREGATOR: '#ea580c',
              OUTPUT: '#dc2626',
              PARAMETER: '#ca8a04',
              DECISION: '#db2777',
              CONSTANT: '#6b7280',
              CONSTRAINT: '#0d9488',
              SUBGRAPH: '#6366f1',
            };
            return colors[node.data?.type] ?? '#6b7280';
          }}
        />
      </ReactFlow>
      </div>
    </div>
  );
}
