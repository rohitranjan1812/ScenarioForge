// Properties Panel - Edit selected node/edge properties (Dark Theme)
import { useState, useEffect, useCallback } from 'react';
import { useGraphStore } from '../../stores/graphStore';
import { NestedDataEditor } from '../editors/NestedDataEditor';
import { ExpressionEditor } from '../editors/ExpressionEditor';
import type { NodeDefinition, Port, DistributionConfig } from '@scenarioforge/core';

const distributionTypes = [
  'normal', 'uniform', 'triangular', 'lognormal', 'exponential', 'beta', 'gamma', 'poisson', 'binomial'
];

const aggregationTypes = ['sum', 'average', 'min', 'max', 'product', 'first', 'last', 'count'];

// Consistent dark theme input styles
const inputClass = "w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const selectClass = "w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const textareaClass = "w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const labelClass = "block text-xs font-medium text-gray-400 mb-1";

function PortEditor({ port, onChange, onDelete }: {
  port: Port;
  onChange: (port: Port) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        type="text"
        value={port.name}
        onChange={(e) => onChange({ ...port, name: e.target.value })}
        className="flex-1 px-2 py-1 border border-gray-600 rounded bg-gray-700 text-gray-100 text-xs"
        placeholder="Port name"
      />
      <select
        value={port.dataType}
        onChange={(e) => onChange({ ...port, dataType: e.target.value as Port['dataType'] })}
        className="px-2 py-1 border border-gray-600 rounded bg-gray-700 text-gray-100 text-xs"
      >
        <option value="any">any</option>
        <option value="number">number</option>
        <option value="string">string</option>
        <option value="boolean">boolean</option>
        <option value="array">array</option>
        <option value="object">object</option>
      </select>
      <button
        onClick={onDelete}
        className="text-red-400 hover:text-red-300"
      >
        ✕
      </button>
    </div>
  );
}

function NodeEditor({ node }: { node: NodeDefinition }) {
  const { updateNode, deleteNode } = useGraphStore();
  const [localData, setLocalData] = useState<Record<string, unknown>>(node.data);
  
  // Sync local state with node data
  useEffect(() => {
    setLocalData(node.data);
  }, [node.id, node.data]);
  
  const handleUpdateData = useCallback((key: string, value: unknown) => {
    const newData = { ...localData, [key]: value };
    setLocalData(newData);
    updateNode(node.id, { data: newData });
  }, [localData, node.id, updateNode]);
  
  const handleUpdateDistribution = useCallback((updates: Partial<DistributionConfig>) => {
    const currentDist = (localData.distribution as DistributionConfig | undefined) || { type: 'normal', parameters: {} };
    const newDist = { ...currentDist, ...updates };
    handleUpdateData('distribution', newDist);
  }, [localData, handleUpdateData]);

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div>
        <label className={labelClass}>Name</label>
        <input
          type="text"
          value={node.name}
          onChange={(e) => updateNode(node.id, { name: e.target.value })}
          className={inputClass}
        />
      </div>
      
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={node.description || ''}
          onChange={(e) => updateNode(node.id, { description: e.target.value })}
          className={textareaClass}
          rows={2}
        />
      </div>
      
      {/* Type-specific fields */}
      {node.type === 'CONSTANT' && (
        <div>
          <label className={labelClass}>Value</label>
          <input
            type="text"
            value={String(localData.value ?? '')}
            onChange={(e) => {
              const val = e.target.value;
              const numVal = parseFloat(val);
              handleUpdateData('value', isNaN(numVal) ? val : numVal);
            }}
            className={inputClass}
            placeholder="Enter value"
          />
        </div>
      )}
      
      {node.type === 'PARAMETER' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Min</label>
              <input
                type="number"
                value={Number(localData.min ?? 0)}
                onChange={(e) => handleUpdateData('min', parseFloat(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Default</label>
              <input
                type="number"
                value={Number(localData.default ?? 0)}
                onChange={(e) => handleUpdateData('default', parseFloat(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Max</label>
              <input
                type="number"
                value={Number(localData.max ?? 100)}
                onChange={(e) => handleUpdateData('max', parseFloat(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Step</label>
            <input
              type="number"
              value={Number(localData.step ?? 1)}
              onChange={(e) => handleUpdateData('step', parseFloat(e.target.value))}
              className={inputClass}
              step="0.1"
            />
          </div>
        </>
      )}
      
      {node.type === 'DISTRIBUTION' && (
        <>
          <div>
            <label className={labelClass}>Distribution Type</label>
            <select
              value={String((localData.distribution as DistributionConfig | undefined)?.type ?? 'normal')}
              onChange={(e) => handleUpdateDistribution({ type: e.target.value as DistributionConfig['type'] })}
              className={selectClass}
            >
              {distributionTypes.map((dt) => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
          </div>
          
          {/* Distribution parameters based on type */}
          {((localData.distribution as DistributionConfig | undefined)?.type === 'normal' || !(localData.distribution as DistributionConfig | undefined)?.type) && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Mean (μ)</label>
                <input
                  type="number"
                  value={Number((localData.distribution as DistributionConfig | undefined)?.parameters?.mean ?? 0)}
                  onChange={(e) => handleUpdateDistribution({
                    parameters: { ...(localData.distribution as DistributionConfig | undefined)?.parameters, mean: parseFloat(e.target.value) }
                  })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Std Dev (σ)</label>
                <input
                  type="number"
                  value={Number((localData.distribution as DistributionConfig | undefined)?.parameters?.stdDev ?? 1)}
                  onChange={(e) => handleUpdateDistribution({
                    parameters: { ...(localData.distribution as DistributionConfig | undefined)?.parameters, stdDev: parseFloat(e.target.value) }
                  })}
                  className={inputClass}
                  min="0"
                />
              </div>
            </div>
          )}
          
          {(localData.distribution as DistributionConfig | undefined)?.type === 'uniform' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Min</label>
                <input
                  type="number"
                  value={Number((localData.distribution as DistributionConfig | undefined)?.parameters?.min ?? 0)}
                  onChange={(e) => handleUpdateDistribution({
                    parameters: { ...(localData.distribution as DistributionConfig | undefined)?.parameters, min: parseFloat(e.target.value) }
                  })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Max</label>
                <input
                  type="number"
                  value={Number((localData.distribution as DistributionConfig | undefined)?.parameters?.max ?? 1)}
                  onChange={(e) => handleUpdateDistribution({
                    parameters: { ...(localData.distribution as DistributionConfig | undefined)?.parameters, max: parseFloat(e.target.value) }
                  })}
                  className={inputClass}
                />
              </div>
            </div>
          )}
          
          {(localData.distribution as DistributionConfig | undefined)?.type === 'triangular' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelClass}>Min</label>
                <input
                  type="number"
                  value={Number((localData.distribution as DistributionConfig | undefined)?.parameters?.min ?? 0)}
                  onChange={(e) => handleUpdateDistribution({
                    parameters: { ...(localData.distribution as DistributionConfig | undefined)?.parameters, min: parseFloat(e.target.value) }
                  })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Mode</label>
                <input
                  type="number"
                  value={Number((localData.distribution as DistributionConfig | undefined)?.parameters?.mode ?? 0.5)}
                  onChange={(e) => handleUpdateDistribution({
                    parameters: { ...(localData.distribution as DistributionConfig | undefined)?.parameters, mode: parseFloat(e.target.value) }
                  })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Max</label>
                <input
                  type="number"
                  value={Number((localData.distribution as DistributionConfig | undefined)?.parameters?.max ?? 1)}
                  onChange={(e) => handleUpdateDistribution({
                    parameters: { ...(localData.distribution as DistributionConfig | undefined)?.parameters, max: parseFloat(e.target.value) }
                  })}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </>
      )}
      
      {node.type === 'TRANSFORMER' && (
        <ExpressionEditor
          value={String(localData.expression ?? '')}
          onChange={(value) => handleUpdateData('expression', value)}
          title="Expression"
          placeholder="e.g., $inputs.a + $inputs.b * 2"
          helpText="Use $inputs.portName, $node.field, $params.name"
        />
      )}
      
      {node.type === 'AGGREGATOR' && (
        <div>
          <label className={labelClass}>Aggregation Method</label>
          <select
            value={String(localData.method ?? 'sum')}
            onChange={(e) => handleUpdateData('method', e.target.value)}
            className={selectClass}
          >
            {aggregationTypes.map((at) => (
              <option key={at} value={at}>{at}</option>
            ))}
          </select>
        </div>
      )}
      
      {node.type === 'DECISION' && (
        <>
          <div>
            <label className={labelClass}>Condition</label>
            <textarea
              value={String(localData.condition ?? '')}
              onChange={(e) => handleUpdateData('condition', e.target.value)}
              className={textareaClass}
              rows={2}
              placeholder="e.g., $inputs.value > 100"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>True Value</label>
              <input
                type="text"
                value={String(localData.trueValue ?? '')}
                onChange={(e) => handleUpdateData('trueValue', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>False Value</label>
              <input
                type="text"
                value={String(localData.falseValue ?? '')}
                onChange={(e) => handleUpdateData('falseValue', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </>
      )}
      
      {node.type === 'CONSTRAINT' && (
        <>
          <ExpressionEditor
            value={String(localData.expression ?? '')}
            onChange={(value) => handleUpdateData('expression', value)}
            title="Constraint Expression"
            placeholder="e.g., $inputs.total <= 1000"
            helpText="Expression must evaluate to true for valid solutions"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Min</label>
              <input
                type="number"
                value={Number(localData.min ?? '')}
                onChange={(e) => handleUpdateData('min', parseFloat(e.target.value) || undefined)}
                className={inputClass}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className={labelClass}>Max</label>
              <input
                type="number"
                value={Number(localData.max ?? '')}
                onChange={(e) => handleUpdateData('max', parseFloat(e.target.value) || undefined)}
                className={inputClass}
                placeholder="Optional"
              />
            </div>
          </div>
        </>
      )}
      
      {node.type === 'OUTPUT' && (
        <div>
          <label className={labelClass}>Output Label</label>
          <input
            type="text"
            value={String(localData.label ?? 'result')}
            onChange={(e) => handleUpdateData('label', e.target.value)}
            className={inputClass}
            placeholder="e.g., totalRevenue"
          />
        </div>
      )}
      
      {/* Custom Data Fields Section - Hierarchical editor for node.data */}
      {(() => {
        // List of known fields that are displayed in type-specific sections
        const knownFields = new Set([
          'value', 'distribution', 'expression', 'method', 'aggregation',
          'min', 'max', 'label', 'description', 'distributionType'
        ]);
        
        // Get custom fields from node.data
        const customData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(localData)) {
          if (!knownFields.has(key)) {
            customData[key] = value;
          }
        }
        
        return (
          <div className="border-t border-gray-700 pt-4">
            <NestedDataEditor
              data={customData}
              onChange={(newCustomData) => {
                // Merge custom data with known fields
                const knownData: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(localData)) {
                  if (knownFields.has(key)) {
                    knownData[key] = value;
                  }
                }
                const mergedData = { ...knownData, ...newCustomData };
                setLocalData(mergedData);
                updateNode(node.id, { data: mergedData });
              }}
              maxDepth={8}
              title="Custom Node Data"
              accessPrefix="$node"
            />
          </div>
        );
      })()}

      {/* Ports Section */}
      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Input Ports</h4>
        <div className="space-y-2 mb-2">
          {node.inputPorts.map((port, idx) => (
            <PortEditor
              key={port.id}
              port={port}
              onChange={(updated) => {
                const newPorts = [...node.inputPorts];
                newPorts[idx] = updated;
                updateNode(node.id, { inputPorts: newPorts });
              }}
              onDelete={() => {
                const newPorts = node.inputPorts.filter((_, i) => i !== idx);
                updateNode(node.id, { inputPorts: newPorts });
              }}
            />
          ))}
        </div>
        <button
          onClick={() => {
            const newPort: Port = {
              id: `${node.id}-input-${Date.now()}`,
              name: `input${node.inputPorts.length + 1}`,
              dataType: 'any',
              required: false,
              multiple: false,
            };
            updateNode(node.id, { inputPorts: [...node.inputPorts, newPort] });
          }}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          + Add Input Port
        </button>
      </div>
      
      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Output Ports</h4>
        <div className="space-y-2 mb-2">
          {node.outputPorts.map((port, idx) => (
            <PortEditor
              key={port.id}
              port={port}
              onChange={(updated) => {
                const newPorts = [...node.outputPorts];
                newPorts[idx] = updated;
                updateNode(node.id, { outputPorts: newPorts });
              }}
              onDelete={() => {
                const newPorts = node.outputPorts.filter((_, i) => i !== idx);
                updateNode(node.id, { outputPorts: newPorts });
              }}
            />
          ))}
        </div>
        <button
          onClick={() => {
            const newPort: Port = {
              id: `${node.id}-output-${Date.now()}`,
              name: `output${node.outputPorts.length + 1}`,
              dataType: 'any',
              required: false,
              multiple: false,
            };
            updateNode(node.id, { outputPorts: [...node.outputPorts, newPort] });
          }}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          + Add Output Port
        </button>
      </div>
      
      {/* Delete button */}
      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={() => deleteNode(node.id)}
          className="w-full px-4 py-2 bg-red-900 text-red-200 rounded-md hover:bg-red-800 transition-colors"
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const { currentGraph, selectedNodeId, selectedEdgeId, deleteEdge } = useGraphStore();
  
  const selectedNode = selectedNodeId
    ? currentGraph?.nodes.find((n) => n.id === selectedNodeId)
    : null;
    
  const selectedEdge = selectedEdgeId
    ? currentGraph?.edges.find((e) => e.id === selectedEdgeId)
    : null;
  
  if (!currentGraph) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm p-4">
        No graph selected
      </div>
    );
  }
  
  if (!selectedNode && !selectedEdge) {
    return (
      <div className="h-full p-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Properties
        </h2>
        <div className="text-gray-500 text-sm">
          Select a node or edge to view properties
        </div>
        
        {/* Graph info */}
        <div className="mt-6 p-3 bg-gray-700 rounded-lg">
          <h3 className="text-xs font-semibold text-gray-400 mb-2">Graph Info</h3>
          <div className="text-sm space-y-1 text-gray-300">
            <div className="flex justify-between">
              <span className="text-gray-500">Nodes:</span>
              <span>{currentGraph.nodes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Edges:</span>
              <span>{currentGraph.edges.length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (selectedEdge) {
    return (
      <div className="h-full p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Edge Properties
        </h2>
        <div className="space-y-4 text-sm">
          <div>
            <span className="text-gray-500">From:</span>{' '}
            <span className="font-mono text-gray-200">
              {currentGraph.nodes.find((n) => n.id === selectedEdge.sourceNodeId)?.name ?? selectedEdge.sourceNodeId}
            </span>
          </div>
          <div>
            <span className="text-gray-500">To:</span>{' '}
            <span className="font-mono text-gray-200">
              {currentGraph.nodes.find((n) => n.id === selectedEdge.targetNodeId)?.name ?? selectedEdge.targetNodeId}
            </span>
          </div>
          
          <div>
            <label className={labelClass}>Edge Type</label>
            <select
              value={selectedEdge.type}
              onChange={(e) => {
                const updatedEdges = currentGraph.edges.map((edge) =>
                  edge.id === selectedEdge.id
                    ? { ...edge, type: e.target.value as typeof selectedEdge.type }
                    : edge
                );
                useGraphStore.getState().updateLocalEdges(updatedEdges);
              }}
              className={selectClass}
            >
              <option value="DATA_FLOW">Data Flow</option>
              <option value="DEPENDENCY">Dependency</option>
              <option value="CONDITIONAL">Conditional</option>
              <option value="FEEDBACK">Feedback</option>
              <option value="TEMPORAL">Temporal</option>
            </select>
          </div>
          
          {selectedEdge.type === 'FEEDBACK' && (
            <>
              <div>
                <label className={labelClass}>
                  Max Iterations
                  <span className="text-gray-500 ml-1">(default: 100)</span>
                </label>
                <input
                  type="number"
                  value={selectedEdge.feedbackIterations ?? 100}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    const updatedEdges = currentGraph.edges.map((edge) =>
                      edge.id === selectedEdge.id
                        ? { ...edge, feedbackIterations: isNaN(value) ? 100 : Math.max(1, value) }
                        : edge
                    );
                    useGraphStore.getState().updateLocalEdges(updatedEdges);
                  }}
                  className={inputClass}
                  min="1"
                  max="10000"
                />
              </div>
              
              <div>
                <label className={labelClass}>
                  Convergence Tolerance
                  <span className="text-gray-500 ml-1">(default: 0.001)</span>
                </label>
                <input
                  type="number"
                  value={selectedEdge.convergenceTolerance ?? 0.001}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    const updatedEdges = currentGraph.edges.map((edge) =>
                      edge.id === selectedEdge.id
                        ? { ...edge, convergenceTolerance: isNaN(value) ? 0.001 : Math.max(0, value) }
                        : edge
                    );
                    useGraphStore.getState().updateLocalEdges(updatedEdges);
                  }}
                  className={inputClass}
                  step="0.0001"
                  min="0"
                />
              </div>
              
              <div className="p-3 bg-blue-900 bg-opacity-30 rounded border border-blue-500">
                <p className="text-xs text-blue-200">
                  ℹ️ Feedback edges create iterative loops that execute until convergence or max iterations.
                </p>
              </div>
            </>
          )}
          
          <button
            onClick={() => deleteEdge(selectedEdge.id)}
            className="w-full px-4 py-2 bg-red-900 text-red-200 rounded-md hover:bg-red-800 transition-colors mt-4"
          >
            Delete Edge
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Node Properties
      </h2>
      {selectedNode && <NodeEditor node={selectedNode} />}
    </div>
  );
}
