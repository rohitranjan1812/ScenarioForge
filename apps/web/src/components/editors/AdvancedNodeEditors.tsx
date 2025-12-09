// Advanced Node Property Editors
// Provides specialized editors for advanced node types (FEM, Game Theory, Control, etc.)

import { ExpressionEditor } from './ExpressionEditor';

// Shared styles
const inputClass = "w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const selectClass = "w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const labelClass = "block text-xs font-medium text-gray-400 mb-1";

interface EditorProps {
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

// ============================================
// INTEGRATOR NODE EDITOR
// ============================================
export function IntegratorEditor({ data, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Integration Method</label>
        <select
          value={String(data.method ?? 'rk4')}
          onChange={(e) => onChange('method', e.target.value)}
          className={selectClass}
        >
          <optgroup label="Explicit">
            <option value="euler_forward">Euler Forward</option>
            <option value="rk2">Runge-Kutta 2</option>
            <option value="rk4">Runge-Kutta 4</option>
            <option value="rk45">RK45 (Adaptive)</option>
          </optgroup>
          <optgroup label="Implicit">
            <option value="euler_backward">Euler Backward</option>
            <option value="crank_nicolson">Crank-Nicolson</option>
            <option value="bdf2">BDF2</option>
          </optgroup>
          <optgroup label="Symplectic">
            <option value="verlet">Verlet</option>
            <option value="leapfrog">Leapfrog</option>
          </optgroup>
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Step Size</label>
          <input
            type="number"
            value={Number(data.stepSize ?? 0.01)}
            onChange={(e) => onChange('stepSize', parseFloat(e.target.value))}
            className={inputClass}
            step="0.001"
          />
        </div>
        <div>
          <label className={labelClass}>Step Control</label>
          <select
            value={String(data.stepSizeControl ?? 'fixed')}
            onChange={(e) => onChange('stepSizeControl', e.target.value)}
            className={selectClass}
          >
            <option value="fixed">Fixed</option>
            <option value="adaptive">Adaptive</option>
          </select>
        </div>
      </div>
      
      <ExpressionEditor
        value={String(data.stateExpression ?? '')}
        onChange={(v) => onChange('stateExpression', v)}
        title="State Variable"
        placeholder="e.g., $node.x"
      />
      
      <ExpressionEditor
        value={String(data.derivativeExpression ?? '')}
        onChange={(v) => onChange('derivativeExpression', v)}
        title="Derivative (dy/dt)"
        placeholder="e.g., -$node.k * $node.x"
      />
      
      <ExpressionEditor
        value={String(data.initialState ?? '')}
        onChange={(v) => onChange('initialState', v)}
        title="Initial State"
        placeholder="e.g., 1.0"
      />
    </div>
  );
}

// ============================================
// STATE MACHINE NODE EDITOR
// ============================================
export function StateMachineEditor({ data, onChange }: EditorProps) {
  const states = (data.states as Array<{id: string; name: string}>) ?? [];
  
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Machine Type</label>
        <select
          value={String(data.machineType ?? 'mealy')}
          onChange={(e) => onChange('machineType', e.target.value)}
          className={selectClass}
        >
          <option value="mealy">Mealy (output on transitions)</option>
          <option value="moore">Moore (output on states)</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>
      
      <div>
        <label className={labelClass}>Initial State</label>
        <input
          type="text"
          value={String(data.initialState ?? 'S0')}
          onChange={(e) => onChange('initialState', e.target.value)}
          className={inputClass}
          placeholder="e.g., S0"
        />
      </div>
      
      <div>
        <label className={labelClass}>States (comma-separated)</label>
        <input
          type="text"
          value={states.map(s => s.name || s.id).join(', ')}
          onChange={(e) => {
            const names = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            onChange('states', names.map((name, i) => ({ id: `S${i}`, name })));
          }}
          className={inputClass}
          placeholder="e.g., Idle, Running, Stopped"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(data.parallel)}
          onChange={(e) => onChange('parallel', e.target.checked)}
          className="rounded border-gray-600 bg-gray-700 text-blue-500"
        />
        <label className="text-sm text-gray-300">Parallel States</label>
      </div>
    </div>
  );
}

// ============================================
// AGENT NODE EDITOR
// ============================================
export function AgentEditor({ data, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Agent ID</label>
        <input
          type="text"
          value={String(data.agentId ?? '')}
          onChange={(e) => onChange('agentId', e.target.value)}
          className={inputClass}
          placeholder="e.g., player1"
        />
      </div>
      
      <div>
        <label className={labelClass}>Agent Type</label>
        <input
          type="text"
          value={String(data.agentType ?? '')}
          onChange={(e) => onChange('agentType', e.target.value)}
          className={inputClass}
          placeholder="e.g., buyer, seller, firm"
        />
      </div>
      
      <div>
        <label className={labelClass}>Rationality</label>
        <select
          value={String(data.rationality ?? 'bounded')}
          onChange={(e) => onChange('rationality', e.target.value)}
          className={selectClass}
        >
          <option value="perfect">Perfect (full optimization)</option>
          <option value="bounded">Bounded Rationality</option>
          <option value="satisficing">Satisficing</option>
          <option value="epsilon_greedy">Epsilon-Greedy</option>
          <option value="learning">Learning Agent</option>
        </select>
      </div>
      
      <ExpressionEditor
        value={String(data.decisionFunction ?? '')}
        onChange={(v) => onChange('decisionFunction', v)}
        title="Decision Function"
        placeholder="e.g., argmax($inputs.payoffs)"
      />
      
      <ExpressionEditor
        value={String(data.utilityFunction ?? '')}
        onChange={(v) => onChange('utilityFunction', v)}
        title="Utility Function"
        placeholder="e.g., $inputs.profit - $inputs.cost"
      />
    </div>
  );
}

// ============================================
// PID CONTROLLER NODE EDITOR
// ============================================
export function PIDControllerEditor({ data, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Controller Form</label>
        <select
          value={String(data.form ?? 'standard')}
          onChange={(e) => onChange('form', e.target.value)}
          className={selectClass}
        >
          <option value="standard">Standard</option>
          <option value="parallel">Parallel</option>
          <option value="ideal">Ideal</option>
        </select>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelClass}>Kp (Proportional)</label>
          <input
            type="number"
            value={Number(data.kp ?? 1)}
            onChange={(e) => onChange('kp', parseFloat(e.target.value))}
            className={inputClass}
            step="0.1"
          />
        </div>
        <div>
          <label className={labelClass}>Ki (Integral)</label>
          <input
            type="number"
            value={Number(data.ki ?? 0)}
            onChange={(e) => onChange('ki', parseFloat(e.target.value))}
            className={inputClass}
            step="0.1"
          />
        </div>
        <div>
          <label className={labelClass}>Kd (Derivative)</label>
          <input
            type="number"
            value={Number(data.kd ?? 0)}
            onChange={(e) => onChange('kd', parseFloat(e.target.value))}
            className={inputClass}
            step="0.1"
          />
        </div>
      </div>
      
      <ExpressionEditor
        value={String(data.setpoint ?? '')}
        onChange={(v) => onChange('setpoint', v)}
        title="Setpoint"
        placeholder="e.g., 100 or $params.targetTemp"
      />
      
      <div>
        <label className={labelClass}>Anti-Windup</label>
        <select
          value={String(data.antiWindup ?? 'clamping')}
          onChange={(e) => onChange('antiWindup', e.target.value)}
          className={selectClass}
        >
          <option value="none">None</option>
          <option value="clamping">Clamping</option>
          <option value="back_calculation">Back Calculation</option>
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Output Min</label>
          <input
            type="number"
            value={Number(data.outputMin ?? -Infinity)}
            onChange={(e) => onChange('outputMin', parseFloat(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Output Max</label>
          <input
            type="number"
            value={Number(data.outputMax ?? Infinity)}
            onChange={(e) => onChange('outputMax', parseFloat(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// MARKOV CHAIN NODE EDITOR
// ============================================
export function MarkovChainEditor({ data, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Chain Type</label>
        <select
          value={String(data.chainType ?? 'discrete')}
          onChange={(e) => onChange('chainType', e.target.value)}
          className={selectClass}
        >
          <option value="discrete">Discrete Time</option>
          <option value="continuous">Continuous Time</option>
        </select>
      </div>
      
      <div>
        <label className={labelClass}>States (comma-separated)</label>
        <input
          type="text"
          value={Array.isArray(data.states) ? data.states.join(', ') : ''}
          onChange={(e) => {
            const states = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            onChange('states', states);
          }}
          className={inputClass}
          placeholder="e.g., A, B, C"
        />
      </div>
      
      <ExpressionEditor
        value={String(data.transitionMatrix ?? '')}
        onChange={(v) => onChange('transitionMatrix', v)}
        title="Transition Matrix"
        placeholder="e.g., [[0.7, 0.3], [0.4, 0.6]]"
        helpText="Row-stochastic matrix (rows sum to 1)"
      />
      
      <div>
        <label className={labelClass}>Initial State</label>
        <input
          type="text"
          value={String(data.initialState ?? '')}
          onChange={(e) => onChange('initialState', e.target.value)}
          className={inputClass}
          placeholder="e.g., A"
        />
      </div>
    </div>
  );
}

// ============================================
// FILTER NODE EDITOR
// ============================================
export function FilterEditor({ data, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Filter Type</label>
          <select
            value={String(data.filterType ?? 'lowpass')}
            onChange={(e) => onChange('filterType', e.target.value)}
            className={selectClass}
          >
            <option value="lowpass">Lowpass</option>
            <option value="highpass">Highpass</option>
            <option value="bandpass">Bandpass</option>
            <option value="bandstop">Bandstop</option>
            <option value="notch">Notch</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Design</label>
          <select
            value={String(data.design ?? 'butterworth')}
            onChange={(e) => onChange('design', e.target.value)}
            className={selectClass}
          >
            <option value="butterworth">Butterworth</option>
            <option value="chebyshev1">Chebyshev I</option>
            <option value="chebyshev2">Chebyshev II</option>
            <option value="elliptic">Elliptic</option>
            <option value="bessel">Bessel</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Order</label>
          <input
            type="number"
            value={Number(data.order ?? 2)}
            onChange={(e) => onChange('order', parseInt(e.target.value))}
            className={inputClass}
            min="1"
            max="20"
          />
        </div>
        <div>
          <label className={labelClass}>Cutoff Frequency (Hz)</label>
          <input
            type="number"
            value={Number(data.cutoffFrequency ?? 1000)}
            onChange={(e) => onChange('cutoffFrequency', parseFloat(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>
      
      <div>
        <label className={labelClass}>Sampling Frequency (Hz)</label>
        <input
          type="number"
          value={Number(data.samplingFrequency ?? 44100)}
          onChange={(e) => onChange('samplingFrequency', parseFloat(e.target.value))}
          className={inputClass}
        />
      </div>
    </div>
  );
}

// ============================================
// OPTIMIZER NODE EDITOR  
// ============================================
export function OptimizerEditor({ data, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Optimizer Type</label>
        <select
          value={String(data.optimizerType ?? 'gradient_descent')}
          onChange={(e) => onChange('optimizerType', e.target.value)}
          className={selectClass}
        >
          <optgroup label="Gradient-Based">
            <option value="gradient_descent">Gradient Descent</option>
            <option value="bfgs">BFGS</option>
            <option value="l_bfgs">L-BFGS</option>
            <option value="adam">Adam</option>
          </optgroup>
          <optgroup label="Derivative-Free">
            <option value="nelder_mead">Nelder-Mead</option>
            <option value="powell">Powell</option>
            <option value="cobyla">COBYLA</option>
          </optgroup>
          <optgroup label="Global">
            <option value="differential_evolution">Differential Evolution</option>
            <option value="genetic_algorithm">Genetic Algorithm</option>
            <option value="particle_swarm">Particle Swarm</option>
            <option value="simulated_annealing">Simulated Annealing</option>
          </optgroup>
          <optgroup label="Bayesian">
            <option value="bayesian_optimization">Bayesian Optimization</option>
          </optgroup>
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Max Iterations</label>
          <input
            type="number"
            value={Number(data.maxIterations ?? 1000)}
            onChange={(e) => onChange('maxIterations', parseInt(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Tolerance</label>
          <input
            type="number"
            value={Number(data.tolerance ?? 1e-6)}
            onChange={(e) => onChange('tolerance', parseFloat(e.target.value))}
            className={inputClass}
            step="0.000001"
          />
        </div>
      </div>
      
      <div>
        <label className={labelClass}>Learning Rate</label>
        <input
          type="number"
          value={Number(data.learningRate ?? 0.01)}
          onChange={(e) => onChange('learningRate', parseFloat(e.target.value))}
          className={inputClass}
          step="0.001"
        />
      </div>
      
      <div>
        <label className={labelClass}>Population Size (for evolutionary)</label>
        <input
          type="number"
          value={Number(data.populationSize ?? 50)}
          onChange={(e) => onChange('populationSize', parseInt(e.target.value))}
          className={inputClass}
        />
      </div>
    </div>
  );
}

// ============================================
// BUFFER NODE EDITOR
// ============================================
export function BufferEditor({ data, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Buffer Type</label>
        <select
          value={String(data.bufferType ?? 'fifo')}
          onChange={(e) => onChange('bufferType', e.target.value)}
          className={selectClass}
        >
          <option value="fifo">FIFO (First In First Out)</option>
          <option value="lifo">LIFO (Stack)</option>
          <option value="circular">Circular</option>
          <option value="priority">Priority Queue</option>
        </select>
      </div>
      
      <div>
        <label className={labelClass}>Capacity</label>
        <input
          type="number"
          value={Number(data.capacity ?? 100)}
          onChange={(e) => onChange('capacity', parseInt(e.target.value))}
          className={inputClass}
          min="1"
        />
      </div>
      
      <div>
        <label className={labelClass}>Overflow Policy</label>
        <select
          value={String(data.overflow ?? 'drop_oldest')}
          onChange={(e) => onChange('overflow', e.target.value)}
          className={selectClass}
        >
          <option value="drop_oldest">Drop Oldest</option>
          <option value="drop_newest">Drop Newest</option>
          <option value="block">Block</option>
          <option value="error">Error</option>
        </select>
      </div>
    </div>
  );
}

// ============================================
// MESH NODE EDITOR
// ============================================
export function MeshEditor({ data, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>Mesh Type</label>
          <select
            value={String(data.meshType ?? '2d')}
            onChange={(e) => onChange('meshType', e.target.value)}
            className={selectClass}
          >
            <option value="1d">1D</option>
            <option value="2d">2D</option>
            <option value="3d">3D</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Element Type</label>
          <select
            value={String(data.elementType ?? 'triangle')}
            onChange={(e) => onChange('elementType', e.target.value)}
            className={selectClass}
          >
            <option value="line">Line</option>
            <option value="triangle">Triangle</option>
            <option value="quad">Quadrilateral</option>
            <option value="tetrahedron">Tetrahedron</option>
            <option value="hexahedron">Hexahedron</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className={labelClass}>Dimensions (comma-separated)</label>
        <input
          type="text"
          value={Array.isArray(data.dimensions) ? data.dimensions.join(', ') : '1, 1'}
          onChange={(e) => {
            const dims = e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
            onChange('dimensions', dims);
          }}
          className={inputClass}
          placeholder="e.g., 10, 10"
        />
      </div>
      
      <div>
        <label className={labelClass}>Resolution (elements per dim)</label>
        <input
          type="text"
          value={Array.isArray(data.resolution) ? data.resolution.join(', ') : '10, 10'}
          onChange={(e) => {
            const res = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            onChange('resolution', res);
          }}
          className={inputClass}
          placeholder="e.g., 20, 20"
        />
      </div>
    </div>
  );
}

// ============================================
// LOOKUP TABLE EDITOR
// ============================================
export function LookupTableEditor({ data, onChange }: EditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Dimensions</label>
        <input
          type="number"
          value={Number(data.dimensions ?? 1)}
          onChange={(e) => onChange('dimensions', parseInt(e.target.value))}
          className={inputClass}
          min="1"
          max="4"
        />
      </div>
      
      <div>
        <label className={labelClass}>Interpolation</label>
        <select
          value={String(data.interpolation ?? 'linear')}
          onChange={(e) => onChange('interpolation', e.target.value)}
          className={selectClass}
        >
          <option value="nearest">Nearest</option>
          <option value="linear">Linear</option>
          <option value="cubic">Cubic</option>
          <option value="spline">Spline</option>
        </select>
      </div>
      
      <div>
        <label className={labelClass}>Extrapolation</label>
        <select
          value={String(data.extrapolation ?? 'constant')}
          onChange={(e) => onChange('extrapolation', e.target.value)}
          className={selectClass}
        >
          <option value="constant">Constant</option>
          <option value="linear">Linear</option>
          <option value="periodic">Periodic</option>
          <option value="error">Error</option>
        </select>
      </div>
      
      <ExpressionEditor
        value={String(data.breakpoints ?? '')}
        onChange={(v) => onChange('breakpoints', v)}
        title="Breakpoints"
        placeholder="e.g., [0, 1, 2, 3, 4]"
      />
      
      <ExpressionEditor
        value={String(data.values ?? '')}
        onChange={(v) => onChange('values', v)}
        title="Values"
        placeholder="e.g., [0, 0.5, 1, 0.8, 0.2]"
      />
    </div>
  );
}

// ============================================
// NODE EDITOR DISPATCHER
// ============================================
export function getAdvancedNodeEditor(nodeType: string): React.ComponentType<EditorProps> | null {
  const editors: Record<string, React.ComponentType<EditorProps>> = {
    'INTEGRATOR': IntegratorEditor,
    'STATE_MACHINE': StateMachineEditor,
    'AGENT': AgentEditor,
    'PID_CONTROLLER': PIDControllerEditor,
    'MARKOV_CHAIN': MarkovChainEditor,
    'FILTER': FilterEditor,
    'OPTIMIZER': OptimizerEditor,
    'BUFFER': BufferEditor,
    'MESH': MeshEditor,
    'LOOKUP_TABLE': LookupTableEditor,
  };
  
  return editors[nodeType] ?? null;
}

// Simple placeholder for types without custom editors yet
export function GenericAdvancedEditor(_props: EditorProps) {
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400 italic">
        Configure this advanced node via Custom Node Data below
      </div>
    </div>
  );
}
