/**
 * AlgoEdge Strategy Compiler
 * Converts React Flow Node Graph into a structured Strategy Specification
 */

export function compileStrategy(nodes, edges) {
  // 1. Find the entry node
  const entryNode = nodes.find((n) => n.type === 'entryNode');
  if (!entryNode) {
    throw new Error('Strategy must have an Entry Node');
  }

  // 2. Find the exit node (if any) to extract risk parameters
  const exitNode = nodes.find((n) => n.type === 'exitNode');
  const riskProfile = exitNode ? {
    sl_pct: parseFloat(exitNode.data?.params?.stopLossPct || 0),
    tp_pct: parseFloat(exitNode.data?.params?.targetPct || 0)
  } : { sl_pct: 0, tp_pct: 0 };

  // 3. Recursive helper to trace backwards
  const buildLogicTree = (currentNodeId) => {
    const currentNode = nodes.find((n) => n.id === currentNodeId);
    if (!currentNode) return null;

    // Handle Logic Nodes (AND/OR gates)
    if (currentNode.type === 'logicNode') {
      const incomingEdges = edges.filter((e) => e.target === currentNodeId);
      const children = incomingEdges
        .map((e) => buildLogicTree(e.source))
        .filter(Boolean);

      return {
        type: 'GATE',
        operator: currentNode.data?.operator || 'AND',
        children
      };
    }

    // Handle Indicator Nodes
    if (currentNode.type === 'indicatorNode') {
      return {
        type: 'CONDITION',
        indicator: currentNode.data?.name || 'UNKNOWN',
        params: currentNode.data?.params || {},
        label: currentNode.data?.label || ''
      };
    }

    // Handle Entry Node (starting point) - find its predecessors
    if (currentNode.type === 'entryNode') {
      const incomingEdges = edges.filter((e) => e.target === currentNodeId);
      if (incomingEdges.length === 0) return null;
      
      // Usually Entry node has one main incoming branch
      return buildLogicTree(incomingEdges[0].source);
    }

    return null;
  };

  const logicTree = buildLogicTree(entryNode.id);

  return {
    strategy_name: entryNode.data?.label || 'Visual Strategy',
    entry_conditions: logicTree,
    risk_profile: riskProfile,
    universe: ['NIFTY_500'] // Default universe
  };
}
