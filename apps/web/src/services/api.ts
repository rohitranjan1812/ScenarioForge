// API Service - REST API client
import type {
  Graph,
  NodeDefinition,
  EdgeDefinition,
  CreateGraphInput,
  CreateNodeInput,
  CreateEdgeInput,
  UpdateNodeInput,
  UpdateEdgeInput,
  ApiResponse,
  SimulationConfig,
  RiskMetrics,
  OptimizationConfig,
  OptimizationResult,
} from '@scenarioforge/core';

const BASE_URL = '/api';

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message ?? 'Request failed');
  }
  
  return data;
}

export const api = {
  // Graphs
  getGraphs: () => request<Graph[]>('GET', '/graphs'),
  getGraph: (id: string) => request<Graph>('GET', `/graphs/${id}`),
  createGraph: (input: CreateGraphInput) => request<Graph>('POST', '/graphs', input),
  updateGraph: (id: string, input: Partial<CreateGraphInput>) =>
    request<Graph>('PUT', `/graphs/${id}`, input),
  deleteGraph: (id: string) => request<{ id: string }>('DELETE', `/graphs/${id}`),
  cloneGraph: (id: string, name?: string) =>
    request<Graph>('POST', `/graphs/${id}/clone`, { name }),
  exportGraph: (id: string) => request<unknown>('POST', `/graphs/${id}/export`),
  importGraph: (data: unknown) => request<Graph>('POST', '/graphs/import', data),
  validateGraph: (id: string) =>
    request<{ valid: boolean; errors: unknown[]; warnings: unknown[] }>(
      'POST',
      `/graphs/${id}/validate`
    ),
  
  // Nodes
  addNode: (graphId: string, input: CreateNodeInput) =>
    request<NodeDefinition>('POST', `/graphs/${graphId}/nodes`, input),
  updateNode: (graphId: string, nodeId: string, input: UpdateNodeInput) =>
    request<NodeDefinition>('PUT', `/graphs/${graphId}/nodes/${nodeId}`, input),
  deleteNode: (graphId: string, nodeId: string) =>
    request<{ id: string }>('DELETE', `/graphs/${graphId}/nodes/${nodeId}`),
  
  // Edges
  addEdge: (graphId: string, input: CreateEdgeInput) =>
    request<EdgeDefinition>('POST', `/graphs/${graphId}/edges`, input),
  updateEdge: (graphId: string, edgeId: string, input: UpdateEdgeInput) =>
    request<EdgeDefinition>('PUT', `/graphs/${graphId}/edges/${edgeId}`, input),
  deleteEdge: (graphId: string, edgeId: string) =>
    request<{ id: string }>('DELETE', `/graphs/${graphId}/edges/${edgeId}`),
  
  // Simulations
  getSimulations: (graphId?: string) =>
    request<unknown[]>('GET', graphId ? `/simulations?graphId=${graphId}` : '/simulations'),
  getSimulation: (id: string) => request<unknown>('GET', `/simulations/${id}`),
  startSimulation: (graphId: string, config: Partial<SimulationConfig>) =>
    request<{ id: string; status: string; config: SimulationConfig }>(
      'POST',
      '/simulations',
      { graphId, ...config }
    ),
  cancelSimulation: (id: string) =>
    request<{ id: string; status: string }>('DELETE', `/simulations/${id}`),
  getSimulationResults: (id: string, page?: number, pageSize?: number) =>
    request<{ items: unknown[]; total: number; page: number; pageSize: number; hasMore: boolean }>(
      'GET',
      `/simulations/${id}/results?page=${page ?? 1}&pageSize=${pageSize ?? 1000}`
    ),
  getSimulationMetrics: (id: string) =>
    request<Record<string, RiskMetrics>>('GET', `/simulations/${id}/metrics`),
  executeGraph: (graphId: string, params?: Record<string, unknown>) =>
    request<{ outputs: Record<string, unknown>; outputNodes: unknown[]; executionTimeMs: number }>(
      'POST',
      '/simulations/execute',
      { graphId, params }
    ),
  runSensitivity: (
    graphId: string,
    parameterNodeId: string,
    parameterField: string,
    outputNodeId: string,
    outputField: string,
    range: [number, number],
    steps?: number
  ) =>
    request<unknown>('POST', '/simulations/sensitivity', {
      graphId,
      parameterNodeId,
      parameterField,
      outputNodeId,
      outputField,
      range,
      steps,
    }),
  
  // Optimizations
  getOptimizations: (graphId?: string) =>
    request<unknown[]>(
      'GET',
      graphId ? `/optimizations?graphId=${graphId}` : '/optimizations'
    ),
  getOptimization: (id: string) => request<unknown>('GET', `/optimizations/${id}`),
  startOptimization: (graphId: string, config: Partial<OptimizationConfig>) =>
    request<{ id: string; status: string; config: OptimizationConfig }>(
      'POST',
      '/optimizations',
      { graphId, config }
    ),
  cancelOptimization: (id: string) =>
    request<{ id: string; status: string }>('DELETE', `/optimizations/${id}`),
  getOptimizationResults: (id: string) =>
    request<OptimizationResult>('GET', `/optimizations/${id}/results`),
};
