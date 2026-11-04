import { http, HttpResponse, type RequestHandler } from 'msw'

// Módulo Asesor (CRM). Endpoints provisionales (por confirmar): el backend todavía no los tiene.
// Datos del diseño de Figma; las guías existen en el TMS simulado del backend.
const api = (path: string) => `*/api/v1${path}`

const T0 = Date.now()
const ago = (min: number) => new Date(T0 - min * 60_000).toISOString()
const inMin = (min: number) => new Date(T0 + min * 60_000).toISOString()

type Funnel = 'ventas' | 'casos' | 'bot'

const STAGES: Record<Funnel, { id: string; nombre: string }[]> = {
  ventas: [
    { id: 'nuevas', nombre: 'Nuevas Cotizaciones (Bot)' },
    { id: 'contacto', nombre: 'En Contacto / Llamada' },
    { id: 'negociacion', nombre: 'Negociación B2B/B2C' },
    { id: 'cerrada', nombre: 'Venta Cerrada (Guía Creada)' },
    { id: 'descartada', nombre: 'Descartada' },
  ],
  casos: [
    { id: 'escalados', nombre: 'Escalados por IA (Prioritarios)' },
    { id: 'gestion', nombre: 'En Gestión Humana' },
    { id: 'validando', nombre: 'Validando con Operaciones' },
    { id: 'resuelto', nombre: 'Resuelto' },
  ],
  bot: [
    { id: 'nutricion', nombre: 'Bot: Nutrición Inicial (Enviado resumen)' },
    { id: 'recordatorio', nombre: 'Bot: Recordatorio 24h (Esperando respuesta)' },
    { id: 'reactivado', nombre: 'Bot: Reactivado por Cliente (Listo para Asesor)' },
    { id: 'expirado', nombre: 'Expirado sin respuesta' },
  ],
}

interface Quote {
  codigo: string
  origen: string
  destino: string
  valor_cop: number
  peso_kg: number
  tipo_carga: string
}

interface Lead {
  id: string
  embudo: Funnel
  etapa: string
  creado_at: string
  nombre: string
  telefono: string
  correo: string | null
  empresa: string | null
  segmento: 'B2B' | 'B2C'
  cotizacion: Quote | null
  caso?: {
    codigo: string
    prioridad: 'ALTA' | 'MEDIA' | 'BAJA'
    motivo: string
    confianza: number
    sla_vence_at: string | null
  }
  bot?: {
    estado: 'ACTIVO' | 'REACTIVADO' | 'SIN_RESPUESTA'
    intento: number
    proxima_accion: string
  }
  guia: string | null
  notas: Note[]
  transcripcion?: { rol: 'BOT' | 'CLIENTE'; texto: string; timestamp: string }[]
}

interface Note {
  id: string
  autor: string
  tipo: 'LLAMADA' | 'NOTA' | 'SISTEMA'
  resultado: 'CONTESTO' | 'NO_CONTESTO' | 'BUZON' | null
  texto: string
  recordatorio_at: string | null
  timestamp: string
}

const ADVISOR = 'Camila Rojas'
let advisorStatus: 'DISPONIBLE' | 'OCUPADO' = 'DISPONIBLE'

const sysNote = (texto: string, timestamp: string): Note => ({
  id: crypto.randomUUID(),
  autor: 'Sistema',
  tipo: 'SISTEMA',
  resultado: null,
  texto,
  recordatorio_at: null,
  timestamp,
})

const sale = (
  id: string,
  etapa: string,
  min: number,
  nombre: string,
  telefono: string,
  segmento: 'B2B' | 'B2C',
  q: Quote,
  extra: Partial<Lead> = {},
): Lead => ({
  id,
  embudo: 'ventas',
  etapa,
  creado_at: ago(min),
  nombre,
  telefono,
  correo: null,
  empresa: null,
  segmento,
  cotizacion: q,
  guia: null,
  notas: [
    sysNote(
      `Lead creado por el bot web al capturar el teléfono (cotización ${q.codigo}).`,
      ago(min),
    ),
  ],
  ...extra,
})

const leads: Lead[] = [
  sale(
    'L-99201',
    'nuevas',
    8,
    'María González',
    '+57 310 456 7890',
    'B2B',
    {
      codigo: 'COT-99201',
      origen: 'Bogotá',
      destino: 'Cali',
      valor_cop: 340000,
      peso_kg: 120,
      tipo_carga: 'Mercancía General',
    },
    {
      correo: 'compras@importadoraandina.com.co',
      empresa: 'Importadora Andina S.A.S.',
      notas: [
        {
          id: 'n-1',
          autor: ADVISOR,
          tipo: 'LLAMADA',
          resultado: 'CONTESTO',
          texto: 'Primer contacto. Quedó en enviar orden de compra firmada.',
          recordatorio_at: null,
          timestamp: ago(2),
        },
        sysNote('Lead asignado a Camila Rojas por el bot (cotización B2B).', ago(8)),
      ],
      transcripcion: [
        {
          rol: 'BOT',
          texto: 'Hola, soy el asistente de TransLogix. ¿Qué envío necesitas cotizar hoy?',
          timestamp: ago(14),
        },
        {
          rol: 'CLIENTE',
          texto: 'Necesito enviar repuestos industriales de Bogotá a Cali, son 120 kg.',
          timestamp: ago(13),
        },
        {
          rol: 'BOT',
          texto: '¿Cuál es el valor declarado y las dimensiones del paquete?',
          timestamp: ago(13),
        },
        {
          rol: 'CLIENTE',
          texto: 'Valor declarado $8.500.000. Son 3 cajas de 60×40×40 cm.',
          timestamp: ago(12),
        },
        {
          rol: 'BOT',
          texto: 'Cotización COT-99201 lista: $340.000 COP, entrega estimada en 2 días hábiles.',
          timestamp: ago(12),
        },
        {
          rol: 'CLIENTE',
          texto: '¿Pueden darme descuento corporativo y recoger hoy mismo?',
          timestamp: ago(11),
        },
        {
          rol: 'BOT',
          texto:
            'Un asesor te puede ayudar con eso. Para que te contacte, ¿me compartes tu número de teléfono y tu correo?',
          timestamp: ago(10),
        },
        {
          rol: 'CLIENTE',
          texto: '3104567890, compras@importadoraandina.com.co',
          timestamp: ago(9),
        },
        {
          rol: 'BOT',
          texto: 'Listo, María. Un asesor te llamará en los próximos minutos al +57 310 456 7890.',
          timestamp: ago(8),
        },
      ],
    },
  ),
  sale('L-99198', 'nuevas', 21, 'Camilo Restrepo', '+57 300 218 4471', 'B2C', {
    codigo: 'COT-99198',
    origen: 'Bogotá',
    destino: 'Medellín',
    valor_cop: 185000,
    peso_kg: 45,
    tipo_carga: 'Mercancía General',
  }),
  sale(
    'L-99195',
    'nuevas',
    47,
    'Distribuidora La 14 S.A.S.',
    '+57 315 220 4418',
    'B2B',
    {
      codigo: 'COT-99195',
      origen: 'Cali',
      destino: 'Barranquilla',
      valor_cop: 612000,
      peso_kg: 260,
      tipo_carga: 'Mercancía General',
    },
    { empresa: 'Distribuidora La 14 S.A.S.' },
  ),
  sale('L-99190', 'contacto', 72, 'Luz Marina Pardo', '+57 304 771 3350', 'B2C', {
    codigo: 'COT-99190',
    origen: 'Cali',
    destino: 'Bogotá',
    valor_cop: 98000,
    peso_kg: 22,
    tipo_carga: 'Mercancía General',
  }),
  sale(
    'L-99185',
    'contacto',
    120,
    'Julián Mazuera',
    '+57 311 640 2287',
    'B2B',
    {
      codigo: 'COT-99185',
      origen: 'Medellín',
      destino: 'Bogotá',
      valor_cop: 276000,
      peso_kg: 85,
      tipo_carga: 'Mercancía General',
    },
    { empresa: 'Textiles Mazuera S.A.S.' },
  ),
  sale(
    'L-99180',
    'negociacion',
    190,
    'Sergio Cárdenas',
    '+57 318 554 0290',
    'B2B',
    {
      codigo: 'COT-99180',
      origen: 'Bogotá',
      destino: 'Barranquilla',
      valor_cop: 1150000,
      peso_kg: 540,
      tipo_carga: 'Mercancía General',
    },
    { empresa: 'Ferreléctricos del Norte S.A.S.' },
  ),
  sale('L-99172', 'negociacion', 260, 'Valentina Ríos', '+57 302 117 8843', 'B2C', {
    codigo: 'COT-99172',
    origen: 'Pereira',
    destino: 'Bogotá',
    valor_cop: 112000,
    peso_kg: 30,
    tipo_carga: 'Mercancía General',
  }),
  sale(
    'L-99150',
    'cerrada',
    1440,
    'Hernando Gil',
    '+57 317 902 3361',
    'B2B',
    {
      codigo: 'COT-99150',
      origen: 'Bucaramanga',
      destino: 'Bogotá',
      valor_cop: 520000,
      peso_kg: 210,
      tipo_carga: 'Mercancía General',
    },
    { guia: 'TLX-200417-CO', empresa: 'Café Santandereano S.A.S.' },
  ),
  sale('L-99141', 'descartada', 2880, 'Paula Méndez', '+57 301 448 2205', 'B2C', {
    codigo: 'COT-99141',
    origen: 'Cartagena',
    destino: 'Cali',
    valor_cop: 76000,
    peso_kg: 12,
    tipo_carga: 'Mercancía General',
  }),

  // --- Casos escalados ---
  ...(
    [
      [
        '8921',
        'escalados',
        'ALTA',
        'Novedad documental en ruta',
        'TLX-310482-CO',
        'Laura Mejía',
        '+57 312 774 0932',
        0.42,
        12.67,
      ],
      [
        '8917',
        'escalados',
        'ALTA',
        'Consulta de carga refrigerada (2 a 8 °C)',
        'TLX-984021-CO',
        'Jorge Valencia',
        '+57 320 551 7740',
        0.38,
        25.17,
      ],
      [
        '8905',
        'gestion',
        'MEDIA',
        'Reclamo por retraso en entrega Medellín a Cali',
        'TLX-752190-CO',
        'Paola Burbano',
        '+57 316 208 9915',
        0.55,
        95,
      ],
      [
        '8899',
        'gestion',
        'BAJA',
        'Cambio de dirección de entrega',
        'TLX-551904-CO',
        'Iván Cuesta',
        '+57 300 905 1176',
        0.71,
        190,
      ],
      [
        '8890',
        'validando',
        'MEDIA',
        'Daño parcial en embalaje al recibir',
        'TLX-118493-CO',
        'Gloria Escobar',
        '+57 311 482 6630',
        0.64,
        140,
      ],
      [
        '8872',
        'resuelto',
        'BAJA',
        'Certificado de entrega solicitado',
        null,
        'Hernán Duarte',
        '+57 319 447 0085',
        0.88,
        null,
      ],
    ] as const
  ).map(([n, etapa, prioridad, motivo, guia, nombre, telefono, confianza, sla]): Lead => ({
    id: `C-${n}`,
    embudo: 'casos',
    etapa,
    creado_at: ago(40),
    nombre,
    telefono,
    correo: null,
    empresa: null,
    segmento: 'B2C',
    cotizacion: null,
    caso: {
      codigo: `CAS-${n}`,
      prioridad,
      motivo,
      confianza,
      sla_vence_at: sla === null ? null : inMin(sla),
    },
    guia,
    notas: [sysNote(`Caso escalado por el bot web: ${motivo.toLowerCase()}.`, ago(40))],
    transcripcion: [
      {
        rol: 'CLIENTE',
        texto: guia
          ? `Hola, necesito ayuda con la guía ${guia}.`
          : 'Hola, necesito ayuda con un envío.',
        timestamp: ago(46),
      },
      { rol: 'BOT', texto: 'Claro. Cuéntame qué pasó con tu envío.', timestamp: ago(45) },
      { rol: 'CLIENTE', texto: `${motivo}. ¿Me pueden ayudar?`, timestamp: ago(44) },
      {
        rol: 'BOT',
        texto:
          'Para esto te ayuda mejor un asesor. ¿Me compartes tu número de teléfono y tu correo para que te llame?',
        timestamp: ago(43),
      },
      { rol: 'CLIENTE', texto: telefono.replace('+57 ', ''), timestamp: ago(41) },
      { rol: 'BOT', texto: 'Gracias. Un asesor te llamará en breve.', timestamp: ago(40) },
    ],
  })),

  // --- Seguimiento automático del bot ---
  ...(
    [
      [
        '99187',
        'nutricion',
        'ACTIVO',
        1,
        'Diego Salcedo',
        '+57 301 665 2208',
        'Cali',
        'Pereira',
        96500,
        'Bot enviará recordatorio de tarifa en 2 h',
      ],
      [
        '99164',
        'nutricion',
        'ACTIVO',
        1,
        'Ferretería El Tornillo S.A.S.',
        '+57 318 400 9921',
        'Bogotá',
        'Cúcuta',
        148000,
        'Bot enviará recordatorio de tarifa mañana 9:00 a. m.',
      ],
      [
        '99176',
        'recordatorio',
        'ACTIVO',
        2,
        'Sandra Ortiz',
        '+57 314 887 0126',
        'Medellín',
        'Cartagena',
        212000,
        'Bot enviará cobertura y tiempos de entrega hoy 3:30 p. m.',
      ],
      [
        '99158',
        'recordatorio',
        'ACTIVO',
        2,
        'Rafael Tovar',
        '+57 312 009 7731',
        'Bogotá',
        'Cali',
        188000,
        'Bot hará último intento en 20 h',
      ],
      [
        '99142',
        'reactivado',
        'REACTIVADO',
        2,
        'Mariana Lozano',
        '+57 320 664 1852',
        'Cali',
        'Medellín',
        134000,
        'Listo para asesor: el cliente pidió hablar con una persona',
      ],
      [
        '99088',
        'expirado',
        'SIN_RESPUESTA',
        3,
        'Carlos Pineda',
        '+57 305 119 4468',
        'Bogotá',
        'Pereira',
        102000,
        'Seguimiento cerrado tras 3 intentos',
      ],
    ] as const
  ).map(([n, etapa, estado, intento, nombre, telefono, origen, destino, valor, proxima]): Lead => ({
    id: `B-${n}`,
    embudo: 'bot',
    etapa,
    creado_at: ago(600),
    nombre,
    telefono,
    correo: null,
    empresa: null,
    segmento: nombre.includes('S.A.S.') ? 'B2B' : 'B2C',
    cotizacion: {
      codigo: `COT-${n}`,
      origen,
      destino,
      valor_cop: valor,
      peso_kg: Math.round(valor / 3200),
      tipo_carga: 'Mercancía General',
    },
    bot: { estado, intento, proxima_accion: proxima },
    guia: null,
    notas: [sysNote('El bot inició el seguimiento automático de la cotización.', ago(600))],
  })),
]

interface TaskRow {
  id: string
  lead_id: string
  titulo: string
  detalle: string
  vence_at: string
  hecha: boolean
}

const tasks: TaskRow[] = [
  {
    id: 't-1',
    lead_id: 'L-99201',
    titulo: 'Llamar a María González',
    detalle: 'COT-99201 · Bogotá a Cali · $340.000 COP',
    vence_at: inMin(4.2),
    hecha: false,
  },
  {
    id: 't-2',
    lead_id: 'B-99142',
    titulo: 'Llamar a Mariana Lozano (reactivó)',
    detalle: 'COT-99142 · Cali a Medellín · pidió hablar con una persona',
    vence_at: inMin(15),
    hecha: false,
  },
  {
    id: 't-3',
    lead_id: 'L-99190',
    titulo: 'Devolver llamada a Luz Marina Pardo',
    detalle: 'No contestó a las 9:10 a. m.',
    vence_at: inMin(38),
    hecha: false,
  },
  {
    id: 't-4',
    lead_id: 'L-99180',
    titulo: 'Confirmar descuento con Sergio Cárdenas',
    detalle: 'Negociación B2B · 540 kg a Barranquilla',
    vence_at: inMin(125),
    hecha: false,
  },
  {
    id: 't-5',
    lead_id: 'C-8890',
    titulo: 'Validar con Operaciones el caso #CAS-8890',
    detalle: 'Daño parcial en embalaje · TLX-118493-CO',
    vence_at: inMin(140),
    hecha: false,
  },
  {
    id: 't-6',
    lead_id: 'L-99185',
    titulo: 'Enviar cotización a Julián Mazuera',
    detalle: 'COT-99185 · Medellín a Bogotá',
    vence_at: ago(30),
    hecha: true,
  },
]

const byId = (id: string) => leads.find((l) => l.id === id)
const open = (l: Lead) => !['cerrada', 'descartada', 'resuelto', 'expirado'].includes(l.etapa)
const sum = (ls: Lead[]) => ls.reduce((t, l) => t + (l.cotizacion?.valor_cop ?? 0), 0)
const cop = (n: number) => `$${n.toLocaleString('es-CO')} COP`

function card(l: Lead) {
  const base = {
    lead_id: l.id,
    embudo: l.embudo,
    etapa: l.etapa,
    cliente: { nombre: l.nombre, telefono: l.telefono, telefono_verificado: true },
    creado_at: l.creado_at,
  }
  const q = l.cotizacion
  if (l.embudo === 'casos' && l.caso) {
    return {
      ...base,
      caso_codigo: l.caso.codigo,
      prioridad: l.caso.prioridad,
      numero_guia: l.guia,
      motivo: l.caso.motivo,
      confianza: l.caso.confianza,
      sla_vence_at: l.caso.sla_vence_at,
    }
  }
  if (l.embudo === 'bot' && l.bot && q) {
    return {
      ...base,
      estado_bot: l.bot.estado,
      intento: l.bot.intento,
      intentos_max: 3,
      cotizacion: {
        codigo: q.codigo,
        origen: q.origen,
        destino: q.destino,
        valor_cop: q.valor_cop,
      },
      proxima_accion: l.bot.proxima_accion,
    }
  }
  return {
    ...base,
    segmento: l.segmento,
    cotizacion: {
      codigo: q!.codigo,
      origen: q!.origen,
      destino: q!.destino,
      valor_cop: q!.valor_cop,
      peso_facturable_kg: q!.peso_kg,
      tipo_carga: q!.tipo_carga,
    },
  }
}

function indicators(f: Funnel) {
  const ls = leads.filter((l) => l.embudo === f)
  if (f === 'ventas') {
    const active = ls.filter(open)
    return [
      {
        etiqueta: 'Pipeline abierto',
        valor: cop(sum(active)),
        detalle: `${active.length} oportunidades activas`,
        tono: 'neutral',
      },
      {
        etiqueta: 'Ventas cerradas del mes',
        valor: cop(6900000 + sum(ls.filter((l) => l.etapa === 'cerrada'))),
        detalle: '+12% vs. octubre',
        tono: 'success',
      },
      {
        etiqueta: 'Primer contacto promedio',
        valor: '11 min',
        detalle: 'Meta SLA: 15 min',
        tono: 'success',
      },
    ]
  }
  if (f === 'casos') {
    const active = ls.filter(open)
    return [
      {
        etiqueta: 'Casos abiertos',
        valor: String(active.length),
        detalle: `${active.filter((l) => l.caso?.prioridad === 'ALTA').length} de prioridad alta`,
        tono: 'danger',
      },
      { etiqueta: 'SLA cumplido hoy', valor: '94%', detalle: 'Meta: 90%', tono: 'success' },
      {
        etiqueta: 'Resolución promedio',
        valor: '3 h 20 min',
        detalle: '−18% vs. semana pasada',
        tono: 'success',
      },
    ]
  }
  return [
    {
      etiqueta: 'Leads en seguimiento',
      valor: String(ls.filter(open).length),
      detalle: `${ls.filter((l) => l.bot?.estado === 'ACTIVO').length} con agente IA activo`,
      tono: 'neutral',
    },
    {
      etiqueta: 'Reactivados hoy',
      valor: String(ls.filter((l) => l.etapa === 'reactivado').length),
      detalle: '11% de tasa de reactivación',
      tono: 'success',
    },
    {
      etiqueta: 'Recordatorios enviados por el bot',
      valor: '126',
      detalle: 'Hoy, hasta las 10:30 a. m.',
      tono: 'neutral',
    },
  ]
}

function detail(l: Lead) {
  const q = l.cotizacion
  let cotizacion = null
  if (q && l.embudo !== 'casos') {
    const isMaria = l.id === 'L-99201'
    const conceptos = isMaria
      ? [
          { concepto: 'Flete base', valor_cop: 238000 },
          { concepto: 'Seguro (0,6% de $8.500.000)', valor_cop: 51000 },
          { concepto: 'Recargo por combustible', valor_cop: 18000 },
          { concepto: 'Recolección zona industrial', valor_cop: 33000 },
        ]
      : (() => {
          const flete = Math.round((q.valor_cop * 0.82) / 100) * 100
          const seguro = Math.round((q.valor_cop * 0.08) / 100) * 100
          return [
            { concepto: 'Flete base', valor_cop: flete },
            { concepto: 'Seguro', valor_cop: seguro },
            { concepto: 'Recargo por combustible', valor_cop: q.valor_cop - flete - seguro },
          ]
        })()
    const vol = isMaria ? 57.6 : Math.round(q.peso_kg * 0.6 * 10) / 10
    cotizacion = {
      codigo: q.codigo,
      origen: q.origen,
      destino: q.destino,
      conceptos,
      total_cop: q.valor_cop,
      peso_real_kg: q.peso_kg,
      peso_volumetrico_kg: vol,
      volumen_cm3: Math.round(vol * 5000),
      divisor_volumetrico: 5000,
      peso_facturable_kg: Math.max(q.peso_kg, vol),
    }
  }

  const datos: { etiqueta: string; valor: string }[] = [{ etiqueta: 'Teléfono', valor: l.telefono }]
  if (l.caso) {
    datos.push(
      { etiqueta: 'Caso', valor: l.caso.codigo },
      { etiqueta: 'Guía vinculada', valor: l.guia ?? 'Sin guía' },
      { etiqueta: 'Motivo detectado', valor: l.caso.motivo },
      {
        etiqueta: 'Prioridad',
        valor: { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' }[l.caso.prioridad],
      },
    )
  } else if (q) {
    datos.push({ etiqueta: 'Cotización', valor: q.codigo })
    if (l.id === 'L-99201') {
      datos.push(
        { etiqueta: 'NIT / Empresa', valor: 'Importadora Andina S.A.S. · 901.452.118-3' },
        { etiqueta: 'Valor declarado', valor: '$8.500.000 COP' },
        { etiqueta: 'Dimensiones', valor: '3 cajas · 60×40×40 cm' },
        { etiqueta: 'Peso facturable', valor: '120 kg' },
      )
    } else {
      if (l.empresa) datos.push({ etiqueta: 'Empresa', valor: l.empresa })
      datos.push(
        { etiqueta: 'Ruta', valor: `${q.origen} a ${q.destino}` },
        { etiqueta: 'Peso', valor: `${q.peso_kg} kg` },
      )
    }
  }

  return {
    lead_id: l.id,
    embudo: l.embudo,
    etapa: l.etapa,
    referencia: l.caso?.codigo ?? q?.codigo ?? l.id,
    segmento: l.embudo === 'casos' ? null : l.segmento,
    cliente: { nombre: l.nombre, telefono: l.telefono, correo: l.correo, empresa: l.empresa },
    datos_bot: datos,
    transcripcion: l.transcripcion ?? defaultTranscript(l),
    notas: [...l.notas].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    cotizacion,
    numero_guia: l.guia,
  }
}

function defaultTranscript(l: Lead) {
  const q = l.cotizacion
  if (!q) return []
  const t = Date.parse(l.creado_at)
  const ts = (m: number) => new Date(t - m * 60_000).toISOString()
  return [
    {
      rol: 'CLIENTE' as const,
      texto: `Quiero cotizar un envío de ${q.origen} a ${q.destino}, ${q.peso_kg} kg.`,
      timestamp: ts(5),
    },
    {
      rol: 'BOT' as const,
      texto: `Cotización ${q.codigo} lista: ${cop(q.valor_cop)}. ¿Quieres que un asesor te contacte para cerrarla?`,
      timestamp: ts(4),
    },
    { rol: 'CLIENTE' as const, texto: 'Sí, por favor.', timestamp: ts(3) },
    {
      rol: 'BOT' as const,
      texto: 'Para que el asesor te contacte, ¿me compartes tu número de teléfono y tu correo?',
      timestamp: ts(2),
    },
    { rol: 'CLIENTE' as const, texto: l.telefono.replace('+57 ', ''), timestamp: ts(1) },
  ]
}

const notFound = () =>
  HttpResponse.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'No encontramos ese registro.',
        details: null,
        request_id: crypto.randomUUID(),
      },
    },
    { status: 404 },
  )

/** TMS: guías del backend simulado (eventos resumidos). */
const TRACKING: Record<string, unknown> = {
  'TLX-310482-CO': {
    numero_guia: 'TLX-310482-CO',
    estado_actual: {
      codigo: 'RETENIDO_NOVEDAD',
      etiqueta: 'Novedad documental',
      explicacion: 'Tu envío está detenido temporalmente por una novedad operativa.',
    },
    origen_ciudad: 'Barranquilla',
    destino_ciudad: 'Bucaramanga',
    tipo_servicio: 'Mercancía Peligrosa (Clase 3)',
    fecha_estimada_entrega: null,
    ubicacion_referencia: 'Hub Bucaramanga',
    eventos: [
      {
        timestamp: ago(1500),
        estado: 'RECOGIDO_EN_ORIGEN',
        etiqueta: 'Recogido en origen',
        ubicacion: 'Barranquilla',
        descripcion_cliente: 'Recogimos tu envío en el punto de origen.',
      },
      {
        timestamp: ago(900),
        estado: 'EN_TRANSITO',
        etiqueta: 'En tránsito',
        ubicacion: 'Corredor Ruta del Sol',
        descripcion_cliente: 'Tu envío va en carretera hacia la ciudad de destino.',
      },
      {
        timestamp: ago(200),
        estado: 'RETENIDO_NOVEDAD',
        etiqueta: 'Novedad documental',
        ubicacion: 'Hub Bucaramanga',
        descripcion_cliente: 'Falta copia de la hoja de seguridad (MSDS) del producto.',
      },
    ],
    flags: { requiere_refrigeracion: false, mercancia_peligrosa: true },
    ultima_temperatura_c: null,
  },
  'TLX-984021-CO': {
    numero_guia: 'TLX-984021-CO',
    estado_actual: {
      codigo: 'EN_TRANSITO',
      etiqueta: 'En tránsito',
      explicacion: 'Tu envío va en carretera hacia la ciudad de destino.',
    },
    origen_ciudad: 'Bogotá D.C.',
    destino_ciudad: 'Medellín',
    tipo_servicio: 'Cadena de Frío (2 °C a 8 °C)',
    fecha_estimada_entrega: inMin(300),
    ubicacion_referencia: 'Corredor Calarcá - Pereira',
    eventos: [
      {
        timestamp: ago(1200),
        estado: 'RECOGIDO_EN_ORIGEN',
        etiqueta: 'Recogido en origen',
        ubicacion: 'Zona Franca Fontibón',
        descripcion_cliente: 'Carga inspeccionada y temperatura validada en 4,2 °C.',
      },
      {
        timestamp: ago(500),
        estado: 'EN_TRANSITO',
        etiqueta: 'En tránsito',
        ubicacion: 'Peaje Chicoral - Tolima',
        descripcion_cliente: 'Temperatura estable a 3,8 °C.',
      },
      {
        timestamp: ago(120),
        estado: 'EN_TRANSITO',
        etiqueta: 'En tránsito',
        ubicacion: 'Corredor Calarcá - Pereira',
        descripcion_cliente: 'Vehículo en ruta regular hacia Hub Itagüí.',
      },
    ],
    flags: { requiere_refrigeracion: true, mercancia_peligrosa: false },
    ultima_temperatura_c: 3.8,
  },
}

const RAG = [
  {
    titulo: 'Transporte de baterías de litio (UN3480)',
    fragmento:
      'Las baterías de ion de litio deben embalarse con protección contra cortocircuito y rotularse con la etiqueta de Clase 9. El remitente debe adjuntar la declaración de mercancía peligrosa.',
    fuente: 'Manual de Mercancías Peligrosas y Embalaje',
    pagina: null,
    relevancia: 0.92,
    claves: 'bateria baterias litio un3480 clase 9 peligrosa',
  },
  {
    titulo: 'Cadena de frío (2 °C a 8 °C)',
    fragmento:
      'Los envíos refrigerados viajan en vehículo con termógrafo y se valida la temperatura al recoger y al entregar. Si la temperatura sale del rango se abre novedad y se informa al remitente.',
    fuente: 'Directorio de cobertura y tiempos',
    pagina: null,
    relevancia: 0.86,
    claves: 'refrigerada refrigerado frio temperatura cadena 2 8',
  },
  {
    titulo: 'Indemnización por daño parcial',
    fragmento:
      'El cliente tiene 5 días hábiles desde la entrega para reportar daño parcial con fotos del embalaje. La indemnización se liquida sobre el valor declarado.',
    fuente: 'Protocolo de PQRS y procedimiento de indemnizaciones',
    pagina: null,
    relevancia: 0.81,
    claves: 'daño dano parcial indemnizacion reclamo embalaje pqrs',
  },
]

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export const asesorHandlers: RequestHandler[] = [
  http.get(api('/asesor/me'), () => HttpResponse.json(advisorJson())),
  http.patch(api('/asesor/me'), async ({ request }) => {
    const body = (await request.json()) as { estado: typeof advisorStatus }
    advisorStatus = body.estado
    return HttpResponse.json(advisorJson())
  }),

  http.get(api('/asesor/dashboard'), () => {
    const pending = tasks
      .filter((t) => !t.hecha)
      .sort((a, b) => a.vence_at.localeCompare(b.vence_at))
    const cases = leads.filter((l) => l.embudo === 'casos' && open(l))
    const urgentCases = cases
      .filter((l) => l.caso?.sla_vence_at)
      .map((l) => ({
        lead_id: l.id,
        embudo: 'casos' as const,
        titulo: `Caso #${l.caso!.codigo} · ${l.caso!.motivo}`,
        detalle: `${l.guia ?? 'Sin guía'} · Prioridad ${l.caso!.prioridad.toLowerCase()}`,
        sla_vence_at: l.caso!.sla_vence_at!,
      }))
    const calls = pending.map((t) => ({
      lead_id: t.lead_id,
      embudo: byId(t.lead_id)!.embudo,
      titulo: t.titulo,
      detalle: t.detalle,
      sla_vence_at: t.vence_at,
    }))
    return HttpResponse.json({
      kpis: {
        leads_cotizacion_hoy: 18,
        leads_cotizacion_ayer: 14,
        consultas_escaladas: cases.length,
        consultas_prioridad_alta: cases.filter((l) => l.caso?.prioridad === 'ALTA').length,
        llamadas_pendientes: pending.length,
        proxima_llamada_at: pending[0]?.vence_at ?? null,
        sla_cumplimiento_pct: 94,
        sla_meta_pct: 90,
      },
      acciones: [...calls, ...urgentCases]
        .sort((a, b) => a.sla_vence_at.localeCompare(b.sla_vence_at))
        .slice(0, 4),
    })
  }),

  http.get(api('/asesor/embudos/:embudo'), ({ params }) => {
    const f = params.embudo as Funnel
    if (!STAGES[f]) return notFound()
    const ls = leads.filter((l) => l.embudo === f)
    return HttpResponse.json({
      embudo: f,
      etapas: STAGES[f].map((s) => {
        const inStage = ls.filter((l) => l.etapa === s.id)
        return { ...s, total: inStage.length, proyectado_cop: f === 'ventas' ? sum(inStage) : null }
      }),
      indicadores: indicators(f),
      tarjetas: ls.map(card),
    })
  }),

  http.get(api('/asesor/leads/:id'), ({ params }) => {
    const lead = byId(String(params.id))
    return lead ? HttpResponse.json(detail(lead)) : notFound()
  }),

  http.patch(api('/asesor/leads/:id'), async ({ params, request }) => {
    const lead = byId(String(params.id))
    if (!lead) return notFound()
    const { etapa } = (await request.json()) as { etapa: string }
    let guia: string | null = null
    if (lead.embudo === 'ventas' && etapa === 'cerrada' && !lead.guia) {
      // Rango de guías internas del backend (shipment_guide_seq, DEC-SHP1).
      guia = `TLX-${200000 + Math.floor(Math.random() * 99999)}-CO`
      lead.guia = guia
      lead.notas.push(
        sysNote(`Venta cerrada. Guía ${guia} creada en el TMS.`, new Date().toISOString()),
      )
    } else if (lead.etapa === 'cerrada' && etapa !== 'cerrada') {
      lead.guia = null
    }
    const name = STAGES[lead.embudo].find((s) => s.id === etapa)?.nombre ?? etapa
    lead.notas.push(sysNote(`${ADVISOR} movió el lead a «${name}».`, new Date().toISOString()))
    lead.etapa = etapa
    return HttpResponse.json({ lead_id: lead.id, embudo: lead.embudo, etapa, guia_creada: guia })
  }),

  http.post(api('/asesor/leads/:id/tomar-control'), ({ params }) => {
    const lead = byId(String(params.id))
    if (!lead) return notFound()
    lead.embudo = 'ventas'
    lead.etapa = 'contacto'
    lead.creado_at = new Date().toISOString()
    lead.notas.push(
      sysNote(
        `${ADVISOR} tomó el control manual. El bot detuvo el seguimiento.`,
        new Date().toISOString(),
      ),
    )
    return HttpResponse.json({
      lead_id: lead.id,
      embudo: 'ventas',
      etapa: 'contacto',
      guia_creada: null,
    })
  }),

  http.post(api('/asesor/leads/:id/notas'), async ({ params, request }) => {
    const lead = byId(String(params.id))
    if (!lead) return notFound()
    const body = (await request.json()) as Pick<Note, 'resultado' | 'texto' | 'recordatorio_at'>
    const note: Note = {
      id: crypto.randomUUID(),
      autor: ADVISOR,
      tipo: body.resultado ? 'LLAMADA' : 'NOTA',
      timestamp: new Date().toISOString(),
      ...body,
    }
    lead.notas.push(note)
    if (body.recordatorio_at) {
      tasks.push({
        id: crypto.randomUUID(),
        lead_id: lead.id,
        titulo: `Llamar a ${lead.nombre}`,
        detalle: body.texto.slice(0, 80),
        vence_at: body.recordatorio_at,
        hecha: false,
      })
    }
    return HttpResponse.json(note)
  }),

  http.get(api('/asesor/tareas'), () =>
    HttpResponse.json({
      tareas: [...tasks]
        .sort((a, b) => a.vence_at.localeCompare(b.vence_at))
        .map((t) => ({ ...t, embudo: byId(t.lead_id)!.embudo })),
      sla: {
        cumplimiento_pct: 94,
        meta_pct: 90,
        vencidas_hoy: tasks.filter((t) => !t.hecha && Date.parse(t.vence_at) < Date.now()).length,
        primer_contacto_promedio_min: 11,
      },
    }),
  ),

  http.patch(api('/asesor/tareas/:id'), async ({ params, request }) => {
    const task = tasks.find((t) => t.id === params.id)
    if (!task) return notFound()
    task.hecha = ((await request.json()) as { hecha: boolean }).hecha
    return HttpResponse.json({ ...task, embudo: byId(task.lead_id)!.embudo })
  }),

  http.get(api('/asesor/buscar'), ({ request }) => {
    const q = norm(new URL(request.url).searchParams.get('q') ?? '')
    const digits = q.replace(/\D/g, '')
    const resultados = leads
      .filter((l) => {
        const hay = norm(
          [l.nombre, l.empresa, l.guia, l.cotizacion?.codigo, l.caso?.codigo]
            .filter(Boolean)
            .join(' '),
        )
        return (
          hay.includes(q) || (digits.length >= 4 && l.telefono.replace(/\D/g, '').includes(digits))
        )
      })
      .slice(0, 8)
      .map((l) => ({
        lead_id: l.id,
        embudo: l.embudo,
        titulo: l.nombre,
        detalle: [l.caso?.codigo ?? l.cotizacion?.codigo, l.telefono].join(' · '),
      }))
    return HttpResponse.json({ resultados })
  }),

  http.get(api('/asesor/rag/buscar'), ({ request }) => {
    const words = norm(new URL(request.url).searchParams.get('q') ?? '')
      .split(/\W+/)
      .filter((w) => w.length > 3)
    const resultados = RAG.filter((r) =>
      words.some((w) => norm(r.claves + ' ' + r.titulo).includes(w)),
    ).map(({ claves: _claves, ...r }) => r)
    return HttpResponse.json({ resultados })
  }),
]

/** Tracking de las guías del diseño. Solo con el backend simulado completo (`VITE_API_MOCKING=true`). */
export const asesorTrackingHandlers: RequestHandler[] = [
  // Si la guía no está aquí, la petición sigue al backend real.
  http.get(api('/tracking/:guia'), ({ params }) => {
    const data = TRACKING[String(params.guia)]
    return data ? HttpResponse.json(data) : undefined
  }),
]

function advisorJson() {
  const count = (f: Funnel) => leads.filter((l) => l.embudo === f && open(l)).length
  return {
    asesor_id: 'ASR-014',
    nombre: ADVISOR,
    estado: advisorStatus,
    turno: 'Turno 8:00 a. m. a 5:00 p. m.',
    notificaciones_sin_leer: 3,
    tareas_pendientes: tasks.filter((t) => !t.hecha).length,
    embudos_abiertos: { ventas: count('ventas'), casos: count('casos'), bot: count('bot') },
  }
}
