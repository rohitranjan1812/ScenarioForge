// ============================================
// Advanced Node Type Definitions
// ============================================
// Extended node types for complex simulations including:
// - Mesh/Spatial computation (FEM, CFD)
// - Temporal integration (ODEs, PDEs, state machines)
// - Game theory and multi-agent systems
// - Optimization and solvers
// - Stochastic processes and signal processing
// - Memory and state management
// - Control systems

import type { JSONSchema, NodeType } from './index.js';

// ============================================
// Advanced Node Type Registry
// ============================================

/**
 * Extended node types for complex simulations
 */
export type AdvancedNodeType =
  // Spatial / Mesh
  | 'MESH'
  | 'ELEMENT'
  | 'BOUNDARY_CONDITION'
  | 'FIELD'
  
  // Temporal / Integration
  | 'INTEGRATOR'
  | 'DELAY_LINE'
  | 'STATE_MACHINE'
  | 'EVENT_QUEUE'
  
  // Optimization / Solvers
  | 'OBJECTIVE'
  | 'SOLVER'
  | 'OPTIMIZER'
  
  // Game Theory / Multi-Agent
  | 'AGENT'
  | 'STRATEGY'
  | 'PAYOFF_MATRIX'
  | 'EQUILIBRIUM_FINDER'
  | 'POPULATION'
  
  // Stochastic
  | 'MARKOV_CHAIN'
  | 'RANDOM_PROCESS'
  | 'MONTE_CARLO_ESTIMATOR'
  
  // Signal Processing
  | 'FILTER'
  | 'CONVOLUTION'
  | 'FFT'
  
  // Memory / State
  | 'BUFFER'
  | 'ACCUMULATOR'
  | 'LOOKUP_TABLE'
  | 'HISTORY'
  
  // Control
  | 'PID_CONTROLLER'
  | 'MPC_CONTROLLER'
  | 'BANG_BANG'
  
  // Algebraic
  | 'MATRIX_OP'
  | 'LINEAR_SYSTEM'
  | 'EIGENVALUE'
  | 'NONLINEAR_SYSTEM';

/**
 * Combined node type including base and advanced types
 */
export type AllNodeTypes = NodeType | AdvancedNodeType;

// ============================================
// Mesh and Spatial Computation Nodes
// ============================================

export type MeshType = '1d' | '2d' | '3d';
export type MeshElementType = 
  | 'line' 
  | 'triangle' 
  | 'quad' 
  | 'tetrahedron' 
  | 'hexahedron'
  | 'prism'
  | 'pyramid';

/**
 * Mesh node - defines computational domain geometry
 */
export interface MeshNodeData {
  meshType: MeshType;
  dimensions: number[];
  resolution: number[];
  elementType: MeshElementType;
  
  /** Expression or reference for node coordinates */
  coordinates: string;
  /** Expression or reference for element connectivity */
  connectivity: string;
  
  /** Named regions for boundary conditions */
  regions: Record<string, string>;
  
  refinement?: {
    enabled: boolean;
    criterion: string;
    maxLevel: number;
  };
}

export type ElementFormulation = 
  | 'lagrange' 
  | 'hermite' 
  | 'serendipity' 
  | 'hierarchical'
  | 'spectral';

export type MaterialModel = 
  | 'linear_elastic' 
  | 'hyperelastic' 
  | 'viscoplastic'
  | 'thermal'
  | 'custom';

/**
 * Element node - finite element formulation
 */
export interface ElementNodeData {
  elementFamily: MeshElementType;
  order: number;
  formulation: ElementFormulation;
  
  /** Shape function definitions or references */
  shapeFunctions: string;
  /** Quadrature rule (e.g., 'gauss-3') */
  quadrature: string;
  
  materialModel: MaterialModel;
  /** Material parameters as expressions */
  materialParams: Record<string, string>;
  
  /** Local stiffness/mass matrix expressions */
  localMatrix?: string;
}

export type BoundaryType = 
  | 'dirichlet' 
  | 'neumann' 
  | 'robin' 
  | 'periodic' 
  | 'symmetric';

/**
 * Boundary condition node
 */
export interface BoundaryConditionNodeData {
  boundaryType: BoundaryType;
  /** Region identifier from mesh */
  region: string;
  /** Value expression (can depend on position, time) */
  value: string;
  /** Coefficient for Robin conditions */
  coefficient?: string;
  
  /** Time-varying boundary condition */
  temporal?: {
    enabled: boolean;
    expression: string;
  };
}

export type FieldType = 'scalar' | 'vector' | 'tensor' | 'mixed';
export type FieldStorage = 'nodal' | 'elemental' | 'quadrature';

/**
 * Field node - solution or coefficient field on mesh
 */
export interface FieldNodeData {
  fieldType: FieldType;
  components: number;
  storage: FieldStorage;
  
  /** Reference to mesh node */
  meshRef: string;
  
  /** Initial condition expression */
  initialCondition: string;
  
  interpolation: {
    order: number;
    type: 'continuous' | 'discontinuous';
  };
  
  /** Constraints on field values */
  constraints?: {
    min?: string;
    max?: string;
    custom?: string;
  };
}

// ============================================
// Temporal Integration Nodes
// ============================================

export type IntegrationMethod = 
  // Explicit methods
  | 'euler_forward'
  | 'rk2'
  | 'rk4'
  | 'rk45'
  | 'dormand_prince'
  
  // Implicit methods
  | 'euler_backward'
  | 'crank_nicolson'
  | 'bdf2'
  | 'radau'
  
  // Symplectic methods
  | 'verlet'
  | 'leapfrog'
  | 'yoshida';

export type StepSizeControl = 'fixed' | 'adaptive' | 'event_driven';

/**
 * Integrator node - ODE/PDE time integration
 */
export interface IntegratorNodeData {
  method: IntegrationMethod;
  stepSizeControl: StepSizeControl;
  
  /** Fixed step size or initial step */
  stepSize: number;
  
  /** State variable expression */
  stateExpression: string;
  /** Derivative expression (dy/dt) */
  derivativeExpression: string;
  
  /** Initial state value or expression */
  initialState: string;
  
  adaptive?: {
    minStep: number;
    maxStep: number;
    errorTolerance: number;
    errorNorm: 'l1' | 'l2' | 'linf';
  };
  
  /** Event detection for hybrid systems */
  events?: IntegratorEvent[];
}

export interface IntegratorEvent {
  id: string;
  /** Zero-crossing expression */
  condition: string;
  /** Action when event triggers */
  action: 'stop' | 'reset' | 'callback';
  direction: 'rising' | 'falling' | 'both';
  /** State reset expression if action='reset' */
  resetExpression?: string;
}

export type DelayType = 'fixed' | 'variable' | 'distributed';

/**
 * Delay line node - time delays in dynamic systems
 */
export interface DelayLineNodeData {
  delayType: DelayType;
  /** Delay value (number or expression) */
  delay: string;
  
  /** Initial history function */
  initialHistory: string;
  
  /** Maximum delay for variable delay */
  maxDelay?: number;
  
  interpolation: 'zoh' | 'linear' | 'cubic' | 'hermite';
  
  /** Buffer size for storing history */
  bufferSize: number;
}

export type StateMachineType = 'mealy' | 'moore' | 'hybrid';

/**
 * State machine node - discrete state dynamics
 */
export interface StateMachineNodeData {
  machineType: StateMachineType;
  
  /** State definitions */
  states: StateMachineState[];
  
  /** Transition definitions */
  transitions: StateMachineTransition[];
  
  /** Initial state ID */
  initialState: string;
  
  /** Whether multiple states can be active (parallel regions) */
  parallel: boolean;
  
  /** History mechanism */
  history?: {
    type: 'shallow' | 'deep';
    defaultState: string;
  };
}

export interface StateMachineState {
  id: string;
  name: string;
  
  /** Entry action expression */
  onEntry?: string;
  /** Exit action expression */
  onExit?: string;
  /** During action (continuous) */
  during?: string;
  
  /** Nested state machine (hierarchical) */
  substates?: StateMachineNodeData;
  
  /** Output expressions (Moore) */
  outputs?: Record<string, string>;
}

export interface StateMachineTransition {
  id: string;
  from: string;
  to: string;
  
  /** Guard condition expression */
  guard: string;
  
  /** Transition action expression */
  action?: string;
  
  /** Priority for deterministic selection */
  priority: number;
  
  /** Output expressions (Mealy) */
  outputs?: Record<string, string>;
}

export type EventQueueDiscipline = 'fifo' | 'lifo' | 'priority' | 'sorted';

/**
 * Event queue node - discrete event scheduling
 */
export interface EventQueueNodeData {
  discipline: EventQueueDiscipline;
  
  /** Maximum queue capacity */
  capacity: number;
  
  /** Overflow behavior */
  overflowPolicy: 'drop_oldest' | 'drop_newest' | 'block' | 'error';
  
  /** Priority expression for priority queues */
  priorityExpression?: string;
  
  /** Sorting key for sorted queues */
  sortKey?: string;
  
  /** Event type schema */
  eventSchema: JSONSchema;
  
  /** Processing time expression */
  processingTime?: string;
}

// ============================================
// Game Theory and Multi-Agent Nodes
// ============================================

export type AgentRationality = 
  | 'perfect'           // Full optimization
  | 'bounded'           // Bounded rationality
  | 'satisficing'       // Good-enough behavior
  | 'epsilon_greedy'    // Exploration-exploitation
  | 'learning';         // Adaptive learning

export type LearningAlgorithm = 
  | 'fictitious_play'
  | 'q_learning'
  | 'policy_gradient'
  | 'regret_matching'
  | 'best_response'
  | 'custom';

/**
 * Agent node - autonomous decision maker
 */
export interface AgentNodeData {
  /** Unique agent identifier */
  agentId: string;
  
  /** Agent type for categorization */
  agentType: string;
  
  rationality: AgentRationality;
  
  /** State schema for agent's internal state */
  stateSchema: JSONSchema;
  
  /** Action schema for possible actions */
  actionSchema: JSONSchema;
  
  /** Observation schema for perceived environment */
  observationSchema: JSONSchema;
  
  /** Decision function/expression */
  decisionFunction: string;
  
  /** Utility/reward function */
  utilityFunction: string;
  
  /** Belief update function (for Bayesian agents) */
  beliefUpdate?: string;
  
  learning?: {
    algorithm: LearningAlgorithm;
    learningRate: number;
    discountFactor: number;
    explorationRate?: number;
    customConfig?: Record<string, unknown>;
  };
  
  /** Constraints on actions */
  constraints?: string[];
  
  /** Communication capabilities */
  communication?: {
    canSend: boolean;
    canReceive: boolean;
    messageSchema?: JSONSchema;
  };
}

export type StrategyType = 
  | 'pure'
  | 'mixed'
  | 'behavioral'
  | 'correlated'
  | 'evolutionary';

/**
 * Strategy node - game-theoretic strategy representation
 */
export interface StrategyNodeData {
  strategyType: StrategyType;
  
  /** Action space definition */
  actionSpace: string[];
  
  /** For pure strategies: selected action */
  pureAction?: string;
  
  /** For mixed strategies: probability distribution */
  mixedProbabilities?: Record<string, number | string>;
  
  /** For behavioral strategies: information-set based */
  behavioralPolicy?: Record<string, Record<string, number | string>>;
  
  /** Parametric strategy expression */
  parametricStrategy?: string;
  
  /** Mutation/perturbation configuration */
  mutation?: {
    enabled: boolean;
    rate: number;
    distribution: string;
  };
}

export type GameType = 
  | 'normal_form'
  | 'extensive_form'
  | 'repeated'
  | 'stochastic'
  | 'differential'
  | 'mean_field';

/**
 * Payoff matrix node - defines game payoffs
 */
export interface PayoffMatrixNodeData {
  gameType: GameType;
  
  /** Number of players */
  numPlayers: number;
  
  /** Player identifiers */
  players: string[];
  
  /** Action spaces per player */
  actionSpaces: Record<string, string[]>;
  
  /** Payoff specification */
  payoffs: PayoffSpecification;
  
  /** For repeated games */
  repetitions?: {
    count: number | 'infinite';
    discountFactor?: number;
  };
  
  /** For stochastic games */
  stochastic?: {
    stateSpace: string[];
    transitionFunction: string;
    initialStateDistribution: Record<string, number>;
  };
}

export type PayoffSpecification = 
  | { type: 'matrix'; values: number[][] | number[][][] }
  | { type: 'expression'; function: string }
  | { type: 'lookup'; table: string };

export type EquilibriumConcept = 
  | 'nash'
  | 'correlated'
  | 'dominant'
  | 'pareto'
  | 'minimax'
  | 'subgame_perfect'
  | 'bayesian_nash'
  | 'evolutionarily_stable';

export type EquilibriumAlgorithm = 
  | 'support_enumeration'
  | 'lemke_howson'
  | 'fictitious_play'
  | 'replicator_dynamics'
  | 'gradient_descent'
  | 'linear_program';

/**
 * Equilibrium finder node - computes game equilibria
 */
export interface EquilibriumFinderNodeData {
  concept: EquilibriumConcept;
  algorithm: EquilibriumAlgorithm;
  
  /** Selection criterion when multiple equilibria exist */
  selection?: 'risk_dominant' | 'payoff_dominant' | 'random' | 'welfare';
  
  /** Convergence tolerance */
  tolerance: number;
  
  /** Maximum iterations */
  maxIterations: number;
  
  /** Reference to payoff source */
  payoffRef: string;
  
  /** Initial strategy profile for iterative methods */
  initialProfile?: Record<string, string>;
}

export type PopulationDynamics = 
  | 'replicator'
  | 'best_response'
  | 'logit'
  | 'imitation'
  | 'wright_fisher'
  | 'moran'
  | 'custom';

/**
 * Population node - population dynamics for evolutionary games
 */
export interface PopulationNodeData {
  dynamics: PopulationDynamics;
  
  /** Population size (can be expression) */
  size: number | string;
  
  /** Strategy/type distribution */
  distribution: Record<string, number | string>;
  
  /** Fitness function */
  fitnessFunction: string;
  
  /** Mutation/exploration rate */
  mutationRate?: number;
  
  /** Selection pressure parameter */
  selectionIntensity?: number;
  
  /** For agent-based: individual agents */
  agentBased?: {
    enabled: boolean;
    agentTemplate: string;
    heterogeneity: Record<string, string>;
  };
  
  /** Spatial structure */
  spatial?: {
    enabled: boolean;
    topology: 'lattice' | 'network' | 'continuous';
    interactionRadius?: number;
  };
}

// ============================================
// Optimization and Solver Nodes
// ============================================

export type ObjectiveSense = 'minimize' | 'maximize' | 'target';
export type ObjectiveAggregation = 'sum' | 'weighted_sum' | 'product' | 'max' | 'min' | 'custom';

/**
 * Objective node - optimization objective function
 */
export interface ObjectiveNodeData {
  sense: ObjectiveSense;
  
  /** Objective expression */
  expression: string;
  
  /** Target value for sense='target' */
  targetValue?: number;
  
  /** Weight for multi-objective */
  weight?: number;
  
  /** Aggregation for vector objectives */
  aggregation?: ObjectiveAggregation;
  
  /** Reference point for multi-objective */
  referencePoint?: number[];
  
  /** Gradient expression (optional, for gradient-based methods) */
  gradient?: string;
  
  /** Hessian expression (optional, for second-order methods) */
  hessian?: string;
}

export type SolverType = 
  // Direct methods
  | 'lu'
  | 'cholesky'
  | 'qr'
  
  // Iterative methods
  | 'cg'           // Conjugate gradient
  | 'gmres'        // Generalized minimal residual
  | 'bicgstab'     // BiCGSTAB
  | 'multigrid'
  
  // Nonlinear
  | 'newton'
  | 'quasi_newton'
  | 'fixed_point'
  
  // Sparse
  | 'sparse_lu'
  | 'sparse_cholesky';

export type PreconditionerType = 
  | 'none'
  | 'jacobi'
  | 'ilu'
  | 'sor'
  | 'amg'
  | 'custom';

/**
 * Solver node - linear/nonlinear equation solver
 */
export interface SolverNodeData {
  solverType: SolverType;
  
  /** System expression: Ax = b or F(x) = 0 */
  systemExpression: string;
  
  /** Initial guess expression */
  initialGuess: string;
  
  /** Convergence tolerance */
  tolerance: number;
  
  /** Maximum iterations */
  maxIterations: number;
  
  preconditioner?: PreconditionerType;
  
  /** For iterative methods */
  iterative?: {
    restartFrequency?: number;
    residualNorm: 'l1' | 'l2' | 'linf';
  };
  
  /** For nonlinear methods */
  nonlinear?: {
    lineSearch: boolean;
    lineSearchMethod?: 'backtracking' | 'wolfe' | 'exact';
    jacobianMethod: 'analytical' | 'numerical' | 'broyden';
  };
}

export type OptimizerType = 
  // Unconstrained
  | 'gradient_descent'
  | 'conjugate_gradient'
  | 'bfgs'
  | 'l_bfgs'
  | 'adam'
  
  // Constrained
  | 'slsqp'
  | 'interior_point'
  | 'augmented_lagrangian'
  | 'sqp'
  
  // Derivative-free
  | 'nelder_mead'
  | 'powell'
  | 'cobyla'
  
  // Global
  | 'differential_evolution'
  | 'genetic_algorithm'
  | 'particle_swarm'
  | 'simulated_annealing'
  | 'basin_hopping'
  
  // Bayesian
  | 'bayesian_optimization'
  | 'gaussian_process';

/**
 * Optimizer node - general optimization solver
 */
export interface OptimizerNodeData {
  optimizerType: OptimizerType;
  
  /** Reference to objective node(s) */
  objectiveRefs: string[];
  
  /** Variable definitions */
  variables: OptimizerVariable[];
  
  /** Constraint definitions */
  constraints: OptimizerConstraint[];
  
  /** Convergence tolerance */
  tolerance: number;
  
  /** Maximum iterations/function evaluations */
  maxIterations: number;
  maxFunctionEvals?: number;
  
  /** Population size for evolutionary methods */
  populationSize?: number;
  
  /** Learning rate for gradient methods */
  learningRate?: number;
  
  /** Random seed for reproducibility */
  seed?: number;
  
  /** Multi-objective configuration */
  multiObjective?: {
    method: 'weighted_sum' | 'epsilon_constraint' | 'nsga2' | 'moead';
    weights?: number[];
    epsilonLevels?: number[];
  };
  
  /** Parallel evaluation */
  parallel?: {
    enabled: boolean;
    workers: number;
  };
}

export interface OptimizerVariable {
  name: string;
  type: 'continuous' | 'integer' | 'binary' | 'categorical';
  bounds?: [number, number];
  categories?: string[];
  initialValue?: number | string;
  fixedValue?: number | string;
}

export interface OptimizerConstraint {
  name: string;
  type: 'equality' | 'inequality';
  expression: string;
  tolerance?: number;
  /** For inequality: g(x) <= 0 */
  sense?: 'leq' | 'geq';
}

// ============================================
// Stochastic Process Nodes
// ============================================

export type MarkovChainType = 'discrete' | 'continuous';

/**
 * Markov chain node - stochastic state transitions
 */
export interface MarkovChainNodeData {
  chainType: MarkovChainType;
  
  /** State space */
  states: string[];
  
  /** Transition matrix or rate matrix expression */
  transitionMatrix: string | number[][];
  
  /** Initial state distribution */
  initialDistribution: Record<string, number>;
  
  /** For continuous-time */
  continuous?: {
    /** Method for transition time sampling */
    samplingMethod: 'gillespie' | 'uniformization' | 'direct';
  };
  
  /** Absorbing states */
  absorbingStates?: string[];
  
  /** Reward structure */
  rewards?: {
    stateRewards: Record<string, number | string>;
    transitionRewards?: Record<string, Record<string, number | string>>;
  };
}

export type RandomProcessType = 
  | 'wiener'           // Brownian motion
  | 'geometric_brownian'
  | 'ornstein_uhlenbeck'
  | 'poisson'
  | 'compound_poisson'
  | 'jump_diffusion'
  | 'levy'
  | 'hawkes'
  | 'cox'              // Cox process
  | 'custom';

/**
 * Random process node - continuous stochastic processes
 */
export interface RandomProcessNodeData {
  processType: RandomProcessType;
  
  /** Drift coefficient expression */
  drift?: string;
  
  /** Diffusion/volatility coefficient expression */
  diffusion?: string;
  
  /** For jump processes */
  jump?: {
    intensity: string;
    sizeDistribution: string;
  };
  
  /** For Ornstein-Uhlenbeck */
  meanReversion?: {
    speed: string;
    level: string;
  };
  
  /** Initial value */
  initialValue: string;
  
  /** Discretization scheme */
  discretization: 'euler_maruyama' | 'milstein' | 'runge_kutta' | 'exact';
  
  /** Correlation with other processes */
  correlation?: Record<string, number>;
}

export type MonteCarloEstimator = 
  | 'sample_mean'
  | 'importance_sampling'
  | 'stratified'
  | 'control_variate'
  | 'antithetic'
  | 'mlmc';           // Multilevel Monte Carlo

/**
 * Monte Carlo estimator node - statistical estimation
 */
export interface MonteCarloEstimatorNodeData {
  estimator: MonteCarloEstimator;
  
  /** Quantity to estimate expression */
  targetExpression: string;
  
  /** Number of samples */
  numSamples: number;
  
  /** For importance sampling */
  importanceSampling?: {
    proposalDistribution: string;
    likelihoodRatio: string;
  };
  
  /** For control variates */
  controlVariate?: {
    variateExpression: string;
    expectedValue: number;
    optimalCoefficient?: 'analytical' | 'estimated';
  };
  
  /** For stratified sampling */
  stratification?: {
    strata: string[];
    allocation: 'proportional' | 'optimal';
  };
  
  /** For multilevel MC */
  multilevel?: {
    levels: number;
    levelCost: number[];
    targetVariance: number;
  };
  
  /** Confidence interval */
  confidence?: {
    level: number;
    method: 'normal' | 'bootstrap' | 't_distribution';
  };
}

// ============================================
// Signal Processing Nodes
// ============================================

export type FilterType = 
  | 'lowpass'
  | 'highpass'
  | 'bandpass'
  | 'bandstop'
  | 'allpass'
  | 'notch'
  | 'custom';

export type FilterDesign = 
  | 'butterworth'
  | 'chebyshev1'
  | 'chebyshev2'
  | 'elliptic'
  | 'bessel'
  | 'fir_window'
  | 'iir_custom';

/**
 * Filter node - digital signal filtering
 */
export interface FilterNodeData {
  filterType: FilterType;
  design: FilterDesign;
  
  /** Filter order */
  order: number;
  
  /** Cutoff frequencies (normalized or Hz) */
  cutoffFrequencies: number[];
  
  /** Sampling frequency */
  samplingFrequency: number;
  
  /** For Chebyshev/elliptic */
  ripple?: {
    passband?: number;
    stopband?: number;
  };
  
  /** Custom coefficients */
  coefficients?: {
    b: number[];  // Numerator (FIR/IIR)
    a: number[];  // Denominator (IIR)
  };
  
  /** Initial conditions */
  initialConditions?: number[];
}

export type ConvolutionMode = 'full' | 'same' | 'valid' | 'circular';

/**
 * Convolution node - signal convolution
 */
export interface ConvolutionNodeData {
  mode: ConvolutionMode;
  
  /** Kernel expression or reference */
  kernel: string;
  
  /** Kernel size for generated kernels */
  kernelSize?: number;
  
  /** Stride for strided convolution */
  stride?: number;
  
  /** Padding mode */
  padding?: 'zero' | 'reflect' | 'replicate' | 'circular';
  
  /** Multi-dimensional */
  dimensions?: number;
}

export type FFTType = 'fft' | 'ifft' | 'rfft' | 'irfft' | 'fft2d' | 'ifft2d';
export type FFTWindow = 'rectangular' | 'hamming' | 'hanning' | 'blackman' | 'kaiser';

/**
 * FFT node - Fourier transform operations
 */
export interface FFTNodeData {
  fftType: FFTType;
  
  /** Transform size (power of 2 for efficiency) */
  size: number;
  
  /** Window function */
  window?: FFTWindow;
  
  /** Kaiser window parameter */
  kaiserBeta?: number;
  
  /** Overlap for STFT */
  overlap?: number;
  
  /** Output format */
  outputFormat: 'complex' | 'magnitude' | 'phase' | 'power' | 'db';
  
  /** Normalize transform */
  normalize: boolean;
}

// ============================================
// Memory and State Nodes
// ============================================

export type BufferType = 'fifo' | 'lifo' | 'circular' | 'priority';

/**
 * Buffer node - data buffering/queueing
 */
export interface BufferNodeData {
  bufferType: BufferType;
  
  /** Maximum capacity */
  capacity: number;
  
  /** Overflow behavior */
  overflow: 'drop_oldest' | 'drop_newest' | 'block' | 'error';
  
  /** Underflow behavior */
  underflow: 'wait' | 'default' | 'error';
  
  /** Default value for underflow */
  defaultValue?: unknown;
  
  /** Initial contents */
  initialContents?: unknown[];
  
  /** For priority buffer */
  priorityExpression?: string;
}

export type AccumulatorOperation = 
  | 'sum'
  | 'product'
  | 'min'
  | 'max'
  | 'mean'
  | 'ewma'
  | 'count'
  | 'custom';

/**
 * Accumulator node - running aggregation
 */
export interface AccumulatorNodeData {
  operation: AccumulatorOperation;
  
  /** Initial value */
  initialValue: number;
  
  /** For EWMA: smoothing factor */
  alpha?: number;
  
  /** Custom accumulation expression */
  customExpression?: string;
  
  /** Reset condition */
  resetCondition?: string;
  
  /** Reset value */
  resetValue?: number;
  
  /** Output both accumulated and delta */
  outputDelta?: boolean;
}

export type LookupInterpolation = 
  | 'nearest'
  | 'linear'
  | 'cubic'
  | 'spline'
  | 'previous'
  | 'next';

export type LookupExtrapolation = 'constant' | 'linear' | 'periodic' | 'error';

/**
 * Lookup table node - interpolated data lookup
 */
export interface LookupTableNodeData {
  /** Number of input dimensions */
  dimensions: number;
  
  /** Breakpoints for each dimension */
  breakpoints: number[][];
  
  /** Table values (flat or nested array) */
  values: number[] | number[][] | number[][][];
  
  interpolation: LookupInterpolation;
  extrapolation: LookupExtrapolation;
  
  /** Constant for extrapolation */
  extrapolationValue?: number;
  
  /** Load from file reference */
  dataSource?: string;
}

export type HistoryStatistic = 
  | 'all'
  | 'last_n'
  | 'mean'
  | 'variance'
  | 'min'
  | 'max'
  | 'percentile'
  | 'autocorrelation';

/**
 * History node - time series storage and analysis
 */
export interface HistoryNodeData {
  /** Maximum history length */
  maxLength: number;
  
  /** Sampling mode */
  sampling: 'every' | 'interval' | 'change';
  
  /** Sampling interval for interval mode */
  samplingInterval?: number;
  
  /** Change threshold for change mode */
  changeThreshold?: number;
  
  /** Statistics to compute */
  statistics: HistoryStatistic[];
  
  /** Percentile values if needed */
  percentiles?: number[];
  
  /** Autocorrelation lags if needed */
  acfLags?: number[];
  
  /** Circular buffer vs growing */
  circular: boolean;
}

// ============================================
// Control System Nodes
// ============================================

export type PIDForm = 'standard' | 'parallel' | 'ideal';
export type AntiWindupMethod = 'none' | 'clamping' | 'back_calculation' | 'conditional';

/**
 * PID Controller node - proportional-integral-derivative control
 */
export interface PIDControllerNodeData {
  form: PIDForm;
  
  /** Proportional gain */
  kp: number | string;
  
  /** Integral gain or time */
  ki: number | string;
  
  /** Derivative gain or time */
  kd: number | string;
  
  /** Setpoint expression */
  setpoint: string;
  
  /** Filter coefficient for derivative */
  derivativeFilter?: number;
  
  /** Output limits */
  outputLimits?: {
    min: number;
    max: number;
  };
  
  /** Anti-windup */
  antiWindup: AntiWindupMethod;
  
  /** Back-calculation coefficient */
  backCalculationCoeff?: number;
  
  /** Sample time (for discrete implementation) */
  sampleTime?: number;
  
  /** Derivative kick prevention */
  derivativeOnMeasurement?: boolean;
  
  /** Setpoint weighting */
  setpointWeight?: {
    proportional: number;
    derivative: number;
  };
}

export type MPCHorizon = { prediction: number; control: number };

/**
 * MPC Controller node - Model Predictive Control
 */
export interface MPCControllerNodeData {
  /** Prediction and control horizons */
  horizon: MPCHorizon;
  
  /** Sample time */
  sampleTime: number;
  
  /** State-space model reference or inline */
  model: MPCModel;
  
  /** Cost function weights */
  weights: {
    output: number[];
    input: number[];
    inputRate: number[];
  };
  
  /** Constraints */
  constraints: {
    outputMin?: number[];
    outputMax?: number[];
    inputMin?: number[];
    inputMax?: number[];
    inputRateMin?: number[];
    inputRateMax?: number[];
  };
  
  /** Soft constraints */
  softConstraints?: {
    enabled: boolean;
    weights: number[];
  };
  
  /** QP solver settings */
  solver: {
    type: 'qp' | 'sqp' | 'admm';
    maxIterations: number;
    tolerance: number;
  };
  
  /** Terminal cost/constraint */
  terminal?: {
    cost?: string;
    constraint?: string;
  };
}

export type MPCModel = 
  | { type: 'state_space'; A: number[][]; B: number[][]; C: number[][]; D?: number[][] }
  | { type: 'transfer_function'; num: number[]; den: number[] }
  | { type: 'reference'; nodeRef: string };

export type BangBangHysteresis = 'none' | 'fixed' | 'adaptive';

/**
 * Bang-bang controller node - on/off control
 */
export interface BangBangNodeData {
  /** Setpoint expression */
  setpoint: string;
  
  /** Output values */
  outputHigh: number;
  outputLow: number;
  
  /** Hysteresis */
  hysteresis: BangBangHysteresis;
  hysteresisValue?: number;
  
  /** Minimum on/off time */
  minOnTime?: number;
  minOffTime?: number;
  
  /** Deadband */
  deadband?: number;
}

// ============================================
// Algebraic Computation Nodes
// ============================================

export type MatrixOperation = 
  | 'multiply'
  | 'add'
  | 'subtract'
  | 'transpose'
  | 'inverse'
  | 'determinant'
  | 'trace'
  | 'norm'
  | 'kronecker'
  | 'hadamard'
  | 'solve'
  | 'decompose';

export type MatrixDecomposition = 
  | 'lu'
  | 'qr'
  | 'cholesky'
  | 'svd'
  | 'eigen'
  | 'schur';

/**
 * Matrix operation node - linear algebra operations
 */
export interface MatrixOpNodeData {
  operation: MatrixOperation;
  
  /** Decomposition type if operation='decompose' */
  decomposition?: MatrixDecomposition;
  
  /** Norm type if operation='norm' */
  normType?: 'frobenius' | '1' | '2' | 'inf';
  
  /** Sparse matrix support */
  sparse: boolean;
  
  /** Matrix format */
  format?: 'dense' | 'csr' | 'csc' | 'coo';
  
  /** Output selection for decompositions */
  outputs?: string[];
}

/**
 * Linear system node - Ax = b solver
 */
export interface LinearSystemNodeData {
  /** Matrix A expression or reference */
  matrixA: string;
  
  /** Vector b expression or reference */
  vectorB: string;
  
  /** Solution method */
  method: 'direct' | 'iterative' | 'least_squares';
  
  /** For iterative methods */
  iterative?: {
    solver: 'cg' | 'gmres' | 'bicgstab' | 'jacobi' | 'gauss_seidel';
    tolerance: number;
    maxIterations: number;
    preconditioner?: PreconditionerType;
  };
  
  /** For least squares */
  leastSquares?: {
    method: 'svd' | 'qr' | 'normal_equations';
    regularization?: number;
  };
  
  /** Handle singular/ill-conditioned systems */
  singularHandling: 'error' | 'pseudoinverse' | 'regularize';
}

export type EigenvalueProblem = 'standard' | 'generalized';
export type EigenvalueSelection = 'all' | 'largest' | 'smallest' | 'target';

/**
 * Eigenvalue node - eigenvalue/eigenvector computation
 */
export interface EigenvalueNodeData {
  problemType: EigenvalueProblem;
  
  /** Matrix A expression or reference */
  matrixA: string;
  
  /** Matrix B for generalized problem */
  matrixB?: string;
  
  /** Which eigenvalues to compute */
  selection: EigenvalueSelection;
  
  /** Number of eigenvalues if not 'all' */
  count?: number;
  
  /** Target value for 'target' selection */
  target?: number | [number, number];  // Real or complex
  
  /** Algorithm */
  algorithm: 'qr' | 'arnoldi' | 'lanczos' | 'jacobi' | 'divide_conquer';
  
  /** Compute eigenvectors */
  computeVectors: boolean;
  
  /** Sort order */
  sortBy?: 'magnitude' | 'real' | 'imaginary';
}

export type NonlinearSolverMethod = 
  | 'newton'
  | 'broyden'
  | 'anderson'
  | 'fixed_point'
  | 'trust_region'
  | 'levenberg_marquardt';

/**
 * Nonlinear system node - F(x) = 0 solver
 */
export interface NonlinearSystemNodeData {
  /** System function expression(s) */
  equations: string[];
  
  /** Variables to solve for */
  variables: string[];
  
  /** Initial guess expression */
  initialGuess: string;
  
  method: NonlinearSolverMethod;
  
  /** Convergence settings */
  tolerance: number;
  maxIterations: number;
  
  /** Jacobian computation */
  jacobian?: {
    method: 'analytical' | 'forward_diff' | 'central_diff' | 'complex_step';
    expression?: string;
  };
  
  /** Line search */
  lineSearch?: {
    enabled: boolean;
    method: 'backtracking' | 'wolfe' | 'strong_wolfe';
  };
  
  /** Trust region settings */
  trustRegion?: {
    initialRadius: number;
    maxRadius: number;
  };
  
  /** Multiple solutions */
  findAllRoots?: {
    enabled: boolean;
    searchMethod: 'multistart' | 'deflation' | 'homotopy';
    maxRoots?: number;
  };
}

// ============================================
// Node Category Mapping
// ============================================

export type AdvancedNodeCategory = 
  | 'spatial'
  | 'temporal'
  | 'game_theory'
  | 'optimization'
  | 'stochastic'
  | 'signal_processing'
  | 'memory'
  | 'control'
  | 'algebraic';

export const ADVANCED_NODE_CATEGORIES: Record<AdvancedNodeType, AdvancedNodeCategory> = {
  // Spatial
  MESH: 'spatial',
  ELEMENT: 'spatial',
  BOUNDARY_CONDITION: 'spatial',
  FIELD: 'spatial',
  
  // Temporal
  INTEGRATOR: 'temporal',
  DELAY_LINE: 'temporal',
  STATE_MACHINE: 'temporal',
  EVENT_QUEUE: 'temporal',
  
  // Optimization
  OBJECTIVE: 'optimization',
  SOLVER: 'optimization',
  OPTIMIZER: 'optimization',
  
  // Game Theory
  AGENT: 'game_theory',
  STRATEGY: 'game_theory',
  PAYOFF_MATRIX: 'game_theory',
  EQUILIBRIUM_FINDER: 'game_theory',
  POPULATION: 'game_theory',
  
  // Stochastic
  MARKOV_CHAIN: 'stochastic',
  RANDOM_PROCESS: 'stochastic',
  MONTE_CARLO_ESTIMATOR: 'stochastic',
  
  // Signal Processing
  FILTER: 'signal_processing',
  CONVOLUTION: 'signal_processing',
  FFT: 'signal_processing',
  
  // Memory
  BUFFER: 'memory',
  ACCUMULATOR: 'memory',
  LOOKUP_TABLE: 'memory',
  HISTORY: 'memory',
  
  // Control
  PID_CONTROLLER: 'control',
  MPC_CONTROLLER: 'control',
  BANG_BANG: 'control',
  
  // Algebraic
  MATRIX_OP: 'algebraic',
  LINEAR_SYSTEM: 'algebraic',
  EIGENVALUE: 'algebraic',
  NONLINEAR_SYSTEM: 'algebraic',
};

/**
 * Get all node types in a category
 */
export function getNodesByCategory(category: AdvancedNodeCategory): AdvancedNodeType[] {
  return (Object.entries(ADVANCED_NODE_CATEGORIES) as [AdvancedNodeType, AdvancedNodeCategory][])
    .filter(([_, cat]) => cat === category)
    .map(([type]) => type);
}
