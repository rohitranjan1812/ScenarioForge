// Optimization Routes - Run optimization jobs
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/index.js';
import { 
  runMonteCarloSimulation, 
  calculateRiskMetrics 
} from '@scenarioforge/core';
import type { 
  Graph, 
  NodeDefinition, 
  EdgeDefinition,
  NodeType,
  EdgeType,
  SimulationConfig,
} from '@scenarioforge/core';

const router: Router = Router();
const pool = getPool();

interface DbRow {
  id: string;
  type?: string;
  name: string;
  description?: string;
  position?: { x: number; y: number };
  schema?: Record<string, unknown>;
  data?: Record<string, unknown>;
  compute_function?: string;
  input_ports?: unknown[];
  output_ports?: unknown[];
  tags?: string[];
  color?: string;
  icon?: string;
  locked?: boolean;
  created_at: Date;
  updated_at: Date;
  source_node_id?: string;
  source_port_id?: string;
  target_node_id?: string;
  target_port_id?: string;
  weight?: number;
  delay?: number;
  condition?: string;
  transform_function?: string;
  style?: Record<string, unknown>;
  animated?: boolean;
  label?: string;
  metadata?: Record<string, unknown>;
  version?: number;
  graph_id?: string;
  results?: unknown;
  metrics?: unknown;
  status?: string;
  config?: unknown;
  error?: string;
  execution_time_ms?: number;
  objective?: unknown;
  constraints?: unknown[];
  best_params?: unknown;
  best_value?: number;
  iteration_history?: unknown[];
}

interface OptimizationConfig {
  graphId: string;
  parameterNodes: Array<{
    nodeId: string;
    field: string;
    min: number;
    max: number;
  }>;
  objective: {
    nodeId: string;
    field: string;
    direction: 'minimize' | 'maximize';
    metric?: 'mean' | 'p5' | 'p95' | 'var' | 'cvar';
  };
  constraints?: Array<{
    nodeId: string;
    field: string;
    operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
    value: number;
  }>;
  iterations?: number;
  simulationIterations?: number;
  algorithm?: 'grid_search' | 'random_search' | 'bayesian';
}

async function getGraph(graphId: string): Promise<Graph | null> {
  const graphResult = await pool.query('SELECT * FROM graphs WHERE id = $1', [graphId]);
  if (graphResult.rows.length === 0) return null;
  const graphRow = graphResult.rows[0] as DbRow;
  
  const nodeResult = await pool.query('SELECT * FROM nodes WHERE graph_id = $1', [graphId]);
  const edgeResult = await pool.query('SELECT * FROM edges WHERE graph_id = $1', [graphId]);
  
  const nodes: NodeDefinition[] = nodeResult.rows.map((r: DbRow) => ({
    id: r.id,
    type: (r.type ?? 'CONSTANT') as NodeType,
    name: r.name,
    description: r.description,
    position: r.position ?? { x: 0, y: 0 },
    schema: r.schema ?? {},
    data: r.data ?? {},
    computeFunction: r.compute_function,
    inputPorts: (r.input_ports ?? []) as NodeDefinition['inputPorts'],
    outputPorts: (r.output_ports ?? []) as NodeDefinition['outputPorts'],
    tags: r.tags ?? [],
    color: r.color,
    icon: r.icon,
    locked: r.locked ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  
  const edges: EdgeDefinition[] = edgeResult.rows.map((r: DbRow) => ({
    id: r.id,
    sourceNodeId: r.source_node_id ?? '',
    sourcePortId: r.source_port_id ?? '',
    targetNodeId: r.target_node_id ?? '',
    targetPortId: r.target_port_id ?? '',
    type: (r.type ?? 'DATA_FLOW') as EdgeType,
    schema: r.schema ?? {},
    data: r.data ?? {},
    weight: r.weight,
    delay: r.delay,
    condition: r.condition,
    transformFunction: r.transform_function,
    style: r.style ?? {},
    animated: r.animated ?? false,
    label: r.label,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  
  return {
    id: graphRow.id,
    name: graphRow.name,
    description: graphRow.description,
    nodes,
    edges,
    metadata: graphRow.metadata ?? {},
    version: graphRow.version ?? 1,
    createdAt: graphRow.created_at,
    updatedAt: graphRow.updated_at,
  };
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function setNodeParameter(graph: Graph, nodeId: string, field: string, value: number): Graph {
  const newGraph = deepClone(graph);
  const node = newGraph.nodes.find(n => n.id === nodeId);
  if (node) {
    node.data[field] = value;
  }
  return newGraph;
}

function evaluateObjective(
  results: Record<string, number[]>,
  objective: OptimizationConfig['objective']
): number | null {
  const nodeResults = results[objective.nodeId];
  if (!nodeResults || nodeResults.length === 0) return null;
  
  const metrics = calculateRiskMetrics(nodeResults);
  
  switch (objective.metric ?? 'mean') {
    case 'mean': return metrics.mean;
    case 'p5': return metrics.percentiles.p5;
    case 'p95': return metrics.percentiles.p95;
    case 'var': return metrics.valueAtRisk.var95;
    case 'cvar': return metrics.conditionalVaR.cvar95;
    default: return metrics.mean;
  }
}

function checkConstraints(
  results: Record<string, number[]>,
  constraints: OptimizationConfig['constraints']
): boolean {
  if (!constraints || constraints.length === 0) return true;
  
  for (const constraint of constraints) {
    const nodeResults = results[constraint.nodeId];
    if (!nodeResults || nodeResults.length === 0) continue;
    
    const metrics = calculateRiskMetrics(nodeResults);
    const value = metrics.mean;
    
    switch (constraint.operator) {
      case 'lt': if (!(value < constraint.value)) return false; break;
      case 'lte': if (!(value <= constraint.value)) return false; break;
      case 'gt': if (!(value > constraint.value)) return false; break;
      case 'gte': if (!(value >= constraint.value)) return false; break;
      case 'eq': if (Math.abs(value - constraint.value) > 1e-9) return false; break;
    }
  }
  
  return true;
}

function generateParameterCombinations(
  parameterNodes: OptimizationConfig['parameterNodes'],
  gridSize: number
): Array<Record<string, number>> {
  const combinations: Array<Record<string, number>> = [];
  
  function helper(index: number, current: Record<string, number>): void {
    if (index === parameterNodes.length) {
      combinations.push({ ...current });
      return;
    }
    
    const param = parameterNodes[index];
    const step = (param.max - param.min) / (gridSize - 1);
    
    for (let i = 0; i < gridSize; i++) {
      const value = param.min + step * i;
      current[`${param.nodeId}.${param.field}`] = value;
      helper(index + 1, current);
    }
  }
  
  helper(0, {});
  return combinations;
}

// GET /optimization - List optimization jobs
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { graphId } = req.query;
    
    let query = 'SELECT * FROM optimizations ORDER BY created_at DESC LIMIT 100';
    const values: string[] = [];
    
    if (graphId) {
      query = 'SELECT * FROM optimizations WHERE graph_id = $1 ORDER BY created_at DESC LIMIT 100';
      values.push(String(graphId));
    }
    
    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing optimization jobs:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to list optimizations' } });
  }
});

// GET /optimization/:id - Get optimization status
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM optimizations WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Optimization not found' } });
      return;
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error getting optimization:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to get optimization' } });
  }
});

// POST /optimization - Start optimization
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const config = req.body as OptimizationConfig;
    
    if (!config.graphId || !config.parameterNodes || !config.objective) {
      res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_INPUT', message: 'Missing required parameters' } 
      });
      return;
    }
    
    const graph = await getGraph(config.graphId);
    if (!graph) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Graph not found' } });
      return;
    }
    
    const optimizationId = uuidv4();
    const now = new Date();
    
    await pool.query(
      `INSERT INTO optimizations (id, graph_id, config, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [optimizationId, config.graphId, JSON.stringify(config), 'running', now, now]
    );
    
    // Run optimization asynchronously
    setImmediate(async () => {
      try {
        const startTime = Date.now();
        const gridSize = Math.max(3, Math.min(10, Math.floor(Math.pow(config.iterations ?? 100, 1 / config.parameterNodes.length))));
        const combinations = generateParameterCombinations(config.parameterNodes, gridSize);
        
        let bestParams: Record<string, number> | null = null;
        let bestValue: number | null = null;
        const history: Array<{ params: Record<string, number>; value: number; feasible: boolean }> = [];
        
        for (const params of combinations) {
          // Apply parameters to graph
          let testGraph = deepClone(graph);
          for (const [key, value] of Object.entries(params)) {
            const [nodeId, field] = key.split('.');
            testGraph = setNodeParameter(testGraph, nodeId, field, value);
          }
          
          // Build complete SimulationConfig
          const simConfig: SimulationConfig = {
            id: uuidv4(),
            graphId: config.graphId,
            name: `Optimization ${optimizationId.substring(0, 8)}`,
            mode: 'monte_carlo',
            iterations: config.simulationIterations ?? 1000,
            maxExecutionTime: 60000,
            parallelism: 1,
            outputNodes: [config.objective.nodeId],
            captureIntermediates: false,
          };
          
          // Run simulation
          const simResult = runMonteCarloSimulation(testGraph, simConfig);
          
          // Convert results to Record<string, number[]> for evaluation
          const resultsByNode: Record<string, number[]> = {};
          for (const r of simResult.results) {
            if (!resultsByNode[r.nodeId]) {
              resultsByNode[r.nodeId] = [];
            }
            resultsByNode[r.nodeId].push(r.value);
          }
          
          // Evaluate objective
          const objectiveValue = evaluateObjective(resultsByNode, config.objective);
          const feasible = checkConstraints(resultsByNode, config.constraints);
          
          if (objectiveValue !== null) {
            history.push({ params, value: objectiveValue, feasible });
            
            if (feasible) {
              const isBetter = bestValue === null || 
                (config.objective.direction === 'maximize' ? objectiveValue > bestValue : objectiveValue < bestValue);
              
              if (isBetter) {
                bestParams = params;
                bestValue = objectiveValue;
              }
            }
          }
        }
        
        const endTime = Date.now();
        
        await pool.query(
          `UPDATE optimizations 
           SET status = $1, best_params = $2, best_value = $3, iteration_history = $4, execution_time_ms = $5, updated_at = $6
           WHERE id = $7`,
          ['completed', JSON.stringify(bestParams), bestValue, JSON.stringify(history), endTime - startTime, new Date(), optimizationId]
        );
      } catch (err) {
        console.error('Optimization failed:', err);
        await pool.query(
          `UPDATE optimizations SET status = $1, error = $2, updated_at = $3 WHERE id = $4`,
          ['failed', String(err), new Date(), optimizationId]
        );
      }
    });
    
    res.status(202).json({ 
      success: true, 
      data: { 
        id: optimizationId, 
        status: 'running', 
        config 
      } 
    });
  } catch (error) {
    console.error('Error starting optimization:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to start optimization' } });
  }
});

// GET /optimization/:id/history - Get optimization iteration history
router.get('/:id/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT iteration_history FROM optimizations WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Optimization not found' } });
      return;
    }
    
    res.json({ success: true, data: result.rows[0].iteration_history ?? [] });
  } catch (error) {
    console.error('Error getting optimization history:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to get history' } });
  }
});

// DELETE /optimization/:id - Cancel optimization
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `UPDATE optimizations SET status = 'cancelled', updated_at = $1 WHERE id = $2 AND status = 'running' RETURNING id`,
      [new Date(), req.params.id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Running optimization not found' } });
      return;
    }
    
    res.json({ success: true, data: { id: req.params.id, status: 'cancelled' } });
  } catch (error) {
    console.error('Error cancelling optimization:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to cancel optimization' } });
  }
});

export default router;
