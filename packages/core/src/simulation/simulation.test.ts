import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeGraph,
  executeNode,
  runMonteCarloSimulation,
  calculateRiskMetrics,
  runSensitivityAnalysis,
  registerComputeFunction,
  type ExecutionState,
} from './index.js';
import type {
  Graph,
  NodeDefinition,
  SimulationConfig,
  ExpressionContext,
} from '../types/index.js';

// Helper to create a minimal node
function createNode(
  id: string,
  type: string,
  data: Record<string, unknown> = {},
  inputPorts: NodeDefinition['inputPorts'] = [],
  outputPorts: NodeDefinition['outputPorts'] = [{ id: 'out', name: 'output', dataType: 'number' }]
): NodeDefinition {
  return {
    id,
    type,
    name: id,
    schema: { type: 'object', properties: {} },
    data,
    inputPorts,
    outputPorts,
    position: { x: 0, y: 0 },
    metadata: {},
  };
}

// Helper to create empty graph
function createEmptyGraph(): Graph {
  return {
    id: 'test-graph',
    name: 'Test Graph',
    nodes: [],
    edges: [],
    metadata: { createdAt: new Date(), updatedAt: new Date() },
  };
}

// Helper to create simulation config
function createSimConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    id: 'test-sim',
    graphId: 'test-graph',
    name: 'Test Simulation',
    iterations: 100,
    mode: 'monte_carlo' as const,
    maxExecutionTime: 60000,
    parallelism: 1,
    outputNodes: [],
    captureIntermediates: false,
    ...overrides,
  };
}

describe('Simulation Engine', () => {
  describe('executeGraph', () => {
    it('should execute an empty graph', () => {
      const graph = createEmptyGraph();
      const result = executeGraph(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes).toHaveLength(0);
    });

    it('should execute a graph with a constant node', () => {
      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('const1', 'CONSTANT', { value: 42 }),
        createNode('output1', 'OUTPUT', { label: 'result' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'const1',
          sourcePortId: 'out',
          targetNodeId: 'output1',
          targetPortId: 'in',
        }
      ];

      const result = executeGraph(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes).toHaveLength(1);
      expect(result.outputNodes[0].outputs.result).toBe(42);
    });

    it('should execute a graph with transformer node', () => {
      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('const1', 'CONSTANT', { value: 10 }),
        createNode('transform1', 'TRANSFORMER', { expression: '$inputs.input * 2' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
        createNode('output1', 'OUTPUT', { label: 'result' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'const1',
          sourcePortId: 'out',
          targetNodeId: 'transform1',
          targetPortId: 'in',
        },
        {
          id: 'e2',
          sourceNodeId: 'transform1',
          sourcePortId: 'out',
          targetNodeId: 'output1',
          targetPortId: 'in',
        }
      ];

      const result = executeGraph(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes).toHaveLength(1);
      expect(result.outputNodes[0].outputs.result).toBe(20);
    });

    it('should execute aggregator node with sum', () => {
      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('const1', 'CONSTANT', { value: 10 }),
        createNode('const2', 'CONSTANT', { value: 20 }),
        createNode('agg1', 'AGGREGATOR', { method: 'sum' }, [
          { id: 'in1', name: 'input1', dataType: 'number' },
          { id: 'in2', name: 'input2', dataType: 'number' },
        ]),
        createNode('output1', 'OUTPUT', { label: 'result' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'const1',
          sourcePortId: 'out',
          targetNodeId: 'agg1',
          targetPortId: 'in1',
        },
        {
          id: 'e2',
          sourceNodeId: 'const2',
          sourcePortId: 'out',
          targetNodeId: 'agg1',
          targetPortId: 'in2',
        },
        {
          id: 'e3',
          sourceNodeId: 'agg1',
          sourcePortId: 'out',
          targetNodeId: 'output1',
          targetPortId: 'in',
        }
      ];

      const result = executeGraph(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(30);
    });

    it('should execute aggregator node with mean', () => {
      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('const1', 'CONSTANT', { value: 10 }),
        createNode('const2', 'CONSTANT', { value: 30 }),
        createNode('agg1', 'AGGREGATOR', { method: 'mean' }, [
          { id: 'in1', name: 'input1', dataType: 'number' },
          { id: 'in2', name: 'input2', dataType: 'number' },
        ]),
        createNode('output1', 'OUTPUT', { label: 'result' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'const1',
          sourcePortId: 'out',
          targetNodeId: 'agg1',
          targetPortId: 'in1',
        },
        {
          id: 'e2',
          sourceNodeId: 'const2',
          sourcePortId: 'out',
          targetNodeId: 'agg1',
          targetPortId: 'in2',
        },
        {
          id: 'e3',
          sourceNodeId: 'agg1',
          sourcePortId: 'out',
          targetNodeId: 'output1',
          targetPortId: 'in',
        }
      ];

      const result = executeGraph(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(20);
    });

    it('should pass parameters to context', () => {
      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('transform1', 'TRANSFORMER', { expression: '$params.multiplier * 5' }),
        createNode('output1', 'OUTPUT', { label: 'result' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'transform1',
          sourcePortId: 'out',
          targetNodeId: 'output1',
          targetPortId: 'in',
        }
      ];

      const result = executeGraph(graph, { multiplier: 3 });

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(15);
    });

    it('should handle cyclic graphs gracefully', () => {
      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('node1', 'TRANSFORMER', { expression: '$inputs.input + 1' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
        createNode('node2', 'TRANSFORMER', { expression: '$inputs.input + 1' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'node1',
          sourcePortId: 'out',
          targetNodeId: 'node2',
          targetPortId: 'in',
        },
        {
          id: 'e2',
          sourceNodeId: 'node2',
          sourcePortId: 'out',
          targetNodeId: 'node1',
          targetPortId: 'in',
        }
      ];

      const result = executeGraph(graph);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cycle');
    });

    it('should include execution time', () => {
      const graph = createEmptyGraph();
      graph.nodes = [createNode('const1', 'CONSTANT', { value: 1 })];

      const result = executeGraph(graph);

      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('executeNode', () => {
    let graph: Graph;
    let state: ExecutionState;
    let context: ExpressionContext;

    beforeEach(() => {
      graph = createEmptyGraph();
      state = {
        nodeOutputs: new Map(),
        portValues: new Map(),
      };
      context = {
        $node: {},
        $inputs: {},
        $params: {},
        $time: 0,
        $iteration: 0,
        $nodes: {},
      };
    });

    it('should execute CONSTANT node', () => {
      const node = createNode('const1', 'CONSTANT', { value: 99 });
      graph.nodes = [node];

      const result = executeNode(node, graph, state, context);

      expect(result.output).toBe(99);
      expect(state.nodeOutputs.get('const1')).toEqual({ output: 99 });
    });

    it('should execute PARAMETER node', () => {
      const node = createNode('param1', 'PARAMETER', { value: 50 });
      graph.nodes = [node];

      const result = executeNode(node, graph, state, context);

      expect(result.output).toBe(50);
    });

    it('should execute DATA_SOURCE node', () => {
      const node = createNode('data1', 'DATA_SOURCE', { value: 123 });
      graph.nodes = [node];

      const result = executeNode(node, graph, state, context);

      expect(result.output).toBe(123);
    });

    it('should execute DECISION node with true condition', () => {
      const node = createNode('decision1', 'DECISION', {
        condition: '10 > 5',
        trueValue: 'yes',
        falseValue: 'no',
      });
      graph.nodes = [node];

      const result = executeNode(node, graph, state, context);

      expect(result.output).toBe('yes');
    });

    it('should execute DECISION node with false condition', () => {
      const node = createNode('decision1', 'DECISION', {
        condition: '10 < 5',
        trueValue: 'yes',
        falseValue: 'no',
      });
      graph.nodes = [node];

      const result = executeNode(node, graph, state, context);

      expect(result.output).toBe('no');
    });

    it('should execute CONSTRAINT node', () => {
      const node = createNode('constraint1', 'CONSTRAINT', {
        expression: '50',
        min: 0,
        max: 100,
      });
      graph.nodes = [node];

      const result = executeNode(node, graph, state, context);

      expect(result.satisfied).toBe(true);
      expect(result.violation).toBe(0);
      expect(result.output).toBe(50);
    });

    it('should execute CONSTRAINT node with violation', () => {
      const node = createNode('constraint1', 'CONSTRAINT', {
        expression: '150',
        min: 0,
        max: 100,
      });
      graph.nodes = [node];

      const result = executeNode(node, graph, state, context);

      expect(result.satisfied).toBe(false);
      expect(result.violation).toBe(50);
    });
  });

  describe('registerComputeFunction', () => {
    it('should allow registering custom compute function', () => {
      registerComputeFunction('CUSTOM_DOUBLE', (_inputs, nodeData) => {
        return { output: (nodeData.value as number) * 2 };
      });

      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('custom1', 'CUSTOM_DOUBLE', { value: 21 }),
        createNode('output1', 'OUTPUT', { label: 'result' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'custom1',
          sourcePortId: 'out',
          targetNodeId: 'output1',
          targetPortId: 'in',
        }
      ];

      const result = executeGraph(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(42);
    });
  });

  describe('runMonteCarloSimulation', () => {
    it('should run Monte Carlo simulation', () => {
      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('const1', 'CONSTANT', { value: 100 }),
        createNode('output1', 'OUTPUT', { label: 'result' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'const1',
          sourcePortId: 'out',
          targetNodeId: 'output1',
          targetPortId: 'in',
        }
      ];

      const config = createSimConfig({ iterations: 10 });
      const result = runMonteCarloSimulation(graph, config);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(10);
      expect(result.results.length).toBe(10);
      // All results should be 100 since it's a constant
      expect(result.results.every(r => r.value === 100)).toBe(true);
    });

    it('should handle distribution nodes', () => {
      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('dist1', 'DISTRIBUTION', {
          distributionType: 'normal',
          parameters: { mean: 100, std: 10 },
        }),
        createNode('output1', 'OUTPUT', { label: 'result' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'dist1',
          sourcePortId: 'out',
          targetNodeId: 'output1',
          targetPortId: 'in',
        }
      ];

      const config = createSimConfig({ iterations: 100, seed: 12345 });
      const result = runMonteCarloSimulation(graph, config);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(100);
      // Values should vary around 100
      const values = result.results.map(r => r.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      expect(mean).toBeGreaterThan(80);
      expect(mean).toBeLessThan(120);
    });

    it('should report progress', () => {
      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('const1', 'CONSTANT', { value: 1 }),
        createNode('output1', 'OUTPUT', { label: 'result' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'const1',
          sourcePortId: 'out',
          targetNodeId: 'output1',
          targetPortId: 'in',
        }
      ];

      const progressReports: number[] = [];
      const config = createSimConfig({ iterations: 500 });
      runMonteCarloSimulation(graph, config, (progress) => {
        progressReports.push(progress.progress);
      });

      expect(progressReports.length).toBeGreaterThan(0);
    });

    it('should aggregate results with risk metrics', () => {
      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('dist1', 'DISTRIBUTION', {
          distributionType: 'normal',
          parameters: { mean: 100, std: 10 },
        }),
        createNode('output1', 'OUTPUT', { label: 'result' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'dist1',
          sourcePortId: 'out',
          targetNodeId: 'output1',
          targetPortId: 'in',
        }
      ];

      const config = createSimConfig({ iterations: 1000, seed: 42 });
      const result = runMonteCarloSimulation(graph, config);

      expect(result.aggregated.size).toBe(1);
      const metrics = result.aggregated.get('output1:result');
      expect(metrics).toBeDefined();
      expect(metrics!.mean).toBeGreaterThan(80);
      expect(metrics!.mean).toBeLessThan(120);
    });
  });

  describe('calculateRiskMetrics', () => {
    it('should calculate risk metrics for sample data', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const metrics = calculateRiskMetrics(values);

      expect(metrics.mean).toBe(55);
      expect(metrics.min).toBe(10);
      expect(metrics.max).toBe(100);
      expect(metrics.median).toBe(55);
    });

    it('should handle empty array', () => {
      const metrics = calculateRiskMetrics([]);

      expect(metrics.mean).toBe(0);
      expect(metrics.min).toBe(0);
      expect(metrics.max).toBe(0);
      expect(metrics.standardDeviation).toBe(0);
    });

    it('should calculate percentiles', () => {
      // Create array from 1 to 100
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      const metrics = calculateRiskMetrics(values);

      expect(metrics.percentiles.p50).toBeCloseTo(50.5, 0);
      expect(metrics.percentiles.p5).toBeCloseTo(5.95, 0);
      expect(metrics.percentiles.p95).toBeCloseTo(95.05, 0);
    });

    it('should calculate VaR', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      const metrics = calculateRiskMetrics(values);

      // VaR95 is 5th percentile (lower tail)
      expect(metrics.valueAtRisk.var95).toBeLessThan(10);
      expect(metrics.valueAtRisk.var99).toBeLessThan(5);
    });

    it('should calculate standard deviation', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const metrics = calculateRiskMetrics(values);

      // Known standard deviation for this dataset
      expect(metrics.standardDeviation).toBeCloseTo(2, 0);
    });

    it('should calculate variance', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const metrics = calculateRiskMetrics(values);

      expect(metrics.variance).toBeCloseTo(4, 0);
    });
  });

  describe('runSensitivityAnalysis', () => {
    it('should run sensitivity analysis', () => {
      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('param1', 'PARAMETER', { value: 10 }),
        createNode('transform1', 'TRANSFORMER', { expression: '$inputs.input * 2' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
        createNode('output1', 'OUTPUT', { label: 'result' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'param1',
          sourcePortId: 'out',
          targetNodeId: 'transform1',
          targetPortId: 'in',
        },
        {
          id: 'e2',
          sourceNodeId: 'transform1',
          sourcePortId: 'out',
          targetNodeId: 'output1',
          targetPortId: 'in',
        }
      ];

      const result = runSensitivityAnalysis(
        graph,
        'param1',
        'value',
        'output1',
        'result',
        [0, 100],
        11
      );

      expect(result.parameterId).toBe('param1:value');
      expect(result.values.length).toBe(11);
      // Sensitivity should be 2 (output = input * 2)
      expect(result.sensitivity).toBeCloseTo(2, 1);
    });

    it('should throw for non-existent parameter node', () => {
      const graph = createEmptyGraph();

      expect(() => {
        runSensitivityAnalysis(
          graph,
          'nonexistent',
          'value',
          'output1',
          'result',
          [0, 100],
          5
        );
      }).toThrow('not found');
    });

    it('should calculate elasticity', () => {
      const graph = createEmptyGraph();
      graph.nodes = [
        createNode('param1', 'PARAMETER', { value: 50 }),
        createNode('transform1', 'TRANSFORMER', { expression: '$inputs.input * 2' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
        createNode('output1', 'OUTPUT', { label: 'result' }, [
          { id: 'in', name: 'input', dataType: 'number' }
        ]),
      ];
      graph.edges = [
        {
          id: 'e1',
          sourceNodeId: 'param1',
          sourcePortId: 'out',
          targetNodeId: 'transform1',
          targetPortId: 'in',
        },
        {
          id: 'e2',
          sourceNodeId: 'transform1',
          sourcePortId: 'out',
          targetNodeId: 'output1',
          targetPortId: 'in',
        }
      ];

      const result = runSensitivityAnalysis(
        graph,
        'param1',
        'value',
        'output1',
        'result',
        [0, 100],
        11
      );

      // For linear y = 2x, elasticity = (dy/dx) * (x/y) = 2 * (50/100) = 1
      expect(result.elasticity).toBeCloseTo(1, 1);
    });
  });
});
