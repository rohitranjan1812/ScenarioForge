// Breadcrumb Navigation - Navigate through graph hierarchy
import React from 'react';
import { useNavigationStore } from '../../stores/navigationStore';
import { useGraphStore } from '../../stores/graphStore';

export function BreadcrumbNavigation() {
  const { getBreadcrumbs, navigateBack, navigateToRoot } = useNavigationStore();
  const { loadGraph } = useGraphStore();
  const breadcrumbs = getBreadcrumbs();
  
  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs if at root level
  }
  
  const handleBreadcrumbClick = async (graphId: string, level: number) => {
    const currentLevel = breadcrumbs.length - 1;
    const levelsToGoBack = currentLevel - level;
    
    // Navigate back the appropriate number of times
    for (let i = 0; i < levelsToGoBack; i++) {
      navigateBack();
    }
    
    // Load the target graph
    await loadGraph(graphId);
  };
  
  const handleBackClick = async () => {
    if (breadcrumbs.length > 1) {
      navigateBack();
      const previousBreadcrumb = breadcrumbs[breadcrumbs.length - 2];
      await loadGraph(previousBreadcrumb.graphId);
    }
  };
  
  const handleRootClick = async () => {
    if (breadcrumbs.length > 1) {
      navigateToRoot();
      await loadGraph(breadcrumbs[0].graphId);
    }
  };
  
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
      <button
        onClick={handleBackClick}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
        title="Go back"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={handleRootClick}
        className="p-1 hover:bg-gray-200 rounded transition-colors"
        title="Go to root"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>
      
      <nav className="flex items-center gap-2 flex-1 overflow-x-auto">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={item.graphId}>
            {index > 0 && (
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <button
              onClick={() => handleBreadcrumbClick(item.graphId, item.level)}
              className={`px-2 py-1 rounded text-sm whitespace-nowrap transition-colors ${
                index === breadcrumbs.length - 1
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'hover:bg-gray-200 text-gray-700'
              }`}
            >
              {item.graphName}
            </button>
          </React.Fragment>
        ))}
      </nav>
      
      <div className="text-xs text-gray-500 flex-shrink-0">
        Level {breadcrumbs[breadcrumbs.length - 1].level + 1}
      </div>
    </div>
  );
}
