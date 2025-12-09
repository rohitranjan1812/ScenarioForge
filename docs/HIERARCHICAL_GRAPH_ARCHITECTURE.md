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
