# ScenarioForge - Copilot Instructions

## Project Overview
ScenarioForge is a **domain-agnostic** graph-based modeling, simulation, and optimization platform. Users define their own data models via flexible node/edge schemas, then run Monte Carlo simulations, measure risk, and optimize parameters. Single-user local deployment.

## Architecture Quick Reference

```
apps/web/         → React 18 + TypeScript frontend (Vite)
apps/api/         → Node.js + Express/Fastify backend
packages/core/    → Shared graph, expression, simulation logic
packages/ui/      → Shared component library
packages/config/  → ESLint, TypeScript, Prettier configs
```

**Data Flow**: React Flow canvas → Zustand stores → REST/WebSocket API → Service layer → PostgreSQL (graphs) + TimescaleDB (results) + Redis (cache)

**Local Stack**: All services run via Docker Compose. No authentication required.

## Critical Patterns

### Domain-Agnostic Design Principle
The system has **no built-in domain knowledge**. Users define:
- Node schemas via JSON Schema (any fields, any types)
- Relationships via edge data models
- Objectives by pointing to any output node field
- Constraints as expressions over any node data

Never hardcode domain concepts (finance, supply chain, etc.) into core logic.

### Graph Data Model
Nodes and edges use **JSON Schema** for flexible, validated data:
```typescript
// Every node/edge follows this pattern
interface NodeDefinition {
  id: string;
  type: NodeType;               // Extensible registry
  schema: JSONSchema;           // Structure definition
  data: Record<string, any>;    // Actual values
  inputPorts: Port[];
  outputPorts: Port[];
}
```

### Node Type Registration
New node types must be registered in the **NodeTypeRegistry**:
```typescript
// packages/core/src/graph/nodeTypeRegistry.ts
registry.register({
  type: 'MY_NODE',
  category: 'transformers',
  defaultSchema: { /* JSON Schema */ },
  computeFunction: (inputs, data) => { /* return outputs */ },
  inputPortDefinitions: [...],
  outputPortDefinitions: [...]
});
```

### Expression Engine
User expressions use a sandboxed evaluator with specific variable context:
- `$node` - Current node data
- `$inputs` - Values from input ports
- `$params` - Global simulation parameters
- `$time`, `$iteration` - Simulation context

**Never** use `eval()` or `Function()` directly. Use `packages/core/src/expression/evaluator.ts`.

### Simulation Execution Pattern
```typescript
// Execution follows topological sort order
1. validateGraph(graph)           // Check for invalid cycles
2. sortTopologically(graph)       // Determine execution order
3. executeNode(node, inputValues) // Run compute function
4. collectOutputs(outputNodes)    // Aggregate results
```

## Code Conventions

### TypeScript
- **Strict mode** enabled everywhere - no `any` unless absolutely necessary
- Prefer `interface` over `type` for object shapes
- Use discriminated unions for node/edge types
- All API responses typed with shared interfaces from `packages/core/src/types/`

### File Naming
- Components: `PascalCase.tsx` (e.g., `NodeEditor.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useGraphStore.ts`)
- Services: `camelCase.service.ts` (e.g., `simulation.service.ts`)
- Types: `camelCase.types.ts` or co-located

### State Management
- **Zustand** for client state (`apps/web/src/stores/`)
- **React Query** for server state caching
- Graph state lives in `useGraphStore` - never mutate directly, use actions

### Database
- PostgreSQL with **JSONB** for flexible schema storage
- **TimescaleDB** hypertables for simulation results (time-series)
- Always use parameterized queries via the ORM

## Key Files to Know

| Purpose | Location |
|---------|----------|
| Graph store | `apps/web/src/stores/graphStore.ts` |
| Node type registry | `packages/core/src/graph/nodeTypeRegistry.ts` |
| Expression evaluator | `packages/core/src/expression/evaluator.ts` |
| Simulation engine | `apps/api/src/services/simulation/engine.ts` |
| Risk calculations | `apps/api/src/services/risk/metrics.ts` |
| Graph canvas | `apps/web/src/components/canvas/GraphCanvas.tsx` |
| API routes | `apps/api/src/controllers/` |
| DB migrations | `apps/api/src/db/migrations/` |

## Commands

```bash
# Local Development
pnpm dev              # Start all apps in dev mode
pnpm dev:web          # Frontend only (localhost:5173)
pnpm dev:api          # Backend only (localhost:3000)

# Testing
pnpm test             # Run all tests
pnpm test:unit        # Unit tests (Vitest)
pnpm test:e2e         # E2E tests (Playwright)

# Build
pnpm build            # Build all packages
pnpm typecheck        # TypeScript validation

# Database
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed sample data
pnpm db:reset         # Reset and re-seed

# Local Infrastructure
docker-compose up -d  # Start PostgreSQL, Redis, TimescaleDB locally
docker-compose down   # Stop all services
```

## Common Tasks

### Adding a New Node Type
1. Define schema in `packages/core/src/graph/nodeTypes/`
2. Register in `nodeTypeRegistry.ts`
3. Create UI component in `apps/web/src/components/nodes/`
4. Add to node palette in `apps/web/src/components/panels/NodePalette.tsx`

### Adding a New API Endpoint
1. Create controller in `apps/api/src/controllers/`
2. Add service logic in `apps/api/src/services/`
3. Register route in `apps/api/src/routes/`
4. Add types to `packages/core/src/types/api.types.ts`

### Adding Simulation Metrics
1. Implement calculation in `apps/api/src/services/risk/`
2. Add to `RiskMetrics` interface in `packages/core/src/types/`
3. Create visualization in `apps/web/src/components/charts/`

## Testing Requirements

- Unit tests for all `packages/core/` functions
- Integration tests for API endpoints
- E2E tests for critical user flows (create graph → run simulation → view results)
- Expression evaluator must have exhaustive tests (security-critical)

## Performance Considerations

- Graphs can have 1000+ nodes - virtualize rendering in canvas
- Monte Carlo runs 100k+ iterations - use Web Workers for frontend, BullMQ workers for backend
- Simulation results are large - stream via SSE, paginate queries
- Use Redis caching for repeated graph reads during simulation

## Security Notes

- **Expression sandboxing**: Never execute arbitrary user code outside the evaluator sandbox
- **Input validation**: All node/edge data validated against JSON Schema before storage
- **SQL injection**: Use parameterized queries only
- **Resource limits**: Simulations have timeout and memory caps in worker config
