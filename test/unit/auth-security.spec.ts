import { describe, it, expect } from 'vitest';
import * as argon2 from 'argon2';
import { UserRole } from '../../src/shared/enums/index.js';

describe('Authentication and Security Unit Tests', () => {
  describe('Argon2id Password Hashing', () => {
    it('should hash passwords using Argon2id algorithm', async () => {
      const plainPassword = 'SecurePassword@123';
      const hash = await argon2.hash(plainPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });

      expect(hash).toBeDefined();
      expect(hash.startsWith('$argon2id$')).toBe(true);

      const isValid = await argon2.verify(hash, plainPassword);
      expect(isValid).toBe(true);

      const isInvalid = await argon2.verify(hash, 'WrongPassword');
      expect(isInvalid).toBe(false);
    });

    it('should generate unique salt and hash for the same password', async () => {
      const password = 'IdenticalPassword123!';
      const hash1 = await argon2.hash(password, { type: argon2.argon2id });
      const hash2 = await argon2.hash(password, { type: argon2.argon2id });

      expect(hash1).not.toEqual(hash2);
      expect(await argon2.verify(hash1, password)).toBe(true);
      expect(await argon2.verify(hash2, password)).toBe(true);
    });
  });

  describe('Role-Based Access Control Verification', () => {
    function isAuthorized(userRole: UserRole, requiredRoles: UserRole[]): boolean {
      if (!requiredRoles || requiredRoles.length === 0) return true;
      if (userRole === UserRole.ADMIN) return true; // Superuser privileges
      return requiredRoles.includes(userRole);
    }

    it('should allow ADMIN access to all role-restricted routes', () => {
      expect(isAuthorized(UserRole.ADMIN, [UserRole.ADMIN])).toBe(true);
      expect(isAuthorized(UserRole.ADMIN, [UserRole.FACULTY])).toBe(true);
      expect(isAuthorized(UserRole.ADMIN, [UserRole.STUDENT])).toBe(true);
    });

    it('should grant FACULTY access only to FACULTY-allowed routes', () => {
      expect(isAuthorized(UserRole.FACULTY, [UserRole.FACULTY])).toBe(true);
      expect(isAuthorized(UserRole.FACULTY, [UserRole.ADMIN])).toBe(false);
      expect(isAuthorized(UserRole.FACULTY, [UserRole.STUDENT])).toBe(false);
      expect(isAuthorized(UserRole.FACULTY, [UserRole.FACULTY, UserRole.ADMIN])).toBe(true);
    });

    it('should grant STUDENT access only to STUDENT-allowed routes', () => {
      expect(isAuthorized(UserRole.STUDENT, [UserRole.STUDENT])).toBe(true);
      expect(isAuthorized(UserRole.STUDENT, [UserRole.ADMIN])).toBe(false);
      expect(isAuthorized(UserRole.STUDENT, [UserRole.FACULTY])).toBe(false);
      expect(isAuthorized(UserRole.STUDENT, [UserRole.ADMIN, UserRole.FACULTY])).toBe(false);
    });
  });
});
