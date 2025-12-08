// Sample Graphs - Pre-built examples showcasing all node types and features
import type { Graph, NodeDefinition, EdgeDefinition, DataType } from '@scenarioforge/core';
import { getAdvancedSampleGraphs, advancedSampleDescriptions } from './advancedSamples';

// Helper to generate unique IDs
let idCounter = 0;
function genId(prefix: string): string {
  return `${prefix}-${++idCounter}-${Date.now().toString(36)}`;
}

function createNode(
  type: NodeDefinition['type'],
  name: string,
  position: { x: number; y: number },
  data: Record<string, unknown> = {},
  inputPorts: Array<{ name: string; dataType: DataType }> = [],
  outputPorts: Array<{ name: string; dataType: DataType }> = []
): NodeDefinition {
  const now = new Date();
  return {
    id: genId('node'),
    type,
    name,
    position,
    schema: { type: 'object', properties: {} },
    data,
    inputPorts: inputPorts.map((p) => ({
      id: genId('port'),
      name: p.name,
      dataType: p.dataType,
      required: true,
      multiple: false,
    })),
    outputPorts: outputPorts.map((p) => ({
      id: genId('port'),
      name: p.name,
      dataType: p.dataType,
      required: false,
      multiple: true,
    })),
    tags: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

function createEdge(
  sourceNode: NodeDefinition,
  targetNode: NodeDefinition,
  sourcePortIndex = 0,
  targetPortIndex = 0
): EdgeDefinition {
  const now = new Date();
  return {
    id: genId('edge'),
    sourceNodeId: sourceNode.id,
    sourcePortId: sourceNode.outputPorts[sourcePortIndex]?.id ?? genId('port'),
    targetNodeId: targetNode.id,
    targetPortId: targetNode.inputPorts[targetPortIndex]?.id ?? genId('port'),
    type: 'DATA_FLOW',
    schema: { type: 'object' },
    data: {},
    style: {},
    animated: false,
    createdAt: now,
    updatedAt: now,
  };
}

function createGraph(
  name: string,
  description: string,
  nodes: NodeDefinition[],
  edges: EdgeDefinition[]
): Graph {
  const now = new Date();
  return {
    id: genId('graph'),
    name,
    description,
    nodes,
    edges,
    metadata: {},
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================
// SAMPLE 1: Supply Chain Cost Model
// ============================================
function createSupplyChainModel(): Graph {
  // Input nodes
  const fixedCosts = createNode(
    'CONSTANT',
    'Fixed Costs',
    { x: 50, y: 100 },
    { value: 50000 },
    [],
    [{ name: 'value', dataType: 'number' }]
  );

  const unitCost = createNode(
    'PARAMETER',
    'Unit Cost',
    { x: 50, y: 200 },
    { min: 15, max: 25, default: 20 },
    [],
    [{ name: 'value', dataType: 'number' }]
  );

  const demand = createNode(
    'DISTRIBUTION',
    'Monthly Demand',
    { x: 50, y: 300 },
    { distributionType: 'normal', mean: 5000, stddev: 800 },
    [],
    [{ name: 'sample', dataType: 'number' }]
  );

  const shippingRate = createNode(
    'DISTRIBUTION',
    'Shipping Rate',
    { x: 50, y: 400 },
    { distributionType: 'uniform', min: 2, max: 5 },
    [],
    [{ name: 'sample', dataType: 'number' }]
  );

  // Transform nodes
  const variableCost = createNode(
    'TRANSFORMER',
    'Variable Costs',
    { x: 300, y: 200 },
    { expression: '$inputs.unitCost * $inputs.demand' },
    [
      { name: 'unitCost', dataType: 'number' },
      { name: 'demand', dataType: 'number' },
    ],
    [{ name: 'result', dataType: 'number' }]
  );

  const shippingCost = createNode(
    'TRANSFORMER',
    'Shipping Costs',
    { x: 300, y: 350 },
    { expression: '$inputs.rate * $inputs.demand' },
    [
      { name: 'rate', dataType: 'number' },
      { name: 'demand', dataType: 'number' },
    ],
    [{ name: 'result', dataType: 'number' }]
  );

  // Aggregator
  const totalCost = createNode(
    'AGGREGATOR',
    'Total Cost',
    { x: 550, y: 200 },
    { aggregationType: 'sum' },
    [
      { name: 'fixed', dataType: 'number' },
      { name: 'variable', dataType: 'number' },
      { name: 'shipping', dataType: 'number' },
    ],
    [{ name: 'total', dataType: 'number' }]
  );

  // Decision node
  const profitMargin = createNode(
    'DECISION',
    'Profit Margin Check',
    { x: 550, y: 350 },
    { condition: '$inputs.cost < 200000 ? 0.20 : 0.15' },
    [{ name: 'cost', dataType: 'number' }],
    [{ name: 'margin', dataType: 'number' }]
  );

  // Output
  const output = createNode(
    'OUTPUT',
    'Monthly Operating Cost',
    { x: 800, y: 200 },
    { label: 'Total Monthly Cost' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const marginOutput = createNode(
    'OUTPUT',
    'Recommended Margin',
    { x: 800, y: 350 },
    { label: 'Profit Margin' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const nodes = [
    fixedCosts, unitCost, demand, shippingRate,
    variableCost, shippingCost, totalCost, profitMargin,
    output, marginOutput
  ];

  const edges = [
    createEdge(unitCost, variableCost, 0, 0),
    createEdge(demand, variableCost, 0, 1),
    createEdge(shippingRate, shippingCost, 0, 0),
    createEdge(demand, shippingCost, 0, 1),
    createEdge(fixedCosts, totalCost, 0, 0),
    createEdge(variableCost, totalCost, 0, 1),
    createEdge(shippingCost, totalCost, 0, 2),
    createEdge(totalCost, profitMargin, 0, 0),
    createEdge(totalCost, output, 0, 0),
    createEdge(profitMargin, marginOutput, 0, 0),
  ];

  return createGraph(
    'Supply Chain Cost Model',
    'Monte Carlo simulation of monthly operating costs with variable demand, unit costs, and shipping rates. Includes decision logic for profit margin recommendations.',
    nodes,
    edges
  );
}

// ============================================
// SAMPLE 2: Investment Portfolio Risk Model
// ============================================
function createPortfolioModel(): Graph {
  // Asset returns (distributions)
  const stockReturn = createNode(
    'DISTRIBUTION',
    'Stock Returns',
    { x: 50, y: 100 },
    { distributionType: 'normal', mean: 0.08, stddev: 0.15 },
    [],
    [{ name: 'return', dataType: 'number' }]
  );

  const bondReturn = createNode(
    'DISTRIBUTION',
    'Bond Returns',
    { x: 50, y: 200 },
    { distributionType: 'normal', mean: 0.04, stddev: 0.05 },
    [],
    [{ name: 'return', dataType: 'number' }]
  );

  const realEstateReturn = createNode(
    'DISTRIBUTION',
    'Real Estate Returns',
    { x: 50, y: 300 },
    { distributionType: 'normal', mean: 0.06, stddev: 0.10 },
    [],
    [{ name: 'return', dataType: 'number' }]
  );

  const commodityReturn = createNode(
    'DISTRIBUTION',
    'Commodity Returns',
    { x: 50, y: 400 },
    { distributionType: 'normal', mean: 0.03, stddev: 0.20 },
    [],
    [{ name: 'return', dataType: 'number' }]
  );

  // Weights (parameters)
  const stockWeight = createNode(
    'PARAMETER',
    'Stock Weight',
    { x: 50, y: 520 },
    { min: 0, max: 1, default: 0.40 },
    [],
    [{ name: 'weight', dataType: 'number' }]
  );

  const bondWeight = createNode(
    'PARAMETER',
    'Bond Weight',
    { x: 50, y: 620 },
    { min: 0, max: 1, default: 0.30 },
    [],
    [{ name: 'weight', dataType: 'number' }]
  );

  const realEstateWeight = createNode(
    'PARAMETER',
    'Real Estate Weight',
    { x: 50, y: 720 },
    { min: 0, max: 1, default: 0.20 },
    [],
    [{ name: 'weight', dataType: 'number' }]
  );

  const commodityWeight = createNode(
    'PARAMETER',
    'Commodity Weight',
    { x: 50, y: 820 },
    { min: 0, max: 1, default: 0.10 },
    [],
    [{ name: 'weight', dataType: 'number' }]
  );

  // Initial investment
  const initialInvestment = createNode(
    'CONSTANT',
    'Initial Investment',
    { x: 300, y: 50 },
    { value: 100000 },
    [],
    [{ name: 'value', dataType: 'number' }]
  );

  // Weighted returns
  const stockContrib = createNode(
    'TRANSFORMER',
    'Stock Contribution',
    { x: 300, y: 150 },
    { expression: '$inputs.return * $inputs.weight' },
    [
      { name: 'return', dataType: 'number' },
      { name: 'weight', dataType: 'number' },
    ],
    [{ name: 'weighted', dataType: 'number' }]
  );

  const bondContrib = createNode(
    'TRANSFORMER',
    'Bond Contribution',
    { x: 300, y: 270 },
    { expression: '$inputs.return * $inputs.weight' },
    [
      { name: 'return', dataType: 'number' },
      { name: 'weight', dataType: 'number' },
    ],
    [{ name: 'weighted', dataType: 'number' }]
  );

  const realEstateContrib = createNode(
    'TRANSFORMER',
    'Real Estate Contribution',
    { x: 300, y: 390 },
    { expression: '$inputs.return * $inputs.weight' },
    [
      { name: 'return', dataType: 'number' },
      { name: 'weight', dataType: 'number' },
    ],
    [{ name: 'weighted', dataType: 'number' }]
  );

  const commodityContrib = createNode(
    'TRANSFORMER',
    'Commodity Contribution',
    { x: 300, y: 510 },
    { expression: '$inputs.return * $inputs.weight' },
    [
      { name: 'return', dataType: 'number' },
      { name: 'weight', dataType: 'number' },
    ],
    [{ name: 'weighted', dataType: 'number' }]
  );

  // Total portfolio return
  const portfolioReturn = createNode(
    'AGGREGATOR',
    'Portfolio Return',
    { x: 550, y: 300 },
    { aggregationType: 'sum' },
    [
      { name: 'stocks', dataType: 'number' },
      { name: 'bonds', dataType: 'number' },
      { name: 'realEstate', dataType: 'number' },
      { name: 'commodities', dataType: 'number' },
    ],
    [{ name: 'totalReturn', dataType: 'number' }]
  );

  // Weight constraint check
  const weightConstraint = createNode(
    'CONSTRAINT',
    'Weight Sum = 100%',
    { x: 300, y: 720 },
    { constraintExpression: '$inputs.s + $inputs.b + $inputs.r + $inputs.c == 1' },
    [
      { name: 's', dataType: 'number' },
      { name: 'b', dataType: 'number' },
      { name: 'r', dataType: 'number' },
      { name: 'c', dataType: 'number' },
    ],
    [{ name: 'valid', dataType: 'boolean' }]
  );

  // Final portfolio value
  const portfolioValue = createNode(
    'TRANSFORMER',
    'Portfolio Value',
    { x: 750, y: 200 },
    { expression: '$inputs.initial * (1 + $inputs.return)' },
    [
      { name: 'initial', dataType: 'number' },
      { name: 'return', dataType: 'number' },
    ],
    [{ name: 'value', dataType: 'number' }]
  );

  // Outputs
  const valueOutput = createNode(
    'OUTPUT',
    'Final Portfolio Value',
    { x: 950, y: 200 },
    { label: 'Portfolio Value After 1 Year' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const returnOutput = createNode(
    'OUTPUT',
    'Portfolio Return %',
    { x: 950, y: 350 },
    { label: 'Annual Return Percentage' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const nodes = [
    stockReturn, bondReturn, realEstateReturn, commodityReturn,
    stockWeight, bondWeight, realEstateWeight, commodityWeight,
    initialInvestment,
    stockContrib, bondContrib, realEstateContrib, commodityContrib,
    portfolioReturn, weightConstraint, portfolioValue,
    valueOutput, returnOutput
  ];

  const edges = [
    createEdge(stockReturn, stockContrib, 0, 0),
    createEdge(stockWeight, stockContrib, 0, 1),
    createEdge(bondReturn, bondContrib, 0, 0),
    createEdge(bondWeight, bondContrib, 0, 1),
    createEdge(realEstateReturn, realEstateContrib, 0, 0),
    createEdge(realEstateWeight, realEstateContrib, 0, 1),
    createEdge(commodityReturn, commodityContrib, 0, 0),
    createEdge(commodityWeight, commodityContrib, 0, 1),
    createEdge(stockContrib, portfolioReturn, 0, 0),
    createEdge(bondContrib, portfolioReturn, 0, 1),
    createEdge(realEstateContrib, portfolioReturn, 0, 2),
    createEdge(commodityContrib, portfolioReturn, 0, 3),
    createEdge(stockWeight, weightConstraint, 0, 0),
    createEdge(bondWeight, weightConstraint, 0, 1),
    createEdge(realEstateWeight, weightConstraint, 0, 2),
    createEdge(commodityWeight, weightConstraint, 0, 3),
    createEdge(initialInvestment, portfolioValue, 0, 0),
    createEdge(portfolioReturn, portfolioValue, 0, 1),
    createEdge(portfolioValue, valueOutput, 0, 0),
    createEdge(portfolioReturn, returnOutput, 0, 0),
  ];

  return createGraph(
    'Investment Portfolio Risk Model',
    'Four-asset portfolio with configurable weights. Simulates annual returns with normal distributions for each asset class. Includes weight constraint validation and calculates final portfolio value.',
    nodes,
    edges
  );
}

// ============================================
// SAMPLE 3: Project Risk Assessment
// ============================================
function createProjectRiskModel(): Graph {
  // Task durations (distributions)
  const task1Duration = createNode(
    'DISTRIBUTION',
    'Design Phase',
    { x: 50, y: 100 },
    { distributionType: 'triangular', min: 10, mode: 14, max: 21 },
    [],
    [{ name: 'days', dataType: 'number' }]
  );

  const task2Duration = createNode(
    'DISTRIBUTION',
    'Development Phase',
    { x: 50, y: 200 },
    { distributionType: 'triangular', min: 30, mode: 45, max: 70 },
    [],
    [{ name: 'days', dataType: 'number' }]
  );

  const task3Duration = createNode(
    'DISTRIBUTION',
    'Testing Phase',
    { x: 50, y: 300 },
    { distributionType: 'triangular', min: 7, mode: 10, max: 20 },
    [],
    [{ name: 'days', dataType: 'number' }]
  );

  const task4Duration = createNode(
    'DISTRIBUTION',
    'Deployment Phase',
    { x: 50, y: 400 },
    { distributionType: 'uniform', min: 3, max: 7 },
    [],
    [{ name: 'days', dataType: 'number' }]
  );

  // Cost rates
  const designRate = createNode(
    'CONSTANT',
    'Design Daily Rate',
    { x: 50, y: 520 },
    { value: 800 },
    [],
    [{ name: 'rate', dataType: 'number' }]
  );

  const devRate = createNode(
    'CONSTANT',
    'Dev Daily Rate',
    { x: 50, y: 620 },
    { value: 1200 },
    [],
    [{ name: 'rate', dataType: 'number' }]
  );

  const testRate = createNode(
    'CONSTANT',
    'Test Daily Rate',
    { x: 50, y: 720 },
    { value: 600 },
    [],
    [{ name: 'rate', dataType: 'number' }]
  );

  const deployRate = createNode(
    'CONSTANT',
    'Deploy Daily Rate',
    { x: 50, y: 820 },
    { value: 1500 },
    [],
    [{ name: 'rate', dataType: 'number' }]
  );

  // Risk factor
  const riskFactor = createNode(
    'DISTRIBUTION',
    'Risk Multiplier',
    { x: 300, y: 50 },
    { distributionType: 'uniform', min: 1.0, max: 1.3 },
    [],
    [{ name: 'factor', dataType: 'number' }]
  );

  // Task costs
  const designCost = createNode(
    'TRANSFORMER',
    'Design Cost',
    { x: 300, y: 150 },
    { expression: '$inputs.days * $inputs.rate * $inputs.risk' },
    [
      { name: 'days', dataType: 'number' },
      { name: 'rate', dataType: 'number' },
      { name: 'risk', dataType: 'number' },
    ],
    [{ name: 'cost', dataType: 'number' }]
  );

  const devCost = createNode(
    'TRANSFORMER',
    'Development Cost',
    { x: 300, y: 280 },
    { expression: '$inputs.days * $inputs.rate * $inputs.risk' },
    [
      { name: 'days', dataType: 'number' },
      { name: 'rate', dataType: 'number' },
      { name: 'risk', dataType: 'number' },
    ],
    [{ name: 'cost', dataType: 'number' }]
  );

  const testCost = createNode(
    'TRANSFORMER',
    'Testing Cost',
    { x: 300, y: 410 },
    { expression: '$inputs.days * $inputs.rate * $inputs.risk' },
    [
      { name: 'days', dataType: 'number' },
      { name: 'rate', dataType: 'number' },
      { name: 'risk', dataType: 'number' },
    ],
    [{ name: 'cost', dataType: 'number' }]
  );

  const deployCost = createNode(
    'TRANSFORMER',
    'Deployment Cost',
    { x: 300, y: 540 },
    { expression: '$inputs.days * $inputs.rate * $inputs.risk' },
    [
      { name: 'days', dataType: 'number' },
      { name: 'rate', dataType: 'number' },
      { name: 'risk', dataType: 'number' },
    ],
    [{ name: 'cost', dataType: 'number' }]
  );

  // Aggregators
  const totalDuration = createNode(
    'AGGREGATOR',
    'Total Duration',
    { x: 550, y: 200 },
    { aggregationType: 'sum' },
    [
      { name: 'design', dataType: 'number' },
      { name: 'dev', dataType: 'number' },
      { name: 'test', dataType: 'number' },
      { name: 'deploy', dataType: 'number' },
    ],
    [{ name: 'days', dataType: 'number' }]
  );

  const totalCost = createNode(
    'AGGREGATOR',
    'Total Cost',
    { x: 550, y: 400 },
    { aggregationType: 'sum' },
    [
      { name: 'design', dataType: 'number' },
      { name: 'dev', dataType: 'number' },
      { name: 'test', dataType: 'number' },
      { name: 'deploy', dataType: 'number' },
    ],
    [{ name: 'total', dataType: 'number' }]
  );

  // Decision - budget check
  const budgetCheck = createNode(
    'DECISION',
    'Budget Status',
    { x: 750, y: 400 },
    { condition: '$inputs.cost <= 100000 ? 1 : 0' },
    [{ name: 'cost', dataType: 'number' }],
    [{ name: 'withinBudget', dataType: 'number' }]
  );

  // Outputs
  const durationOutput = createNode(
    'OUTPUT',
    'Project Duration (Days)',
    { x: 800, y: 200 },
    { label: 'Total Project Duration' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const costOutput = createNode(
    'OUTPUT',
    'Project Cost ($)',
    { x: 950, y: 350 },
    { label: 'Total Project Cost' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const budgetOutput = createNode(
    'OUTPUT',
    'Within Budget (1=Yes)',
    { x: 950, y: 480 },
    { label: 'Budget Compliance' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const nodes = [
    task1Duration, task2Duration, task3Duration, task4Duration,
    designRate, devRate, testRate, deployRate,
    riskFactor,
    designCost, devCost, testCost, deployCost,
    totalDuration, totalCost, budgetCheck,
    durationOutput, costOutput, budgetOutput
  ];

  const edges = [
    // Duration to cost calculations
    createEdge(task1Duration, designCost, 0, 0),
    createEdge(designRate, designCost, 0, 1),
    createEdge(riskFactor, designCost, 0, 2),
    createEdge(task2Duration, devCost, 0, 0),
    createEdge(devRate, devCost, 0, 1),
    createEdge(riskFactor, devCost, 0, 2),
    createEdge(task3Duration, testCost, 0, 0),
    createEdge(testRate, testCost, 0, 1),
    createEdge(riskFactor, testCost, 0, 2),
    createEdge(task4Duration, deployCost, 0, 0),
    createEdge(deployRate, deployCost, 0, 1),
    createEdge(riskFactor, deployCost, 0, 2),
    // Duration aggregation
    createEdge(task1Duration, totalDuration, 0, 0),
    createEdge(task2Duration, totalDuration, 0, 1),
    createEdge(task3Duration, totalDuration, 0, 2),
    createEdge(task4Duration, totalDuration, 0, 3),
    // Cost aggregation
    createEdge(designCost, totalCost, 0, 0),
    createEdge(devCost, totalCost, 0, 1),
    createEdge(testCost, totalCost, 0, 2),
    createEdge(deployCost, totalCost, 0, 3),
    // Budget check
    createEdge(totalCost, budgetCheck, 0, 0),
    // Outputs
    createEdge(totalDuration, durationOutput, 0, 0),
    createEdge(totalCost, costOutput, 0, 0),
    createEdge(budgetCheck, budgetOutput, 0, 0),
  ];

  return createGraph(
    'Project Risk Assessment',
    'Software project cost and duration estimation using triangular distributions for task durations. Includes risk multiplier and budget compliance checking. Great for understanding schedule and cost risk.',
    nodes,
    edges
  );
}

// ============================================
// SAMPLE 4: Manufacturing Quality Model
// ============================================
function createQualityModel(): Graph {
  // Input measurements
  const measurement1 = createNode(
    'DISTRIBUTION',
    'Dimension A (mm)',
    { x: 50, y: 100 },
    { distributionType: 'normal', mean: 50.0, stddev: 0.1 },
    [],
    [{ name: 'value', dataType: 'number' }]
  );

  const measurement2 = createNode(
    'DISTRIBUTION',
    'Dimension B (mm)',
    { x: 50, y: 200 },
    { distributionType: 'normal', mean: 25.0, stddev: 0.08 },
    [],
    [{ name: 'value', dataType: 'number' }]
  );

  const measurement3 = createNode(
    'DISTRIBUTION',
    'Weight (g)',
    { x: 50, y: 300 },
    { distributionType: 'normal', mean: 100.0, stddev: 2.0 },
    [],
    [{ name: 'value', dataType: 'number' }]
  );

  // Specification limits
  const specALower = createNode(
    'CONSTANT',
    'Spec A Lower',
    { x: 50, y: 420 },
    { value: 49.7 },
    [],
    [{ name: 'limit', dataType: 'number' }]
  );

  const specAUpper = createNode(
    'CONSTANT',
    'Spec A Upper',
    { x: 50, y: 500 },
    { value: 50.3 },
    [],
    [{ name: 'limit', dataType: 'number' }]
  );

  const specBLower = createNode(
    'CONSTANT',
    'Spec B Lower',
    { x: 50, y: 600 },
    { value: 24.8 },
    [],
    [{ name: 'limit', dataType: 'number' }]
  );

  const specBUpper = createNode(
    'CONSTANT',
    'Spec B Upper',
    { x: 50, y: 680 },
    { value: 25.2 },
    [],
    [{ name: 'limit', dataType: 'number' }]
  );

  // Check if dimensions are in spec
  const checkA = createNode(
    'DECISION',
    'Check Dimension A',
    { x: 300, y: 150 },
    { condition: '($inputs.value >= $inputs.lower && $inputs.value <= $inputs.upper) ? 1 : 0' },
    [
      { name: 'value', dataType: 'number' },
      { name: 'lower', dataType: 'number' },
      { name: 'upper', dataType: 'number' },
    ],
    [{ name: 'inSpec', dataType: 'number' }]
  );

  const checkB = createNode(
    'DECISION',
    'Check Dimension B',
    { x: 300, y: 300 },
    { condition: '($inputs.value >= $inputs.lower && $inputs.value <= $inputs.upper) ? 1 : 0' },
    [
      { name: 'value', dataType: 'number' },
      { name: 'lower', dataType: 'number' },
      { name: 'upper', dataType: 'number' },
    ],
    [{ name: 'inSpec', dataType: 'number' }]
  );

  // Overall pass/fail
  const overallCheck = createNode(
    'TRANSFORMER',
    'Overall Quality',
    { x: 550, y: 220 },
    { expression: '($inputs.checkA == 1 && $inputs.checkB == 1) ? 1 : 0' },
    [
      { name: 'checkA', dataType: 'number' },
      { name: 'checkB', dataType: 'number' },
    ],
    [{ name: 'pass', dataType: 'number' }]
  );

  // Deviation calculations
  const deviationA = createNode(
    'TRANSFORMER',
    'Deviation from Target A',
    { x: 300, y: 450 },
    { expression: 'Math.abs($inputs.value - 50.0)' },
    [{ name: 'value', dataType: 'number' }],
    [{ name: 'deviation', dataType: 'number' }]
  );

  const deviationB = createNode(
    'TRANSFORMER',
    'Deviation from Target B',
    { x: 300, y: 550 },
    { expression: 'Math.abs($inputs.value - 25.0)' },
    [{ name: 'value', dataType: 'number' }],
    [{ name: 'deviation', dataType: 'number' }]
  );

  // Total deviation
  const totalDeviation = createNode(
    'AGGREGATOR',
    'Total Deviation',
    { x: 550, y: 500 },
    { aggregationType: 'sum' },
    [
      { name: 'devA', dataType: 'number' },
      { name: 'devB', dataType: 'number' },
    ],
    [{ name: 'total', dataType: 'number' }]
  );

  // Outputs
  const passOutput = createNode(
    'OUTPUT',
    'Pass Rate (1=Pass)',
    { x: 800, y: 220 },
    { label: 'Quality Pass/Fail' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const dimAOutput = createNode(
    'OUTPUT',
    'Dimension A Value',
    { x: 800, y: 100 },
    { label: 'Measured Dimension A' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const deviationOutput = createNode(
    'OUTPUT',
    'Total Deviation',
    { x: 800, y: 500 },
    { label: 'Sum of Deviations from Target' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const weightOutput = createNode(
    'OUTPUT',
    'Weight Value',
    { x: 800, y: 350 },
    { label: 'Measured Weight' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const nodes = [
    measurement1, measurement2, measurement3,
    specALower, specAUpper, specBLower, specBUpper,
    checkA, checkB, overallCheck,
    deviationA, deviationB, totalDeviation,
    passOutput, dimAOutput, deviationOutput, weightOutput
  ];

  const edges = [
    // Dimension A check
    createEdge(measurement1, checkA, 0, 0),
    createEdge(specALower, checkA, 0, 1),
    createEdge(specAUpper, checkA, 0, 2),
    // Dimension B check
    createEdge(measurement2, checkB, 0, 0),
    createEdge(specBLower, checkB, 0, 1),
    createEdge(specBUpper, checkB, 0, 2),
    // Overall check
    createEdge(checkA, overallCheck, 0, 0),
    createEdge(checkB, overallCheck, 0, 1),
    // Deviations
    createEdge(measurement1, deviationA, 0, 0),
    createEdge(measurement2, deviationB, 0, 0),
    createEdge(deviationA, totalDeviation, 0, 0),
    createEdge(deviationB, totalDeviation, 0, 1),
    // Outputs
    createEdge(overallCheck, passOutput, 0, 0),
    createEdge(measurement1, dimAOutput, 0, 0),
    createEdge(totalDeviation, deviationOutput, 0, 0),
    createEdge(measurement3, weightOutput, 0, 0),
  ];

  return createGraph(
    'Manufacturing Quality Model',
    'Statistical process control simulation for manufacturing. Measures dimensions against specification limits, calculates pass/fail rates, and tracks deviations. Run Monte Carlo to estimate defect rates.',
    nodes,
    edges
  );
}

// ============================================
// SAMPLE 5: Simple Arithmetic Demo
// ============================================
function createArithmeticDemo(): Graph {
  const input1 = createNode(
    'CONSTANT',
    'Number A',
    { x: 50, y: 100 },
    { value: 10 },
    [],
    [{ name: 'value', dataType: 'number' }]
  );

  const input2 = createNode(
    'CONSTANT',
    'Number B',
    { x: 50, y: 200 },
    { value: 5 },
    [],
    [{ name: 'value', dataType: 'number' }]
  );

  const random = createNode(
    'DISTRIBUTION',
    'Random Factor',
    { x: 50, y: 300 },
    { distributionType: 'uniform', min: 0.8, max: 1.2 },
    [],
    [{ name: 'value', dataType: 'number' }]
  );

  const sum = createNode(
    'AGGREGATOR',
    'Sum (A + B)',
    { x: 300, y: 100 },
    { aggregationType: 'sum' },
    [
      { name: 'a', dataType: 'number' },
      { name: 'b', dataType: 'number' },
    ],
    [{ name: 'result', dataType: 'number' }]
  );

  const product = createNode(
    'TRANSFORMER',
    'Product (A × B)',
    { x: 300, y: 200 },
    { expression: '$inputs.a * $inputs.b' },
    [
      { name: 'a', dataType: 'number' },
      { name: 'b', dataType: 'number' },
    ],
    [{ name: 'result', dataType: 'number' }]
  );

  const randomized = createNode(
    'TRANSFORMER',
    'Randomized Sum',
    { x: 550, y: 150 },
    { expression: '$inputs.sum * $inputs.factor' },
    [
      { name: 'sum', dataType: 'number' },
      { name: 'factor', dataType: 'number' },
    ],
    [{ name: 'result', dataType: 'number' }]
  );

  const comparison = createNode(
    'DECISION',
    'Compare Results',
    { x: 550, y: 280 },
    { condition: '$inputs.product > $inputs.randomSum ? $inputs.product : $inputs.randomSum' },
    [
      { name: 'product', dataType: 'number' },
      { name: 'randomSum', dataType: 'number' },
    ],
    [{ name: 'larger', dataType: 'number' }]
  );

  const sumOutput = createNode(
    'OUTPUT',
    'Sum Result',
    { x: 800, y: 80 },
    { label: 'A + B' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const productOutput = createNode(
    'OUTPUT',
    'Product Result',
    { x: 800, y: 180 },
    { label: 'A × B' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const randomOutput = createNode(
    'OUTPUT',
    'Randomized Sum',
    { x: 800, y: 280 },
    { label: 'Sum × Random' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const maxOutput = createNode(
    'OUTPUT',
    'Larger Value',
    { x: 800, y: 380 },
    { label: 'Max of Product vs RandomSum' },
    [{ name: 'value', dataType: 'number' }],
    []
  );

  const nodes = [
    input1, input2, random,
    sum, product, randomized, comparison,
    sumOutput, productOutput, randomOutput, maxOutput
  ];

  const edges = [
    createEdge(input1, sum, 0, 0),
    createEdge(input2, sum, 0, 1),
    createEdge(input1, product, 0, 0),
    createEdge(input2, product, 0, 1),
    createEdge(sum, randomized, 0, 0),
    createEdge(random, randomized, 0, 1),
    createEdge(product, comparison, 0, 0),
    createEdge(randomized, comparison, 0, 1),
    createEdge(sum, sumOutput, 0, 0),
    createEdge(product, productOutput, 0, 0),
    createEdge(randomized, randomOutput, 0, 0),
    createEdge(comparison, maxOutput, 0, 0),
  ];

  return createGraph(
    'Arithmetic Demo',
    'Simple demonstration of basic node types: constants, distributions, transformers, aggregators, decisions, and outputs. Great for learning how nodes connect and data flows.',
    nodes,
    edges
  );
}

// Export all sample graphs
// Export individual sample generators for lazy loading
export const sampleGenerators = {
  'arithmetic-demo': () => { idCounter = 0; return createArithmeticDemo(); },
  'supply-chain': () => { idCounter = 100; return createSupplyChainModel(); },
  'portfolio-risk': () => { idCounter = 200; return createPortfolioModel(); },
  'project-risk': () => { idCounter = 300; return createProjectRiskModel(); },
  'quality-model': () => { idCounter = 400; return createQualityModel(); },
};

// Legacy function - generates ALL graphs at once (avoid for performance)
export function getSampleGraphs(): Graph[] {
  // Reset ID counter for consistent IDs
  idCounter = 0;
  
  return [
    createArithmeticDemo(),
    createSupplyChainModel(),
    createPortfolioModel(),
    createProjectRiskModel(),
    createQualityModel(),
    ...getAdvancedSampleGraphs(),
  ];
}

export const sampleGraphDescriptions = [
  {
    name: 'Arithmetic Demo',
    description: 'Simple intro - learn how nodes connect and data flows',
    complexity: 'Beginner',
    nodeCount: 11,
  },
  {
    name: 'Supply Chain Cost Model',
    description: 'Monthly operating costs with demand uncertainty',
    complexity: 'Intermediate',
    nodeCount: 10,
  },
  {
    name: 'Investment Portfolio Risk Model',
    description: 'Four-asset portfolio with risk metrics',
    complexity: 'Advanced',
    nodeCount: 18,
  },
  {
    name: 'Project Risk Assessment',
    description: 'Software project cost/schedule estimation',
    complexity: 'Intermediate',
    nodeCount: 19,
  },
  {
    name: 'Manufacturing Quality Model',
    description: 'Statistical process control and defect rates',
    complexity: 'Intermediate',
    nodeCount: 17,
  },
  ...advancedSampleDescriptions,
];
