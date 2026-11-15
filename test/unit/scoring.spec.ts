import { describe, it, expect } from 'vitest';
import {
  addDecimals,
  subtractDecimals,
  multiplyDecimals,
  divideDecimals,
  roundToPrecision,
  isValidUUID,
  shuffleArray,
} from '../../src/common/utils/index.js';

describe('Scoring and Decimal Arithmetic Utilities', () => {
  describe('roundToPrecision', () => {
    it('should round numbers to 2 decimal places by default', () => {
      expect(roundToPrecision(10.555)).toBe(10.56);
      expect(roundToPrecision(10.554)).toBe(10.55);
      expect(roundToPrecision(0.1 + 0.2)).toBe(0.3);
    });

    it('should round to arbitrary decimal places when specified', () => {
      expect(roundToPrecision(10.5555, 3)).toBe(10.556);
      expect(roundToPrecision(10.5, 0)).toBe(11);
    });
  });

  describe('addDecimals', () => {
    it('should avoid floating point inaccuracy when adding', () => {
      // 0.1 + 0.2 in JS is 0.30000000000000004
      expect(addDecimals(0.1, 0.2)).toBe(0.3);
      expect(addDecimals('12.35', '7.65')).toBe(20.0);
    });
  });

  describe('subtractDecimals', () => {
    it('should avoid floating point inaccuracy when subtracting', () => {
      // 0.3 - 0.2 in JS is 0.09999999999999998
      expect(subtractDecimals(0.3, 0.2)).toBe(0.1);
      expect(subtractDecimals('50.00', '12.25')).toBe(37.75);
    });
  });

  describe('multiplyDecimals', () => {
    it('should calculate correct products with 2 decimal precision', () => {
      expect(multiplyDecimals(4, 0.25)).toBe(1.0);
      expect(multiplyDecimals('3.50', '2')).toBe(7.0);
    });
  });

  describe('divideDecimals', () => {
    it('should calculate quotients and handle zero denominator gracefully', () => {
      expect(divideDecimals(100, 3)).toBe(33.33);
      expect(divideDecimals(50, 0)).toBe(0);
    });
  });

  describe('shuffleArray', () => {
    it('should return a new array containing all the original elements without modifying source', () => {
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      const shuffled = shuffleArray(original);

      expect(shuffled).toHaveLength(original.length);
      expect(original).toEqual(copy);
      expect(shuffled.sort()).toEqual(copy.sort());
    });
  });

  describe('isValidUUID', () => {
    it('should validate valid UUID v4 format', () => {
      expect(isValidUUID('8d6e2c40-8a5b-4a91-9b6d-21f7a34d8021')).toBe(true);
      expect(isValidUUID('invalid-uuid-string')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('Academic Grading Boundaries', () => {
    function calculateGrade(percentage: number): string {
      if (percentage >= 90) return 'O';
      if (percentage >= 80) return 'E';
      if (percentage >= 70) return 'A';
      if (percentage >= 60) return 'B';
      if (percentage >= 50) return 'C';
      if (percentage >= 40) return 'D';
      return 'F';
    }

    it('should map percentages to proper letter grades', () => {
      expect(calculateGrade(95)).toBe('O');
      expect(calculateGrade(90)).toBe('O');
      expect(calculateGrade(89.9)).toBe('E');
      expect(calculateGrade(80)).toBe('E');
      expect(calculateGrade(75)).toBe('A');
      expect(calculateGrade(65)).toBe('B');
      expect(calculateGrade(55)).toBe('C');
      expect(calculateGrade(45)).toBe('D');
      expect(calculateGrade(39.9)).toBe('F');
      expect(calculateGrade(0)).toBe('F');
    });
  });
});
