// Advanced Sample Graphs - Complex scenarios with multi-stage transformations
import type { Graph, NodeDefinition, EdgeDefinition, DataType } from '@scenarioforge/core';

let idCounter = 0;
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

// ============================================================================
// 1. COMPOUND INTEREST CALCULATOR - Multi-year projection with reinvestment
// ============================================================================
function createCompoundInterest(): Graph {
  const principal = node('CONSTANT', 'Principal', 50, 50, { value: 10000 }, [], ['value']);
  const rate = node('PARAMETER', 'Annual Rate %', 50, 150, { value: 7, min: 1, max: 20 }, [], ['value']);
  const years = node('PARAMETER', 'Years', 50, 250, { value: 10, min: 1, max: 30 }, [], ['value']);
  const compounds = node('CONSTANT', 'Compounds/Year', 50, 350, { value: 12 }, [], ['value']);
  
  // Convert rate to decimal
  const rateDecimal = node('TRANSFORMER', 'Rate to Decimal', 250, 150, 
    { expression: '$inputs.rate / 100' }, ['rate'], ['decimal']);
  
  // Calculate periodic rate: r/n
  const periodicRate = node('TRANSFORMER', 'Periodic Rate', 400, 200,
    { expression: '$inputs.rate / $inputs.n' }, ['rate', 'n'], ['periodic']);
  
  // Calculate total periods: n*t
  const totalPeriods = node('TRANSFORMER', 'Total Periods', 400, 300,
    { expression: '$inputs.n * $inputs.t' }, ['n', 't'], ['periods']);
  
  // Calculate (1 + r/n)
  const onePlusRate = node('TRANSFORMER', '1 + Periodic Rate', 550, 200,
    { expression: '1 + $inputs.periodic' }, ['periodic'], ['factor']);
  
  // Calculate (1 + r/n)^(nt) using Math.pow
  const growthFactor = node('TRANSFORMER', 'Growth Factor', 700, 250,
    { expression: 'Math.pow($inputs.base, $inputs.exp)' }, ['base', 'exp'], ['growth']);
  
  // Final amount: P * growth
  const finalAmount = node('TRANSFORMER', 'Final Amount', 850, 200,
    { expression: '$inputs.principal * $inputs.growth' }, ['principal', 'growth'], ['amount']);
  
  // Interest earned
  const interestEarned = node('TRANSFORMER', 'Interest Earned', 850, 350,
    { expression: '$inputs.final - $inputs.principal' }, ['final', 'principal'], ['interest']);
  
  const outAmount = node('OUTPUT', 'Final Value', 1000, 200, {}, ['value'], []);
  const outInterest = node('OUTPUT', 'Total Interest', 1000, 350, {}, ['value'], []);

  const nodes = [principal, rate, years, compounds, rateDecimal, periodicRate, totalPeriods, onePlusRate, growthFactor, finalAmount, interestEarned, outAmount, outInterest];
  const edges = [
    edge(rate, rateDecimal), edge(rateDecimal, periodicRate), edge(compounds, periodicRate, 0, 1),
    edge(compounds, totalPeriods), edge(years, totalPeriods, 0, 1),
    edge(periodicRate, onePlusRate), edge(onePlusRate, growthFactor), edge(totalPeriods, growthFactor, 0, 1),
    edge(principal, finalAmount), edge(growthFactor, finalAmount, 0, 1),
    edge(finalAmount, interestEarned), edge(principal, interestEarned, 0, 1),
    edge(finalAmount, outAmount), edge(interestEarned, outInterest),
  ];
  
  return graph('Compound Interest Calculator', 
    'Multi-stage compound interest with configurable compounding frequency. Shows P(1+r/n)^(nt) formula broken into steps.', nodes, edges);
}

// ============================================================================
// 2. MONTE CARLO PI ESTIMATION - Random sampling demonstration
// ============================================================================
function createMonteCarloPi(): Graph {
  // Random X and Y coordinates in [0,1]
  const randX = node('DISTRIBUTION', 'Random X', 50, 100, { distributionType: 'uniform', min: 0, max: 1 }, [], ['x']);
  const randY = node('DISTRIBUTION', 'Random Y', 50, 250, { distributionType: 'uniform', min: 0, max: 1 }, [], ['y']);
  
  // Square each coordinate
  const xSquared = node('TRANSFORMER', 'X²', 200, 100, { expression: '$inputs.x * $inputs.x' }, ['x'], ['x2']);
  const ySquared = node('TRANSFORMER', 'Y²', 200, 250, { expression: '$inputs.y * $inputs.y' }, ['y'], ['y2']);
  
  // Sum of squares (distance² from origin)
  const sumSquares = node('AGGREGATOR', 'X² + Y²', 350, 175, { aggregationType: 'sum' }, ['x2', 'y2'], ['sum']);
  
  // Check if inside circle (sum <= 1)
  const insideCircle = node('DECISION', 'Inside Circle?', 500, 175,
    { condition: '$inputs.dist <= 1 ? 1 : 0' }, ['dist'], ['inside']);
  
  // Scale by 4 to estimate Pi
  const piEstimate = node('TRANSFORMER', 'Pi Estimate (×4)', 650, 175,
    { expression: '$inputs.inside * 4' }, ['inside'], ['pi']);
  
  const output = node('OUTPUT', 'Pi Approximation', 800, 175, {}, ['value'], []);

  const nodes = [randX, randY, xSquared, ySquared, sumSquares, insideCircle, piEstimate, output];
  const edges = [
    edge(randX, xSquared), edge(randY, ySquared),
    edge(xSquared, sumSquares), edge(ySquared, sumSquares, 0, 1),
    edge(sumSquares, insideCircle), edge(insideCircle, piEstimate), edge(piEstimate, output),
  ];
  
  return graph('Monte Carlo Pi Estimation',
    'Estimates π using random point sampling. Run 10000+ iterations - mean should approach 3.14159. Demonstrates probability-based computation.', nodes, edges);
}

// ============================================================================
// 3. LOAN AMORTIZATION - Payment breakdown with multiple outputs
// ============================================================================
function createLoanAmortization(): Graph {
  const principal = node('CONSTANT', 'Loan Amount', 50, 100, { value: 250000 }, [], ['value']);
  const annualRate = node('PARAMETER', 'Annual Rate %', 50, 220, { value: 6.5, min: 1, max: 15 }, [], ['value']);
  const termYears = node('PARAMETER', 'Term (Years)', 50, 340, { value: 30, min: 5, max: 40 }, [], ['value']);
  
  // Monthly rate
  const monthlyRate = node('TRANSFORMER', 'Monthly Rate', 250, 220,
    { expression: '$inputs.annual / 100 / 12' }, ['annual'], ['monthly']);
  
  // Total months
  const totalMonths = node('TRANSFORMER', 'Total Months', 250, 340,
    { expression: '$inputs.years * 12' }, ['years'], ['months']);
  
  // (1 + r)^n
  const compoundFactor = node('TRANSFORMER', '(1+r)^n', 450, 280,
    { expression: 'Math.pow(1 + $inputs.r, $inputs.n)' }, ['r', 'n'], ['factor']);
  
  // Monthly payment: P * [r(1+r)^n] / [(1+r)^n - 1]
  const monthlyPayment = node('TRANSFORMER', 'Monthly Payment', 650, 200,
    { expression: '$inputs.P * ($inputs.r * $inputs.factor) / ($inputs.factor - 1)' },
    ['P', 'r', 'factor'], ['payment']);
  
  // Total paid over loan life
  const totalPaid = node('TRANSFORMER', 'Total Paid', 650, 340,
    { expression: '$inputs.payment * $inputs.months' }, ['payment', 'months'], ['total']);
  
  // Total interest
  const totalInterest = node('TRANSFORMER', 'Total Interest', 850, 280,
    { expression: '$inputs.total - $inputs.principal' }, ['total', 'principal'], ['interest']);
  
  const outPayment = node('OUTPUT', 'Monthly Payment', 1000, 150, {}, ['value'], []);
  const outTotal = node('OUTPUT', 'Total Paid', 1000, 280, {}, ['value'], []);
  const outInterest = node('OUTPUT', 'Interest Paid', 1000, 410, {}, ['value'], []);

  const nodes = [principal, annualRate, termYears, monthlyRate, totalMonths, compoundFactor, monthlyPayment, totalPaid, totalInterest, outPayment, outTotal, outInterest];
  const edges = [
    edge(annualRate, monthlyRate), edge(termYears, totalMonths),
    edge(monthlyRate, compoundFactor), edge(totalMonths, compoundFactor, 0, 1),
    edge(principal, monthlyPayment), edge(monthlyRate, monthlyPayment, 0, 1), edge(compoundFactor, monthlyPayment, 0, 2),
    edge(monthlyPayment, totalPaid), edge(totalMonths, totalPaid, 0, 1),
    edge(totalPaid, totalInterest), edge(principal, totalInterest, 0, 1),
    edge(monthlyPayment, outPayment), edge(totalPaid, outTotal), edge(totalInterest, outInterest),
  ];
  
  return graph('Loan Amortization Calculator',
    'Calculates mortgage/loan payments using standard amortization formula. Shows monthly payment, total cost, and interest breakdown.', nodes, edges);
}

// ============================================================================
// 4. OPTION PRICING (Simplified Black-Scholes components)
// ============================================================================
function createOptionPricing(): Graph {
  const stockPrice = node('DISTRIBUTION', 'Stock Price', 50, 50, { distributionType: 'normal', mean: 100, stddev: 15 }, [], ['S']);
  const strikePrice = node('CONSTANT', 'Strike Price', 50, 170, { value: 100 }, [], ['K']);
  const riskFreeRate = node('PARAMETER', 'Risk-Free Rate', 50, 290, { value: 0.05, min: 0, max: 0.2 }, [], ['r']);
  const timeToExpiry = node('PARAMETER', 'Time to Expiry (yr)', 50, 410, { value: 0.5, min: 0.1, max: 2 }, [], ['T']);
  const volatility = node('DISTRIBUTION', 'Volatility', 50, 530, { distributionType: 'uniform', min: 0.15, max: 0.40 }, [], ['sigma']);
  
  // ln(S/K)
  const logMoneyness = node('TRANSFORMER', 'ln(S/K)', 280, 110,
    { expression: 'Math.log($inputs.S / $inputs.K)' }, ['S', 'K'], ['logSK']);
  
  // r + σ²/2
  const driftTerm = node('TRANSFORMER', 'Drift Term', 280, 350,
    { expression: '$inputs.r + ($inputs.sigma * $inputs.sigma / 2)' }, ['r', 'sigma'], ['drift']);
  
  // σ√T
  const volTime = node('TRANSFORMER', 'σ√T', 280, 470,
    { expression: '$inputs.sigma * Math.sqrt($inputs.T)' }, ['sigma', 'T'], ['volT']);
  
  // d1 numerator: ln(S/K) + (r + σ²/2)T
  const d1Num = node('TRANSFORMER', 'd1 Numerator', 480, 230,
    { expression: '$inputs.logSK + $inputs.drift * $inputs.T' }, ['logSK', 'drift', 'T'], ['num']);
  
  // d1 = numerator / σ√T
  const d1 = node('TRANSFORMER', 'd1', 650, 300,
    { expression: '$inputs.num / $inputs.volT' }, ['num', 'volT'], ['d1']);
  
  // d2 = d1 - σ√T
  const d2 = node('TRANSFORMER', 'd2', 650, 420,
    { expression: '$inputs.d1 - $inputs.volT' }, ['d1', 'volT'], ['d2']);
  
  // Intrinsic value max(S-K, 0) - simplified payoff
  const intrinsic = node('DECISION', 'Intrinsic Value', 800, 110,
    { condition: '$inputs.S > $inputs.K ? $inputs.S - $inputs.K : 0' }, ['S', 'K'], ['payoff']);
  
  const outD1 = node('OUTPUT', 'd1 Value', 850, 300, {}, ['value'], []);
  const outD2 = node('OUTPUT', 'd2 Value', 850, 420, {}, ['value'], []);
  const outPayoff = node('OUTPUT', 'Call Payoff', 950, 110, {}, ['value'], []);

  const nodes = [stockPrice, strikePrice, riskFreeRate, timeToExpiry, volatility, logMoneyness, driftTerm, volTime, d1Num, d1, d2, intrinsic, outD1, outD2, outPayoff];
  const edges = [
    edge(stockPrice, logMoneyness), edge(strikePrice, logMoneyness, 0, 1),
    edge(riskFreeRate, driftTerm), edge(volatility, driftTerm, 0, 1),
    edge(volatility, volTime), edge(timeToExpiry, volTime, 0, 1),
    edge(logMoneyness, d1Num), edge(driftTerm, d1Num, 0, 1), edge(timeToExpiry, d1Num, 0, 2),
    edge(d1Num, d1), edge(volTime, d1, 0, 1),
    edge(d1, d2), edge(volTime, d2, 0, 1),
    edge(stockPrice, intrinsic), edge(strikePrice, intrinsic, 0, 1),
    edge(d1, outD1), edge(d2, outD2), edge(intrinsic, outPayoff),
  ];
  
  return graph('Option Pricing Model',
    'Simplified Black-Scholes components for call option analysis. Calculates d1, d2, and intrinsic value with stochastic stock price and volatility.', nodes, edges);
}

// ============================================================================
// 5. EPIDEMIC SPREAD MODEL (SIR-inspired)
// ============================================================================
function createEpidemicModel(): Graph {
  const population = node('CONSTANT', 'Population', 50, 50, { value: 1000000 }, [], ['N']);
  const initialInfected = node('CONSTANT', 'Initial Infected', 50, 170, { value: 100 }, [], ['I0']);
  const contactRate = node('DISTRIBUTION', 'Contact Rate', 50, 290, { distributionType: 'uniform', min: 0.2, max: 0.5 }, [], ['beta']);
  const recoveryRate = node('PARAMETER', 'Recovery Rate', 50, 410, { value: 0.1, min: 0.05, max: 0.3 }, [], ['gamma']);
  const days = node('PARAMETER', 'Days Elapsed', 50, 530, { value: 30, min: 1, max: 180 }, [], ['t']);
  
  // R0 = β/γ (basic reproduction number)
  const r0 = node('TRANSFORMER', 'R₀ (Basic Repro #)', 280, 350,
    { expression: '$inputs.beta / $inputs.gamma' }, ['beta', 'gamma'], ['R0']);
  
  // Initial susceptible = N - I0
  const initialSusceptible = node('TRANSFORMER', 'Initial Susceptible', 280, 110,
    { expression: '$inputs.N - $inputs.I0' }, ['N', 'I0'], ['S0']);
  
  // Infection probability factor
  const infectionFactor = node('TRANSFORMER', 'Infection Factor', 480, 230,
    { expression: '1 - Math.exp(-$inputs.beta * $inputs.t)' }, ['beta', 't'], ['factor']);
  
  // Estimated infections (simplified exponential growth phase)
  const estimatedInfected = node('TRANSFORMER', 'Est. Infected', 480, 400,
    { expression: '$inputs.I0 * Math.exp(($inputs.R0 - 1) * $inputs.gamma * $inputs.t)' },
    ['I0', 'R0', 'gamma', 't'], ['infected']);
  
  // Cap at susceptible population
  const cappedInfected = node('DECISION', 'Capped Infected', 680, 300,
    { condition: '$inputs.est < $inputs.S0 ? $inputs.est : $inputs.S0' },
    ['est', 'S0'], ['capped']);
  
  // Infection rate percentage
  const infectionRate = node('TRANSFORMER', 'Infection Rate %', 680, 450,
    { expression: '($inputs.infected / $inputs.N) * 100' }, ['infected', 'N'], ['rate']);
  
  // Peak estimate
  const peakDay = node('TRANSFORMER', 'Est. Peak Day', 850, 350,
    { expression: 'Math.log($inputs.S0 / $inputs.I0) / (($inputs.R0 - 1) * $inputs.gamma)' },
    ['S0', 'I0', 'R0', 'gamma'], ['peak']);
  
  const outR0 = node('OUTPUT', 'R₀', 1000, 200, {}, ['value'], []);
  const outInfected = node('OUTPUT', 'Total Infected', 1000, 300, {}, ['value'], []);
  const outRate = node('OUTPUT', 'Infection Rate %', 1000, 400, {}, ['value'], []);
  const outPeak = node('OUTPUT', 'Peak Day', 1000, 500, {}, ['value'], []);

  const nodes = [population, initialInfected, contactRate, recoveryRate, days, r0, initialSusceptible, infectionFactor, estimatedInfected, cappedInfected, infectionRate, peakDay, outR0, outInfected, outRate, outPeak];
  const edges = [
    edge(contactRate, r0), edge(recoveryRate, r0, 0, 1),
    edge(population, initialSusceptible), edge(initialInfected, initialSusceptible, 0, 1),
    edge(contactRate, infectionFactor), edge(days, infectionFactor, 0, 1),
    edge(initialInfected, estimatedInfected), edge(r0, estimatedInfected, 0, 1),
    edge(recoveryRate, estimatedInfected, 0, 2), edge(days, estimatedInfected, 0, 3),
    edge(estimatedInfected, cappedInfected), edge(initialSusceptible, cappedInfected, 0, 1),
    edge(cappedInfected, infectionRate), edge(population, infectionRate, 0, 1),
    edge(initialSusceptible, peakDay), edge(initialInfected, peakDay, 0, 1),
    edge(r0, peakDay, 0, 2), edge(recoveryRate, peakDay, 0, 3),
    edge(r0, outR0), edge(cappedInfected, outInfected), edge(infectionRate, outRate), edge(peakDay, outPeak),
  ];
  
  return graph('Epidemic Spread Model',
    'SIR-inspired disease spread simulation. Calculates R₀, infection estimates, and peak timing with uncertain contact rates.', nodes, edges);
}

// ============================================================================
// 6. EXPRESSION VARIABLES DEMO - Shows all available context variables
// ============================================================================
function createExpressionVariablesDemo(): Graph {
  // Input value
  const baseValue = node('DISTRIBUTION', 'Base Value', 50, 100, 
    { distributionType: 'uniform', min: 10, max: 100 }, [], ['value']);
  
  // Multiplier parameter
  const multiplier = node('PARAMETER', 'Multiplier', 50, 250, 
    { value: 2, min: 1, max: 5 }, [], ['value']);
  
  // Demo 1: $inputs - Access input port values
  const inputsDemo = node('TRANSFORMER', '$inputs Demo', 300, 100,
    { expression: '$inputs.base * $inputs.mult', description: 'Multiplies two input values together' },
    ['base', 'mult'], ['result']);
  
  // Demo 2: $node - Access current node's data property
  const nodeDataDemo = node('TRANSFORMER', '$node Demo', 300, 220,
    { expression: '$inputs.value + ($node.bonus || 0)', bonus: 50, description: 'Adds bonus from node data' },
    ['value'], ['result']);
  
  // Demo 3: $params - Access global simulation parameters
  const paramsDemo = node('TRANSFORMER', '$params Demo', 300, 340,
    { expression: '$inputs.value * ($params.globalScale || 1)', description: 'Scales by global parameter' },
    ['value'], ['result']);
  
  // Demo 4: $iteration - Current Monte Carlo iteration number
  const iterationDemo = node('TRANSFORMER', '$iteration Demo', 300, 460,
    { expression: '$inputs.value + ($iteration % 10)', description: 'Adds iteration mod 10 (0-9 pattern)' },
    ['value'], ['result']);
  
  // Demo 5: $time - Simulation time step (useful for time-series)
  const timeDemo = node('TRANSFORMER', '$time Demo', 300, 580,
    { expression: '$inputs.value * (1 + 0.01 * $time)', description: 'Grows 1% per time unit' },
    ['value'], ['result']);
  
  // Combine all demos
  const combineAll = node('TRANSFORMER', 'Combined Expression', 550, 340,
    { expression: '($inputs.a + $inputs.b + $inputs.c + $inputs.d + $inputs.e) / 5', description: 'Average of all demos' },
    ['a', 'b', 'c', 'd', 'e'], ['average']);
  
  // Final output with all variables used
  const finalCalc = node('TRANSFORMER', 'All Variables Used', 750, 340,
    { 
      expression: '$inputs.avg * ($node.weight || 1) * ($params.globalScale || 1) + $iteration * 0.001 + $time * 0.01',
      weight: 1.5,
      description: 'Uses $inputs, $node, $params, $iteration, and $time in one expression'
    },
    ['avg'], ['final']);
  
  const output = node('OUTPUT', 'Final Result', 950, 340, 
    { label: 'Combined result using all expression variables' }, ['value'], []);

  const nodes = [baseValue, multiplier, inputsDemo, nodeDataDemo, paramsDemo, iterationDemo, timeDemo, combineAll, finalCalc, output];
  const edges = [
    edge(baseValue, inputsDemo), edge(multiplier, inputsDemo, 0, 1),
    edge(baseValue, nodeDataDemo),
    edge(baseValue, paramsDemo),
    edge(baseValue, iterationDemo),
    edge(baseValue, timeDemo),
    edge(inputsDemo, combineAll), edge(nodeDataDemo, combineAll, 0, 1),
    edge(paramsDemo, combineAll, 0, 2), edge(iterationDemo, combineAll, 0, 3),
    edge(timeDemo, combineAll, 0, 4),
    edge(combineAll, finalCalc),
    edge(finalCalc, output),
  ];
  
  return graph('Expression Variables Demo',
    'Demonstrates ALL expression context variables: $inputs, $node, $params, $iteration, $time. Run Monte Carlo to see iteration effects.', nodes, edges);
}

// ============================================================================
// 7. MULTI-DIMENSIONAL DATA MODEL - Hierarchical params and nested node data
// ============================================================================
function createMultiDimensionalDemo(): Graph {
  // Input values
  const baseRevenue = node('DISTRIBUTION', 'Base Revenue', 50, 100,
    { distributionType: 'normal', min: 80000, max: 120000 }, [], ['value']);
  
  const quantity = node('DISTRIBUTION', 'Units Sold', 50, 220,
    { distributionType: 'uniform', min: 500, max: 1500 }, [], ['value']);
  
  // Regional pricing transformer - uses nested $node data for region-specific multipliers
  const regionalPricing = node('TRANSFORMER', 'Regional Pricing', 300, 100,
    { 
      expression: '$inputs.base * ($node.regions[$node.activeRegion].priceMultiplier || 1)',
      regions: {
        US: { priceMultiplier: 1.0, taxRate: 0.08, currency: 'USD' },
        EU: { priceMultiplier: 1.15, taxRate: 0.20, currency: 'EUR' },
        APAC: { priceMultiplier: 0.95, taxRate: 0.10, currency: 'USD' },
        LATAM: { priceMultiplier: 0.80, taxRate: 0.15, currency: 'USD' }
      },
      activeRegion: 'US',
      description: 'Change activeRegion to US, EU, APAC, or LATAM to see different pricing'
    },
    ['base'], ['adjusted']);
  
  // Tax calculation - uses nested $params for global tax configuration
  const taxCalc = node('TRANSFORMER', 'Tax Calculation', 300, 220,
    { 
      expression: '$inputs.revenue * ($params.taxes[$params.jurisdiction].rate || 0)',
      description: 'Uses $params.taxes[jurisdiction].rate - set jurisdiction in $params tab'
    },
    ['revenue'], ['tax']);
  
  // Discount tiers - uses array access in $node
  const discountTiers = node('TRANSFORMER', 'Tiered Discount', 300, 340,
    { 
      expression: '$inputs.qty >= $node.tiers[2].minQty ? $node.tiers[2].discount : ($inputs.qty >= $node.tiers[1].minQty ? $node.tiers[1].discount : $node.tiers[0].discount)',
      tiers: [
        { minQty: 0, discount: 0 },
        { minQty: 500, discount: 0.05 },
        { minQty: 1000, discount: 0.10 }
      ],
      description: 'Tiered discounts based on quantity thresholds'
    },
    ['qty'], ['rate']);
  
  // Season adjustment using $params.market.seasonality
  const seasonAdjust = node('TRANSFORMER', 'Seasonal Adjustment', 300, 460,
    { 
      expression: '$inputs.value * ($params.market.seasonality[$params.currentQuarter] || 1)',
      description: 'Uses $params.market.seasonality[Q1/Q2/Q3/Q4] array from global params'
    },
    ['value'], ['adjusted']);
  
  // Cost structure using nested node config
  const costStructure = node('TRANSFORMER', 'Cost Analysis', 550, 220,
    { 
      expression: '$inputs.revenue * $node.costs.variable + $node.costs.fixed.operations + $node.costs.fixed.marketing',
      costs: {
        variable: 0.35,
        fixed: {
          operations: 25000,
          marketing: 15000,
          overhead: 10000
        }
      },
      description: 'Multi-level cost structure: variable % + fixed costs'
    },
    ['revenue'], ['totalCost']);
  
  // Final profit calculation
  const profitCalc = node('TRANSFORMER', 'Net Profit', 550, 340,
    { 
      expression: '($inputs.revenue - $inputs.tax) * (1 - $inputs.discount) - $inputs.cost',
      description: 'Final calculation combining all factors'
    },
    ['revenue', 'tax', 'discount', 'cost'], ['profit']);
  
  // Scenario multiplier from $params
  const scenarioAdjust = node('TRANSFORMER', 'Scenario Adjustment', 750, 340,
    { 
      expression: '$inputs.profit * ($params.scenarios[$params.activeScenario].multiplier || 1)',
      description: 'Uses $params.scenarios[base/optimistic/pessimistic].multiplier'
    },
    ['profit'], ['adjusted']);
  
  const output = node('OUTPUT', 'Final Result', 950, 340,
    { label: 'Net profit after all adjustments' }, ['value'], []);

  const nodes = [
    baseRevenue, quantity, regionalPricing, taxCalc, discountTiers,
    seasonAdjust, costStructure, profitCalc, scenarioAdjust, output
  ];
  
  const edges = [
    edge(baseRevenue, regionalPricing),
    edge(regionalPricing, taxCalc),
    edge(quantity, discountTiers),
    edge(baseRevenue, seasonAdjust),
    edge(seasonAdjust, costStructure),
    edge(regionalPricing, profitCalc), // revenue input
    edge(taxCalc, profitCalc, 0, 1),   // tax input
    edge(discountTiers, profitCalc, 0, 2), // discount input
    edge(costStructure, profitCalc, 0, 3), // cost input
    edge(profitCalc, scenarioAdjust),
    edge(scenarioAdjust, output),
  ];
  
  // Create graph WITH default params structure
  const g = graph('Multi-Dimensional Data Model',
    'Demonstrates hierarchical data: nested $node configs and $params. Go to $params tab to set global params like taxes, scenarios, and market data.', 
    nodes, edges);
  
  // Set default $params structure
  g.params = {
    jurisdiction: 'US',
    currentQuarter: 'Q1',
    activeScenario: 'base',
    taxes: {
      US: { rate: 0.21, name: 'US Federal', credits: [] },
      EU: { rate: 0.25, name: 'EU Average', credits: ['R&D'] },
      UK: { rate: 0.19, name: 'UK Corporate', credits: [] }
    },
    market: {
      seasonality: { Q1: 0.9, Q2: 1.0, Q3: 1.1, Q4: 1.3 },
      growth: { 2024: 0.05, 2025: 0.07, 2026: 0.06 }
    },
    scenarios: {
      base: { multiplier: 1.0, label: 'Expected case' },
      optimistic: { multiplier: 1.25, label: 'Best case' },
      pessimistic: { multiplier: 0.75, label: 'Worst case' }
    }
  };
  
  return g;
}

// ============================================================================
// 8. NATCAT RISK PORTFOLIO MODEL - Ultra-Sophisticated Catastrophe Risk & Pricing
// ============================================================================
function createNatCatRiskModel(): Graph {
  // ===== LAYER 1: TOTAL INSURED VALUE BY REGION =====
  // Florida Hurricane Exposure
  const floridaTIV = node('CONSTANT', 'Florida TIV', 50, 50, { 
    value: 850000000,
    region: 'florida',
    peril: 'hurricane',
    aal: 38250000,
    deductible: 0.02
  }, [], ['value']);
  
  // California Earthquake Exposure  
  const californiaTIV = node('CONSTANT', 'California TIV', 50, 150, { 
    value: 1200000000,
    region: 'california', 
    peril: 'earthquake',
    aal: 63000000,
    deductible: 0.05
  }, [], ['value']);
  
  // Japan Earthquake/Typhoon Exposure
  const japanTIV = node('CONSTANT', 'Japan TIV', 50, 250, { 
    value: 980000000,
    region: 'tokyo',
    peril: 'earthquake',
    aal: 80850000,
    deductible: 0.04
  }, [], ['value']);
  
  // Europe Flood Exposure
  const europeTIV = node('CONSTANT', 'Europe TIV', 50, 350, { 
    value: 900000000,
    region: 'europe',
    peril: 'flood',
    aal: 10000000,
    deductible: 0.02
  }, [], ['value']);
  
  // ===== LAYER 2: STOCHASTIC EVENT GENERATION =====
  // Hurricane severity (heavy-tailed)
  const hurricaneSeverity = node('DISTRIBUTION', 'Hurricane Severity', 250, 50, {
    distributionType: 'lognormal',
    parameters: { mean: 0.15, stdDev: 0.8 }  // MDR distribution
  }, [], ['severity']);
  
  // Earthquake severity
  const earthquakeSeverity = node('DISTRIBUTION', 'Earthquake Severity', 250, 150, {
    distributionType: 'lognormal',
    parameters: { mean: 0.12, stdDev: 0.9 }
  }, [], ['severity']);
  
  // Flood severity
  const floodSeverity = node('DISTRIBUTION', 'Flood Severity', 250, 300, {
    distributionType: 'lognormal',
    parameters: { mean: 0.08, stdDev: 0.6 }
  }, [], ['severity']);
  
  // ===== LAYER 3: GROUND-UP LOSS BY REGION =====
  // Florida Hurricane Loss
  const floridaLoss = node('TRANSFORMER', 'Florida GU Loss', 450, 50, {
    expression: 'min($inputs.tiv * $inputs.severity, $inputs.tiv * 0.8)'
  }, ['tiv', 'severity'], ['loss']);
  
  // California EQ Loss
  const californiaLoss = node('TRANSFORMER', 'California GU Loss', 450, 150, {
    expression: 'min($inputs.tiv * $inputs.severity, $inputs.tiv * 0.75)'
  }, ['tiv', 'severity'], ['loss']);
  
  // Japan Loss (combined EQ + Typhoon)
  const japanLoss = node('TRANSFORMER', 'Japan GU Loss', 450, 250, {
    expression: 'min($inputs.tiv * $inputs.severity * 1.2, $inputs.tiv * 0.85)'
  }, ['tiv', 'severity'], ['loss']);
  
  // Europe Flood Loss
  const europeLoss = node('TRANSFORMER', 'Europe GU Loss', 450, 350, {
    expression: 'min($inputs.tiv * $inputs.severity * 0.9, $inputs.tiv * 0.6)'
  }, ['tiv', 'severity'], ['loss']);
  
  // ===== LAYER 4: APPLY DEDUCTIBLES =====
  const floridaNet = node('TRANSFORMER', 'Florida Net Loss', 650, 50, {
    expression: 'max($inputs.loss - $params.deductibles.florida * $inputs.loss, 0)'
  }, ['loss'], ['net']);
  
  const californiaNet = node('TRANSFORMER', 'California Net Loss', 650, 150, {
    expression: 'max($inputs.loss - $params.deductibles.california * $inputs.loss, 0)'
  }, ['loss'], ['net']);
  
  const japanNet = node('TRANSFORMER', 'Japan Net Loss', 650, 250, {
    expression: 'max($inputs.loss - $params.deductibles.japan * $inputs.loss, 0)'
  }, ['loss'], ['net']);
  
  const europeNet = node('TRANSFORMER', 'Europe Net Loss', 650, 350, {
    expression: 'max($inputs.loss - $params.deductibles.europe * $inputs.loss, 0)'
  }, ['loss'], ['net']);
  
  // ===== LAYER 5: AGGREGATE PORTFOLIO LOSS =====
  const totalGrossLoss = node('AGGREGATOR', 'Total Gross Loss', 850, 150, {
    method: 'sum'
  }, ['loss1', 'loss2', 'loss3', 'loss4'], ['total']);
  
  const totalNetLoss = node('AGGREGATOR', 'Total Net Loss', 850, 300, {
    method: 'sum'
  }, ['net1', 'net2', 'net3', 'net4'], ['total']);
  
  // ===== LAYER 6: REINSURANCE TREATY APPLICATION =====
  // Quota Share (cede 20%)
  const quotaShareRetention = node('TRANSFORMER', 'QS Retention', 1050, 200, {
    expression: '$inputs.net * (1 - $params.treaty.quotaShare)'
  }, ['net'], ['retained']);
  
  const quotaShareCeded = node('TRANSFORMER', 'QS Ceded', 1050, 300, {
    expression: '$inputs.net * $params.treaty.quotaShare'
  }, ['net'], ['ceded']);
  
  // Excess of Loss Layer 1: $25M xs $25M
  const xolLayer1 = node('TRANSFORMER', 'XOL Layer 1', 1250, 200, {
    expression: 'min(max($inputs.retained - $params.treaty.xol1.attachment, 0), $params.treaty.xol1.limit)'
  }, ['retained'], ['recovery']);
  
  // Excess of Loss Layer 2: $50M xs $50M
  const xolLayer2 = node('TRANSFORMER', 'XOL Layer 2', 1250, 300, {
    expression: 'min(max($inputs.retained - $params.treaty.xol2.attachment, 0), $params.treaty.xol2.limit)'
  }, ['retained'], ['recovery']);
  
  // Final Net Retained
  const finalRetained = node('TRANSFORMER', 'Final Net Retained', 1450, 250, {
    expression: '$inputs.retained - $inputs.xol1 - $inputs.xol2'
  }, ['retained', 'xol1', 'xol2'], ['final']);
  
  // ===== LAYER 7: PRICING CALCULATIONS =====
  // Expected Loss (will aggregate across iterations)
  const expectedLoss = node('TRANSFORMER', 'Expected Loss', 1650, 150, {
    expression: '$inputs.final * $params.pricing.lossLoadFactor'
  }, ['final'], ['expected']);
  
  // Risk Load (Wang Transform approximation)
  const riskLoad = node('TRANSFORMER', 'Risk Load', 1650, 250, {
    expression: '$inputs.final * $params.pricing.riskLoadFactor * (1 + $params.pricing.wangLambda)'
  }, ['final'], ['load']);
  
  // Expense Load
  const expenseLoad = node('TRANSFORMER', 'Expense Load', 1650, 350, {
    expression: '($inputs.expected + $inputs.risk) * $params.pricing.expenseRatio'
  }, ['expected', 'risk'], ['expenses']);
  
  // Technical Premium
  const technicalPremium = node('TRANSFORMER', 'Technical Premium', 1850, 200, {
    expression: '$inputs.expected + $inputs.risk + $inputs.expenses + $inputs.expected * $params.pricing.profitMargin'
  }, ['expected', 'risk', 'expenses'], ['premium']);
  
  // ===== LAYER 8: CAPITAL CALCULATION =====
  const capitalRequired = node('TRANSFORMER', 'Required Capital', 1850, 350, {
    expression: '$inputs.final * $params.capital.varMultiplier * $params.capital.solvencyFactor'
  }, ['final'], ['capital']);
  
  // Return on Capital
  const returnOnCapital = node('TRANSFORMER', 'Return on Capital', 2050, 275, {
    expression: '$inputs.premium / max($inputs.capital, 1)'
  }, ['premium', 'capital'], ['roc']);
  
  // ===== OUTPUTS =====
  const outputGrossLoss = node('OUTPUT', 'Gross Loss', 2250, 100, { label: 'grossLoss' }, ['value'], []);
  const outputNetLoss = node('OUTPUT', 'Net Loss', 2250, 175, { label: 'netLoss' }, ['value'], []);
  const outputRetained = node('OUTPUT', 'Final Retained', 2250, 250, { label: 'retained' }, ['value'], []);
  const outputPremium = node('OUTPUT', 'Premium', 2250, 325, { label: 'premium' }, ['value'], []);
  const outputCapital = node('OUTPUT', 'Capital', 2250, 400, { label: 'capital' }, ['value'], []);
  const outputROC = node('OUTPUT', 'ROC', 2250, 475, { label: 'roc' }, ['value'], []);

  const nodes = [
    // TIV nodes
    floridaTIV, californiaTIV, japanTIV, europeTIV,
    // Severity distributions
    hurricaneSeverity, earthquakeSeverity, floodSeverity,
    // Ground-up losses
    floridaLoss, californiaLoss, japanLoss, europeLoss,
    // Net losses after deductible
    floridaNet, californiaNet, japanNet, europeNet,
    // Aggregators
    totalGrossLoss, totalNetLoss,
    // Reinsurance
    quotaShareRetention, quotaShareCeded, xolLayer1, xolLayer2, finalRetained,
    // Pricing
    expectedLoss, riskLoad, expenseLoad, technicalPremium,
    // Capital
    capitalRequired, returnOnCapital,
    // Outputs
    outputGrossLoss, outputNetLoss, outputRetained, outputPremium, outputCapital, outputROC,
  ];
  
  const edges = [
    // TIV → GU Loss calculations
    edge(floridaTIV, floridaLoss), edge(hurricaneSeverity, floridaLoss, 0, 1),
    edge(californiaTIV, californiaLoss), edge(earthquakeSeverity, californiaLoss, 0, 1),
    edge(japanTIV, japanLoss), edge(earthquakeSeverity, japanLoss, 0, 1),
    edge(europeTIV, europeLoss), edge(floodSeverity, europeLoss, 0, 1),
    
    // GU Loss → Net Loss (after deductible)
    edge(floridaLoss, floridaNet),
    edge(californiaLoss, californiaNet),
    edge(japanLoss, japanNet),
    edge(europeLoss, europeNet),
    
    // Aggregate losses
    edge(floridaLoss, totalGrossLoss),
    edge(californiaLoss, totalGrossLoss, 0, 1),
    edge(japanLoss, totalGrossLoss, 0, 2),
    edge(europeLoss, totalGrossLoss, 0, 3),
    
    edge(floridaNet, totalNetLoss),
    edge(californiaNet, totalNetLoss, 0, 1),
    edge(japanNet, totalNetLoss, 0, 2),
    edge(europeNet, totalNetLoss, 0, 3),
    
    // Reinsurance chain
    edge(totalNetLoss, quotaShareRetention),
    edge(totalNetLoss, quotaShareCeded),
    edge(quotaShareRetention, xolLayer1),
    edge(quotaShareRetention, xolLayer2),
    edge(quotaShareRetention, finalRetained),
    edge(xolLayer1, finalRetained, 0, 1),
    edge(xolLayer2, finalRetained, 0, 2),
    
    // Pricing chain
    edge(finalRetained, expectedLoss),
    edge(finalRetained, riskLoad),
    edge(expectedLoss, expenseLoad),
    edge(riskLoad, expenseLoad, 0, 1),
    edge(expectedLoss, technicalPremium),
    edge(riskLoad, technicalPremium, 0, 1),
    edge(expenseLoad, technicalPremium, 0, 2),
    
    // Capital chain
    edge(finalRetained, capitalRequired),
    edge(technicalPremium, returnOnCapital),
    edge(capitalRequired, returnOnCapital, 0, 1),
    
    // Outputs
    edge(totalGrossLoss, outputGrossLoss),
    edge(totalNetLoss, outputNetLoss),
    edge(finalRetained, outputRetained),
    edge(technicalPremium, outputPremium),
    edge(capitalRequired, outputCapital),
    edge(returnOnCapital, outputROC),
  ];
  
  // Create graph with comprehensive $params
  const g = graph(
    'NatCat Portfolio Risk & Pricing Model',
    'Catastrophe risk model with multi-region exposure (Florida Hurricane, California EQ, Japan, Europe Flood), stochastic severity, deductibles, quota share + XOL reinsurance, technical pricing with risk/expense loads, and capital calculation. Uses deeply nested $params for all model parameters.',
    nodes,
    edges
  );
  
  // Nested global parameters for full customization
  g.params = {
    // Deductibles by region
    deductibles: {
      florida: 0.02,
      california: 0.05,
      japan: 0.04,
      europe: 0.02
    },
    // Reinsurance treaty structure
    treaty: {
      quotaShare: 0.20,  // 20% quota share
      xol1: {
        attachment: 25000000,  // $25M attachment
        limit: 25000000,       // $25M limit
        rate: 0.08             // 8% rate on line
      },
      xol2: {
        attachment: 50000000,  // $50M attachment
        limit: 50000000,       // $50M limit
        rate: 0.05             // 5% rate on line
      }
    },
    // Pricing parameters
    pricing: {
      lossLoadFactor: 1.0,
      riskLoadFactor: 0.25,
      wangLambda: 0.35,
      expenseRatio: 0.28,
      profitMargin: 0.12
    },
    // Capital model
    capital: {
      varMultiplier: 2.5,      // VaR multiplier for tail risk
      solvencyFactor: 1.2,     // Solvency II SCR factor
      targetROE: 0.15          // Target return on equity
    },
    // Model settings
    model: {
      correlationFactor: 0.3,  // Inter-region correlation
      climateAdjustment: 1.08, // Climate change uplift
      modelUncertainty: 0.15   // Model uncertainty margin
    }
  };
  
  return g;
}

// ============================================================================
// 9. FEEDBACK LOOP DEMO - Newton's Method for Square Root
// ============================================================================
function createFeedbackLoopDemo(): Graph {
  // Demonstrates iterative convergence using feedback edges
  // Calculates square root of target using Newton's method: x_new = (x + target/x) / 2
  
  const target = node('CONSTANT', 'Target (√25)', 50, 100, { value: 25 }, [], ['value']);
  const guess = node('PARAMETER', 'Initial Guess', 50, 200, { value: 5, min: 0.1, max: 100 }, ['feedback'], ['value']);
  
  // Newton's method: new_guess = (guess + target/guess) / 2
  const divider = node('TRANSFORMER', 'Divide', 300, 150,
    { expression: '$inputs.target / $inputs.guess' }, ['target', 'guess'], ['quotient']);
  
  const summer = node('TRANSFORMER', 'Add', 500, 150,
    { expression: '$inputs.guess + $inputs.quotient' }, ['guess', 'quotient'], ['sum']);
  
  const halver = node('TRANSFORMER', 'Average', 700, 150,
    { expression: '$inputs.sum / 2' }, ['sum'], ['new_guess']);
  
  const result = node('OUTPUT', 'Result', 900, 150, {}, ['value'], []);
  
  const nodes = [target, guess, divider, summer, halver, result];
  
  // Forward flow
  const e1 = edge(target, divider, 0, 0);
  const e2 = edge(guess, divider, 0, 1);
  const e3 = edge(guess, summer, 0, 0);
  const e4 = edge(divider, summer, 0, 1);
  const e5 = edge(summer, halver, 0, 0);
  const e6 = edge(halver, result, 0, 0);
  
  // Feedback edge - creates iterative loop
  const feedback = edge(halver, guess, 0, 0);
  feedback.type = 'FEEDBACK';
  feedback.feedbackIterations = 50;
  feedback.convergenceTolerance = 0.0001;
  feedback.animated = true;
  feedback.label = '🔄 Feedback';
  feedback.style = { strokeColor: '#8b5cf6', strokeWidth: 3, strokeDasharray: '5 5' };
  
  const g = graph(
    'Feedback Loop Demo',
    'Newton\'s Method for calculating square root using iterative feedback convergence',
    nodes,
    [e1, e2, e3, e4, e5, e6, feedback]
  );
  
  g.metadata = {
    algorithm: 'Newton\'s Method',
    formula: 'x_new = (x + target/x) / 2',
    expectedResult: 5.0, // √25 = 5
    convergenceIterations: 'Typically 3-5 iterations',
    notes: 'Demonstrates feedback edge with convergence detection'
  };
  
  return g;
}

// Export individual sample generators for lazy loading
export const advancedSampleGenerators = {
  'compound-interest': () => { idCounter = 1000; return createCompoundInterest(); },
  'monte-carlo-pi': () => { idCounter = 1100; return createMonteCarloPi(); },
  'loan-amortization': () => { idCounter = 1200; return createLoanAmortization(); },
  'option-pricing': () => { idCounter = 1300; return createOptionPricing(); },
  'epidemic-model': () => { idCounter = 1400; return createEpidemicModel(); },
  'expression-demo': () => { idCounter = 1500; return createExpressionVariablesDemo(); },
  'multi-dim-demo': () => { idCounter = 1600; return createMultiDimensionalDemo(); },
  'natcat-risk': () => { idCounter = 2000; return createNatCatRiskModel(); },
  'feedback-loop-demo': () => { idCounter = 3000; return createFeedbackLoopDemo(); },
};

// Legacy function - generates ALL advanced graphs at once (avoid for performance)
export function getAdvancedSampleGraphs(): Graph[] {
  idCounter = 1000; // Offset to avoid ID conflicts
  return [
    createCompoundInterest(),
    createMonteCarloPi(),
    createLoanAmortization(),
    createOptionPricing(),
    createEpidemicModel(),
    createExpressionVariablesDemo(),
    createMultiDimensionalDemo(),
    createNatCatRiskModel(),
    createFeedbackLoopDemo(),
  ];
}

export const advancedSampleDescriptions = [
  { name: 'Compound Interest Calculator', description: 'Multi-stage compound interest P(1+r/n)^(nt)', complexity: 'Intermediate', nodeCount: 13 },
  { name: 'Monte Carlo Pi Estimation', description: 'Estimate π with random point sampling', complexity: 'Intermediate', nodeCount: 8 },
  { name: 'Loan Amortization Calculator', description: 'Mortgage payment and interest breakdown', complexity: 'Intermediate', nodeCount: 12 },
  { name: 'Option Pricing Model', description: 'Black-Scholes components with stochastic inputs', complexity: 'Advanced', nodeCount: 15 },
  { name: 'Epidemic Spread Model', description: 'SIR-inspired R₀ and infection projection', complexity: 'Advanced', nodeCount: 16 },
  { name: 'Expression Variables Demo', description: 'Shows $inputs, $node, $params, $iteration, $time', complexity: 'Beginner', nodeCount: 10 },
  { name: 'Multi-Dimensional Data Model', description: 'Hierarchical nested data with $params and $node', complexity: 'Advanced', nodeCount: 10 },
  { name: 'NatCat Portfolio Risk & Pricing Model', description: 'Catastrophe risk with multi-region exposure, stochastic severity, reinsurance, pricing, and capital', complexity: 'Expert', nodeCount: 33 },
  { name: 'Feedback Loop Demo', description: 'Iterative convergence with feedback edges', complexity: 'Advanced', nodeCount: 6 },
];
