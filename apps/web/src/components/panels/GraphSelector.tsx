// Graph Selector - Create, select, and manage graphs
// Uses lazy loading to avoid generating all sample graphs at once
import { useState, useEffect } from 'react';
import { useGraphStore } from '../../stores/graphStore';
import { sampleCatalog, getSampleById, type SampleInfo } from '../../data/sampleRegistry';

export function GraphSelector() {
  const {
    graphs,
    currentGraph,
    isLoading,
    loadGraphs,
    loadGraph,
    createGraph,
    setCurrentGraph,
    deleteGraph,
    importGraphs,
  } = useGraphStore();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSamplesDialog, setShowSamplesDialog] = useState(false);
  const [newGraphName, setNewGraphName] = useState('');
  const [newGraphDescription, setNewGraphDescription] = useState('');
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SampleInfo['category'] | 'All'>('All');
  
  // Load graphs on mount
  useEffect(() => {
    loadGraphs();
  }, [loadGraphs]);
  
  const handleCreate = async () => {
    if (!newGraphName.trim()) return;
    
    try {
      await createGraph(newGraphName, newGraphDescription);
      setShowCreateDialog(false);
      setNewGraphName('');
      setNewGraphDescription('');
    } catch (error) {
      console.error('Failed to create graph:', error);
    }
  };
  
  const handleDelete = async (graphId: string) => {
    if (!confirm('Are you sure you want to delete this graph?')) return;
    
    try {
      await deleteGraph(graphId);
    } catch (error) {
      console.error('Failed to delete graph:', error);
    }
  };
  
  // Load a single sample graph (lazy)
  const handleLoadSingleSample = (sampleId: string) => {
    setLoadingSample(sampleId);
    
    // Use setTimeout to allow UI to update before potentially heavy computation
    setTimeout(() => {
      try {
        const graph = getSampleById(sampleId);
        if (graph) {
          // Import the graph (adds to graphs list)
          importGraphs([graph]);
          
          // Find the graph by name since importGraphs may change the ID
          const { graphs: updatedGraphs } = useGraphStore.getState();
          const importedGraph = updatedGraphs.find(g => g.name === graph.name);
          
          if (importedGraph) {
            loadGraph(importedGraph.id);
          }
          setShowSamplesDialog(false);
        } else {
          console.error(`Failed to generate sample: ${sampleId}`);
        }
      } catch (error) {
        console.error(`Failed to load sample ${sampleId}:`, error);
        alert(`Failed to load sample: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoadingSample(null);
      }
    }, 50);
  };
  
  // Filter samples by category
  const filteredSamples = selectedCategory === 'All' 
    ? sampleCatalog 
    : sampleCatalog.filter(s => s.category === selectedCategory);
  
  // Get unique categories
  const categories: Array<SampleInfo['category'] | 'All'> = ['All', 'Basic', 'Finance', 'Simulation', 'Risk', 'Demo'];
  
  return (
    <div className="relative p-4 border-b border-gray-700">
      {/* Current Graph Selector */}
      <div className="flex items-center gap-2">
        <select
          value={currentGraph?.id ?? ''}
          onChange={(e) => {
            const graphId = e.target.value;
            if (graphId) {
              // Load full graph with nodes and edges
              loadGraph(graphId);
            } else {
              setCurrentGraph(null);
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 text-sm
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
        >
          <option value="">Select a graph...</option>
          {graphs.map((graph) => (
            <option key={graph.id} value={graph.id}>
              {graph.name}
            </option>
          ))}
        </select>
        
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     transition-colors text-sm font-medium"
          title="Create new graph"
        >
          + New
        </button>
        
        {currentGraph && (
          <button
            onClick={() => handleDelete(currentGraph.id)}
            className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 
                       transition-colors text-sm"
            title="Delete current graph"
          >
            🗑️
          </button>
        )}
      </div>
      
      {/* Load Samples Button */}
      <button
        onClick={() => setShowSamplesDialog(true)}
        className="w-full mt-3 px-3 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 
                   transition-colors text-sm border border-gray-600"
      >
        📚 Browse Sample Graphs
      </button>
      
      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create New Graph</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newGraphName}
                  onChange={(e) => setNewGraphName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="My Scenario Model"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newGraphDescription}
                  onChange={(e) => setNewGraphDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your scenario model..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewGraphName('');
                  setNewGraphDescription('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newGraphName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Samples Dialog - Lazy Loading */}
      {showSamplesDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl border border-gray-700 max-h-[80vh] flex flex-col">
            <h2 className="text-lg font-semibold mb-2 text-white">📚 Sample Graph Library</h2>
            <p className="text-sm text-gray-400 mb-4">
              Click on a sample to load it. Graphs are loaded individually to keep things fast.
            </p>
            
            {/* Category Filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedCategory === cat 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            {/* Samples List */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
              {filteredSamples.map((sample) => {
                const isLoading = loadingSample === sample.id;
                const alreadyLoaded = graphs.some(g => g.name === sample.name);
                
                return (
                  <button
                    key={sample.id}
                    onClick={() => !isLoading && !alreadyLoaded && handleLoadSingleSample(sample.id)}
                    disabled={isLoading || alreadyLoaded}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      alreadyLoaded 
                        ? 'bg-gray-700/50 border-gray-600 opacity-60 cursor-not-allowed' 
                        : isLoading
                          ? 'bg-blue-900/30 border-blue-500 cursor-wait'
                          : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500 cursor-pointer'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-white truncate">
                            {isLoading && <span className="animate-spin inline-block mr-1">⏳</span>}
                            {alreadyLoaded && <span className="mr-1">✓</span>}
                            {sample.name}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{sample.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          sample.complexity === 'Beginner' ? 'bg-green-900 text-green-300' :
                          sample.complexity === 'Intermediate' ? 'bg-yellow-900 text-yellow-300' :
                          sample.complexity === 'Advanced' ? 'bg-orange-900 text-orange-300' :
                          'bg-red-900 text-red-300'
                        }`}>
                          {sample.complexity}
                        </span>
                        <span className="text-xs text-gray-500">{sample.nodeCount} nodes</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
              <span className="text-xs text-gray-500">
                {filteredSamples.length} samples • Click to load individually
              </span>
              <button
                onClick={() => setShowSamplesDialog(false)}
                className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
        </div>
      )}
    </div>
  );
}
