// Main entry point for @scenarioforge/core

// Export all types first
export * from './types/index.js';

// Export graph utilities (excluding duplicates)
export {
  generateId,
  createPort,
  createNode,
  createEdge,
  createGraph,
  addNode,
  addEdge,
  updateNode,
  updateEdge,
  removeNode,
  removeEdge,
  getNode,
  getEdge,
  getConnectedNodes,
  getNodeInputEdges,
  getNodeOutputEdges,
  validateGraph,
  topologicalSort,
  cloneGraph,
  exportGraph,
  importGraph,
} from './graph/index.js';

export type {
  ValidationResult,
  ValidationWarning,
} from './graph/index.js';

// Export expression utilities
export * from './expression/index.js';

// Export simulation utilities
export {
  executeGraph,
  runMonteCarloSimulation,
  calculateRiskMetrics,
  runSensitivityAnalysis,
} from './simulation/index.js';
