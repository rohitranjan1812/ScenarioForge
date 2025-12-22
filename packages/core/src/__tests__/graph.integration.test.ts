/**
 * ScenarioForge - Graph Integration Tests
 * 
 * Comprehensive integration tests for graph operations including:
 * - Graph CRUD lifecycle
 * - Node and edge management
 * - Graph validation
 * - Topological sorting
 * - Cloning and serialization
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGraph,
  createNode,
  addNode,
  addEdge,
  updateNodeInGraph,
  removeNode,
  removeEdge,
  getNodeById,
  getNodeInputEdges,
  getNodeOutputEdges,
  getConnectedNodes,
  validateGraph,
  topologicalSort,
  hasCycle,
  cloneGraph,
  exportGraph,
  exportGraphToJSON,
  importGraph,
  importGraphFromJSON,
} from '../graph/index.js';
import type { CreateNodeInput, CreateEdgeInput } from '../types/index.js';
import {
  resetIdCounter,
  createConstantNode,
  createTransformerNode,
  createOutputNode,
  createInputPort,
  createOutputPort,
  createTestGraph,
  connectNodes,
  createSimpleLinearGraph,
  createDiamondGraph,
  createCyclicGraph,
  createLargeGraph,
} from './test-utils.js';

describe('Graph Integration Tests', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  // ============================================
  // Graph CRUD Lifecycle
  // ============================================
  describe('Graph CRUD Lifecycle', () => {
    it('should create, update, and maintain graph state through full lifecycle', () => {
      // 1. Create empty graph
      const graph = createGraph({
        name: 'Lifecycle Test',
        description: 'Testing full lifecycle',
      });
      expect(graph.id).toBeDefined();
      expect(graph.version).toBe(1);
      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);

      // 2. Add first node
      const nodeInput1: CreateNodeInput = {
        type: 'CONSTANT',
        name: 'Input A',
        position: { x: 0, y: 0 },
        data: { value: 100 },
        outputPorts: [{ name: 'output', dataType: 'number' }],
      };
      let updatedGraph = addNode(graph, nodeInput1);
      expect(updatedGraph.nodes).toHaveLength(1);
      const nodeA = updatedGraph.nodes[0];

      // 3. Add second node
      const nodeInput2: CreateNodeInput = {
        type: 'OUTPUT',
        name: 'Output',
        position: { x: 200, y: 0 },
        inputPorts: [{ name: 'input', dataType: 'number' }],
      };
      updatedGraph = addNode(updatedGraph, nodeInput2);
      expect(updatedGraph.nodes).toHaveLength(2);
      const nodeB = updatedGraph.nodes[1];

      // 4. Connect nodes
      const edgeInput: CreateEdgeInput = {
        sourceNodeId: nodeA.id,
        sourcePortId: nodeA.outputPorts[0].id,
        targetNodeId: nodeB.id,
        targetPortId: nodeB.inputPorts[0].id,
      };
      updatedGraph = addEdge(updatedGraph, edgeInput);
      expect(updatedGraph.edges).toHaveLength(1);

      // 5. Update node
      updatedGraph = updateNodeInGraph(updatedGraph, nodeA.id, {
        data: { value: 200 },
        name: 'Updated Input A',
      });
      const updatedNodeA = getNodeById(updatedGraph, nodeA.id);
      expect(updatedNodeA?.name).toBe('Updated Input A');
      expect(updatedNodeA?.data.value).toBe(200);

      // 6. Validate graph
      const validation = validateGraph(updatedGraph);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // 7. Clone graph
      const cloned = cloneGraph(updatedGraph);
      expect(cloned.id).not.toBe(updatedGraph.id);
      expect(cloned.nodes).toHaveLength(2);
      expect(cloned.edges).toHaveLength(1);

      // 8. Remove edge
      const edgeId = updatedGraph.edges[0].id;
      updatedGraph = removeEdge(updatedGraph, edgeId);
      expect(updatedGraph.edges).toHaveLength(0);

      // 9. Remove node
      updatedGraph = removeNode(updatedGraph, nodeA.id);
      expect(updatedGraph.nodes).toHaveLength(1);
    });

    it('should maintain immutability throughout operations', () => {
      const original = createGraph({ name: 'Immutable Test', description: '' });
      
      const afterAdd = addNode(original, {
        type: 'CONSTANT',
        name: 'Node',
        position: { x: 0, y: 0 },
      });

      // Original should be unchanged
      expect(original.nodes).toHaveLength(0);
      expect(afterAdd.nodes).toHaveLength(1);
      expect(original).not.toBe(afterAdd);
    });
  });

  // ============================================
  // Node Operations
  // ============================================
  describe('Node Operations', () => {
    it('should create nodes with all port types', () => {
      const node = createNode({
        type: 'TRANSFORMER',
        name: 'Multi-Port Node',
        position: { x: 0, y: 0 },
        inputPorts: [
          { name: 'number_in', dataType: 'number', required: true },
          { name: 'string_in', dataType: 'string', required: false },
          { name: 'array_in', dataType: 'array', multiple: true },
        ],
        outputPorts: [
          { name: 'result', dataType: 'number' },
          { name: 'debug', dataType: 'object' },
        ],
      });

      expect(node.inputPorts).toHaveLength(3);
      expect(node.outputPorts).toHaveLength(2);
      expect(node.inputPorts[0].required).toBe(true);
      expect(node.inputPorts[1].required).toBe(false);
      expect(node.inputPorts[2].multiple).toBe(true);
    });

    it('should handle node updates preserving unmodified fields', () => {
      let graph = createGraph({ name: 'Update Test', description: '' });
      graph = addNode(graph, {
        type: 'CONSTANT',
        name: 'Original',
        position: { x: 10, y: 20 },
        data: { value: 42, extra: 'preserved' },
        tags: ['tag1', 'tag2'],
      });

      const nodeId = graph.nodes[0].id;
      graph = updateNodeInGraph(graph, nodeId, { name: 'Updated' });

      const updated = getNodeById(graph, nodeId)!;
      expect(updated.name).toBe('Updated');
      expect(updated.position).toEqual({ x: 10, y: 20 }); // Preserved
      expect(updated.data.value).toBe(42); // Preserved
      expect(updated.data.extra).toBe('preserved'); // Preserved
      expect(updated.tags).toEqual(['tag1', 'tag2']); // Preserved
    });

    it('should cascade delete edges when removing a node', () => {
      const { graph: simpleGraph } = createSimpleLinearGraph();
      expect(simpleGraph.edges).toHaveLength(1);

      const nodeId = simpleGraph.nodes[0].id;
      const afterRemove = removeNode(simpleGraph, nodeId);

      expect(afterRemove.nodes).toHaveLength(1);
      expect(afterRemove.edges).toHaveLength(0);
    });

    it('should remove all connected edges when removing highly connected node', () => {
      // Create hub-and-spoke topology
      const hub = createTransformerNode(
        '$inputs.a + $inputs.b + $inputs.c',
        [createInputPort('a'), createInputPort('b'), createInputPort('c')],
        { x: 200, y: 100 },
        'Hub'
      );
      const spoke1 = createConstantNode(10, { x: 0, y: 0 }, 'Spoke1');
      const spoke2 = createConstantNode(20, { x: 0, y: 100 }, 'Spoke2');
      const spoke3 = createConstantNode(30, { x: 0, y: 200 }, 'Spoke3');
      const output = createOutputNode('result', { x: 400, y: 100 });

      const nodes = [hub, spoke1, spoke2, spoke3, output];
      const edges = [
        connectNodes(spoke1, hub, 0, 0),
        connectNodes(spoke2, hub, 0, 1),
        connectNodes(spoke3, hub, 0, 2),
        connectNodes(hub, output),
      ];

      let graph = createTestGraph('Hub-Spoke', nodes, edges);
      expect(graph.edges).toHaveLength(4);

      // Remove hub - should remove all 4 edges
      graph = removeNode(graph, hub.id);
      expect(graph.edges).toHaveLength(0);
      expect(graph.nodes).toHaveLength(4);
    });
  });

  // ============================================
  // Edge Operations
  // ============================================
  describe('Edge Operations', () => {
    it('should validate edge creation with existing ports', () => {
      let graph = createGraph({ name: 'Edge Test', description: '' });
      
      // Add source node with output port
      graph = addNode(graph, {
        type: 'CONSTANT',
        name: 'Source',
        position: { x: 0, y: 0 },
        outputPorts: [{ name: 'out', dataType: 'number' }],
      });
      
      // Add target node with input port
      graph = addNode(graph, {
        type: 'OUTPUT',
        name: 'Target',
        position: { x: 200, y: 0 },
        inputPorts: [{ name: 'in', dataType: 'number' }],
      });

      const source = graph.nodes[0];
      const target = graph.nodes[1];

      // Valid edge creation
      graph = addEdge(graph, {
        sourceNodeId: source.id,
        sourcePortId: source.outputPorts[0].id,
        targetNodeId: target.id,
        targetPortId: target.inputPorts[0].id,
      });

      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0].sourceNodeId).toBe(source.id);
      expect(graph.edges[0].targetNodeId).toBe(target.id);
    });

    it('should throw error for non-existent source node', () => {
      const graph = createGraph({ name: 'Test', description: '' });

      expect(() => addEdge(graph, {
        sourceNodeId: 'nonexistent',
        sourcePortId: 'port',
        targetNodeId: 'also-nonexistent',
        targetPortId: 'port',
      })).toThrow('Source node nonexistent not found');
    });

    it('should throw error for non-existent target node', () => {
      let graph = createGraph({ name: 'Test', description: '' });
      graph = addNode(graph, {
        type: 'CONSTANT',
        name: 'Source',
        position: { x: 0, y: 0 },
        outputPorts: [{ name: 'out', dataType: 'number' }],
      });

      const source = graph.nodes[0];

      expect(() => addEdge(graph, {
        sourceNodeId: source.id,
        sourcePortId: source.outputPorts[0].id,
        targetNodeId: 'nonexistent',
        targetPortId: 'port',
      })).toThrow('Target node nonexistent not found');
    });

    it('should support edge properties (weight, delay, condition)', () => {
      let graph = createGraph({ name: 'Edge Props', description: '' });
      graph = addNode(graph, {
        type: 'CONSTANT',
        name: 'A',
        position: { x: 0, y: 0 },
        outputPorts: [{ name: 'out', dataType: 'number' }],
      });
      graph = addNode(graph, {
        type: 'OUTPUT',
        name: 'B',
        position: { x: 100, y: 0 },
        inputPorts: [{ name: 'in', dataType: 'number' }],
      });

      const a = graph.nodes[0];
      const b = graph.nodes[1];

      graph = addEdge(graph, {
        sourceNodeId: a.id,
        sourcePortId: a.outputPorts[0].id,
        targetNodeId: b.id,
        targetPortId: b.inputPorts[0].id,
        weight: 0.5,
        delay: 100,
        condition: '$inputs.value > 0',
      });

      expect(graph.edges[0].weight).toBe(0.5);
      expect(graph.edges[0].delay).toBe(100);
      expect(graph.edges[0].condition).toBe('$inputs.value > 0');
    });
  });

  // ============================================
  // Graph Traversal
  // ============================================
  describe('Graph Traversal', () => {
    it('should find input edges for a node', () => {
      const { graph, nodes } = createDiamondGraph();
      const [, b, c, d] = nodes;

      const dInputEdges = getNodeInputEdges(graph, d.id);
      expect(dInputEdges).toHaveLength(2);
      
      const sourceIds = dInputEdges.map(e => e.sourceNodeId);
      expect(sourceIds).toContain(b.id);
      expect(sourceIds).toContain(c.id);
    });

    it('should find output edges for a node', () => {
      const { graph, nodes } = createDiamondGraph();
      const [a] = nodes;

      const aOutputEdges = getNodeOutputEdges(graph, a.id);
      expect(aOutputEdges).toHaveLength(2);
    });

    it('should find connected nodes', () => {
      const { graph, nodes } = createDiamondGraph();
      const [, , , d] = nodes;

      const dConnected = getConnectedNodes(graph, d.id);
      expect(dConnected).toHaveLength(3); // B, C, Output
    });
  });

  // ============================================
  // Graph Validation
  // ============================================
  describe('Graph Validation', () => {
    it('should validate empty graph as valid', () => {
      const graph = createGraph({ name: 'Empty', description: '' });
      const result = validateGraph(graph);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate node IDs', () => {
      const graph = createGraph({ name: 'Duplicates', description: '' });
      const now = new Date();
      
      // Manually create nodes with same ID
      graph.nodes = [
        {
          id: 'duplicate-id',
          type: 'CONSTANT',
          name: 'Node 1',
          position: { x: 0, y: 0 },
          schema: {},
          data: {},
          inputPorts: [],
          outputPorts: [],
          tags: [],
          locked: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'duplicate-id',
          type: 'CONSTANT',
          name: 'Node 2',
          position: { x: 100, y: 0 },
          schema: {},
          data: {},
          inputPorts: [],
          outputPorts: [],
          tags: [],
          locked: false,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_NODE_ID')).toBe(true);
    });

    it('should detect edges referencing non-existent nodes', () => {
      const { graph } = createSimpleLinearGraph();
      
      // Manually add invalid edge
      graph.edges.push({
        id: 'invalid-edge',
        sourceNodeId: 'nonexistent-source',
        sourcePortId: 'port',
        targetNodeId: 'nonexistent-target',
        targetPortId: 'port',
        type: 'DATA_FLOW',
        schema: {},
        data: {},
        style: {},
        animated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_SOURCE_NODE')).toBe(true);
    });

    it('should warn about disconnected nodes', () => {
      let graph = createGraph({ name: 'Disconnected', description: '' });
      graph = addNode(graph, {
        type: 'CONSTANT',
        name: 'Orphan',
        position: { x: 0, y: 0 },
      });

      const result = validateGraph(graph);
      expect(result.valid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings.some(w => w.code === 'DISCONNECTED_NODE')).toBe(true);
    });

    it('should warn about cycles', () => {
      const { graph } = createCyclicGraph();
      const result = validateGraph(graph);

      expect(result.warnings.some(w => w.code === 'GRAPH_HAS_CYCLE')).toBe(true);
    });
  });

  // ============================================
  // Topological Sort
  // ============================================
  describe('Topological Sort', () => {
    it('should sort simple linear graph', () => {
      const { graph, nodes } = createSimpleLinearGraph();
      const [constant, output] = nodes;

      const sorted = topologicalSort(graph);
      expect(sorted).not.toBeNull();
      expect(sorted).toHaveLength(2);

      const constantIdx = sorted!.findIndex(n => n.id === constant.id);
      const outputIdx = sorted!.findIndex(n => n.id === output.id);
      expect(constantIdx).toBeLessThan(outputIdx);
    });

    it('should sort diamond graph correctly', () => {
      const { graph, nodes } = createDiamondGraph();
      const [a, b, c, d, output] = nodes;

      const sorted = topologicalSort(graph);
      expect(sorted).not.toBeNull();
      expect(sorted).toHaveLength(5);

      // A must come before B, C
      // B, C must come before D
      // D must come before Output
      const indices = new Map(sorted!.map((n, i) => [n.id, i]));

      expect(indices.get(a.id)).toBeLessThan(indices.get(b.id)!);
      expect(indices.get(a.id)).toBeLessThan(indices.get(c.id)!);
      expect(indices.get(b.id)).toBeLessThan(indices.get(d.id)!);
      expect(indices.get(c.id)).toBeLessThan(indices.get(d.id)!);
      expect(indices.get(d.id)).toBeLessThan(indices.get(output.id)!);
    });

    it('should return null for cyclic graph', () => {
      const { graph } = createCyclicGraph();
      const sorted = topologicalSort(graph);
      expect(sorted).toBeNull();
    });

    it('should handle graph with multiple disconnected components', () => {
      const a = createConstantNode(1, { x: 0, y: 0 }, 'A');
      const b = createOutputNode('B', { x: 200, y: 0 });
      const c = createConstantNode(2, { x: 0, y: 200 }, 'C'); // Disconnected
      const d = createOutputNode('D', { x: 200, y: 200 }); // Disconnected

      const graph = createTestGraph('Multi-Component', [a, b, c, d], [
        connectNodes(a, b),
        connectNodes(c, d),
      ]);

      const sorted = topologicalSort(graph);
      expect(sorted).not.toBeNull();
      expect(sorted).toHaveLength(4);

      // Each component should maintain internal order
      const indices = new Map(sorted!.map((n, i) => [n.id, i]));
      expect(indices.get(a.id)).toBeLessThan(indices.get(b.id)!);
      expect(indices.get(c.id)).toBeLessThan(indices.get(d.id)!);
    });
  });

  // ============================================
  // Cycle Detection
  // ============================================
  describe('Cycle Detection', () => {
    it('should detect simple cycle', () => {
      const { graph } = createCyclicGraph();
      expect(hasCycle(graph)).toBe(true);
    });

    it('should not detect cycle in acyclic graph', () => {
      const { graph } = createDiamondGraph();
      expect(hasCycle(graph)).toBe(false);
    });

    it('should not detect cycle in linear graph', () => {
      const { graph } = createSimpleLinearGraph();
      expect(hasCycle(graph)).toBe(false);
    });

    it('should detect self-loop', () => {
      const node = createTransformerNode(
        '$inputs.value + 1',
        [createInputPort('value')],
        { x: 0, y: 0 },
        'Self-Loop'
      );

      // Create self-referencing edge
      const edge = {
        id: 'self-loop',
        sourceNodeId: node.id,
        sourcePortId: node.outputPorts[0].id,
        targetNodeId: node.id,
        targetPortId: node.inputPorts[0].id,
        type: 'DATA_FLOW' as const,
        schema: {},
        data: {},
        style: {},
        animated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const graph = createTestGraph('Self-Loop', [node], [edge]);
      expect(hasCycle(graph)).toBe(true);
    });
  });

  // ============================================
  // Clone and Serialization
  // ============================================
  describe('Clone and Serialization', () => {
    it('should deep clone graph with new IDs', () => {
      const { graph } = createDiamondGraph();
      const cloned = cloneGraph(graph);

      // New IDs
      expect(cloned.id).not.toBe(graph.id);
      
      // All node IDs changed
      const originalNodeIds = new Set(graph.nodes.map(n => n.id));
      const clonedNodeIds = new Set(cloned.nodes.map(n => n.id));
      for (const id of clonedNodeIds) {
        expect(originalNodeIds.has(id)).toBe(false);
      }

      // All edge IDs changed
      const originalEdgeIds = new Set(graph.edges.map(e => e.id));
      const clonedEdgeIds = new Set(cloned.edges.map(e => e.id));
      for (const id of clonedEdgeIds) {
        expect(originalEdgeIds.has(id)).toBe(false);
      }

      // Structure preserved
      expect(cloned.nodes).toHaveLength(graph.nodes.length);
      expect(cloned.edges).toHaveLength(graph.edges.length);

      // Edge references updated to new node IDs
      for (const edge of cloned.edges) {
        expect(clonedNodeIds.has(edge.sourceNodeId)).toBe(true);
        expect(clonedNodeIds.has(edge.targetNodeId)).toBe(true);
      }
    });

    it('should export and import graph preserving all data', () => {
      const { graph } = createSupplyChainGraph();
      
      // Add complex data
      graph.metadata = { author: 'Test', version: '1.0' };
      graph.params = { rate: 0.05, factor: 2 };

      // exportGraph returns GraphExport object, exportGraphToJSON returns string
      const exported = exportGraphToJSON(graph);
      expect(typeof exported).toBe('string');
      expect(JSON.parse(exported)).toBeDefined();

      const imported = importGraphFromJSON(exported);
      expect(imported.name).toBe(graph.name);
      expect(imported.nodes).toHaveLength(graph.nodes.length);
      expect(imported.edges).toHaveLength(graph.edges.length);
      expect(imported.metadata).toEqual(graph.metadata);
      expect(imported.params).toEqual(graph.params);
    });

    it('should handle export/import of empty graph', () => {
      const graph = createGraph({ name: 'Empty', description: 'Empty graph' });
      // exportGraph returns GraphExport object which importGraph accepts
      const exported = exportGraph(graph);
      const imported = importGraph(exported);

      expect(imported.name).toBe('Empty');
      expect(imported.nodes).toHaveLength(0);
      expect(imported.edges).toHaveLength(0);
    });

    it('should preserve node data types through serialization', () => {
      let graph = createGraph({ name: 'Data Types', description: '' });
      graph = addNode(graph, {
        type: 'CONSTANT',
        name: 'Complex Data',
        position: { x: 0, y: 0 },
        data: {
          number: 42,
          string: 'hello',
          boolean: true,
          array: [1, 2, 3],
          nested: { a: 1, b: { c: 2 } },
          null: null,
        },
      });

      const exported = exportGraph(graph);
      const imported = importGraph(exported);

      const nodeData = imported.nodes[0].data;
      expect(nodeData.number).toBe(42);
      expect(nodeData.string).toBe('hello');
      expect(nodeData.boolean).toBe(true);
      expect(nodeData.array).toEqual([1, 2, 3]);
      expect(nodeData.nested).toEqual({ a: 1, b: { c: 2 } });
      expect(nodeData.null).toBeNull();
    });
  });

  // ============================================
  // Performance Tests
  // ============================================
  describe('Performance', () => {
    it('should handle graph with 100 nodes efficiently', () => {
      const graph = createLargeGraph(100);
      
      const start = performance.now();
      const validation = validateGraph(graph);
      const sort = topologicalSort(graph);
      const cloned = cloneGraph(graph);
      const elapsed = performance.now() - start;

      expect(validation.valid).toBe(true);
      expect(sort).not.toBeNull();
      expect(cloned.nodes).toHaveLength(100);
      expect(elapsed).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should handle graph with 500 nodes', () => {
      const graph = createLargeGraph(500);
      
      const start = performance.now();
      const sort = topologicalSort(graph);
      const elapsed = performance.now() - start;

      expect(sort).not.toBeNull();
      expect(elapsed).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle node with no ports', () => {
      let graph = createGraph({ name: 'No Ports', description: '' });
      graph = addNode(graph, {
        type: 'CONSTANT',
        name: 'Portless',
        position: { x: 0, y: 0 },
        inputPorts: [],
        outputPorts: [],
      });

      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0].inputPorts).toHaveLength(0);
      expect(graph.nodes[0].outputPorts).toHaveLength(0);
    });

    it('should handle multiple edges between same nodes', () => {
      const source = createConstantNode(10, { x: 0, y: 0 }, 'Source');
      source.outputPorts.push(createOutputPort('output2'));
      
      const target = createTransformerNode(
        '$inputs.a + $inputs.b',
        [createInputPort('a'), createInputPort('b')],
        { x: 200, y: 0 },
        'Target'
      );

      const edges = [
        connectNodes(source, target, 0, 0),
        connectNodes(source, target, 1, 1),
      ];

      const graph = createTestGraph('Multi-Edge', [source, target], edges);
      expect(graph.edges).toHaveLength(2);

      const validation = validateGraph(graph);
      expect(validation.valid).toBe(true);
    });

    it('should handle very long node names and descriptions', () => {
      const longName = 'A'.repeat(1000);
      const longDesc = 'B'.repeat(10000);

      let graph = createGraph({ name: 'Long Strings', description: '' });
      graph = addNode(graph, {
        type: 'CONSTANT',
        name: longName,
        description: longDesc,
        position: { x: 0, y: 0 },
      });

      expect(graph.nodes[0].name).toBe(longName);
      expect(graph.nodes[0].description).toBe(longDesc);
    });

    it('should handle special characters in node names', () => {
      const specialName = 'Node <>"\'&\n\t\\/ 🎉';

      let graph = createGraph({ name: 'Special Chars', description: '' });
      graph = addNode(graph, {
        type: 'CONSTANT',
        name: specialName,
        position: { x: 0, y: 0 },
      });

      const exported = exportGraph(graph);
      const imported = importGraph(exported);

      expect(imported.nodes[0].name).toBe(specialName);
    });
  });
});

// Import the actual supply chain graph creator
import { createSupplyChainGraph } from './test-utils.js';
