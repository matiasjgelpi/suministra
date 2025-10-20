import { describe, it, expect } from 'vitest';
import worker from '../src/index';

function jsonReq(body: any) {
  return new Request('http://local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const env = {
  EMPLOYEE_INFO_URL: 'https://upstream.example/api',
  AUTH_HEADER: 'Bearer TEST',
} as any;

describe('Validaciones', () => {
  it('405 si no es POST', async () => {
    const res = await worker.fetch(new Request('http://local', { method: 'GET' }), env, {} as any);
    expect(res.status).toBe(405);
  });

  it('400 si faltan parámetros', async () => {
    const res = await worker.fetch(jsonReq({}), env, {} as any);
    expect(res.status).toBe(400);
  });
  
});
