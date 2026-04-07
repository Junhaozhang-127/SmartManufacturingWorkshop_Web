import { describe, expect, it } from 'vitest';

import { StatusCode, createApiResponse } from '../src';

describe('createApiResponse', () => {
  it('creates a unified response payload', () => {
    const result = createApiResponse({ ok: true }, 'success', StatusCode.SUCCESS, 'trace-1');

    expect(result.code).toBe(StatusCode.SUCCESS);
    expect(result.message).toBe('success');
    expect(result.data).toEqual({ ok: true });
    expect(result.requestId).toBe('trace-1');
  });
});
