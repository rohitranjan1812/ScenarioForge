// Core type definitions for ScenarioForge
// Domain-agnostic graph-based modeling platform

import type { JSONSchema7 } from 'json-schema';

// Re-export JSON Schema type for convenience
export type JSONSchema = JSONSchema7;

// ============================================
// Base Types
// ============================================

export type DataType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'object' 
  | 'array' 
  | 'null'
  | 'any'
  | 'distribution'
  | 'expression'
  | 'timeSeries';

export interface Position {
  x: number;
  y: number;
}

export interface Timestamp {
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Port System
// ============================================

export interface Port {
  id: string;
  name: string;
  dataType: DataType;
  schema?: JSONSchema;
  required: boolean;
  multiple: boolean;  // Allow multiple connections
  defaultValue?: unknown;
}

export interface PortDefinition {
  name: string;
  dataType: DataType;
  schema?: JSONSchema;
  required?: boolean;
  multiple?: boolean;
  defaultValue?: unknown;
}

// ============================================
// Node System
// ============================================

// Base node types
export type BaseNodeType = 
  | 'DATA_SOURCE'
  | 'TRANSFORMER'
  | 'DECISION'
  | 'DISTRIBUTION'
  | 'AGGREGATOR'
  | 'OUTPUT'
  | 'SUBGRAPH'
  | 'PARAMETER'
  | 'CONSTRAINT'
  | 'CONSTANT';

// Advanced node types for complex simulations
export type AdvancedNodeType =
  // Spatial/FEM
  | 'MESH'
  | 'ELEMENT'
  | 'BOUNDARY_CONDITION'
  | 'FIELD'
  | 'SPATIAL_FIELD'
  | 'BOUNDARY'
  | 'GRADIENT'
  | 'LAPLACIAN'
  
  // Temporal/Dynamic
  | 'INTEGRATOR'
  | 'DIFFERENTIATOR'
  | 'DELAY'
  | 'DELAY_LINE'
  | 'STATE_MACHINE'
  | 'EVENT_QUEUE'
  | 'SCHEDULER'
  
  // Game Theory
  | 'AGENT'
  | 'STRATEGY'
  | 'PAYOFF_MATRIX'
  | 'EQUILIBRIUM_FINDER'
  | 'NASH_EQUILIBRIUM'
  | 'AUCTION'
  | 'MECHANISM'
  | 'POPULATION'
  
  // Optimization
  | 'OBJECTIVE'
  | 'OPTIMIZER'
  | 'SOLVER'
  | 'FEASIBILITY'
  | 'SENSITIVITY'
  
  // Stochastic
  | 'MARKOV_CHAIN'
  | 'RANDOM_PROCESS'
  | 'MONTE_CARLO'
  | 'MONTE_CARLO_ESTIMATOR'
  | 'BAYESIAN'
  | 'SAMPLER'
  
  // Signal Processing
  | 'FILTER'
  | 'CONVOLUTION'
  | 'FFT'
  | 'IFFT'
  | 'WINDOW'
  | 'RESAMPLER'
  
  // Memory/State
  | 'BUFFER'
  | 'ACCUMULATOR'
  | 'LOOKUP_TABLE'
  | 'HISTORY'
  | 'CACHE'
  | 'QUEUE'
  | 'STACK'
  
  // Control Systems
  | 'PID_CONTROLLER'
  | 'MPC_CONTROLLER'
  | 'BANG_BANG'
  | 'STATE_OBSERVER'
  | 'KALMAN_FILTER'
  | 'LQR'
  
  // Algebraic
  | 'MATRIX_OP'
  | 'LINEAR_SYSTEM'
  | 'EIGENVALUE'
  | 'EIGEN'
  | 'TENSOR_OP'
  | 'NONLINEAR_SYSTEM'
  | 'ODE_SYSTEM'
  
  // Iterative
  | 'ITERATOR'
  | 'CONVERGENCE_CHECK'
  | 'FIXED_POINT'
  | 'RELAXATION';

// Combined node type
export type NodeType = BaseNodeType | AdvancedNodeType;

export interface NodeDefinition {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  position: Position;
  
  // Flexible data model
  schema: JSONSchema;
  data: Record<string, unknown>;
  
  // Computation
  computeFunction?: string;
  inputPorts: Port[];
  outputPorts: Port[];
  
  // Metadata
  tags: string[];
  color?: string;
  icon?: string;
  locked: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNodeInput {
  type: NodeType;
  name: string;
  description?: string;
  position: Position;
  schema?: JSONSchema;
  data?: Record<string, unknown>;
  computeFunction?: string;
  inputPorts?: PortDefinition[];
  outputPorts?: PortDefinition[];
  tags?: string[];
  color?: string;
  icon?: string;
}

export interface UpdateNodeInput {
  name?: string;
  description?: string;
  position?: Position;
  schema?: JSONSchema;
  data?: Record<string, unknown>;
  computeFunction?: string;
  inputPorts?: Port[];
  outputPorts?: Port[];
  tags?: string[];
  color?: string;
  icon?: string;
  locked?: boolean;
}

// ============================================
// Edge System
// ============================================

// Base edge types
export type BaseEdgeType = 
  | 'DATA_FLOW'
  | 'DEPENDENCY'
  | 'CONDITIONAL'
  | 'FEEDBACK'
  | 'TEMPORAL';

// Advanced edge types for complex interactions
export type AdvancedEdgeType =
  // Data flow variants
  | 'STREAMING'
  | 'BATCHED'
  
  // Temporal
  | 'DELAYED'
  | 'VARIABLE_DELAY'
  | 'TRANSPORT_DELAY'
  
  // Feedback
  | 'IMPLICIT_FEEDBACK'
  
  // Conditional/Routing
  | 'PROBABILISTIC'
  | 'PRIORITY'
  
  // Synchronization
  | 'SYNC_BARRIER'
  | 'MERGE'
  | 'SPLIT'
  
  // Spatial
  | 'NEIGHBOR'
  | 'COUPLING'
  
  // Agent
  | 'MESSAGE'
  | 'OBSERVATION'
  | 'INFLUENCE';

// Combined edge type
export type EdgeType = BaseEdgeType | AdvancedEdgeType;

export interface EdgeStyle {
  strokeWidth?: number;
  strokeColor?: string;
  strokeDasharray?: string;
  animated?: boolean;
}

export interface EdgeDefinition {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  
  // Edge data model
  type: EdgeType;
  schema: JSONSchema;
  data: Record<string, unknown>;
  
  // Relationship properties
  weight?: number;
  delay?: number;
  condition?: string;  // Expression for conditional activation
  transformFunction?: string;
  
  // Visual
  style: EdgeStyle;
  animated: boolean;
  label?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEdgeInput {
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  type?: EdgeType;
  schema?: JSONSchema;
  data?: Record<string, unknown>;
  weight?: number;
  delay?: number;
  condition?: string;
  transformFunction?: string;
  style?: EdgeStyle;
  animated?: boolean;
  label?: string;
}

export interface UpdateEdgeInput {
  type?: EdgeType;
  schema?: JSONSchema;
  data?: Record<string, unknown>;
  weight?: number;
  delay?: number;
  condition?: string;
  transformFunction?: string;
  style?: EdgeStyle;
  animated?: boolean;
  label?: string;
}

// ============================================
// Graph System
// ============================================

export interface Graph {
  id: string;
  name: string;
  description?: string;
  nodes: NodeDefinition[];
  edges: EdgeDefinition[];
  metadata: Record<string, unknown>;
  /** Global simulation parameters accessible via $params in expressions */
  params?: Record<string, unknown>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGraphInput {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateGraphInput {
  name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Distribution Types
// ============================================

export type DistributionType = 
  | 'normal'
  | 'uniform'
  | 'triangular'
  | 'lognormal'
  | 'exponential'
  | 'beta'
  | 'gamma'
  | 'poisson'
  | 'binomial'
  | 'discrete'
  | 'compound';  // Compound frequency-severity distribution

export interface DistributionConfig {
  type: DistributionType;
  parameters: Record<string, number>;
  // For discrete distributions
  values?: unknown[];
  probabilities?: number[];
}

// ============================================
// Expression Context
// ============================================

export interface ExpressionContext {
  $node: Record<string, unknown>;      // Current node data
  $inputs: Record<string, unknown>;    // Input port values
  $params: Record<string, unknown>;    // Global parameters
  $time: number;                       // Current simulation time
  $iteration: number;                  // Monte Carlo iteration
  $nodes: Record<string, NodeDefinition>; // All nodes by ID
}

// ============================================
// Simulation Types
// ============================================

export type SimulationMode = 'deterministic' | 'monte_carlo' | 'sensitivity';
export type SimulationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
export type SamplingMethod = 'random' | 'latin_hypercube' | 'sobol';

export interface TimeConfig {
  start: Date;
  end: Date;
  step: number;
  unit: TimeUnit;
}

export interface ConvergenceConfig {
  enabled: boolean;
  metric: 'mean' | 'std' | 'percentile';
  tolerance: number;
  checkInterval: number;
  percentile?: number;
}

export interface SimulationConfig {
  id: string;
  graphId: string;
  name: string;
  
  // Execution settings
  mode: SimulationMode;
  iterations: number;
  seed?: number;
  
  // Time settings
  timeConfig?: TimeConfig;
  
  // Execution control
  maxExecutionTime: number;
  parallelism: number;
  checkpointInterval?: number;
  
  // Monte Carlo specific
  samplingMethod?: SamplingMethod;
  convergence?: ConvergenceConfig;
  
  // Output configuration
  outputNodes: string[];
  captureIntermediates: boolean;
}

export interface SimulationResult {
  simulationId: string;
  iteration: number;
  timeStep?: Date;
  nodeId: string;
  outputKey: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface SimulationProgress {
  simulationId: string;
  status: SimulationStatus;
  progress: number;  // 0-100
  currentIteration: number;
  totalIterations: number;
  startedAt?: Date;
  estimatedCompletion?: Date;
  error?: string;
}

// ============================================
// Risk Metrics
// ============================================

export interface RiskMetrics {
  mean: number;
  median: number;
  standardDeviation: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  
  valueAtRisk: {
    var95: number;
    var99: number;
    var999: number;
  };
  
  conditionalVaR: {
    cvar95: number;
    cvar99: number;
  };
}

// ============================================
// Optimization Types
// ============================================

export type OptimizationType = 'minimize' | 'maximize';
export type VariableType = 'continuous' | 'integer' | 'categorical';
export type ConstraintType = 'equality' | 'inequality';
export type AggregationType = 'mean' | 'sum' | 'min' | 'max' | 'percentile';

export type OptimizationAlgorithm = 
  | 'nelder_mead'
  | 'bfgs'
  | 'genetic'
  | 'particle_swarm'
  | 'differential_evolution'
  | 'bayesian'
  | 'grid_search';

export interface OptimizationObjective {
  targetNodeId: string;
  targetField: string;
  type: OptimizationType;
  aggregation: AggregationType;
  aggregationParam?: number;
  weight?: number;
}

export interface OptimizationVariable {
  nodeId: string;
  field: string;
  type: VariableType;
  bounds: [number, number] | string[];
  initialValue?: unknown;
}

export interface OptimizationConstraint {
  expression: string;
  type: ConstraintType;
  tolerance?: number;
}

export interface OptimizationConfig {
  id: string;
  graphId: string;
  simulationConfig: Omit<SimulationConfig, 'id'>;
  
  objective: OptimizationObjective;
  objectives?: OptimizationObjective[];
  
  variables: OptimizationVariable[];
  constraints: OptimizationConstraint[];
  
  algorithm: OptimizationAlgorithm;
  maxIterations: number;
  tolerance: number;
  populationSize?: number;
}

export interface OptimizationResult {
  optimizationId: string;
  iteration: number;
  variables: Record<string, unknown>;
  objectiveValue: number;
  objectiveValues?: Record<string, number>;
  constraintViolations: number[];
  feasible: boolean;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================
// Re-export Extended Types
// ============================================

// Hierarchical graph types (subgraphs, feedback loops, meta-nodes)
export * from './hierarchical.types.js';

// Advanced node types (FEM, game theory, control systems, etc.)
export * from './advanced-nodes.types.js';

// Advanced edge types (streaming, delays, hyperedges, etc.)
export * from './advanced-edges.types.js';

// Execution engine types (multi-paradigm, parallel execution, etc.)
export * from './execution-engine.types.js';
