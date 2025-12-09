// ============================================
// Execution Engine Type Definitions
// ============================================
// Extended execution engine types for multi-paradigm simulation:
// - Multiple execution paradigms (dataflow, discrete event, continuous, etc.)
// - Hybrid simulation support
// - Parallel and distributed execution
// - Extended simulation state management

import type { SimulationStatus, TimeUnit } from './index.js';
import type { AdvancedNodeType } from './advanced-nodes.types.js';

// ============================================
// Execution Paradigms
// ============================================

/**
 * Supported execution paradigms
 */
export type ExecutionParadigm =
  | 'dataflow'            // Standard forward dataflow (topological)
  | 'discrete_event'      // Event-driven simulation (DES)
  | 'continuous_time'     // ODE/PDE integration
  | 'hybrid'              // Mixed continuous/discrete
  | 'iterative'           // Fixed-point iteration
  | 'optimization'        // Optimization loop
  | 'agent_based'         // Agent-based simulation (ABM)
  | 'game_theoretic';     // Game equilibrium finding

// ============================================
// Paradigm-Specific Configurations
// ============================================

/**
 * Dataflow execution configuration
 */
export interface DataflowExecutionConfig {
  /** Eager vs lazy evaluation */
  evaluation: 'eager' | 'lazy';
  
  /** Cache intermediate results */
  caching: boolean;
  
  /** Level of parallelism */
  parallelism: number;
  
  /** Scheduling strategy */
  scheduling: 'topological' | 'priority' | 'work_stealing';
  
  /** Batch size for parallel execution */
  batchSize?: number;
}

/**
 * Discrete event execution configuration
 */
export interface DiscreteEventExecutionConfig {
  /** Event queue discipline */
  eventQueueDiscipline: 'fifo' | 'lifo' | 'priority' | 'calendar';
  
  /** Time advancement mode */
  timeAdvancement: 'event_driven' | 'time_stepped' | 'hybrid';
  
  /** Tie-breaking for simultaneous events */
  tieBreaking: 'fifo' | 'random' | 'priority';
  
  /** Maximum lookahead for parallel DES */
  lookahead?: number;
  
  /** Null message protocol for conservative sync */
  nullMessageProtocol?: boolean;
  
  /** Optimistic execution with rollback */
  optimistic?: {
    enabled: boolean;
    checkpointInterval: number;
    antimessageEnabled: boolean;
  };
}

export type IntegratorMethod = 
  | 'euler'
  | 'rk4'
  | 'rk45'
  | 'dopri5'
  | 'radau'
  | 'bdf'
  | 'adams';

/**
 * Continuous time execution configuration
 */
export interface ContinuousTimeExecutionConfig {
  /** Integration method */
  integrator: IntegratorMethod;
  
  /** Step size control */
  stepControl: 'fixed' | 'adaptive';
  
  /** Initial/fixed step size */
  stepSize: number;
  
  /** Step size unit */
  stepUnit: TimeUnit;
  
  /** For adaptive step control */
  adaptive?: {
    minStep: number;
    maxStep: number;
    relativeTolerance: number;
    absoluteTolerance: number;
  };
  
  /** Stiffness detection */
  stiffnessDetection?: boolean;
  
  /** Auto-switch integrator for stiff systems */
  autoSwitch?: boolean;
  
  /** Dense output for interpolation */
  denseOutput?: boolean;
}

export type HybridEventType = 'zero_crossing' | 'scheduled' | 'state_event' | 'time_event';

/**
 * Hybrid execution configuration
 */
export interface HybridExecutionConfig {
  /** Continuous component config */
  continuous: ContinuousTimeExecutionConfig;
  
  /** Discrete component config */
  discrete: DiscreteEventExecutionConfig;
  
  /** Event detection */
  eventDetection: {
    tolerance: number;
    localization: 'bisection' | 'interpolation' | 'newton';
    maxIterations: number;
  };
  
  /** Mode management */
  modeManagement: {
    reinitialization: 'automatic' | 'explicit';
    stateReset: 'none' | 'projection' | 'recompute';
  };
  
  /** Synchronization */
  synchronization: {
    method: 'conservative' | 'optimistic' | 'hybrid';
    syncInterval?: number;
  };
}

export type IterativeConvergenceMetric = 'absolute' | 'relative' | 'mixed' | 'custom';
export type AccelerationMethod = 'none' | 'aitken' | 'anderson' | 'wegstein' | 'broyden';

/**
 * Iterative execution configuration
 */
export interface IterativeExecutionConfig {
  /** Maximum iterations */
  maxIterations: number;
  
  /** Convergence tolerance */
  tolerance: number;
  
  /** Convergence metric */
  metric: IterativeConvergenceMetric;
  
  /** Custom metric expression */
  customMetric?: string;
  
  /** Acceleration method */
  acceleration: AccelerationMethod;
  
  /** Anderson acceleration depth */
  andersonDepth?: number;
  
  /** Relaxation factor */
  relaxation?: number;
  
  /** Adaptive relaxation */
  adaptiveRelaxation?: boolean;
  
  /** Damping for stability */
  damping?: {
    initial: number;
    min: number;
    adaptationRate: number;
  };
}

export type OptimizationStrategy = 
  | 'single_objective'
  | 'multi_objective'
  | 'robust'
  | 'stochastic'
  | 'bilevel';

/**
 * Optimization execution configuration
 */
export interface OptimizationExecutionConfig {
  /** Optimization strategy */
  strategy: OptimizationStrategy;
  
  /** Inner simulation iterations per optimization step */
  simulationsPerStep: number;
  
  /** Gradient estimation */
  gradientEstimation?: {
    method: 'finite_difference' | 'complex_step' | 'adjoint' | 'automatic';
    stepSize?: number;
  };
  
  /** Parallel function evaluations */
  parallelEvaluations: number;
  
  /** Surrogate modeling */
  surrogate?: {
    enabled: boolean;
    type: 'polynomial' | 'rbf' | 'kriging' | 'neural_network';
    updateFrequency: number;
  };
  
  /** Multi-start for global optimization */
  multiStart?: {
    enabled: boolean;
    numStarts: number;
    samplingMethod: 'random' | 'latin_hypercube' | 'sobol';
  };
}

export type AgentScheduling = 'random' | 'round_robin' | 'priority' | 'simultaneous' | 'event_driven';
export type AgentActivation = 'synchronous' | 'asynchronous' | 'semi_synchronous';

/**
 * Agent-based execution configuration
 */
export interface AgentBasedExecutionConfig {
  /** Agent scheduling */
  scheduling: AgentScheduling;
  
  /** Activation mode */
  activation: AgentActivation;
  
  /** Random seed for reproducibility */
  seed?: number;
  
  /** Agent population management */
  population: {
    maxAgents: number;
    allowBirth: boolean;
    allowDeath: boolean;
  };
  
  /** Spatial configuration */
  spatial?: {
    enabled: boolean;
    dimensions: number;
    bounds: number[][];
    topology: 'euclidean' | 'torus' | 'network';
  };
  
  /** Communication model */
  communication: {
    mode: 'broadcast' | 'targeted' | 'spatial' | 'network';
    latency?: number;
    reliability?: number;
  };
  
  /** Logging and tracing */
  tracing?: {
    enabled: boolean;
    sampleRate: number;
    tracedAttributes: string[];
  };
}

export type EquilibriumSearchMethod = 
  | 'best_response'
  | 'fictitious_play'
  | 'replicator_dynamics'
  | 'gradient_play'
  | 'lemke_howson'
  | 'support_enumeration';

/**
 * Game-theoretic execution configuration
 */
export interface GameTheoreticExecutionConfig {
  /** Equilibrium search method */
  method: EquilibriumSearchMethod;
  
  /** Learning rate for dynamic methods */
  learningRate?: number;
  
  /** Convergence tolerance */
  convergenceTolerance: number;
  
  /** Maximum iterations */
  maxIterations: number;
  
  /** Perturbation for mixed strategies */
  perturbation?: number;
  
  /** Selection for multiple equilibria */
  equilibriumSelection?: 'random' | 'risk_dominant' | 'payoff_dominant' | 'welfare_maximizing';
  
  /** Trembling hand refinement */
  tremblingHand?: {
    enabled: boolean;
    epsilon: number;
  };
  
  /** Perfect information assumption */
  perfectInformation: boolean;
}

// ============================================
// Unified Execution Configuration
// ============================================

/**
 * Complete execution configuration
 */
export interface ExecutionConfig {
  /** Primary execution paradigm */
  paradigm: ExecutionParadigm;
  
  /** Paradigm-specific configurations */
  dataflow?: DataflowExecutionConfig;
  discreteEvent?: DiscreteEventExecutionConfig;
  continuousTime?: ContinuousTimeExecutionConfig;
  hybrid?: HybridExecutionConfig;
  iterative?: IterativeExecutionConfig;
  optimization?: OptimizationExecutionConfig;
  agentBased?: AgentBasedExecutionConfig;
  gameTheoretic?: GameTheoreticExecutionConfig;
  
  /** Global execution parameters */
  global: {
    /** Maximum execution time (milliseconds) */
    maxExecutionTime: number;
    
    /** Memory limit (bytes) */
    memoryLimit?: number;
    
    /** Checkpoint interval */
    checkpointInterval?: number;
    
    /** Error handling */
    errorHandling: 'stop' | 'skip' | 'retry' | 'fallback';
    
    /** Maximum retries */
    maxRetries?: number;
  };
}

// ============================================
// Parallel Execution Configuration
// ============================================

export type ParallelBackend = 'threads' | 'processes' | 'cluster' | 'gpu' | 'hybrid';
export type LoadBalancing = 'static' | 'dynamic' | 'work_stealing' | 'guided';
export type PartitionStrategy = 'node' | 'subgraph' | 'iteration' | 'data' | 'hybrid';

/**
 * Parallel execution configuration
 */
export interface ParallelExecutionConfig {
  /** Enable parallel execution */
  enabled: boolean;
  
  /** Parallel backend */
  backend: ParallelBackend;
  
  /** Number of workers */
  workers: number;
  
  /** Load balancing strategy */
  loadBalancing: LoadBalancing;
  
  /** Graph partitioning strategy */
  partitioning: PartitionStrategy;
  
  /** Communication overhead threshold for parallelization */
  minWorkThreshold?: number;
  
  /** Batch size for data parallelism */
  batchSize?: number;
  
  /** GPU configuration */
  gpu?: {
    deviceId: number;
    memoryFraction: number;
    kernelBlockSize: number;
  };
  
  /** Distributed configuration */
  distributed?: {
    enabled: boolean;
    coordinatorUrl?: string;
    nodeId?: string;
    heartbeatInterval: number;
    failureTimeout: number;
  };
  
  /** Synchronization */
  synchronization: {
    barrierType: 'global' | 'local' | 'adaptive';
    consistencyModel: 'strong' | 'eventual' | 'causal';
  };
}

// ============================================
// Extended Simulation State
// ============================================

/**
 * State for discrete event simulations
 */
export interface DiscreteEventState {
  /** Current simulation time */
  currentTime: number;
  
  /** Event queue */
  eventQueue: ScheduledEvent[];
  
  /** Processed event count */
  processedEvents: number;
  
  /** Statistics */
  statistics: {
    totalEvents: number;
    eventsByType: Record<string, number>;
    averageQueueLength: number;
    maxQueueLength: number;
  };
}

export interface ScheduledEvent {
  id: string;
  time: number;
  priority: number;
  sourceNodeId: string;
  targetNodeId: string;
  eventType: string;
  payload: unknown;
}

/**
 * State for continuous time simulations
 */
export interface ContinuousTimeState {
  /** Current simulation time */
  currentTime: number;
  
  /** Current step size */
  currentStepSize: number;
  
  /** State vector (all continuous variables) */
  stateVector: number[];
  
  /** State variable names/mapping */
  stateMap: Record<string, number>;
  
  /** Derivative vector */
  derivativeVector: number[];
  
  /** Error estimates (for adaptive methods) */
  errorEstimates?: number[];
  
  /** Statistics */
  statistics: {
    totalSteps: number;
    rejectedSteps: number;
    functionEvaluations: number;
    jacobianEvaluations?: number;
  };
}

/**
 * State for agent-based simulations
 */
export interface AgentBasedState {
  /** Active agents */
  agents: Map<string, AgentState>;
  
  /** Agent creation/destruction log */
  populationLog: PopulationEvent[];
  
  /** Message queue */
  messageQueue: AgentMessage[];
  
  /** Spatial grid (if spatial) */
  spatialGrid?: SpatialGrid;
  
  /** Statistics */
  statistics: {
    totalAgents: number;
    activeAgents: number;
    messagesSent: number;
    messagesDelivered: number;
    averageAgentAge: number;
  };
}

export interface AgentState {
  id: string;
  type: string;
  state: Record<string, unknown>;
  position?: number[];
  createdAt: number;
  lastUpdated: number;
}

export interface PopulationEvent {
  time: number;
  type: 'birth' | 'death' | 'migration';
  agentId: string;
  parentId?: string;
  reason?: string;
}

export interface AgentMessage {
  id: string;
  senderId: string;
  receiverId: string | 'broadcast';
  messageType: string;
  payload: unknown;
  sendTime: number;
  deliveryTime: number;
  priority: number;
}

export interface SpatialGrid {
  dimensions: number;
  resolution: number[];
  cells: Map<string, string[]>;  // cell key -> agent IDs
}

/**
 * State for game-theoretic simulations
 */
export interface GameTheoreticState {
  /** Current strategy profile */
  strategyProfile: Record<string, unknown>;
  
  /** Current payoffs */
  payoffs: Record<string, number>;
  
  /** Belief states (for Bayesian games) */
  beliefs?: Record<string, Record<string, number>>;
  
  /** Iteration history */
  history: GameIterationRecord[];
  
  /** Convergence information */
  convergence: {
    converged: boolean;
    iteration?: number;
    residual?: number;
  };
  
  /** Statistics */
  statistics: {
    totalIterations: number;
    bestResponseComputations: number;
    strategyChanges: number;
  };
}

export interface GameIterationRecord {
  iteration: number;
  strategies: Record<string, unknown>;
  payoffs: Record<string, number>;
  bestResponses: Record<string, unknown>;
  residual: number;
}

/**
 * Combined extended simulation state
 */
export interface ExtendedSimulationState {
  /** Simulation ID */
  simulationId: string;
  
  /** Graph ID being simulated */
  graphId: string;
  
  /** Current status */
  status: SimulationStatus;
  
  /** Active paradigm */
  paradigm: ExecutionParadigm;
  
  /** Current iteration (for Monte Carlo) */
  iteration: number;
  
  /** Total iterations */
  totalIterations: number;
  
  /** Node states */
  nodeStates: Map<string, NodeExecutionState>;
  
  /** Edge states */
  edgeStates: Map<string, EdgeExecutionState>;
  
  /** Paradigm-specific state */
  discreteEvent?: DiscreteEventState;
  continuousTime?: ContinuousTimeState;
  agentBased?: AgentBasedState;
  gameTheoretic?: GameTheoreticState;
  
  /** Feedback loop states */
  feedbackStates: Map<string, FeedbackLoopState>;
  
  /** Execution metrics */
  metrics: ExecutionMetrics;
  
  /** Checkpoints */
  checkpoints: SimulationCheckpoint[];
  
  /** Error log */
  errors: SimulationError[];
  
  /** Timestamps */
  startedAt?: Date;
  completedAt?: Date;
  lastUpdated: Date;
}

export interface NodeExecutionState {
  nodeId: string;
  nodeType: AdvancedNodeType | string;
  
  /** Last computed outputs */
  outputs: Record<string, unknown>;
  
  /** Internal state (for stateful nodes) */
  internalState?: Record<string, unknown>;
  
  /** Execution count */
  executionCount: number;
  
  /** Last execution time (ms) */
  lastExecutionTime: number;
  
  /** Total execution time (ms) */
  totalExecutionTime: number;
  
  /** Error state */
  hasError: boolean;
  lastError?: string;
}

export interface EdgeExecutionState {
  edgeId: string;
  
  /** Last transmitted value */
  lastValue: unknown;
  
  /** Transmission count */
  transmissionCount: number;
  
  /** For delayed edges: history buffer */
  history?: unknown[];
  
  /** For feedback edges: convergence state */
  convergenceState?: {
    converged: boolean;
    residual: number;
    iterations: number;
  };
}

export interface FeedbackLoopState {
  loopId: string;
  currentValue: unknown;
  previousValue: unknown;
  iteration: number;
  converged: boolean;
  residualHistory: number[];
}

export interface ExecutionMetrics {
  /** Total execution time (ms) */
  totalTime: number;
  
  /** Time breakdown by phase */
  timeByPhase: Record<string, number>;
  
  /** Node execution statistics */
  nodeStats: {
    totalExecutions: number;
    averageExecutionTime: number;
    maxExecutionTime: number;
    executionsByType: Record<string, number>;
  };
  
  /** Memory usage */
  memory: {
    peakUsage: number;
    currentUsage: number;
    allocations: number;
  };
  
  /** Parallel execution stats */
  parallel?: {
    workersUsed: number;
    loadImbalance: number;
    synchronizationOverhead: number;
  };
}

export interface SimulationCheckpoint {
  id: string;
  iteration: number;
  time: number;
  timestamp: Date;
  stateSnapshot: string;  // Serialized state
  metrics: Partial<ExecutionMetrics>;
}

export interface SimulationError {
  timestamp: Date;
  iteration?: number;
  nodeId?: string;
  edgeId?: string;
  errorType: string;
  message: string;
  stack?: string;
  recoverable: boolean;
  recovered: boolean;
}

// ============================================
// Execution Events and Callbacks
// ============================================

export type ExecutionEventType = 
  | 'start'
  | 'iteration_start'
  | 'iteration_complete'
  | 'node_executed'
  | 'convergence'
  | 'checkpoint'
  | 'error'
  | 'complete'
  | 'cancelled';

export interface ExecutionEvent {
  type: ExecutionEventType;
  timestamp: Date;
  iteration?: number;
  nodeId?: string;
  data?: Record<string, unknown>;
}

export interface ExecutionCallbacks {
  onStart?: () => void;
  onIterationStart?: (iteration: number) => void;
  onIterationComplete?: (iteration: number, results: Record<string, unknown>) => void;
  onNodeExecuted?: (nodeId: string, outputs: Record<string, unknown>) => void;
  onConvergence?: (loopId: string, iteration: number) => void;
  onCheckpoint?: (checkpoint: SimulationCheckpoint) => void;
  onError?: (error: SimulationError) => void;
  onComplete?: (finalState: ExtendedSimulationState) => void;
  onCancelled?: () => void;
  onProgress?: (progress: number) => void;
}

// ============================================
// Paradigm Detection and Recommendation
// ============================================

/**
 * Analyze a graph and recommend execution paradigm
 */
export interface ParadigmRecommendation {
  /** Recommended primary paradigm */
  recommended: ExecutionParadigm;
  
  /** Secondary paradigms that may apply */
  applicable: ExecutionParadigm[];
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Reasons for recommendation */
  reasons: string[];
  
  /** Detected features */
  features: {
    hasFeedbackLoops: boolean;
    hasContinuousDynamics: boolean;
    hasDiscreteEvents: boolean;
    hasAgents: boolean;
    hasGameTheory: boolean;
    hasOptimization: boolean;
    hasSpatialElements: boolean;
    hasStochasticElements: boolean;
  };
  
  /** Warnings about the graph */
  warnings: string[];
}

/**
 * Utility function types for paradigm detection
 */
export type ParadigmDetector = (nodeTypes: string[], edgeTypes: string[]) => ParadigmRecommendation;
