# Employee Info Proxy – Cloudflare Worker

Worker que recibe solicitudes para **identificar empleados** y las reenvía a un **backend externo**, validando y normalizando los datos de entrada, manejando errores y **filtrando** el resultado (oculta `token` y reduce `talles` a los códigos del empleado).

---

## ✨ ¿Qué hace?

* Acepta **dos flujos** de autenticación:

  1. **Teléfono**: `celular` + `empresa`
  2. **DNI + fecha de nacimiento**: `dni` + `fnac` (ISO `YYYY-MM-DD`) + `empresa`
* **Normaliza** el teléfono (quita prefijo `549` si corresponde).
* **Valida**:

  * `dni` → numérico de 7 a 9 dígitos
  * `fnac` → fecha ISO estricta y real (`YYYY-MM-DD`)
* **Propaga** el status del backend (por ejemplo, 5xx) y devuelve `{ error, status, detalle }` ante fallo.
* **Limpia** la respuesta:

  * Elimina `token`.
  * Filtra `talles` para dejar solo los que coinciden con los códigos del empleado.

---

## 🔌 Endpoint

* **Método:** `POST`
* **URL:** tu dominio `*.workers.dev` o la ruta configurada (si usás zone + route)

### Cuerpos admitidos

**1) Teléfono**

```json
{
  "celular": "+54 9 11 1234-5678",
  "empresa": 1
}
```

**2) DNI + fecha de nacimiento**

```json
{
  "dni": "30111222",
  "fnac": "1996-12-16",
  "empresa": 1
}
```

### Respuestas de error (ejemplos)

* `405` → método no permitido
* `400` → parámetros inválidos (con ejemplos de uso)
* `5xx` → error del backend (propagado), con `{ error, status, detalle }`

---

## ⚙️ Configuración (bindings)

Definí estas variables en `wrangler.toml` (o como secrets):

* `EMPLOYEE_INFO_URL` → URL del backend (API externa)
* `AUTH_HEADER` → valor de `Authorization` a reenviar (por ejemplo `Bearer <token>`)

> **Nota:** Es recomendable setear `AUTH_HEADER` como **secret** (no lo escribas en texto plano).

---

## 🗂 Estructura sugerida

```
.
├─ src/
│  └─ index.ts            # export default { fetch(...) }
├─ wrangler.toml
├─ package.json
└─ README.md
```

**`wrangler.toml` (base):**

```toml
name = "employee-info-proxy"      # cambiá por el nombre real
main = "src/index.ts"             # entry de tu worker
compatibility_date = "2025-10-01"

[vars]
EMPLOYEE_INFO_URL = "https://backend.ejemplo/api"   # si es sensible, mover a secret
# AUTH_HEADER NO lo pongas aquí; guardalo como secret:
# npx wrangler secret put AUTH_HEADER
```

---

## ▶️ Uso local

```bash
npm ci
npm run dev
# abre http://127.0.0.1:8787
```

**Ejemplos `curl`:**

* **Teléfono**

```bash
curl -sS -X POST http://127.0.0.1:8787 \
  -H "Content-Type: application/json" \
  -d '{"celular":"5491112345678","empresa":1}'
```

* **DNI + fnac**

```bash
curl -sS -X POST http://127.0.0.1:8787 \
  -H "Content-Type: application/json" \
  -d '{"dni":"30111222","fnac":"1996-12-16","empresa":1}'
```

---

## ☁️ Deploy manual (Wrangler)

> Cuando tengas las credenciales (account del tercero):

1. **Login** (opcional si deployás con token):

   ```bash
   npx wrangler login
   ```
2. **Secrets**:

   ```bash
   npx wrangler secret put AUTH_HEADER
   ```
3. **Variables (si preferís por env en vez de `wrangler.toml`)**:

   ```bash
   npx wrangler secret put EMPLOYEE_INFO_URL
   ```
4. **Deploy**:

   ```bash
   npx wrangler deploy
   ```

> Si usás rutas en una zone (dominio propio), agregá las `routes` en `wrangler.toml` o configuralas por UI.

---

## 🔐 Notas de seguridad

* No loguees datos sensibles (tokens, DNI completos, etc.).
* Usá **secrets** para credenciales y headers.
* Validá siempre inputs externos (el worker ya aplica validaciones mínimas).

---

## 📌 Convenciones

* **External API call / upstream**: el llamado al backend externo se hace con `fetch()` usando `EMPLOYEE_INFO_URL` + `AUTH_HEADER`.
* **Bindings**: variables y secretos inyectados en `env` (no confundir con service bindings a otros Workers).

---

