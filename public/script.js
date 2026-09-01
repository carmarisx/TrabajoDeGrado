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
/* MENÚ LATERAL EN MÓVIL (tipo cajón) */
/* ========================================= */

/* En escritorio, esta clase no tiene ningún efecto visual (el CSS
   solo la usa dentro del media query de móvil). En móvil, controla
   si el panel de temas se ve como una capa flotante sobre el chat. */

function abrirMenuMovil() {
    document.body.classList.add("sidebar-abierta");
}

function cerrarMenuMovil() {
    document.body.classList.remove("sidebar-abierta");
}


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
/* ESTADO DE LA CONVERSACIÓN POR TÓPICO */
/* ========================================= */

/* Por cada tópico ya visitado en esta sesión se guarda:
   - historialChat: lo que se le envía a la IA (system/user/assistant)
   - mensajesUI: lo que se muestra en pantalla (para restaurarlo)
   - estado: 'nuevo' | 'pendiente' | 'listo' | 'error'
     · 'pendiente' = hay una respuesta de la IA que todavía no ha
       llegado (o que se canceló a mitad de camino porque el usuario
       cambió de tópico). Si el usuario vuelve a este tópico estando
       en 'pendiente', se vuelve a pedir la respuesta automáticamente,
       en vez de dejar el chat vacío. */

const historialesPorTema = {};

let temaActual = null;

/* Solo puede haber UNA petición "viva" a la vez. Cada vez que se iba
   a lanzar una nueva, se cancela la anterior con AbortController, así
   nunca se cruzan dos respuestas ni se pisa el estado entre tópicos. */

let controladorActual = null;


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
/* CONSTRUCCIÓN DE PROMPTS */
/* ========================================= */

function construirPromptSistema(topico) {
    return `
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

Cuando sea apropiado, finaliza proponiendo un ejercicio, un ejemplo adicional o preguntando al estudiante qué parte del tema desea profundizar.

Idioma y manejo de mensajes fuera de tema (muy importante):
- Responde SIEMPRE en español, sin importar el contenido o el idioma del mensaje del estudiante.
- Si el estudiante escribe un saludo, algo casual, una pregunta personal o cualquier cosa que no tenga que ver con Matemáticas Básicas, respóndele brevemente y con amabilidad en español, y redirígelo de vuelta hacia el tema de la materia.
- Si el estudiante pide algo que no puedas o no debas responder por ser inapropiado, sensible o fuera de tu rol como tutor académico, recházalo de forma breve, respetuosa y en español (nunca en inglés ni con una respuesta genérica sin contexto), y luego invítalo a retomar el tema de Matemáticas Básicas.

Formato de las fórmulas matemáticas (muy importante):
- Toda notación matemática (fracciones, conjuntos, símbolos como \\mathbb{N}, \\frac{}{}, \\neq, \\subset, exponentes, raíces, etc.) debe escribirse en formato LaTeX envuelta en delimitadores: usa \\( ... \\) para fórmulas dentro de una línea de texto, y \\[ ... \\] para fórmulas destacadas en su propia línea.
- Nunca escribas comandos de LaTeX sueltos entre paréntesis normales, por ejemplo NO escribas (\\frac{p}{q}); en su lugar escribe \\(\\frac{p}{q}\\).
- Si no vas a usar notación LaTeX, escribe la expresión en texto plano simple (por ejemplo "p dividido entre q") en vez de mezclar comandos LaTeX sin delimitadores.
- Usa tablas en markdown solo cuando ayuden a organizar información, y evita poner fórmulas LaTeX complejas dentro de las celdas de una tabla.
`;
}

function construirPromptInicial(topico) {
    return `
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
}


/* ========================================= */
/* INICIAR CHAT SEGÚN TÓPICO */
/* ========================================= */

function iniciarChatTopico(topico, btnElement) {
    /* En móvil, cerrar el menú lateral apenas se elige un tema,
       para que el chat quede visible a pantalla completa. En
       escritorio esto no tiene ningún efecto. */

    cerrarMenuMovil();

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

    /* Si es la primera vez que se visita este tópico, se crea su
       historial desde cero (system + prompt inicial). Si ya existía,
       NO se toca su historialChat: puede tener ya una respuesta
       completa, o puede haber quedado a medias por un cambio de
       tópico anterior, y eso se resuelve más abajo. */

    if (!historialesPorTema[topico]) {
        historialesPorTema[topico] = {
            historialChat: [
                { role: "system", content: construirPromptSistema(topico) },
                { role: "user", content: construirPromptInicial(topico) }
            ],
            mensajesUI: [],
            estado: "nuevo"
        };
    }

    const entrada = historialesPorTema[topico];

    /* Repintar en pantalla lo que ya se había mostrado antes */

    entrada.mensajesUI.forEach(msg => {
        agregarMensajeUI(msg.texto, msg.emisor);
    });

    /* Si el tópico es nuevo, o quedó con una respuesta pendiente
       (se interrumpió por un cambio de tópico anterior), se
       (re)lanza la petición a la IA. Si ya está "listo" o terminó
       en "error", no se vuelve a llamar a la IA automáticamente. */

    if (entrada.estado === "nuevo" || entrada.estado === "pendiente") {
        solicitarRespuestaIA(topico);
    } else {
        actualizarIndicadorCarga();
    }
}


/* ========================================= */
/* ENVIAR MENSAJE DEL USUARIO */
/* ========================================= */

function enviarMensajeUsuario() {
    const inputElement = document.getElementById("user-input");
    const mensaje = inputElement.value.trim();

    if (mensaje === "" || !temaActual) return;

    const topico = temaActual;
    const entrada = historialesPorTema[topico];

    if (!entrada) return;

    entrada.historialChat.push({ role: "user", content: mensaje });
    mostrarMensajeDeTema(topico, mensaje, "user");

    inputElement.value = "";

    solicitarRespuestaIA(topico);
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
/* (markdown + fórmulas matemáticas LaTeX) */
/* ========================================= */

function convertirTextoIAaHTML(texto) {
    const formulas = [];

    function marcarFormula(contenido, esDisplay) {
        const idx = formulas.length;
        formulas.push({ contenido, esDisplay });
        return `@@FORMULA_${idx}@@`;
    }

    let textoLimpio = texto;

    textoLimpio = textoLimpio.replace(/\\\[([\s\S]+?)\\\]/g, (_, c) => marcarFormula(c, true));
    textoLimpio = textoLimpio.replace(/\$\$([\s\S]+?)\$\$/g, (_, c) => marcarFormula(c, true));
    textoLimpio = textoLimpio.replace(/\\\(([\s\S]+?)\\\)/g, (_, c) => marcarFormula(c, false));
    textoLimpio = textoLimpio.replace(/\[\s*(\\[a-zA-Z][^\[\]]*)\]/g, (_, c) => marcarFormula(c, true));
    textoLimpio = textoLimpio.replace(/\(([^()]*\\[a-zA-Z][^()]*)\)/g, (_, c) => marcarFormula(c, false));
    textoLimpio = textoLimpio.replace(/\$([^$\n]*\\[a-zA-Z][^$\n]*)\$/g, (_, c) => marcarFormula(c, false));

    let html = marked.parse(textoLimpio);

    formulas.forEach((f, idx) => {
        let katexHtml;

        try {
            katexHtml = katex.renderToString(f.contenido, {
                throwOnError: false,
                displayMode: f.esDisplay,
                output: "html"
            });
        } catch (e) {
            katexHtml = f.esDisplay ? `[${f.contenido}]` : `(${f.contenido})`;
        }

        /* Se envuelve la fórmula (sea en línea o en bloque) en un
           contenedor con scroll horizontal propio, para que una
           fórmula muy ancha nunca empuje ni desborde la burbuja del
           chat completa. */

        const clase = f.esDisplay ? "formula-bloque" : "formula-en-linea";
        const renderizado = `<span class="${clase}">${katexHtml}</span>`;

        html = html.replace(`@@FORMULA_${idx}@@`, renderizado);
    });

    return html;
}


/* ========================================= */
/* AGREGAR MENSAJE A LA INTERFAZ (solo pinta) */
/* ========================================= */

function agregarMensajeUI(texto, emisor) {
    const chatContainer = document.getElementById("chat-container");
    const mensajeDiv = document.createElement("div");

    mensajeDiv.className = `message ${emisor}`;

    if (emisor === "ai") {
        const htmlCrudo = convertirTextoIAaHTML(texto);
        const htmlSeguro = DOMPurify.sanitize(htmlCrudo, { ADD_ATTR: ["style"] });
        mensajeDiv.innerHTML = htmlSeguro;
    } else {
        mensajeDiv.innerText = texto;
    }

    chatContainer.appendChild(mensajeDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}


/* ========================================= */
/* GUARDAR + MOSTRAR UN MENSAJE DE UN TÓPICO */
/* ========================================= */

/* Guarda el mensaje en el historial del tópico al que pertenece
   (sin importar si el usuario sigue viéndolo o no), y solo lo
   pinta en pantalla si ese tópico sigue siendo el que está activo.
   Así, una respuesta "tardía" de un tópico que ya no se está viendo
   nunca se mezcla con el tópico que el usuario tiene abierto ahora. */

function mostrarMensajeDeTema(topico, texto, emisor) {
    const entrada = historialesPorTema[topico];

    if (entrada) {
        entrada.mensajesUI.push({ texto, emisor });
    }

    if (topico === temaActual) {
        agregarMensajeUI(texto, emisor);
    }
}


/* ========================================= */
/* INDICADOR DE "ESCRIBIENDO" / BOTÓN ENVIAR */
/* ========================================= */

/* Se basa únicamente en el estado del tópico que está activo en
   este momento, así que si una petición vieja de otro tópico
   termina en segundo plano, no altera lo que ve el usuario ahora. */

function actualizarIndicadorCarga() {
    const typingIndicator = document.getElementById("typing");
    const btnEnviar = document.getElementById("btn-enviar");

    const entrada = temaActual ? historialesPorTema[temaActual] : null;
    const cargando = !!entrada && entrada.estado === "pendiente";

    typingIndicator.classList.toggle("hidden", !cargando);
    btnEnviar.disabled = cargando;

    if (!cargando) {
        document.getElementById("user-input").focus();
    }
}


/* ========================================= */
/* SOLICITAR RESPUESTA A LA IA (con cancelación y "debounce") */
/* ========================================= */

/* Si el usuario cambia de tópico muy rápido varias veces seguidas,
   no tiene sentido disparar una petición real a la IA por cada clic
   intermedio (eso gasta tokens y puede agotar el límite por minuto
   del proveedor). Por eso se espera un instante corto antes de
   enviar la petición de verdad: si en ese instante se vuelve a
   pedir otra respuesta (otro cambio de tópico), se cancela el envío
   pendiente sin haber gastado nada todavía. */

const ESPERA_ANTES_DE_ENVIAR_MS = 400;

let temporizadorPeticion = null;

function solicitarRespuestaIA(topico) {
    const entrada = historialesPorTema[topico];

    if (!entrada) return;

    /* Cancelar un envío que todavía no había salido */

    if (temporizadorPeticion) {
        clearTimeout(temporizadorPeticion);
        temporizadorPeticion = null;
    }

    /* Cancelar una petición que ya está en curso (de este mismo
       tópico o de otro) */

    if (controladorActual) {
        controladorActual.abort();
        controladorActual = null;
    }

    entrada.estado = "pendiente";
    actualizarIndicadorCarga();

    temporizadorPeticion = setTimeout(() => {
        temporizadorPeticion = null;
        ejecutarPeticionIA(topico);
    }, ESPERA_ANTES_DE_ENVIAR_MS);
}

async function ejecutarPeticionIA(topico) {
    const entrada = historialesPorTema[topico];

    if (!entrada) return;

    const miControlador = new AbortController();
    controladorActual = miControlador;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: entrada.historialChat }),
            signal: miControlador.signal
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

        entrada.historialChat.push({ role: "assistant", content: respuestaIA });
        entrada.estado = "listo";

        mostrarMensajeDeTema(topico, respuestaIA, "ai");

    } catch (error) {

        if (error.name === "AbortError") {
            /* Petición cancelada intencionalmente porque el usuario
               cambió de tópico. No es un error real: no se muestra
               nada, y el tópico queda en "pendiente" para volver a
               intentarse solo si el usuario regresa a él. */
            return;
        }

        console.error("Detalle técnico del error:", error);

        entrada.estado = "error";

        mostrarMensajeDeTema(
            topico,
            `Hubo un problema al conectar con la inteligencia artificial.

Detalle: ${error.message}`,
            "error"
        );

    } finally {

        if (controladorActual === miControlador) {
            controladorActual = null;
        }

        actualizarIndicadorCarga();
    }
}