// Navigation Store - Manages hierarchical graph navigation (drill-down into subgraphs)
import { create } from 'zustand';
import type { Graph } from '@scenarioforge/core';

export interface NavigationLevel {
  graphId: string;
  graphName: string;
  parentNodeId?: string; // The subgraph node ID in parent that we drilled into
}

interface NavigationState {
  // Stack of navigation levels (root is first, current is last)
  navigationStack: NavigationLevel[];
  
  // Registry of all subgraphs by their ID
  subgraphRegistry: Map<string, Graph>;
  
  // Current depth (0 = root)
  currentDepth: number;
  
  // Actions
  registerSubgraph: (subgraphId: string, graph: Graph) => void;
  unregisterSubgraph: (subgraphId: string) => void;
  getSubgraph: (subgraphId: string) => Graph | undefined;
  
  // Navigation
  drillDown: (subgraphId: string, subgraphNodeId: string) => void;
  navigateUp: () => void;
  navigateToLevel: (depth: number) => void;
  resetNavigation: (rootGraph: Graph) => void;
  
  // Current state
  getCurrentLevel: () => NavigationLevel | null;
  getCurrentGraph: () => Graph | null;
  isAtRoot: () => boolean;
  getBreadcrumbs: () => NavigationLevel[];
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  navigationStack: [],
  subgraphRegistry: new Map(),
  currentDepth: 0,
  
  registerSubgraph: (subgraphId: string, graph: Graph) => {
    set((state) => {
      const newRegistry = new Map(state.subgraphRegistry);
      newRegistry.set(subgraphId, graph);
      return { subgraphRegistry: newRegistry };
    });
  },
  
  unregisterSubgraph: (subgraphId: string) => {
    set((state) => {
      const newRegistry = new Map(state.subgraphRegistry);
      newRegistry.delete(subgraphId);
      return { subgraphRegistry: newRegistry };
    });
  },
  
  getSubgraph: (subgraphId: string) => {
    return get().subgraphRegistry.get(subgraphId);
  },
  
  drillDown: (subgraphId: string, subgraphNodeId: string) => {
    const { subgraphRegistry, navigationStack } = get();
    const subgraph = subgraphRegistry.get(subgraphId);
    
    if (!subgraph) {
      console.warn(`Subgraph not found: ${subgraphId}`);
      return;
    }
    
    const newLevel: NavigationLevel = {
      graphId: subgraph.id,
      graphName: subgraph.name,
      parentNodeId: subgraphNodeId,
    };
    
    set({
      navigationStack: [...navigationStack, newLevel],
      currentDepth: navigationStack.length,
    });
  },
  
  navigateUp: () => {
    const { navigationStack } = get();
    if (navigationStack.length <= 1) return; // Can't go above root
    
    set({
      navigationStack: navigationStack.slice(0, -1),
      currentDepth: navigationStack.length - 2,
    });
  },
  
  navigateToLevel: (depth: number) => {
    const { navigationStack } = get();
    if (depth < 0 || depth >= navigationStack.length) return;
    
    set({
      navigationStack: navigationStack.slice(0, depth + 1),
      currentDepth: depth,
    });
  },
  
  resetNavigation: (rootGraph: Graph) => {
    set({
      navigationStack: [{
        graphId: rootGraph.id,
        graphName: rootGraph.name,
      }],
      currentDepth: 0,
    });
  },
  
  getCurrentLevel: () => {
    const { navigationStack } = get();
    return navigationStack.length > 0 ? navigationStack[navigationStack.length - 1] : null;
  },
  
  getCurrentGraph: () => {
    const { navigationStack, subgraphRegistry } = get();
    if (navigationStack.length === 0) return null;
    
    const currentLevel = navigationStack[navigationStack.length - 1];
    
    // If at root (depth 0), return null (use graphStore's currentGraph)
    if (navigationStack.length === 1) return null;
    
    // Otherwise get from registry
    return subgraphRegistry.get(currentLevel.graphId) ?? null;
  },
  
  isAtRoot: () => {
    return get().navigationStack.length <= 1;
  },
  
  getBreadcrumbs: () => {
    return get().navigationStack;
  },
}));
