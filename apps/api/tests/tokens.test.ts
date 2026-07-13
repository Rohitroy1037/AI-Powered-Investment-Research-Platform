import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../src/utils/tokens.js';

describe('token utilities', () => {
  const testUserId = '507f1f77bcf86cd799439011';

  describe('createAccessToken', () => {
    it('returns a valid JWT string', () => {
      const token = createAccessToken(testUserId);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('embeds the userId as sub claim', () => {
      const token = createAccessToken(testUserId);
      const payload = verifyAccessToken(token);
      expect(payload.sub).toBe(testUserId);
    });
  });

  describe('createRefreshToken', () => {
    it('returns a valid JWT string', () => {
      const token = createRefreshToken(testUserId);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('embeds the userId as sub claim', () => {
      const token = createRefreshToken(testUserId);
      const payload = verifyRefreshToken(token);
      expect(payload.sub).toBe(testUserId);
    });
  });

  describe('verifyAccessToken', () => {
    it('throws on invalid token', () => {
      expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });

    it('throws on a token signed with the wrong secret', () => {
      const fakeToken = jwt.sign({ sub: testUserId }, 'wrong-secret-that-is-32-chars-lo');
      expect(() => verifyAccessToken(fakeToken)).toThrow();
    });

    it('rejects a refresh token used as an access token', () => {
      const refreshToken = createRefreshToken(testUserId);
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('throws on invalid token', () => {
      expect(() => verifyRefreshToken('invalid.token.here')).toThrow();
    });

    it('rejects an access token used as a refresh token', () => {
      const accessToken = createAccessToken(testUserId);
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });
});
