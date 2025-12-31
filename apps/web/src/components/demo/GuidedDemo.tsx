/**
 * GuidedDemo - Interactive Step-by-Step Demo of ScenarioForge
 * 
 * This component provides a guided tour showcasing the platform's key features:
 * 1. Domain-agnostic graph modeling
 * 2. Monte Carlo simulation with uncertainty
 * 3. Risk metrics and analysis
 * 4. Sensitivity analysis
 * 5. Real-world decision support
 */

import { useState, useCallback, useEffect } from 'react';
import { useGraphStore } from '../../stores/graphStore';
import { executeGraph, runMonteCarloSimulation, calculateRiskMetrics, runSensitivityAnalysis } from '@scenarioforge/core';
import type { Graph, NodeDefinition, EdgeDefinition, RiskMetrics } from '@scenarioforge/core';

// Demo scenarios showing domain-agnostic capability
const DEMO_SCENARIOS = {
  startup: {
    name: '🚀 Startup Investment Decision',
    description: 'Should you invest $500K in a tech startup? Model uncertainty in market size, conversion rates, and costs.',
    domain: 'Finance/VC',
    question: 'What is the probability of achieving 3x return within 3 years?',
  },
  manufacturing: {
    name: '🏭 Manufacturing Capacity Planning',
    description: 'Optimize production capacity considering demand uncertainty, machine failures, and supply chain disruptions.',
    domain: 'Operations',
    question: 'What capacity level minimizes total cost while meeting 95% of demand?',
  },
  climate: {
    name: '🌍 Climate Risk Assessment',
    description: 'Assess flood risk for a coastal property considering sea level rise, storm frequency, and mitigation costs.',
    domain: 'Risk/Insurance',
    question: 'What is the expected annual loss and should we invest in flood barriers?',
  },
  drug: {
    name: '💊 Drug Development Pipeline',
    description: 'Model the probability of a drug reaching market considering trial success rates and development costs.',
    domain: 'Pharma/Biotech',
    question: 'What is the expected NPV of the drug development program?',
  },
};

interface DemoStep {
  id: string;
  title: string;
  description: string;
  action: string;
  insight: string;
  feature: string;
}

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'intro',
    title: 'Welcome to ScenarioForge',
    description: 'ScenarioForge is a domain-agnostic platform for modeling uncertainty and making better decisions. Unlike spreadsheets, it lets you visualize complex relationships and run thousands of simulations.',
    action: 'Click "Start Demo" to begin',
    insight: 'Traditional tools hide uncertainty. We make it visible.',
    feature: 'Graph-Based Modeling',
  },
  {
    id: 'scenario',
    title: 'Choose Your Scenario',
    description: 'The platform works for ANY domain - finance, operations, healthcare, climate, or your custom problem. Select a scenario to see how the same tool adapts.',
    action: 'Select a scenario below',
    insight: 'One platform, infinite applications.',
    feature: 'Domain Agnostic',
  },
  {
    id: 'build',
    title: 'Building the Model',
    description: 'Watch as we construct a graph model. Each node represents a variable - constants (known values), distributions (uncertain values), transformers (calculations), and outputs (results).',
    action: 'Observe the model being built',
    insight: 'Visual models are easier to understand and audit than formulas.',
    feature: 'Visual Modeling',
  },
  {
    id: 'deterministic',
    title: 'Single-Point Estimate',
    description: 'First, let\'s run a single calculation using average values. This is what most spreadsheets do - but it hides the uncertainty!',
    action: 'Running deterministic calculation...',
    insight: 'Single-point estimates can be dangerously misleading.',
    feature: 'Deterministic Execution',
  },
  {
    id: 'montecarlo',
    title: 'Monte Carlo Simulation',
    description: 'Now the magic: we run 10,000 simulations, each time sampling from the probability distributions. This reveals the RANGE of possible outcomes.',
    action: 'Running 10,000 simulations...',
    insight: 'Monte Carlo reveals what single estimates hide.',
    feature: 'Monte Carlo Simulation',
  },
  {
    id: 'risk',
    title: 'Risk Metrics',
    description: 'From the simulation results, we calculate risk metrics: Value at Risk (VaR), Expected Shortfall, probability of loss, and confidence intervals.',
    action: 'Calculating risk metrics...',
    insight: 'Know your downside before making decisions.',
    feature: 'Risk Analysis',
  },
  {
    id: 'sensitivity',
    title: 'Sensitivity Analysis',
    description: 'Which inputs matter most? Sensitivity analysis shows which variables have the biggest impact on your outcome - focus your effort there!',
    action: 'Analyzing sensitivities...',
    insight: 'Don\'t optimize what doesn\'t matter.',
    feature: 'Sensitivity Analysis',
  },
  {
    id: 'decision',
    title: 'Decision Support',
    description: 'With all this information, you can make an informed decision. The platform doesn\'t decide for you - it shows you the full picture.',
    action: 'Review results and decide',
    insight: 'Better information = better decisions.',
    feature: 'Decision Support',
  },
];

// Helper to create nodes and edges for demo
function createDemoNode(
  type: NodeDefinition['type'],
  name: string,
  position: { x: number; y: number },
  data: Record<string, unknown>,
  inputPorts: Array<{ name: string }> = [],
  outputPorts: Array<{ name: string }> = [{ name: 'value' }]
): NodeDefinition {
  const id = `demo-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  const now = new Date();
  return {
    id,
    type,
    name,
    position,
    schema: { type: 'object', properties: {} },
    data,
    inputPorts: inputPorts.map((p, i) => ({
      id: `${id}-in-${i}`,
      name: p.name,
      dataType: 'number' as const,
      required: true,
      multiple: false,
    })),
    outputPorts: outputPorts.map((p, i) => ({
      id: `${id}-out-${i}`,
      name: p.name,
      dataType: 'number' as const,
      required: false,
      multiple: true,
    })),
    tags: [],
    locked: false,
    createdAt: now,
    updatedAt: now,
  };
}

function createDemoEdge(source: NodeDefinition, target: NodeDefinition, sourcePort = 0, targetPort = 0): EdgeDefinition {
  const now = new Date();
  return {
    id: `edge-${source.id}-${target.id}-${Date.now()}`,
    sourceNodeId: source.id,
    sourcePortId: source.outputPorts[sourcePort]?.id ?? '',
    targetNodeId: target.id,
    targetPortId: target.inputPorts[targetPort]?.id ?? '',
    type: 'DATA_FLOW',
    schema: { type: 'object' },
    data: {},
    style: {},
    animated: false,
    createdAt: now,
    updatedAt: now,
  };
}

// Create demo graph for startup investment scenario
function createStartupInvestmentGraph(): Graph {
  const nodes: NodeDefinition[] = [];
  const edges: EdgeDefinition[] = [];
  
  // Investment amount (known)
  const investment = createDemoNode('CONSTANT', 'Investment', { x: 50, y: 50 }, { value: 500000 });
  nodes.push(investment);
  
  // Market size (uncertain - triangular distribution)
  const marketSize = createDemoNode('DISTRIBUTION', 'Market Size ($M)', { x: 50, y: 150 }, 
    { distributionType: 'triangular', min: 50, mode: 100, max: 200 });
  nodes.push(marketSize);
  
  // Market capture rate (uncertain)
  const captureRate = createDemoNode('DISTRIBUTION', 'Capture Rate (%)', { x: 50, y: 250 },
    { distributionType: 'triangular', min: 0.5, mode: 2, max: 5 });
  nodes.push(captureRate);
  
  // Revenue per user (uncertain)
  const revenuePerUser = createDemoNode('DISTRIBUTION', 'Avg Revenue/User', { x: 50, y: 350 },
    { distributionType: 'normal', mean: 120, stddev: 30 });
  nodes.push(revenuePerUser);
  
  // Operating cost ratio (uncertain)
  const costRatio = createDemoNode('DISTRIBUTION', 'Cost Ratio', { x: 50, y: 450 },
    { distributionType: 'uniform', min: 0.6, max: 0.85 });
  nodes.push(costRatio);
  
  // Calculate total addressable market
  const tam = createDemoNode('TRANSFORMER', 'TAM ($)', { x: 300, y: 150 },
    { expression: '$inputs.marketSize * 1000000' },
    [{ name: 'marketSize' }]);
  nodes.push(tam);
  edges.push(createDemoEdge(marketSize, tam, 0, 0));
  
  // Calculate captured customers
  const customers = createDemoNode('TRANSFORMER', 'Customers', { x: 300, y: 250 },
    { expression: '($inputs.tam / 100) * ($inputs.captureRate / 100)' },
    [{ name: 'tam' }, { name: 'captureRate' }]);
  nodes.push(customers);
  edges.push(createDemoEdge(tam, customers, 0, 0));
  edges.push(createDemoEdge(captureRate, customers, 0, 1));
  
  // Calculate revenue
  const revenue = createDemoNode('TRANSFORMER', 'Annual Revenue', { x: 550, y: 250 },
    { expression: '$inputs.customers * $inputs.arpu' },
    [{ name: 'customers' }, { name: 'arpu' }]);
  nodes.push(revenue);
  edges.push(createDemoEdge(customers, revenue, 0, 0));
  edges.push(createDemoEdge(revenuePerUser, revenue, 0, 1));
  
  // Calculate costs
  const costs = createDemoNode('TRANSFORMER', 'Operating Costs', { x: 550, y: 350 },
    { expression: '$inputs.revenue * $inputs.costRatio' },
    [{ name: 'revenue' }, { name: 'costRatio' }]);
  nodes.push(costs);
  edges.push(createDemoEdge(revenue, costs, 0, 0));
  edges.push(createDemoEdge(costRatio, costs, 0, 1));
  
  // Calculate profit
  const profit = createDemoNode('TRANSFORMER', 'Net Profit', { x: 800, y: 300 },
    { expression: '$inputs.revenue - $inputs.costs' },
    [{ name: 'revenue' }, { name: 'costs' }]);
  nodes.push(profit);
  edges.push(createDemoEdge(revenue, profit, 0, 0));
  edges.push(createDemoEdge(costs, profit, 0, 1));
  
  // Calculate 3-year value (simple multiple)
  const exitValue = createDemoNode('TRANSFORMER', '3-Year Exit Value', { x: 800, y: 150 },
    { expression: '$inputs.profit * 8' }, // 8x profit multiple
    [{ name: 'profit' }]);
  nodes.push(exitValue);
  edges.push(createDemoEdge(profit, exitValue, 0, 0));
  
  // Calculate ROI
  const roi = createDemoNode('TRANSFORMER', 'ROI Multiple', { x: 1050, y: 200 },
    { expression: '$inputs.exitValue / $inputs.investment' },
    [{ name: 'exitValue' }, { name: 'investment' }]);
  nodes.push(roi);
  edges.push(createDemoEdge(exitValue, roi, 0, 0));
  edges.push(createDemoEdge(investment, roi, 0, 1));
  
  // Output
  const output = createDemoNode('OUTPUT', 'Investment Return', { x: 1300, y: 200 },
    { label: 'ROI Multiple' },
    [{ name: 'value' }], []);
  nodes.push(output);
  edges.push(createDemoEdge(roi, output, 0, 0));
  
  const now = new Date();
  return {
    id: `demo-startup-${Date.now()}`,
    name: 'Startup Investment Analysis',
    description: 'Monte Carlo analysis of startup investment ROI under uncertainty',
    nodes,
    edges,
    metadata: { demo: true },
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

interface SimResults {
  deterministic: number | null;
  monteCarloOutputs: number[];
  metrics: RiskMetrics | null;
  sensitivity: Array<{ variable: string; impact: number }>;
}

export function GuidedDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState<keyof typeof DEMO_SCENARIOS | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<SimResults>({
    deterministic: null,
    monteCarloOutputs: [],
    metrics: null,
    sensitivity: [],
  });
  
  const { setCurrentGraph, currentGraph } = useGraphStore();
  
  const step = DEMO_STEPS[currentStep];
  
  // Build demo graph when scenario selected
  const buildDemoGraph = useCallback(() => {
    if (selectedScenario === 'startup') {
      const graph = createStartupInvestmentGraph();
      setCurrentGraph(graph);
      return graph;
    }
    return null;
  }, [selectedScenario, setCurrentGraph]);
  
  // Run deterministic calculation
  const runDeterministic = useCallback(async () => {
    if (!currentGraph) return;
    setIsRunning(true);
    try {
      const result = await Promise.resolve(executeGraph(currentGraph));
      if (result.success && result.outputNodes.length > 0) {
        const outputValue = Object.values(result.outputNodes[0].outputs)[0];
        setResults(prev => ({ ...prev, deterministic: typeof outputValue === 'number' ? outputValue : null }));
      }
    } catch (e) {
      console.error('Deterministic run failed:', e);
    }
    setIsRunning(false);
  }, [currentGraph]);
  
  // Run Monte Carlo
  const runMonteCarlo = useCallback(async () => {
    if (!currentGraph) return;
    setIsRunning(true);
    try {
      const mcResult = runMonteCarloSimulation(currentGraph, {
        graphId: currentGraph.id,
        iterations: 10000,
        seed: 42,
        outputNodeIds: currentGraph.nodes.filter(n => n.type === 'OUTPUT').map(n => n.id),
        sensitivityConfig: { enabled: true, variables: [] },
      });
      
      if (mcResult.success && mcResult.results.length > 0) {
        const outputValues = mcResult.results.map(r => {
          const vals = Object.values(r.outputs);
          return typeof vals[0] === 'number' ? vals[0] : 0;
        });
        
        // Calculate risk metrics
        const metrics = calculateRiskMetrics(outputValues, { confidenceLevel: 0.95 });
        
        setResults(prev => ({
          ...prev,
          monteCarloOutputs: outputValues,
          metrics,
        }));
      }
    } catch (e) {
      console.error('Monte Carlo failed:', e);
    }
    setIsRunning(false);
  }, [currentGraph]);
  
  // Run sensitivity analysis
  const runSensitivity = useCallback(async () => {
    if (!currentGraph) return;
    setIsRunning(true);
    try {
      const sensResult = runSensitivityAnalysis(currentGraph, {
        graphId: currentGraph.id,
        baseIterations: 1000,
        perturbationPercent: 10,
        variables: currentGraph.nodes
          .filter(n => n.type === 'DISTRIBUTION' || n.type === 'PARAMETER')
          .map(n => ({ nodeId: n.id, paramPath: 'mean' })),
      });
      
      if (sensResult.success) {
        const sortedSensitivity = [...sensResult.sensitivities]
          .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
          .map(s => {
            const node = currentGraph.nodes.find(n => n.id === s.variableId);
            return { variable: node?.name ?? s.variableId, impact: s.impact };
          });
        
        setResults(prev => ({ ...prev, sensitivity: sortedSensitivity }));
      }
    } catch (e) {
      console.error('Sensitivity analysis failed:', e);
    }
    setIsRunning(false);
  }, [currentGraph]);
  
  // Handle step progression
  const handleNext = useCallback(async () => {
    const stepId = DEMO_STEPS[currentStep]?.id;
    
    if (stepId === 'scenario' && selectedScenario) {
      buildDemoGraph();
      setCurrentStep(prev => prev + 1);
    } else if (stepId === 'build') {
      setCurrentStep(prev => prev + 1);
    } else if (stepId === 'deterministic') {
      await runDeterministic();
      setTimeout(() => setCurrentStep(prev => prev + 1), 1000);
    } else if (stepId === 'montecarlo') {
      await runMonteCarlo();
      setTimeout(() => setCurrentStep(prev => prev + 1), 1000);
    } else if (stepId === 'risk') {
      setCurrentStep(prev => prev + 1);
    } else if (stepId === 'sensitivity') {
      await runSensitivity();
      setTimeout(() => setCurrentStep(prev => prev + 1), 1000);
    } else {
      setCurrentStep(prev => Math.min(prev + 1, DEMO_STEPS.length - 1));
    }
  }, [currentStep, selectedScenario, buildDemoGraph, runDeterministic, runMonteCarlo, runSensitivity]);
  
  const handleBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);
  
  const handleStart = useCallback(() => {
    setCurrentStep(1);
    setResults({ deterministic: null, monteCarloOutputs: [], metrics: null, sensitivity: [] });
  }, []);
  
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCurrentStep(0);
    setSelectedScenario(null);
  }, []);
  
  // Calculate derived metrics for display
  const probabilityOf3x = results.monteCarloOutputs.length > 0
    ? (results.monteCarloOutputs.filter(v => v >= 3).length / results.monteCarloOutputs.length) * 100
    : 0;
  
  const probabilityOfLoss = results.monteCarloOutputs.length > 0
    ? (results.monteCarloOutputs.filter(v => v < 1).length / results.monteCarloOutputs.length) * 100
    : 0;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 z-50"
      >
        <span className="text-xl">🎯</span>
        <span className="font-semibold">Interactive Demo</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-blue-900 p-6 border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>🎯</span> {step?.title}
              </h2>
              <p className="text-purple-200 mt-1 text-sm">{step?.feature}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 flex gap-1">
            {DEMO_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${
                  i <= currentStep ? 'bg-purple-400' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <p className="text-gray-300 text-lg mb-6">{step?.description}</p>
          
          {/* Scenario Selection */}
          {step?.id === 'scenario' && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {Object.entries(DEMO_SCENARIOS).map(([key, scenario]) => (
                <button
                  key={key}
                  onClick={() => setSelectedScenario(key as keyof typeof DEMO_SCENARIOS)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedScenario === key
                      ? 'border-purple-500 bg-purple-900/30'
                      : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                  }`}
                >
                  <div className="text-lg font-semibold text-white">{scenario.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{scenario.domain}</div>
                  <div className="text-xs text-gray-500 mt-2">{scenario.description}</div>
                </button>
              ))}
            </div>
          )}
          
          {/* Build visualization */}
          {step?.id === 'build' && currentGraph && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-white font-semibold mb-2">Model Structure:</h3>
              <div className="text-sm text-gray-400 space-y-1">
                <p>📊 <span className="text-blue-400">{currentGraph.nodes.filter(n => n.type === 'DISTRIBUTION').length}</span> uncertain variables (distributions)</p>
                <p>📌 <span className="text-green-400">{currentGraph.nodes.filter(n => n.type === 'CONSTANT').length}</span> fixed values</p>
                <p>⚙️ <span className="text-yellow-400">{currentGraph.nodes.filter(n => n.type === 'TRANSFORMER').length}</span> calculations</p>
                <p>📤 <span className="text-purple-400">{currentGraph.nodes.filter(n => n.type === 'OUTPUT').length}</span> outputs</p>
                <p>🔗 <span className="text-gray-400">{currentGraph.edges.length}</span> connections</p>
              </div>
            </div>
          )}
          
          {/* Deterministic result */}
          {step?.id === 'deterministic' && results.deterministic !== null && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-white font-semibold mb-2">Single-Point Result:</h3>
              <div className="text-4xl font-bold text-yellow-400">
                {results.deterministic.toFixed(2)}x ROI
              </div>
              <p className="text-sm text-gray-500 mt-2">
                ⚠️ This assumes all variables hit their average values - unlikely in reality!
              </p>
            </div>
          )}
          
          {/* Monte Carlo results */}
          {(step?.id === 'montecarlo' || step?.id === 'risk' || step?.id === 'sensitivity' || step?.id === 'decision') && results.monteCarloOutputs.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-white font-semibold mb-3">Monte Carlo Results (10,000 simulations):</h3>
              
              {/* Histogram visualization */}
              <div className="h-24 flex items-end gap-px mb-4">
                {(() => {
                  const min = Math.min(...results.monteCarloOutputs);
                  const max = Math.max(...results.monteCarloOutputs);
                  const buckets = 50;
                  const bucketWidth = (max - min) / buckets;
                  const histogram = new Array(buckets).fill(0);
                  results.monteCarloOutputs.forEach(v => {
                    const bucket = Math.min(Math.floor((v - min) / bucketWidth), buckets - 1);
                    histogram[bucket]++;
                  });
                  const maxCount = Math.max(...histogram);
                  
                  return histogram.map((count, i) => {
                    const value = min + (i + 0.5) * bucketWidth;
                    const isLoss = value < 1;
                    const is3x = value >= 3;
                    return (
                      <div
                        key={i}
                        className={`flex-1 ${isLoss ? 'bg-red-500' : is3x ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ height: `${(count / maxCount) * 100}%` }}
                        title={`${value.toFixed(1)}x: ${count} simulations`}
                      />
                    );
                  });
                })()}
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-900 rounded p-3">
                  <div className="text-2xl font-bold text-green-400">{probabilityOf3x.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">Chance of 3x+ Return</div>
                </div>
                <div className="bg-gray-900 rounded p-3">
                  <div className="text-2xl font-bold text-red-400">{probabilityOfLoss.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">Chance of Loss</div>
                </div>
                <div className="bg-gray-900 rounded p-3">
                  <div className="text-2xl font-bold text-blue-400">
                    {results.metrics?.mean.toFixed(2)}x
                  </div>
                  <div className="text-xs text-gray-500">Expected Return</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Risk metrics */}
          {(step?.id === 'risk' || step?.id === 'sensitivity' || step?.id === 'decision') && results.metrics && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-white font-semibold mb-3">Risk Metrics:</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 rounded p-3">
                  <div className="text-lg font-semibold text-orange-400">
                    {results.metrics.var95.toFixed(2)}x
                  </div>
                  <div className="text-xs text-gray-500">Value at Risk (5%)</div>
                  <div className="text-xs text-gray-600">95% of outcomes are better than this</div>
                </div>
                <div className="bg-gray-900 rounded p-3">
                  <div className="text-lg font-semibold text-purple-400">
                    {results.metrics.expectedShortfall.toFixed(2)}x
                  </div>
                  <div className="text-xs text-gray-500">Expected Shortfall</div>
                  <div className="text-xs text-gray-600">Average of worst 5%</div>
                </div>
                <div className="bg-gray-900 rounded p-3">
                  <div className="text-lg font-semibold text-cyan-400">
                    [{results.metrics.confidenceInterval.lower.toFixed(2)}x - {results.metrics.confidenceInterval.upper.toFixed(2)}x]
                  </div>
                  <div className="text-xs text-gray-500">95% Confidence Interval</div>
                </div>
                <div className="bg-gray-900 rounded p-3">
                  <div className="text-lg font-semibold text-pink-400">
                    {results.metrics.standardDeviation.toFixed(2)}x
                  </div>
                  <div className="text-xs text-gray-500">Volatility (Std Dev)</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Sensitivity results */}
          {(step?.id === 'sensitivity' || step?.id === 'decision') && results.sensitivity.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-white font-semibold mb-3">Sensitivity Analysis:</h3>
              <p className="text-sm text-gray-400 mb-3">Which inputs have the biggest impact on your outcome?</p>
              <div className="space-y-2">
                {results.sensitivity.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-300 truncate">{s.variable}</div>
                    <div className="flex-1 h-4 bg-gray-900 rounded overflow-hidden">
                      <div
                        className={`h-full ${s.impact > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(Math.abs(s.impact) * 100, 100)}%` }}
                      />
                    </div>
                    <div className={`text-sm w-16 text-right ${s.impact > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(s.impact * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Decision summary */}
          {step?.id === 'decision' && results.metrics && (
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-4 border border-purple-500/30">
              <h3 className="text-white font-semibold mb-3">📊 Decision Summary:</h3>
              <div className="text-gray-300 space-y-2">
                <p>Based on 10,000 simulations of your ${(500000).toLocaleString()} investment:</p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                  <li>Expected return: <span className="text-blue-400">{results.metrics.mean.toFixed(2)}x</span> (${(500000 * results.metrics.mean).toLocaleString()})</li>
                  <li>Probability of 3x+ return: <span className="text-green-400">{probabilityOf3x.toFixed(1)}%</span></li>
                  <li>Probability of losing money: <span className="text-red-400">{probabilityOfLoss.toFixed(1)}%</span></li>
                  <li>Worst case (5%): Return less than <span className="text-orange-400">{results.metrics.var95.toFixed(2)}x</span></li>
                </ul>
                <div className="mt-4 p-3 bg-gray-900 rounded">
                  <p className="text-sm text-gray-400">
                    💡 <strong className="text-white">Key Insight:</strong> The most influential variable is <span className="text-purple-400">{results.sensitivity[0]?.variable}</span>. 
                    Focus your due diligence there to reduce uncertainty.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Insight box */}
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2">
              <span className="text-xl">💡</span>
              <div>
                <div className="text-blue-300 font-medium">Key Insight</div>
                <div className="text-blue-200 text-sm">{step?.insight}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {DEMO_STEPS.length}
          </div>
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-gray-300 hover:text-white"
                disabled={isRunning}
              >
                ← Back
              </button>
            )}
            {currentStep === 0 ? (
              <button
                onClick={handleStart}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-500 hover:to-blue-500 font-semibold"
              >
                Start Demo →
              </button>
            ) : currentStep < DEMO_STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={isRunning || (step?.id === 'scenario' && !selectedScenario)}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-500 hover:to-blue-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Running...
                  </>
                ) : (
                  <>Next →</>
                )}
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 font-semibold"
              >
                ✓ Finish Demo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
