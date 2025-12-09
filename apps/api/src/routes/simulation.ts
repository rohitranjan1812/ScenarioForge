// Simulation Routes - Run simulations and get results
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/index.js';
import { 
  runMonteCarloSimulation, 
  executeGraph, 
  runSensitivityAnalysis,
} from '@scenarioforge/core';
import type { 
  Graph, 
  NodeDefinition, 
  EdgeDefinition,
  SimulationConfig,
  NodeType,
  EdgeType,
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

// GET /simulations - List simulations
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { graphId } = req.query;
    
    let query = 'SELECT * FROM simulations ORDER BY created_at DESC LIMIT 100';
    const values: string[] = [];
    
    if (graphId) {
      query = 'SELECT * FROM simulations WHERE graph_id = $1 ORDER BY created_at DESC LIMIT 100';
      values.push(String(graphId));
    }
    
    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing simulations:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to list simulations' } });
  }
});

// GET /simulations/:id - Get simulation status
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM simulations WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Simulation not found' } });
      return;
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error getting simulation:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to get simulation' } });
  }
});

// POST /simulations - Start a simulation
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { graphId, iterations = 10000, seed, outputNodes, mode = 'monte_carlo' } = req.body;
    
    if (!graphId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'graphId is required' } });
      return;
    }
    
    // Enforce iteration limits to prevent memory exhaustion
    const MAX_ITERATIONS = parseInt(process.env.MAX_SIMULATION_ITERATIONS ?? '1000000');
    const actualIterations = Math.min(iterations, MAX_ITERATIONS);
    
    if (iterations > MAX_ITERATIONS) {
      console.warn(`Simulation iterations capped from ${iterations} to ${MAX_ITERATIONS}`);
    }
    
    const graph = await getGraph(graphId);
    if (!graph) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Graph not found' } });
      return;
    }
    
    const simulationId = uuidv4();
    const now = new Date();
    
    const resolvedOutputNodes = outputNodes ?? graph.nodes.filter(n => n.type === 'OUTPUT').map(n => n.id);
    
    const config: Partial<SimulationConfig> = {
      graphId,
      mode,
      iterations: actualIterations,
      seed,
      outputNodes: resolvedOutputNodes,
    };
    
    await pool.query(
      `INSERT INTO simulations (id, graph_id, config, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [simulationId, graphId, JSON.stringify(config), 'running', now, now]
    );
    
    // Run simulation asynchronously
    setImmediate(async () => {
      try {
        const startTime = Date.now();
        
        // Build complete SimulationConfig with resource limits
        const maxExecutionTime = parseInt(process.env.MAX_SIMULATION_TIME ?? '300000'); // 5 minutes
        
        const fullConfig: SimulationConfig = {
          id: simulationId,
          graphId,
          name: `Simulation ${simulationId.substring(0, 8)}`,
          mode: mode ?? 'monte_carlo',
          iterations: actualIterations,
          seed,
          maxExecutionTime,
          parallelism: 1,
          outputNodes: resolvedOutputNodes,
          captureIntermediates: false,
        };
        
        const result = runMonteCarloSimulation(graph, fullConfig);
        const endTime = Date.now();
        
        if (!result.success) {
          throw new Error(result.error ?? 'Simulation failed');
        }
        
        // Calculate metrics from aggregated results (memory efficient)
        const metrics: Record<string, unknown> = {};
        for (const [key, value] of result.aggregated) {
          metrics[key] = value;
        }
        
        // Store only limited results sample to save memory
        const maxStoredResults = parseInt(process.env.MAX_STORED_RESULTS ?? '10000');
        const limitedResults = result.results.slice(0, maxStoredResults);
        
        await pool.query(
          `UPDATE simulations 
           SET status = $1, results = $2, metrics = $3, execution_time_ms = $4, updated_at = $5
           WHERE id = $6`,
          ['completed', JSON.stringify({ iterations: result.iterations, sample: limitedResults }), 
           JSON.stringify(metrics), endTime - startTime, new Date(), simulationId]
        );
      } catch (err) {
        console.error('Simulation failed:', err);
        await pool.query(
          `UPDATE simulations SET status = $1, error = $2, updated_at = $3 WHERE id = $4`,
          ['failed', String(err), new Date(), simulationId]
        );
      }
    });
    
    res.status(202).json({ 
      success: true, 
      data: { 
        id: simulationId, 
        status: 'running', 
        config: { ...config, iterations: actualIterations }
      } 
    });
  } catch (error) {
    console.error('Error starting simulation:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to start simulation' } });
  }
});

// GET /simulations/:id/results - Get simulation results
router.get('/:id/results', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT results FROM simulations WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Simulation not found' } });
      return;
    }
    
    res.json({ success: true, data: result.rows[0].results });
  } catch (error) {
    console.error('Error getting simulation results:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to get results' } });
  }
});

// GET /simulations/:id/metrics - Get risk metrics
router.get('/:id/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT metrics FROM simulations WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Simulation not found' } });
      return;
    }
    
    res.json({ success: true, data: result.rows[0].metrics });
  } catch (error) {
    console.error('Error getting simulation metrics:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to get metrics' } });
  }
});

// POST /simulations/execute - Run deterministic execution
router.post('/execute', async (req: Request, res: Response): Promise<void> => {
  try {
    const { graphId, params } = req.body;
    
    if (!graphId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'graphId is required' } });
      return;
    }
    
    const graph = await getGraph(graphId);
    if (!graph) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Graph not found' } });
      return;
    }
    
    const startTime = Date.now();
    const result = executeGraph(graph, params ?? {});
    const executionTimeMs = Date.now() - startTime;
    
    // Convert Map to object for JSON response
    const outputs: Record<string, unknown> = {};
    for (const [nodeId, output] of result.outputs) {
      outputs[nodeId] = output;
    }
    
    res.json({ 
      success: true, 
      data: { 
        outputs, 
        outputNodes: result.outputNodes, 
        executionTimeMs 
      } 
    });
  } catch (error) {
    console.error('Error executing graph:', error);
    res.status(500).json({ success: false, error: { code: 'EXECUTION_ERROR', message: String(error) } });
  }
});

// POST /simulations/sensitivity - Run sensitivity analysis
router.post('/sensitivity', async (req: Request, res: Response): Promise<void> => {
  try {
    const { graphId, parameterNodeId, parameterField, outputNodeId, outputField, range, steps = 20 } = req.body;
    
    if (!graphId || !parameterNodeId || !outputNodeId || !range) {
      res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_INPUT', message: 'Missing required parameters' } 
      });
      return;
    }
    
    const graph = await getGraph(graphId);
    if (!graph) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Graph not found' } });
      return;
    }
    
    const result = runSensitivityAnalysis(
      graph, 
      parameterNodeId, 
      parameterField ?? 'value',
      outputNodeId, 
      outputField ?? 'output',
      range as [number, number], 
      steps
    );
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error running sensitivity analysis:', error);
    res.status(500).json({ success: false, error: { code: 'EXECUTION_ERROR', message: String(error) } });
  }
});

// DELETE /simulations/:id - Cancel simulation
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `UPDATE simulations SET status = 'cancelled', updated_at = $1 WHERE id = $2 AND status = 'running' RETURNING id`,
      [new Date(), req.params.id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Running simulation not found' } });
      return;
    }
    
    res.json({ success: true, data: { id: req.params.id, status: 'cancelled' } });
  } catch (error) {
    console.error('Error cancelling simulation:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to cancel simulation' } });
  }
});

export default router;
