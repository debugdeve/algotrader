/**
 * src/utils/queryParser.ts
 * 
 * Transforms a Multi-Timeframe scanner natural query string into
 * a strongly-typed Abstract Syntax Tree (ASTNode).
 */

import { ASTNode, ConditionNode, ComparisonOperator, TimeframeEnum } from '../types/scanner';

/**
 * Basic Regex matching patterns.
 * Designed to capture blocks like: "[Daily] RSI_14 > 60"
 * Timeframe: \[(.*?)\] -> (Daily)
 * Left Indicator: ([A-Za-z0-9_]+) -> (RSI_14)
 * Operator: (>|<|==|>=|<=|crossover|crossunder) -> (>)
 * Right Value/Indicator: ([A-Za-z0-9_.]+) -> (60)
 */
const CONDITION_REGEX = /\[(.*?)\]\s*([A-Za-z0-9_]+)\s*(>|<|==|>=|<=|crossover|crossunder)\s*([A-Za-z0-9_.]+)/i;

/**
 * Parses an individual string block (e.g., "[Daily] RSI_14 > 60") into a ConditionNode
 * @param segment the raw condition string
 */
function parseCondition(segment: string): ConditionNode {
  const match = segment.trim().match(CONDITION_REGEX);
  
  if (!match) {
    throw new Error(`Syntax Error: Could not parse condition block -> "${segment}"`);
  }

  const [, rawTf, leftRaw, operator, rightRaw] = match;

  // Validate Operator
  const validOperators = ['>', '<', '==', '>=', '<=', 'crossover', 'crossunder'];
  if (!validOperators.includes(operator)) {
    throw new Error(`Syntax Error: Invalid operator '${operator}'`);
  }

  // Determine if right side is a number or another indicator
  // If it can be parsed safely into a float without turning into NaN, it's a number.
  const parsedRightValue = parseFloat(rightRaw);
  const isRightNumber = !isNaN(parsedRightValue) && rightRaw.match(/^-?\d*\.?\d+$/);

  // Parse left parameters (e.g. "RSI_14" -> indicator="RSI", period=14)
  const leftParts = leftRaw.split('_');
  const leftName = leftParts[0];
  const leftPeriod = leftParts[1] ? parseInt(leftParts[1]) : undefined;

  const node: ConditionNode = {
    type: 'condition',
    timeframe: rawTf as TimeframeEnum,
    leftName: leftName,
    operator: operator as ComparisonOperator,
    rightType: isRightNumber ? 'number' : 'indicator',
  };

  if (leftPeriod) node.leftPeriod = leftPeriod;

  if (isRightNumber) {
    node.rightValue = parsedRightValue;
  } else {
    // If it's an indicator comparing against an indicator (e.g. SMA_20 > SMA_50)
    const rightParts = rightRaw.split('_');
    node.rightName = rightParts[0];
    if (rightParts[1]) node.rightPeriod = parseInt(rightParts[1]);
  }

  return node;
}

/**
 * Parses the full multi-timeframe query.
 * For this foundational version, we use simple left-to-right associative parsing
 * focused strictly on the 'AND' logical operator as the bridge.
 * 
 * Example input: "[Daily] RSI_14 > 60 AND [15min] Close > SMA_20"
 */
export function compileQueryToAST(query: string): ASTNode {
  if (!query || query.trim() === '') {
    throw new Error("Syntax Error: Query is empty");
  }

  // Split the query by "AND" (case-insensitive) to extract individual blocks
  // Note: future iterations should handle parenthesis grouping and "OR" statements.
  const blocks = query.split(/\s+AND\s+/i);

  if (blocks.length === 1) {
    return parseCondition(blocks[0]);
  }

  // Build the AST recursively from right to left to nest the nodes
  let ast: ASTNode = parseCondition(blocks[blocks.length - 1]);

  for (let i = blocks.length - 2; i >= 0; i--) {
    const leftCondition = parseCondition(blocks[i]);
    
    ast = {
      type: 'logical',
      operator: 'AND',
      left: leftCondition,
      right: ast
    };
  }

  return ast;
}
