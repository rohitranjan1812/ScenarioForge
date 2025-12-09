// Graph utility functions
import { v4 as uuidv4 } from 'uuid';
import type {
  Graph,
  NodeDefinition,
  EdgeDefinition,
  CreateNodeInput,
  UpdateNodeInput,
  CreateEdgeInput,
  UpdateEdgeInput,
  CreateGraphInput,
  Port,
  PortDefinition,
} from '../types/index.js';

// ============================================
// ID Generation
// ============================================

export function generateId(): string {
  return uuidv4();
}

// ============================================
// Port Utilities
// ============================================

export function createPort(definition: PortDefinition): Port {
  return {
    id: generateId(),
    name: definition.name,
    dataType: definition.dataType,
    schema: definition.schema,
    required: definition.required ?? false,
    multiple: definition.multiple ?? false,
    defaultValue: definition.defaultValue,
  };
}

// ============================================
// Node Factory
// ============================================

export function createNode(input: CreateNodeInput): NodeDefinition {
  const now = new Date();
  
  return {
    id: generateId(),
    type: input.type,
    name: input.name,
    description: input.description,
    position: input.position,
    schema: input.schema ?? { type: 'object', properties: {} },
    data: input.data ?? {},
    computeFunction: input.computeFunction,
    inputPorts: (input.inputPorts ?? []).map(createPort),
    outputPorts: (input.outputPorts ?? []).map(createPort),
    tags: input.tags ?? [],
    color: input.color,
    icon: input.icon,
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateNode(
  node: NodeDefinition,
  input: UpdateNodeInput
): NodeDefinition {
  return {
    ...node,
    ...input,
    updatedAt: new Date(),
  };
}

// ============================================
// Edge Factory
// ============================================

export function createEdge(input: CreateEdgeInput): EdgeDefinition {
  const now = new Date();
  
  return {
    id: generateId(),
    sourceNodeId: input.sourceNodeId,
    sourcePortId: input.sourcePortId,
    targetNodeId: input.targetNodeId,
    targetPortId: input.targetPortId,
    type: input.type ?? 'DATA_FLOW',
    schema: input.schema ?? { type: 'object', properties: {} },
    data: input.data ?? {},
    weight: input.weight,
    delay: input.delay,
    condition: input.condition,
    transformFunction: input.transformFunction,
    feedbackIterations: input.feedbackIterations,
    convergenceTolerance: input.convergenceTolerance,
    style: input.style ?? {},
    animated: input.animated ?? false,
    label: input.label,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateEdge(
  edge: EdgeDefinition,
  input: UpdateEdgeInput
): EdgeDefinition {
  return {
    ...edge,
    ...input,
    updatedAt: new Date(),
  };
}

// ============================================
// Graph Factory
// ============================================

export function createGraph(input: CreateGraphInput): Graph {
  const now = new Date();
  
  return {
    id: generateId(),
    name: input.name,
    description: input.description,
    nodes: [],
    edges: [],
    metadata: input.metadata ?? {},
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================
// Graph Operations
// ============================================

export function addNode(graph: Graph, input: CreateNodeInput): Graph {
  const node = createNode(input);
  return {
    ...graph,
    nodes: [...graph.nodes, node],
    updatedAt: new Date(),
  };
}

export function removeNode(graph: Graph, nodeId: string): Graph {
  // Also remove connected edges
  const edges = graph.edges.filter(
    (e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
  );
  
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => n.id !== nodeId),
    edges,
    updatedAt: new Date(),
  };
}

export function addEdge(graph: Graph, input: CreateEdgeInput): Graph {
  // Validate nodes exist
  const sourceNode = graph.nodes.find((n) => n.id === input.sourceNodeId);
  const targetNode = graph.nodes.find((n) => n.id === input.targetNodeId);
  
  if (!sourceNode) {
    throw new Error(`Source node ${input.sourceNodeId} not found`);
  }
  if (!targetNode) {
    throw new Error(`Target node ${input.targetNodeId} not found`);
  }
  
  // Validate ports exist
  const sourcePort = sourceNode.outputPorts.find((p) => p.id === input.sourcePortId);
  const targetPort = targetNode.inputPorts.find((p) => p.id === input.targetPortId);
  
  if (!sourcePort) {
    throw new Error(`Source port ${input.sourcePortId} not found on node ${input.sourceNodeId}`);
  }
  if (!targetPort) {
    throw new Error(`Target port ${input.targetPortId} not found on node ${input.targetNodeId}`);
  }
  
  const edge = createEdge(input);
  return {
    ...graph,
    edges: [...graph.edges, edge],
    updatedAt: new Date(),
  };
}

export function removeEdge(graph: Graph, edgeId: string): Graph {
  return {
    ...graph,
    edges: graph.edges.filter((e) => e.id !== edgeId),
    updatedAt: new Date(),
  };
}

export function getNode(graph: Graph, nodeId: string): NodeDefinition | undefined {
  return graph.nodes.find((n) => n.id === nodeId);
}

export function getEdge(graph: Graph, edgeId: string): EdgeDefinition | undefined {
  return graph.edges.find((e) => e.id === edgeId);
}

export function getNodeInputEdges(graph: Graph, nodeId: string): EdgeDefinition[] {
  return graph.edges.filter((e) => e.targetNodeId === nodeId);
}

export function getNodeOutputEdges(graph: Graph, nodeId: string): EdgeDefinition[] {
  return graph.edges.filter((e) => e.sourceNodeId === nodeId);
}

export function getConnectedNodes(graph: Graph, nodeId: string): NodeDefinition[] {
  const connectedIds = new Set<string>();
  
  for (const edge of graph.edges) {
    if (edge.sourceNodeId === nodeId) {
      connectedIds.add(edge.targetNodeId);
    }
    if (edge.targetNodeId === nodeId) {
      connectedIds.add(edge.sourceNodeId);
    }
  }
  
  return graph.nodes.filter((n) => connectedIds.has(n.id));
}

// ============================================
// Graph Validation
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export function validateGraph(graph: Graph): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Check for duplicate IDs
  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({
        code: 'DUPLICATE_NODE_ID',
        message: `Duplicate node ID: ${node.id}`,
        nodeId: node.id,
      });
    }
    nodeIds.add(node.id);
  }
  
  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      errors.push({
        code: 'DUPLICATE_EDGE_ID',
        message: `Duplicate edge ID: ${edge.id}`,
        edgeId: edge.id,
      });
    }
    edgeIds.add(edge.id);
  }
  
  // Validate edge references
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.sourceNodeId)) {
      errors.push({
        code: 'INVALID_SOURCE_NODE',
        message: `Edge ${edge.id} references non-existent source node: ${edge.sourceNodeId}`,
        edgeId: edge.id,
      });
    }
    if (!nodeIds.has(edge.targetNodeId)) {
      errors.push({
        code: 'INVALID_TARGET_NODE',
        message: `Edge ${edge.id} references non-existent target node: ${edge.targetNodeId}`,
        edgeId: edge.id,
      });
    }
  }
  
  // Check for disconnected nodes (warning)
  for (const node of graph.nodes) {
    const hasConnections = graph.edges.some(
      (e) => e.sourceNodeId === node.id || e.targetNodeId === node.id
    );
    if (!hasConnections) {
      warnings.push({
        code: 'DISCONNECTED_NODE',
        message: `Node ${node.name} (${node.id}) has no connections`,
        nodeId: node.id,
      });
    }
  }
  
  // Check for cycles (may be invalid for certain simulation modes)
  const hasCycle = detectCycle(graph);
  if (hasCycle) {
    warnings.push({
      code: 'GRAPH_HAS_CYCLE',
      message: 'Graph contains cycles. This may cause issues in deterministic simulations.',
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// Topological Sort
// ============================================

export function topologicalSort(graph: Graph): NodeDefinition[] | null {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  
  // Initialize
  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }
  
  // Build adjacency and count in-degrees
  for (const edge of graph.edges) {
    // Skip feedback edges for topological ordering
    if (edge.type === 'FEEDBACK') continue;
    
    const targets = adjacency.get(edge.sourceNodeId);
    if (targets) {
      targets.push(edge.targetNodeId);
    }
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
  }
  
  // Find nodes with no incoming edges
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }
  
  // Process queue
  const sorted: NodeDefinition[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (node) {
      sorted.push(node);
    }
    
    const targets = adjacency.get(nodeId) ?? [];
    for (const targetId of targets) {
      const newDegree = (inDegree.get(targetId) ?? 1) - 1;
      inDegree.set(targetId, newDegree);
      if (newDegree === 0) {
        queue.push(targetId);
      }
    }
  }
  
  // Check if all nodes were processed (no cycle)
  if (sorted.length !== graph.nodes.length) {
    return null; // Cycle detected
  }
  
  return sorted;
}

export function detectCycle(graph: Graph): boolean {
  return topologicalSort(graph) === null;
}

// ============================================
// Graph Cloning
// ============================================

export function cloneGraph(graph: Graph, newName?: string): Graph {
  const idMap = new Map<string, string>();
  
  // Generate new IDs for all nodes
  for (const node of graph.nodes) {
    idMap.set(node.id, generateId());
    for (const port of [...node.inputPorts, ...node.outputPorts]) {
      idMap.set(port.id, generateId());
    }
  }
  
  // Generate new IDs for edges
  for (const edge of graph.edges) {
    idMap.set(edge.id, generateId());
  }
  
  const now = new Date();
  
  // Clone nodes with new IDs
  const clonedNodes: NodeDefinition[] = graph.nodes.map((node) => ({
    ...node,
    id: idMap.get(node.id)!,
    inputPorts: node.inputPorts.map((port) => ({
      ...port,
      id: idMap.get(port.id)!,
    })),
    outputPorts: node.outputPorts.map((port) => ({
      ...port,
      id: idMap.get(port.id)!,
    })),
    createdAt: now,
    updatedAt: now,
  }));
  
  // Clone edges with new IDs and updated references
  const clonedEdges: EdgeDefinition[] = graph.edges.map((edge) => ({
    ...edge,
    id: idMap.get(edge.id)!,
    sourceNodeId: idMap.get(edge.sourceNodeId)!,
    sourcePortId: idMap.get(edge.sourcePortId)!,
    targetNodeId: idMap.get(edge.targetNodeId)!,
    targetPortId: idMap.get(edge.targetPortId)!,
    createdAt: now,
    updatedAt: now,
  }));
  
  return {
    id: generateId(),
    name: newName ?? `${graph.name} (Copy)`,
    description: graph.description,
    nodes: clonedNodes,
    edges: clonedEdges,
    metadata: { ...graph.metadata },
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================
// Graph Export/Import
// ============================================

export interface GraphExport {
  version: string;
  exportedAt: string;
  graph: Graph;
}

export function exportGraph(graph: Graph): GraphExport {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    graph,
  };
}

export function importGraph(exported: GraphExport): Graph {
  // Re-generate IDs on import to avoid conflicts
  return cloneGraph(exported.graph, exported.graph.name);
}

// ============================================
// Subgraph Utilities
// ============================================

/**
 * Find all SUBGRAPH nodes in a graph
 */
export function getSubgraphNodes(graph: Graph): NodeDefinition[] {
  return graph.nodes.filter(n => n.type === 'SUBGRAPH');
}

/**
 * Get all referenced subgraph IDs from a graph
 */
export function getReferencedSubgraphs(graph: Graph): string[] {
  const subgraphNodes = getSubgraphNodes(graph);
  return subgraphNodes
    .map(n => n.subgraphId)
    .filter((id): id is string => id !== undefined);
}

/**
 * Check if a graph contains cycles excluding FEEDBACK edges
 */
export function hasCyclesWithoutFeedback(graph: Graph): boolean {
  return detectCycle(graph);
}

/**
 * Get all feedback edges in a graph
 */
export function getFeedbackEdges(graph: Graph): EdgeDefinition[] {
  return graph.edges.filter(e => e.type === 'FEEDBACK');
}

/**
 * Create a subgraph from selected nodes
 */
export function createSubgraphFromNodes(
  parentGraph: Graph,
  nodeIds: string[],
  subgraphName: string
): { subgraph: Graph; mappings: { inputMappings: any[]; outputMappings: any[] } } {
  const selectedNodes = parentGraph.nodes.filter(n => nodeIds.includes(n.id));
  const nodeIdSet = new Set(nodeIds);
  
  // Find edges within the selection
  const internalEdges = parentGraph.edges.filter(
    e => nodeIdSet.has(e.sourceNodeId) && nodeIdSet.has(e.targetNodeId)
  );
  
  // Find boundary edges (input and output)
  const inputEdges = parentGraph.edges.filter(
    e => !nodeIdSet.has(e.sourceNodeId) && nodeIdSet.has(e.targetNodeId)
  );
  
  const outputEdges = parentGraph.edges.filter(
    e => nodeIdSet.has(e.sourceNodeId) && !nodeIdSet.has(e.targetNodeId)
  );
  
  const now = new Date();
  
  // Create the subgraph
  const subgraph: Graph = {
    id: generateId(),
    name: subgraphName,
    description: 'Extracted subgraph',
    nodes: selectedNodes.map(n => ({ ...n })),
    edges: internalEdges.map(e => ({ ...e })),
    metadata: { extractedFrom: parentGraph.id },
    parentGraphId: parentGraph.id,
    isSubgraph: true,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  
  // Create mappings for input/output ports
  const inputMappings = inputEdges.map(e => ({
    parentPortId: e.sourcePortId,
    subgraphNodeId: e.targetNodeId,
    subgraphPortId: e.targetPortId,
  }));
  
  const outputMappings = outputEdges.map(e => ({
    parentPortId: e.targetPortId,
    subgraphNodeId: e.sourceNodeId,
    subgraphPortId: e.sourcePortId,
  }));
  
  return { subgraph, mappings: { inputMappings, outputMappings } };
}
