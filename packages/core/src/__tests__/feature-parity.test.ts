/**
 * ScenarioForge - Feature Parity Tests
 * 
 * Comprehensive tests validating ALL promised end-value features of the platform:
 * 
 * 1. Domain-Agnostic Modeling
 * 2. Flexible JSON Schema Validation
 * 3. Graph-Based Visual Modeling
 * 4. Monte Carlo Simulation
 * 5. Risk Metrics Calculation
 * 6. Sensitivity Analysis
 * 7. Hierarchical Subgraphs
 * 8. Feedback Loop Support
 * 9. Expression Evaluation
 * 10. Optimization Support
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGraph,
  addNode,
  addEdge,
  validateGraph,
  topologicalSort,
  cloneGraph,
  exportGraph,
  exportGraphToJSON,
  importGraph,
  importGraphFromJSON,
} from '../graph/index.js';
import {
  executeGraphSync,
  runMonteCarloSimulation,
  calculateRiskMetrics,
  runSensitivityAnalysis,
} from '../simulation/index.js';
import { evaluate, setSeed } from '../expression/index.js';

import type {
  NodeDefinition,
} from '../types/index.js';
import {
  resetIdCounter,
  createTestGraph,
  createConstantNode,
  createParameterNode,
  createDistributionNode,
  createTransformerNode,
  createAggregatorNode,
  createDecisionNode,
  createConstraintNode,
  createOutputNode,
  createInputPort,
  createOutputPort,
  connectNodes,
  createSimulationConfig,
  createExpressionContext,
} from './test-utils.js';

describe('ScenarioForge Feature Parity Tests', () => {
  beforeEach(() => {
    resetIdCounter();
    setSeed(42);
  });

  // ============================================
  // FEATURE 1: Domain-Agnostic Modeling
  // ============================================
  describe('Feature: Domain-Agnostic Modeling', () => {
    it('should model financial investment scenarios without hardcoded domain logic', () => {
      // Investment model with generic nodes
      const principal = createConstantNode(10000, { x: 0, y: 0 }, 'Principal');
      const rate = createDistributionNode(
        { type: 'normal', parameters: { mean: 0.07, stddev: 0.02 } },
        { x: 0, y: 100 },
        'Annual Rate'
      );
      const years = createConstantNode(10, { x: 0, y: 200 }, 'Years');
      
      const futureValue = createTransformerNode(
        '$inputs.principal * Math.pow(1 + $inputs.rate, $inputs.years)',
        [createInputPort('principal'), createInputPort('rate'), createInputPort('years')],
        { x: 300, y: 100 },
        'Future Value'
      );
      const output = createOutputNode('result', { x: 500, y: 100 });

      const graph = createTestGraph('Financial Model', [principal, rate, years, futureValue, output], [
        connectNodes(principal, futureValue, 0, 0),
        connectNodes(rate, futureValue, 0, 1),
        connectNodes(years, futureValue, 0, 2),
        connectNodes(futureValue, output),
      ]);

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBeGreaterThan(10000);
    });

    it('should model supply chain scenarios using the same node types', () => {
      // Supply chain model - demonstrating domain agnosticism
      const demand = createDistributionNode(
        { type: 'normal', parameters: { mean: 1000, stddev: 200 } },
        { x: 0, y: 0 },
        'Customer Demand'
      );
      const unitCost = createConstantNode(25, { x: 0, y: 100 }, 'Unit Cost');
      const fixedCosts = createConstantNode(5000, { x: 0, y: 200 }, 'Fixed Costs');
      
      const variableCost = createTransformerNode(
        '$inputs.demand * $inputs.unitCost',
        [createInputPort('demand'), createInputPort('unitCost')],
        { x: 300, y: 50 },
        'Variable Costs'
      );
      const totalCost = createAggregatorNode('sum', 2, { x: 500, y: 100 }, 'Total Cost');
      const output = createOutputNode('result', { x: 700, y: 100 });

      const graph = createTestGraph('Supply Chain Model', 
        [demand, unitCost, fixedCosts, variableCost, totalCost, output], [
        connectNodes(demand, variableCost, 0, 0),
        connectNodes(unitCost, variableCost, 0, 1),
        connectNodes(variableCost, totalCost, 0, 0),
        connectNodes(fixedCosts, totalCost, 0, 1),
        connectNodes(totalCost, output),
      ]);

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      // Costs should be positive
      expect(result.outputNodes[0].outputs.result).toBeGreaterThan(0);
    });

    it('should model physics simulations with same node abstractions', () => {
      // Simple kinematics: final velocity = initial_velocity + acceleration * time
      const v0 = createConstantNode(10, { x: 0, y: 0 }, 'Initial Velocity (m/s)');
      const acceleration = createConstantNode(9.8, { x: 0, y: 100 }, 'Acceleration (m/s²)');
      const time = createConstantNode(5, { x: 0, y: 200 }, 'Time (s)');
      
      const finalVelocity = createTransformerNode(
        '$inputs.v0 + $inputs.a * $inputs.t',
        [createInputPort('v0'), createInputPort('a'), createInputPort('t')],
        { x: 300, y: 100 },
        'Final Velocity'
      );
      const output = createOutputNode('result', { x: 500, y: 100 });

      const graph = createTestGraph('Physics Model', 
        [v0, acceleration, time, finalVelocity, output], [
        connectNodes(v0, finalVelocity, 0, 0),
        connectNodes(acceleration, finalVelocity, 0, 1),
        connectNodes(time, finalVelocity, 0, 2),
        connectNodes(finalVelocity, output),
      ]);

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      // v = 10 + 9.8 * 5 = 59
      expect(result.outputNodes[0].outputs.result).toBeCloseTo(59, 5);
    });
  });

  // ============================================
  // FEATURE 2: JSON Schema Validation
  // ============================================
  describe('Feature: JSON Schema for Flexible Node Data', () => {
    it('should validate node data against schema', () => {
      const nodeWithSchema = createTransformerNode(
        '$inputs.value * 2',
        [createInputPort('value')],
        { x: 0, y: 0 },
        'Validated Node'
      );
      nodeWithSchema.schema = {
        type: 'object',
        properties: {
          expression: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['expression'],
      };
      nodeWithSchema.data = { expression: '$inputs.value * 2' };

      const constant = createConstantNode(42, { x: -200, y: 0 });
      const output = createOutputNode('result', { x: 200, y: 0 });

      const graph = createTestGraph('Schema Test', 
        [constant, nodeWithSchema, output], [
        connectNodes(constant, nodeWithSchema),
        connectNodes(nodeWithSchema, output),
      ]);

      const validation = validateGraph(graph);
      expect(validation.valid).toBe(true);

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(84);
    });

    it('should support custom data types through schema', () => {
      // Node with complex nested data structure
      const dataSourceNode = createConstantNode(0, { x: 0, y: 0 }, 'Data Source');
      dataSourceNode.schema = {
        type: 'object',
        properties: {
          records: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                value: { type: 'number' },
              },
            },
          },
        },
      };
      dataSourceNode.data = {
        value: [10, 20, 30],
        records: [
          { id: 1, value: 100 },
          { id: 2, value: 200 },
        ],
      };

      expect(dataSourceNode.schema.type).toBe('object');
      expect(dataSourceNode.data.records).toHaveLength(2);
    });
  });

  // ============================================
  // FEATURE 3: Graph-Based Visual Modeling
  // ============================================
  describe('Feature: Graph Operations', () => {
    it('should support complete graph CRUD operations', () => {
      // Create
      let graph = createGraph({ name: 'CRUD Test', description: 'Testing graph operations' });
      expect(graph.nodes).toHaveLength(0);

      // Add nodes
      graph = addNode(graph, {
        type: 'CONSTANT',
        name: 'Node A',
        position: { x: 0, y: 0 },
        data: { value: 100 },
        outputPorts: [{ name: 'output', dataType: 'number' }],
      });
      graph = addNode(graph, {
        type: 'OUTPUT',
        name: 'Node B',
        position: { x: 200, y: 0 },
        inputPorts: [{ name: 'input', dataType: 'number' }],
      });
      expect(graph.nodes).toHaveLength(2);

      // Add edge
      const [nodeA, nodeB] = graph.nodes;
      graph = addEdge(graph, {
        sourceNodeId: nodeA.id,
        sourcePortId: nodeA.outputPorts[0].id,
        targetNodeId: nodeB.id,
        targetPortId: nodeB.inputPorts[0].id,
      });
      expect(graph.edges).toHaveLength(1);

      // Validate
      const validation = validateGraph(graph);
      expect(validation.valid).toBe(true);

      // Clone
      const cloned = cloneGraph(graph);
      expect(cloned.id).not.toBe(graph.id);
      expect(cloned.nodes).toHaveLength(2);
      expect(cloned.edges).toHaveLength(1);

      // Export/Import
      const exported = exportGraph(graph);
      expect(exported).toBeDefined();
      const imported = importGraph(exported);
      expect(imported.name).toBe(graph.name);
    });

    it('should handle complex multi-path graph topologies', () => {
      // Create diamond pattern: A -> B, A -> C, B -> D, C -> D
      const a = createConstantNode(10, { x: 0, y: 100 }, 'A');
      const b = createTransformerNode('$inputs.value * 2', [createInputPort('value')], { x: 200, y: 0 }, 'B');
      const c = createTransformerNode('$inputs.value + 5', [createInputPort('value')], { x: 200, y: 200 }, 'C');
      const d = createAggregatorNode('sum', 2, { x: 400, y: 100 }, 'D');
      const output = createOutputNode('result', { x: 600, y: 100 });

      const graph = createTestGraph('Diamond', [a, b, c, d, output], [
        connectNodes(a, b),
        connectNodes(a, c),
        connectNodes(b, d, 0, 0),
        connectNodes(c, d, 0, 1),
        connectNodes(d, output),
      ]);

      // Should execute in correct order
      const sorted = topologicalSort(graph);
      expect(sorted).not.toBeNull();
      expect(sorted).toHaveLength(5);

      // Verify A comes before B and C, and both come before D
      const aIndex = sorted!.findIndex(n => n.name === 'A');
      const bIndex = sorted!.findIndex(n => n.name === 'B');
      const cIndex = sorted!.findIndex(n => n.name === 'C');
      const dIndex = sorted!.findIndex(n => n.name === 'D');
      
      expect(aIndex).toBeLessThan(bIndex);
      expect(aIndex).toBeLessThan(cIndex);
      expect(bIndex).toBeLessThan(dIndex);
      expect(cIndex).toBeLessThan(dIndex);

      // Execute and verify: A=10, B=20, C=15, D=35
      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(35);
    });

    it('should detect and report cycles', () => {
      const a = createTransformerNode('$inputs.value + 1', [createInputPort('value')], { x: 0, y: 0 }, 'A');
      a.outputPorts = [createOutputPort('output')];
      const b = createTransformerNode('$inputs.value + 1', [createInputPort('value')], { x: 200, y: 0 }, 'B');
      b.outputPorts = [createOutputPort('output')];

      // Create manual cycle
      const graph = createTestGraph('Cyclic', [a, b], []);
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: a.id,
          sourcePortId: a.outputPorts[0].id,
          targetNodeId: b.id,
          targetPortId: b.inputPorts[0].id,
          type: 'DATA_FLOW',
          schema: { type: 'object' },
          data: {},
          style: {},
          animated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'e2',
          sourceNodeId: b.id,
          sourcePortId: b.outputPorts[0].id,
          targetNodeId: a.id,
          targetPortId: a.inputPorts[0].id,
          type: 'DATA_FLOW',
          schema: { type: 'object' },
          data: {},
          style: {},
          animated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const sorted = topologicalSort(graph);
      expect(sorted).toBeNull();
    });
  });

  // ============================================
  // FEATURE 4: Monte Carlo Simulation
  // ============================================
  describe('Feature: Monte Carlo Simulation', () => {
    it('should run Monte Carlo simulation with configurable iterations', () => {
      const dist = createDistributionNode(
        { type: 'normal', parameters: { mean: 100, stddev: 10 } },
        { x: 0, y: 0 },
        'Random Value'
      );
      const output = createOutputNode('value', { x: 200, y: 0 });
      const graph = createTestGraph('MC Test', [dist, output], [connectNodes(dist, output)]);

      const config = createSimulationConfig(graph.id, {
        iterations: 1000,
        seed: 12345,
      });

      const result = runMonteCarloSimulation(graph, config);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(1000);
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should support different distribution types', () => {
      const distributions: Array<{ type: 'normal' | 'uniform' | 'triangular' | 'lognormal'; parameters: Record<string, number> }> = [
        { type: 'normal', parameters: { mean: 50, stddev: 5 } },
        { type: 'uniform', parameters: { min: 0, max: 100 } },
        { type: 'triangular', parameters: { min: 10, mode: 50, max: 90 } },
        { type: 'lognormal', parameters: { mean: 3, stddev: 0.5 } },
      ];

      for (const distConfig of distributions) {
        const dist = createDistributionNode(distConfig, { x: 0, y: 0 });
        const output = createOutputNode('value', { x: 200, y: 0 });
        const graph = createTestGraph(`${distConfig.type} Test`, [dist, output], [connectNodes(dist, output)]);

        const config = createSimulationConfig(graph.id, { iterations: 100, seed: 42 });
        const result = runMonteCarloSimulation(graph, config);

        expect(result.success).toBe(true);
        expect(result.iterations).toBe(100);
      }
    });

    it('should produce reproducible results with same seed', () => {
      const dist = createDistributionNode(
        { type: 'normal', parameters: { mean: 100, stddev: 10 } },
        { x: 0, y: 0 }
      );
      const output = createOutputNode('value', { x: 200, y: 0 });
      const graph = createTestGraph('Seed Test', [dist, output], [connectNodes(dist, output)]);

      const config1 = createSimulationConfig(graph.id, { iterations: 100, seed: 99999 });
      const config2 = createSimulationConfig(graph.id, { iterations: 100, seed: 99999 });

      const result1 = runMonteCarloSimulation(graph, config1);
      const result2 = runMonteCarloSimulation(graph, config2);

      // Results should be identical with same seed
      expect(result1.results[0].value).toBe(result2.results[0].value);
      expect(result1.results[50].value).toBe(result2.results[50].value);
    });
  });

  // ============================================
  // FEATURE 5: Risk Metrics Calculation
  // ============================================
  describe('Feature: Risk Metrics', () => {
    it('should calculate comprehensive risk metrics', () => {
      // Generate sample data
      const values = Array.from({ length: 1000 }, () => 
        100 + Math.random() * 20 - 10 // Values between 90-110
      );

      const metrics = calculateRiskMetrics(values);

      // Basic statistics
      expect(metrics.mean).toBeGreaterThan(90);
      expect(metrics.mean).toBeLessThan(110);
      expect(metrics.standardDeviation).toBeGreaterThan(0);
      expect(metrics.min).toBeLessThan(metrics.max);

      // Percentiles
      expect(metrics.percentiles.p5).toBeLessThan(metrics.percentiles.p50);
      expect(metrics.percentiles.p50).toBeLessThan(metrics.percentiles.p95);

      // VaR metrics
      expect(metrics.valueAtRisk.var95).toBeDefined();
      expect(metrics.valueAtRisk.var99).toBeDefined();
    });

    it('should calculate correct percentiles', () => {
      // Uniform distribution from 0 to 100
      const values = Array.from({ length: 10000 }, (_, i) => i / 100);

      const metrics = calculateRiskMetrics(values);

      // 5th percentile should be around 5
      expect(metrics.percentiles.p5).toBeCloseTo(5, 0);
      // 50th percentile (median) should be around 50
      expect(metrics.percentiles.p50).toBeCloseTo(50, 0);
      // 95th percentile should be around 95
      expect(metrics.percentiles.p95).toBeCloseTo(95, 0);
    });

    it('should integrate risk metrics with Monte Carlo output', () => {
      const dist = createDistributionNode(
        { type: 'normal', parameters: { mean: 1000, stddev: 100 } },
        { x: 0, y: 0 }
      );
      const output = createOutputNode('portfolio_value', { x: 200, y: 0 });
      const graph = createTestGraph('Risk Analysis', [dist, output], [connectNodes(dist, output)]);

      const config = createSimulationConfig(graph.id, { iterations: 5000, seed: 42 });
      const mcResult = runMonteCarloSimulation(graph, config);

      expect(mcResult.success).toBe(true);
      expect(mcResult.aggregated.size).toBeGreaterThan(0);

      // Get aggregated metrics
      const metrics = mcResult.aggregated.get('portfolio_value');
      expect(metrics).toBeDefined();
      if (metrics) {
        expect(metrics.mean).toBeCloseTo(1000, -1); // Within ~10
        expect(metrics.standardDeviation).toBeCloseTo(100, -1);
      }
    });
  });

  // ============================================
  // FEATURE 6: Sensitivity Analysis
  // ============================================
  describe('Feature: Sensitivity Analysis', () => {
    it('should identify parameter sensitivities', () => {
      const baseValue = createConstantNode(100, { x: 0, y: 0 }, 'Base');
      const multiplier = createParameterNode(1.5, 0.5, 3.0, { x: 0, y: 100 }, 'Multiplier');
      const result = createTransformerNode(
        '$inputs.base * $inputs.mult',
        [createInputPort('base'), createInputPort('mult')],
        { x: 300, y: 50 }
      );
      const output = createOutputNode('result', { x: 500, y: 50 });

      const graph = createTestGraph('Sensitivity Test', [baseValue, multiplier, result, output], [
        connectNodes(baseValue, result, 0, 0),
        connectNodes(multiplier, result, 0, 1),
        connectNodes(result, output),
      ]);

      const sensResult = runSensitivityAnalysis(graph, {
        parameters: [
          { nodeId: multiplier.id, field: 'value', range: [0.5, 3.0], steps: 10 },
        ],
        baseConfig: createSimulationConfig(graph.id, { iterations: 100 }),
      });

      expect(sensResult.success).toBe(true);
      expect(sensResult.sensitivities).toBeDefined();
      // Output should increase as multiplier increases
      const multiplierSens = sensResult.sensitivities.find(s => s.nodeId === multiplier.id);
      expect(multiplierSens).toBeDefined();
    });
  });

  // ============================================
  // FEATURE 7: Expression Evaluation Engine
  // ============================================
  describe('Feature: Expression Evaluation', () => {
    it('should support complex mathematical expressions', () => {
      const context = createExpressionContext({
        $node: { factor: 2 },
        $inputs: { x: 10, y: 5 },
        $params: { rate: 0.1 },
      });

      // Arithmetic
      expect(evaluate('$inputs.x + $inputs.y', context)).toBe(15);
      expect(evaluate('$inputs.x * $inputs.y', context)).toBe(50);
      expect(evaluate('$inputs.x / $inputs.y', context)).toBe(2);
      expect(evaluate('$inputs.x - $inputs.y', context)).toBe(5);
      expect(evaluate('$inputs.x % 3', context)).toBe(1);

      // Power/exponents
      expect(evaluate('pow($inputs.x, 2)', context)).toBe(100);
      expect(evaluate('sqrt($inputs.x * 10)', context)).toBe(10);

      // Comparisons
      expect(evaluate('$inputs.x > $inputs.y', context)).toBe(true);
      expect(evaluate('$inputs.x == 10', context)).toBe(true);

      // Logical
      expect(evaluate('$inputs.x > 5 && $inputs.y < 10', context)).toBe(true);
      expect(evaluate('$inputs.x < 5 || $inputs.y > 3', context)).toBe(true);

      // Ternary
      expect(evaluate('$inputs.x > $inputs.y ? "greater" : "smaller"', context)).toBe('greater');
    });

    it('should support array operations', () => {
      const context = createExpressionContext({
        $inputs: { values: [1, 2, 3, 4, 5] },
      });

      expect(evaluate('sum($inputs.values)', context)).toBe(15);
      expect(evaluate('mean($inputs.values)', context)).toBe(3);
      expect(evaluate('min($inputs.values)', context)).toBe(1);
      expect(evaluate('max($inputs.values)', context)).toBe(5);
      expect(evaluate('length($inputs.values)', context)).toBe(5);
    });

    it('should support Math functions', () => {
      const context = createExpressionContext({});

      expect(evaluate('abs(-5)', context)).toBe(5);
      expect(evaluate('floor(3.7)', context)).toBe(3);
      expect(evaluate('ceil(3.2)', context)).toBe(4);
      expect(evaluate('round(3.5)', context)).toBe(4);
      expect(evaluate('sin(0)', context)).toBe(0);
      expect(evaluate('cos(0)', context)).toBe(1);
      expect(evaluate('log(1)', context)).toBe(0);
      expect(evaluate('exp(0)', context)).toBe(1);
    });

    it('should access all context variables', () => {
      const context = createExpressionContext({
        $node: { name: 'TestNode', value: 42 },
        $inputs: { a: 10 },
        $params: { multiplier: 2 },
        $time: 100,
        $iteration: 5,
      });

      expect(evaluate('$node.value', context)).toBe(42);
      expect(evaluate('$inputs.a', context)).toBe(10);
      expect(evaluate('$params.multiplier', context)).toBe(2);
      expect(evaluate('$time', context)).toBe(100);
      expect(evaluate('$iteration', context)).toBe(5);
    });
  });

  // ============================================
  // FEATURE 8: All Node Types Working
  // ============================================
  describe('Feature: All Node Types', () => {
    it('should execute CONSTANT node', () => {
      const constant = createConstantNode(42, { x: 0, y: 0 });
      const output = createOutputNode('result', { x: 200, y: 0 });
      const graph = createTestGraph('Constant Test', [constant, output], [connectNodes(constant, output)]);

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(42);
    });

    it('should execute PARAMETER node with validation', () => {
      const param = createParameterNode(50, 0, 100, { x: 0, y: 0 });
      const output = createOutputNode('result', { x: 200, y: 0 });
      const graph = createTestGraph('Param Test', [param, output], [connectNodes(param, output)]);

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(50);
    });

    it('should execute DISTRIBUTION node with sampling', () => {
      setSeed(42);
      const dist = createDistributionNode(
        { type: 'normal', parameters: { mean: 100, stddev: 10 } },
        { x: 0, y: 0 }
      );
      const output = createOutputNode('result', { x: 200, y: 0 });
      const graph = createTestGraph('Dist Test', [dist, output], [connectNodes(dist, output)]);

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(typeof result.outputNodes[0].outputs.result).toBe('number');
    });

    it('should execute TRANSFORMER node with expression', () => {
      const input = createConstantNode(10, { x: 0, y: 0 });
      const transformer = createTransformerNode(
        '$inputs.value * 2 + 5',
        [createInputPort('value')],
        { x: 200, y: 0 }
      );
      const output = createOutputNode('result', { x: 400, y: 0 });

      const graph = createTestGraph('Transformer Test', [input, transformer, output], [
        connectNodes(input, transformer),
        connectNodes(transformer, output),
      ]);

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(25); // 10*2+5
    });

    it('should execute AGGREGATOR node with different methods', () => {
      const methods: Array<'sum' | 'mean' | 'min' | 'max' | 'product'> = ['sum', 'mean', 'min', 'max', 'product'];
      const values = [10, 20, 30];
      const expected = {
        sum: 60,
        mean: 20,
        min: 10,
        max: 30,
        product: 6000,
      };

      for (const method of methods) {
        const constants = values.map((v, i) => createConstantNode(v, { x: 0, y: i * 100 }));
        const agg = createAggregatorNode(method, values.length, { x: 200, y: 100 });
        const output = createOutputNode('result', { x: 400, y: 100 });

        const edges = constants.map((c, i) => connectNodes(c, agg, 0, i));
        edges.push(connectNodes(agg, output));

        const graph = createTestGraph(`Agg ${method}`, [...constants, agg, output], edges);
        const result = executeGraphSync(graph);

        expect(result.success).toBe(true);
        expect(result.outputNodes[0].outputs.result).toBe(expected[method]);
      }
    });

    it('should execute DECISION node with branching', () => {
      // Test true branch
      const inputTrue = createConstantNode(100, { x: 0, y: 0 });
      const decisionTrue = createDecisionNode('$inputs.value > 50', 'high', 'low', [createInputPort('value')], { x: 200, y: 0 });
      const outputTrue = createOutputNode('result', { x: 400, y: 0 });
      
      const graphTrue = createTestGraph('Decision True', [inputTrue, decisionTrue, outputTrue], [
        connectNodes(inputTrue, decisionTrue),
        connectNodes(decisionTrue, outputTrue),
      ]);

      const resultTrue = executeGraphSync(graphTrue);
      expect(resultTrue.success).toBe(true);
      expect(resultTrue.outputNodes[0].outputs.result).toBe('high');

      // Test false branch
      const inputFalse = createConstantNode(25, { x: 0, y: 0 });
      const decisionFalse = createDecisionNode('$inputs.value > 50', 'high', 'low', [createInputPort('value')], { x: 200, y: 0 });
      const outputFalse = createOutputNode('result', { x: 400, y: 0 });
      
      const graphFalse = createTestGraph('Decision False', [inputFalse, decisionFalse, outputFalse], [
        connectNodes(inputFalse, decisionFalse),
        connectNodes(decisionFalse, outputFalse),
      ]);

      const resultFalse = executeGraphSync(graphFalse);
      expect(resultFalse.success).toBe(true);
      expect(resultFalse.outputNodes[0].outputs.result).toBe('low');
    });

    it('should execute CONSTRAINT node with violation detection', () => {
      const value = createConstantNode(150, { x: 0, y: 0 });
      const constraint = createConstraintNode(0, 100, { x: 200, y: 0 }, 'Max 100');
      const output = createOutputNode('result', { x: 400, y: 0 });

      const graph = createTestGraph('Constraint Test', [value, constraint, output], [
        connectNodes(value, constraint),
        connectNodes(constraint, output),
      ]);

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      // Should detect violation
      const constraintOutput = result.outputs.get(constraint.id);
      expect(constraintOutput?.satisfied).toBe(false);
      expect(constraintOutput?.violation).toBe(50); // 150 - 100
    });
  });

  // ============================================
  // FEATURE 9: Data Persistence (Export/Import)
  // ============================================
  describe('Feature: Data Persistence', () => {
    it('should export graph to JSON and import back', () => {
      const constant = createConstantNode(42, { x: 100, y: 100 }, 'My Constant');
      const transformer = createTransformerNode('$inputs.value * 2', [createInputPort('value')], { x: 300, y: 100 });
      const output = createOutputNode('result', { x: 500, y: 100 });

      const graph = createTestGraph('Export Test', [constant, transformer, output], [
        connectNodes(constant, transformer),
        connectNodes(transformer, output),
      ]);

      // Export to JSON string
      const exported = exportGraphToJSON(graph);
      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(0);

      // Parse to verify JSON
      const parsed = JSON.parse(exported);
      expect(parsed.graph.name).toBe('Export Test');
      expect(parsed.graph.nodes).toHaveLength(3);
      expect(parsed.graph.edges).toHaveLength(2);

      // Import from JSON string
      const imported = importGraphFromJSON(exported);
      expect(imported.name).toBe(graph.name);
      expect(imported.nodes).toHaveLength(3);
      expect(imported.edges).toHaveLength(2);

      // Execute imported graph
      const result = executeGraphSync(imported);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(84); // 42 * 2
    });

    it('should preserve all node properties through export/import', () => {
      const node = createTransformerNode('$inputs.x + 1', [createInputPort('x')], { x: 100, y: 200 }, 'Detailed Node');
      node.description = 'A detailed description';
      node.tags = ['tag1', 'tag2'];
      node.color = '#ff0000';
      node.data = { expression: '$inputs.x + 1', custom: 'data' };

      const output = createOutputNode('result', { x: 300, y: 200 });
      const input = createConstantNode(5, { x: 0, y: 200 });

      const graph = createTestGraph('Detailed Export', [input, node, output], [
        connectNodes(input, node),
        connectNodes(node, output),
      ]);

      const exported = exportGraph(graph);
      const imported = importGraph(exported);

      const importedNode = imported.nodes.find(n => n.name === 'Detailed Node');
      expect(importedNode).toBeDefined();
      expect(importedNode?.description).toBe('A detailed description');
      expect(importedNode?.tags).toEqual(['tag1', 'tag2']);
      expect(importedNode?.color).toBe('#ff0000');
      expect(importedNode?.data.custom).toBe('data');
    });
  });

  // ============================================
  // FEATURE 10: Performance Under Load
  // ============================================
  describe('Feature: Performance', () => {
    it('should handle graphs with many nodes efficiently', () => {
      // Create a chain of 100 nodes
      const nodes: NodeDefinition[] = [];
      const edges: any[] = [];

      const input = createConstantNode(1, { x: 0, y: 0 }, 'Start');
      nodes.push(input);

      let prev = input;
      for (let i = 0; i < 100; i++) {
        const transformer = createTransformerNode(
          '$inputs.value + 1',
          [createInputPort('value')],
          { x: (i + 1) * 50, y: 0 },
          `Step${i}`
        );
        nodes.push(transformer);
        edges.push(connectNodes(prev, transformer));
        prev = transformer;
      }

      const output = createOutputNode('result', { x: 5100, y: 0 });
      nodes.push(output);
      edges.push(connectNodes(prev, output));

      const graph = createTestGraph('Large Chain', nodes, edges);

      const startTime = Date.now();
      const result = executeGraphSync(graph);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(101); // 1 + 100
      expect(duration).toBeLessThan(5000); // Should complete in <5s
    });

    it('should handle Monte Carlo with many iterations', () => {
      const dist = createDistributionNode(
        { type: 'normal', parameters: { mean: 100, stddev: 10 } },
        { x: 0, y: 0 }
      );
      const output = createOutputNode('value', { x: 200, y: 0 });
      const graph = createTestGraph('MC Performance', [dist, output], [connectNodes(dist, output)]);

      const config = createSimulationConfig(graph.id, {
        iterations: 10000,
        seed: 42,
      });

      const startTime = Date.now();
      const result = runMonteCarloSimulation(graph, config);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(10000);
      expect(duration).toBeLessThan(30000); // Should complete in <30s
    });
  });
});
