const form = document.getElementById('formulario');

const nombreInput = document.getElementById('nombre');

const mensajeInput = document.getElementById('message');

const listaPublicaciones = document.getElementById('listaPublicaciones');

const resumenPublicacionesEl = document.getElementById('resumenPublicaciones');

const resumenLikesEl = document.getElementById('resumenLikes');

const resumenMeEncantaEl = document.getElementById('resumenMeEncanta');

const resumenMeDivierteEl = document.getElementById('resumenMeDivierte');

const resumenComentariosEl = document.getElementById('resumenComentarios');

const contadorCaracteresEl = document.getElementById('contadorCaracteres');

const MAX_CARACTERES_MENSAJE = 200;


// --- Tema oscuro/claro ---

const temaToggle = document.getElementById('temaToggle');

function aplicarTema(tema) {
  const esClaro = tema === 'claro';

  document.body.classList.toggle('tema-claro', esClaro);

  localStorage.setItem('tema', tema);

  if (temaToggle) {
    temaToggle.setAttribute('aria-pressed', String(esClaro));
  }
}

function inicializarTema() {
  // El tema claro es el predeterminado si el usuario
  // todavía no eligió ninguno.
  const temaGuardado = localStorage.getItem('tema') || 'claro';

  aplicarTema(temaGuardado);
}

if (temaToggle) {
  temaToggle.addEventListener('click', () => {
    const temaActual = document.body.classList.contains('tema-claro')
      ? 'claro'
      : 'oscuro';

    aplicarTema(temaActual === 'claro' ? 'oscuro' : 'claro');
  });
}

inicializarTema();


// Guarda el id de la publicación que está actualmente en modo edición.
// Al ser null, ninguna publicación se muestra en modo edición.
let editandoId = null;

// H12: Guarda la publicación y el comentario que están en edición.
let editandoComentario = {
  publicacionId: null,
  comentarioId: null
};

let terminoBusqueda = '';


// Criterio de orden actualmente seleccionado. Solo vive en memoria.
let ordenSeleccionado = 'recientes';


function generarIdPublicacion() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `pub-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}


function generarIdComentario() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `com-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}


function normalizarComentarios(comentarios) {
  const idsUtilizados = new Set();

  return (Array.isArray(comentarios) ? comentarios : []).map((comentario) => {
    let id = comentario.id;

    // H12: Cada comentario debe tener un id único.
    if (!id || idsUtilizados.has(id)) {
      id = generarIdComentario();

      while (idsUtilizados.has(id)) {
        id = generarIdComentario();
      }
    }

    idsUtilizados.add(id);

    return {
      ...comentario,
      id,
      autor: comentario.autor || 'Anónimo',
      texto: comentario.texto || '',
      fecha: comentario.fecha || new Date().toISOString()
    };
  });
}


function normalizarPublicaciones(publicaciones) {
  return (Array.isArray(publicaciones) ? publicaciones : []).map((publicacion) => {
    const { likes, dislikes, ...rest } = publicacion;

    return {
      ...rest,
      id: publicacion.id || generarIdPublicacion(),
      reacciones: {
        meGusta: Number(
          publicacion.reacciones?.meGusta ?? likes ?? 0
        ) || 0,
        meEncanta: Number(
          publicacion.reacciones?.meEncanta ?? 0
        ) || 0,
        meDivierte: Number(
          publicacion.reacciones?.meDivierte ?? 0
        ) || 0
      },
      respuestas: Array.isArray(publicacion.respuestas)
        ? publicacion.respuestas
        : [],
      comentarios: normalizarComentarios(publicacion.comentarios)
    };
  });
}


function obtenerPublicaciones() {
  const datos = localStorage.getItem('publicaciones');

  if (!datos) {
    return [];
  }

  try {
    const publicaciones = JSON.parse(datos);
    const publicacionesNormalizadas = normalizarPublicaciones(publicaciones);

    const huboCambios =
      JSON.stringify(publicaciones) !==
      JSON.stringify(publicacionesNormalizadas);

    if (huboCambios) {
      guardarPublicaciones(publicacionesNormalizadas);
    }

    return publicacionesNormalizadas;
  } catch (error) {
    console.error('No se pudieron cargar las publicaciones:', error);
    return [];
  }
}


function guardarPublicaciones(publicaciones) {
  localStorage.setItem(
    'publicaciones',
    JSON.stringify(normalizarPublicaciones(publicaciones))
  );
}


function escaparTexto(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


function formatearFecha(fecha) {
  if (!fecha) {
    return '';
  }

  const fechaPublicacion = new Date(fecha);

  if (Number.isNaN(fechaPublicacion.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(fechaPublicacion);
}


function filtrarPublicaciones(publicaciones, termino) {
  const textoBusqueda = termino.trim().toLowerCase();

  if (!textoBusqueda) {
    return publicaciones;
  }

  return publicaciones.filter((publicacion) => {
    const autor = String(publicacion.usuario || '').toLowerCase();
    const contenido = String(publicacion.contenido || '').toLowerCase();

    return (
      autor.includes(textoBusqueda) ||
      contenido.includes(textoBusqueda)
    );
  });
}


// --- H9: Ordenar publicaciones ---

function ordenarPublicaciones(publicaciones, criterio) {
  const copia = [...publicaciones];

  switch (criterio) {
    case 'antiguas':
      return copia.sort(
        (a, b) => new Date(a.fecha) - new Date(b.fecha)
      );

    case 'populares':
      return copia.sort((a, b) => {
        const diferenciaLikes =
          (Number(b.reacciones?.meGusta) || 0) -
          (Number(a.reacciones?.meGusta) || 0);

        if (diferenciaLikes !== 0) {
          return diferenciaLikes;
        }

        return new Date(b.fecha) - new Date(a.fecha);
      });

    case 'recientes':
    default:
      return copia.sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
      );
  }
}


// --- H11: Contador de caracteres ---

function actualizarContadorCaracteres() {
  if (!mensajeInput || !contadorCaracteresEl) {
    return;
  }

  const caracteresUsados = mensajeInput.value.length;

  const caracteresRestantes =
    MAX_CARACTERES_MENSAJE - caracteresUsados;

  contadorCaracteresEl.textContent =
    `${caracteresRestantes} ${
      caracteresRestantes === 1
        ? 'carácter'
        : 'caracteres'
    } restantes`;

  contadorCaracteresEl.classList.toggle(
    'limite-alcanzado',
    caracteresRestantes === 0
  );
}


// --- Renderizado ---

function renderizarPublicaciones() {
  const publicaciones = obtenerPublicaciones();

  renderizarResumen(publicaciones);

  const publicacionesFiltradas =
    filtrarPublicaciones(
      publicaciones,
      terminoBusqueda
    );

  const publicacionesMostradas =
    ordenarPublicaciones(
      publicacionesFiltradas,
      ordenSeleccionado
    );

  if (!publicaciones.length) {
    listaPublicaciones.innerHTML =
      '<p class="vacio">Aún no hay publicaciones.</p>';
    return;
  }

  if (!publicacionesMostradas.length) {
    listaPublicaciones.innerHTML =
      '<p class="vacio">No se encontraron publicaciones que coincidan con la búsqueda.</p>';
    return;
  }

  listaPublicaciones.innerHTML = '';

  publicacionesMostradas.forEach((publicacion) => {
    const articulo = document.createElement('article');

    articulo.className = 'publicacion';

    const enEdicion =
      publicacion.id === editandoId;

    const contenidoActual =
      String(publicacion.contenido || '');

    const caracteresRestantesEdicion =
      Math.max(
        0,
        MAX_CARACTERES_MENSAJE -
          contenidoActual.length
      );

    const bloqueContenido = enEdicion
      ? `
        <div class="edicion-contenedor">

          <textarea
            class="input-editar"
            data-id="${publicacion.id}"
            rows="3"
            maxlength="${MAX_CARACTERES_MENSAJE}"
          >${escaparTexto(contenidoActual)}</textarea>

          <p
            class="contador-edicion ${
              caracteresRestantesEdicion === 0
                ? 'limite-alcanzado'
                : ''
            }"
            data-id="${publicacion.id}"
          >
            ${caracteresRestantesEdicion}
            ${
              caracteresRestantesEdicion === 1
                ? 'carácter'
                : 'caracteres'
            }
            restantes
          </p>

          <p
            class="error-edicion"
            id="error-editar-${publicacion.id}"
          ></p>

          <div class="botones-edicion">
            <button
              class="btn-guardar-edicion"
              data-id="${publicacion.id}"
              type="button"
            >
              Guardar
            </button>

            <button
              class="btn-cancelar-edicion"
              data-id="${publicacion.id}"
              type="button"
            >
              Cancelar
            </button>
          </div>

        </div>
      `
      : `<p>${escaparTexto(contenidoActual)}</p>`;

    const comentarios =
      Array.isArray(publicacion.comentarios)
        ? publicacion.comentarios
        : [];

    articulo.innerHTML = `
      <div class="publicacion-header">
        <strong>
          ${escaparTexto(publicacion.usuario)}
        </strong>

        <span>
          ${formatearFecha(publicacion.fecha)}
        </span>
      </div>

      ${bloqueContenido}

      <div class="acciones-publicacion">

        <div class="acciones-reaccion">

          <button
            class="btn-reaccion btn-like"
            data-id="${publicacion.id}"
            data-tipo="meGusta"
            type="button"
          >
            Me gusta
            <span class="contador">
              ${Number(publicacion.reacciones?.meGusta || 0)}
            </span>
          </button>

          <button
            class="btn-reaccion btn-encanta"
            data-id="${publicacion.id}"
            data-tipo="meEncanta"
            type="button"
          >
            Me encanta
            <span class="contador">
              ${Number(publicacion.reacciones?.meEncanta || 0)}
            </span>
          </button>

          <button
            class="btn-reaccion btn-divierte"
            data-id="${publicacion.id}"
            data-tipo="meDivierte"
            type="button"
          >
            Me divierte
            <span class="contador">
              ${Number(publicacion.reacciones?.meDivierte || 0)}
            </span>
          </button>

        </div>

        <div class="acciones-gestion">

          <button
            class="btn-editar"
            data-id="${publicacion.id}"
            type="button"
            ${enEdicion ? 'disabled' : ''}
          >
            Editar
          </button>

          <button
            class="btn-eliminar"
            data-id="${publicacion.id}"
            type="button"
          >
            Eliminar
          </button>

        </div>

      </div>

      <div class="lista-respuestas">
        ${
          (publicacion.respuestas || [])
            .map(
              (respuesta) =>
                `<p>${escaparTexto(respuesta)}</p>`
            )
            .join('')
        }
      </div>

      <div
        class="comentarios-contenedor"
        id="comentarios-${publicacion.id}"
      >

        <h3 class="comentarios-titulo">
          Comentarios (${comentarios.length})
        </h3>

        <div class="comentario-form">

          <input
            type="text"
            class="input-comentario-nombre"
            placeholder="Tu nombre"
          >

          <input
            type="text"
            class="input-comentario-texto"
            placeholder="Escribe un comentario..."
          >

          <p
            class="error-comentario"
            id="error-comentario-${publicacion.id}"
          ></p>

          <button
            class="btn-enviar-comentario"
            data-id="${publicacion.id}"
            type="button"
          >
            Comentar
          </button>

        </div>

        <div class="lista-comentarios">

          ${
            comentarios
              .map((comentario) => {

                const comentarioEnEdicion =
                  editandoComentario.publicacionId === publicacion.id &&
                  editandoComentario.comentarioId === comentario.id;

                if (comentarioEnEdicion) {
                  return `
                    <div
                      class="comentario"
                      data-comentario-id="${comentario.id}"
                    >

                      <div class="comentario-header">
                        <strong>
                          ${escaparTexto(comentario.autor)}
                        </strong>

                        <span>
                          ${formatearFecha(comentario.fecha)}
                        </span>
                      </div>

                      <div class="edicion-comentario-contenedor">

                        <input
                          type="text"
                          class="input-editar-comentario"
                          data-publicacion-id="${publicacion.id}"
                          data-comentario-id="${comentario.id}"
                          value="${escaparTexto(comentario.texto)}"
                        >

                        <p
                          class="error-edicion-comentario"
                          id="error-editar-comentario-${comentario.id}"
                        ></p>

                        <div class="botones-edicion-comentario">

                          <button
                            class="btn-guardar-comentario"
                            data-publicacion-id="${publicacion.id}"
                            data-comentario-id="${comentario.id}"
                            type="button"
                          >
                            Guardar
                          </button>

                          <button
                            class="btn-cancelar-comentario"
                            data-publicacion-id="${publicacion.id}"
                            data-comentario-id="${comentario.id}"
                            type="button"
                          >
                            Cancelar
                          </button>

                        </div>

                      </div>

                    </div>
                  `;
                }

                return `
                  <div
                    class="comentario"
                    data-comentario-id="${comentario.id}"
                  >

                    <div class="comentario-header">
                      <strong>
                        ${escaparTexto(comentario.autor)}
                      </strong>

                      <span>
                        ${formatearFecha(comentario.fecha)}
                      </span>
                    </div>

                    <p>
                      ${escaparTexto(comentario.texto)}
                    </p>

                    <div class="acciones-comentario">

                      <button
                        class="btn-editar-comentario"
                        data-publicacion-id="${publicacion.id}"
                        data-comentario-id="${comentario.id}"
                        type="button"
                      >
                        Editar
                      </button>

                      <button
                        class="btn-eliminar-comentario"
                        data-publicacion-id="${publicacion.id}"
                        data-comentario-id="${comentario.id}"
                        type="button"
                      >
                        Eliminar
                      </button>

                    </div>

                  </div>
                `;
              })
              .join('')
          }

        </div>

      </div>
    `;

    listaPublicaciones.appendChild(articulo);
  });


  // Si hay una publicación en edición,
  // enfocamos su textarea.
  if (editandoId) {
    const textarea = document.querySelector(
      `.input-editar[data-id="${editandoId}"]`
    );

    if (textarea) {
      textarea.focus();

      textarea.selectionStart =
        textarea.value.length;

      textarea.selectionEnd =
        textarea.value.length;
    }
  }

  // H12: Si hay un comentario en edición,
  // enfocamos su campo de texto.
  if (editandoComentario.publicacionId &&
      editandoComentario.comentarioId) {

    const input = document.querySelector(
      `.input-editar-comentario[data-publicacion-id="${editandoComentario.publicacionId}"][data-comentario-id="${editandoComentario.comentarioId}"]`
    );

    if (input) {
      input.focus();

      input.selectionStart =
        input.value.length;

      input.selectionEnd =
        input.value.length;
    }
  }
}


// --- H10: Resumen ---

function calcularResumen(publicaciones) {
  const totalPublicaciones =
    publicaciones.length;

  const totalLikes = publicaciones.reduce(
    (total, publicacion) =>
      total +
      (Number(publicacion.reacciones?.meGusta) || 0),
    0
  );

  const totalMeEncanta = publicaciones.reduce(
    (total, publicacion) =>
      total +
      (Number(publicacion.reacciones?.meEncanta) || 0),
    0
  );

  const totalMeDivierte = publicaciones.reduce(
    (total, publicacion) =>
      total +
      (Number(publicacion.reacciones?.meDivierte) || 0),
    0
  );

  const totalComentarios =
    publicaciones.reduce(
      (total, publicacion) => {
        const comentarios =
          Array.isArray(publicacion.comentarios)
            ? publicacion.comentarios
            : [];

        return total + comentarios.length;
      },
      0
    );

  return {
    totalPublicaciones,
    totalLikes,
    totalMeEncanta,
    totalMeDivierte,
    totalComentarios
  };
}


function renderizarResumen(publicaciones) {
  if (
    !resumenPublicacionesEl ||
    !resumenLikesEl ||
    !resumenMeEncantaEl ||
    !resumenMeDivierteEl ||
    !resumenComentariosEl
  ) {
    return;
  }

  const {
    totalPublicaciones,
    totalLikes,
    totalMeEncanta,
    totalMeDivierte,
    totalComentarios
  } = calcularResumen(publicaciones);

  resumenPublicacionesEl.textContent =
    totalPublicaciones;

  resumenLikesEl.textContent =
    totalLikes;

  resumenMeEncantaEl.textContent =
    totalMeEncanta;

  resumenMeDivierteEl.textContent =
    totalMeDivierte;

  resumenComentariosEl.textContent =
    totalComentarios;
}


// --- Reacciones ---

function agregarEventosReaccion() {
  document
    .querySelectorAll('.btn-reaccion')
    .forEach((boton) => {

      boton.addEventListener('click', () => {

        const id = boton.dataset.id;
        const tipo = boton.dataset.tipo;

        const publicaciones =
          obtenerPublicaciones();

        const publicacion =
          publicaciones.find(
            (item) => item.id === id
          );

        if (!publicacion || !tipo) {
          return;
        }

        if (!publicacion.reacciones) {
          publicacion.reacciones = {
            meGusta: 0,
            meEncanta: 0,
            meDivierte: 0
          };
        }

        publicacion.reacciones[tipo] =
          (Number(publicacion.reacciones[tipo]) || 0) + 1;

        guardarPublicaciones(publicaciones);

        renderizarPublicaciones();

        agregarTodosLosEventos();
      });
    });
}


// --- Respuestas ---

function agregarEventosResponder() {

  document
    .querySelectorAll('.btn-enviar-respuesta')
    .forEach((boton) => {

      boton.addEventListener('click', () => {

        const id = boton.dataset.id;

        const publicaciones =
          obtenerPublicaciones();

        const publicacion =
          publicaciones.find(
            (item) => item.id === id
          );

        if (!publicacion) {
          return;
        }

        const caja = document.querySelector(
          `#respuesta-${id} .input-respuesta`
        );

        const texto =
          caja?.value.trim();

        if (!texto) {
          return;
        }

        if (!publicacion.respuestas) {
          publicacion.respuestas = [];
        }

        publicacion.respuestas.push(texto);

        guardarPublicaciones(publicaciones);

        renderizarPublicaciones();

        agregarTodosLosEventos();
      });
    });


  document
    .querySelectorAll('.input-respuesta')
    .forEach((input) => {

      input.addEventListener(
        'keydown',
        (event) => {

          if (event.key === 'Enter') {

            event.preventDefault();

            const contenedor =
              input.closest(
                '.respuesta-contenedor'
              );

            const botonEnviar =
              contenedor.querySelector(
                '.btn-enviar-respuesta'
              );

            botonEnviar.click();
          }
        }
      );
    });
}


// --- Eliminar ---

function agregarEventosEliminar() {

  document
    .querySelectorAll('.btn-eliminar')
    .forEach((boton) => {

      boton.addEventListener('click', () => {

        const id = boton.dataset.id;

        const publicaciones =
          obtenerPublicaciones();

        const publicacion =
          publicaciones.find(
            (item) => item.id === id
          );

        if (!publicacion) {
          return;
        }

        const confirmar = window.confirm(
          `¿Deseas eliminar esta publicación de ${publicacion.usuario}?`
        );

        if (!confirmar) {
          return;
        }

        const publicacionesActualizadas =
          publicaciones.filter(
            (item) => item.id !== id
          );

        guardarPublicaciones(
          publicacionesActualizadas
        );

        if (editandoId === id) {
          editandoId = null;
        }

        if (
          editandoComentario.publicacionId === id
        ) {
          editandoComentario = {
            publicacionId: null,
            comentarioId: null
          };
        }

        renderizarPublicaciones();

        agregarTodosLosEventos();
      });
    });
}


// --- H6: Editar ---

function agregarEventosEditar() {

  document
    .querySelectorAll('.btn-editar')
    .forEach((boton) => {

      boton.addEventListener('click', () => {

        const id = boton.dataset.id;

        editandoId = id;

        renderizarPublicaciones();

        agregarTodosLosEventos();
      });
    });
}


// --- Cancelar edición ---

function agregarEventosCancelarEdicion() {

  document
    .querySelectorAll('.btn-cancelar-edicion')
    .forEach((boton) => {

      boton.addEventListener('click', () => {

        editandoId = null;

        renderizarPublicaciones();

        agregarTodosLosEventos();
      });
    });
}


// --- Guardar edición ---

function agregarEventosGuardarEdicion() {

  document
    .querySelectorAll('.btn-guardar-edicion')
    .forEach((boton) => {

      boton.addEventListener('click', () => {
        guardarEdicion(boton.dataset.id);
      });
    });


  document
    .querySelectorAll('.input-editar')
    .forEach((textarea) => {

      textarea.addEventListener(
        'input',
        () => {

          const contador =
            document.querySelector(
              `.contador-edicion[data-id="${textarea.dataset.id}"]`
            );

          if (!contador) {
            return;
          }

          const caracteresRestantes =
            MAX_CARACTERES_MENSAJE -
            textarea.value.length;

          contador.textContent =
            `${caracteresRestantes} ${
              caracteresRestantes === 1
                ? 'carácter'
                : 'caracteres'
            } restantes`;

          contador.classList.toggle(
            'limite-alcanzado',
            caracteresRestantes === 0
          );
        }
      );


      textarea.addEventListener(
        'keydown',
        (event) => {

          const id = textarea.dataset.id;

          if (
            event.key === 'Enter' &&
            (event.ctrlKey || event.metaKey)
          ) {
            event.preventDefault();

            guardarEdicion(id);
          }

          if (event.key === 'Escape') {

            event.preventDefault();

            editandoId = null;

            renderizarPublicaciones();

            agregarTodosLosEventos();
          }
        }
      );
    });
}


function guardarEdicion(id) {

  const publicaciones =
    obtenerPublicaciones();

  const publicacion =
    publicaciones.find(
      (item) => item.id === id
    );

  if (!publicacion) {
    return;
  }

  const textarea =
    document.querySelector(
      `.input-editar[data-id="${id}"]`
    );

  const textoNuevo =
    textarea
      ? textarea.value.trim()
      : '';

  const errorEl =
    document.getElementById(
      `error-editar-${id}`
    );


  // No permitir mensaje vacío.
  if (!textoNuevo) {

    if (errorEl) {
      errorEl.textContent =
        'El mensaje no puede quedar vacío.';
    }

    textarea?.focus();

    return;
  }


  // H11: máximo 200 caracteres.
  if (
    textoNuevo.length >
    MAX_CARACTERES_MENSAJE
  ) {

    if (errorEl) {
      errorEl.textContent =
        `El mensaje no puede superar los ${MAX_CARACTERES_MENSAJE} caracteres.`;
    }

    textarea?.focus();

    return;
  }


  // Solo se actualiza el contenido.
  // Usuario, fecha, likes, dislikes,
  // respuestas y comentarios se conservan.
  publicacion.contenido =
    textoNuevo;

  guardarPublicaciones(publicaciones);

  editandoId = null;

  renderizarPublicaciones();

  agregarTodosLosEventos();
}


// --- H7: Comentarios ---

function agregarEventosComentar() {

  document
    .querySelectorAll('.btn-enviar-comentario')
    .forEach((boton) => {

      boton.addEventListener('click', () => {
        enviarComentario(
          boton.dataset.id
        );
      });
    });


  document
    .querySelectorAll(
      '.input-comentario-nombre, .input-comentario-texto'
    )
    .forEach((input) => {

      input.addEventListener(
        'keydown',
        (event) => {

          if (event.key === 'Enter') {

            event.preventDefault();

            const contenedor =
              input.closest(
                '.comentarios-contenedor'
              );

            const botonComentar =
              contenedor.querySelector(
                '.btn-enviar-comentario'
              );

            botonComentar.click();
          }
        }
      );
    });
}


function enviarComentario(id) {

  const publicaciones =
    obtenerPublicaciones();

  const publicacion =
    publicaciones.find(
      (item) => item.id === id
    );

  if (!publicacion) {
    return;
  }

  const contenedor =
    document.getElementById(
      `comentarios-${id}`
    );

  const inputNombre =
    contenedor.querySelector(
      '.input-comentario-nombre'
    );

  const inputTexto =
    contenedor.querySelector(
      '.input-comentario-texto'
    );

  const errorEl =
    document.getElementById(
      `error-comentario-${id}`
    );

  const autor =
    inputNombre.value.trim();

  const texto =
    inputTexto.value.trim();


  if (!autor || !texto) {

    if (errorEl) {
      errorEl.textContent =
        !autor
          ? 'Escribí tu nombre para comentar.'
          : 'El comentario no puede quedar vacío.';
    }

    (!autor
      ? inputNombre
      : inputTexto
    ).focus();

    return;
  }


  if (!Array.isArray(publicacion.comentarios)) {
    publicacion.comentarios = [];
  }


  publicacion.comentarios.push({
    id: generarIdComentario(),
    autor,
    texto,
    fecha: new Date().toISOString()
  });


  guardarPublicaciones(publicaciones);

  renderizarPublicaciones();

  agregarTodosLosEventos();
}


// --- H12: Editar comentarios ---

function agregarEventosEditarComentario() {

  document
    .querySelectorAll('.btn-editar-comentario')
    .forEach((boton) => {

      boton.addEventListener('click', () => {

        const publicacionId =
          boton.dataset.publicacionId;

        const comentarioId =
          boton.dataset.comentarioId;

        const publicaciones =
          obtenerPublicaciones();

        // Primero localizamos la publicación.
        const publicacion =
          publicaciones.find(
            (item) => item.id === publicacionId
          );

        if (!publicacion) {
          return;
        }

        if (!Array.isArray(publicacion.comentarios)) {
          return;
        }

        // Después localizamos el comentario por su id.
        const comentario =
          publicacion.comentarios.find(
            (item) => item.id === comentarioId
          );

        if (!comentario) {
          return;
        }

        editandoComentario = {
          publicacionId,
          comentarioId
        };

        renderizarPublicaciones();

        agregarTodosLosEventos();
      });
    });
}


// --- H12: Cancelar edición de comentario ---

function agregarEventosCancelarEdicionComentario() {

  document
    .querySelectorAll('.btn-cancelar-comentario')
    .forEach((boton) => {

      boton.addEventListener('click', () => {

        editandoComentario = {
          publicacionId: null,
          comentarioId: null
        };

        renderizarPublicaciones();

        agregarTodosLosEventos();
      });
    });
}


// --- H12: Guardar edición de comentario ---

function agregarEventosGuardarComentario() {

  document
    .querySelectorAll('.btn-guardar-comentario')
    .forEach((boton) => {

      boton.addEventListener('click', () => {

        guardarEdicionComentario(
          boton.dataset.publicacionId,
          boton.dataset.comentarioId
        );
      });
    });


  document
    .querySelectorAll('.input-editar-comentario')
    .forEach((input) => {

      input.addEventListener(
        'keydown',
        (event) => {

          if (event.key === 'Enter') {

            event.preventDefault();

            guardarEdicionComentario(
              input.dataset.publicacionId,
              input.dataset.comentarioId
            );
          }

          if (event.key === 'Escape') {

            event.preventDefault();

            editandoComentario = {
              publicacionId: null,
              comentarioId: null
            };

            renderizarPublicaciones();

            agregarTodosLosEventos();
          }
        }
      );
    });
}


function guardarEdicionComentario(
  publicacionId,
  comentarioId
) {

  const publicaciones =
    obtenerPublicaciones();

  // Primero localizamos la publicación.
  const publicacion =
    publicaciones.find(
      (item) => item.id === publicacionId
    );

  if (!publicacion) {
    return;
  }

  if (!Array.isArray(publicacion.comentarios)) {
    return;
  }

  // Después localizamos el comentario por su id.
  const comentario =
    publicacion.comentarios.find(
      (item) => item.id === comentarioId
    );

  if (!comentario) {
    return;
  }

  const input =
    document.querySelector(
      `.input-editar-comentario[data-publicacion-id="${publicacionId}"][data-comentario-id="${comentarioId}"]`
    );

  const errorEl =
    document.getElementById(
      `error-editar-comentario-${comentarioId}`
    );

  const textoNuevo =
    input
      ? input.value.trim()
      : '';


  // H12: No permitir comentarios vacíos
  // ni comentarios que contengan solamente espacios.
  if (!textoNuevo) {

    if (errorEl) {
      errorEl.textContent =
        'El comentario no puede quedar vacío.';
    }

    input?.focus();

    return;
  }


  // H12: Solo se modifica el texto.
  // El id, autor y fecha permanecen intactos.
  comentario.texto =
    textoNuevo;

  guardarPublicaciones(publicaciones);

  editandoComentario = {
    publicacionId: null,
    comentarioId: null
  };

  renderizarPublicaciones();

  agregarTodosLosEventos();
}


// --- H12: Eliminar comentario ---

function agregarEventosEliminarComentario() {

  document
    .querySelectorAll('.btn-eliminar-comentario')
    .forEach((boton) => {

      boton.addEventListener('click', () => {

        const publicacionId =
          boton.dataset.publicacionId;

        const comentarioId =
          boton.dataset.comentarioId;

        const publicaciones =
          obtenerPublicaciones();

        // Primero localizamos la publicación.
        const publicacion =
          publicaciones.find(
            (item) => item.id === publicacionId
          );

        if (!publicacion) {
          return;
        }

        if (!Array.isArray(publicacion.comentarios)) {
          return;
        }

        // Después localizamos el comentario por su id.
        const comentario =
          publicacion.comentarios.find(
            (item) => item.id === comentarioId
          );

        if (!comentario) {
          return;
        }

        const confirmar =
          window.confirm(
            '¿Deseas eliminar este comentario?'
          );

        // H12: Si cancela, no hacemos ningún cambio.
        if (!confirmar) {
          return;
        }

        publicacion.comentarios =
          publicacion.comentarios.filter(
            (item) => item.id !== comentarioId
          );

        guardarPublicaciones(publicaciones);

        if (
          editandoComentario.publicacionId ===
            publicacionId &&
          editandoComentario.comentarioId ===
            comentarioId
        ) {
          editandoComentario = {
            publicacionId: null,
            comentarioId: null
          };
        }

        renderizarPublicaciones();

        agregarTodosLosEventos();
      });
    });
}


// --- Eventos generales ---

function agregarTodosLosEventos() {

  agregarEventosReaccion();

  agregarEventosResponder();

  agregarEventosEliminar();

  agregarEventosEditar();

  agregarEventosCancelarEdicion();

  agregarEventosGuardarEdicion();

  agregarEventosComentar();

  // H12: Eventos de edición y eliminación de comentarios.
  agregarEventosEditarComentario();

  agregarEventosCancelarEdicionComentario();

  agregarEventosGuardarComentario();

  agregarEventosEliminarComentario();
}


// --- Buscador ---

function agregarEventosBuscador() {

  const buscador =
    document.getElementById('buscador');

  const botonBuscar =
    document.getElementById('btnBuscar');

  if (!buscador || !botonBuscar) {
    return;
  }


  const aplicarBusqueda = () => {

    terminoBusqueda =
      buscador.value;

    renderizarPublicaciones();

    agregarTodosLosEventos();
  };


  buscador.addEventListener(
    'input',
    aplicarBusqueda
  );


  buscador.addEventListener(
    'keydown',
    (event) => {

      if (event.key === 'Enter') {

        event.preventDefault();

        aplicarBusqueda();
      }
    }
  );


  botonBuscar.addEventListener(
    'click',
    aplicarBusqueda
  );
}


// --- H9: Orden ---

function agregarEventosOrden() {

  const selectorOrden =
    document.getElementById(
      'ordenSelector'
    );

  if (!selectorOrden) {
    return;
  }

  ordenSeleccionado =
    selectorOrden.value ||
    'recientes';


  selectorOrden.addEventListener(
    'change',
    () => {

      ordenSeleccionado =
        selectorOrden.value;

      renderizarPublicaciones();

      agregarTodosLosEventos();
    }
  );
}


// --- H11: Crear publicación ---

form.addEventListener(
  'submit',
  function (event) {

    event.preventDefault();


    if (!form.checkValidity()) {

      form.reportValidity();

      return;
    }


    const nombre =
      nombreInput.value.trim();

    const mensaje =
      mensajeInput.value.trim();


    // Validación de seguridad.
    if (
      mensaje.length >
      MAX_CARACTERES_MENSAJE
    ) {

      alert(
        `El mensaje no puede superar los ${MAX_CARACTERES_MENSAJE} caracteres.`
      );

      mensajeInput.focus();

      return;
    }


    const nuevaPublicacion = {

      id: generarIdPublicacion(),

      usuario: nombre,

      contenido: mensaje,

      reacciones: {
        meGusta: 0,
        meEncanta: 0,
        meDivierte: 0
      },

      respuestas: [],

      comentarios: [],

      fecha: new Date().toISOString()
    };


    const publicaciones =
      obtenerPublicaciones();

    publicaciones.unshift(
      nuevaPublicacion
    );

    guardarPublicaciones(
      publicaciones
    );


    form.reset();

    actualizarContadorCaracteres();

    nombreInput.focus();

    renderizarPublicaciones();

    agregarTodosLosEventos();
  }
);


// Contador H11.

if (mensajeInput) {

  mensajeInput.addEventListener(
    'input',
    actualizarContadorCaracteres
  );
}


// Inicialización.

renderizarPublicaciones();

agregarTodosLosEventos();

agregarEventosBuscador();

agregarEventosOrden();

actualizarContadorCaracteres();