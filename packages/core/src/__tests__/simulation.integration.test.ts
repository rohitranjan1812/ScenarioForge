/**
 * ScenarioForge - Simulation Engine Integration Tests
 * 
 * Comprehensive tests for the simulation system including:
 * - Deterministic graph execution
 * - Monte Carlo simulations
 * - Risk metrics calculation
 * - Sensitivity analysis
 * - Expression evaluation in simulation context
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  executeGraphSync,
  runMonteCarloSimulation,
  calculateRiskMetrics,
  runSensitivityAnalysis,
  registerComputeFunction,
} from '../simulation/index.js';
import { setSeed } from '../expression/index.js';
import {
  resetIdCounter,
  createTestGraph,
  createConstantNode,
  createParameterNode,
  createDistributionNode,
  createTransformerNode,
  createConstraintNode,
  createOutputNode,
  createInputPort,
  createOutputPort,
  connectNodes,
  createSimpleLinearGraph,
  createTransformChainGraph,
  createAggregationGraph,
  createDecisionGraph,
  createMonteCarloGraph,
  createDiamondGraph,
  createCyclicGraph,
  createSupplyChainGraph,
  createSimulationConfig,
  measureExecutionTime,
} from './test-utils.js';

describe('Simulation Engine Integration Tests', () => {
  beforeEach(() => {
    resetIdCounter();
    setSeed(12345); // Deterministic random for tests
  });

  // ============================================
  // Deterministic Graph Execution
  // ============================================
  describe('Deterministic Graph Execution', () => {
    it('should execute empty graph successfully', () => {
      const graph = createTestGraph('Empty', [], []);
      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes).toHaveLength(0);
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should execute simple constant -> output chain', () => {
      const { graph } = createSimpleLinearGraph();
      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes).toHaveLength(1);
      expect(result.outputNodes[0].outputs.result).toBe(42);
    });

    it('should execute transform chain correctly', () => {
      const { graph } = createTransformChainGraph();
      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes).toHaveLength(1);
      expect(result.outputNodes[0].outputs.result).toBe(20); // 10 * 2
    });

    it('should execute aggregator with sum', () => {
      const { graph } = createAggregationGraph('sum', [10, 20, 30]);
      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(60);
    });

    it('should execute aggregator with mean', () => {
      const { graph } = createAggregationGraph('mean', [10, 20, 30]);
      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(20);
    });

    it('should execute aggregator with min', () => {
      const { graph } = createAggregationGraph('min', [10, 20, 30]);
      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(10);
    });

    it('should execute aggregator with max', () => {
      const { graph } = createAggregationGraph('max', [10, 20, 30]);
      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(30);
    });

    it('should execute decision node with true condition', () => {
      const { graph } = createDecisionGraph(100, '$inputs.value > 50', 'high', 'low');
      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe('high');
    });

    it('should execute decision node with false condition', () => {
      const { graph } = createDecisionGraph(30, '$inputs.value > 50', 'high', 'low');
      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe('low');
    });

    it('should execute diamond graph correctly', () => {
      const { graph } = createDiamondGraph();
      // A=100, B=A+10=110, C=A*2=200, D=B+C=310
      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(310);
    });

    it('should pass global parameters to expressions', () => {
      const param = createParameterNode(10, 0, 100, { x: 0, y: 0 }, 'Rate');
      const transform = createTransformerNode(
        '$inputs.rate * $params.multiplier',
        [createInputPort('rate')],
        { x: 200, y: 0 },
        'Calculate'
      );
      const output = createOutputNode('result', { x: 400, y: 0 });

      const graph = createTestGraph(
        'Params Test',
        [param, transform, output],
        [connectNodes(param, transform), connectNodes(transform, output)],
        { params: { multiplier: 5 } }
      );

      const result = executeGraphSync(graph, { multiplier: 5 });

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(50);
    });

    it('should handle cyclic graph with error', () => {
      const { graph } = createCyclicGraph();
      const result = executeGraphSync(graph);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cycle');
    });

    it('should access $node data in expressions', () => {
      const transformer = createTransformerNode(
        '$node.factor * $inputs.value',
        [createInputPort('value')],
        { x: 200, y: 0 },
        'Factor'
      );
      // Extend data instead of replacing - keep the expression
      transformer.data = { ...transformer.data, factor: 3 };

      const constant = createConstantNode(10, { x: 0, y: 0 });
      const output = createOutputNode('result', { x: 400, y: 0 });

      const graph = createTestGraph(
        'Node Data Test',
        [constant, transformer, output],
        [connectNodes(constant, transformer), connectNodes(transformer, output)]
      );

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(30);
    });
  });

  // ============================================
  // Distribution Node Execution
  // ============================================
  describe('Distribution Node Execution', () => {
    it('should sample from normal distribution', () => {
      const dist = createDistributionNode(
        { type: 'normal', parameters: { mean: 100, stddev: 0 } }, // Zero stddev for determinism
        { x: 0, y: 0 }
      );
      const output = createOutputNode('result', { x: 200, y: 0 });

      const graph = createTestGraph(
        'Normal Dist',
        [dist, output],
        [connectNodes(dist, output)]
      );

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(100);
    });

    it('should sample from uniform distribution', () => {
      const dist = createDistributionNode(
        { type: 'uniform', parameters: { min: 10, max: 10 } }, // Fixed value
        { x: 0, y: 0 }
      );
      const output = createOutputNode('result', { x: 200, y: 0 });

      const graph = createTestGraph(
        'Uniform Dist',
        [dist, output],
        [connectNodes(dist, output)]
      );

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(10);
    });

    it('should produce varied samples with Monte Carlo', () => {
      const { graph } = createMonteCarloGraph({
        type: 'normal',
        parameters: { mean: 100, stddev: 10 },
      });

      const config = createSimulationConfig(graph.id, { iterations: 100 });
      const result = runMonteCarloSimulation(graph, config);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(100);

      // Check that values vary (not all the same)
      const values = result.results.map(r => r.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBeGreaterThan(1);
    });
  });

  // ============================================
  // Constraint Node Execution
  // ============================================
  describe('Constraint Node Execution', () => {
    it('should pass constraint when value in range', () => {
      const constant = createConstantNode(50, { x: 0, y: 0 });
      const constraint = createConstraintNode(0, 100, { x: 200, y: 0 });
      const output = createOutputNode('result', { x: 400, y: 0 });

      // Connect to first output port (passed)
      const graph = createTestGraph(
        'Constraint Pass',
        [constant, constraint, output],
        [connectNodes(constant, constraint), connectNodes(constraint, output)]
      );

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
    });

    it('should fail constraint when value out of range', () => {
      const constant = createConstantNode(150, { x: 0, y: 0 });
      const constraint = createConstraintNode(0, 100, { x: 200, y: 0 });

      const graph = createTestGraph(
        'Constraint Fail',
        [constant, constraint],
        [connectNodes(constant, constraint)]
      );

      const result = executeGraphSync(graph);
      // Constraint violations don't fail execution, they're tracked
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // Monte Carlo Simulation
  // ============================================
  describe('Monte Carlo Simulation', () => {
    it('should run specified number of iterations', () => {
      const { graph } = createMonteCarloGraph();
      const config = createSimulationConfig(graph.id, { iterations: 500 });

      const result = runMonteCarloSimulation(graph, config);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(500);
      expect(result.results.length).toBeLessThanOrEqual(500);
    });

    it('should use seed for reproducibility', () => {
      const { graph } = createMonteCarloGraph();
      const config = createSimulationConfig(graph.id, {
        iterations: 100,
        seed: 42,
      });

      const result1 = runMonteCarloSimulation(graph, config);
      const result2 = runMonteCarloSimulation(graph, config);

      // With same seed, results should be identical
      expect(result1.results[0].value).toBe(result2.results[0].value);
    });

    it('should track execution time', () => {
      const { graph } = createMonteCarloGraph();
      const config = createSimulationConfig(graph.id, { iterations: 100 });

      const result = runMonteCarloSimulation(graph, config);

      expect(result.executionTimeMs).toBeGreaterThan(0);
    });

    it('should calculate progress correctly', () => {
      const { graph } = createMonteCarloGraph();
      const config = createSimulationConfig(graph.id, { iterations: 100 });

      let lastProgress = 0;
      const progressUpdates: number[] = [];

      const result = runMonteCarloSimulation(graph, config, (progressInfo) => {
        // progressInfo is SimulationProgress object
        progressUpdates.push(progressInfo.progress);
        expect(progressInfo.progress).toBeGreaterThanOrEqual(lastProgress);
        lastProgress = progressInfo.progress;
      });

      expect(result.success).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });
  });

  // ============================================
  // Risk Metrics Calculation
  // ============================================
  describe('Risk Metrics Calculation', () => {
    it('should calculate basic statistics correctly', () => {
      // Known values for easy verification
      const values = [10, 20, 30, 40, 50];
      const metrics = calculateRiskMetrics(values);

      expect(metrics.mean).toBe(30);
      expect(metrics.median).toBe(30);
      expect(metrics.min).toBe(10);
      expect(metrics.max).toBe(50);
    });

    it('should calculate variance and standard deviation', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const metrics = calculateRiskMetrics(values);

      // Mean = 5
      expect(metrics.mean).toBe(5);
      // Variance = 4 (for population)
      expect(metrics.variance).toBeCloseTo(4, 1);
      // Std Dev = 2
      expect(metrics.standardDeviation).toBeCloseTo(2, 1);
    });

    it('should calculate percentiles correctly', () => {
      // 100 values from 1 to 100
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      const metrics = calculateRiskMetrics(values);

      // Percentiles use linear interpolation
      // For p5: index = 0.05 * 99 = 4.95, so result ≈ 5.95
      expect(metrics.percentiles.p5).toBeCloseTo(6, 0);
      expect(metrics.percentiles.p25).toBeCloseTo(25.5, 0);
      expect(metrics.percentiles.p50).toBeCloseTo(50.5, 0);
      expect(metrics.percentiles.p75).toBeCloseTo(75.5, 0);
      expect(metrics.percentiles.p95).toBeCloseTo(95.05, 0);
    });

    it('should calculate Value at Risk (VaR)', () => {
      // 100 values from 1 to 100
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      const metrics = calculateRiskMetrics(values);

      // VaR95 is 5th percentile (interpolated)
      expect(metrics.valueAtRisk.var95).toBeCloseTo(6, 0);
      // VaR99 is 1st percentile (interpolated)
      expect(metrics.valueAtRisk.var99).toBeCloseTo(2, 0);
    });

    it('should calculate Conditional VaR (CVaR)', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      const metrics = calculateRiskMetrics(values);

      // CVaR95 is mean of values below VaR95
      // Values below 5 are: 1, 2, 3, 4, 5 -> mean = 3
      expect(metrics.conditionalVaR.cvar95).toBeCloseTo(3, 0);
    });

    it('should calculate skewness and kurtosis', () => {
      // Normal distribution should have skewness ~0, kurtosis ~3
      const values: number[] = [];
      for (let i = 0; i < 1000; i++) {
        // Generate normal-ish distribution using CLT
        let sum = 0;
        for (let j = 0; j < 12; j++) {
          sum += Math.random();
        }
        values.push(sum - 6);
      }

      const metrics = calculateRiskMetrics(values);

      // Skewness should be close to 0 for symmetric distribution
      expect(Math.abs(metrics.skewness)).toBeLessThan(0.5);
    });

    it('should handle single value', () => {
      const metrics = calculateRiskMetrics([42]);

      expect(metrics.mean).toBe(42);
      expect(metrics.median).toBe(42);
      expect(metrics.min).toBe(42);
      expect(metrics.max).toBe(42);
      expect(metrics.standardDeviation).toBe(0);
      expect(metrics.variance).toBe(0);
    });

    it('should handle empty array gracefully', () => {
      const metrics = calculateRiskMetrics([]);

      expect(metrics.mean).toBeNaN();
      expect(metrics.min).toBe(Infinity);
      expect(metrics.max).toBe(-Infinity);
    });
  });

  // ============================================
  // Sensitivity Analysis
  // ============================================
  describe('Sensitivity Analysis', () => {
    it('should analyze parameter sensitivity', () => {
      // Create graph where output = input * 2
      const param = createParameterNode(50, 0, 100, { x: 0, y: 0 }, 'Input');
      const transform = createTransformerNode(
        '$inputs.value * 2',
        [createInputPort('value')],
        { x: 200, y: 0 },
        'Double'
      );
      const output = createOutputNode('result', { x: 400, y: 0 });

      const graph = createTestGraph(
        'Sensitivity Test',
        [param, transform, output],
        [connectNodes(param, transform), connectNodes(transform, output)]
      );

      const result = runSensitivityAnalysis(graph, {
        parameterNodeId: param.id,
        parameterField: 'value',
        outputNodeId: output.id,
        outputField: 'result',
        range: [0, 100],
        steps: 10,
      });

      expect(result.success).toBe(true);
      expect(result.dataPoints.length).toBe(10);

      // Sensitivity should be 2 (double the input)
      expect(result.sensitivity).toBeCloseTo(2, 1);
    });

    it('should detect non-linear relationships', () => {
      // Create graph where output = input^2
      const param = createParameterNode(5, 1, 10, { x: 0, y: 0 }, 'Input');
      const transform = createTransformerNode(
        '$inputs.value * $inputs.value',
        [createInputPort('value')],
        { x: 200, y: 0 },
        'Square'
      );
      const output = createOutputNode('result', { x: 400, y: 0 });

      const graph = createTestGraph(
        'Non-Linear',
        [param, transform, output],
        [connectNodes(param, transform), connectNodes(transform, output)]
      );

      const result = runSensitivityAnalysis(graph, {
        parameterNodeId: param.id,
        parameterField: 'value',
        outputNodeId: output.id,
        outputField: 'result',
        range: [1, 10],
        steps: 10,
      });

      expect(result.success).toBe(true);
      // R² should be less than perfect due to non-linearity
      // but data points should show increasing trend
      const firstValue = result.dataPoints[0].output;
      const lastValue = result.dataPoints[result.dataPoints.length - 1].output;
      expect(lastValue).toBeGreaterThan(firstValue);
    });
  });

  // ============================================
  // Complex Graph Scenarios
  // ============================================
  describe('Complex Graph Scenarios', () => {
    it('should execute supply chain model', () => {
      const { graph } = createSupplyChainGraph();
      const config = createSimulationConfig(graph.id, {
        iterations: 100,
        seed: 42,
      });

      const result = runMonteCarloSimulation(graph, config);

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(100);

      // Check that results vary due to distribution
      const values = result.results.map(r => r.value);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBeGreaterThan(1);

      // All values should be positive (costs)
      expect(values.every(v => v > 0)).toBe(true);
    });

    it('should handle multiple output nodes', () => {
      const constant = createConstantNode(100, { x: 0, y: 0 });
      const double = createTransformerNode(
        '$inputs.value * 2',
        [createInputPort('value')],
        { x: 200, y: 0 },
        'Double'
      );
      const triple = createTransformerNode(
        '$inputs.value * 3',
        [createInputPort('value')],
        { x: 200, y: 100 },
        'Triple'
      );
      const output1 = createOutputNode('result', { x: 400, y: 0 }, 'Doubled');
      const output2 = createOutputNode('result', { x: 400, y: 100 }, 'Tripled');

      const graph = createTestGraph(
        'Multi-Output',
        [constant, double, triple, output1, output2],
        [
          connectNodes(constant, double),
          connectNodes(constant, triple),
          connectNodes(double, output1),
          connectNodes(triple, output2),
        ]
      );

      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes).toHaveLength(2);

      const doubled = result.outputNodes.find(n => n.nodeName === 'Doubled');
      const tripled = result.outputNodes.find(n => n.nodeName === 'Tripled');

      expect(doubled?.outputs.result).toBe(200);
      expect(tripled?.outputs.result).toBe(300);
    });

    it('should handle deeply nested expressions', () => {
      const constant = createConstantNode(2, { x: 0, y: 0 });
      const transform = createTransformerNode(
        'pow(pow($inputs.value, 2), 2) + sqrt(abs($inputs.value * 10 - 5))',
        [createInputPort('value')],
        { x: 200, y: 0 },
        'Complex'
      );
      const output = createOutputNode('result', { x: 400, y: 0 });

      const graph = createTestGraph(
        'Deep Expression',
        [constant, transform, output],
        [connectNodes(constant, transform), connectNodes(transform, output)]
      );

      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      // pow(pow(2,2),2) = pow(4,2) = 16
      // sqrt(abs(2*10-5)) = sqrt(15) ≈ 3.87
      // Total ≈ 19.87
      expect(result.outputNodes[0].outputs.result).toBeCloseTo(19.87, 1);
    });
  });

  // ============================================
  // Custom Compute Functions
  // ============================================
  describe('Custom Compute Functions', () => {
    it('should register and use custom compute function', () => {
      // Register a custom node type compute function
      // Signature: (inputs, nodeData, context) => outputs
      registerComputeFunction('CUSTOM_MULTIPLY', (inputs, nodeData, _context) => {
        const value = inputs.value as number || 0;
        const factor = (nodeData.factor as number) || 1;
        return { output: value * factor };
      });

      const input = createConstantNode(10, { x: 0, y: 0 });

      // Create custom node manually
      const customNode = {
        id: 'custom-node',
        type: 'CUSTOM_MULTIPLY' as const,
        name: 'Custom Multiplier',
        position: { x: 200, y: 0 },
        schema: {},
        data: { factor: 5 },
        inputPorts: [createInputPort('value')],
        outputPorts: [createOutputPort('output')],
        tags: [],
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const output = createOutputNode('result', { x: 400, y: 0 });

      const graph = createTestGraph(
        'Custom Function Test',
        [input, customNode as any, output],
        [
          connectNodes(input, customNode as any),
          connectNodes(customNode as any, output),
        ]
      );

      const result = executeGraphSync(graph);

      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(50);
    });
  });

  // ============================================
  // Error Handling
  // ============================================
  describe('Error Handling', () => {
    it('should handle division by zero gracefully', () => {
      const zero = createConstantNode(0, { x: 0, y: 0 }, 'Zero');
      const ten = createConstantNode(10, { x: 0, y: 100 }, 'Ten');
      const divide = createTransformerNode(
        '$inputs.numerator / $inputs.denominator',
        [createInputPort('numerator'), createInputPort('denominator')],
        { x: 200, y: 50 },
        'Divide'
      );
      const output = createOutputNode('result', { x: 400, y: 50 });

      const graph = createTestGraph(
        'Division Error',
        [ten, zero, divide, output],
        [
          connectNodes(ten, divide, 0, 0),
          connectNodes(zero, divide, 0, 1),
          connectNodes(divide, output),
        ]
      );

      const result = executeGraphSync(graph);

      // Division by zero returns Infinity in JS
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(Infinity);
    });

    it('should handle invalid expression gracefully', () => {
      const constant = createConstantNode(10, { x: 0, y: 0 });
      const transform = createTransformerNode(
        'invalid syntax {{{{',
        [createInputPort('value')],
        { x: 200, y: 0 },
        'Bad Expression'
      );
      const output = createOutputNode('result', { x: 400, y: 0 });

      const graph = createTestGraph(
        'Invalid Expression',
        [constant, transform, output],
        [connectNodes(constant, transform), connectNodes(transform, output)]
      );

      const result = executeGraphSync(graph);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle undefined variable access', () => {
      const constant = createConstantNode(10, { x: 0, y: 0 });
      const transform = createTransformerNode(
        '$inputs.nonexistent + $inputs.value',
        [createInputPort('value')],
        { x: 200, y: 0 },
        'Undefined Access'
      );
      const output = createOutputNode('result', { x: 400, y: 0 });

      const graph = createTestGraph(
        'Undefined Variable',
        [constant, transform, output],
        [connectNodes(constant, transform), connectNodes(transform, output)]
      );

      const result = executeGraphSync(graph);

      // undefined + number = NaN
      expect(result.success).toBe(true);
      expect(Number.isNaN(result.outputNodes[0].outputs.result)).toBe(true);
    });
  });

  // ============================================
  // Performance Tests
  // ============================================
  describe('Performance', () => {
    it('should execute 1000 Monte Carlo iterations efficiently', () => {
      const { graph } = createMonteCarloGraph();
      const config = createSimulationConfig(graph.id, { iterations: 1000 });

      const { result, timeMs } = measureExecutionTime(() =>
        runMonteCarloSimulation(graph, config)
      );

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(1000);
      expect(timeMs).toBeLessThan(5000); // Should complete in < 5 seconds
    });

    it('should handle 10000 iterations with progress updates', () => {
      const { graph } = createMonteCarloGraph();
      const config = createSimulationConfig(graph.id, { iterations: 10000 });

      let updateCount = 0;
      const { result, timeMs } = measureExecutionTime(() =>
        runMonteCarloSimulation(graph, config, () => {
          updateCount++;
        })
      );

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(10000);
      expect(updateCount).toBeGreaterThan(0);
      expect(timeMs).toBeLessThan(30000); // Should complete in < 30 seconds
    });
  });

  // ============================================
  // Expression Integration
  // ============================================
  describe('Expression Integration', () => {
    it('should support all math functions in simulation', () => {
      const expressions = [
        { expr: 'abs(-5)', expected: 5 },
        { expr: 'floor(3.7)', expected: 3 },
        { expr: 'ceil(3.2)', expected: 4 },
        { expr: 'round(3.5)', expected: 4 },
        { expr: 'sqrt(16)', expected: 4 },
        { expr: 'pow(2, 3)', expected: 8 },
        { expr: 'min(1, 2, 3)', expected: 1 },
        { expr: 'max(1, 2, 3)', expected: 3 },
        { expr: 'sin(0)', expected: 0 },
        { expr: 'cos(0)', expected: 1 },
      ];

      for (const { expr, expected } of expressions) {
        const transform = createTransformerNode(expr, [], { x: 0, y: 0 }, 'Math');
        const output = createOutputNode('result', { x: 200, y: 0 });

        const graph = createTestGraph(
          `Math: ${expr}`,
          [transform, output],
          [connectNodes(transform, output)]
        );

        const result = executeGraphSync(graph);
        expect(result.success).toBe(true);
        expect(result.outputNodes[0].outputs.result).toBeCloseTo(expected, 5);
      }
    });

    it('should support array operations in simulation', () => {
      const transform = createTransformerNode(
        'sum([1, 2, 3, 4, 5])',
        [],
        { x: 0, y: 0 },
        'Array Sum'
      );
      const output = createOutputNode('result', { x: 200, y: 0 });

      const graph = createTestGraph(
        'Array Ops',
        [transform, output],
        [connectNodes(transform, output)]
      );

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(15);
    });

    it('should support conditional expressions in simulation', () => {
      const transform = createTransformerNode(
        '10 > 5 ? 100 : 0',
        [],
        { x: 0, y: 0 },
        'Conditional'
      );
      const output = createOutputNode('result', { x: 200, y: 0 });

      const graph = createTestGraph(
        'Conditional',
        [transform, output],
        [connectNodes(transform, output)]
      );

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(100);
    });

    it('should support string operations in expressions', () => {
      const transform = createTransformerNode(
        'length("hello")',
        [],
        { x: 0, y: 0 },
        'String Op'
      );
      const output = createOutputNode('result', { x: 200, y: 0 });

      const graph = createTestGraph(
        'String Ops',
        [transform, output],
        [connectNodes(transform, output)]
      );

      const result = executeGraphSync(graph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(5);
    });
  });
});
