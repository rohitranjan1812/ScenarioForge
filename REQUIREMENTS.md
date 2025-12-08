# ScenarioForge - Graph-Based Scenario Modeling & Simulation Platform

## Executive Summary

ScenarioForge is a powerful full-stack application for modeling, simulating, and optimizing complex scenarios using a flexible graph-based architecture. Users can define sophisticated data models through configurable nodes and edges, run simulations, measure risk metrics, and optimize parameters to achieve desired outcomes.

---

## 1. Core Architecture

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React/TypeScript)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Graph Editor│  │ Simulation  │  │    Risk     │  │    Optimization     │ │
│  │   Canvas    │  │  Dashboard  │  │  Analytics  │  │       Studio        │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                              REST API / WebSocket
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Backend (Node.js/TypeScript)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Graph API  │  │ Simulation  │  │    Risk     │  │    Optimization     │ │
│  │   Service   │  │   Engine    │  │   Engine    │  │       Engine        │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Data Layer                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │   PostgreSQL        │  │      Redis          │  │   TimescaleDB       │  │
│  │   (Graph Storage)   │  │  (Cache/PubSub)     │  │ (Time-Series Data)  │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18+ with TypeScript | UI Framework |
| State Management | Zustand + React Query | Client state & server cache |
| Graph Visualization | React Flow / D3.js | Interactive graph canvas |
| Charts | Recharts / Visx | Data visualization |
| Backend | Node.js with Express/Fastify | API Server |
| Language | TypeScript (strict mode) | Type safety |
| Database | PostgreSQL with JSONB | Graph & schema storage |
| Time-Series | TimescaleDB | Simulation results |
| Cache | Redis | Session, cache, pub/sub |
| Queue | BullMQ | Background job processing |
| Testing | Vitest, Playwright | Unit & E2E testing |
| Build | Vite, esbuild | Fast bundling |

---

## 2. Graph Engine Specification

### 2.1 Node System

#### Node Base Schema
```typescript
interface NodeDefinition {
  id: string;                          // UUID
  type: NodeType;                      // Extensible node type registry
  name: string;                        // Display name
  description?: string;                // Documentation
  position: { x: number; y: number };  // Canvas position
  
  // Flexible data model
  schema: JSONSchema;                  // JSON Schema for validation
  data: Record<string, unknown>;       // Actual data conforming to schema
  
  // Computation
  computeFunction?: string;            // Reference to compute logic
  inputPorts: Port[];                  // Input connection points
  outputPorts: Port[];                 // Output connection points
  
  // Metadata
  tags: string[];
  color?: string;
  icon?: string;
  locked: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Built-in Node Types (Domain-Agnostic)

These abstract node types work for **any domain** - users define the specific schema and semantics:

| Node Type | Purpose | Data Model Flexibility |
|-----------|---------|------------------------|
| `DATA_SOURCE` | External data ingestion | User defines schema for CSV, API, or manual input |
| `TRANSFORMER` | Data manipulation | User defines input→output transformation via expressions |
| `DECISION` | Conditional branching | User defines condition expressions and branch schemas |
| `DISTRIBUTION` | Probabilistic values | User selects distribution type and parameters |
| `AGGREGATOR` | Combine multiple inputs | User defines aggregation method and output schema |
| `OUTPUT` | Result/metric collection | User defines what fields to capture as results |
| `SUBGRAPH` | Encapsulated graph | References another graph as reusable component |
| `PARAMETER` | Tunable variable | User defines bounds, type - becomes optimization variable |
| `CONSTRAINT` | Limits/boundaries | User defines constraint expressions |
| `CONSTANT` | Fixed values | User defines immutable reference data |

#### Custom Node Type Registration
```typescript
interface NodeTypeDefinition {
  type: string;
  category: string;
  displayName: string;
  description: string;
  defaultSchema: JSONSchema;
  defaultData: Record<string, unknown>;
  computeFunction: ComputeFunction;
  inputPortDefinitions: PortDefinition[];
  outputPortDefinitions: PortDefinition[];
  configUI?: ReactComponent;           // Custom configuration UI
  validationRules?: ValidationRule[];
}
```

### 2.2 Edge System

#### Edge Schema
```typescript
interface EdgeDefinition {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  
  // Edge data model
  schema: JSONSchema;
  data: Record<string, unknown>;
  
  // Relationship properties
  type: EdgeType;
  weight?: number;
  delay?: number;                      // Time delay in simulation
  condition?: Expression;              // Conditional activation
  transformFunction?: string;          // Data transformation
  
  // Visual
  style: EdgeStyle;
  animated: boolean;
  label?: string;
}
```

#### Edge Types

| Edge Type | Behavior |
|-----------|----------|
| `DATA_FLOW` | Passes data from source to target |
| `DEPENDENCY` | Target waits for source completion |
| `CONDITIONAL` | Activates based on condition |
| `FEEDBACK` | Creates cycles (special handling) |
| `TEMPORAL` | Time-delayed connection |

### 2.3 Port System

```typescript
interface Port {
  id: string;
  name: string;
  dataType: DataType;                  // string, number, object, array, any
  schema?: JSONSchema;                 // Optional strict typing
  required: boolean;
  multiple: boolean;                   // Allow multiple connections
  defaultValue?: unknown;
}
```

---

## 3. Data Model System

### 3.1 Schema Definition

Each node and edge supports a flexible JSON Schema-based data model:

```typescript
interface FlexibleDataModel {
  // JSON Schema for structure definition
  schema: {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required?: string[];
    additionalProperties?: boolean;
  };
  
  // UI hints for schema editor
  uiSchema?: {
    [field: string]: {
      widget: string;                  // input, select, slider, code, etc.
      options?: Record<string, unknown>;
      order?: number;
    };
  };
  
  // Validation beyond JSON Schema
  customValidators?: Validator[];
  
  // Computed/derived fields
  computedFields?: ComputedField[];
}
```

### 3.2 Supported Data Types

- **Primitives**: string, number, boolean, null
- **Complex**: object, array
- **Special**: 
  - `distribution` - Probability distribution config
  - `expression` - Mathematical expression string
  - `timeSeries` - Array of timestamped values
  - `reference` - Reference to another node/edge
  - `formula` - Excel-like formula

### 3.3 Expression Engine

Support mathematical and logical expressions within node data:

```typescript
interface ExpressionEngine {
  // Variable references
  variables: {
    $node: Record<string, unknown>;    // Current node data
    $inputs: Record<string, unknown>;  // Input port values
    $params: Record<string, unknown>;  // Global parameters
    $time: number;                     // Current simulation time
    $iteration: number;                // Monte Carlo iteration
  };
  
  // Functions available
  functions: {
    // Math: sin, cos, exp, log, pow, sqrt, abs, min, max, round
    // Statistical: mean, std, var, percentile, correlation
    // Distribution: normal, uniform, triangular, lognormal
    // Logical: if, and, or, not, switch
    // Array: sum, product, filter, map, reduce
  };
}
```

---

## 4. Simulation Engine

### 4.1 Simulation Configuration

```typescript
interface SimulationConfig {
  id: string;
  graphId: string;
  name: string;
  
  // Execution settings
  mode: 'deterministic' | 'monte_carlo' | 'sensitivity';
  iterations: number;                  // For Monte Carlo
  seed?: number;                       // Reproducibility
  
  // Time settings (for temporal simulations)
  timeConfig?: {
    start: Date;
    end: Date;
    step: Duration;
    unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
  };
  
  // Execution control
  maxExecutionTime: number;            // Timeout in ms
  parallelism: number;                 // Concurrent iterations
  checkpointInterval?: number;         // Save progress every N iterations
  
  // Output configuration
  outputNodes: string[];               // Nodes to capture
  captureIntermediates: boolean;       // Store intermediate calculations
  aggregations: AggregationConfig[];   // Summary statistics
}
```

### 4.2 Execution Flow

1. **Graph Validation**: Verify graph integrity, no invalid cycles
2. **Topological Sort**: Determine execution order
3. **Dependency Resolution**: Build execution plan
4. **Parallel Execution**: Run independent branches concurrently
5. **Result Collection**: Aggregate outputs
6. **Post-Processing**: Calculate statistics, risk metrics

### 4.3 Monte Carlo Engine

```typescript
interface MonteCarloConfig {
  iterations: number;                  // 1,000 - 1,000,000+
  samplingMethod: 'random' | 'latin_hypercube' | 'sobol';
  convergenceCheck: {
    enabled: boolean;
    metric: 'mean' | 'std' | 'percentile';
    tolerance: number;
    checkInterval: number;
  };
  varianceReduction?: {
    method: 'antithetic' | 'control_variate' | 'importance_sampling';
    config: Record<string, unknown>;
  };
}
```

---

## 5. Risk Analytics Engine

### 5.1 Risk Metrics

```typescript
interface RiskMetrics {
  // Distribution statistics
  mean: number;
  median: number;
  standardDeviation: number;
  variance: number;
  skewness: number;
  kurtosis: number;
  
  // Percentiles
  percentiles: Record<number, number>; // p5, p10, p25, p50, p75, p90, p95, p99
  
  // Risk measures
  valueAtRisk: {                       // VaR at different confidence levels
    var95: number;
    var99: number;
    var999: number;
  };
  conditionalVaR: {                    // CVaR/Expected Shortfall
    cvar95: number;
    cvar99: number;
  };
  
  // Additional metrics
  maxDrawdown?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  tailRisk: number;
}
```

### 5.2 Sensitivity Analysis

```typescript
interface SensitivityAnalysis {
  method: 'tornado' | 'spider' | 'sobol_indices' | 'morris';
  
  // Parameter variations
  parameters: {
    nodeId: string;
    field: string;
    baseValue: number;
    range: [number, number];           // Min, max
    steps: number;
  }[];
  
  // Results
  results: {
    parameterId: string;
    sensitivity: number;               // Impact coefficient
    elasticity: number;                // % change output / % change input
    correlation: number;               // Correlation with output
  }[];
}
```

---

## 6. Optimization Engine

### 6.1 Optimization Configuration

Optimization is **domain-agnostic** - users define objectives, variables, and constraints through the graph's data model:

```typescript
interface OptimizationConfig {
  id: string;
  graphId: string;
  simulationConfig: SimulationConfig;
  
  // User-defined objective (references any output node/field)
  objective: {
    type: 'minimize' | 'maximize';
    targetNodeId: string;              // Any OUTPUT node in graph
    targetField: string;               // Any field in node's schema
    aggregation: 'mean' | 'sum' | 'min' | 'max' | 'percentile';
    aggregationParam?: number;         // e.g., 95 for p95
  };
  
  // Multi-objective support
  objectives?: {
    targetNodeId: string;
    targetField: string;
    type: 'minimize' | 'maximize';
    weight: number;                    // Relative importance
  }[];
  
  // Decision variables - any PARAMETER node field becomes tunable
  variables: {
    nodeId: string;                    // Must be PARAMETER type node
    field: string;                     // Field from node's schema
    type: 'continuous' | 'integer' | 'categorical';
    bounds: [number, number] | string[];
    initialValue?: unknown;
  }[];
  
  // Constraints - expressions referencing any node data
  constraints: {
    expression: string;                // e.g., "$nodes.budget.data.total <= 1000000"
    type: 'equality' | 'inequality';
    tolerance?: number;
  }[];
  
  // Algorithm settings
  algorithm: OptimizationAlgorithm;
  maxIterations: number;
  tolerance: number;
  populationSize?: number;
}
```

### 6.2 Supported Algorithms

| Algorithm | Type | Best For |
|-----------|------|----------|
| Nelder-Mead | Local | Smooth, continuous |
| BFGS | Local | Differentiable |
| Genetic Algorithm | Global | Non-convex, mixed |
| Particle Swarm | Global | Continuous |
| Differential Evolution | Global | Continuous |
| Bayesian Optimization | Global | Expensive evaluations |
| Grid Search | Exhaustive | Small parameter space |

---

## 7. Frontend Specifications

### 7.1 Graph Editor Canvas

**Features:**
- Drag-and-drop node placement
- Visual edge creation (click-drag between ports)
- Multi-select and group operations
- Zoom and pan with minimap
- Undo/redo with full history
- Copy/paste nodes and subgraphs
- Snap-to-grid option
- Auto-layout algorithms (hierarchical, force-directed)
- Grouping/framing for organization
- Comments and annotations

**Node Interactions:**
- Double-click to open detail editor
- Right-click context menu
- Inline editing for name/values
- Collapse/expand complex nodes
- Visual indicators for errors/warnings
- Execution state visualization

### 7.2 Schema Editor

**Features:**
- Visual JSON Schema builder
- Drag-and-drop field ordering
- Nested object support
- Array item templates
- Validation rule configuration
- Default value setting
- UI widget selection
- Import/export schemas

### 7.3 Simulation Dashboard

**Components:**
- Real-time progress indicator
- Live statistics updates
- Convergence graphs
- Result distribution histograms
- Comparison views (scenario vs scenario)
- Export options (CSV, JSON, Excel)

### 7.4 Risk Analytics View

**Visualizations:**
- Distribution plots with confidence intervals
- Tornado diagrams for sensitivity
- Spider/radar charts
- Heat maps for correlations
- VaR/CVaR visualization
- Time-series risk evolution

### 7.5 Optimization Studio

**Features:**
- Variable bounds configuration
- Constraint builder
- Objective function designer
- Algorithm selection with presets
- Progress visualization
- Pareto frontier for multi-objective
- Result comparison table

---

## 8. API Specification

### 8.1 REST Endpoints

```
# Graph Management
GET    /api/graphs                     # List all graphs
POST   /api/graphs                     # Create graph
GET    /api/graphs/:id                 # Get graph details
PUT    /api/graphs/:id                 # Update graph
DELETE /api/graphs/:id                 # Delete graph
POST   /api/graphs/:id/clone           # Clone graph
POST   /api/graphs/:id/export          # Export graph
POST   /api/graphs/import              # Import graph

# Node Operations
POST   /api/graphs/:id/nodes           # Add node
PUT    /api/graphs/:id/nodes/:nodeId   # Update node
DELETE /api/graphs/:id/nodes/:nodeId   # Delete node
POST   /api/graphs/:id/nodes/batch     # Batch operations

# Edge Operations
POST   /api/graphs/:id/edges           # Add edge
PUT    /api/graphs/:id/edges/:edgeId   # Update edge
DELETE /api/graphs/:id/edges/:edgeId   # Delete edge

# Schema Registry
GET    /api/schemas                    # List schemas
POST   /api/schemas                    # Create schema
GET    /api/schemas/:id                # Get schema
PUT    /api/schemas/:id                # Update schema

# Simulation
POST   /api/simulations                # Start simulation
GET    /api/simulations/:id            # Get simulation status
GET    /api/simulations/:id/results    # Get results
DELETE /api/simulations/:id            # Cancel simulation
GET    /api/simulations/:id/stream     # SSE for progress

# Optimization
POST   /api/optimizations              # Start optimization
GET    /api/optimizations/:id          # Get status
GET    /api/optimizations/:id/results  # Get results
DELETE /api/optimizations/:id          # Cancel

# Risk Analytics
POST   /api/risk/analyze               # Run risk analysis
GET    /api/risk/metrics/:simId        # Get risk metrics
POST   /api/risk/sensitivity           # Run sensitivity analysis
```

### 8.2 WebSocket Events

```typescript
// Client -> Server
interface ClientEvents {
  'graph:subscribe': { graphId: string };
  'graph:unsubscribe': { graphId: string };
  'simulation:subscribe': { simulationId: string };
}

// Server -> Client
interface ServerEvents {
  'graph:updated': { graphId: string; changes: Change[] };
  'node:updated': { graphId: string; nodeId: string; data: NodeData };
  'simulation:progress': { simulationId: string; progress: Progress };
  'simulation:result': { simulationId: string; result: Result };
  'simulation:error': { simulationId: string; error: Error };
  'optimization:iteration': { optimizationId: string; iteration: IterationResult };
}
```

---

## 9. Data Persistence

### 9.1 PostgreSQL Schema

```sql
-- Graphs
CREATE TABLE graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Nodes
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  position JSONB NOT NULL,
  schema JSONB NOT NULL,
  data JSONB NOT NULL,
  compute_function TEXT,
  input_ports JSONB DEFAULT '[]',
  output_ports JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Edges
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES graphs(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  source_port_id VARCHAR(50) NOT NULL,
  target_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  target_port_id VARCHAR(50) NOT NULL,
  type VARCHAR(50) DEFAULT 'DATA_FLOW',
  schema JSONB DEFAULT '{}',
  data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Simulations
CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id UUID REFERENCES graphs(id),
  config JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  progress FLOAT DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Simulation Results (TimescaleDB hypertable)
CREATE TABLE simulation_results (
  id UUID DEFAULT gen_random_uuid(),
  simulation_id UUID REFERENCES simulations(id) ON DELETE CASCADE,
  iteration INTEGER NOT NULL,
  time_step TIMESTAMP,
  node_id UUID,
  output_key VARCHAR(100),
  value DOUBLE PRECISION,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (simulation_id, iteration, created_at)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('simulation_results', 'created_at');
```

### 9.2 Redis Usage

```
# Simulation cache
cache:simulation:{simId}:progress -> progress data
cache:simulation:{simId}:partial -> partial results

# Pub/Sub channels (for real-time UI updates)
channel:graph:{graphId} -> graph updates
channel:simulation:{simId} -> simulation progress
```

---

## 10. Security Requirements

### 10.1 Data Validation

- JSON Schema validation on all inputs
- Expression sandboxing (no arbitrary code execution)
- SQL injection prevention
- XSS protection
- CSRF tokens

### 10.3 Compute Isolation

- Simulation execution in sandboxed workers
- Resource limits (CPU, memory, time)
- No file system access from user expressions
- Network isolation for compute workers

---

## 11. Performance Requirements

| Metric | Target |
|--------|--------|
| Graph load time | < 500ms for 1000 nodes |
| Node update latency | < 100ms |
| Simulation start time | < 2s |
| Monte Carlo throughput | > 10,000 iterations/second |
| Concurrent simulations | 100+ per server |
| WebSocket message latency | < 50ms |
| API response time (p95) | < 200ms |

---

## 12. Project Structure

```
scenarioforge/
├── apps/
│   ├── web/                          # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── canvas/           # Graph editor components
│   │   │   │   ├── nodes/            # Node type components
│   │   │   │   ├── edges/            # Edge components
│   │   │   │   ├── panels/           # Side panels
│   │   │   │   ├── charts/           # Visualization components
│   │   │   │   └── common/           # Shared UI components
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── stores/               # Zustand stores
│   │   │   ├── services/             # API clients
│   │   │   ├── types/                # TypeScript types
│   │   │   └── utils/                # Utilities
│   │   └── package.json
│   │
│   └── api/                          # Node.js backend
│       ├── src/
│       │   ├── controllers/          # Route handlers
│       │   ├── services/             # Business logic
│       │   │   ├── graph/            # Graph operations
│       │   │   ├── simulation/       # Simulation engine
│       │   │   ├── risk/             # Risk calculations
│       │   │   └── optimization/     # Optimization algorithms
│       │   ├── models/               # Database models
│       │   ├── middleware/           # Express middleware
│       │   ├── workers/              # Background job processors
│       │   ├── websocket/            # WebSocket handlers
│       │   └── utils/                # Utilities
│       └── package.json
│
├── packages/
│   ├── core/                         # Shared core logic
│   │   ├── src/
│   │   │   ├── graph/                # Graph data structures
│   │   │   ├── schema/               # JSON Schema utilities
│   │   │   ├── expression/           # Expression parser/evaluator
│   │   │   ├── simulation/           # Simulation primitives
│   │   │   └── types/                # Shared types
│   │   └── package.json
│   │
│   ├── ui/                           # Shared UI component library
│   │   └── package.json
│   │
│   └── config/                       # Shared configurations
│       ├── eslint/
│       ├── typescript/
│       └── prettier/
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── Dockerfile.*
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── guides/
│
├── scripts/                          # Build and utility scripts
├── .github/
│   ├── workflows/                    # CI/CD
│   └── copilot-instructions.md
├── turbo.json                        # Turborepo config
├── pnpm-workspace.yaml
└── package.json
```

---

## 13. Development Phases

### Phase 1: Foundation (Weeks 1-4)
- [ ] Project scaffolding with Turborepo
- [ ] Database schema and migrations
- [ ] Basic graph CRUD API
- [ ] Simple graph canvas (add/remove/connect nodes)
- [ ] Node data editor with JSON Schema

### Phase 2: Core Engine (Weeks 5-8)
- [ ] Expression parser and evaluator
- [ ] Graph execution engine (topological sort)
- [ ] Basic simulation runner
- [ ] Result storage and retrieval
- [ ] Real-time progress updates

### Phase 3: Monte Carlo & Risk (Weeks 9-12)
- [ ] Monte Carlo simulation engine
- [ ] Distribution node types
- [ ] Risk metrics calculation
- [ ] Result visualization (histograms, percentiles)
- [ ] Sensitivity analysis

### Phase 4: Optimization (Weeks 13-16)
- [ ] Optimization engine framework
- [ ] Algorithm implementations
- [ ] Constraint handling
- [ ] Optimization UI
- [ ] Result comparison tools

### Phase 5: Polish & Scale (Weeks 17-20)
- [ ] Performance optimization
- [ ] Advanced visualizations
- [ ] Import/export features
- [ ] Documentation
- [ ] Production deployment

---

## 14. Success Metrics

- Build graphs with 500+ nodes without performance issues
- Monte Carlo simulations complete 100,000 iterations in < 30 seconds
- Optimization converges within acceptable tolerance 95% of time
- Complete first scenario within 30 minutes (onboarding)
- Local deployment starts in < 30 seconds via Docker
