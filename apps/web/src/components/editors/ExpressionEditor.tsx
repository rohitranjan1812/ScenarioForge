// Expression Editor - Pop-out modal for complex expression editing
import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  title?: string;
  placeholder?: string;
  helpText?: string;
  variableHints?: { name: string; description: string }[];
}

const defaultVariableHints = [
  { name: '$inputs.portName', description: 'Value from input port' },
  { name: '$node.fieldName', description: 'Node custom data field' },
  { name: '$params.name', description: 'Global simulation parameter' },
  { name: '$iteration', description: 'Current simulation iteration (0-based)' },
  { name: '$time', description: 'Simulation time step' },
  { name: 'Math.pow(x, y)', description: 'Power function x^y' },
  { name: 'Math.sqrt(x)', description: 'Square root' },
  { name: 'Math.exp(x)', description: 'Exponential e^x' },
  { name: 'Math.log(x)', description: 'Natural logarithm' },
  { name: 'Math.min(a, b)', description: 'Minimum value' },
  { name: 'Math.max(a, b)', description: 'Maximum value' },
  { name: 'Math.abs(x)', description: 'Absolute value' },
  { name: 'Math.random()', description: 'Random number 0-1' },
];

// Syntax highlighting helpers
function highlightSyntax(code: string): string {
  // Simple syntax highlighting using spans
  let result = code
    // Keywords
    .replace(/\b(const|let|var|function|return|if|else|for|while|of|in)\b/g, '<span class="text-purple-400">$1</span>')
    // Numbers
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-400">$1</span>')
    // Strings
    .replace(/(['"`])(.*?)\1/g, '<span class="text-green-400">$1$2$1</span>')
    // Special variables
    .replace(/(\$inputs|\$node|\$params|\$iteration|\$time)/g, '<span class="text-cyan-400 font-semibold">$1</span>')
    // Math functions
    .replace(/\b(Math\.\w+)/g, '<span class="text-yellow-400">$1</span>')
    // Comments
    .replace(/(\/\/.*$)/gm, '<span class="text-gray-500 italic">$1</span>')
    // Property access after $
    .replace(/(\$\w+)\.(\w+)/g, '$1.<span class="text-blue-300">$2</span>');
  
  return result;
}

// Modal component
function ExpressionModal({
  isOpen,
  onClose,
  value,
  onChange,
  title,
  variableHints,
}: {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  title: string;
  variableHints: { name: string; description: string }[];
}) {
  const [localValue, setLocalValue] = useState(value);
  const [showPreview, setShowPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value, isOpen]);
  
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);
  
  const handleSave = useCallback(() => {
    onChange(localValue);
    onClose();
  }, [localValue, onChange, onClose]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = localValue.substring(0, start) + '  ' + localValue.substring(end);
        setLocalValue(newValue);
        // Set cursor position after tab
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
  }, [onClose, handleSave, localValue]);
  
  const insertVariable = useCallback((varName: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = localValue.substring(0, start) + varName + localValue.substring(end);
      setLocalValue(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + varName.length;
      }, 0);
    }
  }, [localValue]);
  
  if (!isOpen) return null;
  
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div 
        className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-[90vw] max-w-5xl h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800 rounded-t-xl">
          <div className="flex items-center gap-3">
            <span className="text-xl">📝</span>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
              {localValue.split('\n').length} lines
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                showPreview 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Preview
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
            >
              Save (Ctrl+S)
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor panel */}
          <div className="flex-1 flex flex-col border-r border-gray-700">
            <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700 text-xs text-gray-400">
              Expression Editor — Tab for indent, Ctrl+S to save, Esc to cancel
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="absolute inset-0 w-full h-full p-4 bg-gray-950 text-gray-100 font-mono text-sm resize-none focus:outline-none leading-relaxed"
                placeholder="Enter your expression here...&#10;&#10;Example:&#10;const x = $inputs.value;&#10;const rate = $params.rate;&#10;x * (1 + rate)"
                spellCheck={false}
              />
            </div>
          </div>
          
          {/* Preview / Help panel */}
          {showPreview && (
            <div className="w-80 flex flex-col bg-gray-850">
              {/* Syntax preview */}
              <div className="flex-1 overflow-auto border-b border-gray-700">
                <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700 text-xs text-gray-400 font-semibold">
                  Syntax Preview
                </div>
                <pre 
                  className="p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{ __html: highlightSyntax(localValue) || '<span class="text-gray-600 italic">Empty expression</span>' }}
                />
              </div>
              
              {/* Variable hints */}
              <div className="h-64 overflow-auto">
                <div className="px-3 py-2 bg-gray-800/50 border-b border-gray-700 text-xs text-gray-400 font-semibold sticky top-0">
                  Variables & Functions (click to insert)
                </div>
                <div className="p-2 space-y-1">
                  {variableHints.map((hint, idx) => (
                    <button
                      key={idx}
                      onClick={() => insertVariable(hint.name)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-700 transition-colors group"
                    >
                      <code className="text-cyan-400 text-xs font-mono group-hover:text-cyan-300">
                        {hint.name}
                      </code>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {hint.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer - Quick tips */}
        <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 rounded-b-xl">
          <div className="text-xs text-gray-500">
            <span className="font-semibold text-gray-400">Tip:</span> Return the final value as the last expression. 
            For complex logic, use <code className="text-gray-400">{'{ key: value }'}</code> to return objects.
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Main component - inline editor with expand button
export function ExpressionEditor({
  value,
  onChange,
  title = 'Expression',
  placeholder = 'e.g., $inputs.a + $inputs.b',
  helpText,
  variableHints = defaultVariableHints,
}: ExpressionEditorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Truncate for display
  const displayValue = value.length > 60 
    ? value.substring(0, 57).replace(/\n/g, ' ') + '...' 
    : value.replace(/\n/g, ' ');
  
  const isMultiline = value.includes('\n') || value.length > 100;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400">{title}</label>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          title="Open full editor"
        >
          <span>⤢</span>
          <span>Expand</span>
        </button>
      </div>
      
      {/* Compact view for simple expressions */}
      {!isMultiline ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-600 rounded bg-gray-700 text-gray-100 text-sm font-mono focus:ring-1 focus:ring-blue-500"
          placeholder={placeholder}
        />
      ) : (
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full px-2 py-2 border border-gray-600 rounded bg-gray-700 text-left hover:bg-gray-650 hover:border-gray-500 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <code className="text-xs text-gray-400 font-mono truncate flex-1 mr-2">
              {displayValue || <span className="text-gray-600 italic">Click to edit...</span>}
            </code>
            <span className="text-xs text-gray-500 group-hover:text-blue-400 flex-shrink-0">
              {value.split('\n').length} lines
            </span>
          </div>
        </button>
      )}
      
      {helpText && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
      
      {/* Modal */}
      <ExpressionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        value={value}
        onChange={onChange}
        title={title}
        variableHints={variableHints}
      />
    </div>
  );
}

export default ExpressionEditor;
