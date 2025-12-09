// ============================================
// Subgraph Execution Engine
// ============================================
// Handles execution of nested graphs within a parent graph,
// managing port mappings, context inheritance, and result bubbling.

import type {
  HierarchicalGraph,
  SubgraphNodeData,
  ExposedPort,
  ExecutionScope,
  HierarchicalExpressionContext,
  PortMappingConfig,
} from '../types/hierarchical.types.js';
import type { 
  Graph, 
  NodeDefinition, 
  EdgeDefinition,
} from '../types/index.js';

// ============================================
// Subgraph Resolution
// ============================================

/**
 * Registry for resolving subgraph references
 */
export interface SubgraphRegistry {
  getGraph(id: string, version?: number): Graph | undefined;
  getHierarchicalGraph(id: string, version?: number): HierarchicalGraph | undefined;
}

/**
 * In-memory subgraph registry for local graphs
 */
export class LocalSubgraphRegistry implements SubgraphRegistry {
  private graphs: Map<string, Graph> = new Map();
  private hierarchicalGraphs: Map<string, HierarchicalGraph> = new Map();
  
  register(graph: Graph): void {
    this.graphs.set(graph.id, graph);
  }
  
  registerHierarchical(graph: HierarchicalGraph): void {
    this.hierarchicalGraphs.set(graph.id, graph);
  }
  
  getGraph(id: string): Graph | undefined {
    return this.graphs.get(id);
  }
  
  getHierarchicalGraph(id: string): HierarchicalGraph | undefined {
    return this.hierarchicalGraphs.get(id);
  }
  
  clear(): void {
    this.graphs.clear();
    this.hierarchicalGraphs.clear();
  }
}

// Global registry instance
export const globalSubgraphRegistry = new LocalSubgraphRegistry();

// ============================================
// Port Mapping
// ============================================

/**
 * Maps external input values to internal subgraph ports
 */
export function mapInputsToSubgraph(
  externalInputs: Map<string, unknown>,
  portMappings: PortMappingConfig[],
  exposedPorts: ExposedPort[]
): Map<string, Map<string, unknown>> {
  // Map of internalNodeId -> portId -> value
  const internalInputs = new Map<string, Map<string, unknown>>();
  
  for (const mapping of portMappings) {
    const externalValue = externalInputs.get(mapping.externalPortId);
    if (externalValue === undefined) continue;
    
    // Find the exposed port to get the internal mapping
    const exposedPort = exposedPorts.find(p => p.id === mapping.internalPortId);
    if (!exposedPort) continue;
    
    // Apply transform if specified
    let value = externalValue;
    if (mapping.transform) {
      // TODO: Apply transform expression
      // For now, pass through
    }
    
    // Get or create node's input map
    let nodeInputs = internalInputs.get(exposedPort.internalNodeId);
    if (!nodeInputs) {
      nodeInputs = new Map();
      internalInputs.set(exposedPort.internalNodeId, nodeInputs);
    }
    
    nodeInputs.set(exposedPort.internalPortId, value);
  }
  
  return internalInputs;
}

/**
 * Maps internal subgraph outputs to external ports
 */
export function mapOutputsFromSubgraph(
  internalOutputs: Map<string, Record<string, unknown>>,
  portMappings: PortMappingConfig[],
  exposedPorts: ExposedPort[]
): Record<string, unknown> {
  const externalOutputs: Record<string, unknown> = {};
  
  for (const mapping of portMappings) {
    // Find the exposed port
    const exposedPort = exposedPorts.find(p => p.id === mapping.internalPortId);
    if (!exposedPort) continue;
    
    // Get the internal node's outputs
    const nodeOutputs = internalOutputs.get(exposedPort.internalNodeId);
    if (!nodeOutputs) continue;
    
    let value = nodeOutputs[exposedPort.internalPortId];
    
    // Handle aggregated ports
    if (exposedPort.mappingType === 'aggregated' && exposedPort.aggregation) {
      value = aggregateOutputs(
        internalOutputs,
        exposedPort.aggregation.sourceNodes,
        exposedPort.aggregation.method
      );
    }
    
    // Apply transform if specified
    if (mapping.transform) {
      // TODO: Apply transform expression
    }
    
    externalOutputs[mapping.externalPortId] = value;
  }
  
  return externalOutputs;
}

/**
 * Aggregates multiple internal outputs into a single value
 */
function aggregateOutputs(
  outputs: Map<string, Record<string, unknown>>,
  sourceNodes: Array<{ nodeId: string; portId: string }>,
  method: 'sum' | 'mean' | 'min' | 'max' | 'concat' | 'merge'
): unknown {
  const values: unknown[] = [];
  
  for (const source of sourceNodes) {
    const nodeOutput = outputs.get(source.nodeId);
    if (nodeOutput?.[source.portId] !== undefined) {
      values.push(nodeOutput[source.portId]);
    }
  }
  
  switch (method) {
    case 'sum':
      return (values as number[]).reduce((a, b) => a + b, 0);
    
    case 'mean': {
      const nums = values as number[];
      return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    }
    
    case 'min':
      return Math.min(...(values as number[]));
    
    case 'max':
      return Math.max(...(values as number[]));
    
    case 'concat':
      return values.flat();
    
    case 'merge':
      return Object.assign({}, ...values.map(v => 
        typeof v === 'object' && v !== null ? v : {}
      ));
    
    default:
      return values;
  }
}

// ============================================
// Context Inheritance
// ============================================

/**
 * Creates execution context for a subgraph based on parent context and scope
 */
export function createSubgraphContext(
  parentContext: HierarchicalExpressionContext,
  scope: ExecutionScope,
  subgraphPath: string[]
): HierarchicalExpressionContext {
  // Start with empty context
  const context: HierarchicalExpressionContext = {
    $node: {},
    $inputs: {},
    $params: {},
    $time: parentContext.$time,
    $iteration: scope.shareIterationState ? parentContext.$iteration : 0,
    $nodes: {},
    $parent: {
      params: parentContext.$params,
      outputs: {}, // Will be filled during execution
    },
    $root: parentContext.$root,
    $depth: parentContext.$depth + 1,
    $path: [...parentContext.$path, ...subgraphPath],
    $graphs: parentContext.$graphs,
    $feedback: {},
    $feedbackHistory: {},
  };
  
  // Inherit specified params
  for (const paramName of scope.inheritedParams) {
    if (paramName in parentContext.$params) {
      context.$params[paramName] = parentContext.$params[paramName];
    }
  }
  
  // Apply local overrides
  Object.assign(context.$params, scope.localParams);
  
  // Inherit specified context variables
  for (const varName of scope.inheritedContext) {
    // Handle special context variables
    switch (varName) {
      case '$time':
        if (scope.shareTimeState) {
          context.$time = parentContext.$time;
        }
        break;
      case '$iteration':
        if (scope.shareIterationState) {
          context.$iteration = parentContext.$iteration;
        }
        break;
    }
  }
  
  return context;
}

// ============================================
// Subgraph Expansion
// ============================================

/**
 * Options for subgraph expansion
 */
export interface ExpansionOptions {
  mode: 'inline' | 'isolated';
  preserveIds: boolean;
  prefix?: string;
}

/**
 * Expands a subgraph inline into its parent graph
 * (for inline execution mode)
 */
export function expandSubgraphInline(
  parentGraph: Graph,
  subgraphNodeId: string,
  subgraph: Graph,
  options: ExpansionOptions
): Graph {
  const subgraphNode = parentGraph.nodes.find(n => n.id === subgraphNodeId);
  if (!subgraphNode) {
    throw new Error(`Subgraph node ${subgraphNodeId} not found in parent graph`);
  }
  
  const prefix = options.prefix ?? `${subgraphNodeId}_`;
  
  // Create ID mapping for nodes
  const nodeIdMap = new Map<string, string>();
  
  // Clone and prefix subgraph nodes
  const expandedNodes: NodeDefinition[] = subgraph.nodes.map(node => {
    const newId = options.preserveIds ? node.id : `${prefix}${node.id}`;
    nodeIdMap.set(node.id, newId);
    
    return {
      ...node,
      id: newId,
      // Adjust position relative to subgraph node
      position: {
        x: subgraphNode.position.x + node.position.x,
        y: subgraphNode.position.y + node.position.y,
      },
      // Remap port IDs
      inputPorts: node.inputPorts.map(p => ({
        ...p,
        id: options.preserveIds ? p.id : `${prefix}${p.id}`,
      })),
      outputPorts: node.outputPorts.map(p => ({
        ...p,
        id: options.preserveIds ? p.id : `${prefix}${p.id}`,
      })),
    };
  });
  
  // Clone and remap subgraph edges
  const expandedEdges: EdgeDefinition[] = subgraph.edges.map(edge => ({
    ...edge,
    id: options.preserveIds ? edge.id : `${prefix}${edge.id}`,
    sourceNodeId: nodeIdMap.get(edge.sourceNodeId) ?? edge.sourceNodeId,
    targetNodeId: nodeIdMap.get(edge.targetNodeId) ?? edge.targetNodeId,
    sourcePortId: options.preserveIds 
      ? edge.sourcePortId 
      : `${prefix}${edge.sourcePortId}`,
    targetPortId: options.preserveIds 
      ? edge.targetPortId 
      : `${prefix}${edge.targetPortId}`,
  }));
  
  // Note: In a full implementation, we would reconnect incoming/outgoing edges
  // to the expanded boundary nodes using the exposed port information.
  // For now, we just track them for reference.
  // const incomingEdges = parentGraph.edges.filter(e => e.targetNodeId === subgraphNodeId);
  // const outgoingEdges = parentGraph.edges.filter(e => e.sourceNodeId === subgraphNodeId);

  // Remove subgraph node and its edges from parent
  const remainingNodes = parentGraph.nodes.filter(n => n.id !== subgraphNodeId);
  const remainingEdges = parentGraph.edges.filter(
    e => e.sourceNodeId !== subgraphNodeId && e.targetNodeId !== subgraphNodeId
  );
  
  // TODO: Reconnect incoming/outgoing edges to expanded boundary nodes
  // This requires exposed port information from the hierarchical graph
  
  return {
    ...parentGraph,
    nodes: [...remainingNodes, ...expandedNodes],
    edges: [...remainingEdges, ...expandedEdges],
    updatedAt: new Date(),
  };
}

// ============================================
// Execution State
// ============================================

export interface SubgraphExecutionState {
  subgraphNodeId: string;
  subgraphId: string;
  
  // Input values from parent
  inputs: Map<string, unknown>;
  
  // Output values to parent
  outputs: Record<string, unknown>;
  
  // Internal state
  nodeOutputs: Map<string, Record<string, unknown>>;
  
  // Execution info
  executed: boolean;
  error?: string;
}

/**
 * Creates initial execution state for a subgraph node
 */
export function createSubgraphExecutionState(
  subgraphNodeId: string,
  subgraphData: SubgraphNodeData
): SubgraphExecutionState {
  return {
    subgraphNodeId,
    subgraphId: subgraphData.subgraphId,
    inputs: new Map(),
    outputs: {},
    nodeOutputs: new Map(),
    executed: false,
  };
}

// ============================================
// Subgraph Node Execution
// ============================================

/**
 * Executes a subgraph node
 */
export async function executeSubgraphNode(
  node: NodeDefinition,
  subgraphData: SubgraphNodeData,
  inputs: Map<string, unknown>,
  parentContext: HierarchicalExpressionContext,
  registry: SubgraphRegistry,
  executeGraph: (graph: Graph, context: HierarchicalExpressionContext) => Promise<{
    outputs: Map<string, Record<string, unknown>>;
    success: boolean;
    error?: string;
  }>
): Promise<SubgraphExecutionState> {
  const state = createSubgraphExecutionState(node.id, subgraphData);
  state.inputs = inputs;
  
  // Resolve the subgraph
  const hierarchicalGraph = registry.getHierarchicalGraph(subgraphData.subgraphId);
  const graph = hierarchicalGraph ?? registry.getGraph(subgraphData.subgraphId);
  
  if (!graph) {
    state.error = `Subgraph ${subgraphData.subgraphId} not found`;
    return state;
  }
  
  // Create subgraph execution context
  const exposedInputs = hierarchicalGraph?.exposedInputPorts ?? [];
  const exposedOutputs = hierarchicalGraph?.exposedOutputPorts ?? [];
  const scope = hierarchicalGraph?.executionScope ?? {
    inheritedParams: [],
    inheritedContext: [],
    localParams: subgraphData.instanceParams ?? {},
    bubbleOutputs: true,
    bubbleErrors: true,
    shareIterationState: true,
    shareTimeState: true,
  };
  
  // Map inputs to internal ports
  const internalInputs = mapInputsToSubgraph(
    inputs,
    subgraphData.portMappings,
    exposedInputs
  );
  
  // Create context for subgraph
  const subgraphContext = createSubgraphContext(
    parentContext,
    scope,
    [subgraphData.subgraphId]
  );
  
  // Inject mapped inputs into context
  for (const [nodeId, portValues] of internalInputs) {
    for (const [portId, value] of portValues) {
      subgraphContext.$inputs[`${nodeId}.${portId}`] = value;
    }
  }
  
  try {
    // Execute the subgraph
    const result = await executeGraph(graph, subgraphContext);
    
    if (!result.success) {
      if (scope.bubbleErrors) {
        state.error = result.error;
      }
      return state;
    }
    
    state.nodeOutputs = result.outputs;
    
    // Map outputs back to external ports
    if (scope.bubbleOutputs) {
      state.outputs = mapOutputsFromSubgraph(
        result.outputs,
        subgraphData.portMappings,
        exposedOutputs
      );
    }
    
    state.executed = true;
  } catch (err) {
    state.error = err instanceof Error ? err.message : String(err);
  }
  
  return state;
}

// ============================================
// Utilities
// ============================================

/**
 * Validates that a graph can be used as a subgraph
 */
export function validateSubgraphStructure(
  graph: HierarchicalGraph
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check exposed ports reference valid internal nodes
  for (const port of [...graph.exposedInputPorts, ...graph.exposedOutputPorts]) {
    const node = graph.nodes.find(n => n.id === port.internalNodeId);
    if (!node) {
      errors.push(`Exposed port ${port.id} references non-existent node ${port.internalNodeId}`);
      continue;
    }
    
    const portList = port.id.startsWith('input') ? node.inputPorts : node.outputPorts;
    const internalPort = portList.find(p => p.id === port.internalPortId);
    if (!internalPort) {
      errors.push(`Exposed port ${port.id} references non-existent port ${port.internalPortId}`);
    }
  }
  
  // Check for circular subgraph references
  // TODO: Implement recursive check
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gets the effective depth of a graph hierarchy
 */
export function getHierarchyDepth(
  graph: HierarchicalGraph,
  registry: SubgraphRegistry,
  maxDepth: number = 100
): number {
  let depth = 0;
  
  // Find all subgraph nodes
  const subgraphNodes = graph.nodes.filter(n => n.type === 'SUBGRAPH');
  
  for (const node of subgraphNodes) {
    const data = node.data as unknown as SubgraphNodeData;
    if (!data.subgraphId) continue;
    const childGraph = registry.getHierarchicalGraph(data.subgraphId);
    
    if (childGraph && depth < maxDepth) {
      const childDepth = getHierarchyDepth(childGraph, registry, maxDepth - 1);
      depth = Math.max(depth, childDepth + 1);
    }
  }
  
  return depth;
}
