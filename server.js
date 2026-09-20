require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

/* Necesario para que, al desplegar detrás de un proxy (como Render),
   el límite de peticiones se calcule por la IP real de cada visitante
   y no por la IP interna del proxy (que sería la misma para todos). */

app.set('trust proxy', 1);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


/* ========================================= */
/* PROTECCIÓN CONTRA ABUSO (rate limiting) */
/* ========================================= */

/* Máximo 20 mensajes por minuto por IP hacia la IA. Sin esto,
   cualquiera que encuentre la URL pública podría agotar la cuota de
   Groq/Gemini con peticiones ilimitadas (justo el día de una
   sustentación, por ejemplo). */

const limitadorChat = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Estás enviando mensajes muy rápido. Espera un minuto e intenta de nuevo.'
    }
});

/* El feedback (👍/👎) es más liviano, pero igual conviene ponerle
   un techo generoso para que no se pueda inundar el log con spam. */

const limitadorFeedback = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Demasiadas valoraciones seguidas. Espera un momento.'
    }
});


/* ========================================= */
/* LÍMITE DE LONGITUD DE MENSAJE */
/* ========================================= */

/* Evita que alguien pegue un párrafo gigante y dispare el consumo
   de tokens de una sola vez. Solo se valida el ÚLTIMO mensaje del
   arreglo (el que se acaba de escribir), no todo el historial: el
   prompt inicial que arma la propia app, o una conversación larga
   ya acumulada, no deben quedar bloqueados por este límite. */

const LIMITE_CARACTERES_MENSAJE = 1000;

function mensajeDemasiadoLargo(messages) {
    const ultimo = messages[messages.length - 1];
    return (
        ultimo &&
        typeof ultimo.content === 'string' &&
        ultimo.content.length > LIMITE_CARACTERES_MENSAJE
    );
}


/* ========================================= */
/* REGISTRO (LOG) DE CONVERSACIONES */
/* ========================================= */

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
/* GROQ (proveedor principal) — con streaming */
/* ========================================= */

/* Lee el cuerpo de una respuesta en formato SSE (Server-Sent Events)
   línea por línea, y por cada fragmento de texto nuevo que llega:
   1) lo escribe de inmediato en la respuesta HTTP hacia el navegador
      (para el efecto de "streaming", como ChatGPT), y
   2) lo va acumulando para devolver el texto completo al final
      (necesario para guardarlo en el log y en el historial).

   Si la conexión se corta a mitad de camino, NO se lanza un error:
   se conserva lo que ya se alcanzó a recibir, para no arruinar una
   respuesta que ya se empezó a mostrar en pantalla. */

async function relayStreamOpenAI(response, resExpress) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let textoCompleto = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lineas = buffer.split('\n');
            buffer = lineas.pop();

            for (const linea of lineas) {
                const limpia = linea.trim();
                if (!limpia.startsWith('data:')) continue;

                const payload = limpia.slice(5).trim();
                if (payload === '[DONE]' || payload === '') continue;

                try {
                    const json = JSON.parse(payload);
                    const delta = json.choices?.[0]?.delta?.content;

                    if (delta) {
                        textoCompleto += delta;
                        resExpress.write(delta);
                    }
                } catch (errorParseo) {
                    /* Línea incompleta o mal formada: se ignora */
                }
            }
        }
    } catch (errorDeRed) {
        console.error('La conexión de streaming con Groq se interrumpió:', errorDeRed.message);
    }

    if (!textoCompleto) {
        throw new Error('Groq respondió pero sin contenido de texto reconocible.');
    }

    return textoCompleto;
}

async function consultarGroqStream(messages, resExpress) {
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
            messages,
            stream: true
        })
    });

    if (!response.ok) {
        const textoError = await response.text();
        throw new Error(`Groq ${response.status} ${response.statusText} - ${textoError}`);
    }

    /* En este punto response.ok es true, pero TODAVÍA no se le ha
       escrito nada al cliente (eso solo pasa dentro de
       relayStreamOpenAI). Por eso, si algo falla ANTES de aquí
       (llave inválida, límite de uso, etc.), todavía se puede
       intentar el respaldo con Gemini sin que el usuario note nada. */

    return relayStreamOpenAI(response, resExpress);
}


/* ========================================= */
/* GEMINI (proveedor de respaldo) — con streaming */
/* ========================================= */

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

async function relayStreamGemini(response, resExpress) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let textoCompleto = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lineas = buffer.split('\n');
            buffer = lineas.pop();

            for (const linea of lineas) {
                const limpia = linea.trim();
                if (!limpia.startsWith('data:')) continue;

                const payload = limpia.slice(5).trim();
                if (payload === '') continue;

                try {
                    const json = JSON.parse(payload);
                    const delta = json.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (delta) {
                        textoCompleto += delta;
                        resExpress.write(delta);
                    }
                } catch (errorParseo) {
                    /* Línea incompleta o mal formada: se ignora */
                }
            }
        }
    } catch (errorDeRed) {
        console.error('La conexión de streaming con Gemini se interrumpió:', errorDeRed.message);
    }

    if (!textoCompleto) {
        throw new Error('Gemini respondió pero sin contenido de texto reconocible.');
    }

    return textoCompleto;
}

async function consultarGeminiStream(messages, resExpress) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
        throw new Error('No hay una GEMINI_API_KEY configurada en el .env.');
    }

    const { mensajeSistema, contents } = convertirMensajesAGemini(messages);
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse';

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

    return relayStreamGemini(response, resExpress);
}


/* ========================================= */
/* DETECCIÓN DE ERRORES DE LÍMITE DE USO */
/* ========================================= */

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
/* RUTA PRINCIPAL DEL CHAT (con streaming) */
/* ========================================= */

app.post('/api/chat', limitadorChat, async (req, res) => {
    const inicio = Date.now();
    const { messages, topico } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
            error: 'No se recibió un historial válido de mensajes.'
        });
    }

    if (mensajeDemasiadoLargo(messages)) {
        return res.status(400).json({
            error: `Tu mensaje es demasiado largo (máximo ${LIMITE_CARACTERES_MENSAJE} caracteres). Por favor acórtalo e intenta de nuevo.`
        });
    }

    let respuestaCompleta;
    let proveedorUsado;

    try {
        console.log('Consultando modelo de IA (Groq, streaming)...');

        /* La respuesta se manda como texto plano en pedazos (chunked),
           no como JSON: por eso el encabezado se define aquí, apenas
           se confirma que sí se va a poder responder. */

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');

        respuestaCompleta = await consultarGroqStream(messages, res);
        proveedorUsado = 'groq';

    } catch (errorGroq) {
        console.warn('Groq falló, intentando con Gemini como respaldo. Motivo:', errorGroq.message);

        try {
            console.log('Consultando modelo de IA (Gemini, respaldo, streaming)...');
            respuestaCompleta = await consultarGeminiStream(messages, res);
            proveedorUsado = 'gemini';

        } catch (errorGemini) {

            const detalleTecnico = `Groq: ${errorGroq.message} | Gemini (respaldo): ${errorGemini.message}`;

            console.error('Fallaron ambos proveedores de IA. Detalle técnico:', detalleTecnico);

            registrarEnArchivo('conversaciones.jsonl', {
                topico: topico || null,
                pregunta: messages[messages.length - 1]?.content || null,
                respuesta: null,
                proveedor: null,
                exito: false,
                error: detalleTecnico,
                duracionMs: Date.now() - inicio
            });

            const esLimiteDeUso =
                esErrorDeLimiteDeUso(errorGroq.message) ||
                esErrorDeLimiteDeUso(errorGemini.message);

            const mensajeFinal = esLimiteDeUso
                ? 'Estamos recibiendo muchas solicitudes en este momento. Por favor espera unos segundos e intenta de nuevo.'
                : detalleTecnico;

            /* Si Groq alcanzó a escribir algo antes de fallar del todo
               (caso raro), ya no se puede mandar un JSON de error
               normal porque los encabezados de streaming ya se
               enviaron. Se maneja cada caso por separado. */

            if (!res.headersSent) {
                return res.status(500).json({
                    error: 'No fue posible obtener una respuesta del modelo de IA.',
                    detalle: mensajeFinal
                });
            }

            res.end(`\n\n[ERROR_STREAM]${mensajeFinal}`);
            return;
        }
    }

    console.log(`Respuesta obtenida con: ${proveedorUsado}`);

    registrarEnArchivo('conversaciones.jsonl', {
        topico: topico || null,
        pregunta: messages[messages.length - 1]?.content || null,
        respuesta: respuestaCompleta,
        proveedor: proveedorUsado,
        exito: true,
        duracionMs: Date.now() - inicio
    });

    res.end();
});


/* ========================================= */
/* RUTA DE VALORACIÓN (👍 / 👎) */
/* ========================================= */

app.post('/api/feedback', limitadorFeedback, (req, res) => {
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