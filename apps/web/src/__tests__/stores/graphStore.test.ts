/**
 * ScenarioForge - Graph Store Unit Tests
 * 
 * Tests for the Zustand graph store that manages:
 * - Graph CRUD operations
 * - Node operations
 * - Edge operations
 * - Selection state
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useGraphStore } from '../../stores/graphStore';

describe('Graph Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useGraphStore.setState({
        currentGraph: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        graphs: [],
        isLoading: false,
        error: null,
      });
    });
  });

  afterEach(() => {
    // Clean up localStorage
    localStorage.clear();
  });

  // ============================================
  // Graph CRUD Operations
  // ============================================
  describe('Graph Operations', () => {
    it('should create a new graph', async () => {
      const { createGraph } = useGraphStore.getState();
      
      const graph = await createGraph('Test Graph', 'A test description');
      
      expect(graph).toBeDefined();
      expect(graph.name).toBe('Test Graph');
      expect(graph.description).toBe('A test description');
      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
      
      // Check state was updated
      const state = useGraphStore.getState();
      expect(state.graphs).toHaveLength(1);
      expect(state.currentGraph?.id).toBe(graph.id);
    });

    it('should create multiple graphs', async () => {
      const { createGraph } = useGraphStore.getState();
      
      await createGraph('Graph 1');
      await createGraph('Graph 2');
      await createGraph('Graph 3');
      
      const { graphs } = useGraphStore.getState();
      expect(graphs).toHaveLength(3);
    });

    it('should load an existing graph', async () => {
      const { createGraph, loadGraph } = useGraphStore.getState();
      
      const graph1 = await createGraph('Graph 1');
      const graph2 = await createGraph('Graph 2');
      
      // Current should be graph2 (most recent)
      expect(useGraphStore.getState().currentGraph?.id).toBe(graph2.id);
      
      // Load graph1
      await loadGraph(graph1.id);
      expect(useGraphStore.getState().currentGraph?.id).toBe(graph1.id);
    });

    it('should delete a graph', async () => {
      const { createGraph, deleteGraph } = useGraphStore.getState();
      
      const graph = await createGraph('To Delete');
      expect(useGraphStore.getState().graphs).toHaveLength(1);
      
      await deleteGraph(graph.id);
      expect(useGraphStore.getState().graphs).toHaveLength(0);
      expect(useGraphStore.getState().currentGraph).toBeNull();
    });

    it('should handle loading non-existent graph', async () => {
      const { loadGraph } = useGraphStore.getState();
      
      await loadGraph('non-existent-id');
      
      const { error, currentGraph } = useGraphStore.getState();
      expect(error).toBe('Graph not found');
      expect(currentGraph).toBeNull();
    });
  });

  // ============================================
  // Node Operations
  // ============================================
  describe('Node Operations', () => {
    beforeEach(async () => {
      const { createGraph } = useGraphStore.getState();
      await createGraph('Test Graph');
    });

    it('should add a node to the current graph', async () => {
      const { addNode } = useGraphStore.getState();
      
      const node = await addNode({
        type: 'CONSTANT',
        name: 'Test Constant',
        position: { x: 100, y: 100 },
        data: { value: 42 },
        inputPorts: [],
        outputPorts: [{ name: 'output', dataType: 'number' }],
      });
      
      expect(node).toBeDefined();
      expect(node.name).toBe('Test Constant');
      expect(node.type).toBe('CONSTANT');
      expect(node.data.value).toBe(42);
      
      const { currentGraph } = useGraphStore.getState();
      expect(currentGraph?.nodes).toHaveLength(1);
    });

    it('should add multiple nodes', async () => {
      const { addNode } = useGraphStore.getState();
      
      await addNode({
        type: 'CONSTANT',
        name: 'Node 1',
        position: { x: 0, y: 0 },
        outputPorts: [{ name: 'output', dataType: 'number' }],
      });
      
      await addNode({
        type: 'TRANSFORMER',
        name: 'Node 2',
        position: { x: 200, y: 0 },
        inputPorts: [{ name: 'input', dataType: 'number' }],
        outputPorts: [{ name: 'output', dataType: 'number' }],
      });
      
      const { currentGraph } = useGraphStore.getState();
      expect(currentGraph?.nodes).toHaveLength(2);
    });

    it('should update a node', async () => {
      const { addNode, updateNode } = useGraphStore.getState();
      
      const node = await addNode({
        type: 'CONSTANT',
        name: 'Original Name',
        position: { x: 0, y: 0 },
        data: { value: 10 },
      });
      
      await updateNode(node.id, { 
        name: 'Updated Name',
        data: { value: 20 },
      });
      
      const { currentGraph } = useGraphStore.getState();
      const updatedNode = currentGraph?.nodes.find(n => n.id === node.id);
      expect(updatedNode?.name).toBe('Updated Name');
      expect(updatedNode?.data.value).toBe(20);
    });

    it('should delete a node', async () => {
      const { addNode, deleteNode } = useGraphStore.getState();
      
      const node = await addNode({
        type: 'CONSTANT',
        name: 'To Delete',
        position: { x: 0, y: 0 },
      });
      
      expect(useGraphStore.getState().currentGraph?.nodes).toHaveLength(1);
      
      await deleteNode(node.id);
      
      expect(useGraphStore.getState().currentGraph?.nodes).toHaveLength(0);
    });

    it('should select and deselect a node', async () => {
      const { addNode, selectNode } = useGraphStore.getState();
      
      const node = await addNode({
        type: 'CONSTANT',
        name: 'Selectable',
        position: { x: 0, y: 0 },
      });
      
      selectNode(node.id);
      expect(useGraphStore.getState().selectedNodeId).toBe(node.id);
      
      selectNode(null);
      expect(useGraphStore.getState().selectedNodeId).toBeNull();
    });

    it('should throw error when adding node without current graph', async () => {
      // Clear the current graph
      useGraphStore.setState({ currentGraph: null });
      
      const { addNode } = useGraphStore.getState();
      
      await expect(addNode({
        type: 'CONSTANT',
        name: 'Test',
        position: { x: 0, y: 0 },
      })).rejects.toThrow('No graph selected');
    });
  });

  // ============================================
  // Edge Operations
  // ============================================
  describe('Edge Operations', () => {
    let sourceNode: { id: string };
    let targetNode: { id: string };

    beforeEach(async () => {
      const { createGraph, addNode } = useGraphStore.getState();
      await createGraph('Test Graph');
      
      sourceNode = await addNode({
        type: 'CONSTANT',
        name: 'Source',
        position: { x: 0, y: 0 },
        outputPorts: [{ name: 'output', dataType: 'number' }],
      });
      
      targetNode = await addNode({
        type: 'OUTPUT',
        name: 'Target',
        position: { x: 200, y: 0 },
        inputPorts: [{ name: 'input', dataType: 'number' }],
      });
    });

    it('should add an edge between nodes', async () => {
      const { addEdge, currentGraph } = useGraphStore.getState();
      
      const sourcePortId = currentGraph?.nodes.find(n => n.id === sourceNode.id)?.outputPorts[0].id;
      const targetPortId = currentGraph?.nodes.find(n => n.id === targetNode.id)?.inputPorts[0].id;
      
      const edge = await addEdge({
        sourceNodeId: sourceNode.id,
        sourcePortId: sourcePortId!,
        targetNodeId: targetNode.id,
        targetPortId: targetPortId!,
      });
      
      expect(edge).toBeDefined();
      expect(edge.sourceNodeId).toBe(sourceNode.id);
      expect(edge.targetNodeId).toBe(targetNode.id);
      
      const state = useGraphStore.getState();
      expect(state.currentGraph?.edges).toHaveLength(1);
    });

    it('should delete an edge', async () => {
      const { addEdge, deleteEdge, currentGraph } = useGraphStore.getState();
      
      const sourcePortId = currentGraph?.nodes.find(n => n.id === sourceNode.id)?.outputPorts[0].id;
      const targetPortId = currentGraph?.nodes.find(n => n.id === targetNode.id)?.inputPorts[0].id;
      
      const edge = await addEdge({
        sourceNodeId: sourceNode.id,
        sourcePortId: sourcePortId!,
        targetNodeId: targetNode.id,
        targetPortId: targetPortId!,
      });
      
      expect(useGraphStore.getState().currentGraph?.edges).toHaveLength(1);
      
      await deleteEdge(edge.id);
      
      expect(useGraphStore.getState().currentGraph?.edges).toHaveLength(0);
    });

    it('should delete edges when source node is deleted', async () => {
      const { addEdge, deleteNode, currentGraph } = useGraphStore.getState();
      
      const sourcePortId = currentGraph?.nodes.find(n => n.id === sourceNode.id)?.outputPorts[0].id;
      const targetPortId = currentGraph?.nodes.find(n => n.id === targetNode.id)?.inputPorts[0].id;
      
      await addEdge({
        sourceNodeId: sourceNode.id,
        sourcePortId: sourcePortId!,
        targetNodeId: targetNode.id,
        targetPortId: targetPortId!,
      });
      
      expect(useGraphStore.getState().currentGraph?.edges).toHaveLength(1);
      
      await deleteNode(sourceNode.id);
      
      // Edge should be deleted when source node is deleted
      expect(useGraphStore.getState().currentGraph?.edges).toHaveLength(0);
    });

    it('should throw error when adding edge with non-existent source', async () => {
      const { addEdge } = useGraphStore.getState();
      
      await expect(addEdge({
        sourceNodeId: 'non-existent',
        sourcePortId: 'port1',
        targetNodeId: targetNode.id,
        targetPortId: 'port2',
      })).rejects.toThrow('Source node non-existent not found');
    });

    it('should select and deselect an edge', async () => {
      const { addEdge, selectEdge, currentGraph } = useGraphStore.getState();
      
      const sourcePortId = currentGraph?.nodes.find(n => n.id === sourceNode.id)?.outputPorts[0].id;
      const targetPortId = currentGraph?.nodes.find(n => n.id === targetNode.id)?.inputPorts[0].id;
      
      const edge = await addEdge({
        sourceNodeId: sourceNode.id,
        sourcePortId: sourcePortId!,
        targetNodeId: targetNode.id,
        targetPortId: targetPortId!,
      });
      
      selectEdge(edge.id);
      expect(useGraphStore.getState().selectedEdgeId).toBe(edge.id);
      
      selectEdge(null);
      expect(useGraphStore.getState().selectedEdgeId).toBeNull();
    });
  });

  // ============================================
  // Selection State
  // ============================================
  describe('Selection State', () => {
    beforeEach(async () => {
      const { createGraph } = useGraphStore.getState();
      await createGraph('Test Graph');
    });

    it('should clear node selection when selecting edge', async () => {
      const { addNode, selectNode, selectEdge } = useGraphStore.getState();
      
      const node = await addNode({
        type: 'CONSTANT',
        name: 'Test',
        position: { x: 0, y: 0 },
      });
      
      selectNode(node.id);
      expect(useGraphStore.getState().selectedNodeId).toBe(node.id);
      
      selectEdge('some-edge-id');
      expect(useGraphStore.getState().selectedNodeId).toBeNull();
    });

    it('should clear edge selection when selecting node', async () => {
      const { addNode, selectNode, selectEdge } = useGraphStore.getState();
      
      selectEdge('some-edge-id');
      expect(useGraphStore.getState().selectedEdgeId).toBe('some-edge-id');
      
      const node = await addNode({
        type: 'CONSTANT',
        name: 'Test',
        position: { x: 0, y: 0 },
      });
      
      selectNode(node.id);
      expect(useGraphStore.getState().selectedEdgeId).toBeNull();
    });

    it('should clear selection when loading new graph', async () => {
      const { addNode, selectNode, createGraph, loadGraph } = useGraphStore.getState();
      
      const node = await addNode({
        type: 'CONSTANT',
        name: 'Test',
        position: { x: 0, y: 0 },
      });
      
      selectNode(node.id);
      expect(useGraphStore.getState().selectedNodeId).toBe(node.id);
      
      const graph2 = await createGraph('Graph 2');
      await loadGraph(graph2.id);
      
      expect(useGraphStore.getState().selectedNodeId).toBeNull();
    });

    it('should clear selection when deleting selected node', async () => {
      const { addNode, selectNode, deleteNode } = useGraphStore.getState();
      
      const node = await addNode({
        type: 'CONSTANT',
        name: 'Test',
        position: { x: 0, y: 0 },
      });
      
      selectNode(node.id);
      expect(useGraphStore.getState().selectedNodeId).toBe(node.id);
      
      await deleteNode(node.id);
      expect(useGraphStore.getState().selectedNodeId).toBeNull();
    });
  });

  // ============================================
  // Global Parameters
  // ============================================
  describe('Global Parameters', () => {
    beforeEach(async () => {
      const { createGraph } = useGraphStore.getState();
      await createGraph('Test Graph');
    });

    it('should update graph parameters', () => {
      const { updateGraphParams } = useGraphStore.getState();
      
      updateGraphParams({ 
        interestRate: 0.05,
        taxRate: 0.2,
        inflationRate: 0.03,
      });
      
      const { currentGraph } = useGraphStore.getState();
      expect(currentGraph?.params).toEqual({
        interestRate: 0.05,
        taxRate: 0.2,
        inflationRate: 0.03,
      });
    });

    it('should replace parameters on update (not merge)', () => {
      const { updateGraphParams } = useGraphStore.getState();
      
      updateGraphParams({ param1: 'value1' });
      updateGraphParams({ param2: 'value2' });
      
      const { currentGraph } = useGraphStore.getState();
      // Store replaces params entirely, doesn't merge
      expect(currentGraph?.params).toEqual({
        param2: 'value2',
      });
    });
  });

  // ============================================
  // Local Updates (Optimistic)
  // ============================================
  describe('Local Updates', () => {
    beforeEach(async () => {
      const { createGraph, addNode } = useGraphStore.getState();
      await createGraph('Test Graph');
      await addNode({
        type: 'CONSTANT',
        name: 'Test Node',
        position: { x: 0, y: 0 },
      });
    });

    it('should update local node position', () => {
      const { currentGraph, updateLocalNode } = useGraphStore.getState();
      const node = currentGraph!.nodes[0];
      
      updateLocalNode(node.id, { position: { x: 500, y: 300 } });
      
      const updatedNode = useGraphStore.getState().currentGraph?.nodes[0];
      expect(updatedNode?.position).toEqual({ x: 500, y: 300 });
    });

    it('should bulk update nodes', () => {
      const { currentGraph, updateLocalNodes } = useGraphStore.getState();
      
      // Get the existing node and update it
      const existingNode = currentGraph!.nodes[0];
      const updatedNodes = [
        { ...existingNode, position: { x: 100, y: 100 } },
      ];
      
      updateLocalNodes(updatedNodes);
      
      const state = useGraphStore.getState();
      expect(state.currentGraph?.nodes[0].position).toEqual({ x: 100, y: 100 });
    });
  });
});
