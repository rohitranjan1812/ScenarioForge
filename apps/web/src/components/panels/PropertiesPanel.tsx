// Properties Panel - Edit selected node/edge properties (Dark Theme)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGraphStore } from '../../stores/graphStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { NestedDataEditor } from '../editors/NestedDataEditor';
import { ExpressionEditor } from '../editors/ExpressionEditor';
import { getAdvancedNodeEditor, GenericAdvancedEditor } from '../editors/AdvancedNodeEditors';
import type { NodeDefinition, EdgeDefinition, Port, DistributionConfig } from '@scenarioforge/core';

// Advanced node types that have specialized editors
const advancedNodeTypes = new Set([
  'MESH', 'ELEMENT', 'BOUNDARY_CONDITION', 'FIELD',
  'INTEGRATOR', 'DELAY_LINE', 'STATE_MACHINE', 'EVENT_QUEUE',
  'AGENT', 'STRATEGY', 'PAYOFF_MATRIX', 'EQUILIBRIUM_FINDER', 'POPULATION',
  'OBJECTIVE', 'SOLVER', 'OPTIMIZER',
  'MARKOV_CHAIN', 'RANDOM_PROCESS', 'MONTE_CARLO_ESTIMATOR',
  'FILTER', 'CONVOLUTION', 'FFT',
  'BUFFER', 'ACCUMULATOR', 'LOOKUP_TABLE', 'HISTORY',
  'PID_CONTROLLER', 'MPC_CONTROLLER', 'BANG_BANG',
  'MATRIX_OP', 'LINEAR_SYSTEM', 'EIGENVALUE', 'NONLINEAR_SYSTEM'
]);

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
      
      {/* Advanced Node Editors */}
      {advancedNodeTypes.has(node.type) && (
        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-xs font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <span>⚡</span>
            <span>Advanced Configuration</span>
          </h4>
          {(() => {
            const AdvancedEditor = getAdvancedNodeEditor(node.type);
            if (AdvancedEditor) {
              return <AdvancedEditor data={localData} onChange={handleUpdateData} />;
            }
            return <GenericAdvancedEditor data={localData} onChange={handleUpdateData} />;
          })()}
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
  const { currentGraph, selectedNodeId, selectedEdgeId } = useGraphStore();
  const { getCurrentGraph } = useNavigationStore();
  
  // Get the currently displayed graph (could be a subgraph if drilled down)
  const displayGraph = useMemo(() => {
    return getCurrentGraph() ?? currentGraph;
  }, [getCurrentGraph, currentGraph]);
  
  const selectedNode = selectedNodeId
    ? displayGraph?.nodes.find((n) => n.id === selectedNodeId)
    : null;
    
  const selectedEdge = selectedEdgeId
    ? displayGraph?.edges.find((e) => e.id === selectedEdgeId)
    : null;
  
  if (!displayGraph) {
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
              <span>{displayGraph.nodes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Edges:</span>
              <span>{displayGraph.edges.length}</span>
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
        <EdgeEditor edge={selectedEdge} nodes={displayGraph.nodes} />
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

// ============================================
// Edge Editor Component
// ============================================

// All edge types including advanced types
const EDGE_TYPES = [
  // Basic
  { value: 'DATA_FLOW', label: 'Data Flow', category: 'Basic', description: 'Standard data flow between nodes' },
  { value: 'DEPENDENCY', label: 'Dependency', category: 'Basic', description: 'Execution dependency' },
  { value: 'TEMPORAL', label: 'Temporal', category: 'Basic', description: 'Time-based connection' },
  
  // Streaming
  { value: 'STREAMING', label: 'Streaming', category: 'Data Flow', description: 'Continuous data stream' },
  { value: 'BATCHED', label: 'Batched', category: 'Data Flow', description: 'Batched data transfer' },
  
  // Temporal
  { value: 'DELAYED', label: 'Delayed', category: 'Temporal', description: 'Fixed time delay' },
  { value: 'VARIABLE_DELAY', label: 'Variable Delay', category: 'Temporal', description: 'State-dependent delay' },
  { value: 'TRANSPORT_DELAY', label: 'Transport Delay', category: 'Temporal', description: 'Distance-based delay' },
  
  // Feedback
  { value: 'FEEDBACK', label: 'Feedback', category: 'Control', description: 'Explicit feedback loop' },
  { value: 'IMPLICIT_FEEDBACK', label: 'Implicit Feedback', category: 'Control', description: 'Algebraic loop' },
  
  // Conditional
  { value: 'CONDITIONAL', label: 'Conditional', category: 'Routing', description: 'Condition-based activation' },
  { value: 'PROBABILISTIC', label: 'Probabilistic', category: 'Routing', description: 'Stochastic routing' },
  { value: 'PRIORITY', label: 'Priority', category: 'Routing', description: 'Priority-based routing' },
  
  // Synchronization
  { value: 'SYNC_BARRIER', label: 'Sync Barrier', category: 'Sync', description: 'Wait for multiple inputs' },
  { value: 'MERGE', label: 'Merge', category: 'Sync', description: 'Merge multiple streams' },
  { value: 'SPLIT', label: 'Split', category: 'Sync', description: 'Split to multiple outputs' },
  
  // Spatial
  { value: 'NEIGHBOR', label: 'Neighbor', category: 'Spatial', description: 'Spatial adjacency (mesh/grid)' },
  { value: 'COUPLING', label: 'Coupling', category: 'Spatial', description: 'Physical coupling (FEM)' },
  
  // Agent
  { value: 'MESSAGE', label: 'Message', category: 'Agent', description: 'Agent message passing' },
  { value: 'OBSERVATION', label: 'Observation', category: 'Agent', description: 'Agent observation' },
  { value: 'INFLUENCE', label: 'Influence', category: 'Agent', description: 'Social influence' },
];

const EDGE_CATEGORIES = ['Basic', 'Data Flow', 'Temporal', 'Control', 'Routing', 'Sync', 'Spatial', 'Agent'];

interface EdgeEditorProps {
  edge: EdgeDefinition;
  nodes: NodeDefinition[];
}

function EdgeEditor({ edge, nodes }: EdgeEditorProps) {
  const { updateEdge, deleteEdge } = useGraphStore();
  const [localData, setLocalData] = React.useState<Record<string, unknown>>(edge.data ?? {});
  
  const sourceNode = nodes.find(n => n.id === edge.sourceNodeId);
  const targetNode = nodes.find(n => n.id === edge.targetNodeId);
  
  const handleTypeChange = (newType: string) => {
    updateEdge(edge.id, { 
      type: newType as EdgeDefinition['type'],
      // Initialize type-specific data
      data: getDefaultDataForType(newType)
    });
  };
  
  const handleDataChange = (key: string, value: unknown) => {
    const newData = { ...localData, [key]: value };
    setLocalData(newData);
    updateEdge(edge.id, { data: newData });
  };
  
  const handlePropertyChange = (key: keyof EdgeDefinition, value: unknown) => {
    updateEdge(edge.id, { [key]: value });
  };
  
  // Sync local data when edge changes
  React.useEffect(() => {
    setLocalData(edge.data ?? {});
  }, [edge.id, edge.data]);
  
  return (
    <div className="space-y-4 text-sm">
      {/* Connection Info */}
      <div className="space-y-2 p-3 bg-gray-800 rounded-md">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs uppercase">From</span>
          <span className="font-mono text-blue-300 truncate flex-1">
            {sourceNode?.name ?? edge.sourceNodeId}
          </span>
        </div>
        <div className="flex items-center justify-center text-gray-500">↓</div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs uppercase">To</span>
          <span className="font-mono text-green-300 truncate flex-1">
            {targetNode?.name ?? edge.targetNodeId}
          </span>
        </div>
      </div>
      
      {/* Edge Type Selector */}
      <div>
        <label className="block text-xs text-gray-400 uppercase mb-1">Edge Type</label>
        <select
          value={edge.type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {EDGE_CATEGORIES.map(category => (
            <optgroup key={category} label={category}>
              {EDGE_TYPES
                .filter(t => t.category === category)
                .map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))
              }
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {EDGE_TYPES.find(t => t.value === edge.type)?.description ?? 'Select an edge type'}
        </p>
      </div>
      
      {/* Label */}
      <div>
        <label className="block text-xs text-gray-400 uppercase mb-1">Label</label>
        <input
          type="text"
          value={edge.label ?? ''}
          onChange={(e) => handlePropertyChange('label', e.target.value || undefined)}
          placeholder="Optional edge label"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      {/* Common Properties */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase mb-1">Weight</label>
          <input
            type="number"
            value={edge.weight ?? ''}
            onChange={(e) => handlePropertyChange('weight', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="1.0"
            step="0.1"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase mb-1">Delay</label>
          <input
            type="number"
            value={edge.delay ?? ''}
            onChange={(e) => handlePropertyChange('delay', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="0"
            min="0"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      {/* Type-Specific Editors */}
      {renderTypeSpecificEditor(edge.type, localData, handleDataChange)}
      
      {/* Condition (for conditional edges) */}
      {(edge.type === 'CONDITIONAL' || edge.type === 'PROBABILISTIC') && (
        <div>
          <label className="block text-xs text-gray-400 uppercase mb-1">Condition Expression</label>
          <textarea
            value={edge.condition ?? ''}
            onChange={(e) => handlePropertyChange('condition', e.target.value || undefined)}
            placeholder="$source.value > 0"
            rows={2}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white font-mono text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      
      {/* Transform Function */}
      <div>
        <label className="block text-xs text-gray-400 uppercase mb-1">Transform Function</label>
        <textarea
          value={edge.transformFunction ?? ''}
          onChange={(e) => handlePropertyChange('transformFunction', e.target.value || undefined)}
          placeholder="$value * 2"
          rows={2}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white font-mono text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">Transform data as it flows through this edge</p>
      </div>
      
      {/* Visual Options */}
      <div className="pt-2 border-t border-gray-700">
        <h3 className="text-xs text-gray-400 uppercase mb-2">Visual Options</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={edge.animated ?? false}
            onChange={(e) => handlePropertyChange('animated', e.target.checked)}
            className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500"
          />
          <span>Animated</span>
        </label>
      </div>
      
      {/* Delete Button */}
      <div className="pt-3">
        <button
          onClick={() => deleteEdge(edge.id)}
          className="w-full px-4 py-2 bg-red-900 text-red-200 rounded-md hover:bg-red-800 transition-colors"
        >
          Delete Edge
        </button>
      </div>
    </div>
  );
}

// Get default data structure for edge type
function getDefaultDataForType(type: string): Record<string, unknown> {
  switch (type) {
    case 'STREAMING':
      return { bufferSize: 100, backpressure: true };
    case 'BATCHED':
      return { batchSize: 10, flushInterval: 1000 };
    case 'DELAYED':
      return { delaySteps: 1, delayUnit: 'steps' };
    case 'VARIABLE_DELAY':
      return { minDelay: 0, maxDelay: 10, delayExpression: '$distance' };
    case 'FEEDBACK':
      return { feedbackGain: 1.0, dampingFactor: 0.9 };
    case 'PROBABILISTIC':
      return { probability: 0.5 };
    case 'PRIORITY':
      return { priority: 1 };
    case 'SYNC_BARRIER':
      return { requiredInputs: 2, timeout: 1000 };
    case 'MERGE':
      return { strategy: 'concat' };
    case 'NEIGHBOR':
      return { direction: 'all', distance: 1 };
    case 'COUPLING':
      return { couplingStrength: 1.0, couplingType: 'linear' };
    case 'MESSAGE':
      return { messageType: 'data', async: false };
    default:
      return {};
  }
}

// Render type-specific editor fields
function renderTypeSpecificEditor(
  type: string,
  data: Record<string, unknown>,
  onChange: (key: string, value: unknown) => void
): React.ReactNode {
  switch (type) {
    case 'STREAMING':
      return (
        <div className="space-y-3 p-3 bg-gray-800/50 rounded-md">
          <h4 className="text-xs text-gray-400 uppercase">Streaming Options</h4>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Buffer Size</label>
            <input
              type="number"
              value={(data.bufferSize as number) ?? 100}
              onChange={(e) => onChange('bufferSize', parseInt(e.target.value) || 100)}
              className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(data.backpressure as boolean) ?? true}
              onChange={(e) => onChange('backpressure', e.target.checked)}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600"
            />
            <span className="text-sm">Enable backpressure</span>
          </label>
        </div>
      );
      
    case 'BATCHED':
      return (
        <div className="space-y-3 p-3 bg-gray-800/50 rounded-md">
          <h4 className="text-xs text-gray-400 uppercase">Batch Options</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Batch Size</label>
              <input
                type="number"
                value={(data.batchSize as number) ?? 10}
                onChange={(e) => onChange('batchSize', parseInt(e.target.value) || 10)}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Flush (ms)</label>
              <input
                type="number"
                value={(data.flushInterval as number) ?? 1000}
                onChange={(e) => onChange('flushInterval', parseInt(e.target.value) || 1000)}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
          </div>
        </div>
      );
      
    case 'DELAYED':
    case 'VARIABLE_DELAY':
      return (
        <div className="space-y-3 p-3 bg-gray-800/50 rounded-md">
          <h4 className="text-xs text-gray-400 uppercase">Delay Options</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {type === 'VARIABLE_DELAY' ? 'Min Delay' : 'Delay Steps'}
              </label>
              <input
                type="number"
                value={(data[type === 'VARIABLE_DELAY' ? 'minDelay' : 'delaySteps'] as number) ?? 1}
                onChange={(e) => onChange(
                  type === 'VARIABLE_DELAY' ? 'minDelay' : 'delaySteps', 
                  parseInt(e.target.value) || 1
                )}
                min="0"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            {type === 'VARIABLE_DELAY' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Max Delay</label>
                <input
                  type="number"
                  value={(data.maxDelay as number) ?? 10}
                  onChange={(e) => onChange('maxDelay', parseInt(e.target.value) || 10)}
                  min="0"
                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                />
              </div>
            )}
          </div>
          {type === 'VARIABLE_DELAY' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Delay Expression</label>
              <input
                type="text"
                value={(data.delayExpression as string) ?? '$distance'}
                onChange={(e) => onChange('delayExpression', e.target.value)}
                placeholder="$distance"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white font-mono text-sm"
              />
            </div>
          )}
        </div>
      );
      
    case 'FEEDBACK':
    case 'IMPLICIT_FEEDBACK':
      return (
        <div className="space-y-3 p-3 bg-gray-800/50 rounded-md">
          <h4 className="text-xs text-gray-400 uppercase">Feedback Options</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Gain</label>
              <input
                type="number"
                value={(data.feedbackGain as number) ?? 1.0}
                onChange={(e) => onChange('feedbackGain', parseFloat(e.target.value) || 1.0)}
                step="0.1"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Damping</label>
              <input
                type="number"
                value={(data.dampingFactor as number) ?? 0.9}
                onChange={(e) => onChange('dampingFactor', parseFloat(e.target.value) || 0.9)}
                step="0.05"
                min="0"
                max="1"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
          </div>
        </div>
      );
      
    case 'PROBABILISTIC':
      return (
        <div className="space-y-3 p-3 bg-gray-800/50 rounded-md">
          <h4 className="text-xs text-gray-400 uppercase">Probability</h4>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Activation Probability (0-1)
            </label>
            <input
              type="number"
              value={(data.probability as number) ?? 0.5}
              onChange={(e) => onChange('probability', Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.5)))}
              step="0.1"
              min="0"
              max="1"
              className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            />
          </div>
        </div>
      );
      
    case 'PRIORITY':
      return (
        <div className="space-y-3 p-3 bg-gray-800/50 rounded-md">
          <h4 className="text-xs text-gray-400 uppercase">Priority</h4>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Priority Level</label>
            <input
              type="number"
              value={(data.priority as number) ?? 1}
              onChange={(e) => onChange('priority', parseInt(e.target.value) || 1)}
              min="1"
              className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Higher = more priority</p>
          </div>
        </div>
      );
      
    case 'SYNC_BARRIER':
      return (
        <div className="space-y-3 p-3 bg-gray-800/50 rounded-md">
          <h4 className="text-xs text-gray-400 uppercase">Sync Barrier</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Required Inputs</label>
              <input
                type="number"
                value={(data.requiredInputs as number) ?? 2}
                onChange={(e) => onChange('requiredInputs', parseInt(e.target.value) || 2)}
                min="1"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Timeout (ms)</label>
              <input
                type="number"
                value={(data.timeout as number) ?? 1000}
                onChange={(e) => onChange('timeout', parseInt(e.target.value) || 1000)}
                min="0"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
          </div>
        </div>
      );
      
    case 'MERGE':
      return (
        <div className="space-y-3 p-3 bg-gray-800/50 rounded-md">
          <h4 className="text-xs text-gray-400 uppercase">Merge Strategy</h4>
          <select
            value={(data.strategy as string) ?? 'concat'}
            onChange={(e) => onChange('strategy', e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
          >
            <option value="concat">Concatenate</option>
            <option value="sum">Sum</option>
            <option value="average">Average</option>
            <option value="min">Minimum</option>
            <option value="max">Maximum</option>
            <option value="first">First Value</option>
            <option value="last">Last Value</option>
          </select>
        </div>
      );
      
    case 'NEIGHBOR':
      return (
        <div className="space-y-3 p-3 bg-gray-800/50 rounded-md">
          <h4 className="text-xs text-gray-400 uppercase">Neighbor Options</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Direction</label>
              <select
                value={(data.direction as string) ?? 'all'}
                onChange={(e) => onChange('direction', e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              >
                <option value="all">All</option>
                <option value="north">North</option>
                <option value="south">South</option>
                <option value="east">East</option>
                <option value="west">West</option>
                <option value="cardinal">Cardinal (4)</option>
                <option value="diagonal">Diagonal (4)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Distance</label>
              <input
                type="number"
                value={(data.distance as number) ?? 1}
                onChange={(e) => onChange('distance', parseInt(e.target.value) || 1)}
                min="1"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
          </div>
        </div>
      );
      
    case 'COUPLING':
      return (
        <div className="space-y-3 p-3 bg-gray-800/50 rounded-md">
          <h4 className="text-xs text-gray-400 uppercase">Coupling Options</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Strength</label>
              <input
                type="number"
                value={(data.couplingStrength as number) ?? 1.0}
                onChange={(e) => onChange('couplingStrength', parseFloat(e.target.value) || 1.0)}
                step="0.1"
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={(data.couplingType as string) ?? 'linear'}
                onChange={(e) => onChange('couplingType', e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              >
                <option value="linear">Linear</option>
                <option value="nonlinear">Nonlinear</option>
                <option value="spring">Spring</option>
                <option value="damper">Damper</option>
                <option value="thermal">Thermal</option>
              </select>
            </div>
          </div>
        </div>
      );
      
    case 'MESSAGE':
      return (
        <div className="space-y-3 p-3 bg-gray-800/50 rounded-md">
          <h4 className="text-xs text-gray-400 uppercase">Message Options</h4>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Message Type</label>
            <select
              value={(data.messageType as string) ?? 'data'}
              onChange={(e) => onChange('messageType', e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            >
              <option value="data">Data</option>
              <option value="signal">Signal</option>
              <option value="request">Request</option>
              <option value="response">Response</option>
              <option value="broadcast">Broadcast</option>
            </select>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(data.async as boolean) ?? false}
              onChange={(e) => onChange('async', e.target.checked)}
              className="w-4 h-4 rounded bg-gray-700 border-gray-600"
            />
            <span className="text-sm">Asynchronous</span>
          </label>
        </div>
      );
      
    default:
      return null;
  }
}
