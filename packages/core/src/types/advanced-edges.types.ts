// ============================================
// Advanced Edge Type Definitions
// ============================================
// Extended edge types for complex interactions including:
// - Streaming and batched data flow
// - Temporal delays (fixed, variable, transport)
// - Feedback and implicit connections
// - Conditional and probabilistic routing
// - Synchronization barriers and merge/split
// - Spatial coupling (mesh/FEM)
// - Agent communication patterns
// - Hyperedges for multi-node interactions

import type { JSONSchema, EdgeStyle, TimeUnit } from './index.js';

// ============================================
// Advanced Edge Types
// ============================================

/**
 * Extended edge types for complex simulation scenarios
 */
export type AdvancedEdgeType =
  // Data flow variants
  | 'DATA_FLOW'           // Standard data flow
  | 'STREAMING'           // Continuous stream
  | 'BATCHED'             // Batched data flow
  
  // Temporal
  | 'DELAYED'             // Fixed delay
  | 'VARIABLE_DELAY'      // State-dependent delay
  | 'TRANSPORT_DELAY'     // Distance-based delay
  
  // Feedback
  | 'FEEDBACK'            // Explicit feedback loop
  | 'IMPLICIT_FEEDBACK'   // Algebraic loop (simultaneous equations)
  
  // Conditional
  | 'CONDITIONAL'         // Conditional activation
  | 'PROBABILISTIC'       // Stochastic routing
  | 'PRIORITY'            // Priority-based routing
  
  // Synchronization
  | 'SYNC_BARRIER'        // Wait for multiple inputs
  | 'MERGE'               // Merge multiple streams
  | 'SPLIT'               // Split to multiple outputs
  
  // Spatial
  | 'NEIGHBOR'            // Spatial adjacency (mesh/grid)
  | 'COUPLING'            // Physical coupling (FEM)
  
  // Agent interaction
  | 'MESSAGE'             // Agent message passing
  | 'OBSERVATION'         // Agent observation
  | 'INFLUENCE'           // Social influence
  
  // Custom
  | 'CUSTOM';

// ============================================
// Edge Configuration Interfaces
// ============================================

/**
 * Streaming edge configuration
 */
export interface StreamingEdgeConfig {
  /** Buffer size for stream */
  bufferSize: number;
  
  /** Backpressure handling */
  backpressure: 'drop' | 'block' | 'sample' | 'buffer';
  
  /** Sample rate for 'sample' mode */
  sampleRate?: number;
  
  /** Window type for windowed operations */
  windowing?: {
    type: 'tumbling' | 'sliding' | 'session';
    size: number;
    slide?: number;
    timeout?: number;
  };
  
  /** Stream ordering guarantee */
  ordering: 'ordered' | 'unordered' | 'timestamped';
}

/**
 * Batched edge configuration
 */
export interface BatchedEdgeConfig {
  /** Batch size */
  batchSize: number;
  
  /** Maximum wait time before flushing partial batch */
  timeout: number;
  
  /** Batching mode */
  mode: 'count' | 'time' | 'size' | 'dynamic';
  
  /** For dynamic mode: batch size expression */
  dynamicSizeExpression?: string;
  
  /** Padding for incomplete batches */
  padding?: 'none' | 'zero' | 'repeat' | 'default';
  paddingValue?: unknown;
}

export type DelayInterpolation = 'zoh' | 'linear' | 'cubic' | 'hermite' | 'spline';

/**
 * Delay edge configuration
 */
export interface DelayEdgeConfig {
  /** Delay type */
  type: 'fixed' | 'variable' | 'transport';
  
  /** Delay value (number for fixed, expression for variable/transport) */
  value: number | string;
  
  /** Time unit */
  unit: TimeUnit;
  
  /** For transport delay: velocity expression */
  transportVelocity?: string;
  
  /** For transport delay: distance expression */
  transportDistance?: string;
  
  /** Interpolation method */
  interpolation: DelayInterpolation;
  
  /** Initial value during delay period */
  initialValue?: unknown;
  
  /** Maximum delay (for variable delays) */
  maxDelay?: number;
  
  /** Buffer size for history storage */
  historySize?: number;
}

/**
 * Feedback edge configuration
 */
export interface FeedbackEdgeConfig {
  /** Initial value for first iteration */
  initialValue: unknown;
  
  /** Feedback transformation */
  transform?: {
    type: 'direct' | 'delta' | 'scaled' | 'filtered' | 'custom';
    scale?: number;
    filterCoeff?: number;
    customExpression?: string;
  };
  
  /** Convergence detection */
  convergence?: {
    enabled: boolean;
    tolerance: number;
    metric: 'absolute' | 'relative' | 'rms';
    maxIterations?: number;
  };
  
  /** Relaxation for stability */
  relaxation?: {
    enabled: boolean;
    factor: number;
    adaptive?: boolean;
  };
}

/**
 * Implicit feedback (algebraic loop) configuration
 */
export interface ImplicitFeedbackConfig {
  /** Solver for algebraic loop */
  solver: 'fixed_point' | 'newton' | 'broyden' | 'anderson';
  
  /** Convergence tolerance */
  tolerance: number;
  
  /** Maximum iterations */
  maxIterations: number;
  
  /** Initial guess expression */
  initialGuess?: string;
  
  /** Acceleration method */
  acceleration?: 'none' | 'aitken' | 'anderson';
  
  /** Anderson mixing parameter */
  andersonDepth?: number;
}

/**
 * Conditional routing configuration
 */
export interface ConditionalEdgeConfig {
  /** Condition expression (boolean result) */
  condition: string;
  
  /** Evaluation timing */
  evaluateAt: 'source' | 'target' | 'edge';
  
  /** Action when condition is false */
  falseAction: 'block' | 'default' | 'skip' | 'error';
  
  /** Default value when blocked */
  defaultValue?: unknown;
  
  /** Timeout for condition evaluation */
  timeout?: number;
}

/**
 * Probabilistic routing configuration
 */
export interface ProbabilisticEdgeConfig {
  /** Probability expression (0-1) */
  probability: string;
  
  /** For multi-target: probability distribution over targets */
  distribution?: Record<string, string>;
  
  /** Seed for reproducibility */
  seed?: number;
  
  /** Sampling method */
  method: 'bernoulli' | 'categorical' | 'weighted';
  
  /** Action when not selected */
  notSelectedAction: 'block' | 'default' | 'skip';
  
  /** Default value when not selected */
  defaultValue?: unknown;
}

/**
 * Priority-based routing configuration
 */
export interface PriorityEdgeConfig {
  /** Priority level (higher = more priority) */
  priority: number;
  
  /** Dynamic priority expression */
  priorityExpression?: string;
  
  /** Tie-breaking method */
  tieBreaker: 'first' | 'random' | 'round_robin';
  
  /** Preemption settings */
  preemption?: {
    enabled: boolean;
    threshold: number;
  };
}

export type SyncBarrierType = 'all' | 'any' | 'n_of_m' | 'quorum' | 'timeout';

/**
 * Synchronization barrier configuration
 */
export interface SyncBarrierConfig {
  /** Barrier type */
  barrierType: SyncBarrierType;
  
  /** Required inputs for 'n_of_m' */
  nRequired?: number;
  
  /** Total inputs for 'n_of_m' */
  mTotal?: number;
  
  /** Quorum percentage for 'quorum' */
  quorumPercent?: number;
  
  /** Timeout in milliseconds */
  timeout?: number;
  
  /** Action on timeout */
  timeoutAction: 'proceed' | 'error' | 'default';
  
  /** Default value for missing inputs */
  defaultValue?: unknown;
  
  /** Input aggregation */
  aggregation?: {
    method: 'array' | 'object' | 'merge' | 'reduce';
    reduceExpression?: string;
  };
}

export type EdgeMergeStrategy = 'array' | 'object' | 'first' | 'last' | 'reduce' | 'zip';

/**
 * Merge edge configuration
 */
export interface MergeEdgeConfig {
  /** Merge strategy */
  strategy: EdgeMergeStrategy;
  
  /** Key for object merge */
  keyField?: string;
  
  /** Reduce expression for reduce strategy */
  reduceExpression?: string;
  reduceInitial?: unknown;
  
  /** Ordering for array merge */
  ordering: 'arrival' | 'source_order' | 'timestamp' | 'priority';
  
  /** Handle missing sources */
  handleMissing: 'wait' | 'skip' | 'default';
  defaultValue?: unknown;
}

export type SplitStrategy = 'broadcast' | 'round_robin' | 'partition' | 'scatter';

/**
 * Split edge configuration
 */
export interface SplitEdgeConfig {
  /** Split strategy */
  strategy: SplitStrategy;
  
  /** Partition expression for partition strategy */
  partitionExpression?: string;
  
  /** Number of partitions */
  partitionCount?: number;
  
  /** Load balancing for round_robin */
  loadBalancing?: 'equal' | 'weighted';
  weights?: number[];
  
  /** Scatter indices expression */
  scatterIndices?: string;
}

export type SpatialLocality = 'adjacent' | 'radius' | 'stencil' | 'custom';
export type CouplingDirection = 'unidirectional' | 'bidirectional' | 'symmetric';

/**
 * Spatial coupling configuration (for mesh/FEM)
 */
export interface SpatialCouplingConfig {
  /** Coupling strength expression */
  couplingStrength: string;
  
  /** Coupling direction */
  direction: CouplingDirection;
  
  /** Locality type */
  locality: SpatialLocality;
  
  /** Radius for 'radius' locality */
  radius?: number;
  
  /** Stencil pattern for 'stencil' */
  stencil?: number[][];
  
  /** Custom neighbor expression */
  neighborExpression?: string;
  
  /** Material properties at interface */
  interfaceProperties?: Record<string, string>;
  
  /** Flux computation */
  flux?: {
    enabled: boolean;
    expression: string;
  };
}

export type MessageDelivery = 'immediate' | 'delayed' | 'queued' | 'reliable';
export type MessageOrdering = 'none' | 'fifo' | 'causal' | 'total';

/**
 * Message passing configuration (for agents)
 */
export interface MessageEdgeConfig {
  /** Message type identifier */
  messageType: string;
  
  /** Message schema */
  messageSchema?: JSONSchema;
  
  /** Priority level */
  priority: number;
  
  /** Time-to-live (iterations or time) */
  ttl?: number;
  
  /** Requires acknowledgement */
  acknowledgement: boolean;
  
  /** Delivery guarantee */
  delivery: MessageDelivery;
  
  /** Message ordering */
  ordering: MessageOrdering;
  
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    backoff: 'constant' | 'linear' | 'exponential';
    delay: number;
  };
  
  /** Filtering at receiver */
  filter?: string;
}

/**
 * Observation configuration (for agents)
 */
export interface ObservationEdgeConfig {
  /** What is being observed */
  observedFields: string[];
  
  /** Observation noise */
  noise?: {
    type: 'gaussian' | 'uniform' | 'custom';
    parameters: Record<string, number | string>;
  };
  
  /** Partial observability */
  visibility?: {
    probability: number;
    condition?: string;
  };
  
  /** Observation delay */
  delay?: number;
  
  /** Aggregation for multiple sources */
  aggregation?: 'latest' | 'average' | 'weighted' | 'custom';
  aggregationExpression?: string;
}

export type InfluenceModel = 'linear' | 'threshold' | 'complex_contagion' | 'voter' | 'custom';

/**
 * Social influence configuration (for agent populations)
 */
export interface InfluenceEdgeConfig {
  /** Influence model */
  model: InfluenceModel;
  
  /** Influence strength */
  strength: number | string;
  
  /** For threshold model */
  threshold?: number;
  
  /** For complex contagion */
  requiredExposures?: number;
  
  /** Influence decay over distance */
  distanceDecay?: {
    enabled: boolean;
    rate: number;
  };
  
  /** Susceptibility expression */
  susceptibility?: string;
  
  /** Attribute being influenced */
  targetAttribute: string;
}

// ============================================
// Extended Edge Definition
// ============================================

/**
 * Edge transform pipeline stage
 */
export interface EdgeTransformStage {
  id: string;
  name: string;
  
  /** Stage type */
  type: 'expression' | 'function' | 'type_cast' | 'validation' 
      | 'aggregation' | 'filtering' | 'sampling' | 'custom';
  
  /** Stage configuration */
  config: Record<string, unknown>;
  
  /** Condition for stage execution */
  condition?: string;
  
  /** Error handling for this stage */
  errorHandler?: string;
  
  /** Enabled flag */
  enabled: boolean;
}

/**
 * Edge transform pipeline
 */
export interface EdgeTransformPipeline {
  /** Transform stages in order */
  stages: EdgeTransformStage[];
  
  /** Error handling strategy */
  errorHandling: 'propagate' | 'default' | 'skip' | 'retry';
  
  /** Default value on error */
  defaultValue?: unknown;
  
  /** Retry configuration */
  retryConfig?: {
    maxAttempts: number;
    backoff: 'constant' | 'linear' | 'exponential';
    delay: number;
  };
}

/**
 * Complete advanced edge definition
 */
export interface AdvancedEdgeDefinition {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  
  /** Edge type */
  edgeType: AdvancedEdgeType;
  
  /** Schema for edge data */
  schema?: JSONSchema;
  
  /** Edge metadata */
  data: Record<string, unknown>;
  
  // Type-specific configurations
  streaming?: StreamingEdgeConfig;
  batched?: BatchedEdgeConfig;
  delay?: DelayEdgeConfig;
  feedback?: FeedbackEdgeConfig;
  implicitFeedback?: ImplicitFeedbackConfig;
  conditional?: ConditionalEdgeConfig;
  probabilistic?: ProbabilisticEdgeConfig;
  priority?: PriorityEdgeConfig;
  syncBarrier?: SyncBarrierConfig;
  merge?: MergeEdgeConfig;
  split?: SplitEdgeConfig;
  spatialCoupling?: SpatialCouplingConfig;
  message?: MessageEdgeConfig;
  observation?: ObservationEdgeConfig;
  influence?: InfluenceEdgeConfig;
  
  /** Transform pipeline */
  transforms?: EdgeTransformPipeline;
  
  /** Visual styling */
  style?: EdgeStyle;
  
  /** Animation flag */
  animated: boolean;
  
  /** Edge label */
  label?: string;
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Hyperedge Types
// ============================================

/**
 * Hyperedge types for multi-node interactions
 */
export type HyperedgeType =
  | 'CONSTRAINT'          // Algebraic constraint between nodes
  | 'CONSERVATION'        // Conservation law (sum = constant)
  | 'INTERACTION'         // General multi-body interaction
  | 'GAME_INTERACTION'    // Strategic interaction (game theory)
  | 'ELEMENT'             // FEM element connectivity
  | 'SYNCHRONIZATION'     // Multi-node sync point
  | 'BROADCAST'           // One-to-many with shared state
  | 'REDUCTION'           // Many-to-one aggregation
  | 'CUSTOM';

/**
 * Connection to a hyperedge
 */
export interface HyperedgeConnection {
  /** Connected node ID */
  nodeId: string;
  
  /** Connected port ID */
  portId: string;
  
  /** Role in the interaction (domain-specific) */
  role: string;
  
  /** Coefficient for linear combinations */
  coefficient?: number | string;
  
  /** Direction of data flow */
  direction?: 'in' | 'out' | 'inout';
  
  /** Weight for weighted interactions */
  weight?: number | string;
}

/**
 * Game interaction configuration for hyperedges
 */
export interface HyperedgeGameInteraction {
  /** Player node IDs */
  players: string[];
  
  /** Payoff function expression */
  payoffFunction: string;
  
  /** Timing of moves */
  simultaneity: 'simultaneous' | 'sequential';
  
  /** Order for sequential games */
  moveOrder?: string[];
  
  /** Information structure */
  informationStructure?: 'perfect' | 'imperfect' | 'incomplete';
}

/**
 * FEM element interaction configuration
 */
export interface HyperedgeElementInteraction {
  /** Element type (e.g., 'triangle', 'quad') */
  elementType: string;
  
  /** Local matrix expression */
  localMatrix: string;
  
  /** Assembly method */
  assembly: 'additive' | 'multiplicative';
  
  /** Quadrature points */
  quadrature?: {
    points: number[][];
    weights: number[];
  };
  
  /** Shape functions */
  shapeFunctions?: string[];
}

/**
 * Conservation law configuration
 */
export interface HyperedgeConservation {
  /** Conserved quantity expression */
  quantity: string;
  
  /** Conservation type */
  type: 'mass' | 'energy' | 'momentum' | 'charge' | 'custom';
  
  /** Conservation value (constant or expression) */
  value: number | string;
  
  /** Tolerance for conservation check */
  tolerance: number;
  
  /** Action on violation */
  violationAction: 'error' | 'correct' | 'warn' | 'log';
}

/**
 * Hyperedge definition
 */
export interface HyperedgeDefinition {
  id: string;
  name: string;
  type: HyperedgeType;
  
  /** Connected nodes and ports */
  connections: HyperedgeConnection[];
  
  /** Interaction definition */
  interaction: {
    type: 'expression' | 'function' | 'constraint' | 'matrix';
    
    /** Expression for interaction */
    expression?: string;
    
    /** Constraint expression (F(x1, x2, ...) = 0) */
    constraint?: string;
    
    /** Function reference */
    functionRef?: string;
    
    /** Matrix form: Mx = b */
    matrix?: {
      M: string;
      b: string;
    };
  };
  
  /** Game-theoretic interaction */
  gameInteraction?: HyperedgeGameInteraction;
  
  /** FEM element interaction */
  elementInteraction?: HyperedgeElementInteraction;
  
  /** Conservation law */
  conservation?: HyperedgeConservation;
  
  /** Evaluation order priority */
  priority?: number;
  
  /** Metadata */
  metadata: Record<string, unknown>;
  
  /** Visual style */
  style?: EdgeStyle & {
    /** How to render hyperedge visually */
    visualization: 'center_node' | 'boundary' | 'overlay' | 'hidden';
    /** Center position for 'center_node' visualization */
    centerPosition?: { x: number; y: number };
  };
  
  /** Enabled flag */
  enabled: boolean;
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Edge Category and Utility Types
// ============================================

export type AdvancedEdgeCategory = 
  | 'data_flow'
  | 'temporal'
  | 'feedback'
  | 'conditional'
  | 'synchronization'
  | 'spatial'
  | 'agent';

export const ADVANCED_EDGE_CATEGORIES: Record<AdvancedEdgeType, AdvancedEdgeCategory> = {
  // Data flow
  DATA_FLOW: 'data_flow',
  STREAMING: 'data_flow',
  BATCHED: 'data_flow',
  
  // Temporal
  DELAYED: 'temporal',
  VARIABLE_DELAY: 'temporal',
  TRANSPORT_DELAY: 'temporal',
  
  // Feedback
  FEEDBACK: 'feedback',
  IMPLICIT_FEEDBACK: 'feedback',
  
  // Conditional
  CONDITIONAL: 'conditional',
  PROBABILISTIC: 'conditional',
  PRIORITY: 'conditional',
  
  // Synchronization
  SYNC_BARRIER: 'synchronization',
  MERGE: 'synchronization',
  SPLIT: 'synchronization',
  
  // Spatial
  NEIGHBOR: 'spatial',
  COUPLING: 'spatial',
  
  // Agent
  MESSAGE: 'agent',
  OBSERVATION: 'agent',
  INFLUENCE: 'agent',
  
  // Custom
  CUSTOM: 'data_flow',
};

/**
 * Get all edge types in a category
 */
export function getEdgesByCategory(category: AdvancedEdgeCategory): AdvancedEdgeType[] {
  return (Object.entries(ADVANCED_EDGE_CATEGORIES) as [AdvancedEdgeType, AdvancedEdgeCategory][])
    .filter(([_, cat]) => cat === category)
    .map(([type]) => type);
}

/**
 * Check if an edge type requires specific configuration
 */
export function getRequiredConfig(edgeType: AdvancedEdgeType): string | null {
  const configMap: Partial<Record<AdvancedEdgeType, string>> = {
    STREAMING: 'streaming',
    BATCHED: 'batched',
    DELAYED: 'delay',
    VARIABLE_DELAY: 'delay',
    TRANSPORT_DELAY: 'delay',
    FEEDBACK: 'feedback',
    IMPLICIT_FEEDBACK: 'implicitFeedback',
    CONDITIONAL: 'conditional',
    PROBABILISTIC: 'probabilistic',
    PRIORITY: 'priority',
    SYNC_BARRIER: 'syncBarrier',
    MERGE: 'merge',
    SPLIT: 'split',
    NEIGHBOR: 'spatialCoupling',
    COUPLING: 'spatialCoupling',
    MESSAGE: 'message',
    OBSERVATION: 'observation',
    INFLUENCE: 'influence',
  };
  
  return configMap[edgeType] ?? null;
}
