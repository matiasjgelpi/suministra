import type { ApiResponse, Resultado } from './types/ApiResponse';
/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

interface Env {
	EMPLOYEE_INFO_URL: string;
	AUTH_HEADER: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			if (request.method !== 'POST') {
				return new Response(JSON.stringify({ error: 'Método no permitido' }), {
					status: 405,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const payload = (await request.json()) as {
				celular?: string;
				empresa?: number;
				dni?: string | number;
				fnac?: string;
			};

			const url = env.EMPLOYEE_INFO_URL;
			const authHeader = env.AUTH_HEADER;

			const empresa = payload.empresa;

			const hasPhoneFlow = payload.celular !== undefined && payload.empresa !== undefined;
			const hasDniDobFlow = payload.dni !== undefined && payload.fnac !== undefined && payload.empresa !== undefined;

			if (!hasPhoneFlow && !hasDniDobFlow) {
				return new Response(
					JSON.stringify(
						{
							error: 'Parámetros inválidos. Enviá (celular, empresa) ó (dni, fnac, empresa).',
							ejemplo_phone: { celular: '+54 11 1234-5678', empresa: 1 },
							ejemplo_dni_fnac: { dni: '30111222', fnac: '1996-12-16', empresa: 1 },
						},
						null,
						2
					),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json; charset=utf-8' },
					}
				);
			}

			let bodyOut: Record<string, unknown>;

			if (hasPhoneFlow) {
				const celular = limpiarNumero(payload.celular!);
				if (!celular) {
					return new Response(JSON.stringify({ error: 'El número de celular es inválido o quedó vacío tras normalizar.' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json; charset=utf-8' },
					});
				}
				bodyOut = { celular, empresa };
			} else {
				const dni = String(payload.dni).trim();
				const fnac = String(payload.fnac).trim();

				if (!/^\d{7,9}$/.test(dni)) {
					return new Response(JSON.stringify({ error: 'DNI inválido. Debe ser numérico (7 a 9 dígitos).' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json; charset=utf-8' },
					});
				}

				if (!isValidISODate(fnac)) {
					return new Response(JSON.stringify({ error: 'fnac inválida. Formato requerido: YYYY-MM-DD (e.g., 1996-12-16).' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json; charset=utf-8' },
					});
				}

				bodyOut = { dni, fnac, empresa };
			}

			const upstream = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: authHeader,
				},
				body: JSON.stringify(bodyOut),
			});

			if (!upstream.ok) {
				const text = await safeText(upstream);
				return new Response(
					JSON.stringify({
						error: 'Error del servicio de empleados',
						status: upstream.status,
						detalle: text?.slice(0, 500) ?? null,
					}),
					{
						status: upstream.status,
						headers: { 'Content-Type': 'application/json; charset=utf-8' },
					}
				);
			}

			const responseJson: ApiResponse = await upstream.json();

			if (Array.isArray(responseJson.resultado)) {
				return new Response(JSON.stringify({ message: 'No se encontró ningún empleado' }), {
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const datos = (responseJson.resultado as Resultado).datos;
			const datosFiltrados = filtrarTalles(datos);

			return new Response(JSON.stringify(datosFiltrados, null, 2), {
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (err: any) {
			return new Response(JSON.stringify({ error: err?.message ?? 'Error interno' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
			});
		}
	},
} satisfies ExportedHandler<Env>;

// --- Función para filtrar los talles ---
function filtrarTalles(datos: any) {
	const codigosEmpleado = {
		calzado: datos.talle_calzado,
		pantalon: datos.talle_pantalon,
		remera: datos.talle_remera,
		faja: datos.talle_faja,
	};

	const tallesFiltrados = {};

	interface Talle {
		codigo: string;
		[key: string]: any;
	}

	interface CategoriaTalle {
		[tipo: string]: Talle[];
	}

	interface Datos {
		talle_calzado: string;
		talle_pantalon: string;
		talle_remera: string;
		talle_faja: string;
		talles: CategoriaTalle[];
		[key: string]: any;
	}

	const datosTyped: Datos = datos;

	(datosTyped.talles as CategoriaTalle[]).forEach((categoria: CategoriaTalle) => {
		for (const tipo in categoria) {
			const talle = categoria[tipo].find((t: Talle) => t.codigo === codigosEmpleado[tipo as keyof typeof codigosEmpleado]);
			if (talle) {
				(tallesFiltrados as { [key: string]: Talle })[tipo] = talle;
			}
		}
	});

	return {
		...datos,
		talles: tallesFiltrados,
	};
}

function limpiarNumero(telefono: string): string {
	const telefonoStr = String(telefono);

	if (telefonoStr.startsWith('549')) {
		return telefonoStr.substring(3);
	}

	return telefonoStr;
}

// Valida YYYY-MM-DD estricto y que sea una fecha real (no 2025-02-31, etc.)
function isValidISODate(s: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
	const [y, m, d] = s.split('-').map(Number);
	const dt = new Date(Date.UTC(y, m - 1, d));
	return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
}

// Evita excepción si el upstream no trae JSON y queremos ver algo del body
async function safeText(res: Response): Promise<string | null> {
	try {
		return await res.text();
	} catch {
		return null;
	}
}
