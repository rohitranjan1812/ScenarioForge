// Nested Graph Registry - Provides nested subgraphs for demo samples
// This handles the case where graphs are loaded from localStorage and don't have
// the full nested graph objects (which are too large to persist)
import type { Graph, NodeDefinition, EdgeDefinition, DataType } from '@scenarioforge/core';

let idCounter = 5000;
function genId(prefix: string): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

function node(
  type: NodeDefinition['type'], name: string, x: number, y: number,
  data: Record<string, unknown> = {},
  inputs: string[] = [], outputs: string[] = []
): NodeDefinition {
  const now = new Date();
  return {
    id: genId('node'), type, name, position: { x, y },
    schema: { type: 'object', properties: {} }, data,
    inputPorts: inputs.map(n => ({ id: genId('p'), name: n, dataType: 'number' as DataType, required: true, multiple: false })),
    outputPorts: outputs.map(n => ({ id: genId('p'), name: n, dataType: 'number' as DataType, required: false, multiple: true })),
    tags: [], locked: false, createdAt: now, updatedAt: now,
  };
}

function edge(src: NodeDefinition, tgt: NodeDefinition, srcIdx = 0, tgtIdx = 0): EdgeDefinition {
  const now = new Date();
  return {
    id: genId('e'), sourceNodeId: src.id, targetNodeId: tgt.id,
    sourcePortId: src.outputPorts[srcIdx]?.id ?? '', targetPortId: tgt.inputPorts[tgtIdx]?.id ?? '',
    type: 'DATA_FLOW', schema: { type: 'object' }, data: {}, style: {}, animated: false,
    createdAt: now, updatedAt: now,
  };
}

function graph(name: string, desc: string, nodes: NodeDefinition[], edges: EdgeDefinition[]): Graph {
  const now = new Date();
  return { id: genId('g'), name, description: desc, nodes, edges, metadata: {}, version: 1, createdAt: now, updatedAt: now };
}

// Create profit calculator subgraph
function createProfitCalculatorSubgraph(): Graph {
  idCounter = 6000; // Reset to avoid ID collisions
  
  // Input nodes (exposed ports)
  const revenueIn = node('DATA_SOURCE', '📥 Revenue Input', 50, 100, 
    { isExposedPort: true, portName: 'revenue' }, [], ['value']);
  const costsIn = node('DATA_SOURCE', '📥 Costs Input', 50, 250, 
    { isExposedPort: true, portName: 'costs' }, [], ['value']);
  
  // Calculation nodes
  const grossProfit = node('TRANSFORMER', '➖ Gross Profit', 250, 150, 
    { expression: '$inputs.revenue - $inputs.costs' }, ['revenue', 'costs'], ['profit']);
  const profitMargin = node('TRANSFORMER', '📊 Profit Margin %', 450, 150, 
    { expression: '($inputs.profit / $inputs.revenue) * 100' }, ['profit', 'revenue'], ['margin']);
  
  // Output nodes (exposed ports)
  const profitOut = node('OUTPUT', '📤 Gross Profit', 650, 100, 
    { isExposedPort: true, portName: 'grossProfit' }, ['value'], []);
  const marginOut = node('OUTPUT', '📤 Profit Margin', 650, 250, 
    { isExposedPort: true, portName: 'profitMargin' }, ['value'], []);

  const nodes = [revenueIn, costsIn, grossProfit, profitMargin, profitOut, marginOut];
  const edges = [
    edge(revenueIn, grossProfit, 0, 0),
    edge(costsIn, grossProfit, 0, 1),
    edge(grossProfit, profitMargin, 0, 0),
    edge(revenueIn, profitMargin, 0, 1),
    edge(grossProfit, profitOut, 0, 0),
    edge(profitMargin, marginOut, 0, 0),
  ];

  const g = graph('📦 Profit Calculator', 'Calculates gross profit and profit margin from revenue and costs', nodes, edges);
  g.id = 'profit-calc-subgraph';
  return g;
}

// Create growth projector subgraph
function createGrowthProjectorSubgraph(): Graph {
  idCounter = 7000; // Reset to avoid ID collisions
  
  // Input nodes (exposed ports)
  const baseValueIn = node('DATA_SOURCE', '📥 Base Value', 50, 100, 
    { isExposedPort: true, portName: 'baseValue' }, [], ['value']);
  const growthRateIn = node('DATA_SOURCE', '📥 Growth Rate', 50, 300, 
    { isExposedPort: true, portName: 'growthRate' }, [], ['rate']);
  
  // Projection nodes
  const year1 = node('TRANSFORMER', '📅 Year 1', 250, 50, 
    { expression: '$inputs.base * (1 + $inputs.rate / 100)' }, ['base', 'rate'], ['projected']);
  const year3 = node('TRANSFORMER', '📅 Year 3', 250, 200, 
    { expression: '$inputs.base * Math.pow(1 + $inputs.rate / 100, 3)' }, ['base', 'rate'], ['projected']);
  const year5 = node('TRANSFORMER', '📅 Year 5', 250, 350, 
    { expression: '$inputs.base * Math.pow(1 + $inputs.rate / 100, 5)' }, ['base', 'rate'], ['projected']);
  
  // Output nodes (exposed ports)
  const year1Out = node('OUTPUT', '📤 Year 1 Projection', 450, 50, 
    { isExposedPort: true, portName: 'year1' }, ['value'], []);
  const year3Out = node('OUTPUT', '📤 Year 3 Projection', 450, 200, 
    { isExposedPort: true, portName: 'year3' }, ['value'], []);
  const year5Out = node('OUTPUT', '📤 Year 5 Projection', 450, 350, 
    { isExposedPort: true, portName: 'year5' }, ['value'], []);

  const nodes = [baseValueIn, growthRateIn, year1, year3, year5, year1Out, year3Out, year5Out];
  const edges = [
    edge(baseValueIn, year1, 0, 0), edge(growthRateIn, year1, 0, 1),
    edge(baseValueIn, year3, 0, 0), edge(growthRateIn, year3, 0, 1),
    edge(baseValueIn, year5, 0, 0), edge(growthRateIn, year5, 0, 1),
    edge(year1, year1Out, 0, 0),
    edge(year3, year3Out, 0, 0),
    edge(year5, year5Out, 0, 0),
  ];

  const g = graph('📦 Growth Projector', 'Projects compound growth over 1, 3, and 5 years', nodes, edges);
  g.id = 'growth-proj-subgraph';
  return g;
}

// Map of demo sample names to their nested graph generators
const demoNestedGraphs: Record<string, () => Record<string, Graph>> = {
  '🆕 Simple Subgraph Demo': () => ({
    'profit-calc-subgraph': createProfitCalculatorSubgraph(),
    'growth-proj-subgraph': createGrowthProjectorSubgraph(),
  }),
  '🏢 3-Level Hierarchy Demo': () => createThreeLevelHierarchy(),
};

// ============================================================================
// 3-LEVEL HIERARCHY DEMO
// Root -> 3 Departments -> 3 Teams each -> Flat calculations
// ============================================================================

function createThreeLevelHierarchy(): Record<string, Graph> {
  const result: Record<string, Graph> = {};
  
  // Level 2: Department subgraphs (3 departments)
  const departments = ['sales', 'engineering', 'marketing'];
  const deptNames = ['Sales Dept', 'Engineering Dept', 'Marketing Dept'];
  const deptIcons = ['💼', '⚙️', '📣'];
  
  for (let d = 0; d < 3; d++) {
    const deptId = departments[d];
    const deptName = deptNames[d];
    const deptIcon = deptIcons[d];
    
    // Create department subgraph
    idCounter = 8000 + d * 1000;
    result[`dept-${deptId}`] = createDepartmentSubgraph(deptId, deptName, deptIcon);
    
    // Level 3: Team subgraphs (3 teams per department)
    const teams = ['alpha', 'beta', 'gamma'];
    const teamNames = ['Alpha Team', 'Beta Team', 'Gamma Team'];
    
    for (let t = 0; t < 3; t++) {
      const teamId = `${deptId}-${teams[t]}`;
      idCounter = 8000 + d * 1000 + (t + 1) * 100;
      result[`team-${teamId}`] = createTeamSubgraph(teamId, `${deptName} ${teamNames[t]}`);
    }
  }
  
  return result;
}

function createDepartmentSubgraph(deptId: string, deptName: string, icon: string): Graph {
  // Input
  const budgetIn = node('DATA_SOURCE', '📥 Budget Input', 50, 200, 
    { isExposedPort: true }, [], ['value']);
  
  // 3 Team subgraphs
  const team1 = node('SUBGRAPH', `${icon} Alpha Team`, 250, 50, 
    { subgraphId: `team-${deptId}-alpha`, nodeCount: 5 }, ['budget'], ['output']);
  const team2 = node('SUBGRAPH', `${icon} Beta Team`, 250, 200, 
    { subgraphId: `team-${deptId}-beta`, nodeCount: 5 }, ['budget'], ['output']);
  const team3 = node('SUBGRAPH', `${icon} Gamma Team`, 250, 350, 
    { subgraphId: `team-${deptId}-gamma`, nodeCount: 5 }, ['budget'], ['output']);
  
  // Aggregator
  const totalOutput = node('AGGREGATOR', '∑ Dept Total', 450, 200, 
    { operation: 'sum', expression: '$inputs.a + $inputs.b + $inputs.c' }, ['a', 'b', 'c'], ['total']);
  
  // Output
  const deptOut = node('OUTPUT', '📤 Dept Output', 600, 200, 
    { isExposedPort: true }, ['value'], []);

  const nodes = [budgetIn, team1, team2, team3, totalOutput, deptOut];
  const edges = [
    edge(budgetIn, team1, 0, 0),
    edge(budgetIn, team2, 0, 0),
    edge(budgetIn, team3, 0, 0),
    edge(team1, totalOutput, 0, 0),
    edge(team2, totalOutput, 0, 1),
    edge(team3, totalOutput, 0, 2),
    edge(totalOutput, deptOut, 0, 0),
  ];

  const g = graph(`📦 ${deptName}`, `Department containing 3 teams`, nodes, edges);
  g.id = `dept-${deptId}`;
  return g;
}

function createTeamSubgraph(teamId: string, teamName: string): Graph {
  // Input
  const budgetIn = node('DATA_SOURCE', '📥 Team Budget', 50, 150, 
    { isExposedPort: true }, [], ['value']);
  
  // Simple calculation nodes (flat graph)
  const efficiency = node('PARAMETER', '⚡ Efficiency', 50, 50, 
    { value: 0.8, min: 0.5, max: 1.0 }, [], ['value']);
  
  const productivity = node('TRANSFORMER', '📊 Productivity', 250, 100, 
    { expression: '$inputs.budget * $inputs.efficiency' }, ['budget', 'efficiency'], ['output']);
  
  const overhead = node('TRANSFORMER', '💰 Overhead (10%)', 250, 200, 
    { expression: '$inputs.budget * 0.1' }, ['budget'], ['cost']);
  
  const netOutput = node('TRANSFORMER', '✨ Net Output', 400, 150, 
    { expression: '$inputs.prod - $inputs.overhead' }, ['prod', 'overhead'], ['net']);
  
  // Output
  const teamOut = node('OUTPUT', '📤 Team Output', 550, 150, 
    { isExposedPort: true }, ['value'], []);

  const nodes = [budgetIn, efficiency, productivity, overhead, netOutput, teamOut];
  const edges = [
    edge(budgetIn, productivity, 0, 0),
    edge(efficiency, productivity, 0, 1),
    edge(budgetIn, overhead, 0, 0),
    edge(productivity, netOutput, 0, 0),
    edge(overhead, netOutput, 0, 1),
    edge(netOutput, teamOut, 0, 0),
  ];

  const g = graph(`📦 ${teamName}`, `Team with efficiency and overhead calculations`, nodes, edges);
  g.id = `team-${teamId}`;
  return g;
}

/**
 * Creates nested graphs for a known demo sample.
 * This is used when a graph is loaded from localStorage and doesn't have
 * the full nested graph objects in its metadata.
 */
export function createNestedGraphsForDemo(graphName: string): Record<string, Graph> {
  const generator = demoNestedGraphs[graphName];
  if (generator) {
    console.log('Creating nested graphs for demo:', graphName);
    return generator();
  }
  return {};
}

/**
 * Check if a graph name is a known demo with nested graphs
 */
export function isDemoWithNestedGraphs(graphName: string): boolean {
  return graphName in demoNestedGraphs;
}
