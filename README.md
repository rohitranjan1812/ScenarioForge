# ScenarioForge

A **domain-agnostic, graph-based modeling and simulation platform** for building, analyzing, and optimizing complex scenarios. Define your own data models, run Monte Carlo simulations, measure risk, and optimize parameters.

**No backend required** - works completely locally with localStorage persistence.

## Features

- 🎨 **Visual Graph Editor** - Drag-and-drop node canvas with React Flow
- 🎲 **Monte Carlo Simulation** - Run probabilistic simulations with configurable iterations
- 📊 **Risk Analytics** - Calculate VaR, CVaR, percentiles, and statistical metrics
- 🔧 **Flexible Node Types** - 10 extensible node types for any domain
- 💾 **Local-First** - All graphs persist to browser localStorage
- 🚀 **No Backend Required** - Frontend-only operation for single-user local deployment
- 📈 **Expression Engine** - Evaluate complex expressions with sandboxed evaluator
- ⚡ **Fast Execution** - Topological graph execution with optimized simulation loops

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Start all services (frontend + backend)
pnpm dev

# Or start just the frontend
pnpm dev:web

# Or start just the backend
pnpm dev:api
```

The frontend will be available at **http://localhost:5173**

## Using ScenarioForge

### 1. Create a Graph

1. Click the **"+" button** in the left sidebar to create a new graph
2. Enter a name for your graph (e.g., "Supply Chain Model", "Financial Forecast")
3. The graph will be created and stored locally

### 2. Build Your Model

#### Available Node Types

**Input Nodes:**
- **Data Source** (📊) - External data inputs
- **Constant** (🔢) - Fixed numeric values
- **Parameter** (🎚️) - Adjustable parameters with min/max ranges
- **Distribution** (📈) - Random distribution samplers (normal, uniform, etc.)

**Transform Nodes:**
- **Transformer** (⚙️) - Apply expressions to transform inputs
- **Aggregator** (∑) - Combine multiple inputs (sum, average, min, max)
- **Decision** (❓) - Conditional branching based on expressions

**Output & Control:**
- **Output** (📤) - Final output node (captured in simulation results)
- **Constraint** (🚫) - Define optimization constraints
- **Subgraph** (📦) - Nest graphs within graphs

#### Adding Nodes

1. **Drag from palette** - Click and drag a node type from the left panel onto the canvas
2. **Position it** - Drop it where you want on the canvas
3. **Node appears** - The node will be created at the drop location

#### Configuring Nodes

1. **Click a node** - Select it on the canvas
2. **Edit properties** - Use the right panel to:
   - Change the node name
   - Set input/output ports
   - Configure node-specific data (values, ranges, expressions)
   - Add descriptive tags
3. **Changes save automatically** to localStorage

### 3. Connect Nodes

1. **Click and drag** from an output port (right side of a node)
2. **Drag to** an input port (left side of another node)
3. **Release** to create the edge
4. Data flows through connections in topological order

### 4. Configure Node-Specific Data

#### Constant Node
```
Value: 100
```

#### Parameter Node
```
Name: Demand
Min: 50
Max: 200
```

#### Distribution Node
```
Distribution Type: normal | uniform | triangular | exponential
Parameters: mean, stddev (or min, max, etc.)
```

#### Transformer Node
```
Expression: $inputs.value1 * 2 + $inputs.value2
```
Available variables:
- `$inputs` - Object with input values (e.g., `$inputs.portName`)
- `$node` - Current node's custom data fields (e.g., `$node.bonus`)
- `$params` - Global simulation parameters (e.g., `$params.globalScale`)
- `$time` - Current simulation time step
- `$iteration` - Current iteration number (0, 1, 2, ...)

**To add custom data fields** (accessible via `$node`):
1. Click the node in the canvas
2. In Properties Panel, scroll to **"Custom Data Fields"** section
3. Click **"+ Add Custom Field"** and enter a name (e.g., `multiplier`)
4. Set the value (e.g., `2.5`)
5. Use in expression: `$inputs.value * $node.multiplier`

#### Aggregator Node
```
Aggregation Type: sum | average | min | max | product
```

#### Decision Node
```
Condition: $inputs.demand > $inputs.threshold ? $inputs.highPrice : $inputs.lowPrice
```

### 5. Run Simulations

Switch to the **"Simulation"** tab in the right panel.

#### Single Run
1. Click **"▶ Single Run"** button
2. Executes the graph once deterministically
3. Shows outputs from all OUTPUT nodes

#### Monte Carlo Simulation
1. Set **Iterations** - Number of simulation runs (default: 1000)
2. (Optional) Set **Random Seed** - For reproducible results
3. Set **Confidence Level** - 90%, 95%, or 99%
4. Click **"🎲 Monte Carlo"** button
5. Progress bar shows simulation progress

#### Results Display

After simulation completes, you'll see:

**Summary:**
- Total iterations run
- Execution time in milliseconds

**Metrics per Output** (for Monte Carlo):
- **Mean** - Average value across all iterations
- **Median** - Middle value
- **Std Dev** - Standard deviation
- **Min / Max** - Range of values
- **VaR 95%** - Value at Risk (95th percentile loss)
- **CVaR 95%** - Conditional VaR (average of worst 5%)
- **Skewness** - Distribution asymmetry
- **Percentiles** - P5, P25, P75, P95 breakdown

For single runs, outputs are displayed directly.

### 6. Interpret Results

- **Risk Metrics** help identify downside risk and tail events
- **VaR** = worst-case loss at given confidence level
- **CVaR** = average loss in worst-case scenarios
- **Standard Deviation** = volatility/uncertainty
- **Mean** = expected value across all scenarios

## Example: Simple Cost Model

### Scenario: Monthly Operating Costs

**Nodes:**
1. **Constant** - Fixed Costs = $5,000
2. **Parameter** - Variable Cost per Unit (min: $10, max: $20)
3. **Distribution** - Demand (Normal: μ=1000, σ=100)
4. **Transformer** - Total Cost = $5,000 + (Variable Cost × Demand)
5. **Output** - Total Monthly Cost

**Simulation:**
- Run 10,000 iterations
- See expected cost, range, and risk metrics
- Understand cost variability based on demand uncertainty

## Example: Portfolio Optimization

**Nodes:**
1. **Distribution** - Asset A Return (normal)
2. **Distribution** - Asset B Return (normal)
3. **Parameter** - Asset A Weight (0-100%)
4. **Parameter** - Asset B Weight (0-100%)
5. **Transformer** - Portfolio Return = (A_Return × A_Weight) + (B_Return × B_Weight)
6. **Constraint** - Weights must sum to 100%
7. **Output** - Portfolio Value

**Simulation:**
- Run 5,000 iterations with different weight allocations
- Compare VaR and expected returns
- Find optimal allocation for your risk tolerance

## Sample Graphs Reference

Click **"📚 Load Sample Graphs"** to import 10 pre-built examples. Here's how to understand each:

---

### 1. Arithmetic Demo (Beginner)
**Purpose:** Learn basic node connections and data flow.

**What it demonstrates:**
- Constants feeding into transformers
- Aggregators combining values
- Simple arithmetic expressions

**How to explore:**
1. Click on each node to see its configuration
2. Run "Single Run" to see deterministic output
3. Trace the data flow from inputs → transformers → output

---

### 2. Supply Chain Cost Model (Intermediate)
**Purpose:** Model monthly operating costs with uncertain demand.

**Key nodes:**
- `Fixed Costs` - Constant overhead
- `Monthly Demand` - Normal distribution (uncertainty)
- `Defect Rate` - Uniform distribution 1-5%
- `Variable Costs` - Expression: `unitCost × demand`
- `Defect Cost` - Expression: `demand × defectRate × 50`

**Insights from Monte Carlo:**
- Mean = expected monthly cost
- VaR 95% = worst-case cost you'll exceed only 5% of months
- Std Dev = cost volatility

---

### 3. Investment Portfolio Risk Model (Advanced)
**Purpose:** Analyze 4-asset portfolio risk/return with Monte Carlo.

**Assets modeled:**
- Stocks (μ=10%, σ=20%)
- Bonds (μ=4%, σ=5%)
- Real Estate (μ=7%, σ=12%)
- Crypto (μ=25%, σ=80%)

**Key transformations:**
- Each asset: `return × weight` (weighted contribution)
- Portfolio return: sum of all weighted returns
- Final value: `capital × (1 + return)`

**What to analyze:**
- Compare VaR across different weight allocations
- High crypto weight = higher return but massive VaR
- Diversification reduces standard deviation

---

### 4. Project Risk Assessment (Intermediate)
**Purpose:** Estimate software project timeline and budget under uncertainty.

**Risk factors modeled:**
- `Scope Creep` - Triangular distribution (1.0, 1.15, 1.5)
- `Resource Availability` - Uniform 70-100%
- `Technical Risk` - Triangular (1.0, 1.1, 2.0)

**Decision node:**
- `Is Complex Project?` - If tech risk > threshold, multiply duration by 1.2

**Key formulas:**
- Duration: `base × scopeCreep / resources × complexity`
- Budget: `base × scopeCreep × techRisk`

---

### 5. Manufacturing Quality Model (Intermediate)
**Purpose:** Statistical process control and defect cost analysis.

**Process modeled:**
- Production volume with variability
- Process capability (Cpk simulation)
- Defect rates and rework costs

**Useful for:**
- Understanding quality cost tradeoffs
- Seeing how process variability impacts bottom line

---

### 6. Compound Interest Calculator (Intermediate)
**Purpose:** Demonstrate multi-stage formula breakdown.

**Formula:** `P(1 + r/n)^(nt)`

**Step-by-step breakdown:**
1. Rate to decimal: `rate / 100`
2. Periodic rate: `rate / compounds`
3. Total periods: `compounds × years`
4. Growth factor: `(1 + periodicRate)^periods`
5. Final amount: `principal × growthFactor`

**Key insight:** Complex formulas become understandable when broken into visual steps.

---

### 7. Monte Carlo Pi Estimation (Intermediate)
**Purpose:** Demonstrate probability-based computation.

**How it works:**
1. Generate random (x, y) points in unit square
2. Calculate x² + y²
3. If ≤ 1, point is inside quarter circle
4. Ratio × 4 ≈ π

**Try this:**
- Run with 100 iterations → rough estimate
- Run with 10,000 iterations → mean approaches 3.14159
- Shows law of large numbers in action

---

### 8. Loan Amortization Calculator (Intermediate)
**Purpose:** Calculate mortgage payments and total interest.

**Formula:** `P × [r(1+r)^n] / [(1+r)^n - 1]`

**Outputs:**
- Monthly payment
- Total amount paid
- Total interest (total - principal)

**Experiment:**
- Change rate from 5% to 8% and see payment increase
- Change term from 30 to 15 years
- See how much interest you save with shorter terms

---

### 9. Option Pricing Model (Advanced)
**Purpose:** Black-Scholes components for call options.

**Inputs:**
- Stock price (stochastic - normal distribution)
- Strike price (constant)
- Volatility (stochastic - uniform)
- Risk-free rate, time to expiry

**Calculations:**
- ln(S/K) - log moneyness
- d1 numerator: `ln(S/K) + (r + σ²/2)T`
- d1: `numerator / (σ√T)`
- d2: `d1 - σ√T`
- Intrinsic value: `max(S - K, 0)`

**Monte Carlo reveals:**
- Distribution of d1, d2 values
- Probability of finishing in-the-money
- Expected payoff under different volatility scenarios

---

### 10. Epidemic Spread Model (Advanced)
**Purpose:** SIR-inspired disease spread simulation.

**Key metrics:**
- **R₀** (Basic Reproduction Number): `contactRate / recoveryRate`
- Infection growth: exponential when R₀ > 1

**Decision logic:**
- Caps infections at susceptible population

**Outputs:**
- R₀ value
- Estimated infected after N days
- Infection rate as % of population
- Estimated peak day

**Monte Carlo insights:**
- Contact rate uncertainty → wide range of outcomes
- Visualize best/worst case scenarios
- Understand exponential growth sensitivity

---

### 11. Expression Variables Demo (Beginner)
**Purpose:** Learn ALL available expression context variables in one graph.

**Variables demonstrated:**

| Variable | Node | Expression | What it does |
|----------|------|------------|--------------|
| `$inputs` | `$inputs Demo` | `$inputs.base * $inputs.mult` | Access values from input ports by name |
| `$node` | `$node Demo` | `$inputs.value + ($node.bonus \|\| 0)` | Access current node's `data` properties |
| `$params` | `$params Demo` | `$inputs.value * ($params.globalScale \|\| 1)` | Access global simulation parameters |
| `$iteration` | `$iteration Demo` | `$inputs.value + ($iteration % 10)` | Current Monte Carlo iteration (0, 1, 2...) |
| `$time` | `$time Demo` | `$inputs.value * (1 + 0.01 * $time)` | Simulation time step (for time-series) |

**Final combined expression:**
```javascript
$inputs.avg * ($node.weight || 1) * ($params.globalScale || 1) + $iteration * 0.001 + $time * 0.01
```

**How to explore:**
1. Load the **Expression Variables Demo** sample graph
2. Click the **"$node Demo"** transformer node in the canvas
3. Look at the **Properties Panel** (right side) → scroll to the **"Custom Data Fields"** section
4. You'll see `bonus: 50` - this is what `$node.bonus` refers to in the expression!
5. Similarly, click **"All Variables Used"** node to see `weight: 1.5` in Custom Data
6. Run **Single Run** first - `$iteration` = 0, `$time` = 0
7. Run **Monte Carlo** with 100 iterations - see how `$iteration` creates variance
8. Click each transformer node to see its expression and custom fields

**Visual guide to $node variable:**
```
When you click "$node Demo" transformer:
┌─ Properties Panel ──────────────────┐
│ Expression:                          │
│ $inputs.value + ($node.bonus || 0)   │
│                                      │
│ ▼ Custom Data Fields                 │
│   (accessible via $node.fieldName)   │
│                                      │
│   bonus                              │
│   [50                            ] ✕ │ ← This is $node.bonus!
└──────────────────────────────────────┘
```

**Key insight:** Each variable serves a different purpose:
- `$inputs` = dynamic data flow from connected nodes (changes per execution)
- `$node` = static configuration stored in the node itself (set once, read many times)
- `$params` = global settings shared across all nodes (simulation-wide config)
- `$iteration` = which Monte Carlo run (for iteration-dependent randomness)
- `$time` = time step (for temporal/sequential simulations)

---

### 12. Multi-Dimensional Data Model (Advanced)
**Purpose:** Demonstrate hierarchical data structures with nested `$params` and `$node` configurations.

This sample showcases the **multi-dimensional data model** - data can be nested arbitrarily deep, enabling complex real-world scenarios.

**Key Features Demonstrated:**

#### Hierarchical $params (Global)
Click the **"$params"** tab to see the global configuration:
```javascript
$params = {
  jurisdiction: 'US',                     // Simple value
  taxes: {                                // Nested object
    US: { rate: 0.21, name: 'US Federal' },
    EU: { rate: 0.25, name: 'EU Average' }
  },
  market: {
    seasonality: { Q1: 0.9, Q2: 1.0, Q3: 1.1, Q4: 1.3 },
    growth: { 2024: 0.05, 2025: 0.07 }
  },
  scenarios: {
    base: { multiplier: 1.0 },
    optimistic: { multiplier: 1.25 }
  }
}
```

**Access patterns:**
- `$params.jurisdiction` → `'US'`
- `$params.taxes.US.rate` → `0.21`
- `$params.taxes[$params.jurisdiction].rate` → dynamic lookup!
- `$params.market.seasonality.Q4` → `1.3`

#### Hierarchical $node (Per-Node)
Each node can have deeply nested custom data:
```javascript
// Regional Pricing node
$node = {
  regions: {
    US: { priceMultiplier: 1.0, taxRate: 0.08 },
    EU: { priceMultiplier: 1.15, taxRate: 0.20 },
    APAC: { priceMultiplier: 0.95, taxRate: 0.10 }
  },
  activeRegion: 'US'
}

// Expression uses nested access:
$inputs.base * $node.regions[$node.activeRegion].priceMultiplier
```

#### Array Access in Nested Structures
```javascript
// Tiered Discount node
$node.tiers = [
  { minQty: 0, discount: 0 },
  { minQty: 500, discount: 0.05 },
  { minQty: 1000, discount: 0.10 }
]

// Expression with array indexing:
$inputs.qty >= $node.tiers[2].minQty ? $node.tiers[2].discount : ...
```

**How to Explore:**
1. Load the **Multi-Dimensional Data Model** sample
2. Click **"$params"** tab → see the hierarchical global config
3. Click **"Regional Pricing"** node → see nested `regions` object
4. Click **"Tiered Discount"** node → see `tiers` array
5. Modify `$params.jurisdiction` to `'EU'` or `'UK'` and re-run
6. Modify `$params.activeScenario` to `'optimistic'` and see profit change

**Use Cases:**
- Multi-region financial models
- Configurable tax/regulatory scenarios
- Tiered pricing structures
- Seasonal adjustments
- Scenario analysis (base/optimistic/pessimistic)

---

## Understanding Expression Syntax

All Transformer nodes use JavaScript-like expressions:

```javascript
// Access inputs by name
$inputs.value1 + $inputs.value2

// Math operations
$inputs.x * $inputs.y / 100

// Built-in Math functions
Math.pow($inputs.base, $inputs.exp)
Math.sqrt($inputs.variance)
Math.log($inputs.ratio)
Math.exp($inputs.rate)
Math.abs($inputs.delta)
Math.max($inputs.a, $inputs.b)
Math.min($inputs.a, $inputs.b)

// Ternary conditions (Decision nodes)
$inputs.value > 100 ? $inputs.high : $inputs.low
```

## Data Storage

- All graphs are stored in **browser localStorage** under the key `scenarioforge-graphs`
- Data persists across browser sessions
- Export/import functionality can be added if needed
- Each graph includes node/edge definitions, configuration, and timestamps

## Project Structure

```
apps/web/               # React 18 + TypeScript frontend
├── src/
│   ├── components/     # React components
│   ├── stores/         # Zustand state management
│   ├── App.tsx         # Main app layout
│   └── main.tsx        # Entry point
├── dist/               # Build output
└── vite.config.ts      # Vite configuration

apps/api/               # Node.js + Express backend (optional)
├── src/
│   ├── controllers/    # API endpoints
│   ├── services/       # Business logic
│   └── db/             # Database setup
└── tsconfig.json

packages/core/          # Shared simulation & graph logic
├── src/
│   ├── graph/          # Graph utilities
│   ├── simulation/      # Simulation engine
│   ├── expression/      # Expression evaluator
│   ├── risk/           # Risk metrics
│   └── types/          # TypeScript types
└── dist/               # Compiled output
```

## Available Commands

```bash
# Development
pnpm dev              # Start all services
pnpm dev:web          # Frontend only
pnpm dev:api          # Backend only

# Build
pnpm build            # Build all packages
pnpm typecheck        # TypeScript validation

# Testing
pnpm test             # Run all tests
pnpm test:unit        # Unit tests only
pnpm test:e2e         # E2E tests only

# Database (if using backend)
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed sample data
pnpm db:reset         # Reset database
```

## Technology Stack

**Frontend:**
- React 18.3.1
- TypeScript 5.6.3
- Vite 6.4.1
- React Flow 11.11.4
- Zustand 5.0.1
- Tailwind CSS 3.4.15

**Backend (Optional):**
- Node.js + Express 4.21.1
- PostgreSQL + TimescaleDB
- Redis (caching)

**Core Libraries:**
- json-schema validation
- Vitest (testing)
- Playwright (E2E testing)

## Features in Detail

### Graph Execution
1. **Validation** - Ensures no invalid cycles
2. **Topological Sort** - Determines execution order
3. **Node Execution** - Runs compute functions in order
4. **Output Collection** - Gathers results from OUTPUT nodes

### Expression Engine
- **Sandboxed evaluation** - Safe execution of user expressions
- **Rich context** - Access to inputs, node data, simulation state
- **Type-safe** - Validates expressions before execution

### Monte Carlo Simulation
- **Random sampling** - Each iteration samples distributions independently
- **Statistical analysis** - Calculates percentiles, VaR, CVaR
- **Progress tracking** - Shows real-time simulation progress
- **Configurable** - Control iterations, seed, confidence levels

### Risk Metrics
- **Value at Risk (VaR)** - Potential loss at confidence level
- **Conditional VaR** - Expected loss in tail scenarios
- **Percentiles** - Distribution breakdown (P5, P25, P75, P95)
- **Moments** - Mean, median, std dev, skewness

## Troubleshooting

**No nodes appearing when I drag?**
- Ensure you've selected a graph first
- Check browser console for errors (F12)
- Try refreshing the page

**Edges not connecting?**
- Make sure source node has output ports
- Make sure target node has input ports
- Try dragging from the exact port area

**Simulation running slow?**
- Reduce iteration count
- Check for expensive expressions in transformers
- Close other tabs to free up memory

**Out of Memory errors?**
- Reduce simulation iterations (try 10k instead of 100k)
- Check [docs/MEMORY_CONFIGURATION.md](docs/MEMORY_CONFIGURATION.md) for tuning options
- Monitor memory usage via `/health` endpoint
- Consider increasing Node.js heap size: `node --max-old-space-size=4096`

**Data disappeared?**
- Check browser localStorage (DevTools > Application > Storage)
- Try importing the graph if you have a backup
- LocalStorage has ~5-10MB limit per domain

## Development & Extension

To add a new node type:
1. Register in `packages/core/src/graph/nodeTypeRegistry.ts`
2. Create UI component in `apps/web/src/components/nodes/`
3. Add to palette in `apps/web/src/components/panels/NodePalette.tsx`

To add custom metrics:
1. Implement in `packages/core/src/risk/metrics.ts`
2. Display in `apps/web/src/components/panels/SimulationPanel.tsx`

## Performance Characteristics

- **Small graphs** (< 50 nodes) - Instantaneous
- **Medium graphs** (50-500 nodes) - <500ms execution
- **Large graphs** (500-1000+ nodes) - Virtualized rendering
- **Monte Carlo** - 10,000 iterations on typical model < 5 seconds

### Memory Resilience

ScenarioForge is designed to handle large-scale simulations efficiently:

- **Streaming aggregation** - Uses reservoir sampling to limit memory usage
- **Configurable limits** - Max iterations, execution time, and memory usage
- **Resource monitoring** - Health check endpoint reports memory usage
- **Database optimization** - TimescaleDB compression and pagination for results
- **Connection pooling** - Limited pool size prevents resource exhaustion

See [docs/MEMORY_CONFIGURATION.md](docs/MEMORY_CONFIGURATION.md) for detailed configuration guidance.

#### Default Limits

- Max simulation iterations: 1,000,000
- Max execution time: 5 minutes
- Max stored results per simulation: 100,000 samples
- Database connection pool: 20 connections
- Request timeout: 2 minutes

These limits can be configured via environment variables in `apps/api/.env` (see `.env.example`).

## Limitations

- Single-user local deployment (no multi-user/sharing)
- Browser localStorage limited to ~5-10MB
- No persistent database (data lost if localStorage cleared)
- Backend integration optional (frontend works standalone)

## Future Enhancements

- [ ] Graph export/import (JSON, CSV)
- [ ] Sensitivity analysis
- [ ] Optimization algorithms
- [ ] Collaboration features
- [ ] Custom node plugins
- [ ] Batch simulations
- [ ] Results caching and comparison

## Support

For bugs, feature requests, or questions:
1. Check the code comments in `packages/core/src/`
2. Review TypeScript type definitions in `packages/core/src/types/`
3. Examine test files for usage examples in `packages/core/__tests__/`

## License

MIT License - See LICENSE file for details
