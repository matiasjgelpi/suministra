// Tipos para la respuesta del endpoint

export interface Producto {
  fecha: string;
  movimiento: string;
  cantidad: number;
  color: string;
  unidad: string;
  producto: string;
}

export interface Ausencia {
  codigo: number;
  desde: string;
  hasta: string;
  motivo: string;
  procesada: number | null;
  descripcion: string;
}

export interface Contrato {
  numero: number;
  cliente: string;
  usuaria: string;
  cuit: string;
  sucursal: number;
  sucursal_nombre: string;
  estado: string;
  fecha_inicio: string;
  fecha_final: string | null;
  productos: Producto[];
  ausencias: Ausencia[];
}

export interface TalleItem {
  codigo: number;
  nombre: string;
}

export interface TalleCategoria {
  [categoria: string]: TalleItem[];
}

export interface Datos {
  dni: string;
  token: string;
  apellido: string;
  nombre: string;
  fecha_nac: string;
  activada: string;
  nac_pais: string;
  sexo: string;
  estado_civil: string;
  direccion_calle: string;
  direccion_nro: string;
  direccion_piso: string;
  direccion_depto: string;
  direccion_cod_post: string;
  direccion_localidad: string;
  direccion_provincia: string;
  direccion_completa: string;
  direccion_2: string;
  telefono: string;
  celular: string;
  email: string;
  cuil: string;
  banco: string;
  cod_banco: string;
  nro_banco_cuenta: string;
  banco_sucursal: string;
  cbu: string;
  ooss: string;
  url_os: string;
  sindicato: string;
  dia_pago: string;
  ganancias: string;
  sucNombre: string;
  sucDireccion: string;
  sucTelefono: string;
  sucCelular: string | null;
  sucEmail: string;
  sucLat: string;
  sucLong: string;
  talle_calzado: number;
  talle_pantalon: number;
  talle_remera: number;
  talle_faja: number;
  peso: string;
  altura: string;
  fecha_pos_baja: string;
  texto_ART: string;
  cod_convenio: number;
  cod_ooss: number;
  cod_ooss_orig: number;
  motivo_no_adelanto: string;
  vacuna1: string;
  vacuna2: string;
  vacuna3: string;
  contratos: Contrato[];
  ausencias: Ausencia[];
  pendientes: any[];
  talles: TalleCategoria[];
  mensajes: any[];
}

export interface Resultado {
  codigo: number;
  mensaje: string;
  datos: Datos;
}

export interface ApiResponse {
  resultado: Resultado;
}
