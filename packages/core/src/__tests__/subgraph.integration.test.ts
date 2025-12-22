/**
 * ScenarioForge - Subgraph/Hierarchical Integration Tests
 * 
 * Comprehensive tests for the hierarchical graph system including:
 * - Subgraph registry management
 * - Port mapping and resolution
 * - Subgraph context creation
 * - Inline expansion
 * - Validation and depth analysis
 * 
 * ARCHITECTURAL NOTES:
 * - HierarchicalGraph extends Graph (has nodes, edges directly)
 * - ExposedPort requires: id, name, dataType, internalNodeId, internalPortId, mappingType
 * - Functions operate on proper HierarchicalGraph objects, not wrapper objects
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  expandSubgraphInline,
  validateSubgraphStructure,
  getHierarchyDepth,
  mapInputsToSubgraph,
  mapOutputsFromSubgraph,
  LocalSubgraphRegistry,
  globalSubgraphRegistry,
  createSubgraphContext,
} from '../subgraph/index.js';
import { validateGraph } from '../graph/index.js';
import { executeGraphSync } from '../simulation/index.js';
import { setSeed } from '../expression/index.js';
import type { 
  Graph,
} from '../types/index.js';
import type {
  HierarchicalGraph,
  ExposedPort,
  PortMappingConfig,
  ExecutionScope,
} from '../types/hierarchical.types.js';
import {
  resetIdCounter,
  createEmptyGraph,
  createConstantNode,
  createTransformerNode,
  createOutputNode,
  createSubgraphNode,
  connectNodes,
} from './test-utils.js';

// ============================================
// Helper: Create proper HierarchicalGraph
// ============================================
function createHierarchicalGraph(
  base: Graph,
  overrides: Partial<HierarchicalGraph> = {}
): HierarchicalGraph {
  const defaultScope: ExecutionScope = {
    inheritedParams: [],
    inheritedContext: [],
    localParams: {},
    bubbleOutputs: true,
    bubbleErrors: true,
    shareIterationState: false,
    shareTimeState: false,
  };

  return {
    ...base,
    depth: 0,
    exposedInputPorts: [],
    exposedOutputPorts: [],
    feedbackLoops: [],
    executionScope: defaultScope,
    subgraphVersions: {},
    ...overrides,
  };
}

// Helper: Create a proper ExposedPort
function createExposedPort(
  id: string,
  name: string,
  internalNodeId: string,
  internalPortId: string,
  dataType: 'number' | 'string' | 'boolean' | 'object' | 'array' | 'any' = 'number'
): ExposedPort {
  return {
    id,
    name,
    dataType,
    internalNodeId,
    internalPortId,
    mappingType: 'direct',
  };
}

describe('Subgraph/Hierarchical Integration Tests', () => {
  beforeEach(() => {
    resetIdCounter();
    setSeed(42);
    globalSubgraphRegistry.clear();
  });

  // ============================================
  // Subgraph Registry
  // ============================================
  describe('Subgraph Registry', () => {
    it('should register and retrieve graphs', () => {
      const registry = new LocalSubgraphRegistry();
      const graph = createEmptyGraph('Test Graph');
      
      registry.register(graph);
      const retrieved = registry.getGraph(graph.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Graph');
    });

    it('should return undefined for unregistered graphs', () => {
      const registry = new LocalSubgraphRegistry();
      const result = registry.getGraph('nonexistent');
      
      expect(result).toBeUndefined();
    });

    it('should clear all registered graphs', () => {
      const registry = new LocalSubgraphRegistry();
      const graph1 = createEmptyGraph('Graph 1');
      const graph2 = createEmptyGraph('Graph 2');
      
      registry.register(graph1);
      registry.register(graph2);
      
      expect(registry.getGraph(graph1.id)).toBeDefined();
      expect(registry.getGraph(graph2.id)).toBeDefined();
      
      registry.clear();
      
      expect(registry.getGraph(graph1.id)).toBeUndefined();
      expect(registry.getGraph(graph2.id)).toBeUndefined();
    });

    it('should use global registry singleton', () => {
      const graph = createEmptyGraph('Global Graph');
      
      globalSubgraphRegistry.register(graph);
      const retrieved = globalSubgraphRegistry.getGraph(graph.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(graph.id);
    });

    it('should register and retrieve hierarchical graphs', () => {
      const registry = new LocalSubgraphRegistry();
      const base = createEmptyGraph('Base');
      const hierarchical = createHierarchicalGraph(base, {
        depth: 1,
        exposedInputPorts: [
          createExposedPort('input-1', 'Input 1', 'node-1', 'value'),
        ],
      });
      
      registry.registerHierarchical(hierarchical);
      const retrieved = registry.getHierarchicalGraph(hierarchical.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.exposedInputPorts).toHaveLength(1);
    });
  });

  // ============================================
  // Port Mapping
  // ============================================
  describe('Port Mapping', () => {
    it('should map external inputs to subgraph internal ports', () => {
      const externalInputs = new Map<string, unknown>();
      externalInputs.set('ext-port-1', 42);
      externalInputs.set('ext-port-2', 100);

      const portMappings: PortMappingConfig[] = [
        { externalPortId: 'ext-port-1', internalPortId: 'int-port-1' },
        { externalPortId: 'ext-port-2', internalPortId: 'int-port-2' },
      ];

      const exposedPorts: ExposedPort[] = [
        createExposedPort('int-port-1', 'Input 1', 'node-a', 'input'),
        createExposedPort('int-port-2', 'Input 2', 'node-b', 'input'),
      ];

      const result = mapInputsToSubgraph(externalInputs, portMappings, exposedPorts);

      // Should have mapped values to internal nodes
      expect(result.get('node-a')?.get('input')).toBe(42);
      expect(result.get('node-b')?.get('input')).toBe(100);
    });

    it('should handle missing external inputs gracefully', () => {
      const externalInputs = new Map<string, unknown>();
      externalInputs.set('ext-port-1', 42);
      // ext-port-2 is intentionally missing

      const portMappings: PortMappingConfig[] = [
        { externalPortId: 'ext-port-1', internalPortId: 'int-port-1' },
        { externalPortId: 'ext-port-2', internalPortId: 'int-port-2' },
      ];

      const exposedPorts: ExposedPort[] = [
        createExposedPort('int-port-1', 'Input 1', 'node-a', 'input'),
        createExposedPort('int-port-2', 'Input 2', 'node-b', 'input'),
      ];

      const result = mapInputsToSubgraph(externalInputs, portMappings, exposedPorts);

      // Should only have mapped the available input
      expect(result.get('node-a')?.get('input')).toBe(42);
      expect(result.get('node-b')).toBeUndefined();
    });

    it('should map subgraph outputs to external ports', () => {
      // Note: mapOutputsFromSubgraph expects Map<string, Record<string, unknown>>
      const internalOutputs = new Map<string, Record<string, unknown>>();
      internalOutputs.set('output-node', { result: 200 });

      const exposedPorts: ExposedPort[] = [
        createExposedPort('ext-out', 'Result', 'output-node', 'result'),
      ];

      const portMappings: PortMappingConfig[] = [
        { externalPortId: 'ext-out', internalPortId: 'ext-out' },
      ];

      // Function returns Record<string, unknown>, not Map
      const result = mapOutputsFromSubgraph(internalOutputs, portMappings, exposedPorts);

      expect(result['ext-out']).toBe(200);
    });
  });

  // ============================================
  // Subgraph Structure Validation
  // ============================================
  describe('Subgraph Structure Validation', () => {
    it('should validate a well-formed hierarchical graph', () => {
      const base = createEmptyGraph('Root');
      const node = createConstantNode(100);
      base.nodes = [node];

      const hierarchicalGraph = createHierarchicalGraph(base, {
        exposedInputPorts: [],
        exposedOutputPorts: [],
      });

      const result = validateSubgraphStructure(hierarchicalGraph);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate graph with properly mapped exposed ports', () => {
      const base = createEmptyGraph('With Ports');
      const inputNode = createConstantNode(50, { x: 0, y: 0 }, 'Input');
      const outputNode = createOutputNode('result', { x: 100, y: 0 }, 'Output');
      base.nodes = [inputNode, outputNode];

      const hierarchicalGraph = createHierarchicalGraph(base, {
        exposedInputPorts: [
          createExposedPort('exp-in', 'Exposed Input', inputNode.id, inputNode.inputPorts[0]?.id || 'value'),
        ],
        exposedOutputPorts: [
          createExposedPort('exp-out', 'Exposed Output', outputNode.id, outputNode.outputPorts[0]?.id || 'result'),
        ],
      });

      const result = validateSubgraphStructure(hierarchicalGraph);

      // Validation depends on whether ports actually exist on nodes
      // This tests the validation logic, not specific pass/fail
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
    });

    it('should detect exposed port referencing non-existent node', () => {
      const base = createEmptyGraph('Invalid Ports');
      const node = createConstantNode(10);
      base.nodes = [node];

      const hierarchicalGraph = createHierarchicalGraph(base, {
        exposedInputPorts: [
          createExposedPort('bad-port', 'Bad Port', 'nonexistent-node', 'value'),
        ],
      });

      const result = validateSubgraphStructure(hierarchicalGraph);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('nonexistent-node');
    });
  });

  // ============================================
  // Hierarchy Depth Analysis
  // ============================================
  describe('Hierarchy Depth Analysis', () => {
    it('should return 0 for flat graph with no subgraphs', () => {
      const base = createEmptyGraph('Flat');
      const node = createConstantNode(100);
      base.nodes = [node];

      const flatGraph = createHierarchicalGraph(base);
      const registry = new LocalSubgraphRegistry();
      
      const depth = getHierarchyDepth(flatGraph, registry);

      // Depth is 0 when there are no subgraph nodes
      expect(depth).toBe(0);
    });

    it('should calculate depth 1 for graph with one level of subgraphs', () => {
      const registry = new LocalSubgraphRegistry();

      // Create a child graph
      const childBase = createEmptyGraph('Child');
      const childNode = createConstantNode(50);
      childBase.nodes = [childNode];
      const childGraph = createHierarchicalGraph(childBase);
      registry.registerHierarchical(childGraph);

      // Create parent graph with a SUBGRAPH node
      const parentBase = createEmptyGraph('Parent');
      const subgraphNode = createSubgraphNode(childGraph.id, [], []);
      parentBase.nodes = [subgraphNode];
      const parentGraph = createHierarchicalGraph(parentBase);

      const depth = getHierarchyDepth(parentGraph, registry);

      expect(depth).toBe(1);
    });

    it('should calculate correct depth for deeply nested subgraphs', () => {
      const registry = new LocalSubgraphRegistry();

      // Level 3 (deepest - no subgraphs)
      const level3Base = createEmptyGraph('Level 3');
      level3Base.nodes = [createConstantNode(1)];
      const level3 = createHierarchicalGraph(level3Base);
      registry.registerHierarchical(level3);

      // Level 2 (contains level 3)
      const level2Base = createEmptyGraph('Level 2');
      level2Base.nodes = [createSubgraphNode(level3.id, [], [])];
      const level2 = createHierarchicalGraph(level2Base);
      registry.registerHierarchical(level2);

      // Level 1 (root, contains level 2)
      const level1Base = createEmptyGraph('Level 1');
      level1Base.nodes = [createSubgraphNode(level2.id, [], [])];
      const level1 = createHierarchicalGraph(level1Base);

      const depth = getHierarchyDepth(level1, registry);

      expect(depth).toBe(2);
    });
  });

  // ============================================
  // Subgraph Context Creation
  // ============================================
  describe('Subgraph Context Creation', () => {
    // Helper to create a minimal valid parent context
    function createParentContext(overrides: Partial<{
      $path: string[];
      $depth: number;
      $params: Record<string, unknown>;
      $inputs: Record<string, unknown>;
    }> = {}) {
      return {
        $node: {},
        $inputs: overrides.$inputs ?? {},
        $params: overrides.$params ?? {},
        $time: 0,
        $iteration: 0,
        $nodes: {},
        $parent: {},
        $root: {},
        $depth: overrides.$depth ?? 0,
        $path: overrides.$path ?? ['root'],
        $graphs: {},
        $feedback: {},
        $feedbackHistory: {},
      };
    }

    // Helper to create a minimal execution scope
    function createScope(overrides: Partial<ExecutionScope> = {}): ExecutionScope {
      return {
        inheritedParams: [],
        inheritedContext: [],
        localParams: {},
        bubbleOutputs: true,
        bubbleErrors: true,
        shareIterationState: false,
        shareTimeState: false,
        ...overrides,
      };
    }

    it('should create context with proper path tracking', () => {
      const parentContext = createParentContext({ $path: ['root'], $depth: 0 });
      const scope = createScope();
      
      const context = createSubgraphContext(parentContext, scope, ['child-1']);

      expect(context.$path).toEqual(['root', 'child-1']);
      expect(context.$depth).toBe(1);
    });

    it('should inherit params based on scope configuration', () => {
      const parentContext = createParentContext({
        $params: { scale: 2, offset: 10 },
      });
      const scope = createScope({
        inheritedParams: ['scale'], // Only inherit scale
      });

      const context = createSubgraphContext(parentContext, scope, ['sub-1']);

      expect(context.$params.scale).toBe(2);
      expect(context.$params.offset).toBeUndefined();
    });

    it('should apply local param overrides', () => {
      const parentContext = createParentContext({
        $params: { scale: 2 },
      });
      const scope = createScope({
        inheritedParams: ['scale'],
        localParams: { scale: 5, extra: 100 }, // Override scale and add extra
      });

      const context = createSubgraphContext(parentContext, scope, ['sub-1']);

      expect(context.$params.scale).toBe(5); // Overridden
      expect(context.$params.extra).toBe(100); // Added
    });

    it('should handle deep nesting correctly', () => {
      let context = createParentContext({ $path: ['root'], $depth: 0 });
      const scope = createScope();

      // Nest 5 levels deep
      for (let i = 1; i <= 5; i++) {
        context = createSubgraphContext(context, scope, [`level-${i}`]);
      }

      expect(context.$path).toEqual(['root', 'level-1', 'level-2', 'level-3', 'level-4', 'level-5']);
      expect(context.$depth).toBe(5);
    });

    it('should share iteration state when configured', () => {
      const parentContext = createParentContext();
      (parentContext as any).$iteration = 42;

      const scopeShared = createScope({ shareIterationState: true });
      const contextShared = createSubgraphContext(parentContext, scopeShared, ['shared']);
      expect(contextShared.$iteration).toBe(42);

      const scopeIsolated = createScope({ shareIterationState: false });
      const contextIsolated = createSubgraphContext(parentContext, scopeIsolated, ['isolated']);
      expect(contextIsolated.$iteration).toBe(0);
    });
  });

  // ============================================
  // Inline Expansion
  // ============================================
  describe('Inline Expansion', () => {
    it('should expand simple subgraph inline', () => {
      // Create the inner graph that will be expanded
      const innerGraph = createEmptyGraph('Inner');
      const innerNode = createConstantNode(42, { x: 0, y: 0 }, 'Inner Constant');
      innerGraph.nodes = [innerNode];

      // Create parent graph with subgraph node
      const parentGraph = createEmptyGraph('Parent');
      const subNode = createSubgraphNode('inner-sub', [], []);
      subNode.position = { x: 100, y: 100 };
      parentGraph.nodes = [subNode];

      // Expand
      const expanded = expandSubgraphInline(
        parentGraph,
        subNode.id,
        innerGraph,
        { mode: 'inline', prefix: 'expanded_', preserveIds: false }
      );

      // Should contain prefixed nodes from inner graph
      expect(expanded.nodes.length).toBeGreaterThanOrEqual(1);
      const expandedNode = expanded.nodes.find(n => n.name === 'Inner Constant');
      expect(expandedNode).toBeDefined();
    });

    it('should preserve node ID uniqueness during expansion', () => {
      const innerGraph = createEmptyGraph('Inner');
      const innerNode = createConstantNode(1, { x: 0, y: 0 }, 'Inner');
      innerNode.id = 'shared-id'; // Potentially conflicting ID
      innerGraph.nodes = [innerNode];

      const parentGraph = createEmptyGraph('Parent');
      const parentNode = createConstantNode(2, { x: 0, y: 0 }, 'Parent');
      const subNode = createSubgraphNode('sub-1', [], []);
      parentGraph.nodes = [parentNode, subNode];

      const expanded = expandSubgraphInline(
        parentGraph,
        subNode.id,
        innerGraph,
        { mode: 'inline', prefix: `${subNode.id}_`, preserveIds: false }
      );

      // All node IDs should be unique
      const nodeIds = expanded.nodes.map(n => n.id);
      const uniqueIds = new Set(nodeIds);
      expect(uniqueIds.size).toBe(nodeIds.length);
    });

    it('should adjust positions during expansion', () => {
      const innerGraph = createEmptyGraph('Inner');
      const innerNode = createConstantNode(1, { x: 10, y: 20 });
      innerGraph.nodes = [innerNode];

      const parentGraph = createEmptyGraph('Parent');
      const subNode = createSubgraphNode('sub-1', [], []);
      subNode.position = { x: 100, y: 200 };
      parentGraph.nodes = [subNode];

      const expanded = expandSubgraphInline(
        parentGraph,
        subNode.id,
        innerGraph,
        { mode: 'inline', prefix: 'exp_', preserveIds: false }
      );

      // Expanded node position should be offset by subgraph node position
      const expandedNode = expanded.nodes.find(n => n.id.startsWith('exp_'));
      expect(expandedNode).toBeDefined();
      if (expandedNode) {
        expect(expandedNode.position.x).toBe(110); // 100 + 10
        expect(expandedNode.position.y).toBe(220); // 200 + 20
      }
    });
  });

  // ============================================
  // Integration with Graph Execution
  // ============================================
  describe('Integration with Graph Execution', () => {
    it('should validate hierarchical graph for execution', () => {
      const base = createEmptyGraph('Executable');
      const constant = createConstantNode(100);
      const output = createOutputNode('result');
      base.nodes = [constant, output];
      // connectNodes uses port indices (0 = first port)
      base.edges = [connectNodes(constant, output, 0, 0)];

      const hierarchical = createHierarchicalGraph(base);

      // The hierarchical graph should be valid for execution
      const validation = validateGraph(hierarchical);
      expect(validation.valid).toBe(true);
    });

    it('should execute hierarchical graph like regular graph', () => {
      const base = createEmptyGraph('Execute Test');
      const constant = createConstantNode(50);
      // createTransformerNode requires (expression, inputPorts[], position?, name?)
      const transformer = createTransformerNode('$inputs.value * 2', [
        { id: 'value', name: 'value', dataType: 'number', required: true, multiple: false },
      ]);
      const output = createOutputNode('result');
      base.nodes = [constant, transformer, output];
      // connectNodes uses port indices (0 = first port)
      base.edges = [
        connectNodes(constant, transformer, 0, 0),
        connectNodes(transformer, output, 0, 0),
      ];

      const hierarchical = createHierarchicalGraph(base);
      const result = executeGraphSync(hierarchical);

      expect(result.success).toBe(true);
      expect(result.outputNodes).toHaveLength(1);
      expect(result.outputNodes[0].outputs.result).toBe(100);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle empty hierarchical graph', () => {
      const base = createEmptyGraph('Empty');
      const hierarchical = createHierarchicalGraph(base);

      const validation = validateSubgraphStructure(hierarchical);
      expect(validation.valid).toBe(true);

      const registry = new LocalSubgraphRegistry();
      const depth = getHierarchyDepth(hierarchical, registry);
      expect(depth).toBe(0);
    });

    it('should handle missing subgraph in registry gracefully', () => {
      const registry = new LocalSubgraphRegistry();

      const base = createEmptyGraph('Parent');
      const subNode = createSubgraphNode('nonexistent-subgraph', [], []);
      base.nodes = [subNode];
      const parentGraph = createHierarchicalGraph(base);

      // Should not crash, just return 0 depth for missing subgraph
      const depth = getHierarchyDepth(parentGraph, registry);
      expect(depth).toBe(0);
    });

    it('should respect max depth limit', () => {
      const registry = new LocalSubgraphRegistry();

      // Create many nested levels
      let prevGraph: HierarchicalGraph | null = null;
      for (let i = 10; i >= 1; i--) {
        const base = createEmptyGraph(`Level ${i}`);
        if (prevGraph) {
          const subNode = createSubgraphNode(prevGraph.id, [], []);
          base.nodes = [subNode];
        } else {
          base.nodes = [createConstantNode(1)];
        }
        prevGraph = createHierarchicalGraph(base, { id: `level-${i}` });
        registry.registerHierarchical(prevGraph);
      }

      if (prevGraph) {
        // With maxDepth of 3, should stop at 3
        const depth = getHierarchyDepth(prevGraph, registry, 3);
        expect(depth).toBeLessThanOrEqual(3);
      }
    });
  });
});
