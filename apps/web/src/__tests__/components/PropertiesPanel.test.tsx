/**
 * ScenarioForge - Properties Panel Component Tests
 * 
 * Tests for the properties panel that edits selected node/edge properties
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertiesPanel } from '../../components/panels/PropertiesPanel';
import { useGraphStore } from '../../stores/graphStore';
import { useNavigationStore } from '../../stores/navigationStore';
import type { NodeDefinition } from '@scenarioforge/core';

// Mock the stores
vi.mock('../../stores/graphStore', () => ({
  useGraphStore: vi.fn(),
}));

vi.mock('../../stores/navigationStore', () => ({
  useNavigationStore: vi.fn(),
}));

const mockedUseGraphStore = useGraphStore as unknown as ReturnType<typeof vi.fn>;
const mockedUseNavigationStore = useNavigationStore as unknown as ReturnType<typeof vi.fn>;

describe('PropertiesPanel Component', () => {
  const mockNode: NodeDefinition = {
    id: 'test-node-1',
    type: 'CONSTANT',
    name: 'Test Constant',
    description: 'A test constant node',
    position: { x: 100, y: 100 },
    schema: { type: 'object', properties: {} },
    data: { value: 42 },
    inputPorts: [],
    outputPorts: [{ id: 'out1', name: 'output', dataType: 'number', required: false, multiple: false }],
    tags: [],
    locked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDistributionNode: NodeDefinition = {
    ...mockNode,
    id: 'dist-node-1',
    type: 'DISTRIBUTION',
    name: 'Test Distribution',
    data: { 
      distributionType: 'normal',
      mean: 100,
      stddev: 15,
    },
  };

  const mockTransformerNode: NodeDefinition = {
    ...mockNode,
    id: 'transformer-node-1',
    type: 'TRANSFORMER',
    name: 'Test Transformer',
    data: { 
      expression: '$inputs.value * 2',
    },
    inputPorts: [{ id: 'in1', name: 'value', dataType: 'number', required: false, multiple: false }],
  };

  const mockUpdateNode = vi.fn();
  const mockSelectNode = vi.fn();

  const mockGraph = {
    id: 'test-graph-1',
    name: 'Test Graph',
    nodes: [mockNode],
    edges: [],
    params: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseNavigationStore.mockReturnValue({
      getCurrentGraph: () => null,
    });
  });

  // ============================================
  // No Selection Tests
  // ============================================
  describe('No Selection', () => {
    beforeEach(() => {
      mockedUseGraphStore.mockReturnValue({
        currentGraph: mockGraph,
        selectedNodeId: null,
        selectedEdgeId: null,
        updateNode: mockUpdateNode,
        selectNode: mockSelectNode,
      });
    });

    it('should show empty state when nothing selected', () => {
      render(<PropertiesPanel />);
      expect(screen.getByText(/select a node/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // Node Selection Tests
  // ============================================
  describe('Node Selected', () => {
    beforeEach(() => {
      mockedUseGraphStore.mockReturnValue({
        currentGraph: mockGraph,
        selectedNodeId: mockNode.id,
        selectedEdgeId: null,
        updateNode: mockUpdateNode,
        selectNode: mockSelectNode,
      });
    });

    it('should display selected node properties', () => {
      render(<PropertiesPanel />);
      expect(screen.getByDisplayValue('Test Constant')).toBeInTheDocument();
    });

    it('should display node type', () => {
      render(<PropertiesPanel />);
      // Node type badge should show
      expect(screen.getByText(/CONSTANT/i)).toBeInTheDocument();
    });

    it('should display node value for constant nodes', () => {
      render(<PropertiesPanel />);
      // Should show the value input
      const valueInput = screen.getByDisplayValue('42');
      expect(valueInput).toBeInTheDocument();
    });
  });

  // ============================================
  // Distribution Node Tests
  // ============================================
  describe('Distribution Node', () => {
    beforeEach(() => {
      const distGraph = { ...mockGraph, nodes: [mockDistributionNode] };
      mockedUseGraphStore.mockReturnValue({
        currentGraph: distGraph,
        selectedNodeId: mockDistributionNode.id,
        selectedEdgeId: null,
        updateNode: mockUpdateNode,
        selectNode: mockSelectNode,
      });
    });

    it('should show distribution type selector', () => {
      render(<PropertiesPanel />);
      expect(screen.getByDisplayValue('normal')).toBeInTheDocument();
    });

    it('should show distribution parameters', () => {
      render(<PropertiesPanel />);
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('15')).toBeInTheDocument();
    });
  });

  // ============================================
  // Transformer Node Tests
  // ============================================
  describe('Transformer Node', () => {
    beforeEach(() => {
      const transGraph = { ...mockGraph, nodes: [mockTransformerNode] };
      mockedUseGraphStore.mockReturnValue({
        currentGraph: transGraph,
        selectedNodeId: mockTransformerNode.id,
        selectedEdgeId: null,
        updateNode: mockUpdateNode,
        selectNode: mockSelectNode,
      });
    });

    it('should show expression editor', () => {
      render(<PropertiesPanel />);
      expect(screen.getByDisplayValue('$inputs.value * 2')).toBeInTheDocument();
    });
  });

  // ============================================
  // Edit Tests
  // ============================================
  describe('Editing Properties', () => {
    beforeEach(() => {
      mockedUseGraphStore.mockReturnValue({
        currentGraph: mockGraph,
        selectedNodeId: mockNode.id,
        selectedEdgeId: null,
        updateNode: mockUpdateNode,
        selectNode: mockSelectNode,
      });
    });

    it('should update node name when edited', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel />);
      
      const nameInput = screen.getByDisplayValue('Test Constant');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      await user.tab();
      
      expect(mockUpdateNode).toHaveBeenCalled();
    });

    it('should update node value when edited', async () => {
      const user = userEvent.setup();
      render(<PropertiesPanel />);
      
      const valueInput = screen.getByDisplayValue('42');
      await user.clear(valueInput);
      await user.type(valueInput, '100');
      await user.tab();
      
      expect(mockUpdateNode).toHaveBeenCalled();
    });
  });
});
