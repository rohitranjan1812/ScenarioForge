// Sample Registry - Lazy loading system for sample graphs
// Only metadata is loaded initially; full graphs are generated on-demand
import type { Graph } from '@scenarioforge/core';
import { sampleGenerators as basicGenerators } from './sampleGraphs';
import { advancedSampleGenerators } from './advancedSamples';

export interface SampleInfo {
  id: string;
  name: string;
  description: string;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  nodeCount: number;
  category: 'Basic' | 'Finance' | 'Simulation' | 'Risk' | 'Demo';
}

type GraphGenerator = () => Graph;

// Combine all generators from both files
const allGenerators: Record<string, GraphGenerator> = {
  ...basicGenerators,
  ...advancedSampleGenerators,
};

// Metadata for all samples (loaded immediately - lightweight)
export const sampleCatalog: SampleInfo[] = [
  // Basic samples
  { id: 'arithmetic-demo', name: 'Arithmetic Demo', description: 'Simple intro - learn how nodes connect and data flows', complexity: 'Beginner', nodeCount: 11, category: 'Basic' },
  { id: 'supply-chain', name: 'Supply Chain Cost Model', description: 'Monthly operating costs with demand uncertainty', complexity: 'Intermediate', nodeCount: 10, category: 'Basic' },
  { id: 'portfolio-risk', name: 'Investment Portfolio Risk Model', description: 'Four-asset portfolio with risk metrics', complexity: 'Advanced', nodeCount: 18, category: 'Finance' },
  { id: 'project-risk', name: 'Project Risk Assessment', description: 'Duration and cost estimation with risk factors', complexity: 'Intermediate', nodeCount: 12, category: 'Risk' },
  { id: 'quality-model', name: 'Manufacturing Quality Model', description: 'Defect analysis and quality metrics', complexity: 'Intermediate', nodeCount: 11, category: 'Basic' },
  
  // Advanced samples
  { id: 'compound-interest', name: 'Compound Interest Calculator', description: 'Multi-stage compound interest P(1+r/n)^(nt)', complexity: 'Intermediate', nodeCount: 13, category: 'Finance' },
  { id: 'monte-carlo-pi', name: 'Monte Carlo Pi Estimation', description: 'Estimate π with random point sampling', complexity: 'Intermediate', nodeCount: 8, category: 'Simulation' },
  { id: 'loan-amortization', name: 'Loan Amortization Calculator', description: 'Mortgage payment and interest breakdown', complexity: 'Intermediate', nodeCount: 12, category: 'Finance' },
  { id: 'option-pricing', name: 'Option Pricing Model', description: 'Black-Scholes components with stochastic inputs', complexity: 'Advanced', nodeCount: 15, category: 'Finance' },
  { id: 'epidemic-model', name: 'Epidemic Spread Model', description: 'SIR-inspired R₀ and infection projection', complexity: 'Advanced', nodeCount: 16, category: 'Simulation' },
  { id: 'expression-demo', name: 'Expression Variables Demo', description: 'Shows $inputs, $node, $params, $iteration, $time', complexity: 'Beginner', nodeCount: 10, category: 'Demo' },
  { id: 'multi-dim-demo', name: 'Multi-Dimensional Data Model', description: 'Hierarchical nested data with $params and $node', complexity: 'Advanced', nodeCount: 10, category: 'Demo' },
  { id: 'natcat-risk', name: 'NatCat Portfolio Risk & Pricing Model', description: 'Catastrophe risk with multi-region exposure, stochastic severity, reinsurance, pricing, and capital', complexity: 'Expert', nodeCount: 33, category: 'Risk' },
];

// Get a single sample graph by ID (lazy - generates on demand)
export function getSampleById(id: string): Graph | null {
  const generator = allGenerators[id];
  if (!generator) {
    console.warn(`Sample graph not found: ${id}`);
    return null;
  }
  
  try {
    const graph = generator();
    // Ensure the graph has a stable ID based on sample ID
    graph.id = `sample-${id}-${Date.now().toString(36)}`;
    return graph;
  } catch (error) {
    console.error(`Failed to generate sample graph ${id}:`, error);
    return null;
  }
}

// Get multiple samples by IDs (batch loading)
export function getSamplesByIds(ids: string[]): Graph[] {
  const graphs: Graph[] = [];
  for (const id of ids) {
    const graph = getSampleById(id);
    if (graph) {
      graphs.push(graph);
    }
  }
  return graphs;
}

// Check if a sample is registered
export function isSampleRegistered(id: string): boolean {
  return id in allGenerators;
}

// Get all registered sample IDs
export function getRegisteredSampleIds(): string[] {
  return Object.keys(allGenerators);
}

// Get sample info by ID
export function getSampleInfo(id: string): SampleInfo | undefined {
  return sampleCatalog.find(s => s.id === id);
}

// Get samples by category
export function getSamplesByCategory(category: SampleInfo['category']): SampleInfo[] {
  return sampleCatalog.filter(s => s.category === category);
}

// Get samples by complexity
export function getSamplesByComplexity(complexity: SampleInfo['complexity']): SampleInfo[] {
  return sampleCatalog.filter(s => s.complexity === complexity);
}
