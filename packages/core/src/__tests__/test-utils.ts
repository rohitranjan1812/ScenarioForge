/**
 * ScenarioForge Test Utilities
 * 
 * Comprehensive helper functions and fixtures for testing the
 * graph-based modeling, simulation, and optimization platform.
 */

import type {
  Graph,
  NodeDefinition,
  EdgeDefinition,
  Port,
  NodeType,
  EdgeType,
  DataType,
  SimulationConfig,
  ExpressionContext,
  DistributionConfig,
} from '../types/index.js';

// ============================================
// ID Generation
// ============================================
let idCounter = 0;

export function genId(prefix: string = 'id'): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

// ============================================
// Port Creation
// ============================================
export function createPort(
  name: string,
  dataType: DataType = 'number',
  options: Partial<Omit<Port, 'id' | 'name' | 'dataType'>> = {}
): Port {
  return {
    id: genId('port'),
    name,
    dataType,
    required: options.required ?? true,
    multiple: options.multiple ?? false,
    defaultValue: options.defaultValue,
    schema: options.schema,
  };
}

export function createInputPort(name: string = 'value', dataType: DataType = 'number'): Port {
  return createPort(name, dataType, { required: true });
}

export function createOutputPort(name: string, dataType: DataType = 'number'): Port {
  return createPort(name, dataType, { required: false, multiple: true });
}

// ============================================
// Node Creation
// ============================================
export interface CreateNodeOptions {
  id?: string;
  description?: string;
  schema?: Record<string, unknown>;
  inputPorts?: Port[];
  outputPorts?: Port[];
  computeFunction?: string;
  tags?: string[];
  color?: string;
  locked?: boolean;
}

export function createTestNode(
  type: NodeType,
  name: string,
  position: { x: number; y: number },
  data: Record<string, unknown> = {},
  options: CreateNodeOptions = {}
): NodeDefinition {
  const now = new Date();
  return {
    id: options.id ?? genId('node'),
    type,
    name,
    description: options.description,
    position,
    schema: options.schema ?? { type: 'object', properties: {} },
    data,
    inputPorts: options.inputPorts ?? [],
    outputPorts: options.outputPorts ?? [createOutputPort('output')],
    computeFunction: options.computeFunction,
    tags: options.tags ?? [],
    color: options.color,
    locked: options.locked ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

// Specialized node creators for each type
export function createConstantNode(
  value: number | string | boolean,
  position = { x: 0, y: 0 },
  name = 'Constant'
): NodeDefinition {
  return createTestNode('CONSTANT', name, position, { value }, {
    outputPorts: [createOutputPort('output', typeof value as DataType)],
  });
}

export function createParameterNode(
  defaultValue: number,
  min: number,
  max: number,
  position = { x: 0, y: 0 },
  name = 'Parameter'
): NodeDefinition {
  return createTestNode('PARAMETER', name, position, {
    value: defaultValue,
    min,
    max,
    default: defaultValue,
  }, {
    outputPorts: [createOutputPort('value')],
  });
}

export function createDistributionNode(
  config: DistributionConfig,
  position = { x: 0, y: 0 },
  name = 'Distribution'
): NodeDefinition {
  return createTestNode('DISTRIBUTION', name, position, {
    distributionType: config.type,
    ...config.parameters,
  }, {
    outputPorts: [createOutputPort('sample')],
  });
}

// Convenience alias for distribution nodes used in tests
export function createRandomNode(
  distributionType: string,
  params: Record<string, number>,
  position = { x: 0, y: 0 },
  name = 'Random'
): NodeDefinition {
  return createDistributionNode(
    { type: distributionType, parameters: params } as DistributionConfig,
    position,
    name
  );
}

export function createTransformerNode(
  expression: string,
  inputPorts: Port[],
  position = { x: 0, y: 0 },
  name = 'Transformer'
): NodeDefinition {
  return createTestNode('TRANSFORMER', name, position, { expression }, {
    inputPorts,
    outputPorts: [createOutputPort('result')],
  });
}

export function createAggregatorNode(
  method: 'sum' | 'mean' | 'min' | 'max' | 'product' | 'count',
  inputCount: number,
  position = { x: 0, y: 0 },
  name = 'Aggregator'
): NodeDefinition {
  const inputPorts = Array.from({ length: inputCount }, (_, i) =>
    createInputPort(`input${i + 1}`)
  );
  return createTestNode('AGGREGATOR', name, position, { method, aggregationType: method }, {
    inputPorts,
    outputPorts: [createOutputPort('result')],
  });
}

export function createDecisionNode(
  condition: string,
  trueValue: unknown = 'true_branch',
  falseValue: unknown = 'false_branch',
  inputPorts: Port[] = [],
  position = { x: 0, y: 0 },
  name = 'Decision'
): NodeDefinition {
  return createTestNode('DECISION', name, position, {
    condition,
    trueValue,
    falseValue,
  }, {
    inputPorts,
    outputPorts: [createOutputPort('result')],
  });
}

export function createConstraintNode(
  min?: number,
  max?: number,
  position = { x: 0, y: 0 },
  name = 'Constraint'
): NodeDefinition {
  return createTestNode('CONSTRAINT', name, position, { min, max }, {
    inputPorts: [createInputPort('value')],
    outputPorts: [
      createOutputPort('passed', 'boolean'),
      createOutputPort('value'),
    ],
  });
}

export function createOutputNode(
  label: string,
  position = { x: 0, y: 0 },
  name = 'Output'
): NodeDefinition {
  return createTestNode('OUTPUT', name, position, { label }, {
    inputPorts: [createInputPort('value')],
    outputPorts: [],
  });
}

export function createSubgraphNode(
  subgraphId: string,
  inputPorts: Port[],
  outputPorts: Port[],
  position = { x: 0, y: 0 },
  name = 'Subgraph'
): NodeDefinition {
  return createTestNode('SUBGRAPH', name, position, {
    subgraphId,
    subgraphVersion: 1,
    collapsed: false,
  }, {
    inputPorts,
    outputPorts,
  });
}

// ============================================
// Edge Creation
// ============================================
export interface CreateEdgeOptions {
  id?: string;
  type?: EdgeType;
  weight?: number;
  delay?: number;
  condition?: string;
  transformFunction?: string;
  animated?: boolean;
  label?: string;
}

export function createTestEdge(
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
  options: CreateEdgeOptions = {}
): EdgeDefinition {
  const now = new Date();
  return {
    id: options.id ?? genId('edge'),
    sourceNodeId,
    sourcePortId,
    targetNodeId,
    targetPortId,
    type: options.type ?? 'DATA_FLOW',
    schema: { type: 'object' },
    data: {},
    weight: options.weight,
    delay: options.delay,
    condition: options.condition,
    transformFunction: options.transformFunction,
    style: {},
    animated: options.animated ?? false,
    label: options.label,
    createdAt: now,
    updatedAt: now,
  };
}

export function connectNodes(
  sourceNode: NodeDefinition,
  targetNode: NodeDefinition,
  sourcePortIndex = 0,
  targetPortIndex = 0,
  options: CreateEdgeOptions = {}
): EdgeDefinition {
  const sourcePort = sourceNode.outputPorts[sourcePortIndex];
  const targetPort = targetNode.inputPorts[targetPortIndex];

  if (!sourcePort) {
    throw new Error(`Source node ${sourceNode.id} has no output port at index ${sourcePortIndex}`);
  }
  if (!targetPort) {
    throw new Error(`Target node ${targetNode.id} has no input port at index ${targetPortIndex}`);
  }

  return createTestEdge(
    sourceNode.id,
    sourcePort.id,
    targetNode.id,
    targetPort.id,
    options
  );
}

// ============================================
// Graph Creation
// ============================================
export interface CreateGraphOptions {
  id?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  params?: Record<string, unknown>;
  version?: number;
}

export function createTestGraph(
  name: string,
  nodes: NodeDefinition[] = [],
  edges: EdgeDefinition[] = [],
  options: CreateGraphOptions = {}
): Graph {
  const now = new Date();
  return {
    id: options.id ?? genId('graph'),
    name,
    description: options.description,
    nodes,
    edges,
    metadata: options.metadata ?? {},
    params: options.params,
    version: options.version ?? 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyGraph(name = 'Test Graph'): Graph {
  return createTestGraph(name);
}

// ============================================
// Pre-built Graph Fixtures
// ============================================

/**
 * Simple linear graph: Constant -> Output
 */
export function createSimpleLinearGraph(): { graph: Graph; nodes: NodeDefinition[] } {
  const constant = createConstantNode(42, { x: 0, y: 0 });
  const output = createOutputNode('result', { x: 200, y: 0 });
  const edge = connectNodes(constant, output);

  const graph = createTestGraph('Simple Linear', [constant, output], [edge]);
  return { graph, nodes: [constant, output] };
}

/**
 * Transform chain: Constant -> Transformer -> Output
 */
export function createTransformChainGraph(): { graph: Graph; nodes: NodeDefinition[] } {
  const input = createConstantNode(10, { x: 0, y: 0 }, 'Input');
  const double = createTransformerNode(
    '$inputs.value * 2',
    [createInputPort('value')],
    { x: 200, y: 0 },
    'Double'
  );
  const output = createOutputNode('result', { x: 400, y: 0 });

  const edges = [
    connectNodes(input, double),
    connectNodes(double, output),
  ];

  const graph = createTestGraph('Transform Chain', [input, double, output], edges);
  return { graph, nodes: [input, double, output] };
}

/**
 * Aggregation graph: Multiple inputs -> Aggregator -> Output
 */
export function createAggregationGraph(
  method: 'sum' | 'mean' | 'min' | 'max' = 'sum',
  values: number[] = [10, 20, 30]
): { graph: Graph; nodes: NodeDefinition[] } {
  const constants = values.map((v, i) =>
    createConstantNode(v, { x: 0, y: i * 100 }, `Value ${i + 1}`)
  );
  const aggregator = createAggregatorNode(method, values.length, { x: 200, y: 100 });
  const output = createOutputNode('result', { x: 400, y: 100 });

  const edges = constants.map((c, i) =>
    connectNodes(c, aggregator, 0, i)
  );
  edges.push(connectNodes(aggregator, output));

  const graph = createTestGraph(`Aggregation (${method})`, [...constants, aggregator, output], edges);
  return { graph, nodes: [...constants, aggregator, output] };
}

/**
 * Decision graph: Input -> Decision -> Output
 */
export function createDecisionGraph(
  inputValue: number,
  condition: string,
  trueValue: unknown,
  falseValue: unknown
): { graph: Graph; nodes: NodeDefinition[] } {
  const input = createConstantNode(inputValue, { x: 0, y: 0 }, 'Input');
  const decision = createDecisionNode(
    condition,
    trueValue,
    falseValue,
    [createInputPort('value')],
    { x: 200, y: 0 }
  );
  const output = createOutputNode('result', { x: 400, y: 0 });

  const edges = [
    connectNodes(input, decision),
    connectNodes(decision, output),
  ];

  const graph = createTestGraph('Decision', [input, decision, output], edges);
  return { graph, nodes: [input, decision, output] };
}

/**
 * Monte Carlo graph with distribution
 */
export function createMonteCarloGraph(
  distribution: DistributionConfig = { type: 'normal', parameters: { mean: 100, stddev: 15 } }
): { graph: Graph; nodes: NodeDefinition[] } {
  const dist = createDistributionNode(distribution, { x: 0, y: 0 }, 'Random Value');
  const transformer = createTransformerNode(
    '$inputs.value * 1.1',
    [createInputPort('value')],
    { x: 200, y: 0 },
    'Apply Markup'
  );
  const output = createOutputNode('Final Value', { x: 400, y: 0 });

  const edges = [
    connectNodes(dist, transformer),
    connectNodes(transformer, output),
  ];

  const graph = createTestGraph('Monte Carlo', [dist, transformer, output], edges);
  return { graph, nodes: [dist, transformer, output] };
}

/**
 * Complex multi-path graph for testing topological sort
 */
export function createDiamondGraph(): { graph: Graph; nodes: NodeDefinition[] } {
  // Diamond pattern: A splits to B and C, both merge into D
  const a = createConstantNode(100, { x: 0, y: 100 }, 'A');
  const b = createTransformerNode(
    '$inputs.value + 10',
    [createInputPort('value')],
    { x: 200, y: 0 },
    'B'
  );
  const c = createTransformerNode(
    '$inputs.value * 2',
    [createInputPort('value')],
    { x: 200, y: 200 },
    'C'
  );
  const d = createAggregatorNode('sum', 2, { x: 400, y: 100 }, 'D');
  const output = createOutputNode('result', { x: 600, y: 100 });

  const edges = [
    connectNodes(a, b),
    connectNodes(a, c),
    connectNodes(b, d, 0, 0),
    connectNodes(c, d, 0, 1),
    connectNodes(d, output),
  ];

  const graph = createTestGraph('Diamond', [a, b, c, d, output], edges);
  return { graph, nodes: [a, b, c, d, output] };
}

/**
 * Graph with cycle for testing cycle detection
 */
export function createCyclicGraph(): { graph: Graph; nodes: NodeDefinition[] } {
  const a = createTransformerNode(
    '$inputs.value + 1',
    [createInputPort('value')],
    { x: 0, y: 0 },
    'A'
  );
  const b = createTransformerNode(
    '$inputs.value + 1',
    [createInputPort('value')],
    { x: 200, y: 0 },
    'B'
  );

  // Create cycle: A -> B -> A
  const edges = [
    createTestEdge(a.id, a.outputPorts[0].id, b.id, b.inputPorts[0].id),
    createTestEdge(b.id, b.outputPorts[0].id, a.id, a.inputPorts[0].id),
  ];

  const graph = createTestGraph('Cyclic', [a, b], edges);
  return { graph, nodes: [a, b] };
}

/**
 * Complex supply chain model for realistic testing
 */
export function createSupplyChainGraph(): { graph: Graph; nodes: NodeDefinition[] } {
  // Fixed costs
  const fixedCosts = createConstantNode(50000, { x: 0, y: 0 }, 'Fixed Costs');

  // Variable cost inputs
  const unitCost = createParameterNode(20, 15, 25, { x: 0, y: 100 }, 'Unit Cost');
  const demand = createDistributionNode(
    { type: 'normal', parameters: { mean: 5000, stddev: 800 } },
    { x: 0, y: 200 },
    'Demand'
  );

  // Calculate variable costs
  const variableCosts = createTransformerNode(
    '$inputs.unitCost * $inputs.demand',
    [createInputPort('unitCost'), createInputPort('demand')],
    { x: 250, y: 150 },
    'Variable Costs'
  );

  // Aggregate total
  const totalCost = createAggregatorNode('sum', 2, { x: 500, y: 75 }, 'Total Cost');

  // Output
  const output = createOutputNode('Total Operating Cost', { x: 700, y: 75 });

  const nodes = [fixedCosts, unitCost, demand, variableCosts, totalCost, output];
  const edges = [
    connectNodes(unitCost, variableCosts, 0, 0),
    connectNodes(demand, variableCosts, 0, 1),
    connectNodes(fixedCosts, totalCost, 0, 0),
    connectNodes(variableCosts, totalCost, 0, 1),
    connectNodes(totalCost, output),
  ];

  const graph = createTestGraph('Supply Chain', nodes, edges);
  return { graph, nodes };
}

// ============================================
// Simulation Config Helpers
// ============================================
export function createSimulationConfig(
  graphId: string,
  overrides: Partial<SimulationConfig> = {}
): SimulationConfig {
  return {
    id: genId('sim'),
    graphId,
    name: 'Test Simulation',
    mode: 'monte_carlo',
    iterations: 1000,
    maxExecutionTime: 60000,
    parallelism: 1,
    outputNodes: [],
    captureIntermediates: false,
    ...overrides,
  };
}

export function createDeterministicConfig(
  graphId: string,
  overrides: Partial<SimulationConfig> = {}
): SimulationConfig {
  return createSimulationConfig(graphId, {
    mode: 'deterministic',
    iterations: 1,
    ...overrides,
  });
}

// ============================================
// Expression Context Helpers
// ============================================
export function createExpressionContext(
  overrides: Partial<ExpressionContext> = {}
): ExpressionContext {
  return {
    $node: {},
    $inputs: {},
    $params: {},
    $time: 0,
    $iteration: 0,
    $nodes: {},
    ...overrides,
  };
}

// ============================================
// Assertion Helpers
// ============================================
export function expectGraphValid(graph: Graph): void {
  const { validateGraph } = require('../graph/index.js');
  const result = validateGraph(graph);
  if (!result.valid) {
    throw new Error(`Graph validation failed: ${result.errors.map((e: { message: string }) => e.message).join(', ')}`);
  }
}

export function expectNodeCount(graph: Graph, count: number): void {
  if (graph.nodes.length !== count) {
    throw new Error(`Expected ${count} nodes, got ${graph.nodes.length}`);
  }
}

export function expectEdgeCount(graph: Graph, count: number): void {
  if (graph.edges.length !== count) {
    throw new Error(`Expected ${count} edges, got ${graph.edges.length}`);
  }
}

// ============================================
// Random Data Generators
// ============================================
export function randomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomNumber(min, max + 1));
}

export function randomChoice<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

export function randomNodeType(): NodeType {
  const types: NodeType[] = [
    'CONSTANT', 'PARAMETER', 'DISTRIBUTION', 'TRANSFORMER',
    'AGGREGATOR', 'DECISION', 'CONSTRAINT', 'OUTPUT', 'DATA_SOURCE',
  ];
  return randomChoice(types);
}

// ============================================
// Performance Testing Helpers
// ============================================
export function createLargeGraph(nodeCount: number): Graph {
  const nodes: NodeDefinition[] = [];
  const edges: EdgeDefinition[] = [];

  // Create input constants
  const inputCount = Math.max(1, Math.floor(nodeCount * 0.1));
  for (let i = 0; i < inputCount; i++) {
    nodes.push(createConstantNode(randomNumber(1, 100), { x: 0, y: i * 50 }, `Input_${i}`));
  }

  // Create transformers in middle layers
  const transformerCount = Math.floor(nodeCount * 0.7);
  for (let i = 0; i < transformerCount; i++) {
    const transformer = createTransformerNode(
      '$inputs.value * 1.1',
      [createInputPort('value')],
      { x: 200 + Math.floor(i / 10) * 150, y: (i % 10) * 50 },
      `Transform_${i}`
    );
    nodes.push(transformer);
  }

  // Create output nodes
  const outputCount = Math.max(1, Math.floor(nodeCount * 0.2));
  for (let i = 0; i < outputCount; i++) {
    nodes.push(createOutputNode(`Output_${i}`, { x: 800, y: i * 50 }));
  }

  // Create edges (simple chain for now)
  for (let i = 0; i < nodes.length - 1; i++) {
    const source = nodes[i];
    const target = nodes[i + 1];
    if (source.outputPorts.length > 0 && target.inputPorts.length > 0) {
      edges.push(connectNodes(source, target));
    }
  }

  return createTestGraph(`Large Graph (${nodeCount} nodes)`, nodes, edges);
}

export function measureExecutionTime<T>(fn: () => T): { result: T; timeMs: number } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { result, timeMs: end - start };
}

export async function measureAsyncExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; timeMs: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { result, timeMs: end - start };
}
