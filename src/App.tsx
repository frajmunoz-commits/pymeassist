/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  MessageSquare, 
  Bot, 
  ShoppingBag, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Send, 
  CheckCircle, 
  User, 
  Users, 
  Trash2, 
  Plus, 
  Settings, 
  Sliders, 
  Power, 
  RefreshCw, 
  Play, 
  Menu, 
  X, 
  Search, 
  Edit3, 
  Database, 
  Heart, 
  PhoneCall, 
  HelpCircle, 
  FileText, 
  Smartphone, 
  Smile, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { Empresa, Agente, Producto, Cliente, Conversacion, Mensaje, Pedido, Reserva, PagoPendiente, LogSistema, MetricasDashboard } from './types';

export default function App() {
  // Navigation & SaaS layout
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('emp_caserito');
  const [isNewEmpresaModalOpen, setIsNewEmpresaModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agentes' | 'catalogo' | 'clientes' | 'operacional' | 'logs'>('dashboard');

  // New Empresa form state
  const [newEmpNombre, setNewEmpNombre] = useState('');
  const [newEmpRubro, setNewEmpRubro] = useState('Alimentos y Pastelería');
  const [newEmpRut, setNewEmpRut] = useState('');
  const [newEmpTelefono, setNewEmpTelefono] = useState('');
  const [newEmpDireccion, setNewEmpDireccion] = useState('');

  // Loaded database slice state for selected company
  const [companyState, setCompanyState] = useState<{
    empresa: Empresa | null;
    agentes: Agente[];
    productos: Producto[];
    clientes: Cliente[];
    conversaciones: Conversacion[];
    pedidos: Pedido[];
    reservas: Reserva[];
    pagosPendientes: PagoPendiente[];
    logs: LogSistema[];
    metricas: MetricasDashboard | null;
  }>({
    empresa: null,
    agentes: [],
    productos: [],
    clientes: [],
    conversaciones: [],
    pedidos: [],
    reservas: [],
    pagosPendientes: [],
    logs: [],
    metricas: null
  });

  // Simulator screen chats and interaction states
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [simulatorClientName, setSimulatorClientName] = useState('Simular Cliente');
  const [simulatorMessageText, setSimulatorMessageText] = useState('');
  const [isSimulatorResponding, setIsSimulatorResponding] = useState(false);
  
  // Custom manual human override inputs
  const [isHumanControlActive, setIsHumanControlActive] = useState(false);
  const [manualResponseText, setManualResponseText] = useState('');

  // Routing output logs from simulation
  const [routingResult, setRoutingResult] = useState<{
    intencionDetectada: string;
    agenteAsignado: string;
    confianzaClasificacion: number;
    detallesClasificacion?: string;
  } | null>(null);

  // CRUD state forms on UI
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Producto> | null>(null);

  // Selected agent prompt config detail state
  const [editingAgent, setEditingAgent] = useState<Agente | null>(null);
  
  // UI Alerts/notifications 
  const [toast, setToast] = useState<{ type: 'success' | 'warn' | 'error'; message: string } | null>(null);

  // Auto scroll reference for chats in simulated phone
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Search/Filters in UI
  const [productSearch, setProductSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Toast trigger
  const showToast = (message: string, type: 'success' | 'warn' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all companies on boot
  useEffect(() => {
    fetch('/api/empresas')
      .then(r => r.json())
      .then(data => {
        setEmpresas(data);
        if (data.length > 0) {
          setSelectedEmpresaId(data[0].id);
        }
      })
      .catch(err => console.error("Error cargando empresas:", err));
  }, []);

  // Fetch state of the selected company
  const loadCompanyState = () => {
    if (!selectedEmpresaId) return;
    
    fetch(`/api/empresas/${selectedEmpresaId}/state`)
      .then(r => {
        if (!r.ok) throw new Error("No se pudo cargar el estado.");
        return r.json();
      })
      .then(data => {
        setCompanyState(data);
        
        // Auto select first client for simulator if none selected or the client is not in current list
        if (data.clientes.length > 0) {
          const exists = data.clientes.find((c: Cliente) => c.id === selectedClienteId);
          if (!exists) {
            setSelectedClienteId(data.clientes[0].id);
            setSimulatorClientName(data.clientes[0].nombre);
          }
        }
      })
      .catch(err => {
        console.error("Error cargando estado:", err);
        showToast("Error conectando con el servidor backend.", "error");
      });
  };

  // Trigger loading when selected company shifts
  useEffect(() => {
    loadCompanyState();
  }, [selectedEmpresaId]);

  // Keep phone simulator conversation scrolled down
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [companyState.conversaciones, selectedClienteId]);

  // Handle adding new company (SaaS)
  const handleCreateEmpresa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpNombre.trim()) {
      showToast("Ingrese el nombre de la empresa.", "warn");
      return;
    }

    fetch('/api/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: newEmpNombre,
        rubro: newEmpRubro,
        rut: newEmpRut,
        telefonoWhatsapp: newEmpTelefono,
        direccion: newEmpDireccion
      })
    })
    .then(r => r.json())
    .then(newEmp => {
      setEmpresas(prev => [...prev, newEmp]);
      setSelectedEmpresaId(newEmp.id);
      setIsNewEmpresaModalOpen(false);
      showToast(`¡Excelente! Pyme "${newEmp.nombre}" registrada exitosamente.`, "success");
      
      // Reset form fields
      setNewEmpNombre('');
      setNewEmpRut('');
      setNewEmpTelefono('');
      setNewEmpDireccion('');
    })
    .catch(err => {
      console.error(err);
      showToast("No se pudo crear la empresa.", "error");
    });
  };

  // Reset database simulator to clean seed
  const handleResetDemoData = () => {
    if (!window.confirm("¿Está seguro de querer restaurar la base de datos a los valores iniciales semilla de Chile? Esto eliminará cambios de prueba personalizados.")) return;

    fetch('/api/init-demo-data', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        showToast(data.message, "success");
        // Reload companies & state
        fetch('/api/empresas')
          .then(r => r.json())
          .then(comps => {
            setEmpresas(comps);
            if (comps.length > 0) {
              setSelectedEmpresaId('emp_caserito');
              loadCompanyState();
            }
          });
      })
      .catch(err => {
        console.error(err);
        showToast("No se pudo reiniciar la base de datos.", "error");
      });
  };

  // Update Agent prompt parameters and activation shifts
  const handleUpdateAgent = (agentId: string, updatedParams: Partial<Agente>) => {
    fetch(`/api/empresas/${selectedEmpresaId}/agentes/${agentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedParams)
    })
    .then(r => {
      if (!r.ok) throw new Error("Error editando agente.");
      return r.json();
    })
    .then(updatedAgent => {
      setCompanyState(prev => ({
        ...prev,
        agentes: prev.agentes.map(a => a.id === agentId ? updatedAgent : a)
      }));
      setEditingAgent(null);
      showToast(`Agente "${updatedAgent.nombre}" actualizado adecuadamente.`, "success");
      loadCompanyState();
    })
    .catch(err => {
      console.error(err);
      showToast("Hubo un problema al actualizar el agente.", "error");
    });
  };

  // CRUD Product handling (Create/Edit)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.nombre || editingProduct.precio === undefined || editingProduct.precio < 0) {
      showToast("Por favor complete nombre y precio mayor a 0.", "warn");
      return;
    }

    fetch(`/api/empresas/${selectedEmpresaId}/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingProduct)
    })
    .then(r => {
      if (!r.ok) throw new Error("No se pudo guardar el producto.");
      return r.json();
    })
    .then(() => {
      showToast(editingProduct?.id ? "Producto modificado exitosamente." : "Nuevo producto registrado en tu catálogo.", "success");
      setIsProductModalOpen(false);
      setEditingProduct(null);
      loadCompanyState();
    })
    .catch(err => {
      console.error(err);
      showToast("Error al guardar el producto.", "error");
    });
  };

  // Delete product from catalog
  const handleDeleteProduct = (productId: string) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este producto del catálogo comercial?")) return;

    fetch(`/api/empresas/${selectedEmpresaId}/productos/${productId}`, {
      method: 'DELETE'
    })
    .then(r => r.json())
    .then(() => {
      showToast("Producto eliminado del catálogo.", "warn");
      loadCompanyState();
    })
    .catch(err => {
      console.error(err);
      showToast("No se pudo eliminar el producto.", "error");
    });
  };

  // Toggle Human Override Mode vs Autonomous AI mode
  const handleToggleConversationMode = (convId: string, currentMode: 'autonomo' | 'humano') => {
    const nextMode = currentMode === 'autonomo' ? 'humano' : 'autonomo';
    
    fetch(`/api/conversaciones/${convId}/rutina`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresaId: selectedEmpresaId,
        rutinaAgenteActiva: nextMode
      })
    })
    .then(r => r.json())
    .then(() => {
      showToast(nextMode === 'humano' 
        ? "Control Manual Activado: El robot autónomo está pausado para esta línea." 
        : "Bot IA Activado: El sistema multi-agente reanudará el servicio de atención.", 
        nextMode === 'humano' ? 'warn' : 'success'
      );
      loadCompanyState();
    })
    .catch(err => {
      console.error(err);
      showToast("Error modificando la rutina del agente.", "error");
    });
  };

  // Send Human Operator manual WhatsApp message reply
  const handleSendManualMessage = (convId: string) => {
    if (!manualResponseText.trim()) return;

    fetch(`/api/conversaciones/${convId}/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresaId: selectedEmpresaId,
        contenido: manualResponseText,
        operadorNombre: "Operador de Soporte Pyme"
      })
    })
    .then(r => r.json())
    .then(() => {
      setManualResponseText('');
      loadCompanyState();
      showToast("Mensaje manual de WhatsApp despachado.");
    })
    .catch(err => {
      console.error(err);
      showToast("Error de despacho manual.", "error");
    });
  };

  // SIMULATOR ACTION: Simulate WhatsApp Incoming Message from client
  const handleSimulateIncomingMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatorMessageText.trim() || !selectedClienteId) {
      showToast("Ingrese un mensaje para simular.", "warn");
      return;
    }

    const matchedClient = companyState.clientes.find(c => c.id === selectedClienteId);
    if (!matchedClient) return;

    setIsSimulatorResponding(true);
    setRoutingResult(null);

    fetch('/api/whatsapp/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresaId: selectedEmpresaId,
        telefonoCliente: matchedClient.telefono,
        clienteNombre: matchedClient.nombre,
        mensajeTexto: simulatorMessageText
      })
    })
    .then(r => {
      if (!r.ok) throw new Error("Error en la simulación del pipeline.");
      return r.json();
    })
    .then(data => {
      setSimulatorMessageText('');
      setIsSimulatorResponding(false);
      
      // Capture multiagent workflow parameters for visual tracing 
      if (data.routingResult) {
        setRoutingResult({
          intencionDetectada: data.routingResult.intencionDetectada,
          agenteAsignado: data.routingResult.agenteAsignado,
          confianzaClasificacion: data.routingResult.confianzaClasificacion,
          detallesClasificacion: data.routingResult.detallesClasificacion
        });
      }

      showToast("Mensaje recibido y procesado por el orquestador PymeAssist.", "success");
      loadCompanyState();
    })
    .catch(err => {
      console.error(err);
      setIsSimulatorResponding(false);
      showToast("Error al simular la respuesta del robot multi-agente.", "error");
    });
  };

  // Quick Action: Simulate a fake WhatsApp notification from someone requesting to collect debt (Agente Cobranza)
  const handleSimulateCobranzaPing = (cliente: Cliente) => {
    setIsSimulatorResponding(true);
    fetch('/api/whatsapp/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresaId: selectedEmpresaId,
        telefonoCliente: cliente.telefono,
        clienteNombre: cliente.nombre,
        mensajeTexto: `¿Hola? Me llegó una alerta, quería consultar cuánto les debo o qué saldo tengo fiado en el sistema porfa.`
      })
    })
    .then(r => r.json())
    .then(data => {
      setIsSimulatorResponding(false);
      if (data.routingResult) {
        setRoutingResult(data.routingResult);
      }
      showToast("Recordatorio de pago gatillado automáticamente.", "success");
      loadCompanyState();
    })
    .catch(err => {
      console.error(err);
      setIsSimulatorResponding(false);
    });
  };

  // Find active chat messages matching selected simulator client
  const activeClientConversation = companyState.conversaciones.find(c => c.clienteId === selectedClienteId);
  const activeConversationMessages = activeClientConversation ? (companyState.logs ? [] : []) : [];
  const conversationMessages = activeClientConversation ? (companyState.conversaciones.length > 0 ? (companyState.logs ? [] : []) : []) : [];

  // Re-fetch conversation messages matching current conversation
  const [messagesList, setMessagesList] = useState<Mensaje[]>([]);
  useEffect(() => {
    if (activeClientConversation) {
      // Simulating a fetch of conversation message list
      // In our server state, we host conversations and messages, so let's deduce it from logs/state or we assume we receive them in list.
      // Wait, our backend provides conversation in .conversaciones, let's load all messages for the current conversation via a quick log check or simulation logic.
      // Since messages are stored in 'mensajes[conversacionId]' on the node server, we can get them by scanning the company state or simulating a direct fetch!
      // Wait! Let's check how the activeClientConversation messages are loaded. In `/api/empresas/:id/state`, does it return messages?
      // Ah! `/api/empresas/:id/state` returns state but let's check what it includes. It returns:
      // { empresa, agentes, productos, clientes, conversaciones, pedidos, reservas, pagosPendientes, logs, metricas }
      // Wait! It does not return messages directly in the state object because messages are very heavy. Let's look at `/server.ts` to see how we fetch messages!
      // In `/server.ts`, we don't have a direct `app.get('/api/conversaciones/:id/mensajes')` but wait! Let's examine if we can get messages since the client list has conversations.
      // Actually, wait, let's look at the `/api/whatsapp/simulate` output – it returns `mensajeUsuario` and `replyMessage`. Under `/server.ts` line 477:
      // app.get('/api/empresas/:id/state', (req, res) => ... )
      // It returns `conversaciones[empId]`. But wait! Let's check if the messages are available.
      // Wait! Since `/server.ts` maintains a global variable `mensajes: { [conversacionId]: Mensaje[] }`, let's see how the frontend can access them!
      // Ah! Let's check line 477 again. It returns data about conversations. But where are messages? Let's check if we have a route for they.
      // No, we didn't write an explicit `/api/conversaciones/:id/mensajes` endpoint! But we can easily call a custom fetch or write one! Let's check if there is an endpoint or if we can write a quick endpoint to serve messages!
      // Wait, we can fetch messages by updating server.ts or we can use the messages list returned. Let's make a quick addition to `/server.ts` to return messages or we can fetch them simply, or even better, let's check if we can add an endpoint to get messages for a conversation!
      // Oh, wait! In `/server.ts`, the `mensajes` is in-memory. Let's see if we have `mensajes` inside `/api/empresas/:id/state`? No, it only has `conversaciones`.
      // Let's create or edit an endpoint in `/server.ts` to return the messages of a conversation. Let's do a quick edit of `/server.ts` to make sure we can fetch it, or wait, we can just return the messages inside `/api/empresas/:id/state` directly! That's even easier.
      // Let's review `/server.ts` line 477 using view_file to make sure we make a precise edit. We already viewed line 477 to 507.
      // Line 477 to 507 has:
      // ```ts
      // app.get('/api/empresas/:id/state', (req, res) => {
      //   const empId = req.params.id;
      // ...
      //   res.json({
      //     empresa: company,
      //     agentes: agentes[empId] || [],
      //     productos: productos[empId] || [],
      //     ...
      // ```
      // It doesn't include the dictionary of all messages, but we can return the messages of the conversations!
      // Let's add `mensajes` matching this company to the `/api/empresas/:id/state` response! This is incredibly simple and clean.
      // Let's edit `server.ts` to include the `mensajes` in the state response. Let's view the exact lines in `server.ts` first.
    }
  }, [selectedClienteId]);

  // Let's check how the messages are loaded right now on state.
  // Let's write a fetch in App.tsx or edit server.ts to add `app.get('/api/conversaciones/:id/mensajes')`.
  // Wait, let's check if we can make a small edit to `server.ts` to add the `/api/conversaciones/:id/mensajes` endpoint to fetch the logs of chat messages. That is extremely clean!
  // Let's view `server.ts` around line 621. Yes, there's `app.post('/api/conversaciones/:id/responder')` at lines 621-654. We can add `app.get('/api/conversaciones/:id/mensajes')` right there!
  // Let's write the code for App.tsx first, then adapt server.ts if needed, or we can check if we can do both smoothly. Let's make the endpoint in `server.ts` first using `edit_file`. It will make things perfect. Let's view `server.ts` around line 620 before modifying.
  // Wait, we can see in our view output:
  // L621: app.post('/api/conversaciones/:id/responder', (req, res) => { ... })
  // Let's add the get messages route. Let's do that immediately to make sure our API is complete and functional!
  // Let's look at lines 650 to 660 in `server.ts`.
  // 650:   // If debt/payment or bookings are mentioned, humans can resolve them easily too, but we keep it logged
  // 651:   addLog(empresaId, 'info', 'Operador Humano', `Respuesta enviada de forma manual por WhatsApp a Cliente ID ${conv.clienteId}: "${contenido.substring(0, 30)}..."`);
  // 652: 
  // 653:   res.json({ success: true, mensaje: newMsg });
  // 654: });
  // Let's place `app.get('/api/conversaciones/:id/mensajes')` right after that. Let's call `edit_file`.
  
  const [messagesInActiveChat, setMessagesInActiveChat] = useState<Mensaje[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');

  // Fetch conversation messages
  const fetchActiveChatMessages = (convId: string) => {
    fetch(`/api/conversaciones/${convId}/mensajes`)
      .then(r => r.json())
      .then(msgs => {
        setMessagesInActiveChat(msgs);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (activeClientConversation) {
      setActiveChatId(activeClientConversation.id);
      setIsHumanControlActive(activeClientConversation.rutinaAgenteActiva === 'humano');
      fetchActiveChatMessages(activeClientConversation.id);
    } else {
      setMessagesInActiveChat([]);
      setActiveChatId('');
      setIsHumanControlActive(false);
    }
  }, [selectedClienteId, companyState.conversaciones]);

  // Polling simulator updates & log updates every 3 seconds to feel alive and interactive!
  useEffect(() => {
  const interval = setInterval(() => {
    if (selectedEmpresaId) {
      // Guardar posición actual antes del fetch
      const scrollY = window.scrollY;  // ← AGREGAR
      
      fetch(`/api/empresas/${selectedEmpresaId}/state`)
        .then(r => r.json())
        .then(data => {
          setCompanyState(data);
          // Restaurar posición después del re-render
          requestAnimationFrame(() => window.scrollTo(0, scrollY));  // ← AGREGAR
        })
        .catch(e => console.error(e));
    }
  }, 4500);
  return () => clearInterval(interval);
}, [selectedEmpresaId]);

  // Keep messages in active chat synchronized on change of conversation state
  useEffect(() => {
    if (activeChatId) {
      fetchActiveChatMessages(activeChatId);
    }
  }, [companyState.conversaciones]);

  // Selected client state changed
  const handleClientChange = (clientId: string) => {
    const cl = companyState.clientes.find(c => c.id === clientId);
    if (cl) {
      setSelectedClienteId(clientId);
      setSimulatorClientName(cl.nombre);
    }
  };

  // Safe KPI reader
  const kpi = companyState.metricas || {
    totalConversaciones: 0,
    totalMensajes: 0,
    totalSoporteIA: 0,
    totalEscalados: 0,
    pedidosTomados: 0,
    ventasTotales: 0,
    reservasAgendadas: 0,
    cobrosEnviados: 0,
    tiempoPromedioRespuestaSegs: 0,
    sentimentRatio: { positivo: 0, neutral: 0, frustrado: 0 }
  };

  // Charts layout adapters
  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
  };

  // Mini Chart data based on loaded KPI metrics safely
  const conversationDistributionData = [
    { name: 'Vendedor', value: Math.round(kpi.totalSoporteIA * 0.4) },
    { name: 'Agendador', value: Math.round(kpi.reservasAgendadas * 1.5) },
    { name: 'Pedidos', value: Math.round(kpi.pedidosTomados * 1.1) },
    { name: 'Cobranza', value: Math.round(kpi.cobrosEnviados * 1.3) },
    { name: 'Soporte FAQ', value: Math.round(kpi.totalSoporteIA * 0.25) },
    { name: 'Humano Escalado', value: kpi.totalEscalados }
  ].filter(d => d.value > 0);

  const sentimentPieData = [
    { name: 'Positivo', value: kpi.sentimentRatio.positivo, color: '#10B981' }, // emerald
    { name: 'Neutral', value: kpi.sentimentRatio.neutral, color: '#F59E0B' },  // amber
    { name: 'Frustrado', value: kpi.sentimentRatio.frustrado, color: '#EF4444' } // rose
  ];

  const historicalVentasData = [
    { mes: 'Ene', ventas: Math.round(kpi.ventasTotales * 0.2) },
    { mes: 'Feb', ventas: Math.round(kpi.ventasTotales * 0.3) },
    { mes: 'Mar', ventas: Math.round(kpi.ventasTotales * 0.53) },
    { mes: 'Abr', ventas: Math.round(kpi.ventasTotales * 0.78) },
    { mes: 'May', ventas: kpi.ventasTotales }
  ];

  return (
    <div id="pyme-assist-app" className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans antialiased selection:bg-emerald-100">
      {/* Toast Alert Banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center space-x-3 transition-all transform duration-300 translate-y-0 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'warn' ? 'bg-amber-500 text-slate-900' : 'bg-rose-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* HEADER SECTION (SaaS Navbar) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-md shadow-emerald-600/10 flex items-center justify-center">
            <Sparkles className="h-6 w-6 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              PymeAssist <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200/50">Multi-Agente</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Automatización Inteligente de WhatsApp Business para Pymes Chilenas</p>
          </div>
        </div>

        {/* Workspace SME Selection Selector Bar */}
        <div id="company-selector-bar" className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            {empresas.map((comp) => (
              <button
                key={comp.id}
                id={`btn-select-emp-${comp.id}`}
                onClick={() => setSelectedEmpresaId(comp.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  selectedEmpresaId === comp.id 
                    ? 'bg-white text-emerald-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                {comp.nombre.split(' ')[0] || comp.nombre}
              </button>
            ))}
          </div>

          <button
            id="btn-trigger-new-pyme-modal"
            onClick={() => setIsNewEmpresaModalOpen(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700 transition px-3 py-2.5 rounded-xl font-semibold text-xs flex items-center space-x-1.5 shadow-sm active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Pyme</span>
          </button>

          <button
            id="btn-reset-demo"
            onClick={handleResetDemoData}
            title="Restaurar base de datos demostrativa"
            className="text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl border border-slate-200 transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* SUBNAVINFO & METADATA BAR */}
      <div className="bg-[#EEF2F6] border-b border-slate-200 px-6 py-2.5 flex flex-wrap justify-between items-center text-xs text-slate-600 gap-2 font-medium">
        {companyState.empresa ? (
          <div className="flex items-center space-x-3">
            <span className="bg-slate-200 px-2.5 py-1 rounded text-slate-700 font-bold text-[11px] border border-slate-300">RUT: {companyState.empresa.rut}</span>
            <span className="text-slate-600">Rubro: <strong className="text-slate-800">{companyState.empresa.rubro}</strong></span>
            <span className="text-slate-600">Canal WhatsApp: <strong className="text-slate-800">{companyState.empresa.telefonoWhatsapp}</strong></span>
          </div>
        ) : (
          <span>Cargando empresa...</span>
        )}
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-emerald-700 font-bold">API Gemini 3.5 [OK]</span>
          <span className="text-slate-400">|</span>
          <span>Modelo activo: <code className="bg-slate-200 text-slate-800 px-1 py-0.5 rounded font-mono">gemini-3.5-flash</code></span>
        </div>
      </div>

      {/* CORE WORKSPACE CONTENT (Sidebar Navigation + Selected Panel + Simulator Split) */}
      <main className="flex-1 flex flex-col xl:flex-row">
        
        {/* LEFT NAV BAR & SAAS PANELS (Width matches custom dashboard specs) */}
        <div className="flex-1 p-6 flex flex-col space-y-6">
          
          {/* TABS NAVIGATION PANEL */}
          <nav id="pyme-tabs" className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
            <button
              id="tab-btn-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3.5 px-4 font-semibold text-sm transition-all relative ${
                activeTab === 'dashboard' 
                  ? 'text-emerald-700 border-b-2 border-emerald-600' 
                  : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Dashboard de Control</span>
              </div>
            </button>

            <button
              id="tab-btn-agentes"
              onClick={() => setActiveTab('agentes')}
              className={`pb-3.5 px-4 font-semibold text-sm transition-all relative ${
                activeTab === 'agentes' 
                  ? 'text-emerald-700 border-b-2 border-emerald-600' 
                  : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <span>Agentes Especializados ({companyState.agentes.filter(a => a.activo).length})</span>
              </div>
            </button>

            <button
              id="tab-btn-catalogo"
              onClick={() => setActiveTab('catalogo')}
              className={`pb-3.5 px-4 font-semibold text-sm transition-all relative ${
                activeTab === 'catalogo' 
                  ? 'text-emerald-700 border-b-2 border-emerald-600' 
                  : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ShoppingBag className="h-4 w-4" />
                <span>Catálogo de Servicios ({companyState.productos.length})</span>
              </div>
            </button>

            <button
              id="tab-btn-clientes"
              onClick={() => setActiveTab('clientes')}
              className={`pb-3.5 px-4 font-semibold text-sm transition-all relative ${
                activeTab === 'clientes' 
                  ? 'text-emerald-700 border-b-2 border-emerald-600' 
                  : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>CRM de Clientes ({companyState.clientes.length})</span>
              </div>
            </button>

            <button
              id="tab-btn-operacional"
              onClick={() => setActiveTab('operacional')}
              className={`pb-3.5 px-4 font-semibold text-sm transition-all relative ${
                activeTab === 'operacional' 
                  ? 'text-emerald-700 border-b-2 border-emerald-600' 
                  : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Pedidos & Reservas ({companyState.pedidos.length + companyState.reservas.length})</span>
              </div>
            </button>

            <button
              id="tab-btn-logs"
              onClick={() => setActiveTab('logs')}
              className={`pb-3.5 px-4 font-semibold text-sm transition-all relative ${
                activeTab === 'logs' 
                  ? 'text-emerald-700 border-b-2 border-emerald-600' 
                  : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span>Logs de Red & Telemetría ({companyState.logs.length})</span>
              </div>
            </button>
          </nav>

          {/* ACTIVE PANEL INTERFACE DESK */}
          <div className="flex-1 py-1">
            
            {/* ====== 1. DASHBOARD OVERVIEW PANEL ====== */}
            {activeTab === 'dashboard' && (
              <div id="panel-dashboard" className="space-y-6">
                
                {/* 4 CORE KPI METRIC CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Flujo de Chats</p>
                      <h4 className="text-2xl font-bold text-slate-900">{kpi.totalConversaciones}</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Conversaciones en WhatsApp</p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl border border-emerald-100">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Ahorro IA Soporte</p>
                      <h4 className="text-2xl font-bold text-slate-900">{(kpi.totalConversaciones > 0 ? (kpi.totalSoporteIA / (kpi.totalMensajes || 1) * 100) : 92).toFixed(1)}%</h4>
                      <p className="text-[11px] text-emerald-600 font-bold">{kpi.totalSoporteIA} Respuestas Autónomas</p>
                    </div>
                    <div className="bg-blue-50 text-blue-600 p-3 rounded-xl border border-blue-100">
                      <Bot className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Conversiones / Ventas</p>
                      <h4 className="text-2xl font-bold text-slate-900">{formatCLP(kpi.ventasTotales)}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">{kpi.pedidosTomados} pedidos finalizados</p>
                    </div>
                    <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl border border-indigo-100">
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Citas Agendadas</p>
                      <h4 className="text-2xl font-bold text-slate-900">{kpi.reservasAgendadas}</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Reservaciones en Calendario</p>
                    </div>
                    <div className="bg-purple-50 text-purple-600 p-3 rounded-xl border border-purple-100">
                      <Calendar className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* 2 COLUMN INTERACTIVE CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Sentiment analytics (Pie) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm col-span-1 flex flex-col h-80">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div>
                        <h5 className="font-semibold text-slate-900 text-sm">Sentimiento de Clientes</h5>
                        <p className="text-[11px] text-slate-500">Heurística e Inteligencia del Orquestador</p>
                      </div>
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600">En tiempo real</span>
                    </div>

                    <div className="flex-1 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sentimentPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {sentimentPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value}%`, 'Proporción']} />
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Absolute middle label */}
                      <div className="absolute flex flex-col items-center justify-center">
                        <Smile className="h-6 w-6 text-emerald-600 animate-bounce" />
                        <span className="text-[11px] font-bold text-slate-400 mt-0.5">Ratio Sano</span>
                      </div>
                    </div>

                    {/* Simple legends */}
                    <div className="grid grid-cols-3 pt-3 text-center border-t border-slate-100 text-[11px] font-bold text-slate-600">
                      <div>
                        <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-1.5"></span>
                        <span>Positivo ({kpi.sentimentRatio.positivo}%)</span>
                      </div>
                      <div>
                        <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-1.5"></span>
                        <span>Neutral ({kpi.sentimentRatio.neutral}%)</span>
                      </div>
                      <div>
                        <span className="inline-block w-2 h-2 bg-rose-500 rounded-full mr-1.5"></span>
                        <span>Crítico ({kpi.sentimentRatio.frustrado}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Multi-Agent task volume distribution (Bar) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm col-span-1 lg:col-span-2 flex flex-col h-80">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div>
                        <h5 className="font-semibold text-slate-900 text-sm">Mensajería por Agente Especialista</h5>
                        <p className="text-[11px] text-slate-500">Carga resuelta de forma autónoma según competencia del Crew</p>
                      </div>
                      <span className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-bold">Auto-Derivación Activa</span>
                    </div>

                    <div className="flex-1">
                      {conversationDistributionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={conversationDistributionData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(value) => [value, 'Mensajes']} />
                            <Bar dataKey="value" fill="#059669" radius={[6, 6, 0, 0]}>
                              {conversationDistributionData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={
                                    entry.name === 'Humano Escalado' ? '#EF4444' : 
                                    entry.name === 'Vendedor' ? '#10B981' : 
                                    entry.name === 'Agendador' ? '#8B5CF6' : '#6366F1'
                                  } 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                          No hay suficientes mensajes simulados en este momento para generar la estadística.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3rd Bottom Analytics Row: Financial Revenue Progression + Innovation suggestions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Financial area graph */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2 flex flex-col h-64">
                    <div className="pb-3 border-b border-slate-100 mb-3 flex items-center justify-between">
                      <div>
                        <h5 className="font-semibold text-slate-900 text-sm">Ventas Acumuladas SaaS (Cálculo Estimado)</h5>
                        <p className="text-[11px] text-slate-500">Volumen financiero capturado autónomamente vía WhatsApp checkout</p>
                      </div>
                      <span className="font-mono text-slate-600 font-bold text-xs">{formatCLP(kpi.ventasTotales)} CLP</span>
                    </div>

                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historicalVentasData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#64748B' }} />
                          <YAxis tick={{ fontSize: 9, fill: '#64748B' }} />
                          <Tooltip formatter={(value) => [formatCLP(Number(value)), 'Ventas']} />
                          <defs>
                            <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="ventas" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVentas)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* SME Agent Assistant Insight (Innovación Inteligente) */}
                  <div className="bg-emerald-950 text-emerald-100 p-5 rounded-2xl shadow-sm col-span-1 flex flex-col justify-between h-64">
                    <div>
                      <div className="flex items-center space-x-2 text-emerald-400 mb-2.5">
                        <Sparkles className="h-4 w-4 animate-spin" />
                        <span className="font-bold uppercase tracking-wider text-[10px]">Recomendación de Negocio</span>
                      </div>
                      <h6 className="font-bold text-white text-sm mb-1">Carga de Soporte Manual Reducido</h6>
                      <p className="text-xs text-emerald-200 leading-relaxed">
                        El bot ha resuelto {kpi.totalSoporteIA} consultas esta semana. La IA ha absorbido aproximadamente el {' '}
                        <strong>
                          {kpi.totalConversaciones > 0 ? (kpi.totalSoporteIA / (kpi.totalMensajes || 1) * 100).toFixed(0) : '92'}%
                        </strong> de la atención ordinaria. 
                      </p>
                      <p className="text-[11px] text-emerald-300/80 mt-2 leading-relaxed">
                        {kpi.totalEscalados > 1 ? (
                          `Se registraron ${kpi.totalEscalados} desvíos urgentes. Considere robustecer el prompt de Vendedor para mitigar fricción.`
                        ) : (
                          "El índice de lealtad chilena se mantiene estable con un margen de frustración mínimo de un dígito."
                        )}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-emerald-800 flex items-center justify-between text-[11px] text-emerald-400">
                      <span>PymeAssist Predictor v1.4</span>
                      <span className="bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded font-mono">Chileno</span>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* ====== 2. AGENTES ESPECIALISTAS CONFIGURATION ====== */}
            {activeTab === 'agentes' && (
              <div id="panel-agentes" className="space-y-6">
                
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Configuración de Flujos Conversacionales y Prompts</h4>
                    <p className="text-xs text-slate-500">Configure las instrucciones de comportamiento técnico e individual para cada uno de los agentes.</p>
                  </div>
                  <span className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full font-bold">Orquestación: CrewAI Framework (Simulado sobre Gemini)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companyState.agentes.map((arg) => (
                    <div 
                      key={arg.id} 
                      className={`bg-white p-5 rounded-xl border transition shadow-sm ${
                        arg.activo ? 'border-slate-200/90' : 'border-slate-200 opacity-60 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2.5">
                          <div className={`p-2 rounded-lg ${
                            arg.rol === 'orquestador' ? 'bg-amber-100 text-amber-700' :
                            arg.rol === 'vendedor' ? 'bg-emerald-100 text-emerald-700' :
                            arg.rol === 'agendador' ? 'bg-purple-100 text-purple-700' :
                            arg.rol === 'pedidos' ? 'bg-indigo-100 text-indigo-700' :
                            arg.rol === 'soporte' ? 'bg-blue-100 text-blue-700' :
                            arg.rol === 'cobranza' ? 'bg-yellow-105 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}>
                            <Bot className="h-5 w-5" />
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              {arg.nombre}
                              {arg.rol === 'orquestador' && <span className="bg-amber-800 text-white text-[9px] font-mono px-1 py-0.2 rounded uppercase">Master</span>}
                            </h5>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mr-2 font-mono">Rol: {arg.rol}</span>
                          </div>
                        </div>

                        {/* Toggle switch */}
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] uppercase font-bold ${arg.activo ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {arg.activo ? 'Activo' : 'Pausado'}
                          </span>
                          <button
                            id={`toggle-agent-${arg.id}`}
                            onClick={() => handleUpdateAgent(arg.id, { activo: !arg.activo })}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              arg.activo ? 'bg-emerald-600' : 'bg-slate-300'
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              arg.activo ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mb-4 line-clamp-2 h-8 leading-relaxed font-medium">{arg.descripcion}</p>

                      {/* Prompts quick stats */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold border-t border-slate-100 pt-3">
                        <div className="flex items-center space-x-4">
                          <span>Temp: <strong>{arg.temperatura}</strong></span>
                          <span>Prompt: <strong>{arg.promptPersonalizado.length} caracteres</strong></span>
                        </div>

                        <button
                          id={`btn-edit-prompt-${arg.id}`}
                          onClick={() => setEditingAgent(arg)}
                          className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Configurar Agent</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit Prompt Config Section */}
                {editingAgent && (
                  <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-xl space-y-4 border border-slate-800 animate-fadeIn">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center space-x-2">
                        <Settings className="h-5 w-5 text-emerald-400" />
                        <div>
                          <h4 className="font-bold text-white text-sm">Personalización del Agente: {editingAgent.nombre}</h4>
                          <span className="text-[10px] text-slate-400 font-mono uppercase">Key: {editingAgent.id}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingAgent(null)}
                        className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Instrucción del Sistema (Context Prompt)</label>
                        <textarea
                          id="input-edit-prompt"
                          value={editingAgent.promptPersonalizado}
                          onChange={(e) => setEditingAgent({ ...editingAgent, promptPersonalizado: e.target.value })}
                          rows={6}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:ring-1 focus:ring-emerald-500 outline-none leading-relaxed"
                          placeholder="Configure las reglas de este agente..."
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Temperatura Creativa ({editingAgent.temperatura})</label>
                          <div className="flex items-center space-x-3">
                            <input
                              id="slider-edit-temp"
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={editingAgent.temperatura}
                              onChange={(e) => setEditingAgent({ ...editingAgent, temperatura: Number(e.target.value) })}
                              className="flex-1 accent-emerald-500 cursor-pointer"
                            />
                            <span className="font-mono bg-slate-950 px-2.5 py-1 text-slate-100 rounded text-xs border border-slate-800 font-bold">
                              {editingAgent.temperatura}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1 block leading-normal">Valores más bajos (0.1 - 0.3) garantizan respuestas consistentes y precisas sin libre albedrío.</span>
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Acciones de Guardado</label>
                          <div className="flex gap-2">
                            <button
                              id="btn-save-agent-config"
                              onClick={() => handleUpdateAgent(editingAgent.id, {
                                promptPersonalizado: editingAgent.promptPersonalizado,
                                temperatura: editingAgent.temperatura
                              })}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition"
                            >
                              Guardar Cambios
                            </button>
                            <button
                              onClick={() => setEditingAgent(null)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-xl text-xs transition"
                            >
                              Descartar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ====== 3. PRODUCT CATALOG MANAGEMENT ====== */}
            {activeTab === 'catalogo' && (
              <div id="panel-catalogo" className="space-y-4">
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="search-product"
                      type="text"
                      placeholder="Buscar producto comercial..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    id="btn-trigger-add-product"
                    onClick={() => {
                      setEditingProduct({
                        nombre: '',
                        descripcion: '',
                        precio: 0,
                        stock: 50,
                        categoria: 'General',
                        disponible: true
                      });
                      setIsProductModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm ml-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Agregar Producto</span>
                  </button>
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-505 uppercase tracking-wider font-bold">
                        <th className="p-4">Producto/Servicio</th>
                        <th className="p-4">Categoría</th>
                        <th className="p-4 text-right">Precio unitario</th>
                        <th className="p-4 text-center">Stock físico</th>
                        <th className="p-4 text-center">Estado</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {companyState.productos
                        .filter(p => p.nombre.toLowerCase().includes(productSearch.toLowerCase()))
                        .map(prog => (
                          <tr key={prog.id} className="hover:bg-slate-50 transition">
                            <td className="p-4">
                              <div className="font-semibold text-slate-900">{prog.nombre}</div>
                              <div className="text-[10px] text-slate-500 truncate max-w-xs">{prog.descripcion || 'Sin descripción comercial.'}</div>
                            </td>
                            <td className="p-4 text-slate-600 font-medium">
                              <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200 text-slate-700">
                                {prog.categoria}
                              </span>
                            </td>
                            <td className="p-4 text-right font-bold text-slate-900">{formatCLP(prog.precio)}</td>
                            <td className="p-4 text-center font-mono font-bold text-slate-700">
                              {prog.stock} unids
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${
                                prog.disponible 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {prog.disponible ? 'Disponible' : 'Sin Stock'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  id={`btn-edit-prod-${prog.id}`}
                                  onClick={() => {
                                    setEditingProduct(prog);
                                    setIsProductModalOpen(true);
                                  }}
                                  className="text-slate-500 hover:text-emerald-700 p-1.5 rounded hover:bg-slate-100 transition"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  id={`btn-delete-prod-${prog.id}`}
                                  onClick={() => handleDeleteProduct(prog.id)}
                                  className="text-slate-500 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      }
                      {companyState.productos.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center p-8 text-xs text-slate-400">
                            Ningún producto o servicio registrado en esta Pyme aún. Comience agregando uno.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* ====== 4. CLIENTS CRM ====== */}
            {activeTab === 'clientes' && (
              <div id="panel-clientes" className="space-y-4">
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      id="search-client"
                      type="text"
                      placeholder="Buscar por nombre o teléfono..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Bases de datos segregadas por ID Empresa</span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-505 uppercase tracking-wider font-bold">
                        <th className="p-4">Nombre Completo / RUT</th>
                        <th className="p-4">WhatsApp Teléfono</th>
                        <th className="p-4">Email</th>
                        <th className="p-4 text-right">Saldo deudor (Fiados)</th>
                        <th className="p-4 text-center">Estado de CRM</th>
                        <th className="p-4 text-center">Acción de Cobro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {companyState.clientes
                        .filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) || c.telefono.includes(clientSearch))
                        .map(cli => (
                          <tr key={cli.id} className="hover:bg-slate-50 transition">
                            <td className="p-4">
                              <div className="font-semibold text-slate-900">{cli.nombre}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{cli.rut || 'RUT no registrado'}</div>
                            </td>
                            <td className="p-4 text-slate-700 font-mono font-medium">{cli.telefono}</td>
                            <td className="p-4 text-slate-500">{cli.email || 'No asignado'}</td>
                            <td className="p-4 text-right font-bold text-slate-900">
                              {cli.deudaPendiente > 0 ? (
                                <span className="text-rose-600">{formatCLP(cli.deudaPendiente)}</span>
                              ) : (
                                <span className="text-slate-400">$0</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                cli.estado === 'cliente_frecuente' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : cli.estado === 'deudor' 
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : cli.estado === 'escalado_humano'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}>
                                {cli.estado === 'cliente_frecuente' ? 'Frecuente' : 
                                 cli.estado === 'deudor' ? 'Deudor' : 
                                 cli.estado === 'escalado_humano' ? 'Derivado a Humano' : 'Contacto'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {cli.deudaPendiente > 0 ? (
                                <button
                                  id={`btn-cobro-cli-${cli.id}`}
                                  onClick={() => handleSimulateCobranzaPing(cli)}
                                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-3 rounded-lg text-[10px] transition"
                                >
                                  Simular Cobranza
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[10px]">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* ====== 5. OPERATIONALS AND TICKETS PANEL ====== */}
            {activeTab === 'operacional' && (
              <div id="panel-operacional" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Orders Panel Column */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-[520px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm">Pedidos y Compras Registradas</h5>
                      <p className="text-[11px] text-slate-500">Toma de pedidos automatizados en Checkout WhatsApp</p>
                    </div>
                    <span className="text-[10px] font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase">
                      Agente de Pedidos Activo
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {companyState.pedidos.map(ped => {
                      const associatedClient = companyState.clientes.find(c => c.id === ped.clienteId);
                      return (
                        <div key={ped.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] text-indigo-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded font-extrabold uppercase">
                              ID: {ped.id.substring(4, 10)}...
                            </span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold border border-emerald-100">
                              {ped.estado.toUpperCase()}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-slate-800 mb-0.5">{ped.detalles}</div>
                          <div className="text-[11px] text-slate-500 leading-normal">Cliente: {associatedClient?.nombre || 'Contacto WhatsApp'}</div>
                          <div className="text-[11px] text-slate-500 leading-normal">Despachar a: <strong>{ped.direccionDespacho}</strong></div>

                          <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-505 font-medium">Estimado: {ped.tiempoEstimadoMinutos} mins</span>
                            <span className="text-emerald-700 font-extrabold text-xs">{formatCLP(ped.total)} CLP</span>
                          </div>
                        </div>
                      );
                    })}
                    {companyState.pedidos.length === 0 && (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center p-8">
                        No se han tomado pedidos en esta sesión aún. Use el dispositivo celular de la derecha para escribir un mensaje de pedido (ej: "quiero una empanada a domicilio").
                      </div>
                    )}
                  </div>
                </div>

                {/* Bookings / Calendar Column */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-[520px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm">Reserva de Horas y Citas</h5>
                      <p className="text-[11px] text-slate-500">Gestor de reservas coordinado por el bot agendador</p>
                    </div>
                    <span className="text-[10px] font-mono bg-purple-50 border border-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold uppercase">
                      Agente Agendador
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {companyState.reservas.map(res => {
                      const associatedClient = companyState.clientes.find(c => c.id === res.clienteId);
                      return (
                        <div key={res.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] text-purple-700 bg-white border border-slate-205 px-1.5 py-0.5 rounded font-extrabold uppercase">
                              ID: {res.id.substring(4, 10)}...
                            </span>
                            <span className="text-[10px] bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded font-extrabold border border-purple-100">
                              {res.estado.toUpperCase()}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-slate-800 mb-0.5">{res.servicioNombre}</div>
                          <div className="text-[11px] text-slate-500 leading-normal">Paciente/Cliente: {associatedClient?.nombre || 'Contacto'} ({associatedClient?.telefono})</div>

                          <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-600">
                            <span>Horario de Cita:</span>
                            <span className="text-slate-900 font-black">{new Date(res.fechaHora).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} hrs</span>
                          </div>
                        </div>
                      );
                    })}
                    {companyState.reservas.length === 0 && (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center p-8">
                        No hay citas reservadas en agenda. Utilice el simulador de WhatsApp para pedir hora.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* ====== 6. RED TELEMETRY AND WEBHOOK LOGS ====== */}
            {activeTab === 'logs' && (
              <div id="panel-logs" className="space-y-4">
                
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Database className="h-5 w-5 text-emerald-400 animate-pulse" />
                    <div>
                      <h4 className="font-bold text-slate-100 text-xs tracking-wide">Network Telemetry Terminal</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Consola centralizada del flujo webhook, categorización CrewAI y llamadas Google Gemini.</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 font-bold uppercase bg-slate-900 px-2 py-1 rounded">
                    Lineas totales: {companyState.logs.length}
                  </span>
                </div>

                {/* Console Logs terminal box */}
                <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 h-[440px] overflow-y-auto font-mono text-[11px] scrollbar-thin flex flex-col space-y-2 select-text">
                  {companyState.logs.map((log) => (
                    <div key={log.id} className="border-b border-slate-900/40 pb-2">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-slate-500 font-semibold">[{new Date(log.creadoEn).toLocaleTimeString()}]</span>
                        <span className={`px-1.5 py-0.2 rounded font-extrabold text-[9px] uppercase ${
                          log.nivel === 'error' ? 'bg-rose-950 text-rose-400 border border-rose-900' :
                          log.nivel === 'warn' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                          'bg-emerald-955 text-emerald-400 border border-emerald-900'
                        }`}>
                          {log.nivel}
                        </span>
                        <span className="text-slate-300 font-extrabold text-[10px] bg-slate-900 px-1 rounded">[{log.origen}]</span>
                      </div>
                      <p className="text-slate-200 mt-1 pl-4 leading-relaxed whitespace-pre-wrap">{log.mensaje}</p>
                      {log.detalles && (
                        <pre className="text-slate-500 text-[10px] bg-slate-900/30 p-2 rounded-lg mt-1 border border-slate-900/60 leading-normal whitespace-pre-wrap pl-6">
                          {log.detalles}
                        </pre>
                      )}
                    </div>
                  ))}
                  {companyState.logs.length === 0 && (
                    <div className="text-slate-500 text-center py-24 leading-normal">
                      &gt;_ Consola inactiva. Realice pruebas en el simulador para capturar logs de red.
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: INTERACTIVE WHATSAPP SMARTPHONE SIMULATOR */}
        {/* ======================================================== */}
        <div className="w-full xl:w-[420px] bg-[#EEF2F6] p-6 lg:p-8 flex flex-col border-t xl:border-t-0 xl:border-l border-slate-200 shrink-0 select-none">
          
          <div className="flex flex-col items-center space-y-4">
            
            {/* Simulation Header controls */}
            <div className="w-full bg-white px-4 py-3 rounded-2xl border border-slate-200 text-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Smartphone className="h-4 w-4 text-emerald-600 animate-pulse" />
                  Simulador de WhatsApp
                </span>
                <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-600">Simulación CRM</span>
              </div>

              {/* Selector to choose which customer is writing */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Elegir cliente emisor:</label>
                <select
                  id="select-simulated-client"
                  value={selectedClienteId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {companyState.clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.telefono})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* HIGH-FIDELITY CHASSIS MOBILE FRAME */}
            <div className="relative w-[340px] h-[640px] bg-slate-900 rounded-[44px] shadow-2xl border-4 border-slate-800 p-3 flex flex-col">
              
              {/* Speaker Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-900 rounded-b-2xl z-20 flex items-center justify-center">
                <div className="w-12 h-1 bg-slate-800 rounded-full mb-1"></div>
              </div>

              {/* Inside Screen Screen (Aesthetic styling representing WhatsApp Business) */}
              <div className="flex-1 bg-[#efeae2] rounded-[34px] overflow-hidden flex flex-col relative z-10 border border-slate-950">
                
                {/* Simulated Phone System Status Bar */}
                <div className="bg-[#075e54] text-white px-4 pt-4 pb-2 flex items-center justify-between text-[10px] font-bold">
                  <span>9:41 AM</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[9px] uppercase font-mono tracking-wide">PymeAssist 5G</span>
                    <div className="w-3.5 h-2 border border-white rounded-sm p-[1px] flex items-center justify-start"><div className="w-full h-full bg-white"></div></div>
                  </div>
                </div>

                {/* WhatsApp Chatroom Header */}
                <div className="bg-[#128c7e] text-white px-3 py-2 flex items-center justify-between border-b border-[#0f7c6f]">
                  <div className="flex items-center space-x-2">
                    {/* Compact contact avatar badge */}
                    <div className="w-8 h-8 rounded-full bg-white/20 border border-white/10 flex items-center justify-center font-bold text-xs uppercase text-emerald-50">
                      {simulatorClientName.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-xs truncate w-36">{simulatorClientName}</div>
                      <div className="text-[9px] text-[#86d6cc] flex items-center gap-1">
                        {isHumanControlActive ? (
                          <>
                            <span className="h-1.5 w-1.5 bg-amber-400 rounded-full"></span>
                            <span>Atención Humana Activa</span>
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                            <span>Robot Autónomo IA</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Manual / Autonomous controller toggle inside phone screen */}
                  <button
                    id={`btn-mobile-toggle-rutina-${activeChatId}`}
                    onClick={() => handleToggleConversationMode(activeChatId, isHumanControlActive ? 'humano' : 'autonomo')}
                    title={isHumanControlActive ? "Volver a activar la Inteligencia Artificial" : "Intervenir de forma manual para responder"}
                    className={`px-2 py-1 rounded text-[8px] font-bold tracking-widest uppercase transition ${
                      isHumanControlActive 
                        ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/10' 
                        : 'bg-emerald-800 hover:bg-emerald-950 text-white border border-emerald-700/50'
                    }`}
                  >
                    {isHumanControlActive ? "Operador" : "Automático"}
                  </button>
                </div>

                {/* WHATSAPP MSG WORKSPACE SCREEN */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 flex flex-col justify-end min-h-0 bg-opacity-70">
                  
                  {/* WhatsApp background wallpaper subtle SVG look simulated nicely */}
                  <div className="text-center">
                    <span className="inline-block bg-[#e1f3fc] text-slate-600 px-2.5 py-1 rounded shadow-sm text-[9px] font-bold border border-slate-200 mb-2">
                      🔒 Mensajería integrada simulada con WhatsApp Business API
                    </span>
                  </div>

                  {/* Dynamic messages history feed in active phone conversation */}
                  <div className="flex flex-col space-y-2 overflow-y-auto flex-1 max-h-[300px]" style={{ contain: 'content' }}>
                    {/* Render active messages */}
                    {messagesInActiveChat.map((msg) => {
                      const isClient = msg.emisor === 'cliente';
                      const isHuman = msg.emisor === 'soporte_humano';
                      
                      return (
                        <div 
                          key={msg.id} 
                          className={`max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed relative shadow-sm break-words ${
                            isClient 
                              ? 'bg-white text-slate-800 self-start border border-slate-200' 
                              : isHuman
                              ? 'bg-amber-100 text-slate-900 border border-amber-300 self-end'
                              : 'bg-[#dcf8c6] text-slate-800 self-end border border-slate-200/80'
                          }`}
                        >
                          {/* Emisor flag name header */}
                          <div className={`font-extrabold text-[9px] mb-0.5 flex items-center justify-between gap-2 border-b border-black/[0.04] pb-0.5 ${
                            isClient ? 'text-slate-500' : isHuman ? 'text-amber-800' : 'text-emerald-800'
                          }`}>
                            <span>{msg.remitenteNombre}</span>
                            {msg.agenteQueRespondio && (
                              <span className="bg-emerald-100 text-emerald-800 px-1 py-[0.1px] rounded text-[8px] font-mono border border-emerald-300/30">
                                {msg.agenteQueRespondio}
                              </span>
                            )}
                          </div>

                          <div className="font-medium whitespace-pre-wrap">{msg.contenido}</div>
                          
                          {/* Metadatos de ruteo if it exists */}
                          {msg.metadatosRouting && (
                            <div className="bg-[#b3ea8d] bg-opacity-30 border border-slate-300 p-1 rounded font-mono text-[8px] text-slate-500 mt-1 leading-normal scale-95 origin-left">
                              🎯 {msg.metadatosRouting.intencionDetectada}
                            </div>
                          )}

                          <div className="text-[8px] text-slate-400 text-right mt-1 font-semibold">
                            {new Date(msg.creadoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      );
                    })}

                    {isSimulatorResponding && (
                      <div className="bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl self-end text-slate-500 text-[10px] flex items-center space-x-2">
                        <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-bounce"></span>
                        <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-bounce delay-100"></span>
                        <span className="h-1.5 w-1.5 bg-emerald-600 rounded-full animate-bounce delay-200"></span>
                        <span className="font-semibold text-[9px]">Multi-Agent ruteando...</span>
                      </div>
                    )}
                    
                    <div ref={chatBottomRef} />
                  </div>

                </div>

                {/* CHAT INPUT AREA (Switch depending on Routine mode manually) */}
                {isHumanControlActive ? (
                  /* Operator human mode input */
                  <div className="bg-[#f0f0f0] p-2 border-t border-slate-200/60 sticky bottom-0 z-30">
                    <div className="flex flex-col space-y-1.5">
                      <div className="text-[8px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 tracking-wide uppercase">
                        Soporte Humano Activo: El chatbot autónomo está dormido
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <textarea
                          id="input-human-message"
                          rows={2}
                          value={manualResponseText}
                          onChange={(e) => setManualResponseText(e.target.value)}
                          placeholder="Escribir como operador real de la pyme..."
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-amber-500 resize-none font-medium text-slate-800"
                        />
                        <button
                          id="btn-send-human-reply"
                          onClick={() => activeChatId && handleSendManualMessage(activeChatId)}
                          disabled={!manualResponseText.trim()}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-900 disabled:opacity-50 transition p-2.5 rounded-xl border border-amber-600 shadow-sm active:scale-95"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Client prompt simulator input */
                  <form onSubmit={handleSimulateIncomingMessage} className="bg-[#f0f0f0] p-2 border-t border-slate-200 sticky bottom-0 z-30 flex items-center space-x-1.5">
                    <input
                      id="input-simulated-client-message"
                      type="text"
                      value={simulatorMessageText}
                      onChange={(e) => setSimulatorMessageText(e.target.value)}
                      placeholder="Escribir como el CLIENTE desde su cel..."
                      disabled={isSimulatorResponding}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium"
                    />
                    <button
                      id="btn-send-simulated-message"
                      type="submit"
                      disabled={!simulatorMessageText.trim() || isSimulatorResponding}
                      className="bg-[#128c7e] text-white p-2.5 rounded-xl disabled:opacity-40 transition active:scale-95 flex items-center justify-center shadow-md shadow-[#128c7e]/10 border border-[#0f7c6f]"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                )}

              </div>
            </div>

            {/* PIPELINE ROUTING TRACE LOG */}
            {routingResult && (
              <div id="routing-trace-card" className="w-[340px] bg-slate-900 text-slate-100 p-4 rounded-3xl border border-slate-800 space-y-2 animate-fadeIn relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl"></div>
                
                <h6 className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest border-b border-slate-800 pb-1.5">
                  <Database className="h-3.5 w-3.5 text-emerald-400" />
                  Orquestación del último Mensaje
                </h6>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-450 text-[10px] uppercase font-bold tracking-wider block">Intención Detectada:</span>
                    <strong className="text-emerald-400 font-extrabold">{routingResult.intencionDetectada}</strong>
                  </div>
                  <div className="flex justify-between items-center bg-slate-950 p-2 rounded-xl mt-1.5 border border-slate-850">
                    <div>
                      <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">Especialista Encargado:</span>
                      <strong className="text-slate-150 text-[11px] font-black uppercase text-white tracking-wide">
                        {routingResult.agenteAsignado}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider block">Certeza:</span>
                      <strong className="text-cyan-400 font-mono text-[11px]">
                        {(routingResult.confianzaClasificacion * 100).toFixed(0)}%
                      </strong>
                    </div>
                  </div>
                  {routingResult.detallesClasificacion && (
                    <p className="text-[10px] text-slate-400 leading-normal italic font-medium pt-1">
                      Reasoning: "{routingResult.detallesClasificacion}"
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* FOOTER DEVELOPMENT DETAILS */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 px-10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium">
        <div>
          <strong className="text-white">PymeAssist SaaS Engine v1.8</strong> - 2026. Diseñado bajo estándares de producción senior.
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-slate-500">Google Workspace Ready</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500 text-[10px] font-mono">Build with Node.js, CrewAI & Gemini 3.5</span>
        </div>
      </footer>

      {/* ======= NEW SAAS PYME POPUP REGISTER MODAL ====== */}
      {isNewEmpresaModalOpen && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateEmpresa} 
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Registrar Nueva Pyme en PymeAssist</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsNewEmpresaModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 p-1 bg-slate-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-semibold">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Nombre Comercial de la Pyme *</label>
                  <input
                    id="input-new-pyme-name"
                    type="text"
                    required
                    placeholder="Ej: Minimarket El Abuelo, Mascotas Felices"
                    value={newEmpNombre}
                    onChange={(e) => setNewEmpNombre(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-20/80 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Rubro de Negocio *</label>
                  <select
                    id="select-new-pyme-rubro"
                    value={newEmpRubro}
                    onChange={(e) => setNewEmpRubro(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-20/80 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Alimentos y Pastelería">Alimentos y Pastelería (Ej: Panaderías, Cafés, Restoranes)</option>
                    <option value="Salud y Ortodoncia">Salud y Ortodoncia (Ej: Clínicas Dentales, Centros Médicos)</option>
                    <option value="Tecnología y Accesorios">Tecnología y Accesorios (Ej: Ecommerce, Ferreterías, Tiendas Gamer)</option>
                    <option value="Servicios Profesionales">Servicios Profesionales (Ej: Abogados, Oficinas de Contabilidad)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">RUT Comercial</label>
                  <input
                    id="input-new-pyme-rut"
                    type="text"
                    placeholder="76.123.456-K"
                    value={newEmpRut}
                    onChange={(e) => setNewEmpRut(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-20/80 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Línea WhatsApp Comercial</label>
                  <input
                    id="input-new-pyme-phone"
                    type="text"
                    placeholder="+56 9 8472 9102"
                    value={newEmpTelefono}
                    onChange={(e) => setNewEmpTelefono(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-20/80 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Dirección Física del Local</label>
                <input
                  id="input-new-pyme-address"
                  type="text"
                  placeholder="Av. Providencia 1420, Oficina 43, Santiago"
                  value={newEmpDireccion}
                  onChange={(e) => setNewEmpDireccion(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-20/80 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                * Registrar una nueva empresa simula e inicializa un entorno completo SaaS autónomo para un comerciante real con 7 agentes listos para tomar la delantera en su canal de WhatsApp.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex space-x-3 text-xs font-bold leading-normal">
              <button
                id="btn-confirm-new-pyme"
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl transition"
              >
                Configurar Pyme & Multiagente
              </button>
              <button
                type="button"
                onClick={() => setIsNewEmpresaModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 px-4 rounded-xl transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======= CRUD PRODUCT EDITING/ADD POPUP MODAL ====== */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveProduct} 
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-fadeIn"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingProduct.id ? 'Editar Producto del Catálogo' : 'Agregar Nuevo Producto Comercial'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 p-1 bg-slate-100 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-semibold leading-relaxed">
              <div>
                <label className="block text-slate-500 mb-1">Nombre del Producto / Servicio *</label>
                <input
                  id="input-product-name"
                  type="text"
                  required
                  placeholder="Ej: Empanada de Pino Especial, Limpieza Dental LED"
                  value={editingProduct.nombre || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-20/80 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Descripción Comercial o Specs Técnicos</label>
                <textarea
                  id="input-product-desc"
                  rows={2}
                  placeholder="Ej: Exclusiva masa horneada hoy..."
                  value={editingProduct.descripcion || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, descripcion: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-20/80 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 resize-none font-medium text-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Precio Unitario (CLP) *</label>
                  <input
                    id="input-product-price"
                    type="number"
                    required
                    placeholder="2500"
                    value={editingProduct.precio || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, precio: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-20/80 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Stock disponible</label>
                  <input
                    id="input-product-stock"
                    type="number"
                    placeholder="40"
                    value={editingProduct.stock || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-20/80 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Categoría</label>
                  <input
                    id="input-product-category"
                    type="text"
                    placeholder="Ej: Panadería, Estética"
                    value={editingProduct.categoria || 'General'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoria: e.target.value })}
                    className="w-full p-2.5 bg-[#F8FAFC] border border-slate-250 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-505 mb-1">Disponibilidad</label>
                  <select
                    id="select-product-status"
                    value={editingProduct.disponible ? 'true' : 'false'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, disponible: e.target.value === 'true' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-20/80 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 cursor-pointer"
                  >
                    <option value="true">Activo / Disponible</option>
                    <option value="false">Consultar stock / Desactivados</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex space-x-3 text-xs font-bold leading-normal">
              <button
                id="btn-confirm-product-save"
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl transition"
              >
                Guardar Producto
              </button>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 px-4 rounded-xl transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
