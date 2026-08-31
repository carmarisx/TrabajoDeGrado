require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: 'No se recibió un historial válido de mensajes.'
            });
        }

        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey || apiKey.trim().length === 0) {
            return res.status(500).json({
                error: 'No hay una GROQ_API_KEY configurada en el archivo .env.'
            });
        }

        const url = 'https://api.groq.com/openai/v1/chat/completions';

        console.log('Consultando modelo de IA (Groq)...');

        const response = await fetch(url, {
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
            throw new Error(
                `Error en la API de IA: ${response.status} ${response.statusText} - ${textoError}`
            );
        }

        const data = await response.json();
        const respuestaIA = data.choices?.[0]?.message?.content;

        if (!respuestaIA) {
            throw new Error('La IA respondió pero sin contenido de texto reconocible.');
        }

        res.json({
            respuesta: respuestaIA
        });

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