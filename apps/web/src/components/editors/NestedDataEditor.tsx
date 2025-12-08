// Nested Data Editor - Recursive editor for hierarchical/multi-dimensional data
// Uses path-based updates to ensure deep nesting works correctly
import { useState, useCallback } from 'react';

interface NestedDataEditorProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  maxDepth?: number;
  title?: string;
  accessPrefix?: string;
}

// Consistent dark theme styles
const inputClass = "w-full px-2 py-1 border border-gray-600 rounded bg-gray-700 text-gray-100 text-sm font-mono focus:ring-1 focus:ring-blue-500";
const selectClass = "px-2 py-1 border border-gray-600 rounded bg-gray-700 text-gray-100 text-xs focus:ring-1 focus:ring-blue-500";
const buttonClass = "px-2 py-1 text-xs rounded transition-colors";
const labelClass = "text-xs font-medium text-gray-400 min-w-[50px] truncate";

type ValueType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

function getValueType(value: unknown): ValueType {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  if (t === 'object') return 'object';
  return 'string';
}

function getDefaultValue(type: ValueType): unknown {
  switch (type) {
    case 'string': return '';
    case 'number': return 0;
    case 'boolean': return false;
    case 'object': return {};
    case 'array': return [];
    case 'null': return null;
  }
}

// Deep clone helper
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as T;
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    result[key] = deepClone((obj as Record<string, unknown>)[key]);
  }
  return result as T;
}

// Set value at path in object (immutable)
function setPath(root: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  if (path.length === 0) return value as Record<string, unknown>;
  
  const result = deepClone(root);
  let current: unknown = result;
  
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (Array.isArray(current)) {
      current = current[parseInt(key, 10)];
    } else if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    }
  }
  
  const lastKey = path[path.length - 1];
  if (Array.isArray(current)) {
    current[parseInt(lastKey, 10)] = value;
  } else if (current && typeof current === 'object') {
    (current as Record<string, unknown>)[lastKey] = value;
  }
  
  return result;
}

// Delete value at path (immutable)
function deletePath(root: Record<string, unknown>, path: string[]): Record<string, unknown> {
  if (path.length === 0) return root;
  
  const result = deepClone(root);
  let current: unknown = result;
  
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    if (Array.isArray(current)) {
      current = current[parseInt(key, 10)];
    } else if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    }
  }
  
  const lastKey = path[path.length - 1];
  if (Array.isArray(current)) {
    current.splice(parseInt(lastKey, 10), 1);
  } else if (current && typeof current === 'object') {
    delete (current as Record<string, unknown>)[lastKey];
  }
  
  return result;
}

interface ValueEditorProps {
  value: unknown;
  path: string[];
  depth: number;
  maxDepth: number;
  fieldName: string;
  rootData: Record<string, unknown>;
  onRootChange: (newRoot: Record<string, unknown>) => void;
}

function ValueEditor({ 
  value, 
  path,
  depth, 
  maxDepth,
  fieldName,
  rootData,
  onRootChange
}: ValueEditorProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const type = getValueType(value);
  const indent = depth * 16;

  const updateValue = useCallback((newValue: unknown) => {
    const newRoot = setPath(rootData, path, newValue);
    onRootChange(newRoot);
  }, [rootData, path, onRootChange]);

  const deleteValue = useCallback(() => {
    const newRoot = deletePath(rootData, path);
    onRootChange(newRoot);
  }, [rootData, path, onRootChange]);

  const changeType = useCallback((newType: ValueType) => {
    updateValue(getDefaultValue(newType));
  }, [updateValue]);

  // String editor
  if (type === 'string') {
    return (
      <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: indent }}>
        <span className={labelClass} title={fieldName}>{fieldName}:</span>
        <input
          type="text"
          value={value as string}
          onChange={(e) => updateValue(e.target.value)}
          className={`${inputClass} flex-1 min-w-0`}
        />
        <select value={type} onChange={(e) => changeType(e.target.value as ValueType)} className={selectClass}>
          <option value="string">str</option>
          <option value="number">num</option>
          <option value="boolean">bool</option>
          <option value="object">{'{}'}</option>
          <option value="array">[]</option>
        </select>
        <button onClick={deleteValue} className="text-red-400 hover:text-red-300 px-1">✕</button>
      </div>
    );
  }

  // Number editor
  if (type === 'number') {
    return (
      <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: indent }}>
        <span className={labelClass} title={fieldName}>{fieldName}:</span>
        <input
          type="number"
          step="any"
          value={value as number}
          onChange={(e) => updateValue(parseFloat(e.target.value) || 0)}
          className={`${inputClass} flex-1 min-w-0`}
        />
        <select value={type} onChange={(e) => changeType(e.target.value as ValueType)} className={selectClass}>
          <option value="number">num</option>
          <option value="string">str</option>
          <option value="boolean">bool</option>
          <option value="object">{'{}'}</option>
          <option value="array">[]</option>
        </select>
        <button onClick={deleteValue} className="text-red-400 hover:text-red-300 px-1">✕</button>
      </div>
    );
  }

  // Boolean editor
  if (type === 'boolean') {
    return (
      <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: indent }}>
        <span className={labelClass} title={fieldName}>{fieldName}:</span>
        <label className="flex items-center gap-1 flex-1 cursor-pointer">
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => updateValue(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500"
          />
          <span className="text-xs text-gray-300">{value ? 'true' : 'false'}</span>
        </label>
        <select value={type} onChange={(e) => changeType(e.target.value as ValueType)} className={selectClass}>
          <option value="boolean">bool</option>
          <option value="number">num</option>
          <option value="string">str</option>
          <option value="object">{'{}'}</option>
          <option value="array">[]</option>
        </select>
        <button onClick={deleteValue} className="text-red-400 hover:text-red-300 px-1">✕</button>
      </div>
    );
  }

  // Null editor
  if (type === 'null') {
    return (
      <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: indent }}>
        <span className={labelClass} title={fieldName}>{fieldName}:</span>
        <span className="text-gray-500 italic text-xs flex-1">null</span>
        <select value={type} onChange={(e) => changeType(e.target.value as ValueType)} className={selectClass}>
          <option value="null">null</option>
          <option value="string">str</option>
          <option value="number">num</option>
          <option value="boolean">bool</option>
          <option value="object">{'{}'}</option>
          <option value="array">[]</option>
        </select>
        <button onClick={deleteValue} className="text-red-400 hover:text-red-300 px-1">✕</button>
      </div>
    );
  }

  // Object editor
  if (type === 'object') {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj);
    
    if (depth >= maxDepth) {
      return (
        <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: indent }}>
          <span className={labelClass} title={fieldName}>{fieldName}:</span>
          <span className="text-gray-500 italic text-xs flex-1 truncate" title={JSON.stringify(obj)}>
            {JSON.stringify(obj).slice(0, 50)}...
          </span>
          <button onClick={deleteValue} className="text-red-400 hover:text-red-300 px-1">✕</button>
        </div>
      );
    }
    
    return (
      <div>
        <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: indent }}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-200 w-4 flex-shrink-0"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <span className={labelClass} title={fieldName}>{fieldName}:</span>
          <span className="text-blue-400 text-xs flex-1">{`{ ${entries.length} }`}</span>
          <select value={type} onChange={(e) => changeType(e.target.value as ValueType)} className={selectClass}>
            <option value="object">{'{}'}</option>
            <option value="array">[]</option>
            <option value="string">str</option>
            <option value="number">num</option>
          </select>
          <button onClick={deleteValue} className="text-red-400 hover:text-red-300 px-1">✕</button>
        </div>
        
        {isExpanded && (
          <div className="border-l border-gray-700 ml-2" style={{ marginLeft: indent + 8 }}>
            {entries.map(([key, val]) => (
              <ValueEditor
                key={key}
                value={val}
                path={[...path, key]}
                depth={depth + 1}
                maxDepth={maxDepth}
                fieldName={key}
                rootData={rootData}
                onRootChange={onRootChange}
              />
            ))}
            <div className="py-0.5" style={{ paddingLeft: 16 }}>
              <button
                onClick={() => {
                  const newKey = prompt('Enter field name:');
                  if (newKey && newKey.trim() && !(newKey.trim() in obj)) {
                    const newRoot = setPath(rootData, [...path, newKey.trim()], '');
                    onRootChange(newRoot);
                  }
                }}
                className={`${buttonClass} text-blue-400 hover:text-blue-300 hover:bg-blue-900/30`}
              >
                + Add Field
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Array editor
  if (type === 'array') {
    const arr = value as unknown[];
    
    if (depth >= maxDepth) {
      return (
        <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: indent }}>
          <span className={labelClass} title={fieldName}>{fieldName}:</span>
          <span className="text-gray-500 italic text-xs flex-1 truncate" title={JSON.stringify(arr)}>
            {JSON.stringify(arr).slice(0, 50)}...
          </span>
          <button onClick={deleteValue} className="text-red-400 hover:text-red-300 px-1">✕</button>
        </div>
      );
    }
    
    return (
      <div>
        <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: indent }}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-200 w-4 flex-shrink-0"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <span className={labelClass} title={fieldName}>{fieldName}:</span>
          <span className="text-green-400 text-xs flex-1">{`[ ${arr.length} ]`}</span>
          <select value={type} onChange={(e) => changeType(e.target.value as ValueType)} className={selectClass}>
            <option value="array">[]</option>
            <option value="object">{'{}'}</option>
            <option value="string">str</option>
            <option value="number">num</option>
          </select>
          <button onClick={deleteValue} className="text-red-400 hover:text-red-300 px-1">✕</button>
        </div>
        
        {isExpanded && (
          <div className="border-l border-gray-700 ml-2" style={{ marginLeft: indent + 8 }}>
            {arr.map((item, idx) => (
              <ValueEditor
                key={idx}
                value={item}
                path={[...path, String(idx)]}
                depth={depth + 1}
                maxDepth={maxDepth}
                fieldName={`[${idx}]`}
                rootData={rootData}
                onRootChange={onRootChange}
              />
            ))}
            <div className="py-0.5 flex gap-1" style={{ paddingLeft: 16 }}>
              <button
                onClick={() => updateValue([...arr, ''])}
                className={`${buttonClass} text-green-400 hover:text-green-300 hover:bg-green-900/30`}
              >
                +str
              </button>
              <button
                onClick={() => updateValue([...arr, 0])}
                className={`${buttonClass} text-green-400 hover:text-green-300 hover:bg-green-900/30`}
              >
                +num
              </button>
              <button
                onClick={() => updateValue([...arr, {}])}
                className={`${buttonClass} text-green-400 hover:text-green-300 hover:bg-green-900/30`}
              >
                +obj
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function NestedDataEditor({ 
  data, 
  onChange, 
  maxDepth = 10,
  title = 'Data',
  accessPrefix = '$data'
}: NestedDataEditorProps) {
  const entries = Object.entries(data);
  
  const handleRootChange = useCallback((newRoot: Record<string, unknown>) => {
    onChange(newRoot);
  }, [onChange]);

  const handleAddField = useCallback(() => {
    const newKey = prompt('Enter field name:');
    if (newKey && newKey.trim() && !(newKey.trim() in data)) {
      onChange({ ...data, [newKey.trim()]: '' });
    }
  }, [data, onChange]);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </h4>
        <span className="text-xs text-gray-500">{entries.length} fields</span>
      </div>
      
      <div className="bg-gray-800/50 rounded-lg p-2 max-h-72 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="text-gray-500 text-xs italic py-2 text-center">
            No fields. Click "+ Add Field" below.
          </div>
        ) : (
          entries.map(([key, val]) => (
            <ValueEditor
              key={key}
              value={val}
              path={[key]}
              depth={0}
              maxDepth={maxDepth}
              fieldName={key}
              rootData={data}
              onRootChange={handleRootChange}
            />
          ))
        )}
      </div>
      
      <button
        onClick={handleAddField}
        className={`${buttonClass} text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 w-full py-1`}
      >
        + Add Field
      </button>
      
      <div className="text-xs text-gray-600">
        Access: <code className="text-gray-500">{accessPrefix}.fieldName</code>
      </div>
    </div>
  );
}

export default NestedDataEditor;
