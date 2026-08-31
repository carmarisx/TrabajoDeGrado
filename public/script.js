/* ========================================= */
/* MODO OSCURO / MODO CLARO */
/* ========================================= */

function aplicarTemaGuardado() {
    const temaGuardado = localStorage.getItem("tema");

    if (temaGuardado === "oscuro") {
        document.body.classList.add("dark-mode");
        actualizarIconoTema();
    }
}

function alternarTema() {
    document.body.classList.toggle("dark-mode");

    const esOscuro = document.body.classList.contains("dark-mode");
    localStorage.setItem("tema", esOscuro ? "oscuro" : "claro");

    actualizarIconoTema();
}

function actualizarIconoTema() {
    const boton = document.getElementById("btn-tema");
    const esOscuro = document.body.classList.contains("dark-mode");

    boton.innerText = esOscuro ? "☀️" : "🌙";
}

document.addEventListener("DOMContentLoaded", aplicarTemaGuardado);


/* ========================================= */
/* CONTENIDOS DE MATEMÁTICAS BÁSICAS */
/* ========================================= */

const topicosMatematicas = [
    { tipo: "header", titulo: "Eje 1: Conjuntos Numéricos" },
    { tipo: "topico", titulo: "Naturales, enteros, racionales y reales" },
    { tipo: "topico", titulo: "Operaciones y propiedades de los números reales" },
    { tipo: "topico", titulo: "Exponentes y radicales: leyes y propiedades" },

    { tipo: "header", titulo: "Eje 2: Álgebra" },
    { tipo: "topico", titulo: "Polinomios: suma, resta y multiplicación" },
    { tipo: "topico", titulo: "Técnicas de factorización" },
    { tipo: "topico", titulo: "División de polinomios y teorema del residuo" },
    { tipo: "topico", titulo: "Expresiones racionales: simplificación y operaciones" },
    { tipo: "topico", titulo: "Números complejos: operaciones fundamentales" },
    { tipo: "topico", titulo: "Ecuaciones lineales y cuadráticas" },
    { tipo: "topico", titulo: "Sistemas de ecuaciones 2x2" },
    { tipo: "topico", titulo: "Desigualdades, intervalos y valor absoluto" },
    { tipo: "topico", titulo: "Logaritmos y ecuaciones exponenciales" },

    { tipo: "header", titulo: "Eje 3: Trigonometría" },
    { tipo: "topico", titulo: "Funciones trigonométricas: grados y radianes" },
    { tipo: "topico", titulo: "Trigonometría del triángulo rectángulo" },
    { tipo: "topico", titulo: "Identidades y ecuaciones trigonométricas" }
];


/* ========================================= */
/* HISTORIAL DEL CHAT */
/* ========================================= */

let historialChat = [];

/* Guarda, por cada tópico ya visitado en esta sesión (mientras
   no recargues la página), tanto el historial que se envía a la
   IA como los mensajes ya mostrados en pantalla, para poder
   restaurarlos al volver a ese tópico sin reiniciar la conversación. */

const historialesPorTema = {};

let temaActual = null;


/* ========================================= */
/* SELECCIONAR / OCULTAR MATERIA */
/* ========================================= */

function seleccionarMateria() {
    const botonMateria = document.getElementById("btn-matematicas");
    const seccionTopicos = document.getElementById("seccion-topicos");
    const lista = document.getElementById("lista-topicos");
    const estaOculto = seccionTopicos.classList.contains("hidden");

    botonMateria.classList.toggle("active");

    if (estaOculto) {
        seccionTopicos.classList.remove("hidden");

        if (lista.children.length === 0) {
            topicosMatematicas.forEach(item => {
                if (item.tipo === "header") {
                    const header = document.createElement("div");
                    header.className = "tema-header";
                    header.innerText = item.titulo;
                    lista.appendChild(header);
                } else {
                    const boton = document.createElement("button");
                    boton.className = "btn-topico";
                    boton.innerText = item.titulo;
                    boton.onclick = () => iniciarChatTopico(item.titulo, boton);
                    lista.appendChild(boton);
                }
            });
        }
    } else {
        seccionTopicos.classList.add("hidden");
    }
}


/* ========================================= */
/* INICIAR CHAT SEGÚN TÓPICO */
/* ========================================= */

function iniciarChatTopico(topico, btnElement) {
    document.querySelectorAll(".btn-topico").forEach(boton => {
        boton.classList.remove("active");
    });

    btnElement.classList.add("active");
    document.getElementById("header-title").innerText = `Tema seleccionado: ${topico}`;
    document.getElementById("input-area").classList.remove("hidden");
    document.getElementById("ai-badge").classList.remove("hidden");

    temaActual = topico;

    const chatContainer = document.getElementById("chat-container");
    chatContainer.innerHTML = "";

    /* Si ya habíamos hablado de este tema antes en esta sesión,
       restauramos la conversación guardada en vez de reiniciarla. */

    if (historialesPorTema[topico]) {
        historialChat = historialesPorTema[topico].historialChat;

        historialesPorTema[topico].mensajesUI.forEach(msg => {
            agregarMensajeUI(msg.texto, msg.emisor, { guardar: false });
        });

        return;
    }

    /* Primera vez que se visita este tema: se crea su historial */

    historialesPorTema[topico] = {
        historialChat: [],
        mensajesUI: []
    };

    historialChat = historialesPorTema[topico].historialChat;

    historialChat.push({
        role: "system",
        content: `
Eres un tutor virtual de apoyo académico para estudiantes de Matemáticas Básicas del ITM.

El estudiante ha seleccionado el siguiente tema:
"${topico}"

Tu función es ayudar al estudiante a comprender este tema.

Debes:
- Explicar los conceptos de manera clara y didáctica.
- Utilizar lenguaje apropiado para estudiantes universitarios.
- Desarrollar procedimientos matemáticos paso a paso.
- No omitir pasos importantes en los ejercicios.
- Proporcionar ejemplos cuando sean útiles.
- Explicar el razonamiento detrás de cada procedimiento.
- Corregir errores conceptuales del estudiante de manera clara.
- Fomentar el pensamiento crítico.
- Mantener las respuestas relacionadas principalmente con el tema seleccionado.

No debes simplemente entregar una respuesta final cuando el estudiante esté resolviendo un ejercicio. Debes orientar el proceso y explicar cómo llegar a la solución.

Formato de las fórmulas matemáticas (muy importante):
- Toda notación matemática (fracciones, conjuntos, símbolos como \\mathbb{N}, \\frac{}{}, \\neq, \\subset, exponentes, raíces, etc.) debe escribirse en formato LaTeX envuelta en delimitadores.
- Usa \\\\( ... \\\\) para fórmulas dentro de una línea de texto y \\\\[ ... \\\\] para fórmulas destacadas en su propia línea.
- Nunca escribas comandos de LaTeX sueltos entre paréntesis normales.
- Si no vas a usar notación LaTeX, escribe la expresión en texto plano simple.
- Usa tablas en markdown solo cuando ayuden a organizar información y evita poner fórmulas LaTeX complejas dentro de las celdas de una tabla.
`
    });

    const promptInicial = `
El estudiante seleccionó el tema:
"${topico}"

Genera una introducción académica y clara sobre este tema.

La respuesta debe incluir:
1. Una definición o explicación general.
2. Los conceptos principales.
3. Los elementos o propiedades más importantes.
4. Un ejemplo sencillo si es pertinente.
5. La importancia del tema dentro de Matemáticas Básicas.

Explica la información de manera estructurada y comprensible.
`;

    historialChat.push({
        role: "user",
        content: promptInicial
    });

    solicitarRespuestaIA();
}


/* ========================================= */
/* ENVIAR MENSAJE DEL USUARIO */
/* ========================================= */

function enviarMensajeUsuario() {
    const inputElement = document.getElementById("user-input");
    const mensaje = inputElement.value.trim();

    if (mensaje === "") return;

    agregarMensajeUI(mensaje, "user");
    inputElement.value = "";

    historialChat.push({
        role: "user",
        content: mensaje
    });

    solicitarRespuestaIA();
}


/* ========================================= */
/* MANEJO DE ENTER */
/* ========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("user-input");

    input.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            enviarMensajeUsuario();
        }
    });
});


/* ========================================= */
/* CONVERSIÓN DE TEXTO DE LA IA A HTML */
/* ========================================= */

function convertirTextoIAaHTML(texto) {
    const formulas = [];

    function marcarFormula(contenido, esDisplay) {
        const idx = formulas.length;
        formulas.push({ contenido, esDisplay });
        return `@@FORMULA_${idx}@@`;
    }

    let textoLimpio = texto;

    textoLimpio = textoLimpio.replace(
        /\\\[([\s\S]+?)\\\]/g,
        (_, c) => marcarFormula(c, true)
    );

    textoLimpio = textoLimpio.replace(
        /\$\$([\s\S]+?)\$\$/g,
        (_, c) => marcarFormula(c, true)
    );

    textoLimpio = textoLimpio.replace(
        /\\\(([\s\S]+?)\\\)/g,
        (_, c) => marcarFormula(c, false)
    );

    textoLimpio = textoLimpio.replace(
        /\[\s*(\\[a-zA-Z][^\[\]]*)\]/g,
        (_, c) => marcarFormula(c, true)
    );

    textoLimpio = textoLimpio.replace(
        /\(([^()]*\\[a-zA-Z][^()]*)\)/g,
        (_, c) => marcarFormula(c, false)
    );

    textoLimpio = textoLimpio.replace(
        /\$([^$\n]*\\[a-zA-Z][^$\n]*)\$/g,
        (_, c) => marcarFormula(c, false)
    );

    let html = marked.parse(textoLimpio);

    formulas.forEach((f, idx) => {
        let renderizado;

        try {
            renderizado = katex.renderToString(f.contenido, {
                throwOnError: false,
                displayMode: f.esDisplay,
                output: "html"
            });
        } catch (e) {
            renderizado = f.esDisplay
                ? `[${f.contenido}]`
                : `(${f.contenido})`;
        }

        html = html.replace(`@@FORMULA_${idx}@@`, renderizado);
    });

    return html;
}


/* ========================================= */
/* AGREGAR MENSAJE A LA INTERFAZ */
/* ========================================= */

function agregarMensajeUI(texto, emisor, opciones = {}) {
    const guardar = opciones.guardar !== false;

    const chatContainer = document.getElementById("chat-container");
    const mensajeDiv = document.createElement("div");

    mensajeDiv.className = `message ${emisor}`;

    if (emisor === "ai") {
        const htmlCrudo = convertirTextoIAaHTML(texto);
        const htmlSeguro = DOMPurify.sanitize(htmlCrudo, {
            ADD_ATTR: ["style"]
        });

        mensajeDiv.innerHTML = htmlSeguro;
    } else {
        mensajeDiv.innerText = texto;
    }

    chatContainer.appendChild(mensajeDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    /* Guardar este mensaje en el historial del tópico actual, para
       poder reconstruir la conversación al volver a este tópico.
       (No se guarda cuando estamos restaurando una conversación ya
       guardada, para no duplicar los mensajes). */

    if (guardar && temaActual && historialesPorTema[temaActual]) {
        historialesPorTema[temaActual].mensajesUI.push({ texto, emisor });
    }
}


/* ========================================= */
/* SOLICITAR RESPUESTA A LA IA */
/* ========================================= */

async function solicitarRespuestaIA() {
    const typingIndicator = document.getElementById("typing");
    const btnEnviar = document.getElementById("btn-enviar");

    typingIndicator.classList.remove("hidden");
    btnEnviar.disabled = true;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: historialChat
            })
        });

        if (!response.ok) {
            const errorData = await response.json();

            throw new Error(
                errorData.detalle ||
                errorData.error ||
                `Error del servidor: ${response.status}`
            );
        }

        const data = await response.json();
        const respuestaIA = data.respuesta;

        agregarMensajeUI(respuestaIA, "ai");

        historialChat.push({
            role: "assistant",
            content: respuestaIA
        });

    } catch (error) {
        console.error("Detalle técnico del error:", error);

        agregarMensajeUI(
            `Hubo un problema al conectar con la inteligencia artificial.

Detalle: ${error.message}`,
            "error"
        );

    } finally {
        typingIndicator.classList.add("hidden");
        btnEnviar.disabled = false;
        document.getElementById("user-input").focus();
    }
}