// Graph Canvas - Main React Flow canvas
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
import { CustomNode } from '../nodes/CustomNode';
import type { NodeDefinition, EdgeDefinition, NodeType } from '@scenarioforge/core';

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
  
  const { screenToFlowPosition } = useReactFlow();

  // Convert graph data to React Flow format
  const initialNodes = useMemo(
    () => (currentGraph?.nodes ?? []).map(toFlowNode),
    [currentGraph?.id] // Only recalculate when graph changes
  );
  
  const initialEdges = useMemo(
    () => (currentGraph?.edges ?? []).map(toFlowEdge),
    [currentGraph?.id]
  );

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  // Sync with store when graph changes
  useEffect(() => {
    if (currentGraph) {
      setNodes(currentGraph.nodes.map(toFlowNode));
      setEdges(currentGraph.edges.map(toFlowEdge));
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [currentGraph, setNodes, setEdges]);

  // Handle node changes (position, selection)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      
      // Update positions in store
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && c.position
      );
      
      if (positionChanges.length > 0 && currentGraph) {
        for (const change of positionChanges) {
          if (change.type === 'position' && change.position) {
            updateNode(change.id, { position: change.position });
          }
        }
      }
    },
    [setNodes, currentGraph, updateNode]
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
      className="h-full w-full"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
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
  );
}
