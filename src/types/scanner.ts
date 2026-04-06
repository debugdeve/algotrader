/**
 * src/types/scanner.ts
 * 
 * Foundational TypeScript interfaces for the Multi-Timeframe Algorithmic Engine.
 * These types establish the rigid contract between the frontend Parser/Data Aligners 
 * and the Python computational backend.
 */

// Core Ohlcv interface for financial data streams
export interface OHLCV {
  timestamp: number; // Unix epoch (milliseconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Supported granularity bounds
export type TimeframeEnum = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | 'Daily' | 'Weekly';

// Defines the logic operator used to join multiple nodes (AST)
export type LogicalOperator = 'AND' | 'OR';

// Supported comparison operators in the scanner
export type ComparisonOperator = '>' | '<' | '==' | '>=' | '<=' | 'crossover' | 'crossunder';

/**
 * Data structures for the parsed Abstract Syntax Tree (AST)
 * A Query is either a concrete ConditionNode or a LogicalNode containing children.
 */

export interface ConditionNode {
  type: 'condition';
  timeframe: TimeframeEnum;
  
  // The left-hand side indicator or price metric (e.g. "RSI_14" or "Close")
  leftName: string;
  leftPeriod?: number; 
  leftParams?: number[];

  operator: ComparisonOperator;

  // The right-hand side can either be a static number or another indicator
  rightType: 'number' | 'indicator';
  rightName?: string;
  rightPeriod?: number;
  rightParams?: number[];
  rightValue?: number;
}

export interface LogicalNode {
  type: 'logical';
  operator: LogicalOperator;
  left: ASTNode;
  right: ASTNode;
}

export type ASTNode = ConditionNode | LogicalNode;

// Final payload interface sent to Python backend via POST /api/mtf-scan
export interface MultiTimeframePayload {
  universe: string[];          // e.g. ["RELIANCE", "TCS", ...]
  ast: ASTNode;                // The evaluated condition graph
  max_lookback: number;        // Determines data fetch requirements 
}
