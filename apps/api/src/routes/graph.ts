// Graph Routes - CRUD operations for graphs, nodes, and edges
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../db/index.js';
import type { 
  Graph, 
  NodeDefinition, 
  EdgeDefinition, 
  CreateGraphInput,
  CreateNodeInput,
  CreateEdgeInput,
  UpdateNodeInput,
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
}

// Helper to build a Graph from DB rows
async function buildGraphFromDb(graphId: string): Promise<Graph | null> {
  const graphResult = await pool.query('SELECT * FROM graphs WHERE id = $1', [graphId]);
  
  if (graphResult.rows.length === 0) return null;
  
  const graphRow = graphResult.rows[0] as DbRow;
  
  const nodeResult = await pool.query('SELECT * FROM nodes WHERE graph_id = $1 ORDER BY created_at', [graphId]);
  const edgeResult = await pool.query('SELECT * FROM edges WHERE graph_id = $1 ORDER BY created_at', [graphId]);
  
  const nodes: NodeDefinition[] = nodeResult.rows.map((row: DbRow) => ({
    id: row.id,
    type: (row.type ?? 'CONSTANT') as NodeType,
    name: row.name,
    description: row.description,
    position: row.position ?? { x: 0, y: 0 },
    schema: row.schema ?? {},
    data: row.data ?? {},
    computeFunction: row.compute_function,
    inputPorts: (row.input_ports ?? []) as NodeDefinition['inputPorts'],
    outputPorts: (row.output_ports ?? []) as NodeDefinition['outputPorts'],
    tags: row.tags ?? [],
    color: row.color,
    icon: row.icon,
    locked: row.locked ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  
  const edges: EdgeDefinition[] = edgeResult.rows.map((row: DbRow) => ({
    id: row.id,
    sourceNodeId: row.source_node_id ?? '',
    sourcePortId: row.source_port_id ?? '',
    targetNodeId: row.target_node_id ?? '',
    targetPortId: row.target_port_id ?? '',
    type: (row.type ?? 'DATA_FLOW') as EdgeType,
    schema: row.schema ?? {},
    data: row.data ?? {},
    weight: row.weight,
    delay: row.delay,
    condition: row.condition,
    transformFunction: row.transform_function,
    style: row.style ?? {},
    animated: row.animated ?? false,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

// GET /graphs - List all graphs
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT * FROM graphs ORDER BY updated_at DESC');
    
    const graphs: Graph[] = result.rows.map((row: DbRow) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      nodes: [],
      edges: [],
      metadata: row.metadata ?? {},
      version: row.version ?? 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    
    res.json({ success: true, data: graphs });
  } catch (error) {
    console.error('Error listing graphs:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to list graphs' } });
  }
});

// GET /graphs/:id - Get single graph
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const graph = await buildGraphFromDb(req.params.id);
    if (!graph) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Graph not found' } });
      return;
    }
    res.json({ success: true, data: graph });
  } catch (error) {
    console.error('Error getting graph:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to get graph' } });
  }
});

// POST /graphs - Create new graph
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const input: CreateGraphInput = req.body;
    const id = uuidv4();
    const now = new Date();
    
    await pool.query(
      `INSERT INTO graphs (id, name, description, metadata, version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, input.name, input.description ?? null, JSON.stringify(input.metadata ?? {}), 1, now, now]
    );
    
    const graph: Graph = {
      id,
      name: input.name,
      description: input.description,
      nodes: [],
      edges: [],
      metadata: input.metadata ?? {},
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    
    res.status(201).json({ success: true, data: graph });
  } catch (error) {
    console.error('Error creating graph:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to create graph' } });
  }
});

// PUT /graphs/:id - Update graph
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, metadata } = req.body;
    const now = new Date();
    
    const result = await pool.query(
      `UPDATE graphs 
       SET name = COALESCE($1, name), 
           description = COALESCE($2, description),
           metadata = COALESCE($3, metadata),
           version = version + 1,
           updated_at = $4
       WHERE id = $5
       RETURNING *`,
      [name, description, metadata ? JSON.stringify(metadata) : null, now, req.params.id]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Graph not found' } });
      return;
    }
    
    const graph = await buildGraphFromDb(req.params.id);
    res.json({ success: true, data: graph });
  } catch (error) {
    console.error('Error updating graph:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to update graph' } });
  }
});

// DELETE /graphs/:id - Delete graph
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('DELETE FROM graphs WHERE id = $1 RETURNING id', [req.params.id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Graph not found' } });
      return;
    }
    
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    console.error('Error deleting graph:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to delete graph' } });
  }
});

// POST /graphs/:id/clone - Clone a graph
router.post('/:id/clone', async (req: Request, res: Response): Promise<void> => {
  try {
    const sourceGraph = await buildGraphFromDb(req.params.id);
    if (!sourceGraph) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Graph not found' } });
      return;
    }
    
    const newId = uuidv4();
    const now = new Date();
    const newName = req.body.name || `${sourceGraph.name} (copy)`;
    
    await pool.query(
      `INSERT INTO graphs (id, name, description, metadata, version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [newId, newName, sourceGraph.description ?? null, JSON.stringify(sourceGraph.metadata), 1, now, now]
    );
    
    const nodeIdMap = new Map<string, string>();
    
    for (const node of sourceGraph.nodes) {
      const newNodeId = uuidv4();
      nodeIdMap.set(node.id, newNodeId);
      
      await pool.query(
        `INSERT INTO nodes (id, graph_id, type, name, description, position, schema, data, compute_function, input_ports, output_ports, tags, color, icon, locked, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [newNodeId, newId, node.type, node.name, node.description ?? null, JSON.stringify(node.position), 
         JSON.stringify(node.schema), JSON.stringify(node.data), node.computeFunction ?? null,
         JSON.stringify(node.inputPorts), JSON.stringify(node.outputPorts), JSON.stringify(node.tags),
         node.color ?? null, node.icon ?? null, node.locked, now, now]
      );
    }
    
    for (const edge of sourceGraph.edges) {
      const newEdgeId = uuidv4();
      const newSourceNodeId = nodeIdMap.get(edge.sourceNodeId) ?? edge.sourceNodeId;
      const newTargetNodeId = nodeIdMap.get(edge.targetNodeId) ?? edge.targetNodeId;
      
      await pool.query(
        `INSERT INTO edges (id, graph_id, source_node_id, source_port_id, target_node_id, target_port_id, type, schema, data, weight, delay, condition, transform_function, style, animated, label, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [newEdgeId, newId, newSourceNodeId, edge.sourcePortId, newTargetNodeId, edge.targetPortId,
         edge.type, JSON.stringify(edge.schema), JSON.stringify(edge.data), edge.weight ?? null,
         edge.delay ?? null, edge.condition ?? null, edge.transformFunction ?? null,
         JSON.stringify(edge.style), edge.animated, edge.label ?? null, now, now]
      );
    }
    
    const clonedGraph = await buildGraphFromDb(newId);
    res.status(201).json({ success: true, data: clonedGraph });
  } catch (error) {
    console.error('Error cloning graph:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to clone graph' } });
  }
});

// POST /graphs/:id/validate - Validate graph structure
router.post('/:id/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const graph = await buildGraphFromDb(req.params.id);
    if (!graph) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Graph not found' } });
      return;
    }
    
    const errors: { nodeId?: string; edgeId?: string; message: string }[] = [];
    const warnings: { nodeId?: string; edgeId?: string; message: string }[] = [];
    
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.sourceNodeId)) {
        errors.push({ edgeId: edge.id, message: `Source node ${edge.sourceNodeId} not found` });
      }
      if (!nodeIds.has(edge.targetNodeId)) {
        errors.push({ edgeId: edge.id, message: `Target node ${edge.targetNodeId} not found` });
      }
    }
    
    const nodesWithOutputs = new Set(graph.edges.map(e => e.sourceNodeId));
    for (const node of graph.nodes) {
      if (node.type !== 'OUTPUT' && !nodesWithOutputs.has(node.id)) {
        warnings.push({ nodeId: node.id, message: `Node ${node.name} has no outgoing connections` });
      }
    }
    
    res.json({ success: true, data: { valid: errors.length === 0, errors, warnings } });
  } catch (error) {
    console.error('Error validating graph:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to validate graph' } });
  }
});

// POST /graphs/:graphId/nodes - Add node to graph
router.post('/:graphId/nodes', async (req: Request, res: Response): Promise<void> => {
  try {
    const input: CreateNodeInput = req.body;
    const graphId = req.params.graphId;
    const id = uuidv4();
    const now = new Date();
    
    const graphResult = await pool.query('SELECT id FROM graphs WHERE id = $1', [graphId]);
    if (graphResult.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Graph not found' } });
      return;
    }
    
    const inputPorts = input.inputPorts?.map((p, i) => ({
      id: `${id}-input-${i}`,
      name: p.name,
      dataType: p.dataType,
      schema: p.schema,
      required: p.required ?? false,
      multiple: p.multiple ?? false,
      defaultValue: p.defaultValue,
    })) ?? [];
    
    const outputPorts = input.outputPorts?.map((p, i) => ({
      id: `${id}-output-${i}`,
      name: p.name,
      dataType: p.dataType,
      schema: p.schema,
      required: p.required ?? false,
      multiple: p.multiple ?? false,
      defaultValue: p.defaultValue,
    })) ?? [{ id: `${id}-output-0`, name: 'output', dataType: 'any', required: false, multiple: false }];
    
    await pool.query(
      `INSERT INTO nodes (id, graph_id, type, name, description, position, schema, data, compute_function, input_ports, output_ports, tags, color, icon, locked, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [id, graphId, input.type, input.name, input.description ?? null, JSON.stringify(input.position),
       JSON.stringify(input.schema ?? {}), JSON.stringify(input.data ?? {}), input.computeFunction ?? null,
       JSON.stringify(inputPorts), JSON.stringify(outputPorts), JSON.stringify(input.tags ?? []),
       input.color ?? null, input.icon ?? null, false, now, now]
    );
    
    await pool.query('UPDATE graphs SET updated_at = $1, version = version + 1 WHERE id = $2', [now, graphId]);
    
    const node: NodeDefinition = {
      id,
      type: input.type,
      name: input.name,
      description: input.description,
      position: input.position,
      schema: input.schema ?? {},
      data: input.data ?? {},
      computeFunction: input.computeFunction,
      inputPorts: inputPorts as NodeDefinition['inputPorts'],
      outputPorts: outputPorts as NodeDefinition['outputPorts'],
      tags: input.tags ?? [],
      color: input.color,
      icon: input.icon,
      locked: false,
      createdAt: now,
      updatedAt: now,
    };
    
    res.status(201).json({ success: true, data: node });
  } catch (error) {
    console.error('Error creating node:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to create node' } });
  }
});

// PUT /graphs/:graphId/nodes/:nodeId - Update node
router.put('/:graphId/nodes/:nodeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const input: UpdateNodeInput = req.body;
    const { graphId, nodeId } = req.params;
    const now = new Date();
    
    const updates: string[] = ['updated_at = $1'];
    const values: unknown[] = [now];
    let paramIndex = 2;
    
    if (input.name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(input.name); }
    if (input.description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(input.description); }
    if (input.position !== undefined) { updates.push(`position = $${paramIndex++}`); values.push(JSON.stringify(input.position)); }
    if (input.schema !== undefined) { updates.push(`schema = $${paramIndex++}`); values.push(JSON.stringify(input.schema)); }
    if (input.data !== undefined) { updates.push(`data = $${paramIndex++}`); values.push(JSON.stringify(input.data)); }
    if (input.computeFunction !== undefined) { updates.push(`compute_function = $${paramIndex++}`); values.push(input.computeFunction); }
    if (input.inputPorts !== undefined) { updates.push(`input_ports = $${paramIndex++}`); values.push(JSON.stringify(input.inputPorts)); }
    if (input.outputPorts !== undefined) { updates.push(`output_ports = $${paramIndex++}`); values.push(JSON.stringify(input.outputPorts)); }
    if (input.tags !== undefined) { updates.push(`tags = $${paramIndex++}`); values.push(JSON.stringify(input.tags)); }
    if (input.color !== undefined) { updates.push(`color = $${paramIndex++}`); values.push(input.color); }
    if (input.icon !== undefined) { updates.push(`icon = $${paramIndex++}`); values.push(input.icon); }
    if (input.locked !== undefined) { updates.push(`locked = $${paramIndex++}`); values.push(input.locked); }
    
    values.push(nodeId, graphId);
    
    const result = await pool.query(
      `UPDATE nodes SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND graph_id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Node not found' } });
      return;
    }
    
    await pool.query('UPDATE graphs SET updated_at = $1, version = version + 1 WHERE id = $2', [now, graphId]);
    
    const row = result.rows[0] as DbRow;
    const node: NodeDefinition = {
      id: row.id,
      type: (row.type ?? 'CONSTANT') as NodeType,
      name: row.name,
      description: row.description,
      position: row.position ?? { x: 0, y: 0 },
      schema: row.schema ?? {},
      data: row.data ?? {},
      computeFunction: row.compute_function,
      inputPorts: (row.input_ports ?? []) as NodeDefinition['inputPorts'],
      outputPorts: (row.output_ports ?? []) as NodeDefinition['outputPorts'],
      tags: row.tags ?? [],
      color: row.color,
      icon: row.icon,
      locked: row.locked ?? false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    
    res.json({ success: true, data: node });
  } catch (error) {
    console.error('Error updating node:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to update node' } });
  }
});

// DELETE /graphs/:graphId/nodes/:nodeId - Delete node
router.delete('/:graphId/nodes/:nodeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { graphId, nodeId } = req.params;
    const now = new Date();
    
    await pool.query('DELETE FROM edges WHERE graph_id = $1 AND (source_node_id = $2 OR target_node_id = $2)', [graphId, nodeId]);
    
    const result = await pool.query('DELETE FROM nodes WHERE id = $1 AND graph_id = $2 RETURNING id', [nodeId, graphId]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Node not found' } });
      return;
    }
    
    await pool.query('UPDATE graphs SET updated_at = $1, version = version + 1 WHERE id = $2', [now, graphId]);
    
    res.json({ success: true, data: { id: nodeId } });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to delete node' } });
  }
});

// POST /graphs/:graphId/edges - Add edge to graph
router.post('/:graphId/edges', async (req: Request, res: Response): Promise<void> => {
  try {
    const input: CreateEdgeInput = req.body;
    const graphId = req.params.graphId;
    const id = uuidv4();
    const now = new Date();
    
    await pool.query(
      `INSERT INTO edges (id, graph_id, source_node_id, source_port_id, target_node_id, target_port_id, type, schema, data, weight, delay, condition, transform_function, style, animated, label, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [id, graphId, input.sourceNodeId, input.sourcePortId, input.targetNodeId, input.targetPortId,
       input.type ?? 'DATA_FLOW', JSON.stringify(input.schema ?? {}), JSON.stringify(input.data ?? {}),
       input.weight ?? null, input.delay ?? null, input.condition ?? null, input.transformFunction ?? null,
       JSON.stringify(input.style ?? {}), input.animated ?? false, input.label ?? null, now, now]
    );
    
    await pool.query('UPDATE graphs SET updated_at = $1, version = version + 1 WHERE id = $2', [now, graphId]);
    
    const edge: EdgeDefinition = {
      id,
      sourceNodeId: input.sourceNodeId,
      sourcePortId: input.sourcePortId,
      targetNodeId: input.targetNodeId,
      targetPortId: input.targetPortId,
      type: (input.type ?? 'DATA_FLOW') as EdgeType,
      schema: input.schema ?? {},
      data: input.data ?? {},
      weight: input.weight,
      delay: input.delay,
      condition: input.condition,
      transformFunction: input.transformFunction,
      style: input.style ?? {},
      animated: input.animated ?? false,
      label: input.label,
      createdAt: now,
      updatedAt: now,
    };
    
    res.status(201).json({ success: true, data: edge });
  } catch (error) {
    console.error('Error creating edge:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to create edge' } });
  }
});

// DELETE /graphs/:graphId/edges/:edgeId - Delete edge
router.delete('/:graphId/edges/:edgeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { graphId, edgeId } = req.params;
    const now = new Date();
    
    const result = await pool.query('DELETE FROM edges WHERE id = $1 AND graph_id = $2 RETURNING id', [edgeId, graphId]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Edge not found' } });
      return;
    }
    
    await pool.query('UPDATE graphs SET updated_at = $1, version = version + 1 WHERE id = $2', [now, graphId]);
    
    res.json({ success: true, data: { id: edgeId } });
  } catch (error) {
    console.error('Error deleting edge:', error);
    res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to delete edge' } });
  }
});

export default router;
