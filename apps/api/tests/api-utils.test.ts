import { describe, expect, it, vi } from 'vitest';
import { respond } from '../src/utils/api.js';

describe('respond utility', () => {
  const createMockRes = () => {
    const res: Record<string, unknown> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as unknown as import('express').Response;
  };

  it('returns success: true for status < 400', () => {
    const res = createMockRes();
    respond(res, 200, 'OK', { id: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'OK',
      data: { id: 1 },
    });
  });

  it('returns success: false for status >= 400', () => {
    const res = createMockRes();
    respond(res, 404, 'Not found');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Not found',
      data: undefined,
    });
  });

  it('returns success: false for 500 errors', () => {
    const res = createMockRes();
    respond(res, 500, 'Internal error');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
