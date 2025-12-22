/**
 * ScenarioForge - Expression Evaluator Security Tests
 * 
 * Security-critical tests for the sandboxed expression evaluator.
 * These tests ensure the expression system cannot be exploited.
 */

import { describe, it, expect } from 'vitest';
import { evaluate, validateExpression, setSeed, sampleDistribution } from '../expression/index.js';
import type { ExpressionContext } from '../types/index.js';

const baseContext: ExpressionContext = {
  $node: { value: 10, name: 'test' },
  $inputs: { a: 5, b: 3, arr: [1, 2, 3, 4, 5] },
  $params: { rate: 0.05, factor: 2 },
  $time: 0,
  $iteration: 0,
  $nodes: {},
};

describe('Expression Evaluator Security Tests', () => {
  // ============================================
  // Injection Prevention
  // ============================================
  describe('Code Injection Prevention', () => {
    it('should reject JavaScript constructor access', () => {
      const maliciousExpressions = [
        'constructor',
        '"".constructor',
        '[].constructor',
        '({}).constructor',
        'constructor.constructor',
      ];

      for (const expr of maliciousExpressions) {
        expect(() => evaluate(expr, baseContext)).toThrow();
      }
    });

    it('should reject prototype pollution attempts', () => {
      const maliciousExpressions = [
        '__proto__',
        'prototype',
        '$node.__proto__',
        '$inputs.prototype',
      ];

      for (const expr of maliciousExpressions) {
        expect(() => evaluate(expr, baseContext)).toThrow();
      }
    });

    it('should reject function constructor attempts', () => {
      const maliciousExpressions = [
        'Function("return this")()',
        'eval("1+1")',
        'new Function("alert(1)")',
      ];

      for (const expr of maliciousExpressions) {
        expect(() => evaluate(expr, baseContext)).toThrow();
      }
    });

    it('should reject global object access', () => {
      const maliciousExpressions = [
        'globalThis',
        'global',
        'window',
        'process',
        'require',
        'import',
        'module',
      ];

      for (const expr of maliciousExpressions) {
        expect(() => evaluate(expr, baseContext)).toThrow();
      }
    });

    it('should reject dangerous methods', () => {
      const maliciousExpressions = [
        'toString.call()',
        'valueOf.call()',
        'hasOwnProperty',
        'isPrototypeOf',
      ];

      for (const expr of maliciousExpressions) {
        // Should either throw or return undefined (not execute)
        try {
          const result = evaluate(expr, baseContext);
          // If it doesn't throw, it should not be a function
          expect(typeof result).not.toBe('function');
        } catch {
          // Throwing is the expected safe behavior
        }
      }
    });
  });

  // ============================================
  // Variable Access Security
  // ============================================
  describe('Variable Access Security', () => {
    it('should only allow $-prefixed context variables', () => {
      expect(evaluate('$node.value', baseContext)).toBe(10);
      expect(evaluate('$inputs.a', baseContext)).toBe(5);
      expect(evaluate('$params.rate', baseContext)).toBe(0.05);
    });

    it('should reject non-$ prefixed variable access', () => {
      const invalidVariables = [
        'node',
        'inputs',
        'params',
        'secret',
        'password',
        'config',
      ];

      for (const varName of invalidVariables) {
        expect(() => evaluate(varName, baseContext)).toThrow();
      }
    });

    it('should handle undefined context properties safely', () => {
      const result = evaluate('$node.nonexistent', baseContext);
      expect(result).toBeUndefined();
    });

    it('should handle deep property access safely', () => {
      const context = {
        ...baseContext,
        $node: { nested: { deep: { value: 42 } } },
      };

      expect(evaluate('$node.nested.deep.value', context)).toBe(42);
      expect(evaluate('$node.nested.missing.value', context)).toBeUndefined();
    });
  });

  // ============================================
  // Function Whitelist
  // ============================================
  describe('Function Whitelist Enforcement', () => {
    const allowedFunctions = [
      // Math
      'abs(-5)',
      'floor(3.7)',
      'ceil(3.2)',
      'round(3.5)',
      'sqrt(16)',
      'pow(2, 3)',
      'min(1, 2, 3)',
      'max(1, 2, 3)',
      'sin(0)',
      'cos(0)',
      'tan(0)',
      'log(1)',
      'exp(0)',
      // Statistical
      'sum([1, 2, 3])',
      'mean([1, 2, 3])',
      'count([1, 2, 3])',
      // Array
      'length([1, 2, 3])',
      'first([1, 2, 3])',
      'last([1, 2, 3])',
      // Conditional
      'if(true, 1, 2)',
      // Random (allowed for simulation)
      'random()',
    ];

    it('should allow whitelisted functions', () => {
      for (const expr of allowedFunctions) {
        expect(() => evaluate(expr, baseContext)).not.toThrow();
      }
    });

    it('should reject non-whitelisted functions', () => {
      const disallowedFunctions = [
        'alert("xss")',
        'console.log("test")',
        'setTimeout(function(){}, 0)',
        'setInterval(function(){}, 0)',
        'fetch("http://evil.com")',
        'XMLHttpRequest()',
        'WebSocket("ws://evil.com")',
        'document.write("test")',
        'localStorage.getItem("key")',
        'fs.readFileSync("test")',
        'require("child_process")',
        'exec("rm -rf /")',
      ];

      for (const expr of disallowedFunctions) {
        expect(() => evaluate(expr, baseContext)).toThrow();
      }
    });
  });

  // ============================================
  // Resource Exhaustion Prevention
  // ============================================
  describe('Resource Exhaustion Prevention', () => {
    it('should handle very long expressions', () => {
      // 1000 nested additions
      const longExpr = Array(1000).fill('1').join(' + ');
      const result = evaluate(longExpr, baseContext);
      expect(result).toBe(1000);
    });

    it('should handle deeply nested parentheses', () => {
      const depth = 100;
      const nested = '('.repeat(depth) + '42' + ')'.repeat(depth);
      const result = evaluate(nested, baseContext);
      expect(result).toBe(42);
    });

    it('should handle array with many elements', () => {
      const bigArray = Array(1000).fill(1);
      const context = {
        ...baseContext,
        $inputs: { arr: bigArray },
      };

      const result = evaluate('sum($inputs.arr)', context);
      expect(result).toBe(1000);
    });

    it('should handle repeated function calls', () => {
      // This shouldn't cause stack overflow
      let expr = '1';
      for (let i = 0; i < 50; i++) {
        expr = `abs(${expr})`;
      }
      const result = evaluate(expr, baseContext);
      expect(result).toBe(1);
    });
  });

  // ============================================
  // Type Safety
  // ============================================
  describe('Type Safety', () => {
    it('should handle type coercion safely', () => {
      // String + number
      const result1 = evaluate('"10" + 5', baseContext);
      expect(result1).toBe('105'); // String concatenation

      // Number operations with type mismatch
      const result2 = evaluate('10 * "2"', baseContext);
      expect(result2).toBe(20); // Numeric coercion
    });

    it('should handle null and undefined safely', () => {
      const context = {
        ...baseContext,
        $node: { value: null, undef: undefined },
      };

      expect(evaluate('$node.value', context)).toBeNull();
      expect(evaluate('$node.undef', context)).toBeUndefined();
      expect(evaluate('$node.missing', context)).toBeUndefined();
    });

    it('should handle boolean operations correctly', () => {
      expect(evaluate('true && true', baseContext)).toBe(true);
      expect(evaluate('true && false', baseContext)).toBe(false);
      expect(evaluate('false || true', baseContext)).toBe(true);
      expect(evaluate('!false', baseContext)).toBe(true);
    });
  });

  // ============================================
  // Distribution Sampling Security
  // ============================================
  describe('Distribution Sampling Security', () => {
    it('should handle invalid distribution types', () => {
      setSeed(42);
      // Unknown distribution should fall back to lognormal or similar
      const result = sampleDistribution({
        type: 'invalid_distribution' as any,
        parameters: { mean: 10 },
      });
      expect(typeof result).toBe('number');
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should handle missing distribution parameters', () => {
      setSeed(42);
      // Missing stddev should use default
      const result = sampleDistribution({
        type: 'normal',
        parameters: { mean: 100 },
      });
      expect(typeof result).toBe('number');
    });

    it('should handle extreme distribution parameters', () => {
      setSeed(42);

      // Very large values
      const result1 = sampleDistribution({
        type: 'normal',
        parameters: { mean: 1e10, stddev: 1e8 },
      });
      expect(Number.isFinite(result1)).toBe(true);

      // Very small values
      const result2 = sampleDistribution({
        type: 'normal',
        parameters: { mean: 1e-10, stddev: 1e-12 },
      });
      expect(Number.isFinite(result2)).toBe(true);
    });

    it('should handle negative parameters appropriately', () => {
      setSeed(42);

      // Negative mean is valid for normal
      const result = sampleDistribution({
        type: 'normal',
        parameters: { mean: -100, stddev: 10 },
      });
      expect(typeof result).toBe('number');
    });
  });

  // ============================================
  // Expression Validation
  // ============================================
  describe('Expression Validation', () => {
    it('should validate correct expressions', () => {
      const validExpressions = [
        '1 + 2',
        '$node.value * 2',
        'if($inputs.a > 0, 1, 0)',
        'sum([1, 2, 3])',
        'true ? "yes" : "no"',
      ];

      for (const expr of validExpressions) {
        const result = validateExpression(expr);
        expect(result.valid).toBe(true);
      }
    });

    it('should detect syntax errors', () => {
      const invalidExpressions = [
        '1 +',
        '(1 + 2',
        '1 + + 2',
        'if(true, 1)',
        '{{invalid}}',
      ];

      for (const expr of invalidExpressions) {
        const result = validateExpression(expr);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle empty expression', () => {
      expect(() => evaluate('', baseContext)).toThrow();
    });

    it('should handle whitespace-only expression', () => {
      expect(() => evaluate('   ', baseContext)).toThrow();
    });

    it('should handle special number values', () => {
      expect(evaluate('1 / 0', baseContext)).toBe(Infinity);
      expect(evaluate('-1 / 0', baseContext)).toBe(-Infinity);
      expect(Number.isNaN(evaluate('0 / 0', baseContext))).toBe(true);
    });

    it('should handle string escapes', () => {
      expect(evaluate('"hello\\nworld"', baseContext)).toBe('hello\nworld');
      expect(evaluate('"hello\\tworld"', baseContext)).toBe('hello\tworld');
    });

    it('should handle array index access', () => {
      expect(evaluate('$inputs.arr[0]', baseContext)).toBe(1);
      expect(evaluate('$inputs.arr[4]', baseContext)).toBe(5);
      expect(evaluate('$inputs.arr[10]', baseContext)).toBeUndefined();
    });

    it('should handle negative array indices safely', () => {
      const result = evaluate('$inputs.arr[-1]', baseContext);
      expect(result).toBeUndefined();
    });
  });

  // ============================================
  // Context Isolation
  // ============================================
  describe('Context Isolation', () => {
    it('should not modify the original context', () => {
      const context = {
        $node: { value: 10 },
        $inputs: {},
        $params: {},
        $time: 0,
        $iteration: 0,
        $nodes: {},
      };

      const originalValue = context.$node.value;

      // Try expression that might modify context
      evaluate('$node.value + 1', context);

      // Context should be unchanged
      expect(context.$node.value).toBe(originalValue);
    });

    it('should isolate between evaluations', () => {
      const context1 = { ...baseContext, $node: { value: 1 } };
      const context2 = { ...baseContext, $node: { value: 2 } };

      const result1 = evaluate('$node.value', context1);
      const result2 = evaluate('$node.value', context2);

      expect(result1).toBe(1);
      expect(result2).toBe(2);
    });
  });
});

// ============================================
// Performance and Stress Tests
// ============================================
describe('Expression Performance Tests', () => {
  it('should evaluate 10000 simple expressions efficiently', () => {
    const start = performance.now();

    for (let i = 0; i < 10000; i++) {
      evaluate('1 + 2 + 3', baseContext);
    }

    const elapsed = performance.now() - start;
    console.log(`10,000 simple expressions: ${elapsed.toFixed(0)}ms`);
    expect(elapsed).toBeLessThan(5000); // Should complete in < 5 seconds
  });

  it('should evaluate 1000 complex expressions efficiently', () => {
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      evaluate(
        'if($inputs.a > 0, pow($inputs.a, 2) + sqrt(abs($inputs.b)), 0)',
        baseContext
      );
    }

    const elapsed = performance.now() - start;
    console.log(`1,000 complex expressions: ${elapsed.toFixed(0)}ms`);
    expect(elapsed).toBeLessThan(5000);
  });
});
