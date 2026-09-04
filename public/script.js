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
    const icono = document.querySelector("#btn-tema .menu-opciones-icono");
    const texto = document.getElementById("btn-tema-texto");
    const esOscuro = document.body.classList.contains("dark-mode");

    if (icono) icono.textContent = esOscuro ? "☀️" : "🌙";
    if (texto) texto.textContent = esOscuro ? "Modo claro" : "Modo oscuro";
}

document.addEventListener("DOMContentLoaded", aplicarTemaGuardado);


/* ========================================= */
/* MENÚ DE OPCIONES (desplegable) */
/* ========================================= */

function alternarMenuOpciones() {
    const menu = document.getElementById("menu-opciones");
    const boton = document.getElementById("btn-opciones");
    const seAbrio = menu.classList.toggle("hidden") === false;

    boton.setAttribute("aria-expanded", seAbrio ? "true" : "false");
}

function cerrarMenuOpciones() {
    document.getElementById("menu-opciones").classList.add("hidden");
    document.getElementById("btn-opciones").setAttribute("aria-expanded", "false");
}

document.addEventListener("DOMContentLoaded", () => {
    /* Cerrar el menú de opciones al hacer clic afuera, o tras elegir
       cualquiera de sus botones */

    document.addEventListener("click", event => {
        const wrapper = document.querySelector(".opciones-wrapper");
        if (wrapper && !wrapper.contains(event.target)) {
            cerrarMenuOpciones();
        }
    });

    document.querySelectorAll(".menu-opciones-item").forEach(item => {
        item.addEventListener("click", () => {
            /* El tema oscuro/claro se puede alternar varias veces
               seguidas, así que ese botón no cierra el menú; el
               resto de acciones sí lo cierran. */
            if (item.id !== "btn-tema") {
                cerrarMenuOpciones();
            }
        });
    });
});


/* ========================================= */
/* MENÚ LATERAL EN MÓVIL (tipo cajón) */
/* ========================================= */

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
/* HISTORIAL DEL CHAT (con persistencia) */
/* ========================================= */

/* Guarda, por cada tópico ya visitado, tanto el historial que se
   envía a la IA como los mensajes ya mostrados en pantalla. Se
   inicializa vacío y, si hay algo guardado de una sesión anterior,
   se rellena en cargarEstadoDesdeStorage(). */

const historialesPorTema = {};

let temaActual = null;

let controladorActual = null;

const CLAVE_STORAGE_HISTORIALES = "tutorIA_historiales";
const CLAVE_STORAGE_TEMA_ACTUAL = "tutorIA_temaActual";


function guardarEstadoEnStorage() {
    try {
        localStorage.setItem(CLAVE_STORAGE_HISTORIALES, JSON.stringify(historialesPorTema));
        localStorage.setItem(CLAVE_STORAGE_TEMA_ACTUAL, temaActual || "");
    } catch (error) {
        /* Si el navegador bloquea localStorage (modo incógnito
           estricto, cuota llena, etc.) la app sigue funcionando
           normalmente, solo que sin recordar el progreso. */
        console.warn("No se pudo guardar el progreso en este navegador:", error.message);
    }
}

function cargarEstadoDesdeStorage() {
    try {
        const guardado = localStorage.getItem(CLAVE_STORAGE_HISTORIALES);
        if (guardado) {
            const datos = JSON.parse(guardado);
            Object.assign(historialesPorTema, datos);
        }
    } catch (error) {
        console.warn("No se pudo restaurar el progreso guardado:", error.message);
    }
}


/* ========================================= */
/* SELECCIONAR / OCULTAR MATERIA */
/* ========================================= */

function seleccionarMateria() {
    const botonMateria = document.getElementById("btn-matematicas");
    const seccionTopicos = document.getElementById("seccion-topicos");
    const estaOculto = seccionTopicos.classList.contains("hidden");

    botonMateria.classList.toggle("active");
    seccionTopicos.classList.toggle("hidden", !estaOculto);
}


/* ========================================= */
/* CONSTRUIR LA LISTA DE TÓPICOS (una sola vez) */
/* ========================================= */

/* Se construye apenas carga la página (no solo al hacer clic en
   "Matemáticas Básicas"), para que los checkmarks ✓ de temas ya
   vistos aparezcan de inmediato si hay progreso guardado. */

function construirListaTopicos() {
    const lista = document.getElementById("lista-topicos");

    if (lista.children.length > 0) return;

    let grupoActual = null;

    topicosMatematicas.forEach(item => {
        if (item.tipo === "header") {
            const headerBtn = document.createElement("button");
            headerBtn.type = "button";
            headerBtn.className = "eje-header";

            const texto = document.createElement("span");
            texto.className = "eje-header-texto";
            texto.textContent = item.titulo;

            const icono = document.createElement("span");
            icono.className = "eje-header-icono";
            icono.textContent = "▸";

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
            textoSpan.textContent = item.titulo;

            const checkSpan = document.createElement("span");
            checkSpan.className = "btn-topico-check hidden";
            checkSpan.textContent = "✓";
            checkSpan.title = "Ya tienes una conversación guardada en este tema";

            /* Si ya había una conversación guardada (de una sesión
               anterior), el checkmark se muestra de inmediato */
            if (historialesPorTema[item.titulo]) {
                checkSpan.classList.remove("hidden");
            }

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


/* ========================================= */
/* BUSCADOR DE TÓPICOS */
/* ========================================= */

function filtrarTopicos() {
    const buscador = document.getElementById("buscador-topicos");
    const query = buscador.value.trim().toLowerCase();
    const lista = document.getElementById("lista-topicos");
    const hijos = Array.from(lista.children);

    if (query === "") {
        /* Sin texto en el buscador: se vuelve al comportamiento
           normal de acordeón (todo colapsado, todos los botones
           visibles otra vez) */

        hijos.forEach(hijo => {
            if (hijo.classList.contains("eje-header")) {
                hijo.classList.remove("abierto");
            } else if (hijo.classList.contains("grupo-topicos")) {
                hijo.classList.add("hidden");
                hijo.querySelectorAll(".btn-topico").forEach(b => b.classList.remove("hidden"));
            }
        });

        return;
    }

    let ejeActual = null;

    hijos.forEach(hijo => {
        if (hijo.classList.contains("eje-header")) {
            ejeActual = hijo;
            return;
        }

        if (!hijo.classList.contains("grupo-topicos")) return;

        let algunaCoincidencia = false;

        hijo.querySelectorAll(".btn-topico").forEach(boton => {
            const textoBoton = boton.querySelector(".btn-topico-texto").textContent.toLowerCase();
            const coincide = textoBoton.includes(query);

            boton.classList.toggle("hidden", !coincide);
            if (coincide) algunaCoincidencia = true;
        });

        /* El grupo (y su eje) se despliega automáticamente mientras
           haya una búsqueda activa con al menos una coincidencia */

        hijo.classList.toggle("hidden", !algunaCoincidencia);

        if (ejeActual) {
            ejeActual.classList.toggle("abierto", algunaCoincidencia);
        }
    });
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
- Mantener un tono profesional y académico, SIN usar emojis en ningún
  momento de la respuesta (ni para decorar títulos, ni para reaccionar,
  ni al final de las frases). El único caso permitido de símbolos
  gráficos es la notación matemática propiamente dicha.

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
    cerrarMenuMovil();

    document.querySelectorAll(".btn-topico").forEach(boton => {
        boton.classList.remove("active");
    });

    btnElement.classList.add("active");
    document.getElementById("header-title").textContent = topico;
    document.getElementById("input-area").classList.remove("hidden");
    document.getElementById("ai-badge").classList.remove("hidden");
    document.getElementById("btn-exportar-md").classList.remove("hidden");
    document.getElementById("btn-exportar-pdf").classList.remove("hidden");

    temaActual = topico;

    const chatMensajes = document.getElementById("chat-mensajes");
    chatMensajes.innerHTML = "";

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

    entrada.mensajesUI.forEach(msg => {
        agregarMensajeUI(msg.texto, msg.emisor, { topico, registro: msg });
    });

    if (entrada.estado === "nuevo" || entrada.estado === "pendiente") {
        solicitarRespuestaIA(topico);
    } else {
        actualizarIndicadorCarga();
    }

    guardarEstadoEnStorage();
}


/* ========================================= */
/* ENVIAR MENSAJE DEL USUARIO */
/* ========================================= */

function enviarMensajeUsuario() {
    const inputElement = document.getElementById("user-input");
    const mensaje = inputElement.value.trim();

    if (mensaje === "" || !temaActual) return;

    /* Defensa extra por si el límite del atributo maxlength del
       input llegara a saltarse por algún medio (el servidor igual
       lo vuelve a validar de todas formas). */
    if (mensaje.length > 1000) return;

    const topico = temaActual;
    const entrada = historialesPorTema[topico];

    if (!entrada) return;

    entrada.historialChat.push({ role: "user", content: mensaje });
    mostrarMensajeDeTema(topico, mensaje, "user");

    inputElement.value = "";

    const contador = document.getElementById("contador-caracteres");
    if (contador) {
        contador.textContent = "0 / 1000";
        contador.classList.remove("cerca-del-limite");
    }

    solicitarRespuestaIA(topico);
}


/* ========================================= */
/* INICIALIZACIÓN AL CARGAR LA PÁGINA */
/* ========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("user-input");

    input.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            enviarMensajeUsuario();
        }
    });

    const LIMITE_CARACTERES_MENSAJE = 1000;
    const contador = document.getElementById("contador-caracteres");

    input.addEventListener("input", () => {
        const longitud = input.value.length;

        contador.textContent = `${longitud} / ${LIMITE_CARACTERES_MENSAJE}`;
        contador.classList.toggle("cerca-del-limite", longitud >= LIMITE_CARACTERES_MENSAJE * 0.9);
    });

    const buscador = document.getElementById("buscador-topicos");
    if (buscador) {
        buscador.addEventListener("input", filtrarTopicos);
    }

    /* Restaurar progreso guardado de sesiones anteriores */

    cargarEstadoDesdeStorage();
    construirListaTopicos();

    const temaGuardado = localStorage.getItem(CLAVE_STORAGE_TEMA_ACTUAL);

    if (temaGuardado && historialesPorTema[temaGuardado]) {
        const botonTema = Array.from(document.querySelectorAll(".btn-topico"))
            .find(b => b.querySelector(".btn-topico-texto").textContent === temaGuardado);

        if (botonTema) {
            document.getElementById("btn-matematicas").classList.add("active");
            document.getElementById("seccion-topicos").classList.remove("hidden");

            const grupoPadre = botonTema.closest(".grupo-topicos");
            if (grupoPadre) {
                grupoPadre.classList.remove("hidden");

                const headerDelEje = grupoPadre.previousElementSibling;
                if (headerDelEje && headerDelEje.classList.contains("eje-header")) {
                    headerDelEje.classList.add("abierto");
                }
            }

            iniciarChatTopico(temaGuardado, botonTema);
        }
    }
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

        const clase = f.esDisplay ? "formula-bloque" : "formula-en-linea";
        const renderizado = `<span class="${clase}">${katexHtml}</span>`;

        html = html.replace(`@@FORMULA_${idx}@@`, renderizado);
    });

    html = html.replace(/<table>/g, '<div class="tabla-scroll"><table>');
    html = html.replace(/<\/table>/g, '</table></div>');

    return html;
}


/* ========================================= */
/* COPIAR AL PORTAPAPELES */
/* ========================================= */

function copiarAlPortapapeles(texto, boton, textoBotonNormal) {
    navigator.clipboard.writeText(texto).then(() => {
        boton.textContent = "¡Copiado!";

        setTimeout(() => {
            boton.textContent = textoBotonNormal;
        }, 1500);

    }).catch(err => {
        console.error("No se pudo copiar al portapapeles:", err);
    });
}

function agregarBotonesDeCodigo(mensajeDiv) {
    mensajeDiv.querySelectorAll("pre").forEach(pre => {
        if (pre.closest(".bloque-codigo")) return;

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
        etiqueta.textContent = lenguaje;

        const btnCopiar = document.createElement("button");
        btnCopiar.type = "button";
        btnCopiar.className = "bloque-codigo-copiar";
        btnCopiar.textContent = "Copiar";
        btnCopiar.onclick = () => {
            const textoCodigo = codeEl ? codeEl.textContent : pre.textContent;
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
    if (mensajeDiv.querySelector(".feedback-barra")) return;

    const { topico, registro } = contexto;

    const barra = document.createElement("div");
    barra.className = "feedback-barra";

    const btnUp = document.createElement("button");
    btnUp.type = "button";
    btnUp.className = "feedback-btn";
    btnUp.textContent = "Fue útil";
    btnUp.title = "Esta respuesta fue útil";

    const btnDown = document.createElement("button");
    btnDown.type = "button";
    btnDown.className = "feedback-btn";
    btnDown.textContent = "No fue útil";
    btnDown.title = "Esta respuesta no fue útil";

    function actualizarEstadoVisual() {
        btnUp.classList.toggle("activo", registro.valoracion === "up");
        btnDown.classList.toggle("activo", registro.valoracion === "down");
    }

    function valorar(valor) {
        registro.valoracion = registro.valoracion === valor ? null : valor;

        actualizarEstadoVisual();
        guardarEstadoEnStorage();

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
/* CONSTRUCCIÓN DE MENSAJES DE LA IA (streaming) */
/* ========================================= */

function crearMensajeVacioIA() {
    const chatMensajes = document.getElementById("chat-mensajes");
    const mensajeDiv = document.createElement("div");

    mensajeDiv.className = "message ai";

    chatMensajes.appendChild(mensajeDiv);

    return mensajeDiv;
}

function actualizarContenidoMensajeIA(mensajeDiv, texto) {
    const htmlCrudo = convertirTextoIAaHTML(texto);
    const htmlSeguro = DOMPurify.sanitize(htmlCrudo, { ADD_ATTR: ["style"] });

    mensajeDiv.innerHTML = htmlSeguro;
}

function finalizarMensajeIA(mensajeDiv, texto, contexto) {
    actualizarContenidoMensajeIA(mensajeDiv, texto);
    agregarBotonesDeCodigo(mensajeDiv);

    if (contexto && contexto.registro) {
        agregarBotonesFeedback(mensajeDiv, texto, contexto);
    }
}


/* ========================================= */
/* AGREGAR MENSAJE A LA INTERFAZ (solo pinta) */
/* ========================================= */

/* Se usa para mensajes de usuario, de error, y para REPINTAR
   respuestas de la IA que ya se recibieron por completo antes
   (al restaurar un tema visitado). Las respuestas NUEVAS de la IA
   se construyen en vivo con crearMensajeVacioIA + finalizarMensajeIA
   (ver ejecutarPeticionIA), para lograr el efecto de streaming. */

function agregarMensajeUI(texto, emisor, contexto = {}) {
    const chatContainer = document.getElementById("chat-container");

    if (emisor === "ai") {
        const mensajeDiv = crearMensajeVacioIA();
        finalizarMensajeIA(mensajeDiv, texto, contexto);
        return;
    }

    const chatMensajes = document.getElementById("chat-mensajes");
    const mensajeDiv = document.createElement("div");

    mensajeDiv.className = `message ${emisor}`;
    mensajeDiv.textContent = texto;

    chatMensajes.appendChild(mensajeDiv);

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
            md += `### Estudiante\n\n${msg.texto}\n\n`;
        } else if (msg.emisor === "ai") {
            md += `### Tutor IA\n\n${msg.texto}\n\n`;
        }
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

function exportarConversacionPDF() {
    if (!temaActual) return;
    window.print();
}


/* ========================================= */
/* GUARDAR + MOSTRAR UN MENSAJE (usuario / error) */
/* ========================================= */

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

    guardarEstadoEnStorage();
}


/* ========================================= */
/* INDICADOR DE "ESCRIBIENDO" / BOTÓN ENVIAR */
/* ========================================= */

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
/* SOLICITAR RESPUESTA A LA IA (streaming + cancelación + "debounce") */
/* ========================================= */

const ESPERA_ANTES_DE_ENVIAR_MS = 400;

let temporizadorPeticion = null;

function solicitarRespuestaIA(topico) {
    const entrada = historialesPorTema[topico];

    if (!entrada) return;

    if (temporizadorPeticion) {
        clearTimeout(temporizadorPeticion);
        temporizadorPeticion = null;
    }

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

    /* Si el usuario sigue viendo este tema, se prepara de una vez el
       "cascarón" del mensaje de la IA, para irlo llenando a medida
       que van llegando fragmentos de texto (streaming). Si ya
       cambió de tema, no se pinta nada en pantalla, pero la
       respuesta se sigue guardando en segundo plano igual. */

    let mensajeDivStreaming = null;
    let textoAcumulado = "";

    if (topico === temaActual) {
        mensajeDivStreaming = crearMensajeVacioIA();
    }

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

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const chatContainer = document.getElementById("chat-container");

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            textoAcumulado += decoder.decode(value, { stream: true });

            if (mensajeDivStreaming) {
                actualizarContenidoMensajeIA(mensajeDivStreaming, textoAcumulado);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }

        /* Marca especial que el servidor agrega si la conexión se
           cae después de que ya empezó a responder: se separa del
           texto real antes de guardarlo. */

        const marcaError = "\n\n[ERROR_STREAM]";
        const indiceError = textoAcumulado.indexOf(marcaError);

        if (indiceError !== -1) {
            textoAcumulado = textoAcumulado.slice(0, indiceError);
        }

        const preguntaAsociada =
            entrada.historialChat[entrada.historialChat.length - 1]?.content || "";

        entrada.historialChat.push({ role: "assistant", content: textoAcumulado });
        entrada.estado = "listo";

        const registro = {
            texto: textoAcumulado,
            emisor: "ai",
            pregunta: preguntaAsociada,
            valoracion: null
        };

        entrada.mensajesUI.push(registro);

        if (mensajeDivStreaming) {
            finalizarMensajeIA(mensajeDivStreaming, textoAcumulado, { topico, registro });
        } else if (topico === temaActual) {
            agregarMensajeUI(textoAcumulado, "ai", { topico, registro });
        }

        guardarEstadoEnStorage();

    } catch (error) {

        if (error.name === "AbortError") {
            if (mensajeDivStreaming) mensajeDivStreaming.remove();
            return;
        }

        console.error("Detalle técnico del error:", error);

        entrada.estado = "error";

        if (mensajeDivStreaming) mensajeDivStreaming.remove();

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