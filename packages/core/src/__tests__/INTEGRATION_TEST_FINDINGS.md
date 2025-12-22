# ScenarioForge Integration Test Findings

## Test Analysis Date: December 20, 2025

This document captures the architectural findings discovered through comprehensive integration testing.
The failing tests reveal gaps between documented/expected behavior and actual implementation.

---

## Category 1: Graph Module API Gaps

### 1.1 Missing Helper Functions

**Issue:** Tests expect utility functions that don't exist in the public API

| Expected Function | Actual State | Recommendation |
|-------------------|--------------|----------------|
| `getNodeById(graph, id)` | NOT EXPORTED | Add to graph/index.ts |
| `hasCycle(graph)` | Named `detectCycle` | Add alias export |
| `findCycles(graph)` | NOT IMPLEMENTED | Implement - returns cycle paths |

**Architecture Impact:** These are fundamental graph operations that should be part of the core API.

### 1.2 `exportGraph` Returns Object, Not String

**Expected:** `exportGraph(graph)` returns JSON string ready for storage/transfer
**Actual:** Returns `GraphExport` object `{ version, exportedAt, graph }`

**Analysis:** The implementation provides a structured object, delegating serialization to the caller.
This is a design decision, but the function name `exportGraph` implies something ready for export.

**Options:**
1. Rename to `createGraphExport()` and add `exportGraphToJSON()` for string output
2. Keep current behavior and document it clearly
3. Change to return JSON string (breaking change)

---

## Category 2: Expression Evaluator Design

### 2.1 No `Math.` Prefix Support

**Expected:** `Math.sin(x)`, `Math.sqrt(x)`, etc.
**Actual:** Direct function calls: `sin(x)`, `sqrt(x)`, etc.

**This is CORRECT security design:**
- Sandboxed evaluator should NOT expose global objects
- Functions are explicitly whitelisted in the evaluator
- Tests using `Math.` prefix are incorrect

### 2.2 Type Coercion Behavior

**Expected:** `"10" + 5` = `"105"` (JavaScript string concatenation)
**Actual:** `"10" + 5` = `15` (numeric addition)

**Analysis:** The expression evaluator coerces strings to numbers for arithmetic.
This is intentional for a financial/simulation context where numeric operations dominate.

---

## Category 3: Feedback Loop Module

### 3.1 `applyFeedbackTransform` Return Type

**Expected (by tests):** Returns just the transformed number
**Actual:** Returns `{ value: unknown; newState: Partial<FeedbackState> }`

**This is CORRECT design:**
- PID controllers need to update integral/derivative state
- State changes must be explicit and trackable
- Enables proper state management without side effects

### 3.2 Missing/Renamed Functions

| Test Used | Actual Name | Status |
|-----------|-------------|--------|
| `updateFeedbackHistory` | Internal function | Should be exposed or use `processFeedbackLoop` |
| `getFeedbackValue` | `getFeedbackInjection` | Different signature |
| `processFeedbackLoops` | `processAllFeedbackLoops` | Name mismatch |

### 3.3 `checkGlobalConvergence` Logic

**Test expectation:** Returns false if ANY loop hasn't converged
**Actual implementation:** Need to verify actual logic

---

## Category 4: Subgraph Module

### 4.1 Type Mismatch: Graph vs HierarchicalGraph

**Critical Issue:** Many subgraph functions expect `HierarchicalGraph` but tests pass `Graph`

`HierarchicalGraph` extends `Graph` with required properties:
- `exposedInputPorts: ExposedPort[]`
- `exposedOutputPorts: ExposedPort[]`
- `feedbackLoops: FeedbackLoop[]`
- `depth: number`
- `executionScope: ExecutionScope`

**Tests failing because:**
```typescript
validateSubgraphStructure(graph)  // graph is Graph, needs HierarchicalGraph
getHierarchyDepth(graph, ...)    // Same issue
```

**Recommendation:** Create test helpers that construct proper `HierarchicalGraph` objects.

---

## Category 5: Simulation Engine

### 5.1 `runSensitivityAnalysis` Parameter Requirements

**Function Signature:**
```typescript
runSensitivityAnalysis(
  graph: Graph,
  parameterNodeId: string,
  parameterField: string,
  outputNodeId: string,
  outputField: string,
  range: [number, number],  // REQUIRED
  steps?: number
)
```

Tests were not providing `range` parameter, causing `range[1] - range[0]` to fail.

### 5.2 Monte Carlo Progress Callback

**Expected (by tests):** `onProgress(number)` - just progress percentage
**Actual:** `onProgress(SimulationProgress)` - full progress object

```typescript
interface SimulationProgress {
  simulationId: string;
  status: string;
  progress: number;        // <-- This is what tests expected
  currentIteration: number;
  totalIterations: number;
  startedAt: Date;
}
```

### 5.3 Distribution Node Sampling

**Test expectation:** Setting seed produces exact deterministic values
**Actual:** Seed affects PRNG state, but exact values depend on graph execution order

**Recommendation:** Tests should check statistical properties, not exact values.

---

## Category 6: Test Infrastructure Issues

### 6.1 Test Utility Naming

Tests reference functions that don't exist in test-utils:
- `createRandomNode` - Added as alias for `createDistributionNode`
- Need consistent naming across test files

### 6.2 Graph Structure Helpers Needed

Need helpers to create properly structured test objects:
- `createHierarchicalGraph()` - with all required fields
- `createExposedPort()` - for subgraph boundary tests
- `createExecutionScope()` - with valid defaults

---

## Recommendations Summary

### High Priority (Blocking Tests)
1. Add missing graph helper functions (`getNodeById`, `findCycles`)
2. Create `HierarchicalGraph` test factory
3. Fix test expectations for `applyFeedbackTransform` return type
4. Fix expression syntax in tests (remove `Math.` prefix)

### Medium Priority (API Improvements)
1. Export `hasCycle` as alias for `detectCycle`
2. Add `exportGraphToJSON()` function
3. Document feedback module function names
4. Add type guards for `Graph` vs `HierarchicalGraph`

### Low Priority (Documentation)
1. Document expression evaluator function list
2. Document `SimulationProgress` callback structure
3. Add examples for hierarchical graph creation

---

## Test Categories Status

| Category | Passing | Failing | Root Cause |
|----------|---------|---------|------------|
| Core Graph | ~80% | ~20% | Missing helper functions |
| Expression | ~90% | ~10% | Math. prefix usage |
| Simulation | ~60% | ~40% | API parameter mismatches |
| Feedback | ~50% | ~50% | Return type expectations |
| Subgraph | ~30% | ~70% | HierarchicalGraph type |
| E2E Workflows | ~40% | ~60% | Multiple issues |
