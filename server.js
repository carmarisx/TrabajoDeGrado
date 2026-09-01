require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ========================================= */
/* REGISTRO (LOG) DE CONVERSACIONES */
/* ========================================= */

/* Cada intercambio con la IA, y cada valoración (👍/👎) que dé un
   estudiante, se guarda como una línea de JSON en /logs. Este
   registro es la base de datos del caso de estudio: permite medir
   qué tan pertinentes fueron las respuestas, qué proveedor las
   generó, cuánto tardaron, y qué temas se consultan más.

   Nota: en un plan gratuito de hosting (como Render free tier), el
   disco no es 100% persistente entre reinicios/redeploys, así que
   para no perder datos conviene descargar estos archivos de forma
   periódica durante la recolección de datos del caso de estudio. */

const CARPETA_LOGS = path.join(__dirname, 'logs');

try {
    fs.mkdirSync(CARPETA_LOGS, { recursive: true });
} catch (error) {
    console.error('No se pudo crear la carpeta de logs:', error.message);
}

function registrarEnArchivo(nombreArchivo, datos) {
    const linea = JSON.stringify({
        fecha: new Date().toISOString(),
        ...datos
    }) + '\n';

    fs.appendFile(path.join(CARPETA_LOGS, nombreArchivo), linea, error => {
        if (error) {
            console.error(`No se pudo escribir en ${nombreArchivo}:`, error.message);
        }
    });
}

/* ========================================= */
/* GROQ (proveedor principal) */
/* ========================================= */

async function consultarGroq(messages) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
        throw new Error('No hay una GROQ_API_KEY configurada en el .env.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
            model: 'openai/gpt-oss-20b',
            messages
        })
    });

    if (!response.ok) {
        const textoError = await response.text();
        throw new Error(`Groq ${response.status} ${response.statusText} - ${textoError}`);
    }

    const data = await response.json();
    const respuesta = data.choices?.[0]?.message?.content;
    if (!respuesta) {
        throw new Error('Groq respondió pero sin contenido de texto reconocible.');
    }

    return respuesta;
}

/* ========================================= */
/* GEMINI (proveedor de respaldo) */
/* ========================================= */

/* Gemini no usa el mismo formato que Groq/OpenAI:
   - No tiene mensajes con role "system" dentro del arreglo;
     el mensaje de sistema se manda aparte como "systemInstruction".
   - Los roles se llaman "user" y "model" (no "assistant").
   - El texto va dentro de "parts": [{ text: "..." }] en vez de "content". */

function convertirMensajesAGemini(messages) {
    const mensajeSistema = messages.find(m => m.role === 'system');
    const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

    return { mensajeSistema, contents };
}

async function consultarGemini(messages) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
        throw new Error('No hay una GEMINI_API_KEY configurada en el .env.');
    }

    const { mensajeSistema, contents } = convertirMensajesAGemini(messages);
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

    const body = { contents };
    if (mensajeSistema) {
        body.systemInstruction = { parts: [{ text: mensajeSistema.content }] };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey.trim()
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const textoError = await response.text();
        throw new Error(`Gemini ${response.status} ${response.statusText} - ${textoError}`);
    }

    const data = await response.json();
    const respuesta = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!respuesta) {
        throw new Error('Gemini respondió pero sin contenido de texto reconocible.');
    }

    return respuesta;
}

/* ========================================= */
/* DETECCIÓN DE ERRORES DE LÍMITE DE USO */
/* ========================================= */

/* Cuando ambos proveedores fallan por saturación (límite de
   solicitudes/tokens por minuto), no tiene sentido mostrarle al
   usuario final el JSON técnico crudo. Se detecta ese caso y se
   muestra un mensaje amigable en su lugar, mientras que cualquier
   otro tipo de error (configuración, credenciales, etc.) sigue
   mostrando el detalle técnico completo, útil para depurar. */

function esErrorDeLimiteDeUso(mensaje) {
    if (!mensaje) return false;

    return (
        mensaje.includes('429') ||
        mensaje.includes('Too Many Requests') ||
        mensaje.includes('rate_limit') ||
        mensaje.includes('RESOURCE_EXHAUSTED')
    );
}


/* ========================================= */
/* RUTA PRINCIPAL DEL CHAT */
/* ========================================= */

app.post('/api/chat', async (req, res) => {
    const inicio = Date.now();

    try {
        const { messages, topico } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: 'No se recibió un historial válido de mensajes.'
            });
        }

        let respuestaIA;
        let proveedorUsado;

        try {
            console.log('Consultando modelo de IA (Groq)...');
            respuestaIA = await consultarGroq(messages);
            proveedorUsado = 'groq';
        } catch (errorGroq) {
            console.warn('Groq falló, intentando con Gemini como respaldo. Motivo:', errorGroq.message);
            try {
                console.log('Consultando modelo de IA (Gemini, respaldo)...');
                respuestaIA = await consultarGemini(messages);
                proveedorUsado = 'gemini';
            } catch (errorGemini) {

                const detalleTecnico = `Groq: ${errorGroq.message} | Gemini (respaldo): ${errorGemini.message}`;

                /* El detalle técnico completo siempre queda en los
                   logs del servidor, sin importar qué se le muestre
                   al usuario final. */

                console.error('Fallaron ambos proveedores de IA. Detalle técnico:', detalleTecnico);

                const esLimiteDeUso =
                    esErrorDeLimiteDeUso(errorGroq.message) ||
                    esErrorDeLimiteDeUso(errorGemini.message);

                registrarEnArchivo('conversaciones.jsonl', {
                    topico: topico || null,
                    pregunta: messages[messages.length - 1]?.content || null,
                    respuesta: null,
                    proveedor: null,
                    exito: false,
                    error: detalleTecnico,
                    duracionMs: Date.now() - inicio
                });

                if (esLimiteDeUso) {
                    throw new Error(
                        'Estamos recibiendo muchas solicitudes en este momento. Por favor espera unos segundos e intenta de nuevo.'
                    );
                }

                throw new Error(detalleTecnico);

            }
        }

        console.log(`Respuesta obtenida con: ${proveedorUsado}`);

        registrarEnArchivo('conversaciones.jsonl', {
            topico: topico || null,
            pregunta: messages[messages.length - 1]?.content || null,
            respuesta: respuestaIA,
            proveedor: proveedorUsado,
            exito: true,
            duracionMs: Date.now() - inicio
        });

        res.json({ respuesta: respuestaIA });

    } catch (error) {
        console.error('Error al conectar con la IA:', error);
        res.status(500).json({
            error: 'No fue posible obtener una respuesta del modelo de IA.',
            detalle: error.message
        });
    }
});


/* ========================================= */
/* RUTA DE VALORACIÓN (👍 / 👎) */
/* ========================================= */

app.post('/api/feedback', (req, res) => {
    const { topico, pregunta, respuesta, valoracion } = req.body;

    if (valoracion !== 'up' && valoracion !== 'down') {
        return res.status(400).json({
            error: 'La valoración debe ser "up" o "down".'
        });
    }

    registrarEnArchivo('feedback.jsonl', {
        topico: topico || null,
        pregunta: pregunta || null,
        respuesta: respuesta || null,
        valoracion
    });

    res.json({ ok: true });
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en: http://localhost:${PORT}`);
});