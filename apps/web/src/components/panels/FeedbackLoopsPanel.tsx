// Feedback Loops Panel - Visualize and configure feedback loops in the graph
import { useState } from 'react';
import { useGraphStore } from '../../stores/graphStore';

// Demo feedback loops for visualization (would come from graph metadata in real implementation)
interface DemoFeedbackLoop {
  id: string;
  name: string;
  sourceNode: string;
  targetNode: string;
  transform: 'direct' | 'pid' | 'moving_avg' | 'exponential';
  delay: number;
  enabled: boolean;
  converged?: boolean;
  currentValue?: number;
}

export function FeedbackLoopsPanel() {
  const { currentGraph } = useGraphStore();
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Extract feedback loops from graph metadata if available
  const feedbackLoops: DemoFeedbackLoop[] = (currentGraph?.metadata?.hierarchical as any)?.feedbackLoops ?? [];
  
  // Check if current graph has potential feedback patterns
  const hasConstraintNodes = currentGraph?.nodes?.some(n => n.type === 'CONSTRAINT') ?? false;
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>🔄</span>
          Feedback Loops
        </h2>
        <span className="text-xs px-2 py-1 bg-indigo-600 text-white rounded">NEW</span>
      </div>
      
      <p className="text-xs text-gray-400">
        Feedback loops allow outputs from one simulation cycle to influence inputs in subsequent cycles,
        enabling adaptive, evolving simulations.
      </p>
      
      {/* Feature Overview */}
      <div className="bg-gray-700 rounded-lg p-3 space-y-2">
        <h3 className="text-sm font-medium text-gray-200">Available Transforms</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-green-400">●</span>
            <span>Direct (pass-through)</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-blue-400">●</span>
            <span>Moving Average</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-purple-400">●</span>
            <span>Exponential Smooth</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-orange-400">●</span>
            <span>PID Controller</span>
          </div>
        </div>
      </div>
      
      {/* Current Feedback Loops */}
      {feedbackLoops.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-200">Active Loops</h3>
          {feedbackLoops.map((loop) => (
            <FeedbackLoopCard key={loop.id} loop={loop} />
          ))}
        </div>
      ) : (
        <div className="bg-gray-700/50 rounded-lg p-4 text-center">
          <div className="text-3xl mb-2">🔄</div>
          <p className="text-sm text-gray-400 mb-3">
            No feedback loops configured
          </p>
          {hasConstraintNodes && (
            <p className="text-xs text-yellow-400 mb-2">
              💡 Tip: Your graph has CONSTRAINT nodes that could be used in feedback loops
            </p>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
          >
            + Create Feedback Loop
          </button>
        </div>
      )}
      
      {/* Add Feedback Loop Modal */}
      {showAddModal && (
        <AddFeedbackLoopModal 
          onClose={() => setShowAddModal(false)}
          nodes={currentGraph?.nodes ?? []}
        />
      )}
      
      {/* Documentation Section */}
      <div className="border-t border-gray-600 pt-4">
        <h3 className="text-sm font-medium text-gray-200 mb-2">How Feedback Loops Work</h3>
        <div className="text-xs text-gray-400 space-y-2">
          <p>
            <strong className="text-gray-300">1. Source → Transform → Target</strong><br/>
            Output from source node is transformed and injected into target node.
          </p>
          <p>
            <strong className="text-gray-300">2. Delay</strong><br/>
            Feedback is delayed by N iterations to prevent infinite loops.
          </p>
          <p>
            <strong className="text-gray-300">3. Convergence</strong><br/>
            Loop can auto-detect when values stabilize (within tolerance).
          </p>
        </div>
        
        {/* PID Controller Explanation */}
        <div className="mt-3 bg-gray-700/50 rounded p-2">
          <h4 className="text-xs font-medium text-orange-400 mb-1">🎛️ PID Controller</h4>
          <pre className="text-xs text-gray-400 font-mono">
{`Output = Kp×error + Ki×∫error + Kd×d(error)/dt

Kp = Proportional (immediate)
Ki = Integral (cumulative)
Kd = Derivative (damping)`}
          </pre>
        </div>
      </div>
      
      {/* Expression Context Info */}
      <div className="border-t border-gray-600 pt-4">
        <h3 className="text-sm font-medium text-gray-200 mb-2">New Expression Variables</h3>
        <div className="bg-gray-700 rounded p-2 font-mono text-xs space-y-1">
          <div className="text-purple-400">$feedback.<span className="text-gray-300">loopName</span></div>
          <div className="text-purple-400">$feedbackHistory.<span className="text-gray-300">loopName</span>[]</div>
          <div className="text-purple-400">$parent.<span className="text-gray-300">params</span></div>
          <div className="text-purple-400">$root.<span className="text-gray-300">outputs</span></div>
          <div className="text-purple-400">$depth</div>
          <div className="text-purple-400">$path[]</div>
        </div>
      </div>
    </div>
  );
}

// Individual feedback loop card
function FeedbackLoopCard({ loop }: { loop: DemoFeedbackLoop }) {
  const transformColors = {
    direct: 'bg-green-500',
    pid: 'bg-orange-500',
    moving_avg: 'bg-blue-500',
    exponential: 'bg-purple-500',
  };
  
  return (
    <div className={`bg-gray-700 rounded-lg p-3 border-l-4 ${loop.enabled ? 'border-indigo-500' : 'border-gray-500'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">{loop.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${transformColors[loop.transform]} text-white`}>
          {loop.transform.toUpperCase()}
        </span>
      </div>
      
      <div className="text-xs text-gray-400 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Source:</span>
          <span className="font-mono text-gray-300">{loop.sourceNode}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Target:</span>
          <span className="font-mono text-gray-300">{loop.targetNode}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Delay:</span>
          <span className="font-mono text-gray-300">{loop.delay} iteration(s)</span>
        </div>
      </div>
      
      {loop.converged !== undefined && (
        <div className={`mt-2 text-xs px-2 py-1 rounded ${loop.converged ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
          {loop.converged ? '✓ Converged' : '⏳ Running...'}
          {loop.currentValue !== undefined && ` (${loop.currentValue.toFixed(2)})`}
        </div>
      )}
    </div>
  );
}

// Modal for adding new feedback loop
function AddFeedbackLoopModal({ onClose, nodes }: { onClose: () => void; nodes: any[] }) {
  const [name, setName] = useState('');
  const [sourceNode, setSourceNode] = useState('');
  const [targetNode, setTargetNode] = useState('');
  const [transform, setTransform] = useState<'direct' | 'pid' | 'moving_avg' | 'exponential'>('direct');
  const [delay, setDelay] = useState(1);
  
  const handleCreate = () => {
    // TODO: Implement actual feedback loop creation
    console.log('Creating feedback loop:', { name, sourceNode, targetNode, transform, delay });
    alert(`Feedback loop "${name}" created!\n\nNote: Full implementation coming soon. The loop configuration has been logged to console.`);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🔄</span>
          Create Feedback Loop
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., inventory-control"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">Source Node (Output)</label>
            <select
              value={sourceNode}
              onChange={(e) => setSourceNode(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Select source node...</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.name} ({n.type})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">Target Node (Input)</label>
            <select
              value={targetNode}
              onChange={(e) => setTargetNode(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Select target node...</option>
              {nodes.map(n => (
                <option key={n.id} value={n.id}>{n.name} ({n.type})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">Transform</label>
            <select
              value={transform}
              onChange={(e) => setTransform(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="direct">Direct (pass-through)</option>
              <option value="moving_avg">Moving Average</option>
              <option value="exponential">Exponential Smoothing</option>
              <option value="pid">PID Controller</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">Delay (iterations)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={delay}
              onChange={(e) => setDelay(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name || !sourceNode || !targetNode}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Loop
          </button>
        </div>
      </div>
    </div>
  );
}
