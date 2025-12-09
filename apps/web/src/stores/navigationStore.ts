// Graph Navigation Store - Handle hierarchical graph navigation
import { create } from 'zustand';
import type { GraphNavigationState, BreadcrumbItem } from '@scenarioforge/core';

interface NavigationStore extends GraphNavigationState {
  // Actions
  navigateToSubgraph: (graphId: string, graphName: string) => void;
  navigateBack: () => void;
  navigateToRoot: () => void;
  getBreadcrumbs: () => BreadcrumbItem[];
  
  // Graph name mapping
  graphNames: Map<string, string>;
  setGraphName: (graphId: string, name: string) => void;
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  navigationStack: [],
  currentGraphId: '',
  parentGraphId: undefined,
  graphNames: new Map(),
  
  navigateToSubgraph: (graphId: string, graphName: string) => {
    const { currentGraphId, navigationStack, graphNames } = get();
    
    // Add current graph name if not already in map
    if (currentGraphId) {
      set({
        navigationStack: [...navigationStack, currentGraphId],
        currentGraphId: graphId,
        parentGraphId: currentGraphId,
        graphNames: new Map(graphNames).set(graphId, graphName),
      });
    } else {
      set({
        currentGraphId: graphId,
        graphNames: new Map(graphNames).set(graphId, graphName),
      });
    }
  },
  
  navigateBack: () => {
    const { navigationStack } = get();
    if (navigationStack.length === 0) return;
    
    const newStack = [...navigationStack];
    const previousGraphId = newStack.pop()!;
    const newParentId = newStack.length > 0 ? newStack[newStack.length - 1] : undefined;
    
    set({
      navigationStack: newStack,
      currentGraphId: previousGraphId,
      parentGraphId: newParentId,
    });
  },
  
  navigateToRoot: () => {
    const { navigationStack } = get();
    if (navigationStack.length === 0) return;
    
    const rootGraphId = navigationStack[0];
    set({
      navigationStack: [],
      currentGraphId: rootGraphId,
      parentGraphId: undefined,
    });
  },
  
  getBreadcrumbs: () => {
    const { navigationStack, currentGraphId, graphNames } = get();
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Add all stack items
    navigationStack.forEach((graphId, index) => {
      breadcrumbs.push({
        graphId,
        graphName: graphNames.get(graphId) ?? 'Unknown',
        level: index,
      });
    });
    
    // Add current graph
    if (currentGraphId) {
      breadcrumbs.push({
        graphId: currentGraphId,
        graphName: graphNames.get(currentGraphId) ?? 'Current Graph',
        level: navigationStack.length,
      });
    }
    
    return breadcrumbs;
  },
  
  setGraphName: (graphId: string, name: string) => {
    const { graphNames } = get();
    set({
      graphNames: new Map(graphNames).set(graphId, name),
    });
  },
}));
