const form = document.getElementById('formulario');
const nombreInput = document.getElementById('nombre');
const mensajeInput = document.getElementById('message');
const listaPublicaciones = document.getElementById('listaPublicaciones');

function obtenerPublicaciones() {
  const datos = localStorage.getItem('publicaciones');

  if (!datos) {
    return [];
  }

  try {
    const publicaciones = JSON.parse(datos);
    return Array.isArray(publicaciones) ? publicaciones : [];
  } catch (error) {
    console.error('No se pudieron cargar las publicaciones:', error);
    return [];
  }
}

function guardarPublicaciones(publicaciones) {
  localStorage.setItem('publicaciones', JSON.stringify(publicaciones));
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

function renderizarPublicaciones() {
  const publicaciones = obtenerPublicaciones();

  if (!publicaciones.length) {
    listaPublicaciones.innerHTML = '<p class="vacio">Aún no hay publicaciones.</p>';
    return;
  }

  listaPublicaciones.innerHTML = '';

  publicaciones.forEach((publicacion, index) => {
    const articulo = document.createElement('article');
    articulo.className = 'publicacion';
    articulo.innerHTML = `
      <div class="publicacion-header">
        <strong>${escaparTexto(publicacion.usuario)}</strong>
        <span>${formatearFecha(publicacion.fecha)}</span>
      </div>
      <p>${escaparTexto(publicacion.contenido)}</p>
      <button class="btn-like" data-index="${index}" type="button">
        Me gusta <span class="contador">${Number(publicacion.likes || 0)}</span>
      </button>
      <button class="btn-dislike" data-index="${index}" type="button">
        No me gusta <span class="contador">${Number(publicacion.dislikes || 0)}</span>
      </button>

      <div class="respuesta-contenedor" id="respuesta-${index}">
        <input
          type="text"
          class="input-respuesta"
          placeholder="Escribe una respuesta..."
        >
        <button class="btn-enviar-respuesta" data-index="${index}" type="button">
          Enviar
        </button>

        <div class="lista-respuestas">
          ${
            (publicacion.respuestas || [])
              .map(r => `<p>💬 ${escaparTexto(r)}</p>`)
              .join("")
          }
        </div>
      </div>
    `;

    listaPublicaciones.appendChild(articulo);
  });
}

function agregarEventosLike() {
  document.querySelectorAll('.btn-like').forEach((boton) => {
    boton.addEventListener('click', () => {
      const index = Number(boton.dataset.index);
      const publicaciones = obtenerPublicaciones();

      if (!publicaciones[index]) {
        return;
      }

      publicaciones[index].likes = (Number(publicaciones[index].likes) || 0) + 1;
      guardarPublicaciones(publicaciones);
      renderizarPublicaciones();
      agregarEventosLike();
    });
  });
}

function agregarEventosDislike() {
  document.querySelectorAll(".btn-dislike").forEach((boton) => {
    boton.addEventListener("click", () => {

      const index = Number(boton.dataset.index);
      const publicaciones = obtenerPublicaciones();

      if (!publicaciones[index]) return;

      publicaciones[index].dislikes =
        (Number(publicaciones[index].dislikes) || 0) + 1;

      guardarPublicaciones(publicaciones);
      renderizarPublicaciones();
      agregarEventosLike();
      agregarEventosDislike();
      agregarEventosResponder();
    });
  });
}

function agregarEventosResponder() {

  document.querySelectorAll(".btn-enviar-respuesta").forEach((boton) => {

    boton.addEventListener("click", () => {

      const index = Number(boton.dataset.index);

      const publicaciones = obtenerPublicaciones();

      const caja = document.querySelector(
        `#respuesta-${index} .input-respuesta`
      );

      const texto = caja.value.trim();

      if (texto === "") return;

      if (!publicaciones[index].respuestas) {
        publicaciones[index].respuestas = [];
      }

      publicaciones[index].respuestas.push(texto);

      guardarPublicaciones(publicaciones);

      renderizarPublicaciones();

      agregarEventosLike();
      agregarEventosDislike();
      agregarEventosResponder();

    });

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
    usuario: nombre,
    contenido: mensaje,
    likes: 0,
    dislikes: 0,
    respuestas: [],
    fecha: new Date().toISOString()
  };

  const publicaciones = obtenerPublicaciones();
  publicaciones.unshift(nuevaPublicacion);
  guardarPublicaciones(publicaciones);

  form.reset();
  nombreInput.focus();
  renderizarPublicaciones();
  agregarEventosLike();
});

renderizarPublicaciones();
agregarEventosLike();
agregarEventosDislike();
agregarEventosResponder();
