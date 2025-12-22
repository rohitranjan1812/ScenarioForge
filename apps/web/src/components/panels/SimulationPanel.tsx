// Simulation Panel - Run simulations locally and view results (Dark Theme)
import { useState, useCallback } from 'react';
import { useGraphStore } from '../../stores/graphStore';
import type { RiskMetrics } from '@scenarioforge/core';
import { executeGraph, runMonteCarloSimulation } from '@scenarioforge/core';

interface LocalSimulationConfig {
  iterations: number;
  seed?: number;
  confidenceLevel: number;
}

interface SimulationResultData {
  outputs: Record<string, number[]>;
  iterations: number;
  executionTimeMs: number;
}

interface SimulationState {
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: number;
  result: SimulationResultData | null;
  metrics: Record<string, RiskMetrics> | null;
  error: string | null;
}

// Consistent dark theme input styles
const inputClass = "w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const selectClass = "w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const labelClass = "block text-xs font-medium text-gray-400 mb-1";

export function SimulationPanel() {
  const { currentGraph } = useGraphStore();
  const [state, setState] = useState<SimulationState>({
    status: 'idle',
    progress: 0,
    result: null,
    metrics: null,
    error: null,
  });
  
  const [config, setConfig] = useState<LocalSimulationConfig>({
    iterations: 1000,
    seed: undefined,
    confidenceLevel: 0.95,
  });
  
  // Get output nodes for selection
  const outputNodes = currentGraph?.nodes.filter((n) => n.type === 'OUTPUT') ?? [];
  
  const runDeterministic = useCallback(async () => {
    if (!currentGraph) return;
    
    setState({
      status: 'running',
      progress: 50,
      result: null,
      metrics: null,
      error: null,
    });
    
    try {
      const startTime = Date.now();
      // Pass graph params to expression context
      const result = await Promise.resolve(executeGraph(currentGraph, currentGraph.params ?? {}));
      const executionTimeMs = Date.now() - startTime;
      
      if (!result.success) {
        throw new Error(result.error || 'Execution failed');
      }
      
      // Convert outputs to display format
      const outputs: Record<string, number[]> = {};
      for (const outputNode of result.outputNodes) {
        for (const [key, value] of Object.entries(outputNode.outputs)) {
          outputs[`${outputNode.nodeName}:${key}`] = [typeof value === 'number' ? value : 0];
        }
      }
      
      setState({
        status: 'completed',
        progress: 100,
        result: {
          outputs,
          iterations: 1,
          executionTimeMs,
        },
        metrics: null,
        error: null,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';
      setState({
        status: 'error',
        progress: 0,
        result: null,
        metrics: null,
        error: errorMessage,
      });
    }
  }, [currentGraph]);
  
  const runSimulation = useCallback(async () => {
    if (!currentGraph) return;
    
    setState({
      status: 'running',
      progress: 0,
      result: null,
      metrics: null,
      error: null,
    });
    
    try {
      const startTime = Date.now();
      
      // Create simulation config
      const simConfig = {
        id: `local-${Date.now()}`,
        graphId: currentGraph.id,
        name: 'Local Simulation',
        iterations: config.iterations,
        seed: config.seed,
        mode: 'monte_carlo' as const,
        maxExecutionTime: 60000,
        parallelism: 1,
        outputNodes: outputNodes.map(n => n.id),
        captureIntermediates: false,
      };
      
      // Run Monte Carlo simulation
      const result = runMonteCarloSimulation(currentGraph, simConfig, (progress) => {
        setState(prev => ({
          ...prev,
          progress: Math.round(progress.progress),
        }));
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Simulation failed');
      }
      
      const executionTimeMs = Date.now() - startTime;
      
      // Convert aggregated metrics to display format
      const metrics: Record<string, RiskMetrics> = {};
      for (const [key, value] of result.aggregated) {
        metrics[key] = value;
      }
      
      // Organize outputs by key
      const outputs: Record<string, number[]> = {};
      for (const r of result.results) {
        const key = `${r.nodeId}:${r.outputKey}`;
        if (!outputs[key]) outputs[key] = [];
        outputs[key].push(r.value);
      }
      
      setState({
        status: 'completed',
        progress: 100,
        result: {
          outputs,
          iterations: result.iterations,
          executionTimeMs,
        },
        metrics,
        error: null,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Simulation failed';
      setState({
        status: 'error',
        progress: 0,
        result: null,
        metrics: null,
        error: errorMessage,
      });
    }
  }, [currentGraph, config, outputNodes]);
  
  const reset = useCallback(() => {
    setState({
      status: 'idle',
      progress: 0,
      result: null,
      metrics: null,
      error: null,
    });
  }, []);
  
  if (!currentGraph) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm p-4">
        No graph selected
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col p-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Simulation
      </h2>
      
      {/* Configuration */}
      <div className="space-y-4 mb-4">
        {/* Mode Selection */}
        <div className="flex gap-2">
          <button
            onClick={runDeterministic}
            disabled={state.status === 'running'}
            className="flex-1 px-3 py-2 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 
                       disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium
                       border border-gray-600"
          >
            ▶ Single Run
          </button>
          <button
            onClick={runSimulation}
            disabled={state.status === 'running'}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 
                       disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            🎲 Monte Carlo
          </button>
        </div>
        
        {/* Iterations */}
        <div>
          <label className={labelClass}>Iterations</label>
          <input
            type="number"
            value={config.iterations}
            onChange={(e) => setConfig({ ...config, iterations: parseInt(e.target.value) || 1000 })}
            min={100}
            max={100000}
            step={100}
            className={inputClass}
          />
        </div>
        
        {/* Seed */}
        <div>
          <label className={labelClass}>
            Random Seed (optional)
          </label>
          <input
            type="number"
            value={config.seed ?? ''}
            onChange={(e) => setConfig({ 
              ...config, 
              seed: e.target.value ? parseInt(e.target.value) : undefined 
            })}
            placeholder="Leave empty for random"
            className={inputClass}
          />
        </div>
        
        {/* Confidence Level */}
        <div>
          <label className={labelClass}>
            Confidence Level
          </label>
          <select
            value={config.confidenceLevel}
            onChange={(e) => setConfig({ ...config, confidenceLevel: parseFloat(e.target.value) })}
            className={selectClass}
          >
            <option value={0.9}>90%</option>
            <option value={0.95}>95%</option>
            <option value={0.99}>99%</option>
          </select>
        </div>
        
        {/* Output Nodes Info */}
        {outputNodes.length > 0 && (
          <div className="text-xs text-gray-500">
            {outputNodes.length} output node(s) will be tracked
          </div>
        )}
        {outputNodes.length === 0 && (
          <div className="text-xs text-yellow-400">
            ⚠ Add OUTPUT nodes to capture results
          </div>
        )}
      </div>
      
      {/* Progress */}
      {state.status === 'running' && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Running simulation...</span>
            <span>{state.progress}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Error */}
      {state.status === 'error' && state.error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md">
          <p className="text-sm text-red-300">{state.error}</p>
          <button
            onClick={reset}
            className="mt-2 text-xs text-red-400 hover:text-red-300"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Results */}
      {state.status === 'completed' && state.result && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-300">Results</h3>
            <button
              onClick={reset}
              className="text-xs text-gray-500 hover:text-gray-400"
            >
              Clear
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-3 bg-gray-700 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Iterations:</span>
                  <span className="ml-1 font-medium text-gray-200">{state.result.iterations.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Time:</span>
                  <span className="ml-1 font-medium text-gray-200">{state.result.executionTimeMs}ms</span>
                </div>
              </div>
            </div>
            
            {/* Metrics per output */}
            {state.metrics && Object.entries(state.metrics).map(([key, metrics]) => {
              const [nodeId, outputKey] = key.split(':');
              const nodeName = currentGraph.nodes.find(n => n.id === nodeId)?.name ?? nodeId;
              const displayName = outputKey ? `${nodeName} → ${outputKey}` : nodeName;
              
              return (
                <div key={key} className="p-3 bg-gray-700 border border-gray-600 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-200 mb-2">{displayName}</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mean:</span>
                      <span className="font-mono text-gray-200">{metrics.mean.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Median:</span>
                      <span className="font-mono text-gray-200">{metrics.median.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Std Dev:</span>
                      <span className="font-mono text-gray-200">{metrics.standardDeviation.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Min:</span>
                      <span className="font-mono text-gray-200">{metrics.min.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max:</span>
                      <span className="font-mono text-gray-200">{metrics.max.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">VaR 95%:</span>
                      <span className="font-mono text-gray-200">{metrics.valueAtRisk.var95.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">CVaR 95%:</span>
                      <span className="font-mono text-gray-200">{metrics.conditionalVaR.cvar95.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Skewness:</span>
                      <span className="font-mono text-gray-200">{metrics.skewness.toFixed(4)}</span>
                    </div>
                  </div>
                  
                  {/* Percentiles */}
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <h5 className="text-xs text-gray-400 mb-1">Percentiles</h5>
                    <div className="grid grid-cols-4 gap-1 text-xs">
                      <div className="text-center">
                        <div className="text-gray-500">P5</div>
                        <div className="font-mono text-gray-300">{metrics.percentiles.p5.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">P25</div>
                        <div className="font-mono text-gray-300">{metrics.percentiles.p25.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">P75</div>
                        <div className="font-mono text-gray-300">{metrics.percentiles.p75.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-500">P95</div>
                        <div className="font-mono text-gray-300">{metrics.percentiles.p95.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Deterministic output display */}
            {state.result.iterations === 1 && state.result.outputs && Object.keys(state.result.outputs).length > 0 && (
              <div className="p-3 bg-gray-700 border border-gray-600 rounded-lg">
                <h4 className="text-sm font-medium text-gray-200 mb-2">Outputs</h4>
                <div className="space-y-1 text-xs">
                  {Object.entries(state.result.outputs).map(([key, values]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-400">{key}:</span>
                      <span className="font-mono text-gray-200">{values[0]?.toFixed(4) ?? 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
