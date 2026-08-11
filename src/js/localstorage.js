const form = document.getElementById('formulario');
const nombreInput = document.getElementById('nombre');
const mensajeInput = document.getElementById('message');
const listaPublicaciones = document.getElementById('listaPublicaciones');
const resumenPublicacionesEl = document.getElementById('resumenPublicaciones');
const resumenLikesEl = document.getElementById('resumenLikes');
const resumenComentariosEl = document.getElementById('resumenComentarios');

// Guarda el id de la publicación que está actualmente en modo edición.
// Al ser null, ninguna publicación se muestra en modo edición.
let editandoId = null;
let terminoBusqueda = '';

// Criterio de orden actualmente seleccionado. Solo vive en memoria:
// no se persiste, así que al recargar la página siempre vuelve a
// 'recientes' (el valor inicial del <select>), pero las publicaciones
// en sí no se pierden ni se reordenan en el almacenamiento.
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
  return (Array.isArray(comentarios) ? comentarios : []).map((comentario) => ({
    ...comentario,
    id: comentario.id || generarIdComentario(),
    autor: comentario.autor || 'Anónimo',
    texto: comentario.texto || '',
    fecha: comentario.fecha || new Date().toISOString()
  }));
}

function normalizarPublicaciones(publicaciones) {
  return (Array.isArray(publicaciones) ? publicaciones : []).map((publicacion) => ({
    ...publicacion,
    id: publicacion.id || generarIdPublicacion(),
    likes: Number(publicacion.likes) || 0,
    dislikes: Number(publicacion.dislikes) || 0,
    respuestas: Array.isArray(publicacion.respuestas) ? publicacion.respuestas : [],
    comentarios: normalizarComentarios(publicacion.comentarios)
  }));
}

function obtenerPublicaciones() {
  const datos = localStorage.getItem('publicaciones');

  if (!datos) {
    return [];
  }

  try {
    const publicaciones = JSON.parse(datos);
    const publicacionesNormalizadas = normalizarPublicaciones(publicaciones);

    // Solo reescribimos en localStorage si la normalización cambió algo
    // (por ejemplo, si faltaba un id o algún campo tenía un tipo incorrecto).
    const huboCambios = JSON.stringify(publicaciones) !== JSON.stringify(publicacionesNormalizadas);
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
  localStorage.setItem('publicaciones', JSON.stringify(normalizarPublicaciones(publicaciones)));
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

    return autor.includes(textoBusqueda) || contenido.includes(textoBusqueda);
  });
}

// --- H9: Ordenar publicaciones ---
//
// IMPORTANTE: nunca se ordena el arreglo original con .sort(), porque
// .sort() muta el arreglo en el que se llama. Acá siempre se arma una
// copia con [...publicaciones] y se ordena esa copia, dejando intacto
// tanto el arreglo que viene de obtenerPublicaciones() como lo que
// hay guardado en localStorage.
function ordenarPublicaciones(publicaciones, criterio) {
  const copia = [...publicaciones];

  switch (criterio) {
    case 'antiguas':
      return copia.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    case 'populares':
      return copia.sort((a, b) => {
        const diferenciaLikes = (Number(b.likes) || 0) - (Number(a.likes) || 0);
        if (diferenciaLikes !== 0) return diferenciaLikes;
        // Empate en likes: desempata mostrando primero la más reciente.
        return new Date(b.fecha) - new Date(a.fecha);
      });

    case 'recientes':
    default:
      return copia.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }
}

function renderizarPublicaciones() {
  const publicaciones = obtenerPublicaciones();
  renderizarResumen(publicaciones);
  const publicacionesFiltradas = filtrarPublicaciones(publicaciones, terminoBusqueda);
  const publicacionesMostradas = ordenarPublicaciones(publicacionesFiltradas, ordenSeleccionado);
 

  if (!publicaciones.length) {
    listaPublicaciones.innerHTML = '<p class="vacio">Aún no hay publicaciones.</p>';
    return;
  }

  if (!publicacionesMostradas.length) {
    listaPublicaciones.innerHTML = '<p class="vacio">No se encontraron publicaciones que coincidan con la búsqueda.</p>';
    return;
  }

  listaPublicaciones.innerHTML = '';

  publicacionesMostradas.forEach((publicacion) => {
    const articulo = document.createElement('article');
    articulo.className = 'publicacion';

    const enEdicion = publicacion.id === editandoId;

    // Bloque de contenido: o el texto normal, o el formulario de edición
    const bloqueContenido = enEdicion
      ? `
        <div class="edicion-contenedor">
          <textarea class="input-editar" data-id="${publicacion.id}" rows="3">${escaparTexto(publicacion.contenido)}</textarea>
          <p class="error-edicion" id="error-editar-${publicacion.id}"></p>
          <button class="btn-guardar-edicion" data-id="${publicacion.id}" type="button">Guardar</button>
          <button class="btn-cancelar-edicion" data-id="${publicacion.id}" type="button">Cancelar</button>
        </div>
      `
      : `<p>${escaparTexto(publicacion.contenido)}</p>`;

    const comentarios = Array.isArray(publicacion.comentarios) ? publicacion.comentarios : [];

    articulo.innerHTML = `
      <div class="publicacion-header">
        <strong>${escaparTexto(publicacion.usuario)}</strong>
        <span>${formatearFecha(publicacion.fecha)}</span>
      </div>
      ${bloqueContenido}
      <div class="acciones-publicacion">
        <div class="acciones-reaccion">
          <button class="btn-like" data-id="${publicacion.id}" type="button">
            Me gusta <span class="contador">${Number(publicacion.likes || 0)}</span>
          </button>
          <button class="btn-dislike" data-id="${publicacion.id}" type="button">
            No me gusta <span class="contador">${Number(publicacion.dislikes || 0)}</span>
          </button>
        </div>
        <div class="acciones-gestion">
          <button class="btn-editar" data-id="${publicacion.id}" type="button" ${enEdicion ? 'disabled' : ''}>
            Editar
          </button>
          <button class="btn-eliminar" data-id="${publicacion.id}" type="button">
            Eliminar
          </button>
        </div>
      </div>

        <div class="lista-respuestas">
          ${
            (publicacion.respuestas || [])
              .map((respuesta) => `<p>💬 ${escaparTexto(respuesta)}</p>`)
              .join('')
          }
        </div>
      </div>

      <div class="comentarios-contenedor" id="comentarios-${publicacion.id}">
        <h3 class="comentarios-titulo">Comentarios (${comentarios.length})</h3>

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
          <p class="error-comentario" id="error-comentario-${publicacion.id}"></p>
          <button class="btn-enviar-comentario" data-id="${publicacion.id}" type="button">
            Comentar
          </button>
        </div>

        <div class="lista-comentarios">
          ${
            comentarios
              .map((comentario) => `
                <div class="comentario">
                  <div class="comentario-header">
                    <strong>${escaparTexto(comentario.autor)}</strong>
                    <span>${formatearFecha(comentario.fecha)}</span>
                  </div>
                  <p>${escaparTexto(comentario.texto)}</p>
                </div>
              `)
              .join('')
          }
        </div>
      </div>
    `;

    listaPublicaciones.appendChild(articulo);
  });

  // Si hay una publicación en edición, enfocamos su textarea y
  // dejamos el cursor al final del texto.
  if (editandoId) {
    const textarea = document.querySelector(`.input-editar[data-id="${editandoId}"]`);
    if (textarea) {
      textarea.focus();
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
    }
  }
}

function calcularResumen(publicaciones) {
  const totalPublicaciones = publicaciones.length;

  const totalLikes = publicaciones.reduce(
    (total, publicacion) => total + (Number(publicacion.likes) || 0),
    0
  );

  const totalComentarios = publicaciones.reduce((total, publicacion) => {
    const comentarios = Array.isArray(publicacion.comentarios) ? publicacion.comentarios : [];
    return total + comentarios.length;
  }, 0);

  return { totalPublicaciones, totalLikes, totalComentarios };
}

function renderizarResumen(publicaciones) {
  if (!resumenPublicacionesEl || !resumenLikesEl || !resumenComentariosEl) {
    return;
  }

  const { totalPublicaciones, totalLikes, totalComentarios } = calcularResumen(publicaciones);

  resumenPublicacionesEl.textContent = totalPublicaciones;
  resumenLikesEl.textContent = totalLikes;
  resumenComentariosEl.textContent = totalComentarios;
}

function agregarEventosLike() {
  document.querySelectorAll('.btn-like').forEach((boton) => {
    boton.addEventListener('click', () => {
      const id = boton.dataset.id;
      const publicaciones = obtenerPublicaciones();
      const publicacion = publicaciones.find((item) => item.id === id);

      if (!publicacion) {
        return;
      }

      publicacion.likes = (Number(publicacion.likes) || 0) + 1;
      guardarPublicaciones(publicaciones);
      renderizarPublicaciones();
      agregarTodosLosEventos();
    });
  });
}

function agregarEventosDislike() {
  document.querySelectorAll('.btn-dislike').forEach((boton) => {
    boton.addEventListener('click', () => {
      const id = boton.dataset.id;
      const publicaciones = obtenerPublicaciones();
      const publicacion = publicaciones.find((item) => item.id === id);

      if (!publicacion) return;

      publicacion.dislikes = (Number(publicacion.dislikes) || 0) + 1;

      guardarPublicaciones(publicaciones);
      renderizarPublicaciones();
      agregarTodosLosEventos();
    });
  });
}

function agregarEventosResponder() {
  document.querySelectorAll('.btn-enviar-respuesta').forEach((boton) => {
    boton.addEventListener('click', () => {
      const id = boton.dataset.id;
      const publicaciones = obtenerPublicaciones();
      const publicacion = publicaciones.find((item) => item.id === id);

      if (!publicacion) return;

      const caja = document.querySelector(`#respuesta-${id} .input-respuesta`);
      const texto = caja?.value.trim();

      if (!texto) return;

      if (!publicacion.respuestas) {
        publicacion.respuestas = [];
      }

      publicacion.respuestas.push(texto);

      guardarPublicaciones(publicaciones);

      renderizarPublicaciones();

      agregarTodosLosEventos();
    });
  });

  // Permite enviar la respuesta con la tecla Enter
  document.querySelectorAll('.input-respuesta').forEach((input) => {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const contenedor = input.closest('.respuesta-contenedor');
        const botonEnviar = contenedor.querySelector('.btn-enviar-respuesta');
        botonEnviar.click();
      }
    });
  });
}

function agregarEventosEliminar() {
  document.querySelectorAll('.btn-eliminar').forEach((boton) => {
    boton.addEventListener('click', () => {
      const id = boton.dataset.id;
      const publicaciones = obtenerPublicaciones();
      const publicacion = publicaciones.find((item) => item.id === id);

      if (!publicacion) return;

      const confirmar = window.confirm(`¿Deseas eliminar esta publicación de ${publicacion.usuario}?`);

      if (!confirmar) return;

      const publicacionesActualizadas = publicaciones.filter((item) => item.id !== id);
      guardarPublicaciones(publicacionesActualizadas);

      // Si estábamos editando justo la publicación eliminada, salimos del modo edición.
      if (editandoId === id) {
        editandoId = null;
      }

      renderizarPublicaciones();
      agregarTodosLosEventos();
    });
  });
}

// --- H6: Editar una publicación ---

function agregarEventosEditar() {
  document.querySelectorAll('.btn-editar').forEach((boton) => {
    boton.addEventListener('click', () => {
      const id = boton.dataset.id;

      // Entra en modo edición para esta publicación (y solo esta).
      editandoId = id;

      renderizarPublicaciones();
      agregarTodosLosEventos();
    });
  });
}

function agregarEventosCancelarEdicion() {
  document.querySelectorAll('.btn-cancelar-edicion').forEach((boton) => {
    boton.addEventListener('click', () => {
      editandoId = null;
      renderizarPublicaciones();
      agregarTodosLosEventos();
    });
  });
}

function agregarEventosGuardarEdicion() {
  document.querySelectorAll('.btn-guardar-edicion').forEach((boton) => {
    boton.addEventListener('click', () => {
      guardarEdicion(boton.dataset.id);
    });
  });

  // Ctrl+Enter para guardar, Escape para cancelar, sin salir del textarea.
  document.querySelectorAll('.input-editar').forEach((textarea) => {
    textarea.addEventListener('keydown', (event) => {
      const id = textarea.dataset.id;

      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        guardarEdicion(id);
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        editandoId = null;
        renderizarPublicaciones();
        agregarTodosLosEventos();
      }
    });
  });
}

function guardarEdicion(id) {
  const publicaciones = obtenerPublicaciones();
  const publicacion = publicaciones.find((item) => item.id === id);

  if (!publicacion) return;

  const textarea = document.querySelector(`.input-editar[data-id="${id}"]`);
  const textoNuevo = textarea ? textarea.value.trim() : '';

  if (!textoNuevo) {
    // Validación: no se permite guardar un mensaje vacío.
    const errorEl = document.getElementById(`error-editar-${id}`);
    if (errorEl) {
      errorEl.textContent = 'El mensaje no puede quedar vacío.';
    }
    textarea?.focus();
    return;
  }

  // Solo se actualiza el contenido. Usuario, fecha, likes, dislikes
  // y respuestas se conservan tal cual estaban.
  publicacion.contenido = textoNuevo;

  guardarPublicaciones(publicaciones);

  editandoId = null;
  renderizarPublicaciones();
  agregarTodosLosEventos();
}

// --- H7: Comentar publicaciones ---

function agregarEventosComentar() {
  document.querySelectorAll('.btn-enviar-comentario').forEach((boton) => {
    boton.addEventListener('click', () => {
      enviarComentario(boton.dataset.id);
    });
  });

  // Permite enviar el comentario con Enter desde cualquiera de los dos campos.
  document.querySelectorAll('.input-comentario-nombre, .input-comentario-texto').forEach((input) => {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const contenedor = input.closest('.comentarios-contenedor');
        const botonComentar = contenedor.querySelector('.btn-enviar-comentario');
        botonComentar.click();
      }
    });
  });
}

function enviarComentario(id) {
  const publicaciones = obtenerPublicaciones();
  const publicacion = publicaciones.find((item) => item.id === id);

  if (!publicacion) return;

  const contenedor = document.getElementById(`comentarios-${id}`);
  const inputNombre = contenedor.querySelector('.input-comentario-nombre');
  const inputTexto = contenedor.querySelector('.input-comentario-texto');
  const errorEl = document.getElementById(`error-comentario-${id}`);

  const autor = inputNombre.value.trim();
  const texto = inputTexto.value.trim();

  // Validación: nombre y comentario no pueden quedar vacíos.
  if (!autor || !texto) {
    if (errorEl) {
      errorEl.textContent = !autor
        ? 'Escribí tu nombre para comentar.'
        : 'El comentario no puede quedar vacío.';
    }
    (!autor ? inputNombre : inputTexto).focus();
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

// Centraliza el reenganche de listeners para no olvidar ninguno
// después de cada renderizado.
function agregarTodosLosEventos() {
  agregarEventosLike();
  agregarEventosDislike();
  agregarEventosResponder();
  agregarEventosEliminar();
  agregarEventosEditar();
  agregarEventosCancelarEdicion();
  agregarEventosGuardarEdicion();
  agregarEventosComentar();
}

function agregarEventosBuscador() {
  const buscador = document.getElementById('buscador');
  const botonBuscar = document.getElementById('btnBuscar');

  if (!buscador || !botonBuscar) {
    return;
  }

  const aplicarBusqueda = () => {
    terminoBusqueda = buscador.value;
    renderizarPublicaciones();
    agregarTodosLosEventos();
  };

  buscador.addEventListener('input', aplicarBusqueda);
  buscador.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      aplicarBusqueda();
    }
  });
  botonBuscar.addEventListener('click', aplicarBusqueda);
}

// --- H9: Ordenar publicaciones ---

function agregarEventosOrden() {
  const selectorOrden = document.getElementById('ordenSelector');

  if (!selectorOrden) {
    return;
  }

  ordenSeleccionado = selectorOrden.value || 'recientes';

  selectorOrden.addEventListener('change', () => {
    ordenSeleccionado = selectorOrden.value;
    renderizarPublicaciones();
    agregarTodosLosEventos();
  });
}

form.addEventListener('submit', function (event) {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const nombre = nombreInput.value.trim();
  const mensaje = mensajeInput.value.trim();

  const nuevaPublicacion = {
    id: generarIdPublicacion(),
    usuario: nombre,
    contenido: mensaje,
    likes: 0,
    dislikes: 0,
    respuestas: [],
    comentarios: [],
    fecha: new Date().toISOString()
  };

  const publicaciones = obtenerPublicaciones();
  publicaciones.unshift(nuevaPublicacion);
  guardarPublicaciones(publicaciones);

  form.reset();
  nombreInput.focus();
  renderizarPublicaciones();
  agregarTodosLosEventos();
});

renderizarPublicaciones();
agregarTodosLosEventos();
agregarEventosBuscador();
agregarEventosOrden();