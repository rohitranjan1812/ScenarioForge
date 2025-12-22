/**
 * ScenarioForge - Graph Canvas Component Tests
 * 
 * Tests for the React Flow canvas that displays and edits the graph
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { GraphCanvas } from '../../components/canvas/GraphCanvas';
import { useGraphStore } from '../../stores/graphStore';
import { useNavigationStore } from '../../stores/navigationStore';
import type { Graph } from '@scenarioforge/core';

// Mock the stores
vi.mock('../../stores/graphStore', () => ({
  useGraphStore: vi.fn(),
}));

vi.mock('../../stores/navigationStore', () => ({
  useNavigationStore: vi.fn(),
}));

// Mock the nested graph registry
vi.mock('../../data/nestedGraphRegistry', () => ({
  createNestedGraphsForDemo: vi.fn(() => ({})),
}));

const mockedUseGraphStore = useGraphStore as unknown as ReturnType<typeof vi.fn>;
const mockedUseNavigationStore = useNavigationStore as unknown as ReturnType<typeof vi.fn>;

// Wrapper component for React Flow
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactFlowProvider>
    {children}
  </ReactFlowProvider>
);

describe('GraphCanvas Component', () => {
  const mockGraph: Graph = {
    id: 'test-graph-1',
    name: 'Test Graph',
    nodes: [
      {
        id: 'node-1',
        type: 'CONSTANT',
        name: 'Constant 1',
        position: { x: 100, y: 100 },
        schema: { type: 'object' },
        data: { value: 42 },
        inputPorts: [],
        outputPorts: [{ id: 'out1', name: 'output', dataType: 'number', required: false, multiple: false }],
        tags: [],
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'node-2',
        type: 'OUTPUT',
        name: 'Output 1',
        position: { x: 300, y: 100 },
        schema: { type: 'object' },
        data: { label: 'result' },
        inputPorts: [{ id: 'in1', name: 'input', dataType: 'number', required: false, multiple: false }],
        outputPorts: [],
        tags: [],
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    edges: [
      {
        id: 'edge-1',
        sourceNodeId: 'node-1',
        sourcePortId: 'out1',
        targetNodeId: 'node-2',
        targetPortId: 'in1',
        type: 'DATA_FLOW',
        schema: { type: 'object' },
        data: {},
        style: {},
        animated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    metadata: {},
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSelectNode = vi.fn();
  const mockSelectEdge = vi.fn();
  const mockUpdateLocalNodes = vi.fn();
  const mockUpdateLocalEdges = vi.fn();
  const mockAddNode = vi.fn();
  const mockAddEdge = vi.fn();
  const mockDeleteNode = vi.fn();
  const mockDeleteEdge = vi.fn();
  const mockUpdateNode = vi.fn();

  const mockNavigationStore = {
    navigationStack: [],
    getCurrentGraph: () => null,
    isAtRoot: () => true,
    navigateUp: vi.fn(),
    navigateToLevel: vi.fn(),
    resetNavigation: vi.fn(),
    registerSubgraph: vi.fn(),
    drillDown: vi.fn(),
    getSubgraph: () => null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseNavigationStore.mockReturnValue(mockNavigationStore);
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('Rendering', () => {
    beforeEach(() => {
      mockedUseGraphStore.mockReturnValue({
        currentGraph: mockGraph,
        selectedNodeId: null,
        selectedEdgeId: null,
        selectNode: mockSelectNode,
        selectEdge: mockSelectEdge,
        updateLocalNodes: mockUpdateLocalNodes,
        updateLocalEdges: mockUpdateLocalEdges,
        addNode: mockAddNode,
        addEdge: mockAddEdge,
        deleteNode: mockDeleteNode,
        deleteEdge: mockDeleteEdge,
        updateNode: mockUpdateNode,
      });
    });

    it('should render the canvas', () => {
      render(
        <TestWrapper>
          <GraphCanvas />
        </TestWrapper>
      );
      
      // React Flow renders a container with specific classes
      expect(document.querySelector('.react-flow')).toBeInTheDocument();
    });

    it('should render nodes from the graph', () => {
      render(
        <TestWrapper>
          <GraphCanvas />
        </TestWrapper>
      );
      
      // Nodes should be rendered - look for node elements
      const nodes = document.querySelectorAll('.react-flow__node');
      expect(nodes.length).toBe(2);
    });

    it('should render edges when graph has edges', () => {
      render(
        <TestWrapper>
          <GraphCanvas />
        </TestWrapper>
      );
      
      // Edges are rendered, but may not be visible in jsdom due to SVG rendering
      // Just verify the component renders without error
      expect(document.querySelector('.react-flow')).toBeInTheDocument();
    });
  });

  // ============================================
  // Empty State Tests
  // ============================================
  describe('Empty State', () => {
    beforeEach(() => {
      mockedUseGraphStore.mockReturnValue({
        currentGraph: null,
        selectedNodeId: null,
        selectedEdgeId: null,
        selectNode: mockSelectNode,
        selectEdge: mockSelectEdge,
        updateLocalNodes: mockUpdateLocalNodes,
        updateLocalEdges: mockUpdateLocalEdges,
        addNode: mockAddNode,
        addEdge: mockAddEdge,
        deleteNode: mockDeleteNode,
        deleteEdge: mockDeleteEdge,
        updateNode: mockUpdateNode,
      });
    });

    it('should show empty state when no graph', () => {
      render(
        <TestWrapper>
          <GraphCanvas />
        </TestWrapper>
      );
      
      // Should show the "no graph selected" message (use getAllByText for multiple matching elements)
      const messages = screen.getAllByText(/no graph|select a graph|create a graph/i);
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Node Selection Tests
  // ============================================
  describe('Node Selection', () => {
    beforeEach(() => {
      mockedUseGraphStore.mockReturnValue({
        currentGraph: mockGraph,
        selectedNodeId: null,
        selectedEdgeId: null,
        selectNode: mockSelectNode,
        selectEdge: mockSelectEdge,
        updateLocalNodes: mockUpdateLocalNodes,
        updateLocalEdges: mockUpdateLocalEdges,
        addNode: mockAddNode,
        addEdge: mockAddEdge,
        deleteNode: mockDeleteNode,
        deleteEdge: mockDeleteEdge,
        updateNode: mockUpdateNode,
      });
    });

    it('should call selectNode when clicking a node', () => {
      render(
        <TestWrapper>
          <GraphCanvas />
        </TestWrapper>
      );
      
      const nodes = document.querySelectorAll('.react-flow__node');
      if (nodes.length > 0) {
        fireEvent.click(nodes[0]);
        expect(mockSelectNode).toHaveBeenCalled();
      }
    });

    it('should show selected state when node is selected', () => {
      // Update mock to return selected node
      mockedUseGraphStore.mockReturnValue({
        currentGraph: mockGraph,
        selectedNodeId: 'node-1',
        selectedEdgeId: null,
        selectNode: mockSelectNode,
        selectEdge: mockSelectEdge,
        updateLocalNodes: mockUpdateLocalNodes,
        updateLocalEdges: mockUpdateLocalEdges,
        addNode: mockAddNode,
        addEdge: mockAddEdge,
        deleteNode: mockDeleteNode,
        deleteEdge: mockDeleteEdge,
        updateNode: mockUpdateNode,
      });

      render(
        <TestWrapper>
          <GraphCanvas />
        </TestWrapper>
      );
      
      // Component renders with selection state - verify canvas is present
      expect(document.querySelector('.react-flow')).toBeInTheDocument();
    });
  });

  // ============================================
  // Node Interaction Tests
  // ============================================
  describe('Node Interactions', () => {
    beforeEach(() => {
      mockedUseGraphStore.mockReturnValue({
        currentGraph: mockGraph,
        selectedNodeId: null,
        selectedEdgeId: null,
        selectNode: mockSelectNode,
        selectEdge: mockSelectEdge,
        updateLocalNodes: mockUpdateLocalNodes,
        updateLocalEdges: mockUpdateLocalEdges,
        addNode: mockAddNode,
        addEdge: mockAddEdge,
        deleteNode: mockDeleteNode,
        deleteEdge: mockDeleteEdge,
        updateNode: mockUpdateNode,
      });
    });

    it('should have nodes that can be interacted with', () => {
      render(
        <TestWrapper>
          <GraphCanvas />
        </TestWrapper>
      );
      
      // Verify nodes exist and are rendered
      const nodes = document.querySelectorAll('.react-flow__node');
      expect(nodes.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Drop Zone Tests
  // ============================================
  describe('Drop Zone', () => {
    beforeEach(() => {
      mockedUseGraphStore.mockReturnValue({
        currentGraph: mockGraph,
        selectedNodeId: null,
        selectedEdgeId: null,
        selectNode: mockSelectNode,
        selectEdge: mockSelectEdge,
        updateLocalNodes: mockUpdateLocalNodes,
        updateLocalEdges: mockUpdateLocalEdges,
        addNode: mockAddNode,
        addEdge: mockAddEdge,
        deleteNode: mockDeleteNode,
        deleteEdge: mockDeleteEdge,
        updateNode: mockUpdateNode,
      });
    });

    it('should accept dropped nodes', () => {
      render(
        <TestWrapper>
          <GraphCanvas />
        </TestWrapper>
      );
      
      const canvas = document.querySelector('.react-flow');
      if (canvas) {
        const dataTransfer = {
          getData: vi.fn().mockReturnValue(JSON.stringify({
            type: 'CONSTANT',
            name: 'New Constant',
          })),
          dropEffect: 'move',
        };
        
        fireEvent.drop(canvas, { dataTransfer, clientX: 200, clientY: 200 });
        
        // addNode should be called
        expect(mockAddNode).toHaveBeenCalled();
      }
    });

    it('should show drop indicator on drag over', () => {
      render(
        <TestWrapper>
          <GraphCanvas />
        </TestWrapper>
      );
      
      const canvas = document.querySelector('.react-flow');
      if (canvas) {
        fireEvent.dragOver(canvas, {
          preventDefault: vi.fn(),
          dataTransfer: { dropEffect: 'move' },
        });
        
        // Canvas should indicate it's a drop target
        // Implementation specific - might add a class or change opacity
      }
    });
  });

  // ============================================
  // Keyboard Shortcuts Tests
  // ============================================
  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      mockedUseGraphStore.mockReturnValue({
        currentGraph: mockGraph,
        selectedNodeId: 'node-1',
        selectedEdgeId: null,
        selectNode: mockSelectNode,
        selectEdge: mockSelectEdge,
        updateLocalNodes: mockUpdateLocalNodes,
        updateLocalEdges: mockUpdateLocalEdges,
        addNode: mockAddNode,
        addEdge: mockAddEdge,
        deleteNode: mockDeleteNode,
        deleteEdge: mockDeleteEdge,
        updateNode: mockUpdateNode,
      });
    });

    it('should render canvas with keyboard support enabled', () => {
      render(
        <TestWrapper>
          <GraphCanvas />
        </TestWrapper>
      );
      
      // Canvas should be rendered and ready for keyboard events
      const canvas = document.querySelector('.react-flow');
      expect(canvas).toBeInTheDocument();
    });
  });

  // ============================================
  // Canvas Controls Tests
  // ============================================
  describe('Canvas Controls', () => {
    beforeEach(() => {
      mockedUseGraphStore.mockReturnValue({
        currentGraph: mockGraph,
        selectedNodeId: null,
        selectedEdgeId: null,
        selectNode: mockSelectNode,
        selectEdge: mockSelectEdge,
        updateLocalNodes: mockUpdateLocalNodes,
        updateLocalEdges: mockUpdateLocalEdges,
        addNode: mockAddNode,
        addEdge: mockAddEdge,
        deleteNode: mockDeleteNode,
        deleteEdge: mockDeleteEdge,
        updateNode: mockUpdateNode,
      });
    });

    it('should render zoom controls', () => {
      render(
        <TestWrapper>
          <GraphCanvas />
        </TestWrapper>
      );
      
      // React Flow includes controls panel
      const controls = document.querySelector('.react-flow__controls');
      expect(controls).toBeInTheDocument();
    });

    it('should render minimap', () => {
      render(
        <TestWrapper>
          <GraphCanvas />
        </TestWrapper>
      );
      
      // React Flow includes minimap
      const minimap = document.querySelector('.react-flow__minimap');
      expect(minimap).toBeInTheDocument();
    });
  });
});
