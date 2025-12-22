// ============================================
// Hierarchical Graph Type Definitions
// ============================================
// Extensions to the core types for multi-level graph composition,
// feedback loops, and advanced edge capabilities.

import type {
  NodeDefinition,
  EdgeDefinition,
  Graph,
  PortDefinition,
  DataType,
  JSONSchema,
  TimeUnit,
  Position,
  EdgeStyle,
  NodeType,
} from './index.js';

// ============================================
// Graph Scope & Hierarchy
// ============================================

export type GraphScope = 'local' | 'shared' | 'library';
export type PortMapping = 'direct' | 'aggregated' | 'broadcast';
export type SubgraphExecutionMode = 'inline' | 'isolated' | 'parallel' | 'lazy';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
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
 * Execution scope configuration for subgraphs
 */
export interface ExecutionScope {
  // Inherited from parent
  inheritedParams: string[];
  inheritedContext: string[];
  
  // Local overrides
  localParams: Record<string, unknown>;
  
  // Output bubbling
  bubbleOutputs: boolean;
  bubbleErrors: boolean;
  
  // Simulation context sharing
  shareIterationState: boolean;
  shareTimeState: boolean;
}

/**
 * Extended Graph with hierarchical capabilities
 */
export interface HierarchicalGraph extends Graph {
  // Hierarchy
  parentGraphId?: string;
  depth: number;
  
  // Boundary Interface
  exposedInputPorts: ExposedPort[];
  exposedOutputPorts: ExposedPort[];
  
  // Feedback Configuration
  feedbackLoops: FeedbackLoop[];
  
  // Execution Context
  executionScope: ExecutionScope;
  
  // Versioning for sub-graph references
  subgraphVersions: Record<string, number>;
}

// ============================================
// Subgraph Node Types
// ============================================

export interface PortMappingConfig {
  externalPortId: string;
  internalPortId: string;
  transform?: string;
}

/**
 * A node that contains/references another graph
 */
export interface SubgraphNodeData {
  // Reference to contained graph
  subgraphId: string;
  subgraphVersion?: number;
  scope: GraphScope;
  
  // Instance configuration
  instanceParams?: Record<string, unknown>;
  
  // Port mapping
  portMappings: PortMappingConfig[];
  
  // Execution behavior
  executionMode: SubgraphExecutionMode;
  
  // Visual state
  collapsed: boolean;
  expandedBounds?: BoundingBox;
}

// ============================================
// Feedback Loop Types
// ============================================

export type FeedbackTrigger = 
  | 'iteration'
  | 'time_step'
  | 'convergence'
  | 'threshold'
  | 'schedule';

export type FeedbackTransform = 
  | 'direct'
  | 'delta'
  | 'moving_avg'
  | 'exponential'
  | 'pid'
  | 'custom';

export interface FeedbackTransformConfig {
  // For moving_avg
  windowSize?: number;
  
  // For exponential smoothing
  alpha?: number;
  
  // For PID controller
  kp?: number;
  ki?: number;
  kd?: number;
  setpoint?: number | string;
  
  // For threshold trigger
  threshold?: number;
  direction?: 'rising' | 'falling' | 'both';
}

export interface FeedbackConvergenceConfig {
  enabled: boolean;
  tolerance: number;
  metric: 'absolute' | 'relative' | 'oscillation';
  windowSize: number;
}

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
  sourceField?: string;
  
  // Target (where feedback is injected)
  targetNodeId: string;
  targetPortId: string;
  targetField?: string;
  
  // Timing
  delay: number;
  trigger: FeedbackTrigger;
  
  // Transformation
  transform: FeedbackTransform;
  transformConfig?: FeedbackTransformConfig;
  customExpression?: string;
  
  // State management
  initialValue: unknown;
  stateHistory?: number;
  
  // Convergence detection
  convergence?: FeedbackConvergenceConfig;
  
  // Visual
  style?: EdgeStyle;
  enabled: boolean;
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

// ============================================
// Extended Edge Types
// ============================================

export type EdgeRole = 
  | 'data_flow'
  | 'feedback'
  | 'control'
  | 'boundary'
  | 'temporal';

export type EdgeCardinality = 
  | 'one_to_one'
  | 'one_to_many'
  | 'many_to_one'
  | 'many_to_many';

export type EdgeTransformType = 'expression' | 'function' | 'schema_map' | 'filter';

export interface EdgeTransform {
  id: string;
  order: number;
  type: EdgeTransformType;
  config: unknown;
  enabled: boolean;
}

export interface RoutingRule {
  id: string;
  condition: string;
  targetPortId?: string;
  priority: number;
  action: 'route' | 'drop' | 'duplicate' | 'transform';
}

export interface BoundaryPortMapping {
  externalPortId: string;
  internalPath: string[];
  internalPortId: string;
}

export interface EdgeTemporalConfig {
  delay: number;
  unit: TimeUnit;
  interpolation: 'hold' | 'linear' | 'cubic';
}

export interface EdgeBoundaryConfig {
  sourceGraphPath: string[];
  targetGraphPath: string[];
  portMappings: BoundaryPortMapping[];
}

/**
 * Extended edge definition with advanced capabilities
 */
export interface ExtendedEdgeDefinition extends EdgeDefinition {
  role: EdgeRole;
  cardinality: EdgeCardinality;
  
  // Data transformation pipeline
  transformPipeline?: EdgeTransform[];
  
  // Conditional routing
  routingRules?: RoutingRule[];
  
  // Temporal behavior
  temporal?: EdgeTemporalConfig;
  
  // Cross-boundary routing
  boundary?: EdgeBoundaryConfig;
  
  // State tracking
  stateful: boolean;
  stateSchema?: JSONSchema;
  stateInitializer?: string;
}

// ============================================
// Meta-Node Types
// ============================================

export type MetaNodeType = 
  | 'SUBGRAPH'
  | 'ITERATOR'
  | 'PARALLEL_MAP'
  | 'CONDITIONAL_GRAPH'
  | 'TEMPLATE'
  | 'REFERENCE'
  | 'CHECKPOINT'
  | 'FEEDBACK_COLLECTOR'
  | 'CONVERGENCE_GATE';

// Extended NodeType including meta-nodes
export type ExtendedNodeType = NodeType | MetaNodeType;

export type IterationMode = 'count' | 'foreach' | 'while' | 'until_convergence';
export type AggregationMethod = 'collect' | 'sum' | 'mean' | 'last' | 'custom';

export interface IterationConfig {
  mode: IterationMode;
  count?: number | string;
  collection?: string;
  condition?: string;
  maxIterations: number;
  indexVariable: string;
  valueVariable?: string;
}

export interface IterationAggregation {
  method: AggregationMethod;
  customExpression?: string;
}

/**
 * Iterator node data - executes a subgraph multiple times
 */
export interface IteratorNodeData {
  subgraphId: string;
  iterationConfig: IterationConfig;
  aggregation: IterationAggregation;
}

export type MergeStrategy = 'array' | 'object' | 'reduce';

export interface ParallelConfig {
  inputArrayPort: string;
  maxParallelism: number;
  batchSize?: number;
  timeout: number;
}

/**
 * Parallel map node data - executes subgraph in parallel for each input
 */
export interface ParallelMapNodeData {
  subgraphId: string;
  parallelConfig: ParallelConfig;
  mergeStrategy: MergeStrategy;
  reduceExpression?: string;
}

/**
 * Template parameter definition
 */
export interface TemplateParameter {
  name: string;
  type: DataType;
  defaultValue?: unknown;
  bindingExpression?: string;
  propagateToSubgraph: boolean;
}

export type InstantiationMode = 'static' | 'dynamic';

/**
 * Template node data - instantiates parameterized graphs
 */
export interface TemplateNodeData {
  templateGraphId: string;
  parameters: TemplateParameter[];
  instantiationMode: InstantiationMode;
  dynamicTrigger?: string;
}

export type CaptureMode = 'full' | 'delta' | 'selective';

export interface CheckpointConfig {
  captureMode: CaptureMode;
  selectiveNodes?: string[];
  triggerCondition?: string;
  maxCheckpoints: number;
  compression: boolean;
}

/**
 * Checkpoint node data - captures state for rollback/replay
 */
export interface CheckpointNodeData {
  checkpointConfig: CheckpointConfig;
}

export type ConvergenceMetric = 'value' | 'derivative' | 'oscillation';
export type FallbackBehavior = 'error' | 'pass_through' | 'use_default';

export interface ConvergenceGateConfig {
  metric: ConvergenceMetric;
  tolerance: number;
  windowSize: number;
  maxWait: number;
  fallbackBehavior: FallbackBehavior;
  fallbackValue?: unknown;
}

/**
 * Convergence gate node data - blocks until convergence
 */
export interface ConvergenceGateNodeData {
  convergenceConfig: ConvergenceGateConfig;
}

// ============================================
// Dynamic Port System
// ============================================

export type PortMode = 'static' | 'dynamic' | 'template';

export interface PortGenerator {
  expression: string;
  triggers: string[];
}

export interface PortTemplate {
  inputTemplate: PortDefinition;
  outputTemplate: PortDefinition;
  multiplicity: string;
}

export interface DynamicPortConfig {
  mode: PortMode;
  portGenerator?: PortGenerator;
  template?: PortTemplate;
}

export interface ExecutionHints {
  pure: boolean;
  idempotent: boolean;
  expensive: boolean;
  parallelizable: boolean;
}

export interface ResourceRequirements {
  memory?: string;
  cpu?: number;
  gpu?: boolean;
  timeout?: number;
}

/**
 * Extended node definition with advanced capabilities
 */
export interface ExtendedNodeDefinition extends NodeDefinition {
  dynamicPorts?: DynamicPortConfig;
  executionHints?: ExecutionHints;
  resources?: ResourceRequirements;
}

// ============================================
// Expression Context Extensions
// ============================================

export interface GraphContext {
  params: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

/**
 * Extended expression context with hierarchical awareness
 */
export interface HierarchicalExpressionContext {
  // Standard context
  $node: Record<string, unknown>;
  $inputs: Record<string, unknown>;
  $params: Record<string, unknown>;
  $time: number;
  $iteration: number;
  $nodes: Record<string, NodeDefinition>;
  
  // Hierarchical extensions
  $parent: Record<string, unknown>;
  $root: Record<string, unknown>;
  $depth: number;
  $path: string[];
  
  // Cross-graph references
  $graphs: Record<string, GraphContext>;
  
  // Feedback state
  $feedback: Record<string, unknown>;
  $feedbackHistory: Record<string, unknown[]>;
  
  // Iteration context (for Iterator nodes)
  $i?: number;
  $item?: unknown;
  $iterationTotal?: number;
}

// ============================================
// UI Navigation Types
// ============================================

export interface GraphPathSegment {
  graphId: string;
  graphName: string;
  entryNodeId?: string;
  depth: number;
}

export type ViewMode = 'collapsed' | 'expanded' | 'mixed';
export type SubgraphViewMode = 'inline' | 'popup' | 'panel';

export interface SubgraphViewState {
  mode: SubgraphViewMode;
  bounds: BoundingBox;
  opacity: number;
  locked: boolean;
}

export interface NavigationHistoryEntry {
  path: GraphPathSegment[];
  viewport: { center: Position; zoom: number };
  timestamp: Date;
}

export interface GraphNavigationState {
  currentPath: GraphPathSegment[];
  viewMode: ViewMode;
  
  viewport: {
    center: Position;
    zoom: number;
    bounds: BoundingBox;
  };
  
  selectedNodes: Set<string>;
  selectedEdges: Set<string>;
  hoveredNode?: string;
  
  expandedSubgraphs: Map<string, SubgraphViewState>;
  
  history: NavigationHistoryEntry[];
  historyIndex: number;
}

export type DrillAction = 'drill_into' | 'drill_out' | 'expand_inline' | 'collapse' | 'open_panel';

export interface DrillDownAction {
  type: DrillAction;
  targetNodeId: string;
  animate: boolean;
  duration: number;
  preserveContext: boolean;
  highlightBoundary: boolean;
}

// ============================================
// Simulation Artifact Types
// ============================================

export type ArtifactType = 'value' | 'distribution' | 'time_series' | 'convergence' | 'feedback_trace';

export interface SimulationArtifact {
  id: string;
  type: ArtifactType;
  
  nodeId: string;
  portId?: string;
  graphPath: string[];
  
  data: unknown;
  metadata: Record<string, unknown>;
  
  iteration?: number;
  timeStep?: Date;
  
  causes: string[];
  effects: string[];
}

export type TraceDirection = 'forward' | 'backward' | 'bidirectional';
export type TraceVisualization = 'graph_overlay' | 'timeline' | 'tree' | 'sankey';

export interface TraceFilters {
  nodeTypes?: ExtendedNodeType[];
  valueRange?: [number, number];
  timeRange?: [Date, Date];
  iterationRange?: [number, number];
}

export interface ArtifactExplorer {
  selectedArtifact?: SimulationArtifact;
  mode: TraceDirection;
  filters: TraceFilters;
  visualization: TraceVisualization;
}

export interface TracePathSegment {
  nodeId: string;
  portId: string;
  edgeId?: string;
  graphPath: string[];
  value: unknown;
  iteration?: number;
  timestamp?: Date;
}

export interface CauseEffectTrace {
  startNode: string;
  endNode: string;
  path: TracePathSegment[];
  values: Map<string, unknown>;
  highlightMode: 'path' | 'tree' | 'heatmap';
}
