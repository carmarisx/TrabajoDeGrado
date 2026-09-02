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
            /* Contenedor del eje que se está armando en este momento;
               todos los tópicos que vengan después de un "header" se
               agregan dentro de este contenedor, hasta encontrar el
               siguiente header. */

            let grupoActual = null;

            topicosMatematicas.forEach(item => {
                if (item.tipo === "header") {
                    const headerBtn = document.createElement("button");
                    headerBtn.type = "button";
                    headerBtn.className = "eje-header";

                    const texto = document.createElement("span");
                    texto.className = "eje-header-texto";
                    texto.innerText = item.titulo;

                    const icono = document.createElement("span");
                    icono.className = "eje-header-icono";
                    icono.innerText = "▸";

                    headerBtn.appendChild(texto);
                    headerBtn.appendChild(icono);

                    const grupo = document.createElement("div");
                    grupo.className = "grupo-topicos hidden";

                    headerBtn.onclick = () => {
                        grupo.classList.toggle("hidden");
                        headerBtn.classList.toggle("abierto");
                    };

                    lista.appendChild(headerBtn);
                    lista.appendChild(grupo);

                    grupoActual = grupo;
                } else {
                    const boton = document.createElement("button");
                    boton.className = "btn-topico";

                    const textoSpan = document.createElement("span");
                    textoSpan.className = "btn-topico-texto";
                    textoSpan.innerText = item.titulo;

                    const checkSpan = document.createElement("span");
                    checkSpan.className = "btn-topico-check hidden";
                    checkSpan.innerText = "✓";
                    checkSpan.title = "Ya tienes una conversación guardada en este tema";

                    boton.appendChild(textoSpan);
                    boton.appendChild(checkSpan);

                    boton.onclick = () => iniciarChatTopico(item.titulo, boton);

                    if (grupoActual) {
                        grupoActual.appendChild(boton);
                    } else {
                        lista.appendChild(boton);
                    }
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
    document.getElementById("header-title").innerText = topico;
    document.getElementById("input-area").classList.remove("hidden");
    document.getElementById("ai-badge").classList.remove("hidden");
    document.getElementById("btn-exportar-md").classList.remove("hidden");
    document.getElementById("btn-exportar-pdf").classList.remove("hidden");

    temaActual = topico;

    const chatMensajes = document.getElementById("chat-mensajes");
    chatMensajes.innerHTML = "";

    /* Si es la primera vez que se visita este tópico, se crea su
       historial desde cero (system + prompt inicial), y se le marca
       el checkmark ✓ en el sidebar para indicar que ya tiene una
       conversación guardada. Si ya existía, NO se toca su
       historialChat: puede tener ya una respuesta completa, o puede
       haber quedado a medias por un cambio de tópico anterior, y eso
       se resuelve más abajo. */

    if (!historialesPorTema[topico]) {
        historialesPorTema[topico] = {
            historialChat: [
                { role: "system", content: construirPromptSistema(topico) },
                { role: "user", content: construirPromptInicial(topico) }
            ],
            mensajesUI: [],
            estado: "nuevo"
        };

        const checkEl = btnElement.querySelector(".btn-topico-check");
        if (checkEl) checkEl.classList.remove("hidden");
    }

    const entrada = historialesPorTema[topico];

    /* Repintar en pantalla lo que ya se había mostrado antes */

    entrada.mensajesUI.forEach(msg => {
        agregarMensajeUI(msg.texto, msg.emisor, { topico, registro: msg });
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

        /* A diferencia de antes, la fórmula ya NO se envuelve en su
           propio contenedor con scroll: solo se distingue si es en
           línea o en bloque, para darle un formato de texto
           adecuado. El único lugar donde se permite scroll horizontal
           por fórmulas es a nivel de tabla completa (ver más abajo). */

        const clase = f.esDisplay ? "formula-bloque" : "formula-en-linea";
        const renderizado = `<span class="${clase}">${katexHtml}</span>`;

        html = html.replace(`@@FORMULA_${idx}@@`, renderizado);
    });

    /* Si el markdown generó alguna tabla, se envuelve en un único
       contenedor con scroll horizontal (una sola barra para toda la
       tabla), en vez de que cada celda con una fórmula ancha tenga
       su propia mini barra de scroll. */

    html = html.replace(/<table>/g, '<div class="tabla-scroll"><table>');
    html = html.replace(/<\/table>/g, '</table></div>');

    return html;
}


/* ========================================= */
/* COPIAR AL PORTAPAPELES */
/* ========================================= */

function copiarAlPortapapeles(texto, boton, textoBotonNormal) {
    navigator.clipboard.writeText(texto).then(() => {
        const original = textoBotonNormal;

        boton.innerText = "¡Copiado!";

        setTimeout(() => {
            boton.innerText = original;
        }, 1500);

    }).catch(err => {
        console.error("No se pudo copiar al portapapeles:", err);
    });
}


/* Recorre los bloques de código dentro de un mensaje ya pintado y
   les agrega, arriba de cada uno, una barra con el lenguaje y un
   botón para copiar solo ese bloque (igual que ChatGPT/Claude). */

function agregarBotonesDeCodigo(mensajeDiv) {
    mensajeDiv.querySelectorAll("pre").forEach(pre => {
        const codeEl = pre.querySelector("code");

        let lenguaje = "Código";

        if (codeEl) {
            const match = codeEl.className.match(/language-(\w+)/);
            if (match) lenguaje = match[1];
        }

        const wrapper = document.createElement("div");
        wrapper.className = "bloque-codigo";

        const header = document.createElement("div");
        header.className = "bloque-codigo-header";

        const etiqueta = document.createElement("span");
        etiqueta.innerText = lenguaje;

        const btnCopiar = document.createElement("button");
        btnCopiar.type = "button";
        btnCopiar.className = "bloque-codigo-copiar";
        btnCopiar.innerText = "Copiar";
        btnCopiar.onclick = () => {
            const textoCodigo = codeEl ? codeEl.innerText : pre.innerText;
            copiarAlPortapapeles(textoCodigo, btnCopiar, "Copiar");
        };

        header.appendChild(etiqueta);
        header.appendChild(btnCopiar);

        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
    });
}


/* ========================================= */
/* VALORACIÓN DE RESPUESTAS (👍 / 👎) */
/* ========================================= */

function enviarFeedback(topico, pregunta, respuesta, valoracion) {
    fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topico, pregunta, respuesta, valoracion })
    }).catch(error => {
        console.error("No se pudo registrar el feedback:", error);
    });
}

function agregarBotonesFeedback(mensajeDiv, texto, contexto) {
    const { topico, registro } = contexto;

    const barra = document.createElement("div");
    barra.className = "feedback-barra";

    const btnUp = document.createElement("button");
    btnUp.type = "button";
    btnUp.className = "feedback-btn";
    btnUp.innerText = "👍";
    btnUp.title = "Esta respuesta fue útil";

    const btnDown = document.createElement("button");
    btnDown.type = "button";
    btnDown.className = "feedback-btn";
    btnDown.innerText = "👎";
    btnDown.title = "Esta respuesta no fue útil";

    function actualizarEstadoVisual() {
        btnUp.classList.toggle("activo", registro.valoracion === "up");
        btnDown.classList.toggle("activo", registro.valoracion === "down");
    }

    function valorar(valor) {
        /* Un segundo clic sobre el mismo botón quita la valoración */
        registro.valoracion = registro.valoracion === valor ? null : valor;

        actualizarEstadoVisual();

        if (registro.valoracion) {
            enviarFeedback(topico, registro.pregunta, texto, registro.valoracion);
        }
    }

    btnUp.onclick = () => valorar("up");
    btnDown.onclick = () => valorar("down");

    actualizarEstadoVisual();

    barra.appendChild(btnUp);
    barra.appendChild(btnDown);
    mensajeDiv.appendChild(barra);
}


/* ========================================= */
/* AGREGAR MENSAJE A LA INTERFAZ (solo pinta) */
/* ========================================= */

function agregarMensajeUI(texto, emisor, contexto = {}) {
    const chatContainer = document.getElementById("chat-container");
    const chatMensajes = document.getElementById("chat-mensajes");
    const mensajeDiv = document.createElement("div");

    mensajeDiv.className = `message ${emisor}`;

    if (emisor === "ai") {
        const htmlCrudo = convertirTextoIAaHTML(texto);
        const htmlSeguro = DOMPurify.sanitize(htmlCrudo, { ADD_ATTR: ["style"] });
        mensajeDiv.innerHTML = htmlSeguro;

        agregarBotonesDeCodigo(mensajeDiv);

        if (contexto.registro) {
            agregarBotonesFeedback(mensajeDiv, texto, contexto);
        }
    } else {
        mensajeDiv.innerText = texto;
    }

    chatMensajes.appendChild(mensajeDiv);

    /* Cuando TÚ envías un mensaje, la vista se acomoda para que tu
       pregunta quede arriba del todo (no al fondo), dejando visible
       hacia abajo todo el espacio para leer la respuesta de la IA
       desde su inicio, igual que en ChatGPT. Cuando responde la IA,
       no se mueve nada: te quedas leyendo desde donde ya estabas. */

    if (emisor === "user") {
        if (typeof mensajeDiv.scrollIntoView === "function") {
            mensajeDiv.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    } else if (emisor === "error") {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}


/* ========================================= */
/* EXPORTAR CONVERSACIÓN (Markdown / PDF) */
/* ========================================= */

function normalizarNombreArchivo(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function construirMarkdownConversacion(topico) {
    const entrada = historialesPorTema[topico];

    if (!entrada || entrada.mensajesUI.length === 0) {
        return `# ${topico}\n\nAún no hay conversación para exportar en este tema.\n`;
    }

    const fecha = new Date().toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    let md = `# ${topico}\n\n`;
    md += `_Conversación exportada del Tutor IA — Matemáticas Básicas ITM · ${fecha}_\n\n`;
    md += `---\n\n`;

    entrada.mensajesUI.forEach(msg => {
        if (msg.emisor === "user") {
            md += `### 🧑 Estudiante\n\n${msg.texto}\n\n`;
        } else if (msg.emisor === "ai") {
            md += `### 🤖 Tutor IA\n\n${msg.texto}\n\n`;
        }
        /* Los mensajes de error no se incluyen en la exportación */
    });

    return md;
}

function descargarArchivo(nombre, contenido, tipoMime) {
    const blob = new Blob([contenido], { type: tipoMime });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    URL.revokeObjectURL(url);
}

function exportarConversacionMarkdown() {
    if (!temaActual) return;

    const md = construirMarkdownConversacion(temaActual);
    const nombreArchivo = `conversacion-${normalizarNombreArchivo(temaActual)}.md`;

    descargarArchivo(nombreArchivo, md, "text/markdown;charset=utf-8");
}

/* Para el PDF se aprovecha la función de imprimir del navegador (sin
   depender de ninguna librería externa): se aplican estilos de
   impresión (@media print, en style.css) que ocultan el sidebar,
   los botones y el campo de texto, dejando solo la conversación
   lista para "Guardar como PDF" desde el diálogo de impresión. */

function exportarConversacionPDF() {
    if (!temaActual) return;
    window.print();
}


/* ========================================= */
/* GUARDAR + MOSTRAR UN MENSAJE DE UN TÓPICO */
/* ========================================= */

/* Guarda el mensaje en el historial del tópico al que pertenece
   (sin importar si el usuario sigue viéndolo o no), y solo lo
   pinta en pantalla si ese tópico sigue siendo el que está activo.
   Así, una respuesta "tardía" de un tópico que ya no se está viendo
   nunca se mezcla con el tópico que el usuario tiene abierto ahora. */

function mostrarMensajeDeTema(topico, texto, emisor, contexto = {}) {
    const entrada = historialesPorTema[topico];

    const registro = {
        texto,
        emisor,
        pregunta: contexto.pregunta || null,
        valoracion: null
    };

    if (entrada) {
        entrada.mensajesUI.push(registro);
    }

    if (topico === temaActual) {
        agregarMensajeUI(texto, emisor, { topico, registro });
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
            body: JSON.stringify({ messages: entrada.historialChat, topico }),
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

        /* Se guarda cuál fue la pregunta que generó esta respuesta,
           para poder mandarla junto con el 👍/👎 que dé el estudiante
           y así el log de feedback tenga contexto completo. */

        const preguntaAsociada =
            entrada.historialChat[entrada.historialChat.length - 1]?.content || "";

        entrada.historialChat.push({ role: "assistant", content: respuestaIA });
        entrada.estado = "listo";

        mostrarMensajeDeTema(topico, respuestaIA, "ai", { pregunta: preguntaAsociada });

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