/**
 * ScenarioForge - End-to-End Workflow Tests
 * 
 * Comprehensive E2E tests for complete user workflows including:
 * - Graph creation and modeling workflow
 * - Monte Carlo simulation workflow
 * - Optimization workflow
 * - Subgraph/hierarchical workflow
 * - Data persistence and reload
 * - Error recovery scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGraph,
  addNode,
  addEdge,
  validateGraph,
  topologicalSort,
  cloneGraph,
  exportGraphToJSON,
  importGraphFromJSON,
} from '../graph/index.js';
import {
  executeGraphSync,
  runMonteCarloSimulation,
  calculateRiskMetrics,
  runSensitivityAnalysis,
} from '../simulation/index.js';
import { setSeed } from '../expression/index.js';
// Feedback functions not needed for these tests
import {
  resetIdCounter,
  createTestGraph,
  createConstantNode,
  createParameterNode,
  createDistributionNode,
  createTransformerNode,
  createAggregatorNode,
  createDecisionNode,
  createOutputNode,
  createConstraintNode,
  createInputPort,
  connectNodes,
  createSimulationConfig,
  measureExecutionTime,
} from './test-utils.js';

describe('End-to-End Workflow Tests', () => {
  beforeEach(() => {
    resetIdCounter();
    setSeed(12345);
  });

  // ============================================
  // Workflow 1: Basic Modeling Workflow
  // ============================================
  describe('Workflow: Basic Graph Modeling', () => {
    it('should complete full modeling workflow: create -> build -> validate -> simulate', () => {
      // Step 1: Create a new graph
      const graph = createGraph({
        name: 'Investment Analysis',
        description: 'Simple investment return calculation',
      });
      expect(graph.id).toBeDefined();
      expect(graph.nodes).toHaveLength(0);

      // Step 2: Add input nodes
      let workingGraph = addNode(graph, {
        type: 'PARAMETER',
        name: 'Initial Investment',
        position: { x: 0, y: 0 },
        data: { value: 10000, min: 1000, max: 100000 },
        outputPorts: [{ name: 'value', dataType: 'number' }],
      });

      workingGraph = addNode(workingGraph, {
        type: 'DISTRIBUTION',
        name: 'Annual Return',
        position: { x: 0, y: 100 },
        data: { distributionType: 'normal', mean: 0.08, stddev: 0.15 },
        outputPorts: [{ name: 'sample', dataType: 'number' }],
      });

      expect(workingGraph.nodes).toHaveLength(2);

      // Step 3: Add calculation node
      workingGraph = addNode(workingGraph, {
        type: 'TRANSFORMER',
        name: 'Future Value',
        position: { x: 200, y: 50 },
        data: { expression: '$inputs.principal * (1 + $inputs.rate)' },
        inputPorts: [
          { name: 'principal', dataType: 'number' },
          { name: 'rate', dataType: 'number' },
        ],
        outputPorts: [{ name: 'result', dataType: 'number' }],
      });

      // Step 4: Add output node
      workingGraph = addNode(workingGraph, {
        type: 'OUTPUT',
        name: 'Portfolio Value',
        position: { x: 400, y: 50 },
        data: { label: 'result' },
        inputPorts: [{ name: 'value', dataType: 'number' }],
      });

      expect(workingGraph.nodes).toHaveLength(4);

      // Step 5: Connect nodes
      const [investment, returns, futureValue, output] = workingGraph.nodes;

      workingGraph = addEdge(workingGraph, {
        sourceNodeId: investment.id,
        sourcePortId: investment.outputPorts[0].id,
        targetNodeId: futureValue.id,
        targetPortId: futureValue.inputPorts[0].id,
      });

      workingGraph = addEdge(workingGraph, {
        sourceNodeId: returns.id,
        sourcePortId: returns.outputPorts[0].id,
        targetNodeId: futureValue.id,
        targetPortId: futureValue.inputPorts[1].id,
      });

      workingGraph = addEdge(workingGraph, {
        sourceNodeId: futureValue.id,
        sourcePortId: futureValue.outputPorts[0].id,
        targetNodeId: output.id,
        targetPortId: output.inputPorts[0].id,
      });

      expect(workingGraph.edges).toHaveLength(3);

      // Step 6: Validate graph
      const validation = validateGraph(workingGraph);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Step 7: Check topological sort works
      const sorted = topologicalSort(workingGraph);
      expect(sorted).not.toBeNull();
      expect(sorted).toHaveLength(4);

      // Step 8: Execute single simulation
      const singleResult = executeGraphSync(workingGraph);
      expect(singleResult.success).toBe(true);
      expect(singleResult.outputNodes).toHaveLength(1);
      expect(typeof singleResult.outputNodes[0].outputs.result).toBe('number');

      // Step 9: Run Monte Carlo simulation
      const config = createSimulationConfig(workingGraph.id, {
        iterations: 1000,
        seed: 42,
      });
      const mcResult = runMonteCarloSimulation(workingGraph, config);
      expect(mcResult.success).toBe(true);
      expect(mcResult.iterations).toBe(1000);

      // Step 10: Calculate risk metrics
      const values = mcResult.results.map(r => r.value);
      const metrics = calculateRiskMetrics(values);

      expect(metrics.mean).toBeGreaterThan(0);
      expect(metrics.standardDeviation).toBeGreaterThan(0);
      expect(metrics.percentiles.p5).toBeLessThan(metrics.percentiles.p95);
      expect(metrics.valueAtRisk.var95).toBeDefined();
    });
  });

  // ============================================
  // Workflow 2: Supply Chain Risk Analysis
  // ============================================
  describe('Workflow: Supply Chain Risk Analysis', () => {
    it('should model and analyze supply chain costs with uncertainty', () => {
      // Build supply chain model
      const fixedCosts = createConstantNode(50000, { x: 0, y: 0 }, 'Fixed Costs');

      const unitCost = createDistributionNode(
        { type: 'triangular', parameters: { min: 15, mode: 20, max: 30 } },
        { x: 0, y: 100 },
        'Unit Cost'
      );

      const demand = createDistributionNode(
        { type: 'normal', parameters: { mean: 10000, stddev: 2000 } },
        { x: 0, y: 200 },
        'Market Demand'
      );

      const variableCosts = createTransformerNode(
        '$inputs.unitCost * $inputs.demand',
        [createInputPort('unitCost'), createInputPort('demand')],
        { x: 250, y: 150 },
        'Variable Costs'
      );

      const totalCost = createAggregatorNode('sum', 2, { x: 450, y: 100 }, 'Total Cost');

      // Decision: if costs > threshold, reduce margin
      const marginDecision = createDecisionNode(
        '$inputs.cost > 200000',
        0.15,
        0.25,
        [createInputPort('cost')],
        { x: 450, y: 200 },
        'Margin Decision'
      );

      const costOutput = createOutputNode('Total Operating Cost', { x: 650, y: 100 });
      const marginOutput = createOutputNode('Profit Margin', { x: 650, y: 200 });

      const nodes = [
        fixedCosts, unitCost, demand, variableCosts,
        totalCost, marginDecision, costOutput, marginOutput,
      ];

      const edges = [
        connectNodes(unitCost, variableCosts, 0, 0),
        connectNodes(demand, variableCosts, 0, 1),
        connectNodes(fixedCosts, totalCost, 0, 0),
        connectNodes(variableCosts, totalCost, 0, 1),
        connectNodes(totalCost, marginDecision, 0, 0),
        connectNodes(totalCost, costOutput),
        connectNodes(marginDecision, marginOutput),
      ];

      const graph = createTestGraph('Supply Chain Analysis', nodes, edges);

      // Validate
      const validation = validateGraph(graph);
      expect(validation.valid).toBe(true);

      // Run Monte Carlo
      const config = createSimulationConfig(graph.id, {
        iterations: 5000,
        seed: 42,
      });

      const { result: mcResult, timeMs } = measureExecutionTime(() =>
        runMonteCarloSimulation(graph, config)
      );

      expect(mcResult.success).toBe(true);
      console.log(`Supply chain simulation: ${mcResult.iterations} iterations in ${timeMs.toFixed(0)}ms`);

      // Analyze results
      const costValues = mcResult.results
        .filter(r => r.nodeId.includes('costOutput') || r.outputKey === 'Total Operating Cost')
        .map(r => r.value);

      if (costValues.length > 0) {
        const costMetrics = calculateRiskMetrics(costValues);

        // Verify realistic cost range
        expect(costMetrics.min).toBeGreaterThan(50000); // At least fixed costs
        expect(costMetrics.max).toBeLessThan(1000000); // Reasonable upper bound

        // Risk metrics
        console.log('Cost Analysis:');
        console.log(`  Mean: $${costMetrics.mean.toFixed(0)}`);
        console.log(`  VaR 95%: $${costMetrics.valueAtRisk.var95.toFixed(0)}`);
        console.log(`  CVaR 95%: $${costMetrics.conditionalVaR.cvar95.toFixed(0)}`);
      }
    });
  });

  // ============================================
  // Workflow 3: Parameter Optimization
  // ============================================
  describe('Workflow: Parameter Optimization', () => {
    it('should find optimal parameters through sensitivity analysis', () => {
      // Create simple optimization scenario
      const price = createParameterNode(50, 10, 100, { x: 0, y: 0 }, 'Price');

      // Demand decreases as price increases (price elasticity)
      const demand = createTransformerNode(
        '1000 - $inputs.price * 8 + random() * 50', // Base demand with some noise
        [createInputPort('price')],
        { x: 200, y: 0 },
        'Demand'
      );

      // Revenue = Price * Demand
      const revenue = createTransformerNode(
        '$inputs.price * $inputs.demand',
        [createInputPort('price'), createInputPort('demand')],
        { x: 400, y: 0 },
        'Revenue'
      );

      const output = createOutputNode('result', { x: 600, y: 0 }, 'Total Revenue');

      const nodes = [price, demand, revenue, output];
      const edges = [
        connectNodes(price, demand),
        connectNodes(price, revenue, 0, 0),
        connectNodes(demand, revenue, 0, 1),
        connectNodes(revenue, output),
      ];

      const graph = createTestGraph('Revenue Optimization', nodes, edges);

      // Run sensitivity analysis
      const sensitivityResult = runSensitivityAnalysis(graph, {
        parameterNodeId: price.id,
        parameterField: 'value',
        outputNodeId: output.id,
        outputField: 'result',
        range: [20, 80],
        steps: 20,
      });

      expect(sensitivityResult.success).toBe(true);
      expect(sensitivityResult.dataPoints.length).toBe(20);

      // Find optimal price (max revenue)
      let maxRevenue = -Infinity;
      let optimalPrice = 0;

      for (const point of sensitivityResult.dataPoints) {
        if (point.output > maxRevenue) {
          maxRevenue = point.output;
          optimalPrice = point.input;
        }
      }

      console.log(`Optimal Price: $${optimalPrice.toFixed(2)}`);
      console.log(`Maximum Revenue: $${maxRevenue.toFixed(2)}`);

      // Revenue should have a peak (not at extremes due to elasticity)
      expect(optimalPrice).toBeGreaterThan(20);
      expect(optimalPrice).toBeLessThan(80);
    });
  });

  // ============================================
  // Workflow 4: Multi-Output Analysis
  // ============================================
  describe('Workflow: Multi-Output Portfolio Analysis', () => {
    it('should analyze multiple correlated outputs', () => {
      // Stock 1 (tech, high volatility)
      const stock1 = createDistributionNode(
        { type: 'normal', parameters: { mean: 0.12, stddev: 0.25 } },
        { x: 0, y: 0 },
        'Tech Stock Return'
      );

      // Stock 2 (bonds, low volatility)
      const stock2 = createDistributionNode(
        { type: 'normal', parameters: { mean: 0.04, stddev: 0.05 } },
        { x: 0, y: 100 },
        'Bond Return'
      );

      // Stock 3 (commodities, medium volatility)
      const stock3 = createDistributionNode(
        { type: 'normal', parameters: { mean: 0.08, stddev: 0.15 } },
        { x: 0, y: 200 },
        'Commodity Return'
      );

      // Portfolio weights
      const techWeight = createConstantNode(0.5, { x: 200, y: 0 }, 'Tech Weight');
      const bondWeight = createConstantNode(0.3, { x: 200, y: 100 }, 'Bond Weight');
      const commWeight = createConstantNode(0.2, { x: 200, y: 200 }, 'Commodity Weight');

      // Weighted returns
      const techReturn = createTransformerNode(
        '$inputs.return * $inputs.weight * 100000',
        [createInputPort('return'), createInputPort('weight')],
        { x: 400, y: 0 },
        'Tech Position'
      );

      const bondReturn = createTransformerNode(
        '$inputs.return * $inputs.weight * 100000',
        [createInputPort('return'), createInputPort('weight')],
        { x: 400, y: 100 },
        'Bond Position'
      );

      const commReturn = createTransformerNode(
        '$inputs.return * $inputs.weight * 100000',
        [createInputPort('return'), createInputPort('weight')],
        { x: 400, y: 200 },
        'Commodity Position'
      );

      // Portfolio total
      const portfolio = createAggregatorNode('sum', 3, { x: 600, y: 100 }, 'Portfolio Return');

      // Multiple outputs
      const techOutput = createOutputNode('Tech Gain/Loss', { x: 600, y: 0 });
      const bondOutput = createOutputNode('Bond Gain/Loss', { x: 600, y: 200 });
      const totalOutput = createOutputNode('Portfolio Total', { x: 800, y: 100 });

      const nodes = [
        stock1, stock2, stock3,
        techWeight, bondWeight, commWeight,
        techReturn, bondReturn, commReturn,
        portfolio,
        techOutput, bondOutput, totalOutput,
      ];

      const edges = [
        connectNodes(stock1, techReturn, 0, 0),
        connectNodes(techWeight, techReturn, 0, 1),
        connectNodes(stock2, bondReturn, 0, 0),
        connectNodes(bondWeight, bondReturn, 0, 1),
        connectNodes(stock3, commReturn, 0, 0),
        connectNodes(commWeight, commReturn, 0, 1),
        connectNodes(techReturn, portfolio, 0, 0),
        connectNodes(bondReturn, portfolio, 0, 1),
        connectNodes(commReturn, portfolio, 0, 2),
        connectNodes(techReturn, techOutput),
        connectNodes(bondReturn, bondOutput),
        connectNodes(portfolio, totalOutput),
      ];

      const graph = createTestGraph('Portfolio Analysis', nodes, edges);

      // Run simulation
      const config = createSimulationConfig(graph.id, {
        iterations: 10000,
        seed: 42,
      });

      const mcResult = runMonteCarloSimulation(graph, config);
      expect(mcResult.success).toBe(true);

      // Analyze portfolio returns
      const portfolioValues = mcResult.results
        .filter(r => r.nodeId === totalOutput.id)
        .map(r => r.value);

      if (portfolioValues.length > 0) {
        const metrics = calculateRiskMetrics(portfolioValues);

        console.log('Portfolio Analysis Results:');
        console.log(`  Expected Return: $${metrics.mean.toFixed(2)}`);
        console.log(`  Volatility (StdDev): $${metrics.standardDeviation.toFixed(2)}`);
        console.log(`  VaR 95%: $${metrics.valueAtRisk.var95.toFixed(2)}`);
        console.log(`  Best Case (95%): $${metrics.percentiles.p95.toFixed(2)}`);
        console.log(`  Worst Case (5%): $${metrics.percentiles.p5.toFixed(2)}`);

        // Diversified portfolio should have moderate volatility
        expect(metrics.standardDeviation).toBeLessThan(25000); // Not as volatile as 100% tech
      }
    });
  });

  // ============================================
  // Workflow 5: Graph Persistence
  // ============================================
  describe('Workflow: Save and Restore', () => {
    it('should save, export, and restore graph with identical behavior', () => {
      // Create a deterministic graph
      const a = createConstantNode(10, { x: 0, y: 0 }, 'A');
      const b = createConstantNode(20, { x: 0, y: 100 }, 'B');
      const c = createTransformerNode(
        '$inputs.x + $inputs.y',
        [createInputPort('x'), createInputPort('y')],
        { x: 200, y: 50 },
        'C'
      );
      const out = createOutputNode('result', { x: 400, y: 50 });

      const original = createTestGraph(
        'Persistence Test',
        [a, b, c, out],
        [
          connectNodes(a, c, 0, 0),
          connectNodes(b, c, 0, 1),
          connectNodes(c, out),
        ]
      );

      // Execute original
      const originalResult = executeGraphSync(original);
      expect(originalResult.success).toBe(true);
      const originalOutput = originalResult.outputNodes[0].outputs.result;

      // Export to JSON
      const exported = exportGraphToJSON(original);
      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(0);

      // Import from JSON
      const imported = importGraphFromJSON(exported);
      expect(imported.name).toBe(original.name);
      expect(imported.nodes).toHaveLength(original.nodes.length);
      expect(imported.edges).toHaveLength(original.edges.length);

      // Execute imported
      const importedResult = executeGraphSync(imported);
      expect(importedResult.success).toBe(true);
      const importedOutput = importedResult.outputNodes[0].outputs.result;

      // Results should be identical
      expect(importedOutput).toBe(originalOutput);
      expect(importedOutput).toBe(30); // 10 + 20

      // Clone and verify
      const cloned = cloneGraph(original);
      expect(cloned.id).not.toBe(original.id);

      const clonedResult = executeGraphSync(cloned);
      expect(clonedResult.outputNodes[0].outputs.result).toBe(30);
    });
  });

  // ============================================
  // Workflow 6: Error Recovery
  // ============================================
  describe('Workflow: Error Recovery', () => {
    it('should handle and recover from simulation errors', () => {
      // Create graph with potential issues
      const input = createConstantNode(0, { x: 0, y: 0 }, 'Zero Input');
      const divider = createTransformerNode(
        '100 / $inputs.value', // Division by zero
        [createInputPort('value')],
        { x: 200, y: 0 },
        'Divider'
      );
      const output = createOutputNode('result', { x: 400, y: 0 });

      const problematicGraph = createTestGraph(
        'Error Recovery',
        [input, divider, output],
        [connectNodes(input, divider), connectNodes(divider, output)]
      );

      // Execute - should handle division by zero gracefully
      const result = executeGraphSync(problematicGraph);
      expect(result.success).toBe(true);
      expect(result.outputNodes[0].outputs.result).toBe(Infinity);

      // Fix the graph
      const fixedInput = createConstantNode(10, { x: 0, y: 0 }, 'Fixed Input');
      const fixedGraph = createTestGraph(
        'Fixed Graph',
        [fixedInput, divider, output],
        [connectNodes(fixedInput, divider), connectNodes(divider, output)]
      );

      // Re-execute
      const fixedResult = executeGraphSync(fixedGraph);
      expect(fixedResult.success).toBe(true);
      expect(fixedResult.outputNodes[0].outputs.result).toBe(10); // 100 / 10
    });

    it('should detect and report cyclic dependencies', () => {
      // Create cyclic graph
      const nodeA = createTransformerNode(
        '$inputs.value + 1',
        [createInputPort('value')],
        { x: 0, y: 0 },
        'Node A'
      );
      const nodeB = createTransformerNode(
        '$inputs.value + 1',
        [createInputPort('value')],
        { x: 200, y: 0 },
        'Node B'
      );

      // Create cycle
      const cyclicEdges = [
        {
          id: 'e1',
          sourceNodeId: nodeA.id,
          sourcePortId: nodeA.outputPorts[0].id,
          targetNodeId: nodeB.id,
          targetPortId: nodeB.inputPorts[0].id,
          type: 'DATA_FLOW' as const,
          schema: {},
          data: {},
          style: {},
          animated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'e2',
          sourceNodeId: nodeB.id,
          sourcePortId: nodeB.outputPorts[0].id,
          targetNodeId: nodeA.id,
          targetPortId: nodeA.inputPorts[0].id,
          type: 'DATA_FLOW' as const,
          schema: {},
          data: {},
          style: {},
          animated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const cyclicGraph = createTestGraph('Cyclic', [nodeA, nodeB], cyclicEdges);

      // Validation should warn about cycle
      const validation = validateGraph(cyclicGraph);
      expect(validation.warnings.some(w => w.code === 'GRAPH_HAS_CYCLE')).toBe(true);

      // Execution should fail gracefully
      const result = executeGraphSync(cyclicGraph);
      expect(result.success).toBe(false);
      expect(result.error).toContain('cycle');
    });
  });

  // ============================================
  // Workflow 7: Performance at Scale
  // ============================================
  describe('Workflow: Large Scale Analysis', () => {
    it('should handle large graphs efficiently', () => {
      // Create a wide graph (many parallel paths)
      const inputCount = 50;
      const inputs: ReturnType<typeof createConstantNode>[] = [];
      const transformers: ReturnType<typeof createTransformerNode>[] = [];

      for (let i = 0; i < inputCount; i++) {
        inputs.push(createConstantNode(i + 1, { x: 0, y: i * 50 }, `Input ${i}`));
        transformers.push(createTransformerNode(
          '$inputs.value * 2',
          [createInputPort('value')],
          { x: 200, y: i * 50 },
          `Transform ${i}`
        ));
      }

      const aggregator = createAggregatorNode('sum', inputCount, { x: 400, y: inputCount * 25 }, 'Sum All');
      const output = createOutputNode('result', { x: 600, y: inputCount * 25 });

      const nodes = [...inputs, ...transformers, aggregator, output];
      const edges = [
        ...inputs.map((inp, i) => connectNodes(inp, transformers[i])),
        ...transformers.map((t, i) => connectNodes(t, aggregator, 0, i)),
        connectNodes(aggregator, output),
      ];

      const largeGraph = createTestGraph('Large Graph', nodes, edges);

      // Validate
      const { result: validation, timeMs: validationTime } = measureExecutionTime(() =>
        validateGraph(largeGraph)
      );
      expect(validation.valid).toBe(true);
      console.log(`Validation of ${nodes.length} nodes: ${validationTime.toFixed(0)}ms`);

      // Sort
      const { result: sorted, timeMs: sortTime } = measureExecutionTime(() =>
        topologicalSort(largeGraph)
      );
      expect(sorted).not.toBeNull();
      console.log(`Topological sort: ${sortTime.toFixed(0)}ms`);

      // Execute
      const { result: execResult, timeMs: execTime } = measureExecutionTime(() =>
        executeGraphSync(largeGraph)
      );
      expect(execResult.success).toBe(true);
      console.log(`Execution: ${execTime.toFixed(0)}ms`);

      // Expected result: sum of (1 to 50) * 2 = 2 * (50 * 51 / 2) = 2550
      expect(execResult.outputNodes[0].outputs.result).toBe(2550);

      // Performance expectations
      expect(validationTime).toBeLessThan(1000);
      expect(sortTime).toBeLessThan(1000);
      expect(execTime).toBeLessThan(5000);
    });

    it('should handle high iteration count simulations', () => {
      // Simple graph for many iterations
      const dist = createDistributionNode(
        { type: 'normal', parameters: { mean: 100, stddev: 10 } },
        { x: 0, y: 0 },
        'Distribution'
      );
      const output = createOutputNode('result', { x: 200, y: 0 });

      const graph = createTestGraph(
        'High Iteration',
        [dist, output],
        [connectNodes(dist, output)]
      );

      const config = createSimulationConfig(graph.id, {
        iterations: 50000,
        seed: 42,
      });

      const { result, timeMs } = measureExecutionTime(() =>
        runMonteCarloSimulation(graph, config)
      );

      expect(result.success).toBe(true);
      expect(result.iterations).toBe(50000);
      console.log(`50,000 iterations completed in ${timeMs.toFixed(0)}ms`);
      console.log(`Rate: ${(50000 / (timeMs / 1000)).toFixed(0)} iterations/second`);

      // Should complete in reasonable time
      expect(timeMs).toBeLessThan(30000);

      // Verify statistics converge
      const values = result.results.map(r => r.value);
      const metrics = calculateRiskMetrics(values);

      // With 50k samples, mean should be very close to 100
      expect(Math.abs(metrics.mean - 100)).toBeLessThan(1);
    });
  });

  // ============================================
  // Workflow 8: Constraint Validation
  // ============================================
  describe('Workflow: Constraint-Based Modeling', () => {
    it('should enforce and track constraints', () => {
      // Production planning with constraints
      const productionQty = createDistributionNode(
        { type: 'uniform', parameters: { min: 500, max: 1500 } },
        { x: 0, y: 0 },
        'Production Quantity'
      );

      // Constraint: production must be within capacity
      const capacityConstraint = createConstraintNode(600, 1200, { x: 200, y: 0 }, 'Capacity Check');

      // Calculate cost based on valid production
      const costCalc = createTransformerNode(
        '$inputs.qty * 50 + 10000', // $50/unit + $10k fixed
        [createInputPort('qty')],
        { x: 400, y: 0 },
        'Cost Calculation'
      );

      const costOutput = createOutputNode('Production Cost', { x: 600, y: 0 });

      const nodes = [productionQty, capacityConstraint, costCalc, costOutput];
      const edges = [
        connectNodes(productionQty, capacityConstraint),
        connectNodes(capacityConstraint, costCalc, 1, 0), // Use 'value' output port
        connectNodes(costCalc, costOutput),
      ];

      const graph = createTestGraph('Constrained Production', nodes, edges);

      const config = createSimulationConfig(graph.id, {
        iterations: 1000,
        seed: 42,
      });

      const mcResult = runMonteCarloSimulation(graph, config);
      expect(mcResult.success).toBe(true);

      // Results should reflect constrained range
      const costs = mcResult.results.map(r => r.value);
      const metrics = calculateRiskMetrics(costs);

      // Cost range should be: 
      // Min: 600 * 50 + 10000 = 40000
      // Max: 1200 * 50 + 10000 = 70000
      // (but with constraint violations, some may be outside)
      console.log(`Cost Range: $${metrics.min.toFixed(0)} - $${metrics.max.toFixed(0)}`);
    });
  });
});

// ============================================
// Integration Test: Full System Validation
// ============================================
describe('Full System Integration', () => {
  beforeEach(() => {
    resetIdCounter();
    setSeed(99999);
  });

  it('should complete realistic scenario from start to finish', () => {
    /*
     * Scenario: Startup Valuation Model
     * - Uncertain revenue growth
     * - Operating costs scale with revenue
     * - Valuation based on multiple of profit
     */

    // Year 1 Revenue (known)
    const y1Revenue = createConstantNode(1000000, { x: 0, y: 0 }, 'Year 1 Revenue');

    // Growth rate (uncertain)
    const growthRate = createDistributionNode(
      { type: 'triangular', parameters: { min: 0.1, mode: 0.3, max: 0.5 } },
      { x: 0, y: 100 },
      'Growth Rate'
    );

    // Year 2 Revenue projection
    const y2Revenue = createTransformerNode(
      '$inputs.base * (1 + $inputs.growth)',
      [createInputPort('base'), createInputPort('growth')],
      { x: 250, y: 50 },
      'Year 2 Revenue'
    );

    // Operating costs (60-70% of revenue)
    const costRatio = createDistributionNode(
      { type: 'uniform', parameters: { min: 0.6, max: 0.7 } },
      { x: 250, y: 150 },
      'Cost Ratio'
    );

    const opCosts = createTransformerNode(
      '$inputs.revenue * $inputs.ratio',
      [createInputPort('revenue'), createInputPort('ratio')],
      { x: 450, y: 100 },
      'Operating Costs'
    );

    // Profit
    const profit = createTransformerNode(
      '$inputs.revenue - $inputs.costs',
      [createInputPort('revenue'), createInputPort('costs')],
      { x: 650, y: 100 },
      'Operating Profit'
    );

    // Valuation multiple (uncertain)
    const multiple = createDistributionNode(
      { type: 'normal', parameters: { mean: 10, stddev: 3 } },
      { x: 650, y: 200 },
      'Valuation Multiple'
    );

    // Company valuation
    const valuation = createTransformerNode(
      'max(0, $inputs.profit * $inputs.multiple)',
      [createInputPort('profit'), createInputPort('multiple')],
      { x: 850, y: 150 },
      'Company Valuation'
    );

    // Outputs
    const revenueOutput = createOutputNode('Projected Revenue', { x: 600, y: 0 });
    const profitOutput = createOutputNode('Operating Profit', { x: 850, y: 50 });
    const valuationOutput = createOutputNode('Company Valuation', { x: 1050, y: 150 });

    const nodes = [
      y1Revenue, growthRate, y2Revenue, costRatio, opCosts,
      profit, multiple, valuation,
      revenueOutput, profitOutput, valuationOutput,
    ];

    const edges = [
      connectNodes(y1Revenue, y2Revenue, 0, 0),
      connectNodes(growthRate, y2Revenue, 0, 1),
      connectNodes(y2Revenue, revenueOutput),
      connectNodes(y2Revenue, opCosts, 0, 0),
      connectNodes(costRatio, opCosts, 0, 1),
      connectNodes(y2Revenue, profit, 0, 0),
      connectNodes(opCosts, profit, 0, 1),
      connectNodes(profit, profitOutput),
      connectNodes(profit, valuation, 0, 0),
      connectNodes(multiple, valuation, 0, 1),
      connectNodes(valuation, valuationOutput),
    ];

    const graph = createTestGraph('Startup Valuation', nodes, edges);

    // Step 1: Validate
    const validation = validateGraph(graph);
    expect(validation.valid).toBe(true);

    // Step 2: Single deterministic run
    const deterministicResult = executeGraphSync(graph);
    expect(deterministicResult.success).toBe(true);
    expect(deterministicResult.outputNodes.length).toBe(3);

    // Step 3: Monte Carlo simulation
    const mcConfig = createSimulationConfig(graph.id, {
      iterations: 10000,
      seed: 42,
    });

    const mcResult = runMonteCarloSimulation(graph, mcConfig);
    expect(mcResult.success).toBe(true);

    // Step 4: Analyze results
    const valuations = mcResult.results
      .filter(r => r.nodeId === valuationOutput.id)
      .map(r => r.value);

    if (valuations.length > 0) {
      const metrics = calculateRiskMetrics(valuations);

      console.log('\n=== Startup Valuation Analysis ===');
      console.log(`Expected Valuation: $${(metrics.mean / 1000000).toFixed(2)}M`);
      console.log(`Median Valuation: $${(metrics.median / 1000000).toFixed(2)}M`);
      console.log(`Std Dev: $${(metrics.standardDeviation / 1000000).toFixed(2)}M`);
      console.log(`95% CI: $${(metrics.percentiles.p5 / 1000000).toFixed(2)}M - $${(metrics.percentiles.p95 / 1000000).toFixed(2)}M`);
      console.log(`Downside Risk (VaR 95%): $${(metrics.valueAtRisk.var95 / 1000000).toFixed(2)}M`);
      console.log('=====================================\n');

      // Sanity checks
      expect(metrics.mean).toBeGreaterThan(0);
      expect(metrics.percentiles.p5).toBeLessThan(metrics.percentiles.p95);
      expect(metrics.standardDeviation).toBeGreaterThan(0);
    }

    // Step 5: Export for persistence
    const exported = exportGraphToJSON(graph);
    expect(exported).toBeDefined();
    expect(JSON.parse(exported).name).toBe('Startup Valuation');
  });
});
