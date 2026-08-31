require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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
/* RUTA PRINCIPAL DEL CHAT */
/* ========================================= */

app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
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
                throw new Error(`Groq: ${errorGroq.message} | Gemini (respaldo): ${errorGemini.message}`);
            }
        }

        console.log(`Respuesta obtenida con: ${proveedorUsado}`);
        res.json({ respuesta: respuestaIA });

    } catch (error) {
        console.error('Error al conectar con la IA:', error);
        res.status(500).json({
            error: 'No fue posible obtener una respuesta del modelo de IA.',
            detalle: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en: http://localhost:${PORT}`);
});