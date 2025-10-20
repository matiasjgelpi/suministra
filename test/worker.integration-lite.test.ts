import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index';

const env = {
  EMPLOYEE_INFO_URL: 'https://upstream.example/api',
  AUTH_HEADER: 'Bearer TEST',
} as any;

function jsonReq(body: any) {
  return new Request('http://local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Integración ligera', () => {
  it('flujo teléfono: normaliza 549… y devuelve datos sin token', async () => {
    const upstreamResponse = {
      resultado: {
        datos: {
          token: 'SECRET',
          nombre: 'Juan',
          talle_calzado: '42',
          talle_pantalon: 'M',
          talle_remera: 'L',
          talle_faja: 'F1',
          talles: [
            { calzado: [{ codigo: '42', etiqueta: '42 AR' }] },
            { pantalon: [{ codigo: 'M', etiqueta: 'Medium' }] },
            { remera: [{ codigo: 'L', etiqueta: 'Large' }] },
            { faja: [{ codigo: 'F1', etiqueta: 'Faja 1' }] }
          ]
        }
      }
    };

    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(upstreamResponse), { status: 200 }) as any
    );

    const res = await worker.fetch(jsonReq({ celular: '5491112345678', empresa: 1 }), env, {} as any);
    expect(spy).toHaveBeenCalledTimes(1);

    const sent = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.celular).toBe('1112345678');

    const body = await res.json() as any;
    expect(body.token).toBeUndefined();
    expect(body.talles.calzado.codigo).toBe('42');
  });

  it('flujo DNI+fnac: propaga error del upstream', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Upstream roto', { status: 502 }) as any
    );

    const res = await worker.fetch(jsonReq({ dni: '30111222', fnac: '1996-12-16', empresa: 5 }), env, {} as any);
    expect(res.status).toBe(502);
    const body = await res.json() as any;
    expect(body.error).toBe('Error del servicio de empleados');
  });
});

