// Sandboxed Expression Evaluator
// NEVER use eval() or Function() directly - this provides safe evaluation

import type { ExpressionContext, DistributionConfig } from '../types/index.js';

// ============================================
// Security Constants
// ============================================

// Dangerous identifiers that could be used for code injection or prototype pollution
const DANGEROUS_IDENTIFIERS = new Set([
  'constructor',
  '__proto__',
  'prototype',
  'eval',
  'Function',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

// ============================================
// Tokenizer
// ============================================

type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'NULL'
  | 'IDENTIFIER'
  | 'VARIABLE'
  | 'OPERATOR'
  | 'FUNCTION'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'COMMA'
  | 'DOT'
  | 'COLON'
  | 'QUESTION'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string | number | boolean | null;
  position: number;
}

const OPERATORS = new Set(['+', '-', '*', '/', '%', '^', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!']);

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  
  while (pos < expression.length) {
    const char = expression[pos];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      pos++;
      continue;
    }
    
    // Numbers
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(expression[pos + 1] ?? ''))) {
      let num = '';
      while (pos < expression.length && /[0-9.]/.test(expression[pos])) {
        num += expression[pos++];
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(num), position: pos - num.length });
      continue;
    }
    
    // Strings
    if (char === '"' || char === "'") {
      const quote = char;
      pos++;
      let str = '';
      while (pos < expression.length && expression[pos] !== quote) {
        if (expression[pos] === '\\' && pos + 1 < expression.length) {
          pos++;
          const escapeChar = expression[pos++];
          // Handle common escape sequences
          switch (escapeChar) {
            case 'n': str += '\n'; break;
            case 't': str += '\t'; break;
            case 'r': str += '\r'; break;
            case '\\': str += '\\'; break;
            case '"': str += '"'; break;
            case "'": str += "'"; break;
            default: str += escapeChar; break;
          }
        } else {
          str += expression[pos++];
        }
      }
      pos++; // Skip closing quote
      tokens.push({ type: 'STRING', value: str, position: pos - str.length - 2 });
      continue;
    }
    
    // Variables (start with $)
    if (char === '$') {
      let name = '$';
      pos++;
      while (pos < expression.length && /[a-zA-Z0-9_]/.test(expression[pos])) {
        name += expression[pos++];
      }
      tokens.push({ type: 'VARIABLE', value: name, position: pos - name.length });
      continue;
    }
    
    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(char)) {
      let name = '';
      while (pos < expression.length && /[a-zA-Z0-9_]/.test(expression[pos])) {
        name += expression[pos++];
      }
      
      // Security check for dangerous identifiers
      if (DANGEROUS_IDENTIFIERS.has(name)) {
        throw new Error(`Access to '${name}' is not allowed for security reasons`);
      }
      
      if (name === 'true') {
        tokens.push({ type: 'BOOLEAN', value: true, position: pos - name.length });
      } else if (name === 'false') {
        tokens.push({ type: 'BOOLEAN', value: false, position: pos - name.length });
      } else if (name === 'null') {
        tokens.push({ type: 'NULL', value: null, position: pos - name.length });
      } else {
        // Check if it's a function call
        let lookahead = pos;
        while (lookahead < expression.length && /\s/.test(expression[lookahead])) {
          lookahead++;
        }
        if (expression[lookahead] === '(') {
          tokens.push({ type: 'FUNCTION', value: name, position: pos - name.length });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: name, position: pos - name.length });
        }
      }
      continue;
    }
    
    // Multi-character operators
    const twoChar = expression.slice(pos, pos + 2);
    if (OPERATORS.has(twoChar)) {
      tokens.push({ type: 'OPERATOR', value: twoChar, position: pos });
      pos += 2;
      continue;
    }
    
    // Single-character operators and punctuation
    if (OPERATORS.has(char)) {
      tokens.push({ type: 'OPERATOR', value: char, position: pos });
      pos++;
      continue;
    }
    
    switch (char) {
      case '(':
        tokens.push({ type: 'LPAREN', value: '(', position: pos++ });
        break;
      case ')':
        tokens.push({ type: 'RPAREN', value: ')', position: pos++ });
        break;
      case '[':
        tokens.push({ type: 'LBRACKET', value: '[', position: pos++ });
        break;
      case ']':
        tokens.push({ type: 'RBRACKET', value: ']', position: pos++ });
        break;
      case ',':
        tokens.push({ type: 'COMMA', value: ',', position: pos++ });
        break;
      case '.':
        tokens.push({ type: 'DOT', value: '.', position: pos++ });
        break;
      case ':':
        tokens.push({ type: 'COLON', value: ':', position: pos++ });
        break;
      case '?':
        tokens.push({ type: 'QUESTION', value: '?', position: pos++ });
        break;
      default:
        throw new ExpressionError(`Unexpected character: ${char}`, pos);
    }
  }
  
  tokens.push({ type: 'EOF', value: null, position: pos });
  return tokens;
}

// ============================================
// AST Node Types
// ============================================

type ASTNode =
  | { type: 'Literal'; value: number | string | boolean | null }
  | { type: 'Variable'; name: string }
  | { type: 'Identifier'; name: string }
  | { type: 'BinaryOp'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'UnaryOp'; operator: string; operand: ASTNode }
  | { type: 'FunctionCall'; name: string; args: ASTNode[] }
  | { type: 'MemberAccess'; object: ASTNode; property: string }
  | { type: 'IndexAccess'; object: ASTNode; index: ASTNode }
  | { type: 'Conditional'; condition: ASTNode; consequent: ASTNode; alternate: ASTNode }
  | { type: 'Array'; elements: ASTNode[] };

// ============================================
// Parser
// ============================================

class Parser {
  private tokens: Token[];
  private pos: number = 0;
  
  constructor(expression: string) {
    this.tokens = tokenize(expression);
  }
  
  parse(): ASTNode {
    const result = this.parseExpression();
    if (this.current().type !== 'EOF') {
      throw new ExpressionError(`Unexpected token: ${this.current().value}`, this.current().position);
    }
    return result;
  }
  
  private current(): Token {
    return this.tokens[this.pos];
  }
  
  private advance(): Token {
    return this.tokens[this.pos++];
  }
  
  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new ExpressionError(`Expected ${type}, got ${token.type}`, token.position);
    }
    return this.advance();
  }
  
  private parseExpression(): ASTNode {
    return this.parseConditional();
  }
  
  private parseConditional(): ASTNode {
    let left = this.parseOr();
    
    if (this.current().type === 'QUESTION') {
      this.advance();
      const consequent = this.parseExpression();
      this.expect('COLON');
      const alternate = this.parseExpression();
      return { type: 'Conditional', condition: left, consequent, alternate };
    }
    
    return left;
  }
  
  private parseOr(): ASTNode {
    let left = this.parseAnd();
    
    while (this.current().value === '||') {
      const operator = this.advance().value as string;
      const right = this.parseAnd();
      left = { type: 'BinaryOp', operator, left, right };
    }
    
    return left;
  }
  
  private parseAnd(): ASTNode {
    let left = this.parseEquality();
    
    while (this.current().value === '&&') {
      const operator = this.advance().value as string;
      const right = this.parseEquality();
      left = { type: 'BinaryOp', operator, left, right };
    }
    
    return left;
  }
  
  private parseEquality(): ASTNode {
    let left = this.parseComparison();
    
    while (this.current().value === '==' || this.current().value === '!=') {
      const operator = this.advance().value as string;
      const right = this.parseComparison();
      left = { type: 'BinaryOp', operator, left, right };
    }
    
    return left;
  }
  
  private parseComparison(): ASTNode {
    let left = this.parseAdditive();
    
    while (['<', '>', '<=', '>='].includes(this.current().value as string)) {
      const operator = this.advance().value as string;
      const right = this.parseAdditive();
      left = { type: 'BinaryOp', operator, left, right };
    }
    
    return left;
  }
  
  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    
    while (this.current().value === '+' || this.current().value === '-') {
      const operator = this.advance().value as string;
      const right = this.parseMultiplicative();
      left = { type: 'BinaryOp', operator, left, right };
    }
    
    return left;
  }
  
  private parseMultiplicative(): ASTNode {
    let left = this.parsePower();
    
    while (['*', '/', '%'].includes(this.current().value as string)) {
      const operator = this.advance().value as string;
      const right = this.parsePower();
      left = { type: 'BinaryOp', operator, left, right };
    }
    
    return left;
  }
  
  private parsePower(): ASTNode {
    const left = this.parseUnary();
    
    if (this.current().value === '^') {
      this.advance();
      const right = this.parsePower(); // Right associative
      return { type: 'BinaryOp', operator: '^', left, right };
    }
    
    return left;
  }
  
  private parseUnary(): ASTNode {
    if (this.current().value === '!' || this.current().value === '-') {
      const operator = this.advance().value as string;
      const operand = this.parseUnary();
      return { type: 'UnaryOp', operator, operand };
    }
    
    return this.parsePostfix();
  }
  
  private parsePostfix(): ASTNode {
    let node = this.parsePrimary();
    
    while (true) {
      if (this.current().type === 'DOT') {
        this.advance();
        const property = this.expect('IDENTIFIER').value as string;
        node = { type: 'MemberAccess', object: node, property };
      } else if (this.current().type === 'LBRACKET') {
        this.advance();
        const index = this.parseExpression();
        this.expect('RBRACKET');
        node = { type: 'IndexAccess', object: node, index };
      } else {
        break;
      }
    }
    
    return node;
  }
  
  private parsePrimary(): ASTNode {
    const token = this.current();
    
    switch (token.type) {
      case 'NUMBER':
      case 'STRING':
      case 'BOOLEAN':
      case 'NULL':
        this.advance();
        return { type: 'Literal', value: token.value as number | string | boolean | null };
        
      case 'VARIABLE':
        this.advance();
        return { type: 'Variable', name: token.value as string };
        
      case 'IDENTIFIER':
        this.advance();
        return { type: 'Identifier', name: token.value as string };
        
      case 'FUNCTION': {
        const name = this.advance().value as string;
        this.expect('LPAREN');
        const args: ASTNode[] = [];
        
        if (this.current().type !== 'RPAREN') {
          args.push(this.parseExpression());
          while (this.current().type === 'COMMA') {
            this.advance();
            args.push(this.parseExpression());
          }
        }
        
        this.expect('RPAREN');
        return { type: 'FunctionCall', name, args };
      }
        
      case 'LPAREN': {
        this.advance();
        const expr = this.parseExpression();
        this.expect('RPAREN');
        return expr;
      }
        
      case 'LBRACKET': {
        this.advance();
        const elements: ASTNode[] = [];
        
        if (this.current().type !== 'RBRACKET') {
          elements.push(this.parseExpression());
          while (this.current().type === 'COMMA') {
            this.advance();
            elements.push(this.parseExpression());
          }
        }
        
        this.expect('RBRACKET');
        return { type: 'Array', elements };
      }
        
      default:
        throw new ExpressionError(`Unexpected token: ${token.type}`, token.position);
    }
  }
}

// ============================================
// Built-in Functions
// ============================================

type BuiltinFunction = (...args: unknown[]) => unknown;

const MATH_FUNCTIONS: Record<string, BuiltinFunction> = {
  // Basic math
  abs: (x: unknown) => Math.abs(Number(x)),
  ceil: (x: unknown) => Math.ceil(Number(x)),
  floor: (x: unknown) => Math.floor(Number(x)),
  round: (x: unknown, decimals?: unknown) => {
    const n = Number(x);
    const d = decimals !== undefined ? Number(decimals) : 0;
    const factor = Math.pow(10, d);
    return Math.round(n * factor) / factor;
  },
  trunc: (x: unknown) => Math.trunc(Number(x)),
  sign: (x: unknown) => Math.sign(Number(x)),
  
  // Powers and roots
  sqrt: (x: unknown) => Math.sqrt(Number(x)),
  cbrt: (x: unknown) => Math.cbrt(Number(x)),
  pow: (x: unknown, y: unknown) => Math.pow(Number(x), Number(y)),
  exp: (x: unknown) => Math.exp(Number(x)),
  log: (x: unknown) => Math.log(Number(x)),
  log10: (x: unknown) => Math.log10(Number(x)),
  log2: (x: unknown) => Math.log2(Number(x)),
  
  // Trigonometry
  sin: (x: unknown) => Math.sin(Number(x)),
  cos: (x: unknown) => Math.cos(Number(x)),
  tan: (x: unknown) => Math.tan(Number(x)),
  asin: (x: unknown) => Math.asin(Number(x)),
  acos: (x: unknown) => Math.acos(Number(x)),
  atan: (x: unknown) => Math.atan(Number(x)),
  atan2: (y: unknown, x: unknown) => Math.atan2(Number(y), Number(x)),
  
  // Min/Max
  min: (...args: unknown[]) => Math.min(...args.flat().map(Number)),
  max: (...args: unknown[]) => Math.max(...args.flat().map(Number)),
  clamp: (x: unknown, min: unknown, max: unknown) => 
    Math.min(Math.max(Number(x), Number(min)), Number(max)),
  
  // Constants
  PI: () => Math.PI,
  E: () => Math.E,
  
  // Random
  random: () => Math.random(),
};

const STATISTICAL_FUNCTIONS: Record<string, BuiltinFunction> = {
  sum: (...args: unknown[]) => {
    const arr = args.flat().map(Number);
    return arr.reduce((a, b) => a + b, 0);
  },
  
  mean: (...args: unknown[]) => {
    const arr = args.flat().map(Number);
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },
  
  median: (...args: unknown[]) => {
    const arr = args.flat().map(Number).sort((a, b) => a - b);
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  },
  
  std: (...args: unknown[]) => {
    const arr = args.flat().map(Number);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  },
  
  variance: (...args: unknown[]) => {
    const arr = args.flat().map(Number);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  },
  
  percentile: (arr: unknown, p: unknown) => {
    const sorted = (arr as number[]).map(Number).sort((a, b) => a - b);
    const index = (Number(p) / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  },
  
  count: (...args: unknown[]) => args.flat().length,
  
  product: (...args: unknown[]) => {
    const arr = args.flat().map(Number);
    return arr.reduce((a, b) => a * b, 1);
  },
};

const ARRAY_FUNCTIONS: Record<string, BuiltinFunction> = {
  length: (arr: unknown) => Array.isArray(arr) ? arr.length : 0,
  first: (arr: unknown) => Array.isArray(arr) ? arr[0] : undefined,
  last: (arr: unknown) => Array.isArray(arr) ? arr[arr.length - 1] : undefined,
  slice: (arr: unknown, start: unknown, end?: unknown) => 
    Array.isArray(arr) ? arr.slice(Number(start), end !== undefined ? Number(end) : undefined) : [],
  reverse: (arr: unknown) => Array.isArray(arr) ? [...arr].reverse() : [],
  sort: (arr: unknown) => Array.isArray(arr) ? [...arr].sort((a, b) => Number(a) - Number(b)) : [],
  unique: (arr: unknown) => Array.isArray(arr) ? [...new Set(arr)] : [],
  flatten: (arr: unknown) => Array.isArray(arr) ? arr.flat() : [],
  contains: (arr: unknown, item: unknown) => Array.isArray(arr) ? arr.includes(item) : false,
  indexOf: (arr: unknown, item: unknown) => Array.isArray(arr) ? arr.indexOf(item) : -1,
};

const LOGICAL_FUNCTIONS: Record<string, BuiltinFunction> = {
  if: (condition: unknown, consequent: unknown, alternate: unknown) => 
    condition ? consequent : alternate,
  and: (...args: unknown[]) => args.every(Boolean),
  or: (...args: unknown[]) => args.some(Boolean),
  not: (x: unknown) => !x,
  isNull: (x: unknown) => x === null || x === undefined,
  isNumber: (x: unknown) => typeof x === 'number' && !isNaN(x),
  isString: (x: unknown) => typeof x === 'string',
  isArray: (x: unknown) => Array.isArray(x),
  coalesce: (...args: unknown[]) => args.find(x => x !== null && x !== undefined),
};

const STRING_FUNCTIONS: Record<string, BuiltinFunction> = {
  concat: (...args: unknown[]) => args.map(String).join(''),
  upper: (s: unknown) => String(s).toUpperCase(),
  lower: (s: unknown) => String(s).toLowerCase(),
  trim: (s: unknown) => String(s).trim(),
  length: (s: unknown) => Array.isArray(s) ? s.length : String(s).length,
  substring: (s: unknown, start: unknown, end?: unknown) => 
    String(s).substring(Number(start), end !== undefined ? Number(end) : undefined),
  replace: (s: unknown, search: unknown, replacement: unknown) => 
    String(s).replace(String(search), String(replacement)),
  split: (s: unknown, separator: unknown) => String(s).split(String(separator)),
  startsWith: (s: unknown, prefix: unknown) => String(s).startsWith(String(prefix)),
  endsWith: (s: unknown, suffix: unknown) => String(s).endsWith(String(suffix)),
};

const ALL_FUNCTIONS: Record<string, BuiltinFunction> = {
  ...MATH_FUNCTIONS,
  ...STATISTICAL_FUNCTIONS,
  ...ARRAY_FUNCTIONS,
  ...LOGICAL_FUNCTIONS,
  ...STRING_FUNCTIONS,
};

// ============================================
// Evaluator
// ============================================

export class ExpressionError extends Error {
  constructor(message: string, public position?: number) {
    super(message);
    this.name = 'ExpressionError';
  }
}

function evaluateNode(node: ASTNode, context: ExpressionContext): unknown {
  switch (node.type) {
    case 'Literal':
      return node.value;
      
    case 'Variable': {
      const varName = node.name;
      if (varName === '$node') return context.$node;
      if (varName === '$inputs') return context.$inputs;
      if (varName === '$params') return context.$params;
      if (varName === '$time') return context.$time;
      if (varName === '$iteration') return context.$iteration;
      if (varName === '$nodes') return context.$nodes;
      throw new ExpressionError(`Unknown variable: ${varName}`);
    }
      
    case 'Identifier':
      // Check if it's a constant function like PI or E
      if (ALL_FUNCTIONS[node.name] && ALL_FUNCTIONS[node.name].length === 0) {
        return ALL_FUNCTIONS[node.name]();
      }
      throw new ExpressionError(`Unknown identifier: ${node.name}`);
      
    case 'BinaryOp': {
      const left = evaluateNode(node.left, context);
      const right = evaluateNode(node.right, context);
      
      switch (node.operator) {
        case '+': return Number(left) + Number(right);
        case '-': return Number(left) - Number(right);
        case '*': return Number(left) * Number(right);
        case '/': return Number(left) / Number(right);
        case '%': return Number(left) % Number(right);
        case '^': return Math.pow(Number(left), Number(right));
        case '==': return left === right;
        case '!=': return left !== right;
        case '<': return Number(left) < Number(right);
        case '>': return Number(left) > Number(right);
        case '<=': return Number(left) <= Number(right);
        case '>=': return Number(left) >= Number(right);
        case '&&': return Boolean(left) && Boolean(right);
        case '||': return Boolean(left) || Boolean(right);
        default:
          throw new ExpressionError(`Unknown operator: ${node.operator}`);
      }
    }
      
    case 'UnaryOp': {
      const operand = evaluateNode(node.operand, context);
      switch (node.operator) {
        case '-': return -Number(operand);
        case '!': return !operand;
        default:
          throw new ExpressionError(`Unknown unary operator: ${node.operator}`);
      }
    }
      
    case 'FunctionCall': {
      const fn = ALL_FUNCTIONS[node.name];
      if (!fn) {
        throw new ExpressionError(`Unknown function: ${node.name}`);
      }
      const args = node.args.map(arg => evaluateNode(arg, context));
      return fn(...args);
    }
      
    case 'MemberAccess': {
      const obj = evaluateNode(node.object, context);
      if (obj === null || obj === undefined) {
        return undefined;
      }
      return (obj as Record<string, unknown>)[node.property];
    }
      
    case 'IndexAccess': {
      const obj = evaluateNode(node.object, context);
      const index = evaluateNode(node.index, context);
      if (obj === null || obj === undefined) {
        return undefined;
      }
      if (Array.isArray(obj)) {
        return obj[Number(index)];
      }
      return (obj as Record<string, unknown>)[String(index)];
    }
      
    case 'Conditional': {
      const condition = evaluateNode(node.condition, context);
      return condition
        ? evaluateNode(node.consequent, context)
        : evaluateNode(node.alternate, context);
    }
      
    case 'Array':
      return node.elements.map(el => evaluateNode(el, context));
      
    default:
      throw new ExpressionError(`Unknown node type: ${(node as ASTNode).type}`);
  }
}

// ============================================
// Public API
// ============================================

export function evaluate(expression: string, context: ExpressionContext): unknown {
  // Preprocess expression to support Math.function syntax
  // Convert Math.sqrt, Math.abs, etc. to sqrt, abs, etc.
  let processedExpression = expression.replace(/Math\./g, '');
  
  const parser = new Parser(processedExpression);
  const ast = parser.parse();
  return evaluateNode(ast, context);
}

export function validateExpression(expression: string): { valid: boolean; error?: string } {
  try {
    const parser = new Parser(expression);
    parser.parse();
    return { valid: true };
  } catch (e) {
    return { 
      valid: false, 
      error: e instanceof Error ? e.message : 'Unknown error' 
    };
  }
}

export function createEmptyContext(): ExpressionContext {
  return {
    $node: {},
    $inputs: {},
    $params: {},
    $time: 0,
    $iteration: 0,
    $nodes: {},
  };
}

// ============================================
// Distribution Sampling
// ============================================

// Simple random number generator with seed support
class SeededRandom {
  private seed: number;
  
  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
  }
  
  next(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1664525 + 1013904223) % 0x100000000;
    return this.seed / 0x100000000;
  }
}

let globalRng = new SeededRandom();

export function setSeed(seed: number): void {
  globalRng = new SeededRandom(seed);
}

export function sampleDistribution(config: DistributionConfig): number {
  const rng = globalRng;
  const params = config.parameters;
  
  switch (config.type) {
    case 'normal': {
      // Box-Muller transform
      const u1 = rng.next();
      const u2 = rng.next();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      // Support both std and stddev parameter names
      const stdDev = params.std ?? params.stddev ?? params.stdDev ?? 1;
      return (params.mean ?? 0) + stdDev * z;
    }
    
    case 'uniform':
      return (params.min ?? 0) + rng.next() * ((params.max ?? 1) - (params.min ?? 0));
    
    case 'uniformInt':
    case 'uniform_int': {
      const min = Math.ceil(params.min ?? 0);
      const max = Math.floor(params.max ?? 10);
      return Math.floor(min + rng.next() * (max - min + 1));
    }
    
    case 'bernoulli': {
      const p = params.p ?? params.probability ?? 0.5;
      return rng.next() < p ? 1 : 0;
    }
    
    case 'beta': {
      // Use the transformation method for beta distribution
      // For simplicity, approximate with the mean for alpha/(alpha+beta)
      // A proper implementation would use the gamma function
      const alpha = params.alpha ?? 2;
      const beta = params.beta ?? 2;
      // Joehnk's method for beta distribution
      let u1, u2, s;
      do {
        u1 = Math.pow(rng.next(), 1 / alpha);
        u2 = Math.pow(rng.next(), 1 / beta);
        s = u1 + u2;
      } while (s > 1);
      return u1 / s;
    }
    
    case 'truncatedNormal':
    case 'truncated_normal': {
      // Generate truncated normal distribution
      const mean = params.mean ?? 0;
      const stdDev = params.stdDev ?? params.stddev ?? 1;
      const minVal = params.min ?? -Infinity;
      const maxVal = params.max ?? Infinity;
      
      // Rejection sampling
      let sample;
      do {
        const u1 = rng.next();
        const u2 = rng.next();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        sample = mean + stdDev * z;
      } while (sample < minVal || sample > maxVal);
      return sample;
    }
    
    case 'triangular': {
      const a = params.min ?? 0;
      const b = params.max ?? 1;
      const c = params.mode ?? (a + b) / 2;
      const u = rng.next();
      const fc = (c - a) / (b - a);
      if (u < fc) {
        return a + Math.sqrt(u * (b - a) * (c - a));
      } else {
        return b - Math.sqrt((1 - u) * (b - a) * (b - c));
      }
    }
    
    case 'lognormal':
    case 'logNormal':
    case 'log_normal': {
      const u1 = rng.next();
      const u2 = rng.next();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      // Support both mu/sigma and mean/stdDev parameter names
      const mu = params.mu ?? params.mean ?? 0;
      const sigma = params.sigma ?? params.stdDev ?? 1;
      return Math.exp(mu + sigma * z);
    }
    
    case 'exponential': {
      return -Math.log(1 - rng.next()) / (params.rate ?? 1);
    }
    
    case 'poisson': {
      const lambda = params.lambda ?? 1;
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= rng.next();
      } while (p > L);
      return k - 1;
    }
    
    case 'discrete': {
      if (!config.values || !config.probabilities) {
        throw new ExpressionError('Discrete distribution requires values and probabilities');
      }
      const u = rng.next();
      let cumulative = 0;
      for (let i = 0; i < config.probabilities.length; i++) {
        cumulative += config.probabilities[i];
        if (u <= cumulative) {
          return config.values[i] as number;
        }
      }
      return config.values[config.values.length - 1] as number;
    }
    
    // Handle compound and other complex distributions by falling back to normal
    case 'compound': {
      // Compound distributions sample from a frequency then severity
      // Approximate as lognormal for simplicity
      const u1 = rng.next();
      const u2 = rng.next();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const mu = params.mu ?? params.mean ?? 0;
      const sigma = params.sigma ?? params.stdDev ?? 1;
      return Math.exp(mu + sigma * z);
    }
    
    default:
      // Log warning but don't crash - return a uniform sample as fallback
      console.warn(`Unknown distribution type: ${config.type}, using uniform[0,1]`);
      return rng.next();
  }
}
