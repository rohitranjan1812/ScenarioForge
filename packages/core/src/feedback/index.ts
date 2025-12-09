// ============================================
// Feedback Loop Execution Engine
// ============================================
// Manages feedback loops during simulation, including:
// - State tracking across iterations
// - Transform functions (PID, moving average, etc.)
// - Convergence detection
// - History management

import type {
  FeedbackLoop,
  FeedbackState,
  FeedbackHistoryEntry,
  FeedbackTransformConfig,
  HierarchicalExpressionContext,
} from '../types/hierarchical.types.js';
import { evaluate } from '../expression/index.js';

// ============================================
// Feedback State Management
// ============================================

/**
 * Creates initial feedback state for a loop
 */
export function createFeedbackState(loop: FeedbackLoop): FeedbackState {
  return {
    loopId: loop.id,
    history: [],
    currentValue: loop.initialValue,
    converged: false,
    convergenceIteration: undefined,
    pidState: loop.transform === 'pid' ? {
      integral: 0,
      previousError: 0,
    } : undefined,
  };
}

/**
 * Creates a map of feedback states for all loops in a graph
 */
export function initializeFeedbackStates(
  loops: FeedbackLoop[]
): Map<string, FeedbackState> {
  const states = new Map<string, FeedbackState>();
  
  for (const loop of loops) {
    if (loop.enabled) {
      states.set(loop.id, createFeedbackState(loop));
    }
  }
  
  return states;
}

// ============================================
// Feedback Transforms
// ============================================

/**
 * Applies the direct transform (pass-through)
 */
function applyDirectTransform(value: unknown): unknown {
  return value;
}

/**
 * Applies delta transform (difference from previous value)
 */
function applyDeltaTransform(
  currentValue: number,
  previousValue: number | undefined
): number {
  if (previousValue === undefined) return 0;
  return currentValue - previousValue;
}

/**
 * Applies moving average transform
 */
function applyMovingAverageTransform(
  history: FeedbackHistoryEntry[],
  windowSize: number
): number {
  if (history.length === 0) return 0;
  
  const window = history.slice(-windowSize);
  const values = window
    .map(h => h.value)
    .filter((v): v is number => typeof v === 'number');
  
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Applies exponential smoothing transform
 */
function applyExponentialTransform(
  currentValue: number,
  previousSmoothed: number | undefined,
  alpha: number
): number {
  if (previousSmoothed === undefined) return currentValue;
  return alpha * currentValue + (1 - alpha) * previousSmoothed;
}

/**
 * Applies PID controller transform
 */
function applyPIDTransform(
  currentValue: number,
  state: FeedbackState,
  config: FeedbackTransformConfig,
  dt: number = 1
): { output: number; newState: { integral: number; previousError: number } } {
  const setpoint = typeof config.setpoint === 'number' ? config.setpoint : 0;
  const kp = config.kp ?? 1;
  const ki = config.ki ?? 0;
  const kd = config.kd ?? 0;
  
  const error = setpoint - currentValue;
  const pidState = state.pidState ?? { integral: 0, previousError: 0 };
  
  // Proportional term
  const p = kp * error;
  
  // Integral term (with anti-windup)
  const integral = pidState.integral + error * dt;
  const i = ki * integral;
  
  // Derivative term
  const derivative = (error - pidState.previousError) / dt;
  const d = kd * derivative;
  
  return {
    output: p + i + d,
    newState: {
      integral,
      previousError: error,
    },
  };
}

/**
 * Applies custom expression transform
 */
function applyCustomTransform(
  value: unknown,
  expression: string,
  context: HierarchicalExpressionContext
): unknown {
  // Extend context with feedback-specific variables
  const feedbackContext = {
    ...context,
    $feedbackValue: value,
  };
  
  return evaluate(expression, feedbackContext);
}

/**
 * Main transform dispatcher
 */
export function applyFeedbackTransform(
  loop: FeedbackLoop,
  state: FeedbackState,
  sourceValue: unknown,
  context: HierarchicalExpressionContext
): { value: unknown; newState: Partial<FeedbackState> } {
  const config = loop.transformConfig ?? {};
  
  switch (loop.transform) {
    case 'direct':
      return { value: applyDirectTransform(sourceValue), newState: {} };
    
    case 'delta': {
      const prev = state.history.length > 0 
        ? state.history[state.history.length - 1].value as number
        : undefined;
      return { 
        value: applyDeltaTransform(sourceValue as number, prev),
        newState: {},
      };
    }
    
    case 'moving_avg':
      return {
        value: applyMovingAverageTransform(state.history, config.windowSize ?? 5),
        newState: {},
      };
    
    case 'exponential': {
      const prevSmoothed = state.currentValue as number | undefined;
      return {
        value: applyExponentialTransform(
          sourceValue as number,
          prevSmoothed,
          config.alpha ?? 0.3
        ),
        newState: {},
      };
    }
    
    case 'pid': {
      const { output, newState: pidState } = applyPIDTransform(
        sourceValue as number,
        state,
        config
      );
      return {
        value: output,
        newState: { pidState },
      };
    }
    
    case 'custom':
      if (!loop.customExpression) {
        return { value: sourceValue, newState: {} };
      }
      return {
        value: applyCustomTransform(sourceValue, loop.customExpression, context),
        newState: {},
      };
    
    default:
      return { value: sourceValue, newState: {} };
  }
}

// ============================================
// Convergence Detection
// ============================================

/**
 * Checks if a feedback loop has converged
 */
export function checkConvergence(
  loop: FeedbackLoop,
  state: FeedbackState
): boolean {
  const convergenceConfig = loop.convergence;
  if (!convergenceConfig?.enabled) return false;
  
  const { tolerance, metric, windowSize } = convergenceConfig;
  
  if (state.history.length < windowSize) return false;
  
  const window = state.history.slice(-windowSize);
  const values = window
    .map(h => h.value)
    .filter((v): v is number => typeof v === 'number');
  
  if (values.length < windowSize) return false;
  
  switch (metric) {
    case 'absolute': {
      // Check if all values in window are within tolerance
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      return values.every(v => Math.abs(v - mean) <= tolerance);
    }
    
    case 'relative': {
      // Check if relative change is within tolerance
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      if (mean === 0) return values.every(v => v === 0);
      return values.every(v => Math.abs((v - mean) / mean) <= tolerance);
    }
    
    case 'oscillation': {
      // Check if the values have stopped oscillating
      // by measuring sign changes in consecutive differences
      let signChanges = 0;
      for (let i = 1; i < values.length - 1; i++) {
        const diff1 = values[i] - values[i - 1];
        const diff2 = values[i + 1] - values[i];
        if (diff1 * diff2 < 0) signChanges++;
      }
      // If there are many sign changes, still oscillating
      return signChanges <= 1 && Math.abs(values[values.length - 1] - values[0]) <= tolerance;
    }
    
    default:
      return false;
  }
}

// ============================================
// Feedback Loop Execution
// ============================================

/**
 * Processes a feedback loop for a single iteration
 */
export function processFeedbackLoop(
  loop: FeedbackLoop,
  state: FeedbackState,
  nodeOutputs: Map<string, Record<string, unknown>>,
  iteration: number,
  context: HierarchicalExpressionContext
): FeedbackState {
  // Check if we should process based on trigger
  if (!shouldTrigger(loop, iteration, state)) {
    return state;
  }
  
  // Get source value
  const sourceNodeOutput = nodeOutputs.get(loop.sourceNodeId);
  if (!sourceNodeOutput) {
    console.warn(`Feedback source node ${loop.sourceNodeId} not found`);
    return state;
  }
  
  let sourceValue: unknown;
  if (loop.sourceField) {
    const portOutput = sourceNodeOutput[loop.sourcePortId];
    if (portOutput && typeof portOutput === 'object') {
      sourceValue = (portOutput as Record<string, unknown>)[loop.sourceField];
    }
  } else {
    sourceValue = sourceNodeOutput[loop.sourcePortId];
  }
  
  // Apply transform
  const { value: transformedValue, newState } = applyFeedbackTransform(
    loop,
    state,
    sourceValue,
    context
  );
  
  // Create history entry
  const historyEntry: FeedbackHistoryEntry = {
    iteration,
    value: sourceValue,
    delta: typeof sourceValue === 'number' && state.history.length > 0
      ? sourceValue - (state.history[state.history.length - 1].value as number)
      : undefined,
    timestamp: new Date(),
  };
  
  // Update history (respect stateHistory limit)
  const newHistory = [...state.history, historyEntry].slice(-loop.stateHistory);
  
  // Create updated state
  const updatedState: FeedbackState = {
    ...state,
    ...newState,
    history: newHistory,
    currentValue: transformedValue,
  };
  
  // Check convergence
  if (!state.converged && checkConvergence(loop, updatedState)) {
    updatedState.converged = true;
    updatedState.convergenceIteration = iteration;
  }
  
  return updatedState;
}

/**
 * Determines if a feedback loop should trigger on this iteration
 */
function shouldTrigger(
  loop: FeedbackLoop,
  _iteration: number,
  state: FeedbackState
): boolean {
  switch (loop.trigger) {
    case 'iteration':
      // Always trigger every iteration
      return true;
    
    case 'time_step':
      // Would need timeStep info - for now, treat as iteration
      return true;
    
    case 'convergence':
      // Don't trigger after convergence
      return !state.converged;
    
    case 'threshold': {
      // Trigger when value crosses threshold
      const config = loop.transformConfig;
      if (!config?.threshold || state.history.length === 0) return true;
      
      const lastValue = state.history[state.history.length - 1].value as number;
      const threshold = config.threshold;
      const direction = config.direction ?? 'both';
      
      if (direction === 'rising') {
        return lastValue < threshold;
      } else if (direction === 'falling') {
        return lastValue > threshold;
      }
      return true;
    }
    
    case 'schedule':
      // For now, trigger every iteration
      // TODO: Implement schedule parsing
      return true;
    
    default:
      return true;
  }
}

/**
 * Gets the feedback value to inject into a target node
 */
export function getFeedbackInjection(
  loop: FeedbackLoop,
  state: FeedbackState,
  _iteration: number
): unknown {
  // Respect delay - only inject after delay iterations
  if (state.history.length < loop.delay) {
    return loop.initialValue;
  }
  
  // Get the value from (delay) iterations ago
  const delayedIndex = state.history.length - loop.delay;
  if (delayedIndex < 0) {
    return loop.initialValue;
  }
  
  // Return the transformed current value (which was computed from delayed source)
  return state.currentValue;
}

// ============================================
// Batch Processing
// ============================================

/**
 * Processes all feedback loops for an iteration
 */
export function processAllFeedbackLoops(
  loops: FeedbackLoop[],
  states: Map<string, FeedbackState>,
  nodeOutputs: Map<string, Record<string, unknown>>,
  iteration: number,
  context: HierarchicalExpressionContext
): Map<string, FeedbackState> {
  const newStates = new Map<string, FeedbackState>();
  
  for (const loop of loops) {
    if (!loop.enabled) continue;
    
    const currentState = states.get(loop.id);
    if (!currentState) continue;
    
    const newState = processFeedbackLoop(
      loop,
      currentState,
      nodeOutputs,
      iteration,
      context
    );
    
    newStates.set(loop.id, newState);
  }
  
  return newStates;
}

/**
 * Collects all feedback injections for target nodes
 */
export function collectFeedbackInjections(
  loops: FeedbackLoop[],
  states: Map<string, FeedbackState>,
  iteration: number
): Map<string, Map<string, unknown>> {
  // Map of nodeId -> portId -> value
  const injections = new Map<string, Map<string, unknown>>();
  
  for (const loop of loops) {
    if (!loop.enabled) continue;
    
    const state = states.get(loop.id);
    if (!state) continue;
    
    const value = getFeedbackInjection(loop, state, iteration);
    
    // Get or create node's injection map
    let nodeInjections = injections.get(loop.targetNodeId);
    if (!nodeInjections) {
      nodeInjections = new Map();
      injections.set(loop.targetNodeId, nodeInjections);
    }
    
    // Store the injection value
    const key = loop.targetField 
      ? `${loop.targetPortId}.${loop.targetField}`
      : loop.targetPortId;
    nodeInjections.set(key, value);
  }
  
  return injections;
}

/**
 * Checks if all feedback loops have converged
 */
export function checkGlobalConvergence(
  loops: FeedbackLoop[],
  states: Map<string, FeedbackState>
): boolean {
  for (const loop of loops) {
    if (!loop.enabled) continue;
    if (!loop.convergence?.enabled) continue;
    
    const state = states.get(loop.id);
    if (!state?.converged) return false;
  }
  
  return true;
}

// ============================================
// Exports
// ============================================

export type {
  FeedbackLoop,
  FeedbackState,
  FeedbackHistoryEntry,
} from '../types/hierarchical.types.js';
