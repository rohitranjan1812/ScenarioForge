// Subgraph Tutorial Panel - Interactive walkthrough for hierarchical modeling
import { useState } from 'react';
import { useGraphStore } from '../../stores/graphStore';
import { getSampleById } from '../../data/sampleRegistry';

interface TutorialStep {
  id: number;
  title: string;
  content: string;
  highlight?: string; // CSS selector or node ID to highlight
  action?: string; // Action button label
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: '👋 Welcome to Subgraphs!',
    content: `**Subgraphs** let you organize complex models into reusable, hierarchical components.

Think of them like **functions** in programming - they encapsulate logic and can be reused.

**Benefits:**
• 📦 Organize complex models
• ♻️ Reuse common patterns  
• 🔍 Navigate with drill-down
• 🧩 Build modular systems`,
  },
  {
    id: 2,
    title: '📊 Load the Demo',
    content: `Let's start with a working example!

Click **"Load Demo"** below to load the **Simple Subgraph Demo**.

This sample shows:
• 📦 **2 Subgraph nodes** (Profit Calculator, Growth Projector)
• 🔄 A **feedback loop** concept
• 🎯 A **decision node** that uses subgraph outputs`,
    action: 'Load Demo',
  },
  {
    id: 3,
    title: '📦 Understanding Subgraph Nodes',
    content: `Look at the **purple 📦 nodes** on the canvas:

**1. Profit Calculator** subgraph:
   - Takes: revenue, costs
   - Outputs: grossProfit, profitMargin
   - Encapsulates profit logic

**2. Growth Projector** subgraph:
   - Takes: baseValue, growthRate  
   - Outputs: year1, year3, year5
   - Encapsulates compound growth

Each subgraph is a **self-contained unit** that hides internal complexity.`,
  },
  {
    id: 4,
    title: '🔍 Drill-Down Navigation',
    content: `Click the **"🔍 Drill Down"** button on any subgraph node to navigate inside!

The button will be **blue** if the subgraph has nested content, or **gray** if not configured.

When you drill down:
• The canvas shows the **nested graph**
• A **breadcrumb bar** appears at top
• Click **"⬆️ Back to Parent"** to return
• Or click any breadcrumb to jump directly

Try it! Click "Drill Down" on the **📦 Profit Calculator** node.`,
  },
  {
    id: 5,
    title: '🔄 Feedback Loops',
    content: `Notice the **"🔄 Feedback Adjust"** transformer node.

This demonstrates a **feedback pattern**:
1. Profit margin is calculated by subgraph
2. Margin feeds back to adjust costs
3. Creates an iterative refinement loop

In simulation, feedback loops allow:
• 📈 Convergence to equilibrium
• 🔁 Iterative optimization
• 🎛️ PID control systems`,
  },
  {
    id: 6,
    title: '🎯 Using Subgraph Outputs',
    content: `Look at how subgraph outputs flow:

1. **Profit Subgraph** → outputs \`profitMargin\`
2. → **Decision Node** checks if margin > 15%
3. → **Output** shows ✅ Invest or ⚠️ Review

This is the power of subgraphs:
• Clean data flow between components
• Each piece is testable independently
• Easy to swap implementations`,
  },
  {
    id: 7,
    title: '🛠️ Creating Your Own Subgraph',
    content: `To create a subgraph:

1. **Drag** a "📦 Subgraph" node from the **Node Palette**
   (Look in the "🆕 Hierarchical" category)

2. **Configure** in Properties Panel:
   - Set \`subgraphId\`
   - Define \`exposedInputs\` and \`exposedOutputs\`

3. **Connect** inputs/outputs to other nodes

*(Full nested graph editing coming in future update)*`,
  },
  {
    id: 8,
    title: '📋 Hierarchy Panel',
    content: `Click **"Hierarchy"** tab in the top toolbar to see:

• 🌳 **Tree view** of all nodes
• 📦 **Subgraph list** with expand/collapse
• 🧭 **Breadcrumb navigation**
• ⚡ **Quick actions** (Create, Extract, etc.)

This helps navigate complex hierarchical models.`,
  },
  {
    id: 9,
    title: '🔄 Feedback Loops Panel',
    content: `Click **"Feedback Loops"** tab to manage:

• View all feedback connections
• Configure **transform type** (PID, Moving Avg, etc.)
• Monitor **convergence status**
• Set **delay** and **damping** factors

Feedback loops enable dynamic, adaptive models!`,
  },
  {
    id: 10,
    title: '✅ You\'re Ready!',
    content: `**Congratulations!** You now understand:

✅ What subgraphs are and why they're useful
✅ How to identify subgraph nodes  
✅ How data flows through subgraphs
✅ What feedback loops do
✅ How to use the Hierarchy panel

**Next steps:**
• Try the "Hierarchical Supply Chain" sample
• Experiment with your own subgraph nodes
• Explore the Feedback Loops panel`,
  },
];

export function SubgraphTutorial() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const { importGraphs, loadGraph } = useGraphStore();
  
  const step = tutorialSteps[currentStep];
  
  const handleLoadDemo = () => {
    const graph = getSampleById('simple-subgraph-demo');
    if (graph) {
      importGraphs([graph]);
      // Find and load the imported graph
      const { graphs } = useGraphStore.getState();
      const imported = graphs.find(g => g.name === graph.name);
      if (imported) {
        loadGraph(imported.id);
      }
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handleAction = () => {
    if (step.action === 'Load Demo') {
      handleLoadDemo();
    }
  };
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 flex items-center gap-2 z-50"
      >
        <span>📚</span>
        <span>Subgraph Tutorial</span>
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gray-800 rounded-lg shadow-2xl border border-gray-600 z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📚</span>
          <span className="font-semibold text-white">Subgraph Tutorial</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-indigo-200">
            {currentStep + 1} / {tutorialSteps.length}
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:text-gray-200 text-lg"
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-gray-700">
        <div 
          className="h-full bg-indigo-400 transition-all duration-300"
          style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
        />
      </div>
      
      {/* Content */}
      <div className="p-4 max-h-80 overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-3">{step.title}</h3>
        <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
          {step.content.split('**').map((part, i) => 
            i % 2 === 1 ? <strong key={i} className="text-white">{part}</strong> : part
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-4 py-3 bg-gray-700 flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-3 py-1.5 text-sm bg-gray-600 text-gray-300 rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        
        <div className="flex gap-2">
          {step.action && (
            <button
              onClick={handleAction}
              className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-medium"
            >
              {step.action}
            </button>
          )}
          
          <button
            onClick={() => setCurrentStep(Math.min(tutorialSteps.length - 1, currentStep + 1))}
            disabled={currentStep === tutorialSteps.length - 1}
            className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
      
      {/* Quick navigation dots */}
      <div className="px-4 py-2 bg-gray-800 flex justify-center gap-1">
        {tutorialSteps.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentStep(idx)}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx === currentStep ? 'bg-indigo-500' : 'bg-gray-600 hover:bg-gray-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
