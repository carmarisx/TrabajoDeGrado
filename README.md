# Tutor IA - Matemáticas Básicas ITM

Asistente educativo basado en modelos de lenguaje que ayuda a los estudiantes de Matemáticas Básicas del ITM a resolver dudas, revisar conceptos y practicar ejercicios mediante un tutor conversacional contextualizado por tema, con soporte completo para notación matemática (LaTeX).

## Características

- **Tutor conversacional por tema**: cada tópico del curso (conjuntos numéricos, álgebra, trigonometría, etc.) mantiene su propio contexto e historial de conversación durante la sesión.
- **Respaldo automático entre proveedores de IA**: si el proveedor principal (Groq) falla o se satura, la aplicación reintenta automáticamente con un proveedor secundario (Gemini) sin interrumpir al usuario.
- **Renderizado matemático completo**: fórmulas en LaTeX renderizadas con KaTeX, incluso cuando el modelo no usa los delimitadores exactos esperados.
- **Markdown enriquecido**: títulos, listas, negritas y tablas con scroll horizontal unificado (no por celda).
- **Bloques de código con copiado**: cada bloque de código incluye su lenguaje y un botón de copiar independiente.
- **Interfaz tipo ChatGPT/Claude**: columna de chat centrada, scrollbar personalizada, y el mensaje del usuario se posiciona al inicio de la vista al enviarse, dejando espacio para leer la respuesta completa.
- **Manejo robusto de estado**: cancelación de peticiones en curso mediante `AbortController` al cambiar de tema, con reintento automático si una respuesta quedó pendiente.
- **Modo claro / oscuro** con persistencia en `localStorage`.
- **Totalmente responsivo**: panel de temas como menú deslizable (drawer) en dispositivos móviles.

## Tecnologías utilizadas

**Backend**
- Node.js + Express
- Groq API (`openai/gpt-oss-20b`) — proveedor principal de IA
- Google Gemini API (`gemini-3.6-flash`) — proveedor de respaldo
- `dotenv` para variables de entorno

**Frontend**
- HTML, CSS y JavaScript vanilla (sin frameworks)
- [marked.js](https://github.com/markedjs/marked) — renderizado de Markdown
- [KaTeX](https://katex.org/) — renderizado de fórmulas matemáticas
- [DOMPurify](https://github.com/cure53/DOMPurify) — sanitización de HTML generado por la IA

## Instalación y uso

### Requisitos previos

- Node.js 18 o superior
- Una API key de [Groq](https://console.groq.com)
- (Opcional, recomendado) Una API key de [Google AI Studio](https://aistudio.google.com/apikey) para el respaldo con Gemini

### Pasos

1. Clonar el repositorio e instalar dependencias:

   ```bash
   git clone <url-del-repositorio>
   cd tutor-ia-itm
   npm install
   ```

2. Crear un archivo `.env` en la raíz del proyecto:

   ```env
   GROQ_API_KEY=tu_llave_de_groq
   GEMINI_API_KEY=tu_llave_de_gemini
   PORT=3000
   ```

3. Iniciar el servidor:

   ```bash
   npm start
   ```

4. Abrir [http://localhost:3000](http://localhost:3000) en el navegador.