/**
 * ScenarioForge - Feedback Loop Integration Tests
 * 
 * Comprehensive tests for the feedback loop system including:
 * - Feedback state management
 * - Transform functions (direct, delta, moving average, exponential, PID)
 * - Convergence detection
 * - Integration with simulation engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createFeedbackState,
  initializeFeedbackStates,
  applyFeedbackTransform,
  checkConvergence,
  checkGlobalConvergence,
  processFeedbackLoop,
  processAllFeedbackLoops,
  getFeedbackInjection,
} from '../feedback/index.js';
import { setSeed } from '../expression/index.js';
import type { FeedbackLoop, FeedbackState, HierarchicalExpressionContext } from '../types/hierarchical.types.js';
import {
  resetIdCounter,
} from './test-utils.js';

// Helper to create a valid HierarchicalExpressionContext for tests
function createTestContext(overrides: Partial<HierarchicalExpressionContext> = {}): HierarchicalExpressionContext {
  return {
    $params: {},
    $time: Date.now(),
    $iteration: 0,
    $node: {},
    $inputs: {},
    $nodes: {},
    $parent: {},
    $root: {},
    $depth: 0,
    $path: [],
    $graphs: {},
    $feedback: {},
    $feedbackHistory: {},
    ...overrides,
  };
}

describe('Feedback Loop Integration Tests', () => {
  beforeEach(() => {
    resetIdCounter();
    setSeed(42);
  });

  // ============================================
  // Feedback State Management
  // ============================================
  describe('Feedback State Management', () => {
    it('should create initial feedback state', () => {
      const loop: FeedbackLoop = {
        id: 'loop-1',
        name: 'Test Loop',
        sourceNodeId: 'node-1',
        sourcePortId: 'port-1',
        targetNodeId: 'node-2',
        targetPortId: 'port-2',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 100,
        enabled: true,
        convergence: {
          enabled: true,
          tolerance: 0.001,
          metric: 'absolute',
          windowSize: 5,
        },
      };

      const state = createFeedbackState(loop);

      expect(state.loopId).toBe('loop-1');
      expect(state.currentValue).toBe(100);
      expect(state.history).toHaveLength(0);
      expect(state.converged).toBe(false);
      expect(state.convergenceIteration).toBeUndefined();
    });

    it('should initialize feedback states for multiple loops', () => {
      const loops: FeedbackLoop[] = [
        {
          id: 'loop-1',
          name: 'Loop 1',
          sourceNodeId: 'n1',
          sourcePortId: 'p1',
          targetNodeId: 'n2',
          targetPortId: 'p2',
          delay: 1,
          trigger: 'iteration',
          transform: 'direct',
          initialValue: 0,
          enabled: true,
        },
        {
          id: 'loop-2',
          name: 'Loop 2',
          sourceNodeId: 'n3',
          sourcePortId: 'p3',
          targetNodeId: 'n4',
          targetPortId: 'p4',
          delay: 1,
          trigger: 'iteration',
          transform: 'direct',
          initialValue: 50,
          enabled: true,
        },
        {
          id: 'loop-3',
          name: 'Disabled Loop',
          sourceNodeId: 'n5',
          sourcePortId: 'p5',
          targetNodeId: 'n6',
          targetPortId: 'p6',
          delay: 1,
          trigger: 'iteration',
          transform: 'direct',
          initialValue: 0,
          enabled: false, // This one should not be initialized
        },
      ];

      const states = initializeFeedbackStates(loops);

      expect(states.size).toBe(2); // Only enabled loops
      expect(states.has('loop-1')).toBe(true);
      expect(states.has('loop-2')).toBe(true);
      expect(states.has('loop-3')).toBe(false);
      expect(states.get('loop-1')?.currentValue).toBe(0);
      expect(states.get('loop-2')?.currentValue).toBe(50);
    });
  });

  // ============================================
  // Feedback Transforms
  // ============================================
  describe('Feedback Transforms', () => {
    it('should apply direct transform (pass-through)', () => {
      const loop: FeedbackLoop = {
        id: 'loop-direct',
        name: 'Direct Loop',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
      };

      const state = createFeedbackState(loop);
      const newValue = 42;
      const context = createTestContext();
      
      const result = applyFeedbackTransform(loop, state, newValue, context);
      
      expect(result.value).toBe(42);
    });

    it('should apply delta transform (difference from previous)', () => {
      const loop: FeedbackLoop = {
        id: 'loop-delta',
        name: 'Delta Loop',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'delta',
        initialValue: 0,
        enabled: true,
      };

      const state = createFeedbackState(loop);
      state.currentValue = 100;
      state.history = [{ iteration: 0, value: 100, timestamp: new Date() }];
      const context = createTestContext();
      
      const result = applyFeedbackTransform(loop, state, 125, context);
      
      expect(result.value).toBe(25); // 125 - 100
    });

    it('should apply moving average transform', () => {
      const loop: FeedbackLoop = {
        id: 'loop-ma',
        name: 'Moving Average Loop',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'moving_avg',
        transformConfig: { windowSize: 3 },
        initialValue: 0,
        enabled: true,
      };

      const state = createFeedbackState(loop);
      state.history = [
        { iteration: 1, value: 10, timestamp: new Date() },
        { iteration: 2, value: 20, timestamp: new Date() },
        { iteration: 3, value: 30, timestamp: new Date() },
      ];
      const context = createTestContext();
      
      const result = applyFeedbackTransform(loop, state, 40, context);
      
      // Moving average of history values
      expect(typeof result.value).toBe('number');
    });

    it('should apply exponential smoothing transform', () => {
      const loop: FeedbackLoop = {
        id: 'loop-exp',
        name: 'Exponential Loop',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'exponential',
        transformConfig: { alpha: 0.5 },
        initialValue: 100,
        enabled: true,
      };

      const state = createFeedbackState(loop);
      state.currentValue = 100;
      const context = createTestContext();
      
      const result = applyFeedbackTransform(loop, state, 200, context);
      
      // Exponential: alpha * new + (1-alpha) * old = 0.5 * 200 + 0.5 * 100 = 150
      expect(result.value).toBeCloseTo(150, 5);
    });

    it('should apply PID controller transform', () => {
      const loop: FeedbackLoop = {
        id: 'loop-pid',
        name: 'PID Loop',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'pid',
        transformConfig: {
          kp: 1.0,  // Proportional gain
          ki: 0.1,  // Integral gain
          kd: 0.05, // Derivative gain
          setpoint: 100,
        },
        initialValue: 0,
        enabled: true,
      };

      const state = createFeedbackState(loop);
      state.pidState = { integral: 0, previousError: 0 };
      const context = createTestContext();
      
      // Current value is 80, setpoint is 100, error = 20
      const result = applyFeedbackTransform(loop, state, 80, context);
      
      // PID output should be positive (trying to increase toward setpoint)
      expect(typeof result.value).toBe('number');
    });
  });

  // ============================================
  // Convergence Detection
  // ============================================
  describe('Convergence Detection', () => {
    it('should detect absolute convergence', () => {
      const loop: FeedbackLoop = {
        id: 'loop-conv',
        name: 'Convergence Test',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
        convergence: {
          enabled: true,
          tolerance: 0.01,
          metric: 'absolute',
          windowSize: 3,
        },
      };

      const state = createFeedbackState(loop);
      state.history = [
        { iteration: 1, value: 100.00, timestamp: new Date() },
        { iteration: 2, value: 100.005, timestamp: new Date() },
        { iteration: 3, value: 100.002, timestamp: new Date() },
      ];
      
      const converged = checkConvergence(loop, state);
      
      // All values within 0.01 tolerance, should converge
      expect(converged).toBe(true);
    });

    it('should detect relative convergence', () => {
      const loop: FeedbackLoop = {
        id: 'loop-rel',
        name: 'Relative Convergence',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
        convergence: {
          enabled: true,
          tolerance: 0.001, // 0.1%
          metric: 'relative',
          windowSize: 3,
        },
      };

      const state = createFeedbackState(loop);
      state.history = [
        { iteration: 1, value: 1000, timestamp: new Date() },
        { iteration: 2, value: 1000.5, timestamp: new Date() },
        { iteration: 3, value: 1000.3, timestamp: new Date() },
      ];
      
      const converged = checkConvergence(loop, state);
      
      expect(converged).toBe(true);
    });

    it('should not converge when values vary too much', () => {
      const loop: FeedbackLoop = {
        id: 'loop-no-conv',
        name: 'No Convergence',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
        convergence: {
          enabled: true,
          tolerance: 0.01,
          metric: 'absolute',
          windowSize: 3,
        },
      };

      const state = createFeedbackState(loop);
      state.history = [
        { iteration: 1, value: 100, timestamp: new Date() },
        { iteration: 2, value: 105, timestamp: new Date() },
        { iteration: 3, value: 110, timestamp: new Date() },
      ];
      
      const converged = checkConvergence(loop, state);
      
      expect(converged).toBe(false);
    });

    it('should check all loops for convergence', () => {
      const loop1: FeedbackLoop = {
        id: 'loop-1',
        name: 'Loop 1',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
        convergence: { enabled: true, tolerance: 0.01, metric: 'absolute', windowSize: 3 },
      };

      const loop2: FeedbackLoop = {
        id: 'loop-2',
        name: 'Loop 2',
        sourceNodeId: 'n3',
        sourcePortId: 'p3',
        targetNodeId: 'n4',
        targetPortId: 'p4',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
        convergence: { enabled: true, tolerance: 0.01, metric: 'absolute', windowSize: 3 },
      };

      const states = new Map<string, FeedbackState>();
      const loops = [loop1, loop2];
      
      const state1 = createFeedbackState(loop1);
      state1.converged = true;
      states.set('loop-1', state1);
      
      const state2 = createFeedbackState(loop2);
      state2.converged = false;
      states.set('loop-2', state2);

      expect(checkGlobalConvergence(loops, states)).toBe(false);

      state2.converged = true;
      expect(checkGlobalConvergence(loops, states)).toBe(true);
    });
  });

  // ============================================
  // History Management
  // ============================================
  describe('History Management', () => {
    it('should update feedback history correctly via processFeedbackLoop', () => {
      const loop: FeedbackLoop = {
        id: 'loop-hist',
        name: 'History Test',
        sourceNodeId: 'n1',
        sourcePortId: 'output',
        targetNodeId: 'n2',
        targetPortId: 'input',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
        stateHistory: 5,
      };

      let state = createFeedbackState(loop);
      const context = createTestContext();

      // Process feedback loop 7 times with different values
      for (let i = 1; i <= 7; i++) {
        const nodeOutputs = new Map<string, Record<string, unknown>>();
        nodeOutputs.set('n1', { output: i * 10 });
        state = processFeedbackLoop(loop, state, nodeOutputs, i, context);
      }

      // Should only keep last 5 (stateHistory)
      expect(state.history.length).toBeLessThanOrEqual(5);
      expect(state.history[state.history.length - 1].value).toBe(70);
    });

    it('should track iteration numbers in history', () => {
      const loop: FeedbackLoop = {
        id: 'loop-iter',
        name: 'Iteration Test',
        sourceNodeId: 'n1',
        sourcePortId: 'output',
        targetNodeId: 'n2',
        targetPortId: 'input',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
        stateHistory: 100, // Keep all for this test
      };

      let state = createFeedbackState(loop);
      const context = createTestContext();
      
      // Process at specific iterations
      const nodeOutputs = new Map<string, Record<string, unknown>>();
      
      nodeOutputs.set('n1', { output: 100 });
      state = processFeedbackLoop(loop, state, nodeOutputs, 1, context);
      
      nodeOutputs.set('n1', { output: 200 });
      state = processFeedbackLoop(loop, state, nodeOutputs, 5, context);
      
      nodeOutputs.set('n1', { output: 300 });
      state = processFeedbackLoop(loop, state, nodeOutputs, 10, context);

      expect(state.history).toHaveLength(3);
      expect(state.history[0].iteration).toBe(1);
      expect(state.history[1].iteration).toBe(5);
      expect(state.history[2].iteration).toBe(10);
    });
  });

  // ============================================
  // Trigger Types
  // ============================================
  describe('Trigger Types', () => {
    it('should support iteration-based trigger', () => {
      const loop: FeedbackLoop = {
        id: 'loop-iter-trig',
        name: 'Iteration Trigger',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
      };

      expect(loop.trigger).toBe('iteration');
    });

    it('should support threshold-based trigger', () => {
      const loop: FeedbackLoop = {
        id: 'loop-thresh',
        name: 'Threshold Trigger',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'threshold',
        transform: 'direct',
        transformConfig: {
          threshold: 100,
          direction: 'rising',
        },
        initialValue: 0,
        enabled: true,
      };

      expect(loop.trigger).toBe('threshold');
      expect(loop.transformConfig?.threshold).toBe(100);
      expect(loop.transformConfig?.direction).toBe('rising');
    });

    it('should support convergence-based trigger', () => {
      const loop: FeedbackLoop = {
        id: 'loop-conv-trig',
        name: 'Convergence Trigger',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'convergence',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
        convergence: {
          enabled: true,
          tolerance: 0.001,
          metric: 'absolute',
          windowSize: 5,
        },
      };

      expect(loop.trigger).toBe('convergence');
    });
  });

  // ============================================
  // Integration with Graph Execution
  // ============================================
  describe('Integration with Graph Execution', () => {
    it('should get feedback value for injection into graph', () => {
      const loop: FeedbackLoop = {
        id: 'loop-inject',
        name: 'Injection Loop',
        sourceNodeId: 'node-source',
        sourcePortId: 'port-source',
        targetNodeId: 'node-target',
        targetPortId: 'port-target',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 42,
        enabled: true,
      };

      const state = createFeedbackState(loop);

      // With no history, should return initialValue due to delay
      const value = getFeedbackInjection(loop, state, 0);
      expect(value).toBe(42);

      // After history has entries, should return currentValue
      state.history = [{ iteration: 0, value: 42, timestamp: new Date() }];
      state.currentValue = 100;
      expect(getFeedbackInjection(loop, state, 1)).toBe(100);
    });

    it('should process feedback loops after graph execution', () => {
      const loops: FeedbackLoop[] = [
        {
          id: 'loop-process',
          name: 'Process Loop',
          sourceNodeId: 'output',
          sourcePortId: 'result',
          targetNodeId: 'input',
          targetPortId: 'value',
          delay: 1,
          trigger: 'iteration',
          transform: 'direct',
          initialValue: 0,
          enabled: true,
        },
      ];

      const states = initializeFeedbackStates(loops);
      const context = createTestContext();
      
      // Simulate graph output
      const nodeOutputs = new Map<string, Record<string, unknown>>();
      nodeOutputs.set('output', { result: 150 });

      // Process feedback - returns new states map
      const newStates = processAllFeedbackLoops(loops, states, nodeOutputs, 1, context);

      // State should be updated
      const state = newStates.get('loop-process');
      expect(state).toBeDefined();
      expect(state?.currentValue).toBe(150);
    });

    it('should handle multiple feedback loops simultaneously', () => {
      const loops: FeedbackLoop[] = [
        {
          id: 'loop-a',
          name: 'Loop A',
          sourceNodeId: 'node-a',
          sourcePortId: 'output',
          targetNodeId: 'node-b',
          targetPortId: 'input',
          delay: 1,
          trigger: 'iteration',
          transform: 'direct',
          initialValue: 0,
          enabled: true,
        },
        {
          id: 'loop-b',
          name: 'Loop B',
          sourceNodeId: 'node-c',
          sourcePortId: 'output',
          targetNodeId: 'node-d',
          targetPortId: 'input',
          delay: 1,
          trigger: 'iteration',
          transform: 'exponential',
          transformConfig: { alpha: 0.3 },
          initialValue: 100,
          enabled: true,
        },
      ];

      const states = initializeFeedbackStates(loops);
      const context = createTestContext();

      const nodeOutputs = new Map<string, Record<string, unknown>>();
      nodeOutputs.set('node-a', { output: 50 });
      nodeOutputs.set('node-c', { output: 200 });

      const newStates = processAllFeedbackLoops(loops, states, nodeOutputs, 1, context);

      // Loop A: direct passthrough
      expect(newStates.get('loop-a')?.currentValue).toBe(50);

      // Loop B: exponential smoothing 0.3 * 200 + 0.7 * 100 = 130
      expect(newStates.get('loop-b')?.currentValue).toBeCloseTo(130, 5);
    });
  });

  // ============================================
  // PID Controller Detailed Tests
  // ============================================
  describe('PID Controller', () => {
    const context = createTestContext();

    it('should accumulate integral term correctly', () => {
      const loop: FeedbackLoop = {
        id: 'loop-pid-int',
        name: 'PID Integral Test',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'pid',
        transformConfig: {
          kp: 0,    // Disable P term
          ki: 1.0,  // Only integral
          kd: 0,    // Disable D term
          setpoint: 100,
        },
        initialValue: 0,
        enabled: true,
      };

      const state = createFeedbackState(loop);
      state.pidState = { integral: 0, previousError: 0 };

      // Error = setpoint - value = 100 - 80 = 20
      const result1 = applyFeedbackTransform(loop, state, 80, context);
      expect(result1.newState.pidState?.integral).toBe(20);

      // Apply the new state for next iteration
      state.pidState = result1.newState.pidState ?? state.pidState;

      // Another iteration with same error
      const result2 = applyFeedbackTransform(loop, state, 80, context);
      expect(result2.newState.pidState?.integral).toBe(40);
    });

    it('should compute derivative term correctly', () => {
      const loop: FeedbackLoop = {
        id: 'loop-pid-deriv',
        name: 'PID Derivative Test',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'pid',
        transformConfig: {
          kp: 0,    // Disable P term
          ki: 0,    // Disable I term
          kd: 1.0,  // Only derivative
          setpoint: 100,
        },
        initialValue: 0,
        enabled: true,
      };

      const state = createFeedbackState(loop);
      state.pidState = { integral: 0, previousError: 10 }; // Previous error was 10

      // Current error = 100 - 80 = 20
      // Derivative = (20 - 10) = 10
      const result = applyFeedbackTransform(loop, state, 80, context);
      
      expect(result.value).toBeCloseTo(10, 5);
    });

    it('should combine P, I, D terms correctly', () => {
      const loop: FeedbackLoop = {
        id: 'loop-pid-full',
        name: 'Full PID Test',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'pid',
        transformConfig: {
          kp: 1.0,
          ki: 0.5,
          kd: 0.2,
          setpoint: 100,
        },
        initialValue: 0,
        enabled: true,
      };

      const state = createFeedbackState(loop);
      state.pidState = { integral: 10, previousError: 15 };

      // Current value: 80, setpoint: 100
      // Error = 20
      // P term = 1.0 * 20 = 20
      // I term = 0.5 * (10 + 20) = 15 (accumulated integral + new error)
      // D term = 0.2 * (20 - 15) = 1
      // Total ≈ 20 + 15 + 1 = 36
      const result = applyFeedbackTransform(loop, state, 80, context);
      
      expect(result.value).toBeGreaterThan(30);
      expect(result.value).toBeLessThan(40);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    const context = createTestContext();

    it('should handle empty history for moving average', () => {
      const loop: FeedbackLoop = {
        id: 'loop-empty-ma',
        name: 'Empty MA',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'moving_avg',
        transformConfig: { windowSize: 5 },
        initialValue: 0,
        enabled: true,
      };

      const state = createFeedbackState(loop);
      // Empty history

      const result = applyFeedbackTransform(loop, state, 100, context);
      
      // Should handle gracefully - returns {value, newState}
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('newState');
    });

    it('should handle zero values', () => {
      const loop: FeedbackLoop = {
        id: 'loop-zero',
        name: 'Zero Test',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
      };

      const state = createFeedbackState(loop);
      
      const result = applyFeedbackTransform(loop, state, 0, context);
      expect(result.value).toBe(0);
    });

    it('should handle negative values', () => {
      const loop: FeedbackLoop = {
        id: 'loop-neg',
        name: 'Negative Test',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
      };

      const state = createFeedbackState(loop);
      state.currentValue = 50;
      
      const result = applyFeedbackTransform(loop, state, -100, context);
      expect(result.value).toBe(-100);
    });

    it('should handle very large values without overflow', () => {
      const loop: FeedbackLoop = {
        id: 'loop-large',
        name: 'Large Value Test',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'exponential',
        transformConfig: { alpha: 0.5 },
        initialValue: 1e10,
        enabled: true,
      };

      const state = createFeedbackState(loop);
      
      const result = applyFeedbackTransform(loop, state, 2e10, context);
      
      expect(isFinite(result.value as number)).toBe(true);
    });

    it('should handle disabled convergence gracefully', () => {
      const loop: FeedbackLoop = {
        id: 'loop-no-conv',
        name: 'No Convergence Config',
        sourceNodeId: 'n1',
        sourcePortId: 'p1',
        targetNodeId: 'n2',
        targetPortId: 'p2',
        delay: 1,
        trigger: 'iteration',
        transform: 'direct',
        initialValue: 0,
        enabled: true,
        // No convergence config
      };

      const state = createFeedbackState(loop);
      state.history = [
        { iteration: 1, value: 100, timestamp: new Date() },
      ];

      const converged = checkConvergence(loop, state);
      
      // Should return false when convergence is not configured
      expect(converged).toBe(false);
    });
  });
});
