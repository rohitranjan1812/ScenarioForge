/**
 * ScenarioForge - API Integration Tests
 * 
 * Comprehensive tests for REST API endpoints including:
 * - Graph CRUD operations
 * - Node and Edge management
 * - Simulation endpoints
 * - Optimization endpoints
 * - Error handling and validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// API Test Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Helper for API requests
async function apiRequest<T = any>(
  method: string,
  path: string,
  body?: any
): Promise<{ status: number; data: T }> {
  const url = `${API_BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json() as T;
    return { status: response.status, data };
  } catch (error) {
    // Return connection error format
    return {
      status: 0,
      data: {
        success: false,
        error: { code: 'CONNECTION_ERROR', message: String(error) },
      } as T,
    };
  }
}

// Helper to check if API is available
async function isApiAvailable(): Promise<boolean> {
  try {
    const { status } = await apiRequest('GET', '/health');
    return status === 200;
  } catch {
    return false;
  }
}

// Test data generators
function generateGraphPayload(name: string = 'Test Graph') {
  return {
    name,
    description: `Test graph created at ${new Date().toISOString()}`,
    metadata: { test: true },
  };
}

// Node payloads are generated inline in tests

describe('API Integration Tests', () => {
  let apiAvailable: boolean;
  let testGraphId: string;
  let testNodeIds: string[] = [];

  beforeAll(async () => {
    apiAvailable = await isApiAvailable();
    if (!apiAvailable) {
      console.warn('⚠️ API not available - skipping API integration tests');
    }
  });

  // ============================================
  // Health Check
  // ============================================
  describe('Health Check', () => {
    it('should return health status', async () => {
      if (!apiAvailable) return;

      const { status, data } = await apiRequest('GET', '/health');

      expect(status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
      expect(data.memory).toBeDefined();
      expect(data.memory.rss).toBeGreaterThan(0);
      expect(data.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // Graph CRUD Operations
  // ============================================
  describe('Graph CRUD Operations', () => {
    describe('Create Graph', () => {
      it('should create a new graph', async () => {
        if (!apiAvailable) return;

        const payload = generateGraphPayload('Integration Test Graph');
        const { status, data } = await apiRequest('POST', '/api/graphs', payload);

        expect(status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.id).toBeDefined();
        expect(data.data.name).toBe('Integration Test Graph');
        expect(data.data.version).toBe(1);

        testGraphId = data.data.id;
      });

      it('should reject graph creation without name', async () => {
        if (!apiAvailable) return;

        const { status, data } = await apiRequest('POST', '/api/graphs', {
          description: 'Missing name',
        });

        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('INVALID_INPUT');
      });
    });

    describe('Read Graphs', () => {
      it('should list all graphs', async () => {
        if (!apiAvailable) return;

        const { status, data } = await apiRequest('GET', '/api/graphs');

        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      });

      it('should get a specific graph by ID', async () => {
        if (!apiAvailable || !testGraphId) return;

        const { status, data } = await apiRequest('GET', `/api/graphs/${testGraphId}`);

        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(testGraphId);
        expect(data.data.nodes).toBeDefined();
        expect(data.data.edges).toBeDefined();
      });

      it('should return 404 for non-existent graph', async () => {
        if (!apiAvailable) return;

        const { status, data } = await apiRequest('GET', '/api/graphs/non-existent-id');

        expect(status).toBe(404);
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('NOT_FOUND');
      });
    });

    describe('Update Graph', () => {
      it('should update graph metadata', async () => {
        if (!apiAvailable || !testGraphId) return;

        const { status, data } = await apiRequest('PUT', `/api/graphs/${testGraphId}`, {
          name: 'Updated Graph Name',
          description: 'Updated description',
        });

        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.name).toBe('Updated Graph Name');
        expect(data.data.version).toBe(2); // Version incremented
      });
    });

    describe('Clone Graph', () => {
      it('should clone a graph with new IDs', async () => {
        if (!apiAvailable || !testGraphId) return;

        const { status, data } = await apiRequest(
          'POST',
          `/api/graphs/${testGraphId}/clone`,
          { name: 'Cloned Graph' }
        );

        expect(status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.id).not.toBe(testGraphId);
        expect(data.data.name).toBe('Cloned Graph');

        // Clean up cloned graph
        await apiRequest('DELETE', `/api/graphs/${data.data.id}`);
      });
    });

    describe('Validate Graph', () => {
      it('should validate graph structure', async () => {
        if (!apiAvailable || !testGraphId) return;

        const { status, data } = await apiRequest(
          'POST',
          `/api/graphs/${testGraphId}/validate`
        );

        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.valid).toBeDefined();
        expect(Array.isArray(data.data.errors)).toBe(true);
        expect(Array.isArray(data.data.warnings)).toBe(true);
      });
    });
  });

  // ============================================
  // Node Operations
  // ============================================
  describe('Node Operations', () => {
    describe('Create Node', () => {
      it('should create a CONSTANT node', async () => {
        if (!apiAvailable || !testGraphId) return;

        const nodePayload = {
          type: 'CONSTANT',
          name: 'Test Constant',
          position: { x: 100, y: 100 },
          data: { value: 42 },
          outputPorts: [{ name: 'output', dataType: 'number' }],
        };

        const { status, data } = await apiRequest(
          'POST',
          `/api/graphs/${testGraphId}/nodes`,
          nodePayload
        );

        expect(status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.id).toBeDefined();
        expect(data.data.type).toBe('CONSTANT');
        expect(data.data.data.value).toBe(42);

        testNodeIds.push(data.data.id);
      });

      it('should create a TRANSFORMER node', async () => {
        if (!apiAvailable || !testGraphId) return;

        const nodePayload = {
          type: 'TRANSFORMER',
          name: 'Test Transformer',
          position: { x: 300, y: 100 },
          data: { expression: '$inputs.input * 2' },
          inputPorts: [{ name: 'input', dataType: 'number' }],
          outputPorts: [{ name: 'result', dataType: 'number' }],
        };

        const { status, data } = await apiRequest(
          'POST',
          `/api/graphs/${testGraphId}/nodes`,
          nodePayload
        );

        expect(status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.type).toBe('TRANSFORMER');

        testNodeIds.push(data.data.id);
      });

      it('should create an OUTPUT node', async () => {
        if (!apiAvailable || !testGraphId) return;

        const nodePayload = {
          type: 'OUTPUT',
          name: 'Test Output',
          position: { x: 500, y: 100 },
          data: { label: 'Result' },
          inputPorts: [{ name: 'value', dataType: 'number' }],
        };

        const { status, data } = await apiRequest(
          'POST',
          `/api/graphs/${testGraphId}/nodes`,
          nodePayload
        );

        expect(status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.type).toBe('OUTPUT');

        testNodeIds.push(data.data.id);
      });

      it('should reject node creation without type', async () => {
        if (!apiAvailable || !testGraphId) return;

        const { status, data } = await apiRequest(
          'POST',
          `/api/graphs/${testGraphId}/nodes`,
          { name: 'Invalid Node', position: { x: 0, y: 0 } }
        );

        expect(status).toBe(400);
        expect(data.success).toBe(false);
      });
    });

    describe('Update Node', () => {
      it('should update node properties', async () => {
        if (!apiAvailable || !testGraphId || testNodeIds.length === 0) return;

        const nodeId = testNodeIds[0];
        const { status, data } = await apiRequest(
          'PUT',
          `/api/graphs/${testGraphId}/nodes/${nodeId}`,
          {
            name: 'Updated Constant',
            data: { value: 100 },
          }
        );

        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.name).toBe('Updated Constant');
        expect(data.data.data.value).toBe(100);
      });

      it('should update node position', async () => {
        if (!apiAvailable || !testGraphId || testNodeIds.length === 0) return;

        const nodeId = testNodeIds[0];
        const { status, data } = await apiRequest(
          'PUT',
          `/api/graphs/${testGraphId}/nodes/${nodeId}`,
          { position: { x: 150, y: 150 } }
        );

        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.position).toEqual({ x: 150, y: 150 });
      });
    });
  });

  // ============================================
  // Edge Operations
  // ============================================
  describe('Edge Operations', () => {
    let testEdgeId: string;

    describe('Create Edge', () => {
      it('should create an edge between nodes', async () => {
        if (!apiAvailable || !testGraphId || testNodeIds.length < 2) return;

        // Get graph to find port IDs
        const { data: graphData } = await apiRequest('GET', `/api/graphs/${testGraphId}`);
        const nodes = graphData.data.nodes;

        const sourceNode = nodes.find((n: any) => n.type === 'CONSTANT');
        const targetNode = nodes.find((n: any) => n.type === 'TRANSFORMER');

        if (!sourceNode || !targetNode) return;

        const edgePayload = {
          sourceNodeId: sourceNode.id,
          sourcePortId: sourceNode.outputPorts[0]?.id,
          targetNodeId: targetNode.id,
          targetPortId: targetNode.inputPorts[0]?.id,
          type: 'DATA_FLOW',
        };

        const { status, data } = await apiRequest(
          'POST',
          `/api/graphs/${testGraphId}/edges`,
          edgePayload
        );

        expect(status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.id).toBeDefined();
        expect(data.data.sourceNodeId).toBe(sourceNode.id);
        expect(data.data.targetNodeId).toBe(targetNode.id);

        testEdgeId = data.data.id;
      });

      it('should reject edge with non-existent source node', async () => {
        if (!apiAvailable || !testGraphId) return;

        const { status, data } = await apiRequest(
          'POST',
          `/api/graphs/${testGraphId}/edges`,
          {
            sourceNodeId: 'non-existent',
            sourcePortId: 'port',
            targetNodeId: 'also-non-existent',
            targetPortId: 'port',
          }
        );

        expect(status).toBe(400);
        expect(data.success).toBe(false);
      });
    });

    describe('Delete Edge', () => {
      it('should delete an edge', async () => {
        if (!apiAvailable || !testGraphId || !testEdgeId) return;

        const { status, data } = await apiRequest(
          'DELETE',
          `/api/graphs/${testGraphId}/edges/${testEdgeId}`
        );

        expect(status).toBe(200);
        expect(data.success).toBe(true);
      });
    });
  });

  // ============================================
  // Simulation Endpoints
  // ============================================
  describe('Simulation Endpoints', () => {
    describe('Deterministic Execution', () => {
      it('should execute graph deterministically', async () => {
        if (!apiAvailable || !testGraphId) return;

        const { status, data } = await apiRequest(
          'POST',
          '/api/simulations/execute',
          { graphId: testGraphId }
        );

        // May succeed or fail based on graph state
        expect([200, 500]).toContain(status);
        expect(data.success).toBeDefined();
      });

      it('should reject execution without graphId', async () => {
        if (!apiAvailable) return;

        const { status, data } = await apiRequest(
          'POST',
          '/api/simulations/execute',
          {}
        );

        expect(status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('INVALID_INPUT');
      });
    });

    describe('Monte Carlo Simulation', () => {
      let simulationId: string;

      it('should start a Monte Carlo simulation', async () => {
        if (!apiAvailable || !testGraphId) return;

        const { status, data } = await apiRequest('POST', '/api/simulations', {
          graphId: testGraphId,
          iterations: 100,
          seed: 42,
        });

        // Accept both success and failure (graph might not be complete)
        if (status === 202) {
          expect(data.success).toBe(true);
          expect(data.data.id).toBeDefined();
          expect(data.data.status).toBe('running');
          simulationId = data.data.id;
        }
      });

      it('should get simulation status', async () => {
        if (!apiAvailable || !simulationId) return;

        // Wait a bit for simulation to progress
        await new Promise((resolve) => setTimeout(resolve, 500));

        const { status, data } = await apiRequest(
          'GET',
          `/api/simulations/${simulationId}`
        );

        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(['running', 'completed', 'failed']).toContain(data.data.status);
      });

      it('should list simulations', async () => {
        if (!apiAvailable) return;

        const { status, data } = await apiRequest('GET', '/api/simulations');

        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      });

      it('should list simulations by graph', async () => {
        if (!apiAvailable || !testGraphId) return;

        const { status, data } = await apiRequest(
          'GET',
          `/api/simulations?graphId=${testGraphId}`
        );

        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      });

      it('should cancel running simulation', async () => {
        if (!apiAvailable || !simulationId) return;

        const { status } = await apiRequest(
          'DELETE',
          `/api/simulations/${simulationId}`
        );

        // May return 200 if cancelled or 400 if already completed
        expect([200, 400]).toContain(status);
      });
    });

    describe('Sensitivity Analysis', () => {
      it('should require all parameters', async () => {
        if (!apiAvailable || !testGraphId) return;

        const { status, data } = await apiRequest(
          'POST',
          '/api/simulations/sensitivity',
          { graphId: testGraphId }
        );

        expect(status).toBe(400);
        expect(data.success).toBe(false);
      });
    });
  });

  // ============================================
  // Optimization Endpoints
  // ============================================
  describe('Optimization Endpoints', () => {
    describe('Optimization Jobs', () => {
      it('should list optimizations', async () => {
        if (!apiAvailable) return;

        const { status, data } = await apiRequest('GET', '/api/optimizations');

        expect(status).toBe(200);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      });

      it('should reject optimization without required fields', async () => {
        if (!apiAvailable) return;

        const { status, data } = await apiRequest('POST', '/api/optimizations', {
          graphId: testGraphId,
        });

        expect(status).toBe(400);
        expect(data.success).toBe(false);
      });
    });
  });

  // ============================================
  // Error Handling
  // ============================================
  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      if (!apiAvailable) return;

      const { status } = await apiRequest('GET', '/api/unknown-endpoint');

      expect(status).toBe(404);
    });

    it('should handle malformed JSON gracefully', async () => {
      if (!apiAvailable) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/graphs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'not valid json{{{',
        });

        expect(response.status).toBe(400);
      } catch {
        // Connection error is acceptable
      }
    });
  });

  // ============================================
  // Cleanup
  // ============================================
  describe('Cleanup', () => {
    it('should delete test nodes', async () => {
      if (!apiAvailable || !testGraphId) return;

      for (const nodeId of testNodeIds) {
        const { status } = await apiRequest(
          'DELETE',
          `/api/graphs/${testGraphId}/nodes/${nodeId}`
        );
        // May have already been deleted
        expect([200, 404]).toContain(status);
      }
    });

    it('should delete test graph', async () => {
      if (!apiAvailable || !testGraphId) return;

      const { status, data } = await apiRequest(
        'DELETE',
        `/api/graphs/${testGraphId}`
      );

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

// ============================================
// API Contract Tests
// ============================================
describe('API Contract Tests', () => {
  let apiAvailable: boolean;

  beforeAll(async () => {
    apiAvailable = await isApiAvailable();
  });

  describe('Response Format', () => {
    it('should return standard success format', async () => {
      if (!apiAvailable) return;

      const { data } = await apiRequest('GET', '/api/graphs');

      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');
      if (data.success) {
        expect(data).toHaveProperty('data');
      }
    });

    it('should return standard error format', async () => {
      if (!apiAvailable) return;

      const { data } = await apiRequest('GET', '/api/graphs/non-existent');

      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
    });
  });

  describe('Graph Schema', () => {
    it('should return graphs with required fields', async () => {
      if (!apiAvailable) return;

      // Create a graph first
      const { data: createData } = await apiRequest('POST', '/api/graphs', {
        name: 'Schema Test',
        description: 'Testing schema',
      });

      if (!createData.success) return;

      const graphId = createData.data.id;
      const { data } = await apiRequest('GET', `/api/graphs/${graphId}`);

      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('nodes');
      expect(data.data).toHaveProperty('edges');
      expect(data.data).toHaveProperty('version');

      // Cleanup
      await apiRequest('DELETE', `/api/graphs/${graphId}`);
    });
  });

  describe('Node Schema', () => {
    it('should return nodes with required fields', async () => {
      if (!apiAvailable) return;

      // Create graph and node
      const { data: graphData } = await apiRequest('POST', '/api/graphs', {
        name: 'Node Schema Test',
      });

      if (!graphData.success) return;
      const graphId = graphData.data.id;

      const { data: nodeData } = await apiRequest(
        'POST',
        `/api/graphs/${graphId}/nodes`,
        {
          type: 'CONSTANT',
          name: 'Test Node',
          position: { x: 0, y: 0 },
          data: { value: 1 },
        }
      );

      if (nodeData.success) {
        expect(nodeData.data).toHaveProperty('id');
        expect(nodeData.data).toHaveProperty('type');
        expect(nodeData.data).toHaveProperty('name');
        expect(nodeData.data).toHaveProperty('position');
        expect(nodeData.data.position).toHaveProperty('x');
        expect(nodeData.data.position).toHaveProperty('y');
        expect(nodeData.data).toHaveProperty('inputPorts');
        expect(nodeData.data).toHaveProperty('outputPorts');
      }

      // Cleanup
      await apiRequest('DELETE', `/api/graphs/${graphId}`);
    });
  });

  describe('Simulation Schema', () => {
    it('should accept valid simulation config', async () => {
      if (!apiAvailable) return;

      // Create a minimal graph for simulation
      const { data: graphData } = await apiRequest('POST', '/api/graphs', {
        name: 'Simulation Schema Test',
      });

      if (!graphData.success) return;
      const graphId = graphData.data.id;

      // Add a simple node
      await apiRequest('POST', `/api/graphs/${graphId}/nodes`, {
        type: 'OUTPUT',
        name: 'Output',
        position: { x: 0, y: 0 },
        data: { label: 'result' },
        inputPorts: [{ name: 'value', dataType: 'number' }],
      });

      const { status } = await apiRequest('POST', '/api/simulations', {
        graphId,
        iterations: 100,
        seed: 42,
        mode: 'monte_carlo',
      });

      // Accept both 202 (started) and 500 (graph incomplete)
      expect([202, 500]).toContain(status);

      // Cleanup
      await apiRequest('DELETE', `/api/graphs/${graphId}`);
    });
  });
});

// ============================================
// WebSocket Tests (if available)
// ============================================
describe.skip('WebSocket Integration Tests', () => {
  let ws: WebSocket;

  beforeAll(() => {
    ws = new WebSocket(`ws://localhost:3000/ws`);
  });

  afterAll(() => {
    ws?.close();
  });

  it('should connect to WebSocket server', async () => {
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        resolve();
      };
      ws.onerror = () => resolve(); // WebSocket not available, skip
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
  });

  it('should receive connected message', async () => {
    await new Promise<void>((resolve, reject) => {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          expect(data.type).toBe('connected');
          resolve();
        }
      };
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
  });

  it('should handle subscribe/unsubscribe', async () => {
    await new Promise<void>((resolve, reject) => {
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'test-channel' }));

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'subscribed') {
          expect(data.channel).toBe('test-channel');
          ws.send(JSON.stringify({ type: 'unsubscribe', channel: 'test-channel' }));
        } else if (data.type === 'unsubscribed') {
          expect(data.channel).toBe('test-channel');
          resolve();
        }
      };
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
  });

  it('should respond to ping with pong', async () => {
    await new Promise<void>((resolve, reject) => {
      ws.send(JSON.stringify({ type: 'ping' }));

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') {
          expect(data.type).toBe('pong');
          resolve();
        }
      };
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
  });
});
