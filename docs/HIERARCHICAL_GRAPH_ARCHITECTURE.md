# ScenarioForge: Hierarchical Graph Architecture

## Vision: Multi-Dimensional Compositional Modeling

ScenarioForge evolves from a flat graph-based modeling tool into a **multi-layered compositional system** where:
- Complex models are composed of nested sub-graphs at arbitrary depth
- Feedback loops enable adaptive, evolving simulations
- Any sub-graph can be "collapsed" into a single node at a higher abstraction level
- Users can drill down through layers to trace cause-effect relationships
- Simulation state flows both forward (data) and backward (feedback) through time

---

## 1. Hierarchical Graph Model

### 1.1 Core Concept: Graphs as First-Class Nodes

The key insight is that **a graph IS a node type**. Any `Graph` can be encapsulated as a `SUBGRAPH` node, exposing only its boundary ports while hiding internal complexity.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROOT GRAPH (Level 0)                         │
│  ┌───────┐      ┌────────────────────┐      ┌───────┐          │
│  │Input A│──────│   SubGraph Node    │──────│Output │          │
│  └───────┘      │  (Level 1 Graph)   │      └───────┘          │
│                 │  ┌─────┐  ┌─────┐  │                          │
│                 │  │Node1│──│Node2│  │  ← Internal structure    │
│                 │  └─────┘  └─────┘  │    hidden at Level 0     │
│                 └────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Extended Type Definitions

```typescript
// ============================================
// Hierarchical Graph Types
// ============================================

export type GraphScope = 'local' | 'shared' | 'library';
export type PortMapping = 'direct' | 'aggregated' | 'broadcast';

/**
 * Extended Graph with hierarchical capabilities
 */
export interface HierarchicalGraph extends Graph {
  // Hierarchy
  parentGraphId?: string;           // If this is a subgraph, reference to parent
  depth: number;                    // 0 = root, 1+ = nested depth
  
  // Boundary Interface
  exposedInputPorts: ExposedPort[]; // Ports visible when collapsed as node
  exposedOutputPorts: ExposedPort[];
  
  // Composition
  subgraphNodes: SubgraphNode[];    // Child graphs embedded as nodes
  
  // Feedback Configuration
  feedbackLoops: FeedbackLoop[];
  
  // Execution Context
  executionScope: ExecutionScope;
  
  // Versioning for sub-graph references
  subgraphVersions: Map<string, number>;
}

/**
 * Port exposed at graph boundary when used as subgraph node
 */
export interface ExposedPort {
  id: string;
  name: string;
  description?: string;
  dataType: DataType;
  schema?: JSONSchema;
  
  // Mapping to internal node
  internalNodeId: string;
  internalPortId: string;
  mappingType: PortMapping;
  
  // Aggregation config (when mappingType = 'aggregated')
  aggregation?: {
    method: 'sum' | 'mean' | 'min' | 'max' | 'concat' | 'merge';
    sourceNodes: Array<{ nodeId: string; portId: string }>;
  };
}

/**
 * A node that contains/references another graph
 */
export interface SubgraphNode extends NodeDefinition {
  type: 'SUBGRAPH';
  
  // Reference to contained graph
  subgraphId: string;
  subgraphVersion?: number;        // Lock to specific version
  scope: GraphScope;               // local, shared library, etc.
  
  // Instance configuration (overrides for this instance)
  instanceParams?: Record<string, unknown>;
  
  // Port mapping from subgraph boundary to this node's ports
  portMappings: PortMappingConfig[];
  
  // Execution behavior
  executionMode: SubgraphExecutionMode;
  
  // Visual state
  collapsed: boolean;              // Show as single node or expanded
  expandedBounds?: BoundingBox;    // Size when expanded inline
}

export type SubgraphExecutionMode = 
  | 'inline'       // Execute subgraph as if nodes were in parent
  | 'isolated'     // Execute in separate context, only boundary I/O
  | 'parallel'     // Execute subgraph iterations in parallel
  | 'lazy';        // Execute only when outputs are needed

export interface PortMappingConfig {
  externalPortId: string;          // Port on the SubgraphNode
  internalPortId: string;          // Exposed port inside subgraph
  transform?: string;              // Optional transformation expression
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### 1.3 Execution Scope & Context Inheritance

When a subgraph executes, it needs access to parent context while maintaining isolation:

```typescript
export interface ExecutionScope {
  // Inherited from parent
  inheritedParams: string[];       // Which $params flow down
  inheritedContext: string[];      // Which context variables flow down
  
  // Local overrides
  localParams: Record<string, unknown>;
  
  // Output bubbling
  bubbleOutputs: boolean;          // Whether outputs propagate to parent
  bubbleErrors: boolean;           // Whether errors propagate to parent
  
  // Simulation context
  shareIterationState: boolean;    // Share Monte Carlo iteration state
  shareTimeState: boolean;         // Share temporal state
}

/**
 * Extended expression context with hierarchical awareness
 */
export interface HierarchicalExpressionContext extends ExpressionContext {
  $parent: Record<string, unknown>;  // Parent graph's params/outputs
  $root: Record<string, unknown>;    // Root graph's params/outputs
  $depth: number;                    // Current hierarchy depth
  $path: string[];                   // Graph path: ['root', 'subgraph1', 'subgraph2']
  
  // Cross-graph references
  $graphs: Record<string, {
    params: Record<string, unknown>;
    outputs: Record<string, unknown>;
  }>;
}
```

---

## 2. Feedback Loop System

### 2.1 Feedback Loop Concepts

Feedback loops allow outputs from one simulation cycle to influence inputs in subsequent cycles. This enables:
- **Adaptive models** that evolve over time
- **Control systems** with PID-like behavior  
- **Learning systems** that adjust parameters based on results
- **Equilibrium seeking** systems that converge to stable states

```
                    ┌─────────────────────────────────────┐
                    │        Simulation Cycle N           │
                    │                                     │
 Cycle N-1 State ──▶│  Node A → Node B → Node C         │──▶ Cycle N Outputs
                    │     ▲                   │           │
                    │     │   Feedback Edge   │           │
                    │     └───────────────────┘           │
                    │        (stored, delayed)            │
                    └─────────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────┐
                    │        Simulation Cycle N+1         │
                    │                                     │
    Feedback ──────▶│  Node A → Node B → Node C         │
    from Cycle N    │                                     │
                    └─────────────────────────────────────┘
```

### 2.2 Feedback Loop Type Definitions

```typescript
// ============================================
// Feedback Loop Types
// ============================================

export type FeedbackTrigger = 
  | 'iteration'      // Every Monte Carlo iteration
  | 'time_step'      // Every simulation time step
  | 'convergence'    // When convergence criteria met
  | 'threshold'      // When value crosses threshold
  | 'schedule';      // On specific schedule

export type FeedbackTransform = 
  | 'direct'         // Pass value unchanged
  | 'delta'          // Pass change from previous
  | 'moving_avg'     // Moving average over window
  | 'exponential'    // Exponential smoothing
  | 'pid'            // PID controller output
  | 'custom';        // User-defined expression

/**
 * Defines a feedback loop in the graph
 */
export interface FeedbackLoop {
  id: string;
  name: string;
  description?: string;
  
  // Source (where feedback originates)
  sourceNodeId: string;
  sourcePortId: string;
  sourceField?: string;            // Specific field within port data
  
  // Target (where feedback is injected)
  targetNodeId: string;
  targetPortId: string;
  targetField?: string;
  
  // Timing
  delay: number;                   // Cycles of delay (minimum 1)
  trigger: FeedbackTrigger;
  
  // Transformation
  transform: FeedbackTransform;
  transformConfig?: FeedbackTransformConfig;
  customExpression?: string;       // For transform = 'custom'
  
  // State management
  initialValue: unknown;           // Value before first feedback
  stateHistory: number;            // How many cycles to retain
  
  // Convergence detection
  convergence?: {
    enabled: boolean;
    tolerance: number;
    metric: 'absolute' | 'relative' | 'oscillation';
    windowSize: number;
  };
  
  // Visual
  style?: EdgeStyle;
  enabled: boolean;
}

export interface FeedbackTransformConfig {
  // For moving_avg
  windowSize?: number;
  
  // For exponential
  alpha?: number;                  // Smoothing factor
  
  // For pid
  kp?: number;                     // Proportional gain
  ki?: number;                     // Integral gain  
  kd?: number;                     // Derivative gain
  setpoint?: number | string;      // Target value (can be expression)
  
  // For threshold trigger
  threshold?: number;
  direction?: 'rising' | 'falling' | 'both';
}

/**
 * Feedback state tracked during simulation
 */
export interface FeedbackState {
  loopId: string;
  history: FeedbackHistoryEntry[];
  currentValue: unknown;
  converged: boolean;
  convergenceIteration?: number;
  
  // PID state (if applicable)
  pidState?: {
    integral: number;
    previousError: number;
  };
}

export interface FeedbackHistoryEntry {
  iteration: number;
  timeStep?: Date;
  value: unknown;
  delta?: number;
  timestamp: Date;
}
```

### 2.3 Feedback-Aware Execution

```typescript
/**
 * Extended simulation state with feedback tracking
 */
export interface FeedbackAwareExecutionState extends ExecutionState {
  feedbackStates: Map<string, FeedbackState>;
  
  // Cross-iteration memory
  iterationMemory: Map<string, unknown[]>;  // nodeId:portId → history
  
  // Convergence tracking
  convergedLoops: Set<string>;
  globalConvergence: boolean;
}

/**
 * Feedback injection point in node execution
 */
export interface FeedbackInjection {
  loopId: string;
  targetNodeId: string;
  targetPortId: string;
  value: unknown;
  iteration: number;
  source: 'direct' | 'transformed';
}
```

---

## 3. Extended Edge Capabilities

### 3.1 Multi-Dimensional Edges

Edges become first-class computational elements that can:
- Transform data in transit
- Apply conditional routing
- Introduce delays (temporal or iteration-based)
- Carry state across cycles
- Route across graph boundaries

```typescript
// ============================================
// Extended Edge Types
// ============================================

export type EdgeRole = 
  | 'data_flow'      // Standard forward data flow
  | 'feedback'       // Backward flow (feedback loop)
  | 'control'        // Execution control signal
  | 'boundary'       // Crosses subgraph boundary
  | 'temporal';      // Time-delayed connection

export type EdgeCardinality = 
  | 'one_to_one'
  | 'one_to_many'    // Broadcast
  | 'many_to_one'    // Aggregate
  | 'many_to_many';  // Full mesh

export interface ExtendedEdgeDefinition extends EdgeDefinition {
  role: EdgeRole;
  cardinality: EdgeCardinality;
  
  // Data transformation
  transformPipeline?: EdgeTransform[];
  
  // Conditional routing
  routingRules?: RoutingRule[];
  
  // Temporal behavior
  temporal?: {
    delay: number;
    unit: TimeUnit;
    interpolation: 'hold' | 'linear' | 'cubic';
  };
  
  // Cross-boundary routing
  boundary?: {
    sourceGraphPath: string[];      // Path to source graph
    targetGraphPath: string[];      // Path to target graph
    portMappings: BoundaryPortMapping[];
  };
  
  // State tracking
  stateful: boolean;
  stateSchema?: JSONSchema;
  stateInitializer?: string;        // Expression for initial state
}

export interface EdgeTransform {
  id: string;
  order: number;
  type: 'expression' | 'function' | 'schema_map' | 'filter';
  config: unknown;
  enabled: boolean;
}

export interface RoutingRule {
  id: string;
  condition: string;                // Expression evaluating to boolean
  targetPortId?: string;            // For conditional port selection
  priority: number;
  action: 'route' | 'drop' | 'duplicate' | 'transform';
}

export interface BoundaryPortMapping {
  externalPortId: string;
  internalPath: string[];           // Path within subgraph
  internalPortId: string;
}
```

---

## 4. Extended Node Type System

### 4.1 Meta-Node Types

Beyond basic nodes, we introduce meta-nodes that operate on graphs themselves:

```typescript
// ============================================
// Meta-Node Types
// ============================================

export type MetaNodeType = 
  | 'SUBGRAPH'           // Encapsulated graph
  | 'ITERATOR'           // Loops over a subgraph
  | 'PARALLEL_MAP'       // Parallel execution over array
  | 'CONDITIONAL_GRAPH'  // Conditionally executes subgraph
  | 'TEMPLATE'           // Parameterized graph instantiation
  | 'REFERENCE'          // Reference to shared library graph
  | 'CHECKPOINT'         // State checkpoint for rollback
  | 'FEEDBACK_COLLECTOR' // Collects feedback for loops
  | 'CONVERGENCE_GATE';  // Blocks until convergence

/**
 * Iterator node - executes a subgraph multiple times
 */
export interface IteratorNode extends NodeDefinition {
  type: 'ITERATOR';
  subgraphId: string;
  
  iterationConfig: {
    mode: 'count' | 'foreach' | 'while' | 'until_convergence';
    count?: number | string;         // Number or expression
    collection?: string;             // Expression returning array
    condition?: string;              // While/until condition
    maxIterations: number;           // Safety limit
    
    // Iteration variable exposure
    indexVariable: string;           // e.g., '$i'
    valueVariable?: string;          // For foreach: '$item'
  };
  
  // Aggregation of iteration outputs
  aggregation: {
    method: 'collect' | 'sum' | 'mean' | 'last' | 'custom';
    customExpression?: string;
  };
}

/**
 * Parallel map - executes subgraph in parallel for each input
 */
export interface ParallelMapNode extends NodeDefinition {
  type: 'PARALLEL_MAP';
  subgraphId: string;
  
  parallelConfig: {
    inputArrayPort: string;          // Port receiving array input
    maxParallelism: number;
    batchSize?: number;
    timeout: number;
  };
  
  // How to merge parallel outputs
  mergeStrategy: 'array' | 'object' | 'reduce';
  reduceExpression?: string;
}

/**
 * Template node - instantiates parameterized graphs
 */
export interface TemplateNode extends NodeDefinition {
  type: 'TEMPLATE';
  templateGraphId: string;
  
  // Template parameters
  parameters: TemplateParameter[];
  
  // Instantiation
  instantiationMode: 'static' | 'dynamic';
  dynamicTrigger?: string;          // Expression that triggers re-instantiation
}

export interface TemplateParameter {
  name: string;
  type: DataType;
  defaultValue?: unknown;
  bindingExpression?: string;       // Expression to compute value
  propagateToSubgraph: boolean;
}

/**
 * Checkpoint node - captures state for rollback/replay
 */
export interface CheckpointNode extends NodeDefinition {
  type: 'CHECKPOINT';
  
  checkpointConfig: {
    captureMode: 'full' | 'delta' | 'selective';
    selectiveNodes?: string[];       // Only capture these nodes
    triggerCondition?: string;       // When to capture
    maxCheckpoints: number;          // Rolling window
    compression: boolean;
  };
}

/**
 * Convergence gate - blocks execution until condition met
 */
export interface ConvergenceGateNode extends NodeDefinition {
  type: 'CONVERGENCE_GATE';
  
  convergenceConfig: {
    metric: 'value' | 'derivative' | 'oscillation';
    tolerance: number;
    windowSize: number;
    maxWait: number;
    fallbackBehavior: 'error' | 'pass_through' | 'use_default';
    fallbackValue?: unknown;
  };
}
```

### 4.2 Dynamic Port System

Nodes can have dynamic ports that adjust based on configuration:

```typescript
export interface DynamicPortConfig {
  mode: 'static' | 'dynamic' | 'template';
  
  // For dynamic mode
  portGenerator?: {
    expression: string;              // Returns port definitions
    triggers: string[];              // What changes trigger regeneration
  };
  
  // For template mode
  template?: {
    inputTemplate: PortDefinition;
    outputTemplate: PortDefinition;
    multiplicity: string;            // Expression for number of ports
  };
}

export interface ExtendedNodeDefinition extends NodeDefinition {
  dynamicPorts?: DynamicPortConfig;
  
  // Execution hints
  executionHints?: {
    pure: boolean;                   // No side effects, cacheable
    idempotent: boolean;             // Same inputs always same outputs
    expensive: boolean;              // Long-running computation
    parallelizable: boolean;         // Can run instances in parallel
  };
  
  // Resource requirements
  resources?: {
    memory?: string;                 // e.g., "256MB"
    cpu?: number;                    // CPU cores/fraction
    gpu?: boolean;
    timeout?: number;
  };
}
```

---

## 5. UI Layer: Drill-Down Navigation

### 5.1 Navigation Model

The UI needs to support seamless navigation through graph hierarchy:

```typescript
// ============================================
// UI Navigation Types
// ============================================

export interface GraphNavigationState {
  // Current view
  currentPath: GraphPathSegment[];   // Breadcrumb path
  viewMode: 'collapsed' | 'expanded' | 'mixed';
  
  // Viewport
  viewport: {
    center: Position;
    zoom: number;
    bounds: BoundingBox;
  };
  
  // Selection
  selectedNodes: Set<string>;
  selectedEdges: Set<string>;
  hoveredNode?: string;
  
  // Expansion state
  expandedSubgraphs: Map<string, SubgraphViewState>;
  
  // History for back/forward navigation
  history: NavigationHistoryEntry[];
  historyIndex: number;
}

export interface GraphPathSegment {
  graphId: string;
  graphName: string;
  entryNodeId?: string;             // SubgraphNode that led here
  depth: number;
}

export interface SubgraphViewState {
  mode: 'inline' | 'popup' | 'panel';
  bounds: BoundingBox;
  opacity: number;
  locked: boolean;
}

export interface NavigationHistoryEntry {
  path: GraphPathSegment[];
  viewport: { center: Position; zoom: number };
  timestamp: Date;
}
```

### 5.2 Drill-Down Actions

```typescript
export interface DrillDownAction {
  type: 'drill_into' | 'drill_out' | 'expand_inline' | 'collapse' | 'open_panel';
  targetNodeId: string;
  
  // Animation preferences
  animate: boolean;
  duration: number;
  
  // View options
  preserveContext: boolean;         // Keep parent visible?
  highlightBoundary: boolean;       // Highlight connected edges?
}

export interface CauseEffectTrace {
  // For tracing simulation artifacts
  startNode: string;
  endNode: string;
  path: TracePathSegment[];
  
  // Metrics along path
  values: Map<string, unknown>;
  
  // Visual highlighting
  highlightMode: 'path' | 'tree' | 'heatmap';
}

export interface TracePathSegment {
  nodeId: string;
  portId: string;
  edgeId?: string;
  graphPath: string[];              // Which graph level
  value: unknown;
  iteration?: number;
  timestamp?: Date;
}
```

### 5.3 Simulation Artifact Visualization

```typescript
// ============================================
// Simulation Artifact Navigation
// ============================================

export interface SimulationArtifact {
  id: string;
  type: 'value' | 'distribution' | 'time_series' | 'convergence' | 'feedback_trace';
  
  // Location
  nodeId: string;
  portId?: string;
  graphPath: string[];
  
  // Data
  data: unknown;
  metadata: Record<string, unknown>;
  
  // Temporal info
  iteration?: number;
  timeStep?: Date;
  
  // Dependencies
  causes: string[];                 // Artifact IDs that contributed
  effects: string[];                // Artifacts this contributed to
}

export interface ArtifactExplorer {
  // Current selection
  selectedArtifact?: SimulationArtifact;
  
  // Exploration mode
  mode: 'forward' | 'backward' | 'bidirectional';
  
  // Filter
  filters: {
    nodeTypes?: NodeType[];
    valueRange?: [number, number];
    timeRange?: [Date, Date];
    iterationRange?: [number, number];
  };
  
  // Visualization
  visualization: 'graph_overlay' | 'timeline' | 'tree' | 'sankey';
}
```

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Core Types & Basic Subgraphs)
1. Extend type definitions for hierarchical graphs
2. Implement basic SubgraphNode type
3. Create port mapping system
4. Update execution engine for subgraph expansion

### Phase 2: Feedback Loops
1. Implement FeedbackLoop type and state management
2. Add feedback-aware execution engine
3. Implement convergence detection
4. Create feedback visualization

### Phase 3: Advanced Edges
1. Implement edge transformation pipeline
2. Add conditional routing
3. Implement temporal edges with delay
4. Create cross-boundary routing

### Phase 4: Meta-Nodes
1. Implement Iterator node
2. Implement ParallelMap node  
3. Implement Template node
4. Add convergence gates

### Phase 5: UI Navigation
1. Implement drill-down navigation
2. Create breadcrumb navigation
3. Add inline expansion view
4. Implement cause-effect tracing

### Phase 6: Advanced Features
1. Checkpoint/rollback system
2. Graph versioning and diffing
3. Library system for reusable subgraphs
4. Cross-graph references

---

## 7. Example: Multi-Level Supply Chain Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ROOT: Supply Chain                              │
│                                                                          │
│  ┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │   Demand    │     │   Production    │     │  Distribution   │       │
│  │  Forecast   │────▶│   Planning      │────▶│    Network      │       │
│  │  (Subgraph) │     │   (Subgraph)    │     │   (Subgraph)    │       │
│  └─────────────┘     └─────────────────┘     └─────────────────┘       │
│         │                    ▲                        │                 │
│         │                    │ Feedback Loop          │                 │
│         │                    │ (Inventory Signal)     │                 │
│         │                    └────────────────────────┘                 │
│         │                                                               │
│         │     ┌─────────────────┐                                       │
│         └────▶│   Risk Model    │                                       │
│               │   (Subgraph)    │                                       │
│               └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────┘

Drill into "Production Planning" subgraph:
┌─────────────────────────────────────────────────────────────────────────┐
│                    LEVEL 1: Production Planning                          │
│                                                                          │
│  [Input: Demand] ──▶ ┌─────────────┐                                    │
│                      │  Capacity   │                                    │
│                      │  Planner    │──┐                                 │
│                      └─────────────┘  │                                 │
│                                       ▼                                 │
│  [Input: Costs] ───▶ ┌─────────────┐  ┌─────────────┐                  │
│                      │    MRP      │──│  Schedule   │──▶ [Output]      │
│                      │  (Subgraph) │  │  Optimizer  │                  │
│                      └─────────────┘  └─────────────┘                  │
│                            │               ▲                            │
│                            └───────────────┘                            │
│                            Feedback: Utilization                        │
└─────────────────────────────────────────────────────────────────────────┘

Drill into "MRP" subgraph (Level 2):
┌─────────────────────────────────────────────────────────────────────────┐
│                         LEVEL 2: MRP                                     │
│                                                                          │
│  [Input: Demand] ──▶ ┌─────────────┐     ┌─────────────┐               │
│                      │   Gross     │────▶│    Net      │               │
│                      │  Require.   │     │  Require.   │               │
│                      └─────────────┘     └─────────────┘               │
│                                                │                        │
│  [Input: Inventory] ─────────────────────────┘ │                        │
│                                                 ▼                        │
│                      ┌─────────────┐     ┌─────────────┐               │
│                      │   Lead      │────▶│   Order     │──▶ [Output]   │
│                      │   Time      │     │  Release    │               │
│                      │  Offset     │     │  Schedule   │               │
│                      └─────────────┘     └─────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Summary

This architecture enables:

1. **Unlimited Composition**: Any model can be a component in a larger model
2. **Abstraction Layers**: Hide complexity behind clean interfaces
3. **Feedback Systems**: Models that evolve and adapt over simulation cycles
4. **Drill-Down Analysis**: Navigate from high-level to root cause
5. **Reusable Components**: Library of validated subgraph templates
6. **Parallel Execution**: Subgraphs can execute independently
7. **Cross-Cutting Concerns**: Edges can cross boundaries with proper mapping
8. **State Management**: Checkpoints, rollback, and history tracking
9. **Convergence Detection**: Know when feedback loops stabilize
10. **Cause-Effect Tracing**: Understand how outputs depend on inputs

The key principle: **Everything is composable**. Nodes compose into graphs, graphs compose into nodes, creating an infinitely scalable modeling system.

---

## 9. Advanced Node Types for Complex Simulations

To support sophisticated simulation paradigms (game theory, finite element methods, agent-based modeling, differential equations, optimization, etc.), we introduce a new category of **Computational Primitive Nodes**. These are domain-agnostic building blocks that can be combined to implement any simulation methodology.

### 9.1 Core Computational Primitives

```typescript
// ============================================
// Advanced Computational Node Types
// ============================================

export type AdvancedNodeType =
  // Spatial/Mesh Primitives
  | 'MESH'                    // Discretized domain (FEM, CFD, grid-based)
  | 'ELEMENT'                 // Single mesh element with local computation
  | 'BOUNDARY_CONDITION'      // Boundary constraint specification
  | 'FIELD'                   // Continuous field over domain
  
  // Temporal Primitives
  | 'INTEGRATOR'              // ODE/PDE time integration
  | 'DELAY_LINE'              // Temporal delay buffer
  | 'STATE_MACHINE'           // Discrete state transitions
  | 'EVENT_QUEUE'             // Discrete event scheduling
  
  // Optimization Primitives
  | 'OBJECTIVE'               // Optimization objective function
  | 'SOLVER'                  // Iterative solver (Newton, gradient, etc.)
  | 'OPTIMIZER'               // Global optimization node
  
  // Game Theory / Multi-Agent Primitives
  | 'AGENT'                   // Autonomous decision-making entity
  | 'STRATEGY'                // Strategy definition with payoff
  | 'PAYOFF_MATRIX'           // Multi-player payoff structure
  | 'EQUILIBRIUM_FINDER'      // Nash/other equilibrium computation
  | 'POPULATION'              // Agent population dynamics
  
  // Stochastic Primitives
  | 'MARKOV_CHAIN'            // State transition probabilities
  | 'RANDOM_PROCESS'          // Continuous stochastic process
  | 'MONTE_CARLO_ESTIMATOR'   // Statistical estimation
  
  // Signal Processing Primitives
  | 'FILTER'                  // Digital filter (FIR, IIR, Kalman)
  | 'CONVOLUTION'             // Convolution operation
  | 'FFT'                     // Frequency domain transform
  
  // Memory/State Primitives
  | 'BUFFER'                  // FIFO/LIFO data buffer
  | 'ACCUMULATOR'             // Running total/state
  | 'LOOKUP_TABLE'            // Interpolated data table
  | 'HISTORY'                 // Time series memory
  
  // Control Primitives
  | 'PID_CONTROLLER'          // Proportional-Integral-Derivative
  | 'MPC_CONTROLLER'          // Model Predictive Control
  | 'BANG_BANG'               // On-off controller
  
  // Algebraic Primitives
  | 'MATRIX_OP'               // Matrix operations
  | 'LINEAR_SYSTEM'           // Ax = b solver
  | 'EIGENVALUE'              // Eigenvalue/eigenvector computation
  | 'NONLINEAR_SYSTEM';       // Nonlinear equation solver
```

### 9.2 Mesh and Spatial Computation Nodes

For finite element methods, computational fluid dynamics, or any spatially discretized problem:

```typescript
// ============================================
// Mesh/Spatial Computation
// ============================================

export type MeshTopology = 
  | 'structured_1d' | 'structured_2d' | 'structured_3d'
  | 'unstructured_tri' | 'unstructured_quad' | 'unstructured_tet'
  | 'adaptive' | 'custom';

export type BoundaryType = 
  | 'dirichlet'    // Fixed value
  | 'neumann'      // Fixed gradient
  | 'robin'        // Linear combination
  | 'periodic'     // Wraps around
  | 'symmetric'    // Mirror
  | 'custom';      // User-defined

/**
 * MESH Node - Defines a discretized computational domain
 */
export interface MeshNodeData {
  topology: MeshTopology;
  dimensions: number[];              // Grid dimensions or element count
  coordinates?: string;              // Expression or data reference for node coords
  connectivity?: string;             // Element connectivity (unstructured)
  
  // Adaptive refinement
  adaptivity?: {
    enabled: boolean;
    criterion: string;               // Error estimator expression
    maxLevel: number;
    minElementSize: number;
  };
  
  // Domain decomposition for parallel
  partitioning?: {
    method: 'geometric' | 'graph' | 'spectral';
    numPartitions: number;
  };
  
  // Field variables defined on mesh
  fields: MeshField[];
}

export interface MeshField {
  name: string;
  location: 'node' | 'element' | 'face' | 'edge';
  dataType: DataType;
  initialValue: string;              // Expression for initial condition
  boundaryConditions: BoundaryCondition[];
}

export interface BoundaryCondition {
  id: string;
  name: string;
  region: string;                    // Expression identifying boundary nodes/elements
  type: BoundaryType;
  value: string;                     // Expression for BC value
  parameters?: Record<string, unknown>;
}

/**
 * ELEMENT Node - Local element computation (stiffness matrix, residual, etc.)
 */
export interface ElementNodeData {
  meshReference: string;             // Reference to MESH node
  elementType: string;               // Element formulation name
  
  // Local computation
  localComputation: {
    stiffnessExpression?: string;    // Local stiffness matrix
    residualExpression?: string;     // Residual vector
    massExpression?: string;         // Mass matrix (for dynamics)
    jacobianExpression?: string;     // Jacobian for nonlinear
  };
  
  // Material/constitutive model (user-defined)
  constitutiveModel?: string;        // Expression or function name
  
  // Integration
  integration: {
    quadratureOrder: number;
    quadratureType: 'gauss' | 'lobatto' | 'custom';
  };
}

/**
 * FIELD Node - Continuous field representation
 */
export interface FieldNodeData {
  domain: 'spatial' | 'temporal' | 'phase_space' | 'custom';
  dimensions: number;
  
  // Field definition
  definition: {
    type: 'analytical' | 'interpolated' | 'computed';
    expression?: string;             // For analytical
    dataSource?: string;             // For interpolated
    interpolation?: 'linear' | 'cubic' | 'rbf' | 'kriging';
  };
  
  // Gradient/derivative computation
  derivatives?: {
    order: number;
    method: 'finite_diff' | 'spectral' | 'automatic';
  };
  
  // Sampling
  sampling?: {
    method: 'uniform' | 'adaptive' | 'monte_carlo';
    resolution: number[];
  };
}
```

### 9.3 Temporal Integration Nodes

For ODEs, PDEs, and dynamic systems:

```typescript
// ============================================
// Temporal Integration
// ============================================

export type IntegrationMethod =
  // Explicit methods
  | 'euler_forward' | 'rk2' | 'rk4' | 'rk45' | 'dormand_prince'
  // Implicit methods
  | 'euler_backward' | 'crank_nicolson' | 'bdf2' | 'radau'
  // Specialized
  | 'symplectic' | 'exponential' | 'stochastic_euler'
  | 'custom';

/**
 * INTEGRATOR Node - Time-stepping for dynamic systems
 */
export interface IntegratorNodeData {
  method: IntegrationMethod;
  
  // State definition
  stateVariables: StateVariable[];
  
  // Time stepping
  timeConfig: {
    mode: 'fixed' | 'adaptive';
    initialDt: number;
    minDt?: number;
    maxDt?: number;
    errorTolerance?: number;
    finalTime: number;
  };
  
  // For adaptive methods
  adaptivity?: {
    controller: 'pi' | 'pid' | 'custom';
    errorNorm: 'l2' | 'linf' | 'weighted';
    safetyFactor: number;
  };
  
  // Implicit solver config
  implicitSolver?: {
    type: 'newton' | 'fixed_point' | 'broyden';
    maxIterations: number;
    tolerance: number;
  };
  
  // Events (for hybrid systems)
  eventDetection?: {
    events: EventDefinition[];
    localization: 'bisection' | 'newton' | 'interpolation';
  };
}

export interface StateVariable {
  name: string;
  dimension: number | number[];      // Scalar, vector, or tensor
  initialValue: string;              // Expression
  derivative: string;                // dx/dt expression
  algebraicConstraint?: string;      // For DAE systems
}

export interface EventDefinition {
  name: string;
  condition: string;                 // Zero-crossing expression
  direction: 'rising' | 'falling' | 'both';
  action: string;                    // Expression to execute
  terminating: boolean;              // Stop integration?
}

/**
 * STATE_MACHINE Node - Discrete state transitions
 */
export interface StateMachineNodeData {
  states: StateDef[];
  transitions: TransitionDef[];
  initialState: string;
  
  // Hierarchical state machines
  hierarchical?: boolean;
  parentState?: string;
  
  // Parallel regions
  regions?: StateMachineRegion[];
}

export interface StateDef {
  id: string;
  name: string;
  entryAction?: string;              // Expression on entry
  exitAction?: string;               // Expression on exit
  duringAction?: string;             // Expression each tick
  outputExpression?: string;         // Output while in state
}

export interface TransitionDef {
  id: string;
  from: string;
  to: string;
  trigger: string;                   // Condition expression
  guard?: string;                    // Additional guard condition
  action?: string;                   // Transition action
  priority: number;
}

/**
 * EVENT_QUEUE Node - Discrete event simulation
 */
export interface EventQueueNodeData {
  schedulingPolicy: 'fifo' | 'priority' | 'lifo' | 'custom';
  timeAdvancement: 'next_event' | 'fixed_increment' | 'hybrid';
  
  eventTypes: EventTypeDef[];
  
  // Event generation
  generators?: EventGenerator[];
  
  // Statistics collection
  statistics?: {
    collectQueueLength: boolean;
    collectWaitTimes: boolean;
    collectThroughput: boolean;
  };
}

export interface EventTypeDef {
  name: string;
  priorityExpression?: string;
  handler: string;                   // Expression to execute
  outputMapping?: Record<string, string>;
}

export interface EventGenerator {
  eventType: string;
  interarrivalTime: string;          // Distribution expression
  batchSize?: number | string;
}
```

### 9.4 Game Theory and Multi-Agent Nodes

For strategic interactions, evolutionary dynamics, and multi-agent systems:

```typescript
// ============================================
// Game Theory / Multi-Agent
// ============================================

export type GameType = 
  | 'strategic_form'       // Normal form game
  | 'extensive_form'       // Game tree
  | 'repeated'             // Repeated game
  | 'evolutionary'         // Population dynamics
  | 'differential'         // Continuous time game
  | 'stochastic'           // Markov game
  | 'mean_field';          // Large population limit

export type EquilibriumConcept =
  | 'nash'
  | 'subgame_perfect'
  | 'bayesian_nash'
  | 'correlated'
  | 'evolutionary_stable'
  | 'quantal_response'
  | 'pareto'
  | 'custom';

/**
 * AGENT Node - Autonomous decision-making entity
 */
export interface AgentNodeData {
  // Agent definition
  identity: {
    typeId: string;                  // Agent type/class
    instanceId: string;              // Unique instance
    attributes: Record<string, unknown>;
  };
  
  // State
  stateSchema: JSONSchema;
  initialState: Record<string, unknown>;
  
  // Decision making
  decisionModel: {
    type: 'rational' | 'bounded_rational' | 'learning' | 'rule_based' | 'custom';
    utilityFunction?: string;        // For rational agents
    boundedRationality?: {
      noiseLevel: number;            // Quantal response parameter
      sampleSize: number;            // Limited lookahead
    };
    learningConfig?: LearningConfig;
    rules?: DecisionRule[];
  };
  
  // Perception
  perception: {
    observableVariables: string[];
    informationDelay?: number;
    noiseModel?: string;             // Observation noise
  };
  
  // Actions
  actionSpace: ActionSpace;
  
  // Communication
  communication?: {
    messageTypes: string[];
    networkTopology?: string;        // Reference to graph structure
  };
}

export interface LearningConfig {
  algorithm: 'q_learning' | 'sarsa' | 'policy_gradient' | 'fictitious_play' | 'regret_matching' | 'custom';
  learningRate: number | string;
  discountFactor: number;
  explorationRate?: number | string;
  memorySize?: number;
}

export interface ActionSpace {
  type: 'discrete' | 'continuous' | 'mixed' | 'combinatorial';
  definition: string;                // Expression defining action space
  constraints?: string[];            // Action constraints
}

/**
 * PAYOFF_MATRIX Node - Multi-player payoff structure
 */
export interface PayoffMatrixNodeData {
  players: string[];                 // Player identifiers
  
  // Payoff definition
  payoffType: 'matrix' | 'function' | 'expression';
  
  // For matrix form
  matrix?: {
    actionSets: Record<string, string[]>;
    payoffs: unknown;                // n-dimensional payoff tensor
  };
  
  // For functional form
  payoffFunction?: string;           // Expression (inputs: actions, state)
  
  // Special structures
  structure?: {
    zeroSum: boolean;
    symmetric: boolean;
    potential?: string;              // Potential function for potential games
  };
}

/**
 * EQUILIBRIUM_FINDER Node - Computes game-theoretic equilibria
 */
export interface EquilibriumFinderNodeData {
  concept: EquilibriumConcept;
  
  // Solver configuration
  solver: {
    method: 'support_enumeration' | 'lemke_howson' | 'fictitious_play' 
          | 'replicator_dynamics' | 'gradient_descent' | 'mip' | 'custom';
    maxIterations: number;
    tolerance: number;
    multipleEquilibria: boolean;     // Find all or just one
  };
  
  // Refinements
  refinements?: string[];            // Equilibrium refinements to apply
  
  // Selection
  selection?: {
    criterion: 'payoff_dominant' | 'risk_dominant' | 'trembling_hand' | 'custom';
    customExpression?: string;
  };
}

/**
 * POPULATION Node - Agent population dynamics
 */
export interface PopulationNodeData {
  // Population structure
  structure: {
    type: 'well_mixed' | 'spatial' | 'network' | 'group_structured';
    size: number | string;
    topology?: string;               // For spatial/network
  };
  
  // Agent types
  agentTypes: PopulationAgentType[];
  
  // Dynamics
  dynamics: {
    type: 'replicator' | 'best_response' | 'imitation' | 'birth_death' | 'custom';
    updateRule: 'synchronous' | 'asynchronous';
    mutationRate?: number;
    selectionIntensity?: number;
    customDynamics?: string;
  };
  
  // Matching
  matching?: {
    protocol: 'random' | 'assortative' | 'local' | 'custom';
    customMatching?: string;
  };
  
  // Aggregation
  outputType: 'frequencies' | 'payoffs' | 'full_distribution';
}

export interface PopulationAgentType {
  typeId: string;
  strategy: string;                  // Reference to STRATEGY node or expression
  initialFrequency: number | string;
  fitness?: string;                  // Fitness expression
}
```

### 9.5 Optimization and Solver Nodes

For optimization problems, root finding, and iterative solvers:

```typescript
// ============================================
// Optimization / Solvers
// ============================================

export type OptimizationMethod =
  // Gradient-based
  | 'gradient_descent' | 'adam' | 'lbfgs' | 'newton' | 'trust_region'
  // Derivative-free
  | 'nelder_mead' | 'powell' | 'cma_es' | 'differential_evolution'
  // Global
  | 'simulated_annealing' | 'genetic_algorithm' | 'particle_swarm' | 'bayesian'
  // Constrained
  | 'slsqp' | 'augmented_lagrangian' | 'interior_point' | 'sqp'
  // Discrete
  | 'branch_and_bound' | 'dynamic_programming' | 'greedy'
  // Multi-objective
  | 'nsga2' | 'moead' | 'weighted_sum'
  | 'custom';

export type SolverType =
  | 'newton_raphson' | 'broyden' | 'anderson' | 'fixed_point'
  | 'gmres' | 'cg' | 'bicgstab' | 'lu' | 'cholesky' | 'qr'
  | 'custom';

/**
 * OBJECTIVE Node - Defines optimization objective
 */
export interface ObjectiveNodeData {
  objectiveType: 'minimize' | 'maximize' | 'target';
  expression: string;                // Objective expression
  targetValue?: number;              // For target type
  
  // Multi-objective
  weight?: number;                   // For weighted sum
  priority?: number;                 // For lexicographic
  
  // Gradient info
  gradient?: {
    method: 'analytical' | 'finite_diff' | 'automatic' | 'complex_step';
    analyticalExpression?: string[];
  };
}

/**
 * SOLVER Node - Iterative solver for systems of equations
 */
export interface SolverNodeData {
  solverType: SolverType;
  
  // Problem definition
  systemType: 'linear' | 'nonlinear' | 'differential' | 'integral';
  equations: string[];               // System of equations (implicit form = 0)
  unknowns: string[];                // Variables to solve for
  
  // Initial guess
  initialGuess: string | Record<string, string>;
  
  // Convergence
  convergence: {
    maxIterations: number;
    absoluteTolerance: number;
    relativeTolerance: number;
    divergenceThreshold?: number;
  };
  
  // Preconditioning
  preconditioner?: {
    type: 'none' | 'jacobi' | 'ilu' | 'amg' | 'custom';
    customPreconditioner?: string;
  };
  
  // Line search (for nonlinear)
  lineSearch?: {
    method: 'backtracking' | 'wolfe' | 'strong_wolfe' | 'exact';
    initialStep: number;
  };
  
  // Output
  outputHistory: boolean;
}

/**
 * OPTIMIZER Node - Global optimization node
 */
export interface OptimizerNodeData {
  method: OptimizationMethod;
  
  // Decision variables
  variables: OptimizationVariable[];
  
  // Objectives (can reference OBJECTIVE nodes or inline)
  objectives: ObjectiveReference[];
  
  // Constraints
  constraints: OptimizationConstraint[];
  
  // Termination
  termination: {
    maxIterations: number;
    maxEvaluations: number;
    timeLimitSeconds?: number;
    objectiveTolerance?: number;
    variableTolerance?: number;
  };
  
  // Multi-start
  multiStart?: {
    enabled: boolean;
    numStarts: number;
    strategy: 'random' | 'latin_hypercube' | 'sobol' | 'custom';
  };
  
  // Output
  outputHistory: boolean;
  outputPareto?: boolean;            // For multi-objective
}

export interface OptimizationVariable {
  name: string;
  type: 'continuous' | 'integer' | 'binary' | 'categorical';
  bounds?: [number | null, number | null];
  categories?: unknown[];
  initialValue?: unknown;
}

export interface OptimizationConstraint {
  name: string;
  type: 'equality' | 'inequality' | 'bound';
  expression: string;                // g(x) <= 0 or h(x) = 0
  tolerance?: number;
}

/**
 * LINEAR_SYSTEM Node - Ax = b solver
 */
export interface LinearSystemNodeData {
  // System definition
  matrixSource: 'direct' | 'assembled' | 'expression';
  matrix?: string;
  assemblyExpression?: string;
  
  // Solver
  solver: {
    type: 'direct' | 'iterative';
    directMethod?: 'lu' | 'cholesky' | 'qr' | 'svd';
    iterativeMethod?: 'cg' | 'gmres' | 'bicgstab' | 'minres';
    preconditioner?: string;
    tolerance?: number;
    maxIterations?: number;
  };
  
  // Matrix properties (hints for solver)
  matrixProperties?: {
    symmetric?: boolean;
    positiveDef?: boolean;
    sparse?: boolean;
    banded?: number;
  };
}

/**
 * MATRIX_OP Node - Matrix operations
 */
export interface MatrixOpNodeData {
  operation: 
    | 'multiply' | 'add' | 'subtract' | 'transpose' | 'inverse'
    | 'determinant' | 'trace' | 'norm' | 'rank'
    | 'decompose_lu' | 'decompose_qr' | 'decompose_svd' | 'decompose_cholesky'
    | 'exp' | 'log' | 'sqrt'
    | 'kronecker' | 'hadamard'
    | 'reshape' | 'slice' | 'concat'
    | 'custom';
  
  customExpression?: string;
  decompositionOutput?: 'full' | 'compact' | 'factors_only';
}

/**
 * EIGENVALUE Node - Eigenvalue computation
 */
export interface EigenvalueNodeData {
  computationType: 'all' | 'largest' | 'smallest' | 'target';
  numEigenvalues?: number;
  targetValue?: number;
  
  method: 'qr' | 'lanczos' | 'arnoldi' | 'jacobi_davidson' | 'power' | 'inverse_power';
  
  computeEigenvectors: boolean;
  sortOrder: 'magnitude' | 'real_part' | 'algebraic';
  
  tolerance: number;
  maxIterations: number;
}
```

### 9.6 Stochastic Process and Signal Processing Nodes

For stochastic simulation, filtering, and control:

```typescript
// ============================================
// Stochastic Processes
// ============================================

export type StochasticProcessType =
  | 'wiener'               // Brownian motion
  | 'geometric_brownian'   // GBM (lognormal)
  | 'ornstein_uhlenbeck'   // Mean-reverting
  | 'poisson'              // Jump process
  | 'compound_poisson'     // Jumps with random size
  | 'levy'                 // General Levy process
  | 'fractional_brownian'  // Long memory
  | 'cox_ingersoll_ross'   // CIR process
  | 'heston'               // Stochastic volatility
  | 'custom';

/**
 * MARKOV_CHAIN Node - Discrete state Markov process
 */
export interface MarkovChainNodeData {
  type: 'discrete_time' | 'continuous_time';
  
  states: string[];
  stateLabels?: Record<string, string>;
  
  transitions: {
    type: 'matrix' | 'generator' | 'function';
    matrix?: string;                 // P or Q matrix
    transitionFunction?: string;     // For time-varying
  };
  
  initialDistribution: string[];
  
  rewards?: {
    stateRewards?: Record<string, string>;
    transitionRewards?: Record<string, Record<string, string>>;
    discountFactor?: number;
  };
  
  analysis?: {
    computeSteadyState: boolean;
    computeHittingTimes: boolean;
    computeAbsorptionProbs: boolean;
    transientDistribution?: number[];
  };
}

/**
 * RANDOM_PROCESS Node - Continuous stochastic process
 */
export interface RandomProcessNodeData {
  processType: StochasticProcessType;
  parameters: Record<string, string>;
  
  discretization: {
    method: 'euler_maruyama' | 'milstein' | 'runge_kutta' | 'exact';
    timeStep: number;
    numPaths: number;
  };
  
  correlation?: {
    processIds: string[];
    correlationMatrix: string;
  };
  
  jumps?: {
    intensity: string;
    sizeDistribution: string;
  };
  
  outputType: 'paths' | 'statistics' | 'distribution';
  outputTimes?: number[];
}

/**
 * MONTE_CARLO_ESTIMATOR Node - Statistical estimation
 */
export interface MonteCarloEstimatorNodeData {
  estimand: string;
  
  sampling: {
    method: 'crude' | 'importance' | 'stratified' | 'antithetic' 
          | 'control_variate' | 'quasi_random' | 'mlmc';
    numSamples: number;
    
    importanceDistribution?: string;
    importanceWeight?: string;
    strata?: StrataDefinition[];
    controlVariates?: ControlVariate[];
    mlmcLevels?: number;
  };
  
  convergence?: {
    targetError: number;
    confidenceLevel: number;
    adaptive: boolean;
    maxSamples: number;
  };
  
  computeConfidenceInterval: boolean;
  computeHistogram: boolean;
  histogramBins?: number;
}

// ============================================
// Signal Processing / Filters
// ============================================

export type FilterType =
  | 'lowpass' | 'highpass' | 'bandpass' | 'bandstop' | 'allpass'
  | 'fir' | 'iir' | 'butterworth' | 'chebyshev' | 'elliptic' | 'bessel'
  | 'kalman' | 'extended_kalman' | 'unscented_kalman' | 'particle'
  | 'moving_average' | 'exponential_smoothing'
  | 'savgol' | 'median' | 'custom';

/**
 * FILTER Node - Digital filtering
 */
export interface FilterNodeData {
  filterType: FilterType;
  
  design?: {
    cutoffFrequency?: number | number[];
    order?: number;
    ripple?: number;
    attenuation?: number;
    samplingFrequency?: number;
  };
  
  coefficients?: {
    numerator?: number[];
    denominator?: number[];
  };
  
  kalmanConfig?: {
    stateTransition: string;
    observation: string;
    processNoise: string;
    measurementNoise: string;
    initialState: string;
    initialCovariance: string;
  };
  
  particleConfig?: {
    numParticles: number;
    resamplingMethod: 'multinomial' | 'stratified' | 'systematic' | 'residual';
    resamplingThreshold?: number;
  };
}

/**
 * PID_CONTROLLER Node - PID control
 */
export interface PIDControllerNodeData {
  kp: number | string;
  ki: number | string;
  kd: number | string;
  
  setpoint: string;
  
  antiWindup?: {
    method: 'none' | 'clamping' | 'back_calculation' | 'conditional';
    outputLimits?: [number, number];
    backCalcGain?: number;
  };
  
  derivativeFilter?: {
    enabled: boolean;
    timeConstant: number;
  };
  
  sampleTime: number;
  
  autoTune?: {
    method: 'ziegler_nichols' | 'cohen_coon' | 'relay' | 'custom';
    tuningMode: 'aggressive' | 'moderate' | 'conservative';
  };
}

/**
 * MPC_CONTROLLER Node - Model Predictive Control
 */
export interface MPCControllerNodeData {
  model: {
    type: 'linear' | 'nonlinear' | 'neural';
    stateSpace?: { A: string; B: string; C: string; D: string };
    nonlinearModel?: string;
  };
  
  predictionHorizon: number;
  controlHorizon: number;
  
  weights: {
    output: number[];
    input: number[];
    inputRate: number[];
  };
  
  constraints: {
    outputMin?: number[];
    outputMax?: number[];
    inputMin?: number[];
    inputMax?: number[];
    inputRateMin?: number[];
    inputRateMax?: number[];
  };
  
  solver: {
    type: 'qp' | 'nlp';
    maxIterations: number;
    tolerance: number;
  };
}
```

### 9.7 Memory and State Nodes

For maintaining state across computation cycles:

```typescript
// ============================================
// Memory / State Management
// ============================================

/**
 * BUFFER Node - Data buffer with queue semantics
 */
export interface BufferNodeData {
  bufferType: 'fifo' | 'lifo' | 'priority' | 'circular' | 'sorted';
  capacity: number;
  overflowPolicy: 'drop_oldest' | 'drop_newest' | 'block' | 'error';
  
  priorityExpression?: string;
  
  batchOutput?: {
    size: number;
    mode: 'fixed' | 'timeout' | 'condition';
    timeout?: number;
    condition?: string;
  };
  
  persistent?: boolean;
}

/**
 * ACCUMULATOR Node - Running aggregation
 */
export interface AccumulatorNodeData {
  operation: 'sum' | 'product' | 'min' | 'max' | 'mean' | 'variance' | 'custom';
  customExpression?: string;
  
  initialValue: string;
  resetCondition?: string;
  
  window?: {
    type: 'count' | 'time';
    size: number;
    slide?: number;
  };
  
  outputType: 'current' | 'delta' | 'both';
}

/**
 * LOOKUP_TABLE Node - Interpolated data lookup
 */
export interface LookupTableNodeData {
  dimensions: number;
  
  data: {
    source: 'inline' | 'reference' | 'computed';
    breakpoints: number[][] | string[];
    values: unknown | string;
  };
  
  interpolation: {
    method: 'nearest' | 'linear' | 'cubic' | 'spline' | 'akima';
    extrapolation: 'constant' | 'linear' | 'error' | 'clamp';
  };
  
  parameterized?: {
    parameters: string[];
    updateTrigger: string;
  };
}

/**
 * HISTORY Node - Time series memory
 */
export interface HistoryNodeData {
  trackedVariables: TrackedVariable[];
  
  storageMode: 'full' | 'sampled' | 'compressed';
  maxLength: number;
  
  samplingInterval?: number;
  samplingCondition?: string;
  
  compression?: {
    method: 'decimation' | 'averaging' | 'significant_change';
    ratio?: number;
    threshold?: number;
  };
  
  accessPattern: 'sequential' | 'random' | 'indexed';
  
  computeOnline?: {
    mean: boolean;
    variance: boolean;
    min: boolean;
    max: boolean;
    autocorrelation?: number[];
  };
}

export interface TrackedVariable {
  name: string;
  expression: string;
  metadata?: Record<string, unknown>;
}
```

---

## 10. Extended Edge Types for Complex Interactions

### 10.1 Advanced Edge Semantics

```typescript
// ============================================
// Advanced Edge Types
// ============================================

export type AdvancedEdgeType =
  // Data flow variants
  | 'DATA_FLOW'           // Standard
  | 'STREAMING'           // Continuous stream
  | 'BATCHED'             // Batched data flow
  
  // Temporal
  | 'DELAYED'             // Fixed delay
  | 'VARIABLE_DELAY'      // State-dependent delay
  | 'TRANSPORT_DELAY'     // Distance-based delay
  
  // Feedback
  | 'FEEDBACK'            // Explicit feedback loop
  | 'IMPLICIT_FEEDBACK'   // Algebraic loop
  
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
  
  | 'CUSTOM';

/**
 * Extended edge with advanced semantics
 */
export interface AdvancedEdgeDefinition extends EdgeDefinition {
  edgeType: AdvancedEdgeType;
  
  streaming?: {
    bufferSize: number;
    backpressure: 'drop' | 'block' | 'sample';
    sampleRate?: number;
  };
  
  delay?: {
    type: 'fixed' | 'variable' | 'transport';
    value: number | string;
    transportVelocity?: string;
    transportDistance?: string;
    interpolation: 'zoh' | 'linear' | 'cubic';
  };
  
  routing?: {
    condition?: string;
    probability?: string;
    priority?: number;
    fallback?: string;
  };
  
  sync?: {
    barrierType: 'all' | 'any' | 'n_of_m';
    timeout?: number;
    nRequired?: number;
    mTotal?: number;
  };
  
  spatial?: {
    couplingStrength: string;
    direction: 'unidirectional' | 'bidirectional';
    locality: 'adjacent' | 'radius' | 'custom';
    radius?: number;
  };
  
  message?: {
    messageType: string;
    priority: number;
    ttl?: number;
    acknowledgement: boolean;
  };
  
  transforms?: EdgeTransformPipeline;
}

export interface EdgeTransformPipeline {
  stages: EdgeTransformStage[];
  errorHandling: 'propagate' | 'default' | 'skip' | 'retry';
  defaultValue?: unknown;
  retryConfig?: {
    maxAttempts: number;
    backoff: 'constant' | 'linear' | 'exponential';
    delay: number;
  };
}

export interface EdgeTransformStage {
  id: string;
  name: string;
  type: 'expression' | 'function' | 'type_cast' | 'validation' 
      | 'aggregation' | 'filtering' | 'sampling' | 'custom';
  config: Record<string, unknown>;
  condition?: string;
  errorHandler?: string;
}
```

### 10.2 Hyperedges for Multi-Node Interactions

```typescript
// ============================================
// Hyperedges - Multi-Node Connections
// ============================================

/**
 * Hyperedge - connects multiple nodes simultaneously
 * Useful for: conservation laws, game interactions, mesh elements
 */
export interface HyperedgeDefinition {
  id: string;
  name: string;
  type: HyperedgeType;
  
  connections: HyperedgeConnection[];
  
  interaction: {
    type: 'expression' | 'function' | 'constraint';
    expression?: string;
    constraint?: string;
    functionRef?: string;
  };
  
  gameInteraction?: {
    players: string[];
    payoffFunction: string;
    simultaneity: 'simultaneous' | 'sequential';
  };
  
  elementInteraction?: {
    elementType: string;
    localMatrix: string;
    assembly: 'additive' | 'multiplicative';
  };
  
  metadata: Record<string, unknown>;
  style?: EdgeStyle;
}

export type HyperedgeType =
  | 'CONSTRAINT'          // Algebraic constraint between nodes
  | 'CONSERVATION'        // Conservation law (sum = constant)
  | 'INTERACTION'         // General multi-body interaction
  | 'GAME_INTERACTION'    // Strategic interaction
  | 'ELEMENT'             // FEM element connectivity
  | 'SYNCHRONIZATION'     // Multi-node sync point
  | 'BROADCAST'           // One-to-many with shared state
  | 'REDUCTION'           // Many-to-one aggregation
  | 'CUSTOM';

export interface HyperedgeConnection {
  nodeId: string;
  portId: string;
  role: string;
  coefficient?: number | string;
}
```

---

## 11. Execution Engine Extensions

### 11.1 Multi-Paradigm Execution

```typescript
// ============================================
// Extended Execution Engine
// ============================================

export type ExecutionParadigm =
  | 'dataflow'            // Standard forward dataflow
  | 'discrete_event'      // Event-driven
  | 'continuous_time'     // ODE/PDE integration
  | 'hybrid'              // Mixed continuous/discrete
  | 'iterative'           // Fixed-point iteration
  | 'optimization'        // Optimization loop
  | 'agent_based'         // Agent-based simulation
  | 'game_theoretic';     // Game equilibrium finding

export interface ExecutionConfig {
  paradigm: ExecutionParadigm;
  
  dataflow?: {
    evaluation: 'eager' | 'lazy';
    caching: boolean;
    parallelism: number;
  };
  
  discreteEvent?: {
    timeAdvancement: 'next_event' | 'fixed_increment';
    tieBreaking: 'fifo' | 'priority' | 'random';
    maxEventsPerStep?: number;
  };
  
  continuousTime?: {
    integrationMethod: IntegrationMethod;
    adaptiveStepSize: boolean;
    eventLocalization: boolean;
    algebraicLoopSolver?: SolverType;
  };
  
  hybrid?: {
    continuousStepSize: number;
    discreteEventHandling: 'interpolate' | 'synchronize';
    stateJumpHandling: 'reinitialize' | 'preserve';
  };
  
  iterative?: {
    convergenceTolerance: number;
    maxIterations: number;
    accelerator: 'none' | 'aitken' | 'anderson' | 'wegstein';
  };
  
  agentBased?: {
    scheduling: 'synchronous' | 'asynchronous' | 'random';
    shuffleOrder: boolean;
    neighborhoodUpdate: 'immediate' | 'batch';
  };
  
  gameTheoretic?: {
    equilibriumConcept: EquilibriumConcept;
    computationMethod: string;
    learningDynamics?: string;
  };
}

/**
 * Extended simulation state for complex paradigms
 */
export interface ExtendedSimulationState {
  nodeValues: Map<string, Record<string, unknown>>;
  edgeValues: Map<string, unknown>;
  
  time: number;
  iteration: number;
  
  // Discrete event state
  eventQueue?: PriorityQueue<ScheduledEvent>;
  
  // Continuous state
  continuousState?: {
    stateVector: number[];
    stateDerivatives: number[];
    algebraicVariables?: number[];
  };
  
  // Agent state
  agentStates?: Map<string, AgentState>;
  agentInteractions?: InteractionRecord[];
  
  // Game state
  gameState?: {
    strategies: Map<string, unknown>;
    beliefs: Map<string, unknown>;
    history: GameHistoryEntry[];
  };
  
  // Convergence tracking
  convergenceMetrics?: {
    residual: number;
    relativeChange: number;
    oscillation: number;
    iteration: number;
  };
  
  checkpoints?: SimulationCheckpoint[];
}

export interface ScheduledEvent {
  time: number;
  priority: number;
  nodeId: string;
  eventType: string;
  data: unknown;
}

export interface AgentState {
  agentId: string;
  internalState: Record<string, unknown>;
  position?: Position;
  lastAction?: unknown;
  lastReward?: number;
}
```

### 11.2 Parallel and Distributed Execution

```typescript
// ============================================
// Parallel Execution
// ============================================

export interface ParallelExecutionConfig {
  mode: 'none' | 'multithread' | 'multiprocess' | 'distributed';
  
  workers: number;
  
  decomposition?: {
    method: 'node_partition' | 'space_partition' | 'time_partition' | 'custom';
    balancing: 'static' | 'dynamic';
    overlapLayers?: number;
  };
  
  communication?: {
    pattern: 'scatter_gather' | 'allreduce' | 'neighbor' | 'custom';
    bufferSize: number;
    asyncCommunication: boolean;
  };
  
  synchronization?: {
    barrier: 'global' | 'local' | 'hierarchical';
    frequency: number;
    tolerance?: number;
  };
  
  loadBalancing?: {
    strategy: 'round_robin' | 'work_stealing' | 'guided' | 'adaptive';
    rebalanceThreshold?: number;
  };
}
```

---

## 12. Summary: Enabling Any Simulation Paradigm

With these extensions, ScenarioForge can support virtually any computational simulation methodology:

| Simulation Type | Key Node Types | Key Edge Types |
|-----------------|----------------|----------------|
| **Finite Element Methods** | MESH, ELEMENT, FIELD, LINEAR_SYSTEM, EIGENVALUE | NEIGHBOR, COUPLING |
| **Computational Fluid Dynamics** | MESH, INTEGRATOR, FILTER | STREAMING, TRANSPORT_DELAY |
| **Game Theory** | AGENT, STRATEGY, PAYOFF_MATRIX, EQUILIBRIUM_FINDER | MESSAGE, INFLUENCE |
| **Agent-Based Modeling** | AGENT, POPULATION, STATE_MACHINE, EVENT_QUEUE | MESSAGE, OBSERVATION |
| **Control Systems** | PID_CONTROLLER, MPC_CONTROLLER, FILTER, INTEGRATOR | FEEDBACK, DELAYED |
| **Optimization** | OBJECTIVE, OPTIMIZER, SOLVER, CONSTRAINT | DATA_FLOW |
| **Stochastic Simulation** | MARKOV_CHAIN, RANDOM_PROCESS, MONTE_CARLO_ESTIMATOR | PROBABILISTIC |
| **Discrete Event Simulation** | EVENT_QUEUE, STATE_MACHINE, BUFFER | CONDITIONAL, PRIORITY |
| **Differential Equations** | INTEGRATOR, DELAY_LINE, SOLVER | FEEDBACK, IMPLICIT_FEEDBACK |
| **Signal Processing** | FILTER, FFT, CONVOLUTION, ACCUMULATOR | STREAMING, BATCHED |
| **Multi-Physics Coupling** | (Combinations above) | COUPLING, SYNC_BARRIER |
| **Evolutionary Computation** | POPULATION, OPTIMIZER, STRATEGY | INFLUENCE, MESSAGE |
| **Queueing Networks** | EVENT_QUEUE, BUFFER, AGGREGATOR | PROBABILISTIC, PRIORITY |

### Design Philosophy

The architecture remains **domain-agnostic** throughout:

1. **Nodes define computational primitives** - The building blocks of simulation (integration, optimization, state machines, etc.)
2. **Users provide domain semantics** - Expressions, schemas, and parameters give meaning in specific contexts
3. **Edges define interactions** - Data flow, feedback, delays, constraints, and multi-body coupling
4. **Execution paradigms are composable** - Mix continuous, discrete, agent-based, and optimization in one model
5. **Everything is hierarchical** - Complex systems nest inside subgraphs at arbitrary depth

### Example: Modeling a Game-Theoretic Market

```

                    Market Simulation (Root)                       
                                                                   
                    
     Demand            Market            Supply            
    (RANDOM_    Equilibrium   (AGENT             
    PROCESS)          (SOLVER)          POPULATION)        
                    
                                                                  
                                                                  
                                                   
                       Price                                 
                      Formation     FEEDBACK                   
                     (INTEGRATOR)                              
                                                  
                                                                
                                                                
          
                Strategic Agents (SUBGRAPH)                     
                          
    Agent1Agent2Agent3...EQUILIBRIUM           
    (AGENT) (AGENT) (AGENT)        FINDER              
                          
          
                                                                  
                                                                  
                                                   
                       OUTPUT                                   
                     (Metrics,                                  
                      Welfare)                                  
                                                   

```

This single model combines:
- **Stochastic processes** (demand shocks)
- **Agent-based modeling** (supplier firms)
- **Game theory** (equilibrium finding)
- **Differential equations** (price dynamics)
- **Feedback loops** (price affects agent decisions)

All configured through domain-agnostic primitives with user-defined expressions and schemas.
