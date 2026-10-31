// =============================================================
//  GymLog · Entrenador IA — Cloudflare Worker
//
//  Hace de puente entre la app y Workers AI. No guarda nada:
//  recibe la conversación y un resumen de tus datos, pregunta
//  al modelo y devuelve la respuesta.
//
//  Configuración en Cloudflare:
//    Settings → Bindings → Workers AI con el nombre  AI
// =============================================================

// Modelos por orden de preferencia (si uno no está disponible, prueba el siguiente)
const MODELS = [
  '@cf/meta/llama-4-scout-17b-16e-instruct',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
];

// Webs que pueden usar este servidor
const ALLOWED_ORIGINS = ['https://martinperal.github.io'];
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const MAX_CONTEXT = 14000; // caracteres del resumen de datos
const MAX_MESSAGE = 2000; // caracteres por mensaje
const MAX_TURNS = 12; // mensajes de historial que se envían

const SYSTEM_PROMPT = `Eres el entrenador personal de GymLog, una app de gimnasio. Hablas en español de España, de tú, con tono cercano y motivador pero directo.

Cómo respondes:
- Usa los DATOS DEL USUARIO para personalizar: cita sus pesos, ejercicios, días y progreso reales. No inventes datos que no aparezcan.
- Sé breve: normalmente menos de 150 palabras. Usa listas cortas cuando ayuden. Puedes usar **negrita**.
- Unidades métricas (kg, cm, km).
- Si falta información para responder bien, dilo y haz una pregunta concreta.

Seguridad:
- No eres médico ni nutricionista. Ante dolor, lesiones, mareos o problemas de salud, recomienda parar y consultar con un profesional.
- No propongas dietas extremas, ayunos prolongados, déficit de más de 500 kcal/día ni sustancias dopantes.
- Si el usuario muestra una relación preocupante con la comida o el ejercicio, responde con cuidado y sugiere apoyo profesional.

Rutinas:
Cuando el usuario pida una rutina (o aceptes crearle una), además de explicarla brevemente, añade AL FINAL un único bloque así, con JSON válido:
\`\`\`rutina
{"nombre": "Torso A", "lugar": "gym", "ejercicios": [{"nombre": "Press banca", "series": 4, "reps": 8}]}
\`\`\`
- "lugar" es "gym", "home" o null.
- Usa nombres de la lista EJERCICIOS DISPONIBLES siempre que puedas. Para cardio, "reps" son minutos; para ejercicios isométricos como la plancha, segundos.
- Entre 3 y 8 ejercicios. Si entrena en casa, solo ejercicios sin material o con lo que diga que tiene.
- No pongas el bloque si no estás proponiendo una rutina concreta.`;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });
}

const isAllowed = (origin) => ALLOWED_ORIGINS.includes(origin) || DEV_ORIGIN.test(origin || '');

/** Limpia y recorta la conversación que llega de la app */
function cleanMessages(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE) }))
    .filter((m) => m.content.trim())
    .slice(-MAX_TURNS);
}

/** Extrae el texto de la respuesta (los modelos devuelven formatos distintos) */
function textOf(out) {
  if (!out) return '';
  if (typeof out === 'string') return out;
  if (typeof out.response === 'string') return out.response;
  if (out.response && typeof out.response === 'object') return JSON.stringify(out.response);
  return out.choices?.[0]?.message?.content || '';
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!isAllowed(origin)) return new Response('Forbidden', { status: 403 });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
    if (request.method !== 'POST') return json({ error: 'method' }, 405, origin);
    if (!env.AI) return json({ error: 'config', message: 'Falta el binding de Workers AI llamado AI' }, 500, origin);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'bad_request' }, 400, origin);
    }

    const messages = cleanMessages(body.messages);
    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return json({ error: 'bad_request' }, 400, origin);
    }
    const context = String(body.context || '').slice(0, MAX_CONTEXT);

    const payload = {
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\nDATOS DEL USUARIO:\n${context || '(sin datos)'}` },
        ...messages,
      ],
      max_tokens: 900,
      temperature: 0.5,
    };

    let lastError = null;
    for (const model of MODELS) {
      try {
        const out = await env.AI.run(model, payload);
        const reply = textOf(out).trim();
        if (reply) return json({ reply, model }, 200, origin);
        lastError = new Error('Respuesta vacía');
      } catch (e) {
        lastError = e;
        const msg = String(e?.message || e);
        // Cupo gratuito diario agotado: no tiene sentido probar otro modelo
        if (/4006|neurons|daily free allocation/i.test(msg)) {
          return json({ error: 'limit', message: 'Se ha agotado el uso gratuito de hoy' }, 429, origin);
        }
      }
    }
    return json({ error: 'ai', message: String(lastError?.message || lastError) }, 502, origin);
  },
};
