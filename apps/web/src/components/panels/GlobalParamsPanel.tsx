// Global Parameters Panel - Edit graph-level $params accessible in all expressions
import { useCallback } from 'react';
import { useGraphStore } from '../../stores/graphStore';
import { NestedDataEditor } from '../editors/NestedDataEditor';

export function GlobalParamsPanel() {
  const { currentGraph, updateGraphParams } = useGraphStore();
  
  const handleParamsChange = useCallback((newParams: Record<string, unknown>) => {
    updateGraphParams(newParams);
  }, [updateGraphParams]);
  
  if (!currentGraph) {
    return (
      <div className="p-4 text-gray-400 text-sm">
        No graph selected
      </div>
    );
  }
  
  const params = currentGraph.params ?? {};
  
  return (
    <div className="p-4 space-y-4">
      <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-gray-200 mb-2">
          🌐 Global Simulation Parameters
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          These values are accessible in ALL expressions via <code className="text-blue-400">$params.fieldName</code>.
          Useful for simulation-wide settings like discount rates, time horizons, or scaling factors.
        </p>
        
        <NestedDataEditor
          data={params}
          onChange={handleParamsChange}
          maxDepth={8}
          title="Parameters"
          accessPrefix="$params"
        />
      </div>
      
      {/* Quick examples */}
      <div className="text-xs text-gray-500 bg-gray-800/50 rounded p-2">
        <div className="font-semibold text-gray-400 mb-1">Example Usage:</div>
        <code className="block text-gray-400 bg-gray-900 p-1 rounded text-xs font-mono">
          $inputs.value * $params.discountRate
        </code>
        <code className="block text-gray-400 bg-gray-900 p-1 rounded text-xs font-mono mt-1">
          $inputs.price * (1 + $params.taxes.salesTax)
        </code>
        <code className="block text-gray-400 bg-gray-900 p-1 rounded text-xs font-mono mt-1">
          $params.scenarios[0].growth * $time
        </code>
      </div>
    </div>
  );
}

export default GlobalParamsPanel;
