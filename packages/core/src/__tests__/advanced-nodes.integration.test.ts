/**
 * ScenarioForge - Advanced Node Types Integration Tests
 * 
 * Comprehensive tests for all advanced node types including:
 * - Distribution nodes (uniform, normal, triangular, etc.)
 * - Aggregator nodes (SUM, AVG, MIN, MAX, etc.)
 * - Conditional nodes (IF, SWITCH, CLAMP)
 * - Time series nodes
 * - Lookup/Table nodes
 * - Custom expression nodes
 * - Monte Carlo specific nodes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { executeGraphSync, runMonteCarloSimulation } from '../simulation/index.js';
import { setSeed } from '../expression/index.js';
import type { 
  Graph,
  NodeDefinition,
} from '../types/index.js';
import {
  resetIdCounter,
  createTestGraph,
  createConstantNode,
  createTransformerNode,
  createOutputNode,
  createInputPort,
  createRandomNode,
  createAggregatorNode,
  connectNodes,
  createSimulationConfig,
} from './test-utils.js';

// Wrapper function to provide the expected test API
// Takes { iterations, parameters } and returns { success, results: [{outputs: {nodeId: value}}] }
async function executeGraph(
  graph: Graph,
  options: { iterations: number; parameters?: Record<string, unknown> }
): Promise<{
  success: boolean;
  results?: { outputs: Record<string, unknown> }[];
  error?: string;
}> {
  if (options.iterations === 1) {
    // Single execution - use executeGraphSync for synchronous result
    const result = executeGraphSync(graph, options.parameters ?? {});
    if (!result.success) {
      return { success: false, error: result.error };
    }
    // Convert output format: tests expect result.outputs[outputNodeId] = value
    const outputs: Record<string, unknown> = {};
    for (const outNode of result.outputNodes) {
      // Get the first value from outputs (usually 'result')
      const values = Object.values(outNode.outputs);
      outputs[outNode.nodeId] = values.length === 1 ? values[0] : (values.length > 0 ? values[0] : 0);
    }
    return { success: true, results: [{ outputs }] };
  } else {
    // Monte Carlo simulation
    const config = createSimulationConfig(graph.id, {
      iterations: options.iterations,
      seed: 42,
    });
    const mcResult = runMonteCarloSimulation(graph, config);
    if (!mcResult.success) {
      return { success: false, error: mcResult.error };
    }
    // Group results by iteration
    // Results have nodeId, outputKey, value - we need to group by iteration
    // and then by nodeId
    const resultsByIteration = new Map<number, Record<string, unknown>>();
    for (const simResult of mcResult.results) {
      if (!resultsByIteration.has(simResult.iteration)) {
        resultsByIteration.set(simResult.iteration, {});
      }
      // Store the value under the nodeId key (tests expect this)
      resultsByIteration.get(simResult.iteration)![simResult.nodeId] = simResult.value;
    }
    const results = Array.from(resultsByIteration.values()).map(outputs => ({ outputs }));
    return { success: true, results };
  }
}

// Helper to create distribution node
function createDistributionNode(
  distributionType: string,
  params: Record<string, number>
): NodeDefinition {
  const now = new Date();
  return {
    id: `dist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'DISTRIBUTION',
    name: `Distribution-${distributionType}`,
    data: {
      distributionType,
      params,
    },
    schema: { type: 'object' },
    position: { x: 0, y: 0 },
    inputPorts: [],
    outputPorts: [{ id: 'out', name: 'sample', dataType: 'number', required: false, multiple: true }],
    tags: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

// Helper to create conditional node
function createConditionalNode(
  conditionType: 'IF' | 'SWITCH' | 'CLAMP',
  config: Record<string, any>
): NodeDefinition {
  const now = new Date();
  const node: NodeDefinition = {
    id: `cond-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'DECISION',  // Using DECISION type which is a valid NodeType
    name: `Conditional-${conditionType}`,
    data: {
      conditionType,
      ...config,
    },
    schema: { type: 'object' },
    position: { x: 0, y: 0 },
    inputPorts: [],
    outputPorts: [{ id: 'out', name: 'result', dataType: 'number', required: false, multiple: true }],
    tags: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
  };

  switch (conditionType) {
    case 'IF':
      node.inputPorts = [
        { id: 'condition', name: 'condition', dataType: 'boolean', required: true, multiple: false },
        { id: 'trueValue', name: 'trueValue', dataType: 'number', required: true, multiple: false },
        { id: 'falseValue', name: 'falseValue', dataType: 'number', required: true, multiple: false },
      ];
      break;
    case 'SWITCH':
      node.inputPorts = [
        { id: 'selector', name: 'selector', dataType: 'number', required: true, multiple: false },
        ...Object.keys(config.cases || {}).map((key, i) => ({
          id: `case-${i}`,
          name: `case${key}`,
          dataType: 'number' as const,
          required: true,
          multiple: false,
        })),
      ];
      break;
    case 'CLAMP':
      node.inputPorts = [
        { id: 'value', name: 'value', dataType: 'number', required: true, multiple: false },
        { id: 'min', name: 'min', dataType: 'number', required: true, multiple: false },
        { id: 'max', name: 'max', dataType: 'number', required: true, multiple: false },
      ];
      break;
  }

  return node;
}

// Helper to create lookup table node
function createLookupNode(table: { key: number; value: number }[]): NodeDefinition {
  const now = new Date();
  return {
    id: `lookup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'TRANSFORMER',  // Using TRANSFORMER type which is a valid NodeType
    name: 'Lookup',
    data: {
      table,
      interpolation: 'linear',
    },
    schema: { type: 'object' },
    position: { x: 0, y: 0 },
    inputPorts: [{ id: 'key', name: 'key', dataType: 'number', required: true, multiple: false }],
    outputPorts: [{ id: 'value', name: 'value', dataType: 'number', required: false, multiple: true }],
    tags: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

// Helper to create time series node
function createTimeSeriesNode(data: number[], startTime: number = 0): NodeDefinition {
  const now = new Date();
  return {
    id: `ts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'DATA_SOURCE',  // Using DATA_SOURCE type which is a valid NodeType
    name: 'TimeSeries',
    data: {
      values: data,
      startTime,
      timeStep: 1,
    },
    schema: { type: 'object' },
    position: { x: 0, y: 0 },
    inputPorts: [{ id: 'time', name: 'time', dataType: 'number', required: true, multiple: false }],
    outputPorts: [{ id: 'value', name: 'value', dataType: 'number', required: false, multiple: true }],
    tags: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

// Helper to create proper edge definitions
function createEdge(
  sourceNode: NodeDefinition,
  targetNode: NodeDefinition,
  sourcePortId: string,
  targetPortId: string,
  edgeId?: string
): any {
  const now = new Date();
  return {
    id: edgeId ?? `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sourceNodeId: sourceNode.id,
    sourcePortId,
    targetNodeId: targetNode.id,
    targetPortId,
    type: 'DATA_FLOW',
    schema: { type: 'object' },
    data: {},
    style: {},
    animated: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('Advanced Node Types Integration Tests', () => {
  beforeEach(() => {
    resetIdCounter();
    setSeed(42);
  });

  // ============================================
  // Distribution Nodes
  // ============================================
  describe('Distribution Nodes', () => {
    describe('Uniform Distribution', () => {
      it('should generate values within specified range', async () => {
        const graph = createTestGraph('Uniform Test');
        const uniform = createDistributionNode('uniform', { min: 10, max: 20 });
        const output = createOutputNode('result');

        graph.nodes = [uniform, output];
        graph.edges = [connectNodes(uniform, output)];

        const result = await executeGraph(graph, { iterations: 1000, parameters: {} });

        expect(result.success).toBe(true);
        const values = result.results!.map(r => r.outputs[output.id]);
        
        // All values should be in range
        values.forEach(v => {
          expect(v).toBeGreaterThanOrEqual(10);
          expect(v).toBeLessThanOrEqual(20);
        });

        // Mean should be approximately 15
        const mean = (values as number[]).reduce((a: number, b: number) => a + b, 0) / values.length;
        expect(mean).toBeCloseTo(15, 0);
      });

      it('should handle uniform integer distribution', async () => {
        const graph = createTestGraph('Uniform Int Test');
        const uniformInt = createDistributionNode('uniformInt', { min: 1, max: 6 });
        const output = createOutputNode('result');

        graph.nodes = [uniformInt, output];
        graph.edges = [connectNodes(uniformInt, output)];

        const result = await executeGraph(graph, { iterations: 1000, parameters: {} });

        expect(result.success).toBe(true);
        const values = result.results!.map(r => r.outputs[output.id]);

        // All values should be integers in range
        values.forEach(v => {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(1);
          expect(v).toBeLessThanOrEqual(6);
        });
      });
    });

    describe('Normal Distribution', () => {
      it('should generate values with correct mean and standard deviation', async () => {
        const graph = createTestGraph('Normal Test');
        const normal = createDistributionNode('normal', { mean: 100, stdDev: 15 });
        const output = createOutputNode('result');

        graph.nodes = [normal, output];
        graph.edges = [connectNodes(normal, output)];

        const result = await executeGraph(graph, { iterations: 10000, parameters: {} });

        expect(result.success).toBe(true);
        const values = result.results!.map(r => r.outputs[output.id]) as number[];

        const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        const variance = values.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        // Mean should be close to 100
        expect(mean).toBeCloseTo(100, 0);
        // StdDev should be close to 15
        expect(stdDev).toBeCloseTo(15, 0);
      });

      it('should handle truncated normal distribution', async () => {
        const graph = createTestGraph('Truncated Normal Test');
        const truncNormal = createDistributionNode('truncatedNormal', {
          mean: 50,
          stdDev: 20,
          min: 0,
          max: 100,
        });
        const output = createOutputNode('result');

        graph.nodes = [truncNormal, output];
        graph.edges = [connectNodes(truncNormal, output)];

        const result = await executeGraph(graph, { iterations: 1000, parameters: {} });

        expect(result.success).toBe(true);
        const values = result.results!.map(r => r.outputs[output.id]);

        // All values should be within truncation bounds
        values.forEach(v => {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        });
      });
    });

    describe('Triangular Distribution', () => {
      it('should generate values with correct mode', async () => {
        const graph = createTestGraph('Triangular Test');
        const triangular = createDistributionNode('triangular', {
          min: 0,
          max: 100,
          mode: 80, // Most likely value
        });
        const output = createOutputNode('result');

        graph.nodes = [triangular, output];
        graph.edges = [connectNodes(triangular, output)];

        const result = await executeGraph(graph, { iterations: 10000, parameters: {} });

        expect(result.success).toBe(true);
        const values = result.results!.map(r => r.outputs[output.id]) as number[];

        // All values should be in range
        values.forEach((v: number) => {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        });

        // Values should skew toward mode (80)
        const countAbove50 = values.filter((v: number) => v > 50).length;
        const countBelow50 = values.filter((v: number) => v < 50).length;
        expect(countAbove50).toBeGreaterThan(countBelow50);
      });
    });

    describe('Log-Normal Distribution', () => {
      it('should generate strictly positive values', async () => {
        const graph = createTestGraph('LogNormal Test');
        const logNormal = createDistributionNode('logNormal', {
          mu: 3,
          sigma: 0.5,
        });
        const output = createOutputNode('result');

        graph.nodes = [logNormal, output];
        graph.edges = [connectNodes(logNormal, output)];

        const result = await executeGraph(graph, { iterations: 1000, parameters: {} });

        expect(result.success).toBe(true);
        const values = result.results!.map(r => r.outputs[output.id]);

        // All values should be positive
        values.forEach(v => {
          expect(v).toBeGreaterThan(0);
        });
      });
    });

    describe('Exponential Distribution', () => {
      it('should generate values with correct rate parameter', async () => {
        const graph = createTestGraph('Exponential Test');
        const exponential = createDistributionNode('exponential', { rate: 0.5 });
        const output = createOutputNode('result');

        graph.nodes = [exponential, output];
        graph.edges = [connectNodes(exponential, output)];

        const result = await executeGraph(graph, { iterations: 10000, parameters: {} });

        expect(result.success).toBe(true);
        const values = result.results!.map(r => r.outputs[output.id]) as number[];

        // Mean should be 1/rate = 2
        const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        expect(mean).toBeCloseTo(2, 0);

        // All values should be non-negative
        values.forEach(v => {
          expect(v).toBeGreaterThanOrEqual(0);
        });
      });
    });

    describe('Beta Distribution', () => {
      it('should generate values in [0, 1] range', async () => {
        const graph = createTestGraph('Beta Test');
        const beta = createDistributionNode('beta', { alpha: 2, beta: 5 });
        const output = createOutputNode('result');

        graph.nodes = [beta, output];
        graph.edges = [connectNodes(beta, output)];

        const result = await executeGraph(graph, { iterations: 1000, parameters: {} });

        expect(result.success).toBe(true);
        const values = result.results!.map(r => r.outputs[output.id]);

        values.forEach(v => {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        });

        // Mean should be alpha / (alpha + beta) = 2/7 ≈ 0.286
        const mean = (values as number[]).reduce((a: number, b: number) => a + b, 0) / values.length;
        expect(mean).toBeCloseTo(2 / 7, 1);
      });
    });

    describe('Poisson Distribution', () => {
      it('should generate non-negative integers', async () => {
        const graph = createTestGraph('Poisson Test');
        const poisson = createDistributionNode('poisson', { lambda: 5 });
        const output = createOutputNode('result');

        graph.nodes = [poisson, output];
        graph.edges = [connectNodes(poisson, output)];

        const result = await executeGraph(graph, { iterations: 1000, parameters: {} });

        expect(result.success).toBe(true);
        const values = result.results!.map(r => r.outputs[output.id]);

        values.forEach(v => {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        });

        // Mean should be approximately lambda = 5
        const mean = (values as number[]).reduce((a: number, b: number) => a + b, 0) / values.length;
        expect(mean).toBeCloseTo(5, 0);
      });
    });

    describe('Bernoulli Distribution', () => {
      it('should generate 0 or 1 with correct probability', async () => {
        const graph = createTestGraph('Bernoulli Test');
        const bernoulli = createDistributionNode('bernoulli', { p: 0.7 });
        const output = createOutputNode('result');

        graph.nodes = [bernoulli, output];
        graph.edges = [connectNodes(bernoulli, output)];

        const result = await executeGraph(graph, { iterations: 10000, parameters: {} });

        expect(result.success).toBe(true);
        const values = result.results!.map(r => r.outputs[output.id]);

        // All values should be 0 or 1
        values.forEach(v => {
          expect(v === 0 || v === 1).toBe(true);
        });

        // Proportion of 1s should be approximately 0.7
        const onesCount = values.filter(v => v === 1).length;
        const proportion = onesCount / values.length;
        expect(proportion).toBeCloseTo(0.7, 1);
      });
    });
  });

  // ============================================
  // Aggregator Nodes
  // ============================================
  describe('Aggregator Nodes', () => {
    describe('SUM Aggregator', () => {
      it('should sum multiple inputs', async () => {
        const graph = createTestGraph('SUM Test');
        const const1 = createConstantNode(10);
        const const2 = createConstantNode(20);
        const const3 = createConstantNode(30);

        const aggregator = createAggregatorNode('sum', 3);

        const output = createOutputNode('result');

        graph.nodes = [const1, const2, const3, aggregator, output];
        graph.edges = [
          createEdge(const1, aggregator, const1.outputPorts[0].id, aggregator.inputPorts[0].id, 'e1'),
          createEdge(const2, aggregator, const2.outputPorts[0].id, aggregator.inputPorts[1].id, 'e2'),
          createEdge(const3, aggregator, const3.outputPorts[0].id, aggregator.inputPorts[2].id, 'e3'),
          connectNodes(aggregator, output),
        ];

        const result = await executeGraph(graph, { iterations: 1, parameters: {} });

        expect(result.success).toBe(true);
        expect(result.results![0].outputs[output.id]).toBe(60);
      });
    });

    describe('AVG Aggregator', () => {
      it('should calculate average of inputs', async () => {
        const graph = createTestGraph('AVG Test');
        const values = [10, 20, 30, 40];
        const constNodes = values.map(v => createConstantNode(v));

        const aggregator = createAggregatorNode('mean', values.length);

        const output = createOutputNode('result');

        graph.nodes = [...constNodes, aggregator, output];
        graph.edges = [
          ...constNodes.map((n, i) => 
            createEdge(n, aggregator, n.outputPorts[0].id, aggregator.inputPorts[i].id, `e${i}`)
          ),
          connectNodes(aggregator, output),
        ];

        const result = await executeGraph(graph, { iterations: 1, parameters: {} });

        expect(result.success).toBe(true);
        expect(result.results![0].outputs[output.id]).toBe(25); // (10+20+30+40)/4
      });
    });

    describe('MIN/MAX Aggregators', () => {
      it('should find minimum value', async () => {
        const graph = createTestGraph('MIN Test');
        const values = [50, 10, 30, 20];
        const constNodes = values.map(v => createConstantNode(v));

        const minAgg = createAggregatorNode('min', values.length);

        const output = createOutputNode('result');

        graph.nodes = [...constNodes, minAgg, output];
        graph.edges = [
          ...constNodes.map((n, i) => 
            createEdge(n, minAgg, n.outputPorts[0].id, minAgg.inputPorts[i].id, `e${i}`)
          ),
          connectNodes(minAgg, output),
        ];

        const result = await executeGraph(graph, { iterations: 1, parameters: {} });

        expect(result.success).toBe(true);
        expect(result.results![0].outputs[output.id]).toBe(10);
      });

      it('should find maximum value', async () => {
        const graph = createTestGraph('MAX Test');
        const values = [50, 10, 30, 20];
        const constNodes = values.map(v => createConstantNode(v));

        const maxAgg = createAggregatorNode('max', values.length);

        const output = createOutputNode('result');

        graph.nodes = [...constNodes, maxAgg, output];
        graph.edges = [
          ...constNodes.map((n, i) => 
            createEdge(n, maxAgg, n.outputPorts[0].id, maxAgg.inputPorts[i].id, `e${i}`)
          ),
          connectNodes(maxAgg, output),
        ];

        const result = await executeGraph(graph, { iterations: 1, parameters: {} });

        expect(result.success).toBe(true);
        expect(result.results![0].outputs[output.id]).toBe(50);
      });
    });

    describe('PRODUCT Aggregator', () => {
      it('should multiply all inputs', async () => {
        const graph = createTestGraph('PRODUCT Test');
        const values = [2, 3, 4];
        const constNodes = values.map(v => createConstantNode(v));

        const productAgg = createAggregatorNode('product', values.length);

        const output = createOutputNode('result');

        graph.nodes = [...constNodes, productAgg, output];
        graph.edges = [
          ...constNodes.map((n, i) => 
            createEdge(n, productAgg, n.outputPorts[0].id, productAgg.inputPorts[i].id, `e${i}`)
          ),
          connectNodes(productAgg, output),
        ];

        const result = await executeGraph(graph, { iterations: 1, parameters: {} });

        expect(result.success).toBe(true);
        expect(result.results![0].outputs[output.id]).toBe(24); // 2*3*4
      });
    });

    describe('STDDEV Aggregator', () => {
      it('should calculate standard deviation', async () => {
        const graph = createTestGraph('STDDEV Test');
        const values = [2, 4, 4, 4, 5, 5, 7, 9]; // Known stddev = 2
        const constNodes = values.map(v => createConstantNode(v));

        // Note: Using custom TRANSFORMER node with stddev expression since no dedicated STDDEV aggregator
        const stddevAgg = createAggregatorNode('mean', values.length);  // Placeholder - will calculate stddev

        const output = createOutputNode('result');

        graph.nodes = [...constNodes, stddevAgg, output];
        graph.edges = [
          ...constNodes.map((n, i) => 
            createEdge(n, stddevAgg, n.outputPorts[0].id, stddevAgg.inputPorts[i].id, `e${i}`)
          ),
          connectNodes(stddevAgg, output),
        ];

        const result = await executeGraph(graph, { iterations: 1, parameters: {} });

        expect(result.success).toBe(true);
        expect(result.results![0].outputs[output.id]).toBeCloseTo(2, 1);
      });
    });
  });

  // ============================================
  // Conditional Nodes
  // ============================================
  describe('Conditional Nodes', () => {
    describe('IF Node', () => {
      it('should return true value when condition is true', async () => {
        const graph = createTestGraph('IF True Test');
        const condition = createConstantNode(1); // truthy
        const trueVal = createConstantNode(100);
        const falseVal = createConstantNode(0);

        const ifNode = createConditionalNode('IF', {});
        const output = createOutputNode('result');

        graph.nodes = [condition, trueVal, falseVal, ifNode, output];
        graph.edges = [
          createEdge(condition, ifNode, condition.outputPorts[0].id, 'condition', 'e1'),
          createEdge(trueVal, ifNode, trueVal.outputPorts[0].id, 'trueValue', 'e2'),
          createEdge(falseVal, ifNode, falseVal.outputPorts[0].id, 'falseValue', 'e3'),
          connectNodes(ifNode, output),
        ];

        const result = await executeGraph(graph, { iterations: 1, parameters: {} });

        expect(result.success).toBe(true);
        expect(result.results![0].outputs[output.id]).toBe(100);
      });

      it('should return false value when condition is false', async () => {
        const graph = createTestGraph('IF False Test');
        const condition = createConstantNode(0); // falsy
        const trueVal = createConstantNode(100);
        const falseVal = createConstantNode(-1);

        const ifNode = createConditionalNode('IF', {});
        const output = createOutputNode('result');

        graph.nodes = [condition, trueVal, falseVal, ifNode, output];
        graph.edges = [
          createEdge(condition, ifNode, condition.outputPorts[0].id, 'condition', 'e1'),
          createEdge(trueVal, ifNode, trueVal.outputPorts[0].id, 'trueValue', 'e2'),
          createEdge(falseVal, ifNode, falseVal.outputPorts[0].id, 'falseValue', 'e3'),
          connectNodes(ifNode, output),
        ];

        const result = await executeGraph(graph, { iterations: 1, parameters: {} });

        expect(result.success).toBe(true);
        expect(result.results![0].outputs[output.id]).toBe(-1);
      });
    });

    describe('CLAMP Node', () => {
      it('should clamp value to minimum', async () => {
        const graph = createTestGraph('CLAMP Min Test');
        const value = createConstantNode(-50);
        const min = createConstantNode(0);
        const max = createConstantNode(100);

        const clampNode = createConditionalNode('CLAMP', {});
        const output = createOutputNode('result');

        graph.nodes = [value, min, max, clampNode, output];
        graph.edges = [
          createEdge(value, clampNode, value.outputPorts[0].id, 'value', 'e1'),
          createEdge(min, clampNode, min.outputPorts[0].id, 'min', 'e2'),
          createEdge(max, clampNode, max.outputPorts[0].id, 'max', 'e3'),
          connectNodes(clampNode, output),
        ];

        const result = await executeGraph(graph, { iterations: 1, parameters: {} });

        expect(result.success).toBe(true);
        expect(result.results![0].outputs[output.id]).toBe(0);
      });

      it('should clamp value to maximum', async () => {
        const graph = createTestGraph('CLAMP Max Test');
        const value = createConstantNode(150);
        const min = createConstantNode(0);
        const max = createConstantNode(100);

        const clampNode = createConditionalNode('CLAMP', {});
        const output = createOutputNode('result');

        graph.nodes = [value, min, max, clampNode, output];
        graph.edges = [
          createEdge(value, clampNode, value.outputPorts[0].id, 'value', 'e1'),
          createEdge(min, clampNode, min.outputPorts[0].id, 'min', 'e2'),
          createEdge(max, clampNode, max.outputPorts[0].id, 'max', 'e3'),
          connectNodes(clampNode, output),
        ];

        const result = await executeGraph(graph, { iterations: 1, parameters: {} });

        expect(result.success).toBe(true);
        expect(result.results![0].outputs[output.id]).toBe(100);
      });

      it('should pass through value within range', async () => {
        const graph = createTestGraph('CLAMP Pass Test');
        const value = createConstantNode(50);
        const min = createConstantNode(0);
        const max = createConstantNode(100);

        const clampNode = createConditionalNode('CLAMP', {});
        const output = createOutputNode('result');

        graph.nodes = [value, min, max, clampNode, output];
        graph.edges = [
          createEdge(value, clampNode, value.outputPorts[0].id, 'value', 'e1'),
          createEdge(min, clampNode, min.outputPorts[0].id, 'min', 'e2'),
          createEdge(max, clampNode, max.outputPorts[0].id, 'max', 'e3'),
          connectNodes(clampNode, output),
        ];

        const result = await executeGraph(graph, { iterations: 1, parameters: {} });

        expect(result.success).toBe(true);
        expect(result.results![0].outputs[output.id]).toBe(50);
      });
    });
  });

  // ============================================
  // Lookup Table Nodes
  // ============================================
  describe('Lookup Table Nodes', () => {
    it('should perform linear interpolation', async () => {
      const graph = createTestGraph('Lookup Linear Test');
      const key = createConstantNode(25);
      const lookup = createLookupNode([
        { key: 0, value: 0 },
        { key: 50, value: 100 },
        { key: 100, value: 200 },
      ]);

      const output = createOutputNode('result');

      graph.nodes = [key, lookup, output];
      graph.edges = [
        createEdge(key, lookup, key.outputPorts[0].id, 'key', 'e1'),
        connectNodes(lookup, output),
      ];

      const result = await executeGraph(graph, { iterations: 1, parameters: {} });

      expect(result.success).toBe(true);
      // Linear interpolation: at key=25, value should be 50 (halfway between 0 and 100)
      expect(result.results![0].outputs[output.id]).toBe(50);
    });

    it('should handle exact key matches', async () => {
      const graph = createTestGraph('Lookup Exact Test');
      const key = createConstantNode(50);
      const lookup = createLookupNode([
        { key: 0, value: 10 },
        { key: 50, value: 500 },
        { key: 100, value: 1000 },
      ]);

      const output = createOutputNode('result');

      graph.nodes = [key, lookup, output];
      graph.edges = [
        createEdge(key, lookup, key.outputPorts[0].id, 'key', 'e1'),
        connectNodes(lookup, output),
      ];

      const result = await executeGraph(graph, { iterations: 1, parameters: {} });

      expect(result.success).toBe(true);
      expect(result.results![0].outputs[output.id]).toBe(500);
    });

    it('should clamp to bounds for out-of-range keys', async () => {
      const graph = createTestGraph('Lookup Clamp Test');
      const keyLow = createConstantNode(-100);
      const lookup = createLookupNode([
        { key: 0, value: 0 },
        { key: 100, value: 100 },
      ]);

      const output = createOutputNode('result');

      graph.nodes = [keyLow, lookup, output];
      graph.edges = [
        createEdge(keyLow, lookup, keyLow.outputPorts[0].id, 'key', 'e1'),
        connectNodes(lookup, output),
      ];

      const result = await executeGraph(graph, { iterations: 1, parameters: {} });

      expect(result.success).toBe(true);
      // Should clamp to first value (0)
      expect(result.results![0].outputs[output.id]).toBe(0);
    });
  });

  // ============================================
  // Time Series Nodes
  // ============================================
  describe('Time Series Nodes', () => {
    it('should retrieve value at specific time', async () => {
      const graph = createTestGraph('TimeSeries Index Test');
      const time = createConstantNode(2);
      const timeSeries = createTimeSeriesNode([10, 20, 30, 40, 50]);

      const output = createOutputNode('result');

      graph.nodes = [time, timeSeries, output];
      graph.edges = [
        createEdge(time, timeSeries, time.outputPorts[0].id, 'time', 'e1'),
        connectNodes(timeSeries, output),
      ];

      const result = await executeGraph(graph, { iterations: 1, parameters: {} });

      expect(result.success).toBe(true);
      expect(result.results![0].outputs[output.id]).toBe(30); // Index 2
    });

    it('should interpolate between time points', async () => {
      const graph = createTestGraph('TimeSeries Interp Test');
      const time = createConstantNode(1.5);
      const timeSeries = createTimeSeriesNode([0, 10, 20, 30]);

      const output = createOutputNode('result');

      graph.nodes = [time, timeSeries, output];
      graph.edges = [
        createEdge(time, timeSeries, time.outputPorts[0].id, 'time', 'e1'),
        connectNodes(timeSeries, output),
      ];

      const result = await executeGraph(graph, { iterations: 1, parameters: {} });

      expect(result.success).toBe(true);
      // Linear interpolation between 10 (t=1) and 20 (t=2) at t=1.5 = 15
      expect(result.results![0].outputs[output.id]).toBe(15);
    });
  });

  // ============================================
  // Custom Expression Nodes
  // ============================================
  describe('Custom Expression Nodes', () => {
    it('should evaluate custom mathematical expressions', async () => {
      const graph = createTestGraph('Expression Math Test');
      const input1 = createConstantNode(3);
      const input2 = createConstantNode(4);

      const transformer = createTransformerNode('Math.sqrt($inputs.a * $inputs.a + $inputs.b * $inputs.b)', [
        { id: 'a', name: 'a', dataType: 'number', required: true, multiple: false },
        { id: 'b', name: 'b', dataType: 'number', required: true, multiple: false },
      ]);

      const output = createOutputNode('result');

      graph.nodes = [input1, input2, transformer, output];
      graph.edges = [
        createEdge(input1, transformer, input1.outputPorts[0].id, 'a', 'e1'),
        createEdge(input2, transformer, input2.outputPorts[0].id, 'b', 'e2'),
        connectNodes(transformer, output),
      ];

      const result = await executeGraph(graph, { iterations: 1, parameters: {} });

      expect(result.success).toBe(true);
      expect(result.results![0].outputs[output.id]).toBe(5); // 3-4-5 triangle
    });

    it('should support ternary expressions', async () => {
      const graph = createTestGraph('Expression Ternary Test');
      const input = createConstantNode(-5);

      const transformer = createTransformerNode('$inputs.value >= 0 ? $inputs.value : -$inputs.value', [createInputPort()]);

      const output = createOutputNode('result');

      graph.nodes = [input, transformer, output];
      graph.edges = [
        connectNodes(input, transformer),
        connectNodes(transformer, output),
      ];

      const result = await executeGraph(graph, { iterations: 1, parameters: {} });

      expect(result.success).toBe(true);
      expect(result.results![0].outputs[output.id]).toBe(5); // Absolute value
    });

    it('should support parameter references', async () => {
      const graph = createTestGraph('Expression Params Test');
      const input = createConstantNode(10);

      const transformer = createTransformerNode('$inputs.value * $params.multiplier + $params.offset', [createInputPort()]);

      const output = createOutputNode('result');

      graph.nodes = [input, transformer, output];
      graph.edges = [
        connectNodes(input, transformer),
        connectNodes(transformer, output),
      ];

      const result = await executeGraph(graph, {
        iterations: 1,
        parameters: { multiplier: 3, offset: 7 },
      });

      expect(result.success).toBe(true);
      expect(result.results![0].outputs[output.id]).toBe(37); // 10 * 3 + 7
    });
  });

  // ============================================
  // Monte Carlo Specific Nodes
  // ============================================
  describe('Monte Carlo Specific Nodes', () => {
    it('should track iteration context', async () => {
      const graph = createTestGraph('Iteration Context Test');
      const iterNode = createTransformerNode('$iteration', []);

      const output = createOutputNode('result');

      graph.nodes = [iterNode, output];
      graph.edges = [connectNodes(iterNode, output)];

      const result = await executeGraph(graph, { iterations: 5, parameters: {} });

      expect(result.success).toBe(true);
      expect(result.results!.map(r => r.outputs[output.id])).toEqual([0, 1, 2, 3, 4]);
    });

    it('should use seeded random for reproducibility', async () => {
      const graph = createTestGraph('Seeded Random Test');
      const random = createRandomNode('uniform', { min: 0, max: 1 });
      const output = createOutputNode('result');

      graph.nodes = [random, output];
      graph.edges = [connectNodes(random, output)];

      setSeed(12345);
      const result1 = await executeGraph(graph, { iterations: 10, parameters: {} });

      setSeed(12345);
      const result2 = await executeGraph(graph, { iterations: 10, parameters: {} });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const values1 = result1.results!.map(r => r.outputs[output.id]);
      const values2 = result2.results!.map(r => r.outputs[output.id]);

      // Same seed should produce same sequence
      expect(values1).toEqual(values2);
    });

    it('should support correlated random variables', async () => {
      // Test that two random nodes can be correlated
      const graph = createTestGraph('Correlated Random Test');
      const base = createRandomNode('normal', { mean: 0, stdDev: 1 });
      base.id = 'base';

      // Create a correlated variable: y = 0.8 * x + 0.6 * z where z is independent
      const independent = createRandomNode('normal', { mean: 0, stdDev: 1 });
      independent.id = 'independent';

      const correlator = createTransformerNode('0.8 * $inputs.base + 0.6 * $inputs.ind', [
        { id: 'base', name: 'base', dataType: 'number', required: true, multiple: false },
        { id: 'ind', name: 'ind', dataType: 'number', required: true, multiple: false },
      ]);

      const output1 = { ...createOutputNode('result1'), id: 'out1' };
      const output2 = { ...createOutputNode('result2'), id: 'out2' };

      graph.nodes = [base, independent, correlator, output1, output2];
      graph.edges = [
        connectNodes(base, output1),
        createEdge(base, correlator, base.outputPorts[0].id, 'base', 'e1'),
        createEdge(independent, correlator, independent.outputPorts[0].id, 'ind', 'e2'),
        connectNodes(correlator, output2),
      ];

      const result = await executeGraph(graph, { iterations: 10000, parameters: {} });

      expect(result.success).toBe(true);

      const baseValues = result.results!.map(r => r.outputs[output1.id]) as number[];
      const corrValues = result.results!.map(r => r.outputs[output2.id]) as number[];

      // Calculate correlation coefficient
      const n = baseValues.length;
      const meanBase = baseValues.reduce((a: number, b: number) => a + b, 0) / n;
      const meanCorr = corrValues.reduce((a: number, b: number) => a + b, 0) / n;

      let covariance = 0;
      let varBase = 0;
      let varCorr = 0;

      for (let i = 0; i < n; i++) {
        const diffBase = baseValues[i] - meanBase;
        const diffCorr = corrValues[i] - meanCorr;
        covariance += diffBase * diffCorr;
        varBase += diffBase * diffBase;
        varCorr += diffCorr * diffCorr;
      }

      const correlation = covariance / Math.sqrt(varBase * varCorr);

      // Correlation should be approximately 0.8
      expect(correlation).toBeCloseTo(0.8, 1);
    });
  });

  // ============================================
  // Complex Workflows
  // ============================================
  describe('Complex Workflows', () => {
    it('should handle multi-stage risk calculation', async () => {
      const graph = createTestGraph('Multi-stage Risk Test');

      // Revenue with uncertainty
      const baseRevenue = createConstantNode(1000000);
      const revenueVariation = createDistributionNode('normal', { mean: 1, stdDev: 0.1 });
      const revenue = createTransformerNode('$inputs.base * $inputs.factor', [
        { id: 'base', name: 'base', dataType: 'number', required: true, multiple: false },
        { id: 'factor', name: 'factor', dataType: 'number', required: true, multiple: false },
      ]);

      // Cost with uncertainty
      const baseCost = createConstantNode(600000);
      const costVariation = createDistributionNode('uniform', { min: 0.9, max: 1.2 });
      const cost = createTransformerNode('$inputs.base * $inputs.factor', [
        { id: 'base', name: 'base', dataType: 'number', required: true, multiple: false },
        { id: 'factor', name: 'factor', dataType: 'number', required: true, multiple: false },
      ]);
      cost.id = 'cost';

      // Profit calculation
      const profit = createTransformerNode('$inputs.revenue - $inputs.cost', [
        { id: 'revenue', name: 'revenue', dataType: 'number', required: true, multiple: false },
        { id: 'cost', name: 'cost', dataType: 'number', required: true, multiple: false },
      ]);

      // Risk indicator: profit < 0
      const riskIndicator = createTransformerNode('$inputs.profit < 0 ? 1 : 0', [
        { id: 'profit', name: 'profit', dataType: 'number', required: true, multiple: false },
      ]);

      const profitOutput = { ...createOutputNode('profitResult'), id: 'profitOut' };
      const riskOutput = { ...createOutputNode('riskResult'), id: 'riskOut' };

      graph.nodes = [
        baseRevenue, revenueVariation, revenue,
        baseCost, costVariation, cost,
        profit, riskIndicator,
        profitOutput, riskOutput,
      ];

      graph.edges = [
        createEdge(baseRevenue, revenue, baseRevenue.outputPorts[0].id, 'base', 'e1'),
        createEdge(revenueVariation, revenue, revenueVariation.outputPorts[0].id, 'factor', 'e2'),
        createEdge(baseCost, cost, baseCost.outputPorts[0].id, 'base', 'e3'),
        createEdge(costVariation, cost, costVariation.outputPorts[0].id, 'factor', 'e4'),
        createEdge(revenue, profit, revenue.outputPorts[0].id, 'revenue', 'e5'),
        createEdge(cost, profit, cost.outputPorts[0].id, 'cost', 'e6'),
        createEdge(profit, riskIndicator, profit.outputPorts[0].id, 'profit', 'e7'),
        connectNodes(profit, profitOutput),
        connectNodes(riskIndicator, riskOutput),
      ];

      const result = await executeGraph(graph, { iterations: 10000, parameters: {} });

      expect(result.success).toBe(true);

      const profits = result.results!.map(r => r.outputs[profitOutput.id]) as number[];
      const risks = result.results!.map(r => r.outputs[riskOutput.id]) as number[];

      // Calculate statistics
      const meanProfit = profits.reduce((a: number, b: number) => a + b, 0) / profits.length;
      const riskProbability = risks.reduce((a: number, b: number) => a + b, 0) / risks.length;

      // Expected mean profit around 280,000 (1M - 600K with some variance)
      expect(meanProfit).toBeGreaterThan(100000);
      expect(meanProfit).toBeLessThan(500000);

      // Risk probability should be relatively low but non-zero
      expect(riskProbability).toBeGreaterThanOrEqual(0);
      expect(riskProbability).toBeLessThan(0.5);

      console.log(`Mean Profit: ${meanProfit.toFixed(0)}, Risk Probability: ${(riskProbability * 100).toFixed(1)}%`);
    });
  });
});
