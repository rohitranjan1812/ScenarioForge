// Graph Store - Zustand state management for graph data
// Local-first: works without backend, persists to localStorage
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Graph, 
  NodeDefinition, 
  EdgeDefinition, 
  CreateNodeInput, 
  CreateEdgeInput, 
  UpdateNodeInput, 
  Port,
  DataType 
} from '@scenarioforge/core';

// Generate UUID locally
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Create a port with generated ID
function createPort(input: { name: string; dataType: DataType; required?: boolean; multiple?: boolean; defaultValue?: unknown }): Port {
  return {
    id: generateId(),
    name: input.name,
    dataType: input.dataType,
    required: input.required ?? false,
    multiple: input.multiple ?? false,
    defaultValue: input.defaultValue,
  };
}

interface GraphState {
  // Current graph
  currentGraph: Graph | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  
  // All graphs list
  graphs: Graph[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadGraphs: () => Promise<void>;
  loadGraph: (id: string) => Promise<void>;
  createGraph: (name: string, description?: string) => Promise<Graph>;
  deleteGraph: (id: string) => Promise<void>;
  importGraphs: (newGraphs: Graph[]) => void;
  
  // Node operations
  addNode: (input: CreateNodeInput) => Promise<NodeDefinition>;
  updateNode: (nodeId: string, input: UpdateNodeInput) => Promise<void>;
  deleteNode: (nodeId: string) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  
  // Edge operations
  addEdge: (input: CreateEdgeInput) => Promise<EdgeDefinition>;
  updateEdge: (edgeId: string, updates: Partial<EdgeDefinition>) => Promise<void>;
  deleteEdge: (edgeId: string) => Promise<void>;
  selectEdge: (edgeId: string | null) => void;
  
  // Local graph mutations (for optimistic updates)
  setCurrentGraph: (graph: Graph | null) => void;
  updateLocalNode: (nodeId: string, updates: Partial<NodeDefinition>) => void;
  updateLocalNodes: (nodes: NodeDefinition[]) => void;
  updateLocalEdges: (edges: EdgeDefinition[]) => void;
  
  // Global parameters
  updateGraphParams: (params: Record<string, unknown>) => void;
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
      currentGraph: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      graphs: [],
      isLoading: false,
      error: null,
      
      loadGraphs: async () => {
        // In local mode, graphs are already loaded from persistence
        set({ isLoading: false, error: null });
      },
      
      loadGraph: async (id: string) => {
        const { graphs } = get();
        const graph = graphs.find(g => g.id === id);
        if (graph) {
          set({ 
            currentGraph: graph, 
            isLoading: false, 
            selectedNodeId: null, 
            selectedEdgeId: null 
          });
        } else {
          set({ error: 'Graph not found', isLoading: false });
        }
      },
      
      createGraph: async (name: string, description?: string) => {
        const now = new Date();
        const graph: Graph = {
          id: generateId(),
          name,
          description,
          nodes: [],
          edges: [],
          metadata: {},
          version: 1,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({ 
          graphs: [graph, ...state.graphs], 
          currentGraph: graph,
          selectedNodeId: null,
          selectedEdgeId: null,
        }));
        
        return graph;
      },
      
      deleteGraph: async (id: string) => {
        set((state) => ({
          graphs: state.graphs.filter((g) => g.id !== id),
          currentGraph: state.currentGraph?.id === id ? null : state.currentGraph,
        }));
      },
      
      importGraphs: (newGraphs: Graph[]) => {
        const { graphs } = get();
        // Filter out graphs that already exist (by name) - they will be reused
        const existingNames = new Set(graphs.map(g => g.name));
        const graphsToAdd = newGraphs.filter(g => !existingNames.has(g.name));
        
        if (graphsToAdd.length > 0) {
          set((state) => ({
            graphs: [...graphsToAdd, ...state.graphs],
          }));
          return graphsToAdd.length;
        }
        
        // If no new graphs added, but graphs were provided, select the first existing match
        if (newGraphs.length > 0) {
          const existingGraph = graphs.find(g => g.name === newGraphs[0].name);
          if (existingGraph) {
            set({ 
              currentGraph: existingGraph,
              selectedNodeId: null,
              selectedEdgeId: null,
            });
          }
        }
        
        return 0;
      },
      
      addNode: async (input: CreateNodeInput) => {
        const { currentGraph, graphs } = get();
        if (!currentGraph) throw new Error('No graph selected');
        
        const now = new Date();
        const node: NodeDefinition = {
          id: generateId(),
          type: input.type,
          name: input.name,
          description: input.description,
          position: input.position,
          schema: input.schema ?? { type: 'object', properties: {} },
          data: input.data ?? {},
          computeFunction: input.computeFunction,
          inputPorts: (input.inputPorts ?? []).map(p => createPort({
            name: p.name,
            dataType: p.dataType,
            required: p.required,
            multiple: p.multiple,
            defaultValue: p.defaultValue,
          })),
          outputPorts: (input.outputPorts ?? []).map(p => createPort({
            name: p.name,
            dataType: p.dataType,
            required: p.required,
            multiple: p.multiple,
            defaultValue: p.defaultValue,
          })),
          tags: input.tags ?? [],
          color: input.color,
          icon: input.icon,
          locked: false,
          createdAt: now,
          updatedAt: now,
        };
        
        const updatedGraph: Graph = {
          ...currentGraph,
          nodes: [...currentGraph.nodes, node],
          updatedAt: now,
        };
        
        set({
          currentGraph: updatedGraph,
          graphs: graphs.map(g => g.id === currentGraph.id ? updatedGraph : g),
        });
        
        return node;
      },
      
      updateNode: async (nodeId: string, input: UpdateNodeInput) => {
        const { currentGraph, graphs } = get();
        if (!currentGraph) throw new Error('No graph selected');
        
        const now = new Date();
        const updatedGraph: Graph = {
          ...currentGraph,
          nodes: currentGraph.nodes.map((n) =>
            n.id === nodeId 
              ? { ...n, ...input, updatedAt: now } 
              : n
          ),
          updatedAt: now,
        };
        
        set({
          currentGraph: updatedGraph,
          graphs: graphs.map(g => g.id === currentGraph.id ? updatedGraph : g),
        });
      },
      
      deleteNode: async (nodeId: string) => {
        const { currentGraph, graphs, selectedNodeId } = get();
        if (!currentGraph) throw new Error('No graph selected');
        
        const now = new Date();
        const updatedGraph: Graph = {
          ...currentGraph,
          nodes: currentGraph.nodes.filter((n) => n.id !== nodeId),
          edges: currentGraph.edges.filter(
            (e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
          ),
          updatedAt: now,
        };
        
        set({
          currentGraph: updatedGraph,
          graphs: graphs.map(g => g.id === currentGraph.id ? updatedGraph : g),
          selectedNodeId: selectedNodeId === nodeId ? null : selectedNodeId,
        });
      },
      
      selectNode: (nodeId: string | null) => {
        set({ selectedNodeId: nodeId, selectedEdgeId: null });
      },
      
      addEdge: async (input: CreateEdgeInput) => {
        const { currentGraph, graphs } = get();
        if (!currentGraph) throw new Error('No graph selected');
        
        // Validate nodes exist
        const sourceNode = currentGraph.nodes.find(n => n.id === input.sourceNodeId);
        const targetNode = currentGraph.nodes.find(n => n.id === input.targetNodeId);
        
        if (!sourceNode) throw new Error(`Source node ${input.sourceNodeId} not found`);
        if (!targetNode) throw new Error(`Target node ${input.targetNodeId} not found`);
        
        const now = new Date();
        const edge: EdgeDefinition = {
          id: generateId(),
          sourceNodeId: input.sourceNodeId,
          sourcePortId: input.sourcePortId,
          targetNodeId: input.targetNodeId,
          targetPortId: input.targetPortId,
          type: input.type ?? 'DATA_FLOW',
          schema: input.schema ?? { type: 'object' },
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
        
        const updatedGraph: Graph = {
          ...currentGraph,
          edges: [...currentGraph.edges, edge],
          updatedAt: now,
        };
        
        set({
          currentGraph: updatedGraph,
          graphs: graphs.map(g => g.id === currentGraph.id ? updatedGraph : g),
        });
        
        return edge;
      },
      
      deleteEdge: async (edgeId: string) => {
        const { currentGraph, graphs, selectedEdgeId } = get();
        if (!currentGraph) throw new Error('No graph selected');
        
        const now = new Date();
        const updatedGraph: Graph = {
          ...currentGraph,
          edges: currentGraph.edges.filter((e) => e.id !== edgeId),
          updatedAt: now,
        };
        
        set({
          currentGraph: updatedGraph,
          graphs: graphs.map(g => g.id === currentGraph.id ? updatedGraph : g),
          selectedEdgeId: selectedEdgeId === edgeId ? null : selectedEdgeId,
        });
      },
      
      updateEdge: async (edgeId: string, updates: Partial<EdgeDefinition>) => {
        const { currentGraph, graphs } = get();
        if (!currentGraph) throw new Error('No graph selected');
        
        const now = new Date();
        const updatedGraph: Graph = {
          ...currentGraph,
          edges: currentGraph.edges.map((e) =>
            e.id === edgeId 
              ? { ...e, ...updates, updatedAt: now } 
              : e
          ),
          updatedAt: now,
        };
        
        set({
          currentGraph: updatedGraph,
          graphs: graphs.map(g => g.id === currentGraph.id ? updatedGraph : g),
        });
      },
      
      selectEdge: (edgeId: string | null) => {
        set({ selectedEdgeId: edgeId, selectedNodeId: null });
      },
      
      setCurrentGraph: (graph: Graph | null) => {
        set({ currentGraph: graph });
      },
      
      updateLocalNode: (nodeId: string, updates: Partial<NodeDefinition>) => {
        const { currentGraph, graphs } = get();
        if (!currentGraph) return;
        
        const now = new Date();
        const updatedGraph: Graph = {
          ...currentGraph,
          nodes: currentGraph.nodes.map((n) =>
            n.id === nodeId ? { ...n, ...updates, updatedAt: now } : n
          ),
          updatedAt: now,
        };
        
        set({
          currentGraph: updatedGraph,
          graphs: graphs.map(g => g.id === currentGraph.id ? updatedGraph : g),
        });
      },
      
      updateLocalNodes: (nodes: NodeDefinition[]) => {
        const { currentGraph, graphs } = get();
        if (!currentGraph) return;
        
        const now = new Date();
        const updatedGraph: Graph = {
          ...currentGraph,
          nodes,
          updatedAt: now,
        };
        
        set({
          currentGraph: updatedGraph,
          graphs: graphs.map(g => g.id === currentGraph.id ? updatedGraph : g),
        });
      },
      
      updateLocalEdges: (edges: EdgeDefinition[]) => {
        const { currentGraph, graphs } = get();
        if (!currentGraph) return;
        
        const now = new Date();
        const updatedGraph: Graph = {
          ...currentGraph,
          edges,
          updatedAt: now,
        };
        
        set({
          currentGraph: updatedGraph,
          graphs: graphs.map(g => g.id === currentGraph.id ? updatedGraph : g),
        });
      },
      
      updateGraphParams: (params: Record<string, unknown>) => {
        const { currentGraph, graphs } = get();
        if (!currentGraph) return;
        
        const now = new Date();
        const updatedGraph: Graph = {
          ...currentGraph,
          params,
          updatedAt: now,
        };
        
        set({
          currentGraph: updatedGraph,
          graphs: graphs.map(g => g.id === currentGraph.id ? updatedGraph : g),
        });
      },
    }),
    {
      name: 'scenarioforge-graphs',
      // Custom serialization to handle Date objects
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          // Revive dates in graphs
          if (data.state?.graphs) {
            data.state.graphs = data.state.graphs.map((g: Graph) => ({
              ...g,
              createdAt: new Date(g.createdAt),
              updatedAt: new Date(g.updatedAt),
              nodes: g.nodes.map(n => ({
                ...n,
                createdAt: new Date(n.createdAt),
                updatedAt: new Date(n.updatedAt),
              })),
              edges: g.edges.map(e => ({
                ...e,
                createdAt: new Date(e.createdAt),
                updatedAt: new Date(e.updatedAt),
              })),
            }));
          }
          if (data.state?.currentGraph) {
            data.state.currentGraph = {
              ...data.state.currentGraph,
              createdAt: new Date(data.state.currentGraph.createdAt),
              updatedAt: new Date(data.state.currentGraph.updatedAt),
              nodes: data.state.currentGraph.nodes.map((n: NodeDefinition) => ({
                ...n,
                createdAt: new Date(n.createdAt),
                updatedAt: new Date(n.updatedAt),
              })),
              edges: data.state.currentGraph.edges.map((e: EdgeDefinition) => ({
                ...e,
                createdAt: new Date(e.createdAt),
                updatedAt: new Date(e.updatedAt),
              })),
            };
          }
          return data;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
