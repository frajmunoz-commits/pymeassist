/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Empresa, 
  Agente, 
  Producto, 
  Cliente, 
  Conversacion, 
  Mensaje, 
  Pedido, 
  Reserva, 
  PagoPendiente, 
  LogSistema, 
  MetricasDashboard 
} from './src/types.js';

dotenv.config();

// Resolve paths for ESM compatibility 
let directoryName = '';

try {
  directoryName = path.dirname(fileURLToPath(import.meta.url));
} catch {
  directoryName = __dirname;
}
// Lazy initialization of Google Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim() !== '') {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log('Google Gemini API client initialized successfully.');
    } else {
      console.log('Gemini API key not found or using default placeholder. Running in Simulation Mode.');
    }
  }
  return aiClient;
}

// Global simulated database state
let empresas: Empresa[] = [];
let agentes: { [empresaId: string]: Agente[] } = {};
let productos: { [empresaId: string]: Producto[] } = {};
let clientes: { [empresaId: string]: Cliente[] } = {};
let conversaciones: { [empresaId: string]: Conversacion[] } = {};
let mensajes: { [conversacionId: string]: Mensaje[] } = {};
let pedidos: { [empresaId: string]: Pedido[] } = {};
let reservas: { [empresaId: string]: Reserva[] } = {};
let pagosPendientes: { [empresaId: string]: PagoPendiente[] } = {};
let logsSistema: { [empresaId: string]: LogSistema[] } = {};
let metricas: { [empresaId: string]: MetricasDashboard } = {};

// Helper to push system logs
function addLog(empresaId: string, nivel: 'info' | 'warn' | 'error', origen: string, mensaje: string, detalles?: string) {
  if (!logsSistema[empresaId]) logsSistema[empresaId] = [];
  logsSistema[empresaId].unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    empresaId,
    nivel,
    origen,
    mensaje,
    detalles,
    creadoEn: new Date().toISOString()
  });
  // Keep last 150 logs
  if (logsSistema[empresaId].length > 150) {
    logsSistema[empresaId] = logsSistema[empresaId].slice(0, 150);
  }
}

// Initial seed data generator
function initDemoData() {
  // 1. Core Companies
  empresas = [
    {
      id: 'emp_caserito',
      nombre: 'Caserito Pan & Pastelería',
      rut: '76.849.201-K',
      rubro: 'Alimentos y Pastelería',
      telefonoWhatsapp: '+56 9 8472 9102',
      direccion: 'Av. Italia 1240, Providencia, Región Metropolitana',
      creadoEn: new Date().toISOString()
    },
    {
      id: 'emp_dentalcon',
      nombre: 'Clínica Dental San José',
      rut: '75.291.804-2',
      rubro: 'Salud y Ortodoncia',
      telefonoWhatsapp: '+56 9 7361 4829',
      direccion: 'Av. Libertador Bernardo O\'Higgins 405, Concepción',
      creadoEn: new Date().toISOString()
    },
    {
      id: 'emp_supertecno',
      nombre: 'Súper Tecno Chile',
      rut: '77.102.394-8',
      rubro: 'Tecnología y Accesorios',
      telefonoWhatsapp: '+56 9 9502 3810',
      direccion: 'San Diego 340, Local 12, Santiago Centro',
      creadoEn: new Date().toISOString()
    }
  ];

  empresas.forEach(emp => {
    const id = emp.id;
    
    // 2. Specialized Multi-Agents for each SME
    agentes[id] = [
      {
        id: `agt_orq_${id}`,
        nombre: 'Agente Orquestador',
        rol: 'orquestador',
        descripcion: 'Puerta de entrada de WhatsApp. Analiza la intención del cliente, detecta el contexto y deriva al agente especialista correspondiente.',
        activo: true,
        promptPersonalizado: 'Eres el Agente Orquestador de la empresa. Tu deber es leer el mensaje del cliente de WhatsApp y categorizar la intención. Debes asignar el mensaje a uno de los siguientes agentes según las reglas:\n' +
          '- vendedor: si el cliente pregunta por precios, stock, consulta por productos o servicios, o pide recomendaciones.\n' +
          '- agendador: si el cliente quiere reservar una cita, agendar hora, preguntar por disponibilidad horaria, o cancelar/reprogramar.\n' +
          '- pedidos: si el cliente quiere confirmar un pedido ya conversado, dar su dirección de despacho, pedir el total de la compra o consultar tiempos de entrega.\n' +
          '- soporte: si el cliente tiene dudas de horarios, la dirección física, métodos de pago, o políticas de cambios.\n' +
          '- cobranza: si el cliente pregunta sobre deudas pendientes, saldos por pagar o el sistema de fiados.\n' +
          '- escalador: si detectas irritación, enojo, insultos, o si pide hablar directamente con una persona de soporte humano.',
        temperatura: 0.1,
        creadoEn: new Date().toISOString()
      },
      {
        id: `agt_vend_${id}`,
        nombre: 'Agente Vendedor',
        rol: 'vendedor',
        descripcion: 'Responde consultas sobre catálogo, precios, stock y sugiere upselling o promociones vigentes con calidez chilena.',
        activo: true,
        promptPersonalizado: emp.rubro === 'Alimentos y Pastelería' 
          ? 'Eres el Agente Vendedor de Caserito Pan & Pastelería. Promociona nuestras ricas empanadas, hallullas, tortas y croissants. Atiende de manera sumamente cordial y cercana. Usa chilenismos amables si corresponde como "estimado", "al tiro". Proporciona precios exactos usando el catálogo e incentiva a comprar más sugiriendo un café o bebida adicional si compran un dulce.'
          : emp.rubro === 'Salud y Ortodoncia'
          ? 'Eres el Agente Vendedor de la Clínica Dental San José. Informa sobre nuestros servicios dentales disponibles como limpiezas, extracciones y ortodoncia. Explica la importancia de la salud dental manteniendo un tono profesional, empático y tranquilizador. No ofrezcas medicamentos de venta bajo receta.'
          : 'Eres el Agente Vendedor de Súper Tecno Chile. Promociona hardware de computación y periféricos gamer. Habla sobre la conveniencia, specs técnicas rápidas del catálogo y entrega siempre precios con IVA incluido.',
        temperatura: 0.5,
        creadoEn: new Date().toISOString()
      },
      {
        id: `agt_agent_${id}`,
        nombre: 'Agente Agendador',
        rol: 'agendador',
        descripcion: 'Gestiona la agenta de citas y reservas, valida disponibilidad, propone horarios alternativos y confirma reservas.',
        activo: true,
        promptPersonalizado: emp.rubro === 'Salud y Ortodoncia'
          ? 'Eres el Agente Agendador de la Clínica Dental San José. Administra las citas del sillón dental. Atiende cordialmente, pregunta qué día de la semana prefiere el cliente (mañana o tarde) y coordina una hora. Debes confirmar la reserva pidiendo el Nombre Completo y RUT.'
          : 'Eres el Agente Agendador. Ayuda a coordinar reservas y citas de servicios. Ofrece alternativas y consolida la reserva registrando el horario.',
        temperatura: 0.2,
        creadoEn: new Date().toISOString()
      },
      {
        id: `agt_ped_${id}`,
        nombre: 'Agente de Pedidos',
        rol: 'pedidos',
        descripcion: 'Encargado del flujo de checkout. Solicita la dirección de despacho, calcula el total del pedido con despacho a domicilio, estima los tiempos y genera el resumen final.',
        activo: true,
        promptPersonalizado: 'Eres el Agente de Pedidos. Consolida los productos que el cliente desea comprar. Solicita su dirección exacta de despacho dentro de Chile. Calcula el total, estima el tiempo de entrega (por ejemplo, 30 a 50 minutos para comida, o 24/48 horas para tecnología) y proporciona un resumen formateado para que el cliente confirme.',
        temperatura: 0.3,
        creadoEn: new Date().toISOString()
      },
      {
        id: `agt_sop_${id}`,
        nombre: 'Agente de Soporte',
        rol: 'soporte',
        descripcion: 'Resuelve preguntas frecuentes (FAQ) sobre el negocio: horarios de apertura, ubicación de tiendas físicas, métodos de pago y políticas.',
        activo: true,
        promptPersonalizado: `Eres el Agente de Soporte. Tu deber es responder dudas frecuentes. Información clave:\n- Dirección: ${emp.direccion}\n- Horario de Atención: Lunes a Sábado de 09:00 a 20:00 hrs. Domingos cerrado.\n- Métodos de Pago: Transferencia electrónica, débito/crédito vía Webpay o efectivo.\n- Cambios y devoluciones: Con boleta dentro de los primeros 10 días para alimentos o 3 meses para tecnología.`,
        temperatura: 0.2,
        creadoEn: new Date().toISOString()
      },
      {
        id: `agt_cob_${id}`,
        nombre: 'Agente de Cobranza',
        rol: 'cobranza',
        descripcion: 'Gestiona la cobranza de deudas pendientes o saldos agregados por "fiado". Mantiene un tono asertivo pero sumamente respetuoso.',
        activo: true,
        promptPersonalizado: 'Eres el Agente de Cobranza. Tu meta es recordar deudas vencidas de forma empática y formal. Explica los métodos de pago disponibles (Transferencia o efectivo). Brinda alzas de pago fáciles y mantén un tono de "ayuda al vecino" típico de los negocios chilenos de confianza.',
        temperatura: 0.3,
        creadoEn: new Date().toISOString()
      },
      {
        id: `agt_esc_${id}`,
        nombre: 'Agente Escalador',
        rol: 'escalador',
        descripcion: 'Detector de enojo y complejidad extrema. Pasa la llamada al modo humano de inmediato y calma al cliente en el intertanto.',
        activo: true,
        promptPersonalizado: 'Eres el Agente Escalador de Emergencia. El cliente muestra enojo, insatisfacción, frustración o ha solicitado explícitamente ser atendido por un humano. Tu única misión es pedir disculpas sinceras, asegurarle que el dueño o un operador del local está tomando control de la conversación de forma inmediata, y pedirle un momento mientras lo transferimos.',
        temperatura: 0.1,
        creadoEn: new Date().toISOString()
      }
    ];

    // 3. Realistic Catalog/Products for each rubro
    if (id === 'emp_caserito') {
      productos[id] = [
        { id: `prod_1_${id}`, empresaId: id, nombre: 'Empanada de Pino de Horno', descripcion: 'Rica empanada chilena tradicional de horno, carne picada, cebolla, aceituna y trozo de huevo.', precio: 2500, stock: 40, categoria: 'Empanadas', disponible: true, creadoEn: new Date().toISOString() },
        { id: `prod_2_${id}`, empresaId: id, nombre: 'Empanada Queso Frita', descripcion: 'Empanada frita al minuto, rellena con queso gauda fundido abundante.', precio: 2200, stock: 30, categoria: 'Empanadas', disponible: true, creadoEn: new Date().toISOString() },
        { id: `prod_3_${id}`, empresaId: id, nombre: 'Hallulla Especial (1 kg)', descripcion: 'Pan hallulla tradicional de panadería tierna y crujiente recién salida del horno.', precio: 1900, stock: 50, categoria: 'Panadería', disponible: true, creadoEn: new Date().toISOString() },
        { id: `prod_4_${id}`, empresaId: id, nombre: 'Marraqueta Crujiente (1 kg)', descripcion: 'Pan batido o marraqueta baja en grasa con excelente crujencia.', precio: 1950, stock: 45, categoria: 'Panadería', disponible: true, creadoEn: new Date().toISOString() },
        { id: `prod_5_${id}`, empresaId: id, nombre: 'Torta Tres Leches (10 Pers)', descripcion: 'Esponjoso bizcocho remojado en tres tipos de leche con dulce de leche y merengue tostado.', precio: 15990, stock: 8, categoria: 'Pastelería', disponible: true, creadoEn: new Date().toISOString() },
        { id: `prod_6_${id}`, empresaId: id, nombre: 'Croissant Premium Chocolate', descripcion: 'Masa de hojaldre 100% mantequilla rellena con bastones de chocolate belga.', precio: 1800, stock: 15, categoria: 'Bollería', disponible: true, creadoEn: new Date().toISOString() }
      ];
    } else if (id === 'emp_dentalcon') {
      productos[id] = [
        { id: `prod_1_${id}`, empresaId: id, nombre: 'Limpieza Dental Ultrasonido + Pulido', descripcion: 'Tratamiento clínico completo para remover sarro y manchas superficiales. Incluye aplicación de flúor.', precio: 34990, stock: 99, categoria: 'Cuidado General', disponible: true, creadoEn: new Date().toISOString() },
        { id: `prod_2_${id}`, empresaId: id, nombre: 'Consulta de Diagnóstico General + Radiografía', descripcion: 'Evaluación inicial completa por cirujano dentista. Incluye radiografía de mordida y plan de tratamiento.', precio: 14990, stock: 99, categoria: 'Cuidado General', disponible: true, creadoEn: new Date().toISOString() },
        { id: `prod_3_${id}`, empresaId: id, nombre: 'Blanqueamiento Dental LED', descripcion: 'Blanqueamiento clínico en una sesión con luz LED aceleradora de peróxido. Aclara hasta 4 tonos.', precio: 79990, stock: 99, categoria: 'Estética', disponible: true, creadoEn: new Date().toISOString() },
        { id: `prod_4_${id}`, empresaId: id, nombre: 'Extracción Dental Simple', descripcion: 'Procedimiento quirúrgico ambulatorio bajo anestesia local de piezas dañadas.', precio: 24990, stock: 99, categoria: 'Cirugía', disponible: true, creadoEn: new Date().toISOString() }
      ];
    } else {
      productos[id] = [
        { id: `prod_1_${id}`, empresaId: id, nombre: 'Teclado Mecánico RGB Switch Red', descripcion: 'Teclado formato compact 60%, switches mecánicos lineales rojos de alta velocidad, ideal para gaming.', precio: 44990, stock: 12, categoria: 'Accesorios Gamers', disponible: true, creadoEn: new Date().toISOString() },
        { id: `prod_2_${id}`, empresaId: id, nombre: 'Mouse Gamer Pro 16.000 DPI', descripcion: 'Mouse óptico ultra liviano con sensor de alta precisión, botones configurables y cable trenzado.', precio: 27990, stock: 18, categoria: 'Accesorios Gamers', disponible: true, creadoEn: new Date().toISOString() },
        { id: `prod_3_${id}`, empresaId: id, nombre: 'Auriculares Hyper Audio Surround 7.1', descripcion: 'Audífonos circumaurales inalámbricos, cancelación pasiva de ruido y micrófono omnidireccional desmontable.', precio: 59990, stock: 10, categoria: 'Audio', disponible: true, creadoEn: new Date().toISOString() },
        { id: `prod_4_${id}`, empresaId: id, nombre: 'Monitor Curvo Gamer 24 pulgadas 144Hz', descripcion: 'Monitor resolución Full HD, tasa de refresco 144 Hz, 1ms de tiempo de respuesta.', precio: 129990, stock: 5, categoria: 'Monitores', disponible: true, creadoEn: new Date().toISOString() }
      ];
    }

    // 4. Sample Customers
    clientes[id] = [
      { id: `cli_1_${id}`, empresaId: id, nombre: 'Juan Ignacio Pérez', telefono: '+56981234567', rut: '18.492.012-4', email: 'juan.perez@gmail.com', direccionDespacho: 'Avenida Pocuro 1920, Providencia', deudaPendiente: 0, estado: 'cliente_frecuente', actualizadoEn: new Date().toISOString() },
      { id: `cli_2_${id}`, empresaId: id, nombre: 'María José Troncoso', telefono: '+56972345678', rut: '16.102.394-5', email: 'mj.troncoso@outlook.cl', direccionDespacho: 'Santiago Bueras 80, Santiago Centro', deudaPendiente: emp.rubro === 'Alimentos y Pastelería' ? 4500 : 0, estado: emp.rubro === 'Alimentos y Pastelería' ? 'deudor' : 'contacto', actualizadoEn: new Date().toISOString() },
      { id: `cli_3_${id}`, empresaId: id, nombre: 'Pedro Pablo Donoso', telefono: '+56993456789', rut: '15.908.432-8', email: 'p.donoso@vtr.net', direccionDespacho: 'El Rodeo 13420, Lo Barnechea', deudaPendiente: 0, estado: 'contacto', actualizadoEn: new Date().toISOString() },
      { id: `cli_4_${id}`, empresaId: id, nombre: 'Constanza Silva', telefono: '+56964567890', rut: '19.384.092-2', email: 'conny.silva@icloud.com', direccionDespacho: 'Lincoyán 451, Concepción', deudaPendiente: 0, estado: 'escalado_humano', actualizadoEn: new Date().toISOString() }
    ];

    // 5. Converstions and Initial Message state
    conversaciones[id] = [
      {
        id: `conv_1_${id}`,
        empresaId: id,
        clienteId: `cli_1_${id}`,
        rutinaAgenteActiva: 'autonomo',
        ultimoAgenteEncargado: 'vendedor',
        sentimientoActual: 'positivo',
        creadoEn: new Date(Date.now() - 3600000 * 5).toISOString(),
        actualizadoEn: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: `conv_2_${id}`,
        empresaId: id,
        clienteId: `cli_2_${id}`,
        rutinaAgenteActiva: 'autonomo',
        ultimoAgenteEncargado: 'cobranza',
        sentimientoActual: 'neutral',
        creadoEn: new Date(Date.now() - 3600000 * 24).toISOString(),
        actualizadoEn: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: `conv_4_${id}`,
        empresaId: id,
        clienteId: `cli_4_${id}`,
        rutinaAgenteActiva: 'humano',
        ultimoAgenteEncargado: 'escalador',
        sentimientoActual: 'frustrado',
        creadoEn: new Date(Date.now() - 3600000 * 2).toISOString(),
        actualizadoEn: new Date(Date.now() - 1200000).toISOString()
      }
    ];

    // Conversations Messages
    mensajes[`conv_1_${id}`] = [
      { id: `msg_1_${id}`, conversacionId: `conv_1_${id}`, emisor: 'cliente', remitenteNombre: 'Juan Ignacio Pérez', contenido: 'Hola buenas tardes, ¿tienen stock para hoy de empanadas de pino de horno?', creadoEn: new Date(Date.now() - 3600000 * 5).toISOString() },
      { id: `msg_2_${id}`, conversacionId: `conv_1_${id}`, emisor: 'agente_ia', remitenteNombre: 'Agente Vendedor', contenido: '¡Hola Juan Ignacio! ¡Sí, por supuesto! Nos quedan empanadas de pino calentitas saliendo recién del horno a $2.500 cada una. ¿Cuántas te gustaría coordinar para hoy, estimado?', agenteQueRespondio: 'vendedor', creadoEn: new Date(Date.now() - 3600000 * 4.9).toISOString() },
      { id: `msg_3_${id}`, conversacionId: `conv_1_${id}`, emisor: 'cliente', remitenteNombre: 'Juan Ignacio Pérez', contenido: 'Excelente, quiero pedir unas 4 para despacho por favor.', creadoEn: new Date(Date.now() - 3600000).toISOString() }
    ];

    mensajes[`conv_2_${id}`] = [
      { id: `msg_4_${id}`, conversacionId: `conv_2_${id}`, emisor: 'agente_ia', remitenteNombre: 'Agente de Cobranza', contenido: 'Hola María José, espero que esté muy bien. Le escribo para recordarle amablemente que tiene un saldo vencido de $4.500 correspondiente a las hallullas de la semana pasada. ¿Le acomoda transferir hoy o pasar por el local a pagar?', agenteQueRespondio: 'cobranza', creadoEn: new Date(Date.now() - 3600000 * 24).toISOString() },
      { id: `msg_5_${id}`, conversacionId: `conv_2_${id}`, emisor: 'cliente', remitenteNombre: 'María José Troncoso', contenido: 'Hola, sí, me había olvidado. ¿Me pueden mandar sus datos de transferencia?', creadoEn: new Date(Date.now() - 3600000 * 2).toISOString() }
    ];

    mensajes[`conv_4_${id}`] = [
      { id: `msg_8_${id}`, conversacionId: `conv_4_${id}`, emisor: 'cliente', remitenteNombre: 'Constanza Silva', contenido: 'Oye, el pedido llegó súper tarde y las empanadas están totalmente heladas. ¡Exijo una respuesta de inmediato o los voy a funar en Instagram!', creadoEn: new Date(Date.now() - 3600000 * 2).toISOString() },
      { id: `msg_9_${id}`, conversacionId: `conv_4_${id}`, emisor: 'agente_ia', remitenteNombre: 'Agente de Escalación', contenido: '¡Hola Constanza! Lamento muchísimo escuchar esto, entiendo perfectamente tu frustración y no es el servicio que mereces. He transferido este chat de inmediato al dueño del local, quien te contactará personalmente en un minuto para compensarte y resolverlo de inmediato.', agenteQueRespondio: 'escalador', creadoEn: new Date(Date.now() - 3600000 * 1.9).toISOString() },
      { id: `msg_10_${id}`, conversacionId: `conv_4_${id}`, emisor: 'cliente', remitenteNombre: 'Constanza Silva', contenido: 'Ya pues, apúrense que no tengo todo el día.', creadoEn: new Date(Date.now() - 1200000).toISOString() }
    ];

    // 6. Orders
    pedidos[id] = [
      { id: `ped_1_${id}`, empresaId: id, clienteId: `cli_1_${id}`, detalles: '4x Empanada de Pino de Horno', total: 10000, estado: 'pendiente', direccionDespacho: 'Avenida Pocuro 1920, Providencia', tiempoEstimadoMinutos: 40, creadoEn: new Date().toISOString() }
    ];

    // 7. Bookings
    reservas[id] = [
      { id: `res_1_${id}`, empresaId: id, clienteId: `cli_3_${id}`, servicioNombre: emp.rubro === 'Salud y Ortodoncia' ? 'Limpieza Dental Ultrasonido' : 'Reserva Mesa Evento Especial', fechaHora: new Date(Date.now() + 3600000 * 48).toISOString(), estado: 'programada', creadoEn: new Date().toISOString() }
    ];

    // 8. Pending Payments
    pagosPendientes[id] = [
      { id: `pag_1_${id}`, empresaId: id, clienteId: `cli_2_${id}`, monto: 4500, concepto: 'Saldo compras del 19-05-2026', fechaVencimiento: new Date(Date.now() - 3600000 * 48).toISOString(), estado: 'pendiente', creadoEn: new Date(Date.now() - 3600000 * 120).toISOString() }
    ];

    // 9. Initial KPI Metrics
    metricas[id] = {
      totalConversaciones: id === 'emp_caserito' ? 42 : id === 'emp_dentalcon' ? 28 : 19,
      totalMensajes: id === 'emp_caserito' ? 183 : id === 'emp_dentalcon' ? 120 : 79,
      totalSoporteIA: id === 'emp_caserito' ? 168 : id === 'emp_dentalcon' ? 112 : 75,
      totalEscalados: id === 'emp_caserito' ? 3 : id === 'emp_dentalcon' ? 1 : 0,
      pedidosTomados: id === 'emp_caserito' ? 15 : id === 'emp_dentalcon' ? 0 : 8,
      ventasTotales: id === 'emp_caserito' ? 184500 : id === 'emp_dentalcon' ? 0 : 340000,
      reservasAgendadas: id === 'emp_caserito' ? 1 : id === 'emp_dentalcon' ? 14 : 0,
      cobrosEnviados: id === 'emp_caserito' ? 5 : id === 'emp_dentalcon' ? 0 : 0,
      tiempoPromedioRespuestaSegs: 8,
      sentimentRatio: {
        positivo: 72,
        neutral: 20,
        frustrado: 8
      }
    };

    // System Logs
    logsSistema[id] = [];
    addLog(id, 'info', 'Sistema', 'Sistema multi-agente PymeAssist inicializado.');
    addLog(id, 'info', 'WhatsApp Webhook', 'Conexión simulada activa con WhatsApp Business API.');
    addLog(id, 'info', 'Gemini API', 'Configuración de modelos Gemini lista (gemini-3.5-flash).');
  });
}

// Populate database on boot
initDemoData();

const app = express();
app.use(express.json());

// --- REST ENDPOINTS (SaaS ADMIN) ---

// 1. Get all companies
app.get('/api/empresas', (req, res) => {
  res.json(empresas);
});

// Create new company
app.post('/api/empresas', (req, res) => {
  const { nombre, rut, rubro, telefonoWhatsapp, direccion } = req.body;
  if (!nombre || !rubro) {
    return res.status(400).json({ error: 'Nombre y rubro son obligatorios.' });
  }
  const newId = `emp_${nombre.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36).substr(2, 4)}`;
  const newEmp: Empresa = {
    id: newId,
    nombre,
    rut: rut || '76.000.000-1',
    rubro,
    telefonoWhatsapp: telefonoWhatsapp || '+56 9 1234 5678',
    direccion: direccion || 'Santiago, Chile',
    creadoEn: new Date().toISOString()
  };

  empresas.push(newEmp);

  // Default Agents for the new company
  agentes[newId] = [
    {
      id: `agt_orq_${newId}`,
      nombre: 'Agente Orquestador',
      rol: 'orquestador',
      descripcion: 'Puerta de entrada de WhatsApp. Clasifica intenciones.',
      activo: true,
      promptPersonalizado: 'Eres el Agente Orquestador. Clasifica la intención del cliente en vendedor, agendador, pedidos, soporte, cobranza, o escalador.',
      temperatura: 0.1,
      creadoEn: new Date().toISOString()
    },
    {
      id: `agt_vend_${newId}`,
      nombre: 'Agente Vendedor',
      rol: 'vendedor',
      descripcion: 'Atención e información de productos.',
      activo: true,
      promptPersonalizado: 'Eres el Agente Vendedor. Atiende las dudas con un tono empático y cercano.',
      temperatura: 0.5,
      creadoEn: new Date().toISOString()
    },
    {
      id: `agt_agent_${newId}`,
      nombre: 'Agente Agendador',
      rol: 'agendador',
      descripcion: 'Gestiona citas.',
      activo: true,
      promptPersonalizado: 'Eres el Agente Agendador. Ayuda a programar horarios.',
      temperatura: 0.2,
      creadoEn: new Date().toISOString()
    },
    {
      id: `agt_ped_${newId}`,
      nombre: 'Agente de Pedidos',
      rol: 'pedidos',
      descripcion: 'Checkout y delivery.',
      activo: true,
      promptPersonalizado: 'Eres el Agente de Pedidos. Confirma compras y direcciones.',
      temperatura: 0.3,
      creadoEn: new Date().toISOString()
    },
    {
      id: `agt_sop_${newId}`,
      nombre: 'Agente de Soporte',
      rol: 'soporte',
      descripcion: 'Responde horarios y ubicación.',
      activo: true,
      promptPersonalizado: `Eres el Agente de Soporte. Atiende consultas generales de ${nombre}.`,
      temperatura: 0.2,
      creadoEn: new Date().toISOString()
    },
    {
      id: `agt_cob_${newId}`,
      nombre: 'Agente de Cobranza',
      rol: 'cobranza',
      descripcion: 'Cobro respetuoso de fiados.',
      activo: true,
      promptPersonalizado: 'Eres el Agente de Cobranza. Haz recordatorios amables de pago.',
      temperatura: 0.3,
      creadoEn: new Date().toISOString()
    },
    {
      id: `agt_esc_${newId}`,
      nombre: 'Agente Escalador',
      rol: 'escalador',
      descripcion: 'Alerta paso a humano por frustración.',
      activo: true,
      promptPersonalizado: 'Eres el Agente Escalador. Pide disculpas y calma al cliente antes del traspaso.',
      temperatura: 0.1,
      creadoEn: new Date().toISOString()
    }
  ];

  // Seed standard catalogs, clients, metrics, logs
  productos[newId] = [
    { id: `prod_1_${newId}`, empresaId: newId, nombre: 'Servicio Básico', descripcion: 'Nuestro servicio estándar estrella.', precio: 10000, stock: 100, categoria: 'General', disponible: true, creadoEn: new Date().toISOString() }
  ];
  clientes[newId] = [
    { id: `cli_1_${newId}`, empresaId: newId, nombre: 'Cliente de Prueba', telefono: '+56900000000', rut: '11.111.111-1', email: 'prueba@test.cl', direccionDespacho: 'Alameda 123, Santiago', deudaPendiente: 0, estado: 'contacto', actualizadoEn: new Date().toISOString() }
  ];
  conversaciones[newId] = [];
  pedidos[newId] = [];
  reservas[newId] = [];
  pagosPendientes[newId] = [];
  logsSistema[newId] = [];
  
  metricas[newId] = {
    totalConversaciones: 0,
    totalMensajes: 0,
    totalSoporteIA: 0,
    totalEscalados: 0,
    pedidosTomados: 0,
    ventasTotales: 0,
    reservasAgendadas: 0,
    cobrosEnviados: 0,
    tiempoPromedioRespuestaSegs: 0,
    sentimentRatio: { positivo: 100, neutral: 0, frustrado: 0 }
  };

  addLog(newId, 'info', 'Sistema', `Empresa creada: ${nombre}`);
  res.json(newEmp);
});

// 2. Clear & reset all database slice to default demo seed data
app.post('/api/init-demo-data', (req, res) => {
  initDemoData();
  res.json({ status: 'success', message: 'Base de datos demo de PymeAssist restablecida con datos seed chilenos.' });
});

// 3. Get total states of a specific company (for multiempresa workspace)
app.get('/api/empresas/:id/state', (req, res) => {
  const empId = req.params.id;
  const company = empresas.find(e => e.id === empId);
  if (!company) {
    return res.status(404).json({ error: 'Empresa no encontrada' });
  }

  res.json({
    empresa: company,
    agentes: agentes[empId] || [],
    productos: productos[empId] || [],
    clientes: clientes[empId] || [],
    conversaciones: conversaciones[empId] || [],
    pedidos: pedidos[empId] || [],
    reservas: reservas[empId] || [],
    pagosPendientes: pagosPendientes[empId] || [],
    logs: logsSistema[empId] || [],
    metricas: metricas[empId] || {
      totalConversaciones: 0,
      totalMensajes: 0,
      totalSoporteIA: 0,
      totalEscalados: 0,
      pedidosTomados: 0,
      ventasTotales: 0,
      reservasAgendadas: 0,
      cobrosEnviados: 0,
      tiempoPromedioRespuestaSegs: 0,
      sentimentRatio: { positivo: 100, neutral: 0, frustrado: 0 }
    }
  });
});

// 4. CRUD products for a specific company
app.post('/api/empresas/:id/productos', (req, res) => {
  const empId = req.params.id;
  const { id, nombre, descripcion, precio, stock, categoria, disponible } = req.body;
  if (!nombre || precio === undefined) {
    return res.status(400).json({ error: 'Nombre y precio son obligatorios.' });
  }

  if (!productos[empId]) productos[empId] = [];

  if (id) {
    // Edit existing product
    const idx = productos[empId].findIndex(p => p.id === id);
    if (idx !== -1) {
      productos[empId][idx] = {
        ...productos[empId][idx],
        nombre,
        descripcion: descripcion || '',
        precio: Number(precio),
        stock: Number(stock !== undefined ? stock : productos[empId][idx].stock),
        categoria: categoria || 'General',
        disponible: disponible !== undefined ? disponible : true
      };
      addLog(empId, 'info', 'Configuración', `Producto editado: ${nombre}`);
      return res.json(productos[empId][idx]);
    }
    return res.status(404).json({ error: 'Producto no encontrado para editar.' });
  } else {
    // Create new product
    const newProd: Producto = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      empresaId: empId,
      nombre,
      descripcion: descripcion || '',
      precio: Number(precio),
      stock: Number(stock !== undefined ? stock : 50),
      categoria: categoria || 'General',
      disponible: disponible !== undefined ? disponible : true,
      creadoEn: new Date().toISOString()
    };
    productos[empId].push(newProd);
    addLog(empId, 'info', 'Configuración', `Producto agregado al catálogo: ${nombre}`);
    return res.json(newProd);
  }
});

app.delete('/api/empresas/:id/productos/:prodId', (req, res) => {
  const { id, prodId } = req.params;
  if (!productos[id]) {
    return res.status(404).json({ error: 'Empresa no tiene productos.' });
  }
  const prod = productos[id].find(p => p.id === prodId);
  if (prod) {
    productos[id] = productos[id].filter(p => p.id !== prodId);
    addLog(id, 'warn', 'Configuración', `Producto eliminado del catálogo: ${prod.nombre}`);
    return res.json({ success: true });
  }
  res.status(404).json({ error: 'Producto no encontrado.' });
});

// 5. Update agent prompt or toggle status
app.post('/api/empresas/:id/agentes/:agenteId', (req, res) => {
  const { id, agenteId } = req.params;
  const { activo, promptPersonalizado, temperatura } = req.body;

  if (!agentes[id]) {
    return res.status(404).json({ error: 'Empresa no tiene agentes configurados.' });
  }

  const agentIdx = agentes[id].findIndex(a => a.id === agenteId);
  if (agentIdx !== -1) {
    const updated = {
      ...agentes[id][agentIdx],
      activo: activo !== undefined ? activo : agentes[id][agentIdx].activo,
      promptPersonalizado: promptPersonalizado !== undefined ? promptPersonalizado : agentes[id][agentIdx].promptPersonalizado,
      temperatura: temperatura !== undefined ? Number(temperatura) : agentes[id][agentIdx].temperatura
    };
    agentes[id][agentIdx] = updated;
    addLog(id, 'info', 'Agentes Config', `Configurar Agente ${updated.nombre}: Status=${updated.activo ? 'Activado' : 'Desactivado'}, Temp=${updated.temperatura}`);
    return res.json(updated);
  }

  res.status(404).json({ error: 'Agente no encontrado.' });
});

// 6. Manual agent override (SOPORTE HUMANO)
app.post('/api/conversaciones/:id/rutina', (req, res) => {
  const convId = req.params.id;
  const { rutinaAgenteActiva, empresaId } = req.body; // 'autonomo' or 'humano'

  if (!empresaId) return res.status(400).json({ error: 'empresaId es requerido.' });

  const conv = conversaciones[empresaId]?.find(c => c.id === convId);
  if (conv) {
    conv.rutinaAgenteActiva = rutinaAgenteActiva;
    conv.actualizadoEn = new Date().toISOString();
    
    const client = clientes[empresaId]?.find(cl => cl.id === conv.clienteId);
    if (client && rutinaAgenteActiva === 'humano') {
      client.estado = 'escalado_humano';
    } else if (client && client.estado === 'escalado_humano') {
      client.estado = 'cliente_frecuente';
    }

    addLog(empresaId, rutinaAgenteActiva === 'humano' ? 'warn' : 'info', 'Operador Humano', 
      `Conversación de ${client?.nombre || 'Cliente'} configurada en modo ${rutinaAgenteActiva === 'humano' ? 'Asistencia Humana (Agente Pausada)' : 'Autónomo (IA Activa)'}`);
    
    return res.json({ success: true, conversacion: conv });
  }
  res.status(404).json({ error: 'Conversación no encontrada.' });
});

// 7. Human responds manual message
app.post('/api/conversaciones/:id/responder', (req, res) => {
  const convId = req.params.id;
  const { contenido, empresaId, operadorNombre } = req.body;

  if (!contenido || !empresaId) {
    return res.status(400).json({ error: 'Contenido y empresaId son obligatorios.' });
  }

  const conv = conversaciones[empresaId]?.find(c => c.id === convId);
  if (!conv) {
    return res.status(404).json({ error: 'Conversación no encontrada.' });
  }

  const newMsg: Mensaje = {
    id: `msg_human_${Date.now()}`,
    conversacionId: convId,
    emisor: 'soporte_humano',
    remitenteNombre: operadorNombre || 'Socio Negocio (Soporte Real)',
    contenido,
    creadoEn: new Date().toISOString()
  };

  if (!mensajes[convId]) mensajes[convId] = [];
  mensajes[convId].push(newMsg);

  conv.actualizadoEn = new Date().toISOString();
  conv.ultimoAgenteEncargado = 'humano';

  // If debt/payment or bookings are mentioned, humans can resolve them easily too, but we keep it logged
  addLog(empresaId, 'info', 'Operador Humano', `Respuesta enviada de forma manual por WhatsApp a Cliente ID ${conv.clienteId}: "${contenido.substring(0, 30)}..."`);

  res.json({ success: true, mensaje: newMsg });
});

// 7.5. Read conversation messages
app.get('/api/conversaciones/:id/mensajes', (req, res) => {
  const convId = req.params.id;
  const list = mensajes[convId] || [];
  res.json(list);
});


// --- REAL GEMINI MULTI-AGENT ORCHESTRATION & SIMULATOR WEBHOOK ---

// Helper function to extract sentiment with simple heuristic or Gemini
async function analyzeSentiment(text: string, empresaId: string): Promise<'positivo' | 'neutral' | 'frustrado'> {
  const lower = text.toLowerCase();
  
  // Quick heuristic regexes
  if (lower.includes('estafa') || lower.includes('funar') || lower.includes('pesimo') || lower.includes('malo') || lower.includes('tarde') || lower.includes('horror') || lower.includes('enojado') || lower.includes('reclamo') || lower.includes('reclamar') || lower.includes('demasiado') || lower.includes('malisimo') || lower.includes('culia') || lower.includes('concha') || lower.includes('weon') || lower.includes('ladr')) {
    return 'frustrado';
  }
  if (lower.includes('gracias') || lower.includes('excelente') || lower.includes('buenisimo') || lower.includes('vale') || lower.includes('bacán') || lower.includes('bacan') || lower.includes('genial') || lower.includes('👍') || lower.includes('super b') || lower.includes('súper b')) {
    return 'positivo';
  }

  // Use Gemini if available
  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `Analiza el sentimiento del siguiente mensaje de un cliente de WhatsApp en Chile. Responde ÚNICAMENTE con una sola palabra en minúsculas: "positivo", "neutral" o "frustrado".\n\nMensaje: "${text}"`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt
      });
      const resText = response.text?.trim().toLowerCase() || 'neutral';
      if (resText.includes('positivo') || resText.trim() === 'positivo') return 'positivo';
      if (resText.includes('frustrado') || resText.includes('negativo') || resText.trim() === 'frustrado') return 'frustrado';
      return 'neutral';
    } catch (e) {
      console.error('Sentiment Gemini Analysis Error:', e);
    }
  }

  return 'neutral';
}

// 8. SIMULATOR WHATSAPP ENDPOINT
app.post('/api/whatsapp/simulate', async (req, res) => {
  const { empresaId, telefonoCliente, clienteNombre, mensajeTexto } = req.body;

  if (!empresaId || !telefonoCliente || !mensajeTexto) {
    return res.status(400).json({ error: 'Faltan parámetros empresaId, telefonoCliente o mensajeTexto.' });
  }

  const currentEmpresa = empresas.find(e => e.id === empresaId);
  if (!currentEmpresa) {
    return res.status(404).json({ error: 'Empresa no encontrada.' });
  }

  // Initialize storage keys if missing (safety check)
  if (!conversaciones[empresaId]) conversaciones[empresaId] = [];
  if (!clientes[empresaId]) clientes[empresaId] = [];
  if (!productos[empresaId]) productos[empresaId] = [];
  if (!pedidos[empresaId]) pedidos[empresaId] = [];
  if (!reservas[empresaId]) reservas[empresaId] = [];
  if (!pagosPendientes[empresaId]) pagosPendientes[empresaId] = [];
  if (!metricas[empresaId]) {
    metricas[empresaId] = {
      totalConversaciones: 0,
      totalMensajes: 0,
      totalSoporteIA: 0,
      totalEscalados: 0,
      pedidosTomados: 0,
      ventasTotales: 0,
      reservasAgendadas: 0,
      cobrosEnviados: 0,
      tiempoPromedioRespuestaSegs: 8,
      sentimentRatio: { positivo: 70, neutral: 20, frustrado: 10 }
    };
  }

  // 1. Find or create Client
  let client = clientes[empresaId].find(c => c.telefono === telefonoCliente);
  if (!client) {
    const defaultRuts = ['19.845.012-9', '17.382.102-3', '20.301.992-K', '15.904.382-3'];
    const assignedRut = defaultRuts[Math.floor(Math.random() * defaultRuts.length)];
    client = {
      id: `cli_${Date.now()}`,
      empresaId,
      nombre: clienteNombre || 'Cliente WhatsApp',
      telefono: telefonoCliente,
      rut: assignedRut,
      email: `${(clienteNombre || 'cliente').toLowerCase().replace(/\s+/g, '')}@example.com`,
      direccionDespacho: 'Avenida Providencia 2300, Providencia',
      deudaPendiente: 0,
      estado: 'contacto',
      actualizadoEn: new Date().toISOString()
    };
    clientes[empresaId].push(client);
    addLog(empresaId, 'info', 'Base de Datos', `Nuevo cliente creado vía WhatsApp: ${client.nombre} (${client.telefono})`);
  } else if (clienteNombre && client.nombre === 'Cliente WhatsApp') {
    client.nombre = clienteNombre;
  }

  // 2. Find or create Conversation
  let conversation = conversaciones[empresaId].find(c => c.clienteId === client!.id);
  let isNewConversation = false;
  if (!conversation) {
    isNewConversation = true;
    conversation = {
      id: `conv_${Date.now()}`,
      empresaId,
      clienteId: client.id,
      rutinaAgenteActiva: 'autonomo',
      ultimoAgenteEncargado: 'orquestador',
      sentimientoActual: 'neutral',
      creadoEn: new Date().toISOString(),
      actualizadoEn: new Date().toISOString()
    };
    conversaciones[empresaId].unshift(conversation);
  }

  // 3. Save User Message
  const userMsg: Mensaje = {
    id: `msg_user_${Date.now()}`,
    conversacionId: conversation.id,
    emisor: 'cliente',
    remitenteNombre: client.nombre,
    contenido: mensajeTexto,
    creadoEn: new Date().toISOString()
  };
  if (!mensajes[conversation.id]) mensajes[conversation.id] = [];
  mensajes[conversation.id].push(userMsg);

  // Update Sentiment
  const sentimientoInput = await analyzeSentiment(mensajeTexto, empresaId);
  conversation.sentimientoActual = sentimientoInput;
  conversation.actualizadoEn = new Date().toISOString();

  // If in MANUAL mode ('humano'), stop multi-agent automated response! 
  if (conversation.rutinaAgenteActiva === 'humano') {
    addLog(empresaId, 'warn', 'Orquestador IA', `Mensaje de ${client.nombre} recibido, pero la conversación está en MODO MANUAL. No se gatilló respuesta automatizada.`);
    
    // Update simple metrics
    metricas[empresaId].totalMensajes += 1;
    if (isNewConversation) metricas[empresaId].totalConversaciones += 1;

    return res.json({
      success: true,
      mode: 'manual',
      mensajeUsuario: userMsg,
      replyMessage: null,
      routingResult: {
        intencionDetectada: 'Intervención Manual',
        agenteAsignado: 'humano',
        confianzaClasificacion: 1,
        detallesClasificacion: 'El chat está silenciado para agentes IA porque un humano tomó control.'
      }
    });
  }

  // --- MULTI-AGENT WORKFLOW ---
  addLog(empresaId, 'info', 'Orquestador IA', `Recibido mensaje WhatsApp de ${client.nombre}: "${mensajeTexto.substring(0, 45)}...". Analizando intención.`);
  
  // Get active agents configurations
  const activeCompanyAgents = agentes[empresaId] || [];
  const orqAgentObj = activeCompanyAgents.find(a => a.rol === 'orquestador');

  // Let's set some routing defaults
  let intencionDetectada = 'Pregunta General';
  let agenteAsignado: 'vendedor' | 'agendador' | 'pedidos' | 'soporte' | 'cobranza' | 'escalador' = 'soporte';
  let confianzaClasificacion = 0.9;
  let detallesClasificacion = 'Simulación lógica local';

  // Get active product list catalogue for dynamic text insertion
  const catalogList = productos[empresaId] || [];
  const catalogContextMsg = catalogList.map(p => `- ${p.nombre}: $${p.precio} (Stock: ${p.stock}, ${p.categoria})`).join('\n');

  // 1. CALL GEMINI FOR CLASSIFICATION (ORCHESTRATION AGENT)
  const ai = getGeminiClient();
  if (ai) {
    try {
      const orqPrompt = `${orqAgentObj?.promptPersonalizado || 'Eres un clasificador inteligente.'}

Reglas específicas:
- vendedor: si pregunta por productos, precios, stock o cotiza cosas del catálogo.
- agendador: si quiere agendar cita, agendar hora, cancelar, reprogramar fecha, hora o turnos.
- pedidos: si quiere comprar directamente, dar dirección de despacho de su envío, pedir total o tiempo estimado.
- soporte: dirección comercial, horarios, métodos de pago, o preguntas sobre el negocio de soporte general.
- cobranza: deudas, fiados, pagos vencidos.
- escalador: si expresa enojo marcado, usa garabatos o insultos, reclama enfadado o exige un humano.

Responde obligatoriamente en formato JSON válido con el siguiente schema:
{
  "intencionDetectada": "breve explicación de lo que busca el cliente (ej: agendar hora dentista)",
  "agenteAsignado": "vendedor" | "agendador" | "pedidos" | "soporte" | "cobranza" | "escalador",
  "confianzaClasificacion": un número decimal de 0 a 1 indicando certeza,
  "detallesClasificacion": "breve descripción de por qué se derivó a este agente"
}

Mensaje del cliente: "${mensajeTexto}"`;

      const routingResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: routingPromptOverride(routingResponseRuleClean(orqPrompt)),
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intencionDetectada: { type: Type.STRING },
              agenteAsignado: { type: Type.STRING },
              confianzaClasificacion: { type: Type.NUMBER },
              detallesClasificacion: { type: Type.STRING }
            },
            required: ['intencionDetectada', 'agenteAsignado', 'confianzaClasificacion', 'detallesClasificacion']
          }
        }
      });

      const parsedRoute = JSON.parse(routingResponse.text || '{}');
      if (parsedRoute.agenteAsignado) {
        agenteAsignado = parsedRoute.agenteAsignado as any;
        intencionDetectada = parsedRoute.intencionDetectada || 'Pregunta General';
        confianzaClasificacion = parsedRoute.confianzaClasificacion || 0.95;
        detallesClasificacion = parsedRoute.detallesClasificacion || 'Clasificado por Gemini 3.5 Flash';
      }
    } catch (e) {
      console.error('Gemini Orchestration routing error, fallback applied:', e);
      // fallback matching regexes
      const lowerText = mensajeTexto.toLowerCase();
      if (lowerText.includes('agendar') || lowerText.includes('cita') || lowerText.includes('hora') || lowerText.includes('turno') || lowerText.includes('reservar')) {
        agenteAsignado = 'agendador';
        intencionDetectada = 'Agendar Reserva de Hora';
      } else if (lowerText.includes('pedido') || lowerText.includes('despacho') || lowerText.includes('enviar') || lowerText.includes('comprar') || lowerText.includes('dirección de despacho')) {
        agenteAsignado = 'pedidos';
        intencionDetectada = 'Toma de Pedido y Despacho';
      } else if (lowerText.includes('precio') || lowerText.includes('cuánto valen') || lowerText.includes('cuanto vale') || lowerText.includes('costo') || lowerText.includes('stock') || lowerText.includes('venden') || lowerText.includes('empanada') || lowerText.includes('tarta') || lowerText.includes('teclado')) {
        agenteAsignado = 'vendedor';
        intencionDetectada = 'Consulta de Productos y Precios';
      } else if (lowerText.includes('debo') || lowerText.includes('deuda') || lowerText.includes('pagar') || lowerText.includes('cuentas') || lowerText.includes('fiado')) {
        agenteAsignado = 'cobranza';
        intencionDetectada = 'Consulta de Estado Financiero';
      } else if (sentimientoInput === 'frustrado') {
        agenteAsignado = 'escalador';
        intencionDetectada = 'Reclamo Severo / Enojo';
      }
    }
  } else {
    // RUN IN SIMULATOR RULE MODE IF NO GEMINI API KEY
    const lowerText = mensajeTexto.toLowerCase();
    if (sentimientoInput === 'frustrado') {
      agenteAsignado = 'escalador';
      intencionDetectada = 'Reclamo de Cliente por Demora o Mal Servicio';
      detallesClasificacion = 'Simulación: Sentimiento Frustrado detectado.';
    } else if (lowerText.includes('agendar') || lowerText.includes('cita') || lowerText.includes('hora') || lowerText.includes('turno') || lowerText.includes('reserva') || lowerText.includes('dental') || lowerText.includes('limpieza') || lowerText.includes('diagnostico')) {
      agenteAsignado = 'agendador';
      intencionDetectada = 'Agendamiento o Consulta de Hora de Atención';
      detallesClasificacion = 'Simulación: Contiene palabras de agenda/reservas.';
    } else if (lowerText.includes('precio') || lowerText.includes('cuánto vale') || lowerText.includes('cuanto vale') || lowerText.includes('cuánto cuesta') || lowerText.includes(' stock') || lowerText.includes('tienen') || lowerText.includes('venden') || lowerText.includes('pan') || lowerText.includes('empanada') || lowerText.includes('hallulla')) {
      agenteAsignado = 'vendedor';
      intencionDetectada = 'Consulta por Productos y Stock';
      detallesClasificacion = 'Simulación: Contiene palabras clave de compra.';
    } else if (lowerText.includes('despacho') || lowerText.includes('envio') || lowerText.includes('comprar') || lowerText.includes('dirección') || lowerText.includes('despachar')) {
      agenteAsignado = 'pedidos';
      intencionDetectada = 'Generación de Pedido y Checkout';
      detallesClasificacion = 'Simulación: Proceso de checkout iniciado.';
    } else if (lowerText.includes('deuda') || lowerText.includes('pagar') || lowerText.includes('debo') || lowerText.includes('saldo') || lowerText.includes('monto') || lowerText.includes('fiado')) {
      agenteAsignado = 'cobranza';
      intencionDetectada = 'Consulta de Fiado / Cobranza Recurrente';
      detallesClasificacion = 'Simulación: Consulta de deudas de cuenta.';
    } else {
      agenteAsignado = 'soporte';
      intencionDetectada = 'Duda general de local (Ubicación, Horarios, etc.)';
      detallesClasificacion = 'Simulación: Defaulting a FAQs de Soporte General.';
    }
  }

  // 2. CHECK IF ASSIGNED AGENT IS ACTIVE
  const matchedAgent = activeCompanyAgents.find(a => a.rol === agenteAsignado);
  const isAgentActive = matchedAgent?.activo !== false;

  addLog(empresaId, isAgentActive ? 'info' : 'warn', 'Orquestador IA', 
    `Derivado al agente especializado: [${agenteAsignado.toUpperCase()}]. Intención: "${intencionDetectada}". Confianza: ${(confianzaClasificacion*100).toFixed(0)}%` +
    (isAgentActive ? '' : ' (¡Agente está Desactivado! Escalando automáticamente a Soporte General)'));

  // If the SME owner deactivated this agent, we default to soporte agent
  if (!isAgentActive) {
    agenteAsignado = 'soporte';
  }

  // 3. EXECUTE TARGET SPECIALIST AGENT Prompt & Dynamic Context
  const targetAgentObj = activeCompanyAgents.find(a => a.rol === agenteAsignado);
  let finalIAAnswer = '';

  // Get agent context parameters
  const dynamicContext = {
    horarioEmpresa: 'Lunes a Sábado de 09:00 a 20:00 hrs. Domingos cerrado.',
    telefonoWhatsApp: currentEmpresa.telefonoWhatsapp,
    direccionExacta: currentEmpresa.direccion,
    unidadesDisponiblesCatalogo: catalogContextMsg,
    deudaHistoricaCliente: client.deudaPendiente,
    fechaYHoraServidor: new Date().toISOString()
  };

  // Run Real Gemini AI call for Specialized Agent!
  if (ai) {
    try {
      const systemInstruction = targetAgentObj?.promptPersonalizado || 'Eres un atento asistente chileno para pymes.';
      
      const contextualAgentPrompt = `Sigue estrictamente tu rol técnico:
${systemInstruction}

CONTEXTO EXTRA RELEVANTE:
- Nombre de la Empresa: ${currentEmpresa.nombre}
- Dirección Física: ${dynamicContext.direccionExacta}
- Horarios de Atención: ${dynamicContext.horarioEmpresa}
- RUT del Cliente: ${client.rut}
- Deuda Actual Pendiente del Cliente (para Cobranzas): $${dynamicContext.deudaHistoricaCliente} (chilenos)
- Catálogo de Productos y Precios:
${dynamicContext.unidadesDisponiblesCatalogo}

INSTRUCCIONES DE TONO Y ESTILO:
- Escribe como un amigable asistente comercial chileno de WhatsApp.
- Usa frases cortas, limpias, con saltos de línea legibles en pantallas de celular.
- Si corresponde (con moderación y respeto), sé cercano, cálido, usando "estimado/a", "hola buenas".
- No inventes productos que no estén en el catálogo.

ÚLTIMO HISTORIAL DE CHAT:
${mensajes[conversation.id].slice(-6).map(m => `${m.emisor === 'cliente' ? 'Cliente' : 'Asistente IA'}: "${m.contenido}"`).join('\n')}

Cliente escribe ahora: "${mensajeTexto}"
Responde con tu mensaje de WhatsApp:`;

      const agentResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contextualAgentPrompt,
        config: {
          temperature: targetAgentObj?.temperatura || 0.4
        }
      });
      finalIAAnswer = agentResponse.text || 'Sin respuesta';
    } catch (e) {
      console.error('Agent compilation Gemini Error, applying local templates:', e);
    }
  }

  // Local fallback templates if Gemini fail or is deactivated (clever regex response templates)
  if (!finalIAAnswer) {
    const isPastry = currentEmpresa.rubro === 'Alimentos y Pastelería';
    const isDental = currentEmpresa.rubro === 'Salud y Ortodoncia';

    if (agenteAsignado === 'escalador') {
      finalIAAnswer = `Estimado/a ${client.nombre}, lamentamos mucho el inconveniente. Queremos solucionarlo de inmediato por lo que he pausado mi bot inteligente de autogestión y el dueño del local ya ha sido notificado directamente. Se contactará con usted en menos de 5 minutos de forma humana. ¡Le pido mil disculpas!`;
      conversation.rutinaAgenteActiva = 'humano';
      client.estado = 'escalado_humano';
    } else if (agenteAsignado === 'agendador') {
      if (isDental) {
        finalIAAnswer = `¡Perfecto! Nos encantaría agendar su cita para atención dental en la Clínica Dental San José. Contamos con turnos libres para mañana martes a las 10:30 y 15:30 hrs, o bien el miércoles a las 09:00 hrs. ¿Le acomoda alguno de estos horarios? Necesitaré su nombre completo y RUT para confirmar, estimado.`;
      } else {
        finalIAAnswer = `¡Hola! Con gusto coordinamos su reserva en ${currentEmpresa.nombre}. Tenemos disponibilidad para agendar esta semana de Lunes a Sábado. ¿Qué día y hora en particular tiene pensado para visitarnos?`;
      }
    } else if (agenteAsignado === 'pedidos') {
      if (isPastry) {
        finalIAAnswer = `¡Perfecto! Vamos a armar su pedido de panadería y pastelería. Por favor facilítenos su dirección completa de despacho. El costo de delivery en Santiago es de $1.500 y el tiempo estimado de entrega para hoy es de 35 a 45 minutos. ¿Cómo prefiere transferir, estimado?`;
      } else {
        finalIAAnswer = `¡Entendido! Vamos a consolidar su pedido. Para proceder con el despacho a domicilio, ¿podría indicarnos su comuna y dirección de envío? Le calcularemos el total al tiro junto con el costo de envío de nuestros transportistas asociados.`;
      }
    } else if (agenteAsignado === 'cobranza') {
      if (client.deudaPendiente > 0) {
        finalIAAnswer = `Hola ${client.nombre}, espero que se encuentre excelente. Le recordamos con mucho cariño que mantiene un saldo por compras pendientes de $${client.deudaPendiente}. Puede realizar el pago mediante transferencia a nuestra cuenta rut habitual o pasando directo por nuestro local físico. ¡Agradecemos su valioso apoyo a nuestro negocio familiar!`;
      } else {
        finalIAAnswer = `Hola ${client.nombre}, consultamos en el sistema de PymeyAssist y actualmente se encuentra totalmente al día con sus pagos en ${currentEmpresa.nombre}. ¡Muchas gracias por ser un excelente y valioso cliente frecuente de nuestro local!`;
      }
    } else if (agenteAsignado === 'vendedor') {
      if (isPastry) {
        finalIAAnswer = `¡Por supuesto! Le comento que hoy tenemos stock fresco de: Empanadas de Pino al horno ($2.500 c/u), empanadas queso fritas ($2.200), Hallullas de horno a $1.900 el kilo y una espectacular Torta de Tres Leches para 10 personas a $15.990. Todo elaborado hoy mísmo. ¿Cuántas unidades le reservamos de cada uno, estimado/a?`;
      } else if (isDental) {
        finalIAAnswer = `¡Hola! Con mucho gusto le informo sobre nuestros tratamientos recomendados de hoy:\n- Consulta general + radiografía dental de diagnóstico a solo $14.990.\n- Limpieza clínica profunda con pulido y flúor por $34.990.\n- Blanqueamiento clínico LED rápido por $79.990. Todos nuestros profesionales están titulados e inscritos en la Superintendencia de Salud. ¿Le reservamos una hora?`;
      } else {
        finalIAAnswer = `¡Hola! Hoy en Súper Tecno Chile disponemos del espectacular Teclado Mecánico RGB Switch Red en oferta a $44.990, Mouse Gamer Pro 16k DPI a $27.990 y Monitor Gamer Curvo de 24" 144Hz a $129.990 con garantía directa de 6 meses. ¿Le interesa cotizar despacho o retiro inmediato, estimado?`;
      }
    } else { // SOPORTE
      finalIAAnswer = `Estimado/a, le doy la bienvenida a ${currentEmpresa.nombre}. Le comento que estamos ubicados exactamente en: ${currentEmpresa.direccion}. Atendemos de Lunes a Sábado de 09:00 a 20:00 hrs de corrido (Domingos cerrado). Aceptamos transferencias, débito, crédito Webpay y efectivo. ¿Tiene alguna otra duda en que pueda asistirle?`;
    }
  }

  // 4. PROCESS SIDE-EFFECT OPERATIONS IN THE DATABASE (Manejo Autónomo Inteligente)
  // Check if Seller or Order agent concluded a booking/order and auto-create database receipts as in a real SaaS!
  const lowerMsg = mensajeTexto.toLowerCase();
  
  if (agenteAsignado === 'pedidos' && (lowerMsg.includes('calle') || lowerMsg.includes('avenida') || lowerMsg.includes('providencia') || lowerMsg.includes('casa') || lowerMsg.includes('piso') || lowerMsg.includes('despacha'))) {
    // Auto trigger Order registration in the simulator!
    const activeProds = productos[empresaId] || [];
    const orderedProd = activeProds[0] || { nombre: 'Compra general', precio: 5000 };
    const totalCalc = orderedProd.precio + 1500; // Product price + delivery shipping
    const newPed: Pedido = {
      id: `ped_${Date.now()}`,
      empresaId,
      clienteId: client.id,
      detalles: `1x ${orderedProd.nombre}`,
      total: totalCalc,
      estado: 'confirmado',
      direccionDespacho: mensajeTexto.length < 150 ? mensajeTexto : 'Avenida Providencia 2300, Santiago',
      tiempoEstimadoMinutos: empresaId === 'emp_caserito' ? 35 : 45,
      creadoEn: new Date().toISOString()
    };
    pedidos[empresaId].unshift(newPed);
    
    // Update CRM Status
    client.estado = 'cliente_frecuente';
    
    // Update KPI metrics
    metricas[empresaId].pedidosTomados += 1;
    metricas[empresaId].ventasTotales += totalCalc;
    
    addLog(empresaId, 'info', 'Agente de Pedidos', `¡Venta Automatizada! Pedido registrado por el Robot de forma autónoma por $${totalCalc}. Cliente: ${client.nombre}`);
  }

  if (agenteAsignado === 'agendador' && (lowerMsg.includes('quiero') || lowerMsg.includes('agendar') || lowerMsg.includes('confirma') || lowerMsg.includes('sí') || lowerMsg.includes('si') || lowerMsg.includes('asistir') || lowerMsg.includes('mañana') || lowerMsg.includes('tarde'))) {
    // Auto trigger Appointment Booking reservation 
    const isDental = currentEmpresa.rubro === 'Salud y Ortodoncia';
    const newRes: Reserva = {
      id: `res_${Date.now()}`,
      empresaId,
      clienteId: client.id,
      servicioNombre: isDental ? 'Evaluación Dental General + Diagnóstico' : 'Servicio Especial Autónomo',
      fechaHora: new Date(Date.now() + 3600000 * 24).toISOString(), // next 24 hours
      estado: 'programada',
      creadoEn: new Date().toISOString()
    };
    reservas[empresaId].unshift(newRes);

    // Update KPI metrics
    metricas[empresaId].reservasAgendadas += 1;
    addLog(empresaId, 'info', 'Agente Agendador', `¡Cita agendada! Cita confirmada por el Robot para mañana. Cliente: ${client.nombre}`);
  }

  if (agenteAsignado === 'escalador') {
    metricas[empresaId].totalEscalados += 1;
    client.estado = 'escalado_humano';
    conversation.rutinaAgenteActiva = 'humano';
    addLog(empresaId, 'error', 'Escalación Humana', `¡CRÍTICO! Alerta de traspaso humano gatillada para el cliente ${client.nombre} (${client.telefono}) debido a enojo o alta complejidad.`);
  }

  // 5. SAVE MULTI-AGENT INCOMING RESPONSE
  const iaMsg: Mensaje = {
    id: `msg_ia_${Date.now()}`,
    conversacionId: conversation.id,
    emisor: 'agente_ia',
    remitenteNombre: targetAgentObj?.nombre || 'Agente Autónomo IA',
    contenido: finalIAAnswer,
    agenteQueRespondio: agenteAsignado,
    metadatosRouting: {
      intencionDetectada,
      agenteAsignado,
      confianzaClasificacion
    },
    creadoEn: new Date().toISOString()
  };
  mensajes[conversation.id].push(iaMsg);

  // Update conversation headers
  conversation.ultimoAgenteEncargado = agenteAsignado;
  conversation.actualizadoEn = new Date().toISOString();

  // Increment total stats
  metricas[empresaId].totalMensajes += 2; // (User incoming + agent response)
  metricas[empresaId].totalSoporteIA += 1;
  if (isNewConversation) {
    metricas[empresaId].totalConversaciones += 1;
  }

  // Recalculate sentiment ratio in metrics randomly or with slight deviation
  const sentRatio = metricas[empresaId].sentimentRatio;
  if (sentimientoInput === 'positivo') {
    sentRatio.positivo = Math.min(100, sentRatio.positivo + 2);
    sentRatio.neutral = Math.max(0, sentRatio.neutral - 1);
    sentRatio.frustrado = Math.max(0, sentRatio.frustrado - 1);
  } else if (sentimientoInput === 'frustrado') {
    sentRatio.frustrado = Math.min(100, sentRatio.frustrado + 3);
    sentRatio.positivo = Math.max(0, sentRatio.positivo - 2);
    sentRatio.neutral = Math.max(0, sentRatio.neutral - 1);
  }

  res.json({
    success: true,
    mode: 'autonomo',
    mensajeUsuario: userMsg,
    replyMessage: iaMsg,
    routingResult: {
      intencionDetectada,
      agenteAsignado,
      confianzaClasificacion,
      detallesClasificacion
    }
  });
});

// Prompt adjustment helpers for safety margins
function routingPromptOverride(inp: string): string {
  return inp;
}
function routingResponseRuleClean(inp: string): string {
  return inp;
}


// --- INTEGRATE VITE FOR DEVELOPMENT ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development middleware mounted successfully.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static serving active under /dist.');
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PymeAssist backend server active on http://0.0.0.0:${PORT}`);
    console.log(`Port: ${PORT} is accessible externally via AI Studio Applet reverse proxy.`);
  });
}

startServer();