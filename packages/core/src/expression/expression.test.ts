// Expression Evaluator Tests
// Security-critical: exhaustive testing required

import { describe, it, expect } from 'vitest';
import { evaluate } from './index.js';
import type { ExpressionContext } from '../types/index.js';

describe('Expression Evaluator', () => {
  const baseContext: ExpressionContext = {
    $node: { value: 10, name: 'test' },
    $inputs: { a: 5, b: 3, arr: [1, 2, 3, 4, 5] },
    $params: { rate: 0.05, factor: 2 },
    $time: 0,
    $iteration: 0,
    $nodes: {},
  };

  describe('Basic Arithmetic', () => {
    it('should evaluate addition', () => {
      expect(evaluate('2 + 3', baseContext)).toBe(5);
    });

    it('should evaluate subtraction', () => {
      expect(evaluate('10 - 4', baseContext)).toBe(6);
    });

    it('should evaluate multiplication', () => {
      expect(evaluate('4 * 5', baseContext)).toBe(20);
    });

    it('should evaluate division', () => {
      expect(evaluate('20 / 4', baseContext)).toBe(5);
    });

    it('should evaluate modulo', () => {
      expect(evaluate('10 % 3', baseContext)).toBe(1);
    });

    it('should respect operator precedence', () => {
      expect(evaluate('2 + 3 * 4', baseContext)).toBe(14);
      expect(evaluate('(2 + 3) * 4', baseContext)).toBe(20);
    });

    it('should handle negative numbers', () => {
      expect(evaluate('-5', baseContext)).toBe(-5);
    });

    it('should handle decimal numbers', () => {
      expect(evaluate('1.5 + 2.5', baseContext)).toBe(4);
    });
  });

  describe('Comparison Operators', () => {
    it('should evaluate greater than', () => {
      expect(evaluate('5 > 3', baseContext)).toBe(true);
      expect(evaluate('3 > 5', baseContext)).toBe(false);
    });

    it('should evaluate less than', () => {
      expect(evaluate('3 < 5', baseContext)).toBe(true);
      expect(evaluate('5 < 3', baseContext)).toBe(false);
    });

    it('should evaluate greater than or equal', () => {
      expect(evaluate('5 >= 5', baseContext)).toBe(true);
      expect(evaluate('5 >= 4', baseContext)).toBe(true);
      expect(evaluate('4 >= 5', baseContext)).toBe(false);
    });

    it('should evaluate less than or equal', () => {
      expect(evaluate('5 <= 5', baseContext)).toBe(true);
      expect(evaluate('4 <= 5', baseContext)).toBe(true);
      expect(evaluate('6 <= 5', baseContext)).toBe(false);
    });

    it('should evaluate equality', () => {
      expect(evaluate('5 == 5', baseContext)).toBe(true);
      expect(evaluate('5 == 6', baseContext)).toBe(false);
    });

    it('should evaluate inequality', () => {
      expect(evaluate('5 != 6', baseContext)).toBe(true);
      expect(evaluate('5 != 5', baseContext)).toBe(false);
    });
  });

  describe('Logical Operators', () => {
    it('should evaluate AND', () => {
      expect(evaluate('true && true', baseContext)).toBe(true);
      expect(evaluate('true && false', baseContext)).toBe(false);
      expect(evaluate('false && true', baseContext)).toBe(false);
    });

    it('should evaluate OR', () => {
      expect(evaluate('true || false', baseContext)).toBe(true);
      expect(evaluate('false || true', baseContext)).toBe(true);
      expect(evaluate('false || false', baseContext)).toBe(false);
    });

    it('should evaluate NOT', () => {
      expect(evaluate('!true', baseContext)).toBe(false);
      expect(evaluate('!false', baseContext)).toBe(true);
    });

    it('should handle complex logical expressions', () => {
      expect(evaluate('(5 > 3) && (2 < 4)', baseContext)).toBe(true);
      expect(evaluate('(5 > 3) || (2 > 4)', baseContext)).toBe(true);
    });
  });

  describe('Ternary Operator', () => {
    it('should evaluate ternary true case', () => {
      expect(evaluate('true ? 1 : 2', baseContext)).toBe(1);
    });

    it('should evaluate ternary false case', () => {
      expect(evaluate('false ? 1 : 2', baseContext)).toBe(2);
    });

    it('should evaluate ternary with expressions', () => {
      expect(evaluate('5 > 3 ? 10 : 20', baseContext)).toBe(10);
      expect(evaluate('5 < 3 ? 10 : 20', baseContext)).toBe(20);
    });
  });

  describe('Variable Access', () => {
    it('should access $node properties', () => {
      expect(evaluate('$node.value', baseContext)).toBe(10);
      expect(evaluate('$node.name', baseContext)).toBe('test');
    });

    it('should access $inputs properties', () => {
      expect(evaluate('$inputs.a', baseContext)).toBe(5);
      expect(evaluate('$inputs.b', baseContext)).toBe(3);
    });

    it('should access $params properties', () => {
      expect(evaluate('$params.rate', baseContext)).toBe(0.05);
      expect(evaluate('$params.factor', baseContext)).toBe(2);
    });

    it('should access $time and $iteration', () => {
      expect(evaluate('$time', baseContext)).toBe(0);
      expect(evaluate('$iteration', baseContext)).toBe(0);
    });

    it('should use variables in expressions', () => {
      expect(evaluate('$inputs.a + $inputs.b', baseContext)).toBe(8);
      expect(evaluate('$node.value * $params.factor', baseContext)).toBe(20);
    });
  });

  describe('Built-in Math Functions', () => {
    it('should evaluate abs', () => {
      expect(evaluate('abs(-5)', baseContext)).toBe(5);
      expect(evaluate('abs(5)', baseContext)).toBe(5);
    });

    it('should evaluate floor', () => {
      expect(evaluate('floor(3.7)', baseContext)).toBe(3);
      expect(evaluate('floor(-3.7)', baseContext)).toBe(-4);
    });

    it('should evaluate ceil', () => {
      expect(evaluate('ceil(3.2)', baseContext)).toBe(4);
      expect(evaluate('ceil(-3.2)', baseContext)).toBe(-3);
    });

    it('should evaluate round', () => {
      expect(evaluate('round(3.5)', baseContext)).toBe(4);
      expect(evaluate('round(3.4)', baseContext)).toBe(3);
    });

    it('should evaluate sqrt', () => {
      expect(evaluate('sqrt(16)', baseContext)).toBe(4);
      expect(evaluate('sqrt(2)', baseContext)).toBeCloseTo(1.414, 2);
    });

    it('should evaluate log', () => {
      expect(evaluate('log(1)', baseContext)).toBe(0);
    });

    it('should evaluate exp', () => {
      expect(evaluate('exp(0)', baseContext)).toBe(1);
    });

    it('should evaluate pow', () => {
      expect(evaluate('pow(2, 3)', baseContext)).toBe(8);
      expect(evaluate('pow(10, 2)', baseContext)).toBe(100);
    });

    it('should evaluate min', () => {
      expect(evaluate('min(1, 2, 3)', baseContext)).toBe(1);
    });

    it('should evaluate max', () => {
      expect(evaluate('max(1, 2, 3)', baseContext)).toBe(3);
    });

    it('should evaluate sin, cos, tan', () => {
      expect(evaluate('sin(0)', baseContext)).toBe(0);
      expect(evaluate('cos(0)', baseContext)).toBe(1);
      expect(evaluate('tan(0)', baseContext)).toBe(0);
    });
  });

  describe('Statistical Functions', () => {
    it('should evaluate sum', () => {
      expect(evaluate('sum($inputs.arr)', baseContext)).toBe(15);
    });

    it('should evaluate mean', () => {
      expect(evaluate('mean($inputs.arr)', baseContext)).toBe(3);
    });

    it('should evaluate count', () => {
      expect(evaluate('count($inputs.arr)', baseContext)).toBe(5);
    });
  });

  describe('Array Functions', () => {
    it('should evaluate length', () => {
      expect(evaluate('length($inputs.arr)', baseContext)).toBe(5);
    });

    it('should evaluate first', () => {
      expect(evaluate('first($inputs.arr)', baseContext)).toBe(1);
    });

    it('should evaluate last', () => {
      expect(evaluate('last($inputs.arr)', baseContext)).toBe(5);
    });
  });

  describe('Conditional Functions', () => {
    it('should evaluate if', () => {
      expect(evaluate('if(true, 1, 2)', baseContext)).toBe(1);
      expect(evaluate('if(false, 1, 2)', baseContext)).toBe(2);
    });

    it('should evaluate switch-like behavior', () => {
      expect(evaluate('if($inputs.a > 3, 100, 0)', baseContext)).toBe(100);
    });
  });

  describe('Complex Expressions', () => {
    it('should evaluate nested function calls', () => {
      expect(evaluate('round(sqrt(abs(-16)))', baseContext)).toBe(4);
    });

    it('should evaluate statistical aggregation', () => {
      expect(evaluate('sum($inputs.arr) / count($inputs.arr)', baseContext)).toBe(3);
    });

    it('should evaluate conditional logic', () => {
      const result = evaluate(
        '$inputs.a > 4 ? $inputs.a * 2 : $inputs.a + 10',
        baseContext
      );
      expect(result).toBe(10); // 5 > 4, so 5 * 2 = 10
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long expressions', () => {
      const longExpr = Array(100).fill('1').join(' + ');
      expect(evaluate(longExpr, baseContext)).toBe(100);
    });

    it('should handle deeply nested parentheses', () => {
      expect(evaluate('((((((1))))))', baseContext)).toBe(1);
    });

    it('should handle boolean literals', () => {
      expect(evaluate('true', baseContext)).toBe(true);
      expect(evaluate('false', baseContext)).toBe(false);
    });
  });
});
