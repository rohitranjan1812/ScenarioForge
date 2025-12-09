// Simulation Engine - Core execution logic
import type {
  Graph,
  NodeDefinition,
  SimulationConfig,
  SimulationResult,
  SimulationProgress,
  ExpressionContext,
  DistributionConfig,
  RiskMetrics,
} from '../types/index.js';
import { topologicalSort, getNodeInputEdges } from '../graph/index.js';
import { evaluate, sampleDistribution, setSeed } from '../expression/index.js';

// ============================================
// Node Compute Functions
// ============================================

export type ComputeFunction = (
  inputs: Record<string, unknown>,
  nodeData: Record<string, unknown>,
  context: ExpressionContext
) => Record<string, unknown>;

const nodeComputeFunctions: Record<string, ComputeFunction> = {
  DATA_SOURCE: (_inputs, nodeData) => {
    // Data source just passes through its data
    return { output: nodeData.value ?? nodeData };
  },
  
  CONSTANT: (_inputs, nodeData) => {
    return { output: nodeData.value };
  },
  
  PARAMETER: (_inputs, nodeData) => {
    return { output: nodeData.value };
  },
  
  TRANSFORMER: (inputs, nodeData, context) => {
    // Evaluate expression if provided
    if (nodeData.expression && typeof nodeData.expression === 'string') {
      try {
        const result = evaluate(nodeData.expression, {
          ...context,
          $node: nodeData,
          $inputs: inputs,
        });
        return { output: result };
      } catch (e) {
        const nodeName = nodeData.name ?? 'unknown';
        const expr = nodeData.expression.length > 50 
          ? nodeData.expression.substring(0, 50) + '...' 
          : nodeData.expression;
        throw new Error(`Expression error in "${nodeName}": ${e instanceof Error ? e.message : 'Unknown error'}\nExpression: ${expr}`);
      }
    }
    // Otherwise pass through first input
    const inputValues = Object.values(inputs);
    return { output: inputValues[0] ?? null };
  },
  
  AGGREGATOR: (inputs, nodeData, _context) => {
    const method = nodeData.method as string ?? 'sum';
    const values = Object.values(inputs).flat().map(Number).filter(n => !isNaN(n));
    
    let result: number;
    switch (method) {
      case 'sum':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'mean':
      case 'average':
        result = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'min':
        result = Math.min(...values);
        break;
      case 'max':
        result = Math.max(...values);
        break;
      case 'product':
        result = values.reduce((a, b) => a * b, 1);
        break;
      case 'count':
        result = values.length;
        break;
      default:
        result = values.reduce((a, b) => a + b, 0);
    }
    
    return { output: result };
  },
  
  DISTRIBUTION: (_inputs, nodeData, _context) => {
    const config: DistributionConfig = {
      type: nodeData.distributionType as DistributionConfig['type'] ?? 'normal',
      parameters: nodeData.parameters as Record<string, number> ?? {},
      values: nodeData.values as unknown[],
      probabilities: nodeData.probabilities as number[],
    };
    
    const sample = sampleDistribution(config);
    return { output: sample };
  },
  
  DECISION: (inputs, nodeData, context) => {
    // Evaluate condition
    const condition = nodeData.condition as string;
    if (!condition) {
      return { output: Object.values(inputs)[0] };
    }
    
    const result = evaluate(condition, {
      ...context,
      $node: nodeData,
      $inputs: inputs,
    });
    
    if (result) {
      return { output: nodeData.trueValue ?? inputs.trueInput ?? true };
    } else {
      return { output: nodeData.falseValue ?? inputs.falseInput ?? false };
    }
  },
  
  CONSTRAINT: (inputs, nodeData, context) => {
    const expression = nodeData.expression as string;
    if (!expression) {
      return { satisfied: true, violation: 0 };
    }
    
    const value = evaluate(expression, {
      ...context,
      $node: nodeData,
      $inputs: inputs,
    });
    
    const numValue = Number(value);
    const min = nodeData.min as number | undefined;
    const max = nodeData.max as number | undefined;
    
    let violation = 0;
    if (min !== undefined && numValue < min) {
      violation = min - numValue;
    }
    if (max !== undefined && numValue > max) {
      violation = numValue - max;
    }
    
    return { 
      output: numValue,
      satisfied: violation === 0, 
      violation 
    };
  },
  
  OUTPUT: (inputs, nodeData) => {
    // Output node collects inputs and labels them
    const label = nodeData.label as string ?? 'result';
    const inputValues = Object.values(inputs);
    return { [label]: inputValues.length === 1 ? inputValues[0] : inputValues };
  },
  
  SUBGRAPH: (_inputs, _nodeData, _context) => {
    // Subgraph execution is handled by executeSubgraph function
    // This is a placeholder that should never be called directly
    // The actual execution happens in executeNode when it detects SUBGRAPH type
    return { output: _inputs };
  },
};

export function registerComputeFunction(nodeType: string, fn: ComputeFunction): void {
  nodeComputeFunctions[nodeType] = fn;
}

// ============================================
// Subgraph Execution
// ============================================

/**
 * Execute a subgraph with input values
 */
export function executeSubgraph(
  subgraphId: string,
  _inputs: Record<string, unknown>,
  allGraphs: Map<string, Graph>,
  context: ExpressionContext
): Record<string, unknown> {
  const subgraph = allGraphs.get(subgraphId);
  if (!subgraph) {
    throw new Error(`Subgraph ${subgraphId} not found`);
  }
  
  // Execute the subgraph with provided inputs
  // TODO: The inputs should be mapped to the appropriate input nodes in the subgraph
  // For now, we execute the subgraph with the parent's parameters
  const result = executeGraph(subgraph, context.$params, {
    iteration: context.$iteration,
    time: context.$time,
    allGraphs, // Pass allGraphs for nested subgraphs
  });
  
  if (!result.success) {
    throw new Error(`Subgraph execution failed: ${result.error}`);
  }
  
  // Collect outputs from OUTPUT nodes
  const outputs: Record<string, unknown> = {};
  for (const outputNode of result.outputNodes) {
    Object.assign(outputs, outputNode.outputs);
  }
  
  return outputs;
}

// ============================================
// Feedback Loop Execution
// ============================================

/**
 * Execute a graph with feedback loops until convergence
 */
export function executeGraphWithFeedback(
  graph: Graph,
  params: Record<string, unknown> = {},
  options: {
    iteration?: number;
    time?: number;
    maxFeedbackIterations?: number;
    convergenceTolerance?: number;
  } = {}
): ExecutionResult & { feedbackLoops?: import('../types/index.js').FeedbackLoopResult[] } {
  const feedbackEdges = graph.edges.filter(e => e.type === 'FEEDBACK');
  
  if (feedbackEdges.length === 0) {
    // No feedback loops, execute normally
    return executeGraph(graph, params, options);
  }
  
  const maxIterations = options.maxFeedbackIterations ?? 100;
  const tolerance = options.convergenceTolerance ?? 0.001;
  
  // Initialize feedback state
  const feedbackState = new Map<string, unknown>();
  const feedbackHistory: Map<string, { iteration: number; value: unknown; delta: number }[]> = new Map();
  
  for (const edge of feedbackEdges) {
    feedbackState.set(edge.id, 0); // Initialize with default value
    feedbackHistory.set(edge.id, []);
  }
  
  let converged = false;
  let feedbackIteration = 0;
  let lastResult: ExecutionResult | null = null;
  
  // Iteratively execute until convergence
  while (!converged && feedbackIteration < maxIterations) {
    const result = executeGraph(graph, params, {
      ...options,
      feedbackState,
    } as any);
    
    if (!result.success) {
      return result;
    }
    
    lastResult = result;
    converged = true;
    
    // Check convergence for each feedback edge
    for (const edge of feedbackEdges) {
      // Get the new value from the source node output
      const sourceOutputs = result.outputs.get(edge.sourceNodeId);
      
      // Find the source node to get the output port name
      const sourceNode = graph.nodes.find(n => n.id === edge.sourceNodeId);
      const sourcePort = sourceNode?.outputPorts.find(p => p.id === edge.sourcePortId);
      
      // Get value using port name if available, otherwise try 'output' as fallback
      const outputKey = sourcePort?.name ?? 'output';
      const newValue = sourceOutputs?.[outputKey] ?? sourceOutputs?.output;
      
      if (newValue !== undefined) {
        const oldValue = feedbackState.get(edge.id);
        const delta = typeof newValue === 'number' && typeof oldValue === 'number'
          ? Math.abs(newValue - oldValue)
          : 0;
        
        const edgeTolerance = edge.convergenceTolerance ?? tolerance;
        
        if (delta > edgeTolerance) {
          converged = false;
        }
        
        // Update feedback state
        feedbackState.set(edge.id, newValue);
        
        // Record history
        const history = feedbackHistory.get(edge.id) ?? [];
        history.push({ iteration: feedbackIteration, value: newValue, delta });
        feedbackHistory.set(edge.id, history);
      }
    }
    
    feedbackIteration++;
  }
  
  // Build feedback loop results
  const feedbackLoopResults = feedbackEdges.map(edge => ({
    edgeId: edge.id,
    iterations: feedbackIteration,
    finalValue: feedbackState.get(edge.id),
    converged,
    convergenceHistory: feedbackHistory.get(edge.id) ?? [],
  }));
  
  return {
    ...lastResult!,
    feedbackLoops: feedbackLoopResults,
  };
}

// ============================================
// Graph Execution
// ============================================

export interface ExecutionState {
  nodeOutputs: Map<string, Record<string, unknown>>;
  portValues: Map<string, unknown>;
  allGraphs?: Map<string, Graph>;  // For subgraph execution
}

export function executeNode(
  node: NodeDefinition,
  graph: Graph,
  state: ExecutionState,
  context: ExpressionContext
): Record<string, unknown> {
  // Gather inputs from connected edges
  const inputs: Record<string, unknown> = {};
  const inputEdges = getNodeInputEdges(graph, node.id);
  
  for (const edge of inputEdges) {
    const sourceOutputs = state.nodeOutputs.get(edge.sourceNodeId);
    if (sourceOutputs) {
      // Find the source port to get the output key
      const sourceNode = graph.nodes.find(n => n.id === edge.sourceNodeId);
      const sourcePort = sourceNode?.outputPorts.find(p => p.id === edge.sourcePortId);
      const targetPort = node.inputPorts.find(p => p.id === edge.targetPortId);
      
      // Get value from source output
      let value: unknown;
      if (sourcePort) {
        // Try to get value by port name
        value = sourceOutputs[sourcePort.name] ?? sourceOutputs.output;
      } else {
        value = sourceOutputs.output;
      }
      
      // Apply edge transform if present
      if (edge.transformFunction) {
        try {
          value = evaluate(edge.transformFunction, {
            ...context,
            $node: { value },
            $inputs: { value },
          });
        } catch (e) {
          // Keep original value on transform error
        }
      }
      
      // Store by target port name or ID
      const inputKey = targetPort?.name ?? edge.targetPortId;
      
      // Handle multiple connections to same port
      if (targetPort?.multiple && inputs[inputKey] !== undefined) {
        if (Array.isArray(inputs[inputKey])) {
          (inputs[inputKey] as unknown[]).push(value);
        } else {
          inputs[inputKey] = [inputs[inputKey], value];
        }
      } else {
        inputs[inputKey] = value;
      }
    }
  }
  
  // Apply default values for unconnected required ports
  for (const port of node.inputPorts) {
    if (inputs[port.name] === undefined && port.defaultValue !== undefined) {
      inputs[port.name] = port.defaultValue;
    }
  }
  
  // Handle SUBGRAPH nodes specially
  if (node.type === 'SUBGRAPH' && node.subgraphId) {
    if (!state.allGraphs) {
      throw new Error('Cannot execute subgraph: allGraphs not provided in execution state');
    }
    
    try {
      const subgraphOutputs = executeSubgraph(
        node.subgraphId,
        inputs,
        state.allGraphs,
        context
      );
      
      // Store outputs
      state.nodeOutputs.set(node.id, subgraphOutputs);
      return subgraphOutputs;
    } catch (error) {
      throw new Error(`Subgraph execution failed for node ${node.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Get compute function
  const computeFn = nodeComputeFunctions[node.type];
  if (!computeFn) {
    throw new Error(`No compute function registered for node type: ${node.type}`);
  }
  
  // Execute node
  const nodeContext: ExpressionContext = {
    ...context,
    $node: node.data,
    $inputs: inputs,
  };
  
  const outputs = computeFn(inputs, node.data, nodeContext);
  
  // Store outputs
  state.nodeOutputs.set(node.id, outputs);
  
  return outputs;
}

export interface ExecutionResult {
  success: boolean;
  outputs: Map<string, Record<string, unknown>>;
  outputNodes: { nodeId: string; nodeName: string; outputs: Record<string, unknown> }[];
  error?: string;
  executionTimeMs: number;
}

export function executeGraph(
  graph: Graph,
  params: Record<string, unknown> = {},
  options: { iteration?: number; time?: number; allGraphs?: Map<string, Graph> } = {}
): ExecutionResult {
  const startTime = Date.now();
  
  // Topological sort
  const sortedNodes = topologicalSort(graph);
  if (!sortedNodes) {
    return {
      success: false,
      outputs: new Map(),
      outputNodes: [],
      error: 'Graph contains cycles that cannot be resolved',
      executionTimeMs: Date.now() - startTime,
    };
  }
  
  // Initialize execution state
  const state: ExecutionState = {
    nodeOutputs: new Map(),
    portValues: new Map(),
    allGraphs: options.allGraphs,
  };
  
  // Build nodes map for context
  const nodesMap: Record<string, NodeDefinition> = {};
  for (const node of graph.nodes) {
    nodesMap[node.id] = node;
  }
  
  // Create context
  const context: ExpressionContext = {
    $node: {},
    $inputs: {},
    $params: params,
    $time: options.time ?? 0,
    $iteration: options.iteration ?? 0,
    $nodes: nodesMap,
  };
  
  // Execute nodes in order
  try {
    for (const node of sortedNodes) {
      executeNode(node, graph, state, context);
    }
  } catch (e) {
    return {
      success: false,
      outputs: state.nodeOutputs,
      outputNodes: [],
      error: e instanceof Error ? e.message : 'Unknown error',
      executionTimeMs: Date.now() - startTime,
    };
  }
  
  // Collect output node results
  const outputNodes = sortedNodes
    .filter(n => n.type === 'OUTPUT')
    .map(n => ({
      nodeId: n.id,
      nodeName: n.name,
      outputs: state.nodeOutputs.get(n.id) ?? {},
    }));
  
  return {
    success: true,
    outputs: state.nodeOutputs,
    outputNodes,
    executionTimeMs: Date.now() - startTime,
  };
}

// ============================================
// Monte Carlo Simulation
// ============================================

export interface MonteCarloResult {
  success: boolean;
  iterations: number;
  results: SimulationResult[];
  aggregated: Map<string, RiskMetrics>;
  executionTimeMs: number;
  error?: string;
}

export function runMonteCarloSimulation(
  graph: Graph,
  config: SimulationConfig,
  onProgress?: (progress: SimulationProgress) => void
): MonteCarloResult {
  const startTime = Date.now();
  const results: SimulationResult[] = [];
  
  // Set seed for reproducibility
  if (config.seed !== undefined) {
    setSeed(config.seed);
  }
  
  // Use graph params or empty object
  const params = graph.params ?? {};
  
  // Run iterations
  for (let i = 0; i < config.iterations; i++) {
    const execResult = executeGraph(graph, params, { iteration: i });
    
    if (!execResult.success) {
      return {
        success: false,
        iterations: i,
        results,
        aggregated: new Map(),
        executionTimeMs: Date.now() - startTime,
        error: `Iteration ${i} failed: ${execResult.error}`,
      };
    }
    
    // Collect results from output nodes
    for (const outputNode of execResult.outputNodes) {
      // Only collect if in configured output nodes (or collect all if not specified)
      if (config.outputNodes.length === 0 || config.outputNodes.includes(outputNode.nodeId)) {
        for (const [key, value] of Object.entries(outputNode.outputs)) {
          if (typeof value === 'number') {
            results.push({
              simulationId: config.id,
              iteration: i,
              nodeId: outputNode.nodeId,
              outputKey: key,
              value,
            });
          }
        }
      }
    }
    
    // Report progress
    if (onProgress && i % 100 === 0) {
      onProgress({
        simulationId: config.id,
        status: 'running',
        progress: (i / config.iterations) * 100,
        currentIteration: i,
        totalIterations: config.iterations,
        startedAt: new Date(startTime),
      });
    }
  }
  
  // Aggregate results by node/output key
  const aggregated = aggregateResults(results);
  
  return {
    success: true,
    iterations: config.iterations,
    results,
    aggregated,
    executionTimeMs: Date.now() - startTime,
  };
}

// ============================================
// Result Aggregation and Risk Metrics
// ============================================

function aggregateResults(results: SimulationResult[]): Map<string, RiskMetrics> {
  const grouped = new Map<string, number[]>();
  
  // Group by node/output key
  for (const result of results) {
    const key = `${result.nodeId}:${result.outputKey}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(result.value);
  }
  
  // Calculate metrics for each group
  const metrics = new Map<string, RiskMetrics>();
  for (const [key, values] of grouped) {
    metrics.set(key, calculateRiskMetrics(values));
  }
  
  return metrics;
}

export function calculateRiskMetrics(values: number[]): RiskMetrics {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  if (n === 0) {
    const emptyMetric = {
      mean: 0, median: 0, standardDeviation: 0, variance: 0,
      skewness: 0, kurtosis: 0, min: 0, max: 0,
      percentiles: { p5: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
      valueAtRisk: { var95: 0, var99: 0, var999: 0 },
      conditionalVaR: { cvar95: 0, cvar99: 0 },
    };
    return emptyMetric;
  }
  
  // Basic statistics
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
  const std = Math.sqrt(variance);
  
  // Skewness and kurtosis
  const cubedDiffs = values.map(v => Math.pow((v - mean) / (std || 1), 3));
  const skewness = cubedDiffs.reduce((a, b) => a + b, 0) / n;
  
  const fourthDiffs = values.map(v => Math.pow((v - mean) / (std || 1), 4));
  const kurtosis = fourthDiffs.reduce((a, b) => a + b, 0) / n - 3; // Excess kurtosis
  
  // Percentile helper
  const percentile = (p: number) => {
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  };
  
  // Value at Risk (assuming lower is worse)
  const var95 = percentile(5);
  const var99 = percentile(1);
  const var999 = percentile(0.1);
  
  // Conditional VaR (Expected Shortfall)
  const cvar = (p: number) => {
    const cutoff = percentile(p);
    const tailValues = sorted.filter(v => v <= cutoff);
    return tailValues.length > 0 
      ? tailValues.reduce((a, b) => a + b, 0) / tailValues.length 
      : cutoff;
  };
  
  return {
    mean,
    median: percentile(50),
    standardDeviation: std,
    variance,
    skewness,
    kurtosis,
    min: sorted[0],
    max: sorted[n - 1],
    percentiles: {
      p5: percentile(5),
      p10: percentile(10),
      p25: percentile(25),
      p50: percentile(50),
      p75: percentile(75),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
    },
    valueAtRisk: { var95, var99, var999 },
    conditionalVaR: { cvar95: cvar(5), cvar99: cvar(1) },
  };
}

// ============================================
// Sensitivity Analysis
// ============================================

export interface SensitivityResult {
  parameterId: string;
  nodeId: string;
  field: string;
  baseValue: number;
  sensitivity: number;  // Change in output per unit change in input
  elasticity: number;   // Percentage change in output per percentage change in input
  values: { input: number; output: number }[];
}

export function runSensitivityAnalysis(
  graph: Graph,
  parameterNodeId: string,
  parameterField: string,
  outputNodeId: string,
  outputField: string,
  range: [number, number],
  steps: number = 10
): SensitivityResult {
  const results: { input: number; output: number }[] = [];
  const step = (range[1] - range[0]) / (steps - 1);
  
  // Find the parameter node
  const paramNode = graph.nodes.find(n => n.id === parameterNodeId);
  if (!paramNode) {
    throw new Error(`Parameter node ${parameterNodeId} not found`);
  }
  
  const baseValue = (paramNode.data[parameterField] as number) ?? range[0];
  
  // Run graph for each parameter value
  for (let i = 0; i < steps; i++) {
    const inputValue = range[0] + i * step;
    
    // Create modified graph with new parameter value
    const modifiedGraph = {
      ...graph,
      nodes: graph.nodes.map(n => 
        n.id === parameterNodeId
          ? { ...n, data: { ...n.data, [parameterField]: inputValue, value: inputValue } }
          : n
      ),
    };
    
    const execResult = executeGraph(modifiedGraph);
    
    if (execResult.success) {
      const outputNode = execResult.outputNodes.find(o => o.nodeId === outputNodeId);
      const outputValue = outputNode?.outputs[outputField];
      if (typeof outputValue === 'number') {
        results.push({ input: inputValue, output: outputValue });
      }
    }
  }
  
  // Calculate sensitivity metrics
  if (results.length < 2) {
    return {
      parameterId: `${parameterNodeId}:${parameterField}`,
      nodeId: parameterNodeId,
      field: parameterField,
      baseValue,
      sensitivity: 0,
      elasticity: 0,
      values: results,
    };
  }
  
  // Linear regression for sensitivity
  const n = results.length;
  const sumX = results.reduce((s, r) => s + r.input, 0);
  const sumY = results.reduce((s, r) => s + r.output, 0);
  const sumXY = results.reduce((s, r) => s + r.input * r.output, 0);
  const sumX2 = results.reduce((s, r) => s + r.input * r.input, 0);
  
  const sensitivity = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Calculate elasticity at base value
  const baseOutput = results.find(r => Math.abs(r.input - baseValue) < step / 2)?.output ?? sumY / n;
  const elasticity = baseValue !== 0 && baseOutput !== 0
    ? (sensitivity * baseValue) / baseOutput
    : 0;
  
  return {
    parameterId: `${parameterNodeId}:${parameterField}`,
    nodeId: parameterNodeId,
    field: parameterField,
    baseValue,
    sensitivity,
    elasticity,
    values: results,
  };
}
