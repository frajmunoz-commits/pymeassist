/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Empresa {
  id: string;
  nombre: string;
  rut: string;
  rubro: string;
  telefonoWhatsapp: string;
  direccion: string;
  whatsappApiKey?: string;
  whatsappPhoneId?: string;
  whatsappVerifyToken?: string;
  creadoEn: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin_saas' | 'owner' | 'agente_humano';
  empresaId: string;
  creadoEn: string;
}

export interface Agente {
  id: string;
  nombre: string; // e.g. "Orquestador", "Vendedor", "Agendador", etc.
  rol: 'orquestador' | 'vendedor' | 'agendador' | 'pedidos' | 'soporte' | 'cobranza' | 'escalador';
  descripcion: string;
  activo: boolean;
  promptPersonalizado: string;
  temperatura: number;
  creadoEn: string;
}

export interface Cliente {
  id: string;
  empresaId: string;
  nombre: string;
  telefono: string; // e.g. "+56912345678"
  rut?: string;
  email?: string;
  direccionDespacho?: string;
  clasificacionRubro?: string;
  deudaPendiente: number; // For Agent de Cobranza (fiados)
  estado: 'contacto' | 'cliente_frecuente' | 'deudor' | 'escalado_humano';
  actualizadoEn: string;
}

export interface Conversacion {
  id: string;
  empresaId: string;
  clienteId: string;
  rutinaAgenteActiva: 'autonomo' | 'humano';
  ultimoAgenteEncargado: string; // e.g., "vendedor", "orquestador"
  sentimientoActual: 'positivo' | 'neutral' | 'frustrado';
  creadoEn: string;
  actualizadoEn: string;
}

export interface Mensaje {
  id: string;
  conversacionId: string;
  emisor: 'cliente' | 'agente_ia' | 'soporte_humano';
  remitenteNombre: string;
  contenido: string;
  agenteQueRespondio?: string; // e.g., "vendedor", "soporte", etc.
  metadatosRouting?: {
    intencionDetectada?: string;
    agenteAsignado?: string;
    confianzaClasificacion?: number;
    detallesVentas?: string;
    detallesAgenda?: string;
    detallesPedidos?: string;
  };
  creadoEn: string;
}

export interface Producto {
  id: string;
  empresaId: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  disponible: boolean;
  creadoEn: string;
}

export interface Pedido {
  id: string;
  empresaId: string;
  clienteId: string;
  detalles: string;
  total: number;
  estado: 'pendiente' | 'confirmado' | 'despachado' | 'cancelado';
  direccionDespacho: string;
  tiempoEstimadoMinutos: number;
  creadoEn: string;
}

export interface Reserva {
  id: string;
  empresaId: string;
  clienteId: string;
  servicioNombre: string;
  fechaHora: string;
  estado: 'programada' | 'confirmada' | 'reprogramada' | 'cancelada';
  creadoEn: string;
}

export interface PagoPendiente {
  id: string;
  empresaId: string;
  clienteId: string;
  monto: number;
  concepto: string;
  fechaVencimiento: string;
  estado: 'pendiente' | 'notificado' | 'pagado';
  creadoEn: string;
}

export interface LogSistema {
  id: string;
  empresaId: string;
  nivel: 'info' | 'warn' | 'error';
  origen: string; // "Webhook", "CrewAIOrchestrator", "GeminiAPI", "AgentSeller"
  mensaje: string;
  detalles?: string;
  creadoEn: string;
}

export interface MetricasDashboard {
  totalConversaciones: number;
  totalMensajes: number;
  totalSoporteIA: number;
  totalEscalados: number;
  pedidosTomados: number;
  ventasTotales: number;
  reservasAgendadas: number;
  cobrosEnviados: number;
  tiempoPromedioRespuestaSegs: number;
  sentimentRatio: {
    positivo: number;
    neutral: number;
    frustrado: number;
  };
}
