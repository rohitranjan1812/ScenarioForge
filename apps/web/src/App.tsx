import { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { GraphCanvas } from './components/canvas/GraphCanvas';
import { NodePalette } from './components/panels/NodePalette';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { SimulationPanel } from './components/panels/SimulationPanel';
import { GlobalParamsPanel } from './components/panels/GlobalParamsPanel';
import { GraphSelector } from './components/panels/GraphSelector';
import { FeedbackLoopsPanel } from './components/panels/FeedbackLoopsPanel';
import { HierarchyPanel } from './components/panels/HierarchyPanel';
import { SubgraphTutorial } from './components/panels/SubgraphTutorial';
import { useGraphStore } from './stores/graphStore';
import 'reactflow/dist/style.css';

type Panel = 'properties' | 'params' | 'simulation' | 'feedbackLoops' | 'hierarchy';

export default function App() {
  const [activePanel, setActivePanel] = useState<Panel>('properties');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { currentGraph } = useGraphStore();

  const handleResetStorage = () => {
    console.log('Resetting storage...');
    try {
      localStorage.clear(); // Clear everything
      console.log('Storage cleared, reloading...');
      window.location.href = window.location.href; // Force reload
    } catch (e) {
      console.error('Reset failed:', e);
      alert('Failed to reset: ' + e);
    }
  };

  const openResetModal = () => {
    console.log('Opening reset modal');
    setShowResetConfirm(true);
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999]"
          onClick={() => setShowResetConfirm(false)}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 max-w-sm border-2 border-red-500 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">⚠️ Reset Storage?</h3>
            <p className="text-gray-400 text-sm mb-4">
              This will clear ALL saved graphs and reset the application. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded border border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleResetStorage}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
              >
                🗑️ Reset Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Sidebar - Node Palette */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">ScenarioForge</h1>
          <p className="text-xs text-gray-400 mt-1">Graph-based Modeling Platform</p>
          <button
            onClick={openResetModal}
            className="mt-2 px-2 py-1 text-xs bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white rounded transition-colors border border-gray-600"
            title="Clear all saved data and reset the application"
          >
            🔄 Reset Storage
          </button>
        </div>
        
        <GraphSelector />
        
        <div className="flex-1 overflow-y-auto">
          <NodePalette />
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4">
          <span className="text-white font-medium">
            {currentGraph?.name ?? 'No graph selected'}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setActivePanel('properties')}
            className={`px-3 py-1 rounded text-sm ${
              activePanel === 'properties'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Properties
          </button>
          <button
            onClick={() => setActivePanel('params')}
            className={`px-3 py-1 rounded text-sm ${
              activePanel === 'params'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Global Parameters
          </button>
          <button
            onClick={() => setActivePanel('simulation')}
            className={`px-3 py-1 rounded text-sm ${
              activePanel === 'simulation'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Simulation
          </button>
          <button
            onClick={() => setActivePanel('hierarchy')}
            className={`px-3 py-1 rounded text-sm ${
              activePanel === 'hierarchy'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Hierarchy
          </button>
          <button
            onClick={() => setActivePanel('feedbackLoops')}
            className={`px-3 py-1 rounded text-sm ${
              activePanel === 'feedbackLoops'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Feedback Loops
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlowProvider>
            <GraphCanvas />
          </ReactFlowProvider>
        </div>
      </div>

      {/* Right Sidebar - Properties/Params/Simulation/Hierarchy/FeedbackLoops */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
        {activePanel === 'properties' && <PropertiesPanel />}
        {activePanel === 'params' && <GlobalParamsPanel />}
        {activePanel === 'simulation' && <SimulationPanel />}
        {activePanel === 'hierarchy' && <HierarchyPanel />}
        {activePanel === 'feedbackLoops' && <FeedbackLoopsPanel />}
      </div>
      
      {/* Floating Tutorial */}
      <SubgraphTutorial />
    </div>
  );
}
