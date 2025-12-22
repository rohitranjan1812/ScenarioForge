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
    const method = (nodeData.method as string ?? nodeData.aggregationType as string ?? 'sum').toLowerCase();
    const values = Object.values(inputs).flat().map(Number).filter(n => !isNaN(n));
    
    if (values.length === 0) {
      return { output: 0, result: 0 };
    }
    
    let result: number;
    switch (method) {
      case 'sum':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'mean':
      case 'avg':
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
      case 'stddev':
      case 'std': {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        result = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
        break;
      }
      default:
        result = values.reduce((a, b) => a + b, 0);
    }
    
    return { output: result, result };
  },
  
  DISTRIBUTION: (_inputs, nodeData, _context) => {
    // Handle multiple formats:
    // 1. { distributionType, parameters: { mean, stddev } }
    // 2. { distributionType, mean, stddev } (flat)
    // 3. { distributionType, params: { mean, stddev } } (advanced-nodes test format)
    const flatParams = { ...nodeData };
    delete flatParams.distributionType;
    delete flatParams.parameters;
    delete flatParams.params;
    delete flatParams.values;
    delete flatParams.probabilities;
    
    const config: DistributionConfig = {
      type: nodeData.distributionType as DistributionConfig['type'] ?? 'normal',
      parameters: (nodeData.parameters as Record<string, number>) 
                  ?? (nodeData.params as Record<string, number>) 
                  ?? flatParams,
      values: nodeData.values as unknown[],
      probabilities: nodeData.probabilities as number[],
    };
    
    const sample = sampleDistribution(config);
    // Return both 'sample' (for port name) and 'output' (fallback)
    return { sample, output: sample };
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
  
  CONSTRAINT: (inputs, nodeData, _context) => {
    // Get the input value - either from an expression or directly from inputs
    let numValue: number;
    const expression = nodeData.expression as string | undefined;
    
    if (expression) {
      const value = evaluate(expression, {
        ..._context,
        $node: nodeData,
        $inputs: inputs,
      });
      numValue = Number(value);
    } else {
      // Use direct input value
      numValue = Number(inputs.value ?? 0);
    }
    
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
  
  SUBGRAPH: (inputs, _nodeData, _context) => {
    // Subgraph execution would be handled by recursively calling executeGraph
    // For now, just pass through
    return { output: inputs };
  },
  
  // Conditional nodes for IF/SWITCH/CLAMP operations
  CONDITIONAL: (inputs, nodeData, _context) => {
    const conditionType = nodeData.conditionType as string ?? 'IF';
    
    switch (conditionType) {
      case 'IF': {
        const condition = inputs.condition;
        const trueValue = inputs.trueValue ?? inputs.ifTrue ?? nodeData.trueValue ?? 1;
        const falseValue = inputs.falseValue ?? inputs.ifFalse ?? nodeData.falseValue ?? 0;
        return { output: condition ? trueValue : falseValue, result: condition ? trueValue : falseValue };
      }
      case 'CLAMP': {
        const value = Number(inputs.value ?? 0);
        const minVal = Number(inputs.min ?? nodeData.min ?? -Infinity);
        const maxVal = Number(inputs.max ?? nodeData.max ?? Infinity);
        const clamped = Math.max(minVal, Math.min(maxVal, value));
        return { output: clamped, result: clamped };
      }
      case 'SWITCH': {
        const selector = Number(inputs.selector ?? 0);
        const cases = nodeData.cases as Record<string, unknown> ?? {};
        const defaultValue = nodeData.default ?? inputs.default ?? 0;
        const result = cases[selector.toString()] ?? defaultValue;
        return { output: result, result };
      }
      default:
        return { output: Object.values(inputs)[0] ?? 0 };
    }
  },
  
  // Lookup table node for interpolation
  LOOKUP: (inputs, nodeData, _context) => {
    const key = Number(inputs.key ?? inputs.x ?? 0);
    const table = nodeData.table as { key: number; value: number }[] ?? [];
    const keys = nodeData.keys as number[] ?? table.map(t => t.key);
    const values = nodeData.values as number[] ?? table.map(t => t.value);
    
    if (keys.length === 0 || values.length === 0) {
      return { output: 0, value: 0 };
    }
    
    // Find surrounding keys for interpolation
    let lowerIdx = 0;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] <= key) lowerIdx = i;
    }
    
    // Clamp to bounds
    if (key <= keys[0]) return { output: values[0], value: values[0] };
    if (key >= keys[keys.length - 1]) return { output: values[values.length - 1], value: values[values.length - 1] };
    
    // Linear interpolation
    const upperIdx = Math.min(lowerIdx + 1, keys.length - 1);
    const t = (key - keys[lowerIdx]) / (keys[upperIdx] - keys[lowerIdx] || 1);
    const interpolated = values[lowerIdx] + t * (values[upperIdx] - values[lowerIdx]);
    return { output: interpolated, value: interpolated };
  },
  
  // Time series node
  TIMESERIES: (inputs, nodeData, _context) => {
    const time = Number(inputs.time ?? inputs.t ?? 0);
    const seriesValues = nodeData.values as number[] ?? [];
    const startTime = Number(nodeData.startTime ?? 0);
    const timeStep = Number(nodeData.timeStep ?? 1);
    
    if (seriesValues.length === 0) {
      return { output: 0, value: 0 };
    }
    
    // Calculate index from time
    const floatIndex = (time - startTime) / timeStep;
    const lowerIdx = Math.floor(floatIndex);
    const upperIdx = Math.ceil(floatIndex);
    
    // Clamp to bounds
    if (lowerIdx < 0) return { output: seriesValues[0], value: seriesValues[0] };
    if (upperIdx >= seriesValues.length) return { output: seriesValues[seriesValues.length - 1], value: seriesValues[seriesValues.length - 1] };
    
    // Interpolate if needed
    if (lowerIdx === upperIdx || lowerIdx >= seriesValues.length - 1) {
      return { output: seriesValues[Math.min(lowerIdx, seriesValues.length - 1)], value: seriesValues[Math.min(lowerIdx, seriesValues.length - 1)] };
    }
    
    const t = floatIndex - lowerIdx;
    const interpolated = seriesValues[lowerIdx] + t * (seriesValues[upperIdx] - seriesValues[lowerIdx]);
    return { output: interpolated, value: interpolated };
  },
  
  // Iterator node for Monte Carlo context
  ITERATOR: (_inputs, _nodeData, context) => {
    return { output: context.$iteration ?? 0, iteration: context.$iteration ?? 0 };
  },
};

export function registerComputeFunction(nodeType: string, fn: ComputeFunction): void {
  nodeComputeFunctions[nodeType] = fn;
}

// ============================================
// Graph Execution
// ============================================

export interface ExecutionState {
  nodeOutputs: Map<string, Record<string, unknown>>;
  portValues: Map<string, unknown>;
}

export function executeNode(
  node: NodeDefinition,
  graph: Graph,
  state: ExecutionState,
  context: ExpressionContext
): Record<string, unknown> {
  // Helper to get edge properties supporting both formats
  const getEdgeSourceNodeId = (e: Record<string, unknown>) => (e.sourceNodeId ?? e.source) as string;
  const getEdgeSourcePortId = (e: Record<string, unknown>) => (e.sourcePortId ?? e.sourceHandle) as string;
  const getEdgeTargetPortId = (e: Record<string, unknown>) => (e.targetPortId ?? e.targetHandle) as string;
  
  // Gather inputs from connected edges
  const inputs: Record<string, unknown> = {};
  const inputEdges = getNodeInputEdges(graph, node.id);
  
  for (const edge of inputEdges) {
    const sourceNodeId = getEdgeSourceNodeId(edge as unknown as Record<string, unknown>);
    const sourcePortId = getEdgeSourcePortId(edge as unknown as Record<string, unknown>);
    const targetPortId = getEdgeTargetPortId(edge as unknown as Record<string, unknown>);
    
    const sourceOutputs = state.nodeOutputs.get(sourceNodeId);
    if (sourceOutputs) {
      // Find the source port to get the output key
      const sourceNode = graph.nodes.find(n => n.id === sourceNodeId);
      const sourcePort = sourceNode?.outputPorts.find(p => p.id === sourcePortId);
      const targetPort = node.inputPorts.find(p => p.id === targetPortId);
      
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
      const inputKey = targetPort?.name ?? targetPortId;
      
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

/** Result for a single iteration in multi-iteration execution */
export interface IterationResult {
  iteration: number;
  outputs: Record<string, number>;
}

export interface ExecutionResult {
  success: boolean;
  outputs: Map<string, Record<string, unknown>>;
  outputNodes: { nodeId: string; nodeName: string; outputs: Record<string, unknown> }[];
  error?: string;
  executionTimeMs: number;
  results?: IterationResult[]; // For multi-iteration runs
}

export interface ExecuteGraphOptions {
  iteration?: number;
  time?: number;
  iterations?: number;
  parameters?: Record<string, unknown>;
}

/**
 * Execute a graph with optional multi-iteration support.
 * For single execution, use executeGraphSync for better type inference.
 */
export function executeGraph(
  graph: Graph,
  paramsOrOptions: Record<string, unknown> | ExecuteGraphOptions = {},
  options: { iteration?: number; time?: number } = {}
): ExecutionResult | Promise<ExecutionResult> {
  // Handle new API format: executeGraph(graph, { iterations, parameters })
  if ('iterations' in paramsOrOptions && typeof paramsOrOptions.iterations === 'number') {
    const iterations = paramsOrOptions.iterations;
    const params = (paramsOrOptions.parameters as Record<string, unknown>) ?? {};
    
    // Run multiple iterations
    return (async () => {
      const startTime = Date.now();
      const results: IterationResult[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const singleResult = executeGraphSync(graph, params, { iteration: i });
        if (!singleResult.success) {
          return {
            ...singleResult,
            results: results,
          };
        }
        // Collect output values
        const outputs: Record<string, number> = {};
        for (const outNode of singleResult.outputNodes) {
          for (const [key, value] of Object.entries(outNode.outputs)) {
            outputs[key] = value as number;
          }
        }
        results.push({ iteration: i, outputs });
      }
      
      return {
        success: true,
        outputs: new Map(),
        outputNodes: [],
        results,
        executionTimeMs: Date.now() - startTime,
      };
    })();
  }
  
  // Legacy API: executeGraph(graph, params, options)
  return executeGraphSync(graph, paramsOrOptions as Record<string, unknown>, options);
}

/**
 * Synchronously execute a graph once.
 * This is the preferred method for single executions as it provides better type inference.
 */
export function executeGraphSync(
  graph: Graph,
  params: Record<string, unknown> = {},
  options: { iteration?: number; time?: number } = {}
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

// Configuration constants
const DEFAULT_MAX_EXECUTION_TIME = 300000; // 5 minutes
const DEFAULT_MAX_STORED_RESULTS = 100000; // Limit stored results
const DEFAULT_RESERVOIR_SIZE = 10000; // Sample size for statistics
const GC_INTERVAL_ITERATIONS = 50000; // Periodic GC trigger interval

// Streaming statistics accumulator for memory-efficient aggregation
class StreamingStats {
  private values: number[] = [];
  private readonly reservoirSize: number;
  
  constructor(maxSamples: number = DEFAULT_RESERVOIR_SIZE) {
    // Use reservoir sampling to keep representative sample
    this.reservoirSize = Math.min(maxSamples, DEFAULT_RESERVOIR_SIZE);
  }
  
  add(value: number, iteration: number): void {
    if (this.values.length < this.reservoirSize) {
      this.values.push(value);
    } else {
      // Reservoir sampling: replace with decreasing probability
      const j = Math.floor(Math.random() * (iteration + 1));
      if (j < this.reservoirSize) {
        this.values[j] = value;
      }
    }
  }
  
  getMetrics(): RiskMetrics {
    return calculateRiskMetrics(this.values);
  }
  
  getValues(): number[] {
    return [...this.values];
  }
}

export function runMonteCarloSimulation(
  graph: Graph,
  config: SimulationConfig,
  onProgress?: (progress: SimulationProgress) => void
): MonteCarloResult {
  const startTime = Date.now();
  const maxExecutionTime = config.maxExecutionTime ?? DEFAULT_MAX_EXECUTION_TIME;
  const maxMemoryResults = DEFAULT_MAX_STORED_RESULTS;
  
  // Use streaming aggregation instead of storing all results
  const streamingStats = new Map<string, StreamingStats>();
  const results: SimulationResult[] = [];
  let resultsCount = 0;
  
  // Set seed for reproducibility
  if (config.seed !== undefined) {
    setSeed(config.seed);
  }
  
  // Use graph params or empty object
  const params = graph.params ?? {};
  
  // Run iterations
  for (let i = 0; i < config.iterations; i++) {
    // Check execution timeout
    if (Date.now() - startTime > maxExecutionTime) {
      console.warn(`Simulation timeout after ${i} iterations`);
      break;
    }
    
    const execResult = executeGraphSync(graph, params, { iteration: i });
    
    if (!execResult.success) {
      return {
        success: false,
        iterations: i,
        results: results.slice(0, 1000), // Return only sample of results
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
            // Use the output label/key directly for aggregation (for easier lookup)
            const statsKey = key;
            
            // Use streaming aggregation
            if (!streamingStats.has(statsKey)) {
              streamingStats.set(statsKey, new StreamingStats());
            }
            streamingStats.get(statsKey)!.add(value, i);
            
            // Only store limited results to prevent memory exhaustion
            if (resultsCount < maxMemoryResults || config.captureIntermediates) {
              results.push({
                simulationId: config.id,
                iteration: i,
                nodeId: outputNode.nodeId,
                outputKey: key,
                value,
              });
              resultsCount++;
            }
          }
        }
      }
    }
    
    // Report progress more frequently for long simulations
    const progressInterval = config.iterations > 10000 ? 1000 : 100;
    if (onProgress && i % progressInterval === 0) {
      onProgress({
        simulationId: config.id,
        status: 'running',
        progress: (i / config.iterations) * 100,
        currentIteration: i,
        totalIterations: config.iterations,
        startedAt: new Date(startTime),
      });
    }
    
    // Periodic memory cleanup for very long simulations
    if (i > 0 && i % GC_INTERVAL_ITERATIONS === 0 && typeof global !== 'undefined' && global.gc) {
      global.gc();
    }
  }
  
  // Final progress report
  if (onProgress) {
    onProgress({
      simulationId: config.id,
      status: 'completed',
      progress: 100,
      currentIteration: config.iterations,
      totalIterations: config.iterations,
      startedAt: new Date(startTime),
    });
  }
  
  // Build aggregated metrics from streaming stats
  const aggregated = new Map<string, RiskMetrics>();
  for (const [key, stats] of streamingStats) {
    aggregated.set(key, stats.getMetrics());
  }
  
  return {
    success: true,
    iterations: config.iterations,
    results: results.slice(0, maxMemoryResults), // Return limited sample
    aggregated,
    executionTimeMs: Date.now() - startTime,
  };
}

// ============================================
// Result Aggregation and Risk Metrics
// ============================================

// Legacy aggregation function - kept for backward compatibility
// Use StreamingStats class for memory-efficient aggregation instead
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

// Make aggregateResults available for backward compatibility if needed
export { aggregateResults };

export function calculateRiskMetrics(values: number[]): RiskMetrics {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  if (n === 0) {
    // Return NaN/Infinity for empty arrays (mathematically correct)
    const emptyMetric = {
      mean: NaN, median: NaN, standardDeviation: NaN, variance: NaN,
      skewness: NaN, kurtosis: NaN, min: Infinity, max: -Infinity,
      percentiles: { p5: NaN, p10: NaN, p25: NaN, p50: NaN, p75: NaN, p90: NaN, p95: NaN, p99: NaN },
      valueAtRisk: { var95: NaN, var99: NaN, var999: NaN },
      conditionalVaR: { cvar95: NaN, cvar99: NaN },
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
  success: boolean;
  parameterId: string;
  nodeId: string;
  field: string;
  baseValue: number;
  sensitivity: number;  // Change in output per unit change in input
  elasticity: number;   // Percentage change in output per percentage change in input
  dataPoints: { input: number; output: number }[];
  values: { input: number; output: number }[]; // Alias for dataPoints
  error?: string;
}

// Multi-parameter sensitivity result
export interface MultiSensitivityResult {
  success: boolean;
  sensitivities: SensitivityResult[];
  error?: string;
}

export interface SensitivityOptions {
  parameterNodeId: string;
  parameterField: string;
  outputNodeId: string;
  outputField: string;
  range: [number, number];
  steps?: number;
}

export interface MultiSensitivityOptions {
  parameters: Array<{
    nodeId: string;
    field: string;
    range: [number, number];
    steps?: number;
  }>;
  baseConfig?: SimulationConfig;
  outputNodeId?: string;
  outputField?: string;
}

export function runSensitivityAnalysis(
  graph: Graph,
  options: SensitivityOptions
): SensitivityResult;
export function runSensitivityAnalysis(
  graph: Graph,
  options: MultiSensitivityOptions
): MultiSensitivityResult;
export function runSensitivityAnalysis(
  graph: Graph,
  parameterNodeId: string,
  parameterField: string,
  outputNodeId: string,
  outputField: string,
  range: [number, number],
  steps?: number
): SensitivityResult;
export function runSensitivityAnalysis(
  graph: Graph,
  optionsOrNodeId: SensitivityOptions | MultiSensitivityOptions | string,
  parameterField?: string,
  outputNodeId?: string,
  outputField?: string,
  range?: [number, number],
  steps: number = 10
): SensitivityResult | MultiSensitivityResult {
  // Handle multi-parameter format
  if (typeof optionsOrNodeId === 'object' && 'parameters' in optionsOrNodeId) {
    const multiOpts = optionsOrNodeId as MultiSensitivityOptions;
    // Find output node if not specified
    const outNode = multiOpts.outputNodeId 
      ? graph.nodes.find(n => n.id === multiOpts.outputNodeId)
      : graph.nodes.find(n => n.type === 'OUTPUT');
    const outField = multiOpts.outputField ?? 'result';
    
    const sensitivities: SensitivityResult[] = [];
    for (const param of multiOpts.parameters) {
      const result = runSensitivityAnalysis(graph, {
        parameterNodeId: param.nodeId,
        parameterField: param.field,
        outputNodeId: outNode?.id ?? '',
        outputField: outField,
        range: param.range,
        steps: param.steps,
      });
      sensitivities.push(result);
    }
    
    return {
      success: sensitivities.every(s => s.success),
      sensitivities,
    };
  }
  
  // Handle both single-param calling conventions
  let pNodeId: string, pField: string, oNodeId: string, oField: string, r: [number, number], s: number;
  
  if (typeof optionsOrNodeId === 'object') {
    pNodeId = optionsOrNodeId.parameterNodeId;
    pField = optionsOrNodeId.parameterField;
    oNodeId = optionsOrNodeId.outputNodeId;
    oField = optionsOrNodeId.outputField;
    r = optionsOrNodeId.range;
    s = optionsOrNodeId.steps ?? 10;
  } else {
    pNodeId = optionsOrNodeId;
    pField = parameterField!;
    oNodeId = outputNodeId!;
    oField = outputField!;
    r = range!;
    s = steps;
  }
  
  const results: { input: number; output: number }[] = [];
  const stepSize = (r[1] - r[0]) / (s - 1);
  
  // Find the parameter node
  const paramNode = graph.nodes.find(n => n.id === pNodeId);
  if (!paramNode) {
    return {
      success: false,
      parameterId: `${pNodeId}:${pField}`,
      nodeId: pNodeId,
      field: pField,
      baseValue: 0,
      sensitivity: 0,
      elasticity: 0,
      dataPoints: [],
      values: [],
      error: `Parameter node ${pNodeId} not found`,
    };
  }
  
  const baseValue = (paramNode.data[pField] as number) ?? r[0];
  
  // Run graph for each parameter value
  for (let i = 0; i < s; i++) {
    const inputValue = r[0] + i * stepSize;
    
    // Create modified graph with new parameter value
    const modifiedGraph = {
      ...graph,
      nodes: graph.nodes.map(n => 
        n.id === pNodeId
          ? { ...n, data: { ...n.data, [pField]: inputValue, value: inputValue } }
          : n
      ),
    };
    
    const execResult = executeGraphSync(modifiedGraph);
    
    if (execResult.success) {
      const outputNode = execResult.outputNodes.find(o => o.nodeId === oNodeId);
      const outputValue = outputNode?.outputs[oField];
      if (typeof outputValue === 'number') {
        results.push({ input: inputValue, output: outputValue });
      }
    }
  }
  
  // Calculate sensitivity metrics
  if (results.length < 2) {
    return {
      success: true,
      parameterId: `${pNodeId}:${pField}`,
      nodeId: pNodeId,
      field: pField,
      baseValue,
      sensitivity: 0,
      elasticity: 0,
      dataPoints: results,
      values: results,
    };
  }
  
  // Linear regression for sensitivity
  const n = results.length;
  const sumX = results.reduce((sum, r) => sum + r.input, 0);
  const sumY = results.reduce((sum, r) => sum + r.output, 0);
  const sumXY = results.reduce((sum, r) => sum + r.input * r.output, 0);
  const sumX2 = results.reduce((sum, r) => sum + r.input * r.input, 0);
  
  const sensitivityCoeff = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Calculate elasticity at base value
  const baseOutput = results.find(r => Math.abs(r.input - baseValue) < stepSize / 2)?.output ?? sumY / n;
  const elasticity = baseValue !== 0 && baseOutput !== 0
    ? (sensitivityCoeff * baseValue) / baseOutput
    : 0;
  
  return {
    success: true,
    parameterId: `${pNodeId}:${pField}`,
    nodeId: pNodeId,
    field: pField,
    baseValue,
    sensitivity: sensitivityCoeff,
    elasticity,
    values: results,
    dataPoints: results,
  };
}
