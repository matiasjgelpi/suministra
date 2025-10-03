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
			const { celular, empresa } = (await request.json()) as { celular: string; empresa: string };
			const url = env.EMPLOYEE_INFO_URL;
			const authHeader = env.AUTH_HEADER;

			console.log(celular);
			console.log(limpiarNumero(celular));

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: authHeader,
				},
				body: JSON.stringify({
					celular: limpiarNumero(celular),
					empresa: empresa,
				}),
			});

			const responseJson: ApiResponse = await response.json();

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
			return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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

		const telefonoStr = String(telefono)

	if (telefonoStr.startsWith('549')) {
		return telefonoStr.substring(3);
	}

	return telefonoStr;
}
