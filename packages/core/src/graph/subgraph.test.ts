// Tests for Subgraph and Feedback Loop functionality

import { describe, it, expect } from 'vitest';
import {
  createGraph,
  createNode,
  createEdge,
  getSubgraphNodes,
  getReferencedSubgraphs,
  getFeedbackEdges,
  createSubgraphFromNodes,
} from './index.js';
import type { Graph, NodeDefinition, EdgeDefinition } from '../types/index.js';

describe('Subgraph Utilities', () => {
  describe('getSubgraphNodes', () => {
    it('should find all SUBGRAPH type nodes', () => {
      const graph = createGraph({ name: 'Test Graph' });
      
      const node1 = createNode({
        type: 'SUBGRAPH',
        name: 'Subgraph 1',
        position: { x: 0, y: 0 },
        subgraphId: 'sg-1',
      });
      
      const node2 = createNode({
        type: 'CONSTANT',
        name: 'Constant',
        position: { x: 100, y: 0 },
      });
      
      const node3 = createNode({
        type: 'SUBGRAPH',
        name: 'Subgraph 2',
        position: { x: 200, y: 0 },
        subgraphId: 'sg-2',
      });
      
      graph.nodes = [node1, node2, node3];
      
      const subgraphNodes = getSubgraphNodes(graph);
      
      expect(subgraphNodes).toHaveLength(2);
      expect(subgraphNodes[0].type).toBe('SUBGRAPH');
      expect(subgraphNodes[1].type).toBe('SUBGRAPH');
    });
    
    it('should return empty array when no subgraph nodes exist', () => {
      const graph = createGraph({ name: 'Test Graph' });
      
      const node1 = createNode({
        type: 'CONSTANT',
        name: 'Constant',
        position: { x: 0, y: 0 },
      });
      
      graph.nodes = [node1];
      
      const subgraphNodes = getSubgraphNodes(graph);
      
      expect(subgraphNodes).toHaveLength(0);
    });
  });
  
  describe('getReferencedSubgraphs', () => {
    it('should extract all referenced subgraph IDs', () => {
      const graph = createGraph({ name: 'Test Graph' });
      
      const node1 = createNode({
        type: 'SUBGRAPH',
        name: 'Subgraph 1',
        position: { x: 0, y: 0 },
        subgraphId: 'sg-123',
      });
      
      const node2 = createNode({
        type: 'SUBGRAPH',
        name: 'Subgraph 2',
        position: { x: 100, y: 0 },
        subgraphId: 'sg-456',
      });
      
      graph.nodes = [node1, node2];
      
      const refs = getReferencedSubgraphs(graph);
      
      expect(refs).toEqual(['sg-123', 'sg-456']);
    });
    
    it('should filter out undefined subgraphIds', () => {
      const graph = createGraph({ name: 'Test Graph' });
      
      const node1 = createNode({
        type: 'SUBGRAPH',
        name: 'Subgraph 1',
        position: { x: 0, y: 0 },
        subgraphId: 'sg-123',
      });
      
      const node2 = createNode({
        type: 'SUBGRAPH',
        name: 'Subgraph 2',
        position: { x: 100, y: 0 },
        // No subgraphId
      });
      
      graph.nodes = [node1, node2];
      
      const refs = getReferencedSubgraphs(graph);
      
      expect(refs).toEqual(['sg-123']);
    });
  });
  
  describe('createSubgraphFromNodes', () => {
    it('should extract selected nodes into a new subgraph', () => {
      const parentGraph = createGraph({ name: 'Parent Graph' });
      
      const node1 = createNode({
        type: 'CONSTANT',
        name: 'Node 1',
        position: { x: 0, y: 0 },
        data: { value: 10 },
      });
      
      const node2 = createNode({
        type: 'TRANSFORMER',
        name: 'Node 2',
        position: { x: 100, y: 0 },
        data: { expression: '$inputs.input * 2' },
      });
      
      const node3 = createNode({
        type: 'OUTPUT',
        name: 'Node 3',
        position: { x: 200, y: 0 },
      });
      
      parentGraph.nodes = [node1, node2, node3];
      
      // Create edge between node1 and node2
      const edge1 = createEdge({
        sourceNodeId: node1.id,
        sourcePortId: 'out',
        targetNodeId: node2.id,
        targetPortId: 'in',
      });
      
      // Create edge between node2 and node3
      const edge2 = createEdge({
        sourceNodeId: node2.id,
        sourcePortId: 'out',
        targetNodeId: node3.id,
        targetPortId: 'in',
      });
      
      parentGraph.edges = [edge1, edge2];
      
      // Extract node1 and node2 into subgraph
      const result = createSubgraphFromNodes(
        parentGraph,
        [node1.id, node2.id],
        'My Subgraph'
      );
      
      expect(result.subgraph.name).toBe('My Subgraph');
      expect(result.subgraph.nodes).toHaveLength(2);
      expect(result.subgraph.edges).toHaveLength(1);
      expect(result.subgraph.isSubgraph).toBe(true);
      expect(result.subgraph.parentGraphId).toBe(parentGraph.id);
      
      // Check that output mappings include the edge from node2 to node3
      expect(result.mappings.outputMappings).toHaveLength(1);
      expect(result.mappings.outputMappings[0].subgraphNodeId).toBe(node2.id);
    });
  });
});

describe('Feedback Loop Utilities', () => {
  describe('getFeedbackEdges', () => {
    it('should find all FEEDBACK type edges', () => {
      const graph = createGraph({ name: 'Test Graph' });
      
      const node1 = createNode({
        type: 'CONSTANT',
        name: 'Node 1',
        position: { x: 0, y: 0 },
      });
      
      const node2 = createNode({
        type: 'TRANSFORMER',
        name: 'Node 2',
        position: { x: 100, y: 0 },
      });
      
      graph.nodes = [node1, node2];
      
      const edge1 = createEdge({
        sourceNodeId: node1.id,
        sourcePortId: 'out',
        targetNodeId: node2.id,
        targetPortId: 'in',
        type: 'DATA_FLOW',
      });
      
      const edge2 = createEdge({
        sourceNodeId: node2.id,
        sourcePortId: 'out',
        targetNodeId: node1.id,
        targetPortId: 'in',
        type: 'FEEDBACK',
        feedbackIterations: 50,
        convergenceTolerance: 0.01,
      });
      
      graph.edges = [edge1, edge2];
      
      const feedbackEdges = getFeedbackEdges(graph);
      
      expect(feedbackEdges).toHaveLength(1);
      expect(feedbackEdges[0].type).toBe('FEEDBACK');
      expect(feedbackEdges[0].feedbackIterations).toBe(50);
      expect(feedbackEdges[0].convergenceTolerance).toBe(0.01);
    });
    
    it('should return empty array when no feedback edges exist', () => {
      const graph = createGraph({ name: 'Test Graph' });
      
      const node1 = createNode({
        type: 'CONSTANT',
        name: 'Node 1',
        position: { x: 0, y: 0 },
      });
      
      const node2 = createNode({
        type: 'TRANSFORMER',
        name: 'Node 2',
        position: { x: 100, y: 0 },
      });
      
      graph.nodes = [node1, node2];
      
      const edge = createEdge({
        sourceNodeId: node1.id,
        sourcePortId: 'out',
        targetNodeId: node2.id,
        targetPortId: 'in',
        type: 'DATA_FLOW',
      });
      
      graph.edges = [edge];
      
      const feedbackEdges = getFeedbackEdges(graph);
      
      expect(feedbackEdges).toHaveLength(0);
    });
  });
});

describe('Graph Properties', () => {
  describe('isSubgraph flag', () => {
    it('should mark graphs as subgraphs', () => {
      const graph = createGraph({
        name: 'Subgraph',
        metadata: { isSubgraph: true },
      });
      
      graph.isSubgraph = true;
      graph.parentGraphId = 'parent-123';
      
      expect(graph.isSubgraph).toBe(true);
      expect(graph.parentGraphId).toBe('parent-123');
    });
  });
});
