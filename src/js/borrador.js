const BORRADOR_KEY = 'red-social-borrador';

const borradorInfo = document.getElementById('borradorInfo');
const btnDescartarBorrador = document.getElementById('btnDescartarBorrador');
const nombreInput = document.getElementById('nombre');
const mensajeInput = document.getElementById('message');
const etiquetaInput = document.getElementById('etiqueta');
const formulario = document.getElementById('formulario');
const CLAVE_BORRADOR = 'borrador-publicacion';
const borradorInfoEl = document.getElementById('borradorInfo');
const btnDescartarBorradorEl = document.getElementById('btnDescartarBorrador');

function obtenerBorradorGuardado() {
  try {
    const datos = localStorage.getItem(BORRADOR_KEY);

    if (!datos) {
      return null;
    }

    return JSON.parse(datos);
  } catch (error) {
    console.error('No se pudo leer el borrador:', error);
    return null;
  }
}

function guardarBorrador() {
  if (!formulario || !nombreInput || !mensajeInput) {
    return;
  }

  const nombre = nombreInput.value.trim();
  const mensaje = mensajeInput.value.trim();
  const etiqueta = etiquetaInput ? etiquetaInput.value : 'General';

  const borrador = {
    nombre,
    mensaje,
    etiqueta
  };

  if (!nombre && !mensaje) {
    localStorage.removeItem(BORRADOR_KEY);
    if (borradorInfo) {
      borradorInfo.hidden = true;
    }
    return;
  }

  localStorage.setItem(BORRADOR_KEY, JSON.stringify(borrador));

  if (borradorInfo) {
    borradorInfo.hidden = false;
  }
}

function descartarBorrador() {
  localStorage.removeItem(BORRADOR_KEY);

  if (nombreInput) {
    nombreInput.value = '';
  }

  if (mensajeInput) {
    mensajeInput.value = '';
  }

  if (etiquetaInput) {
    etiquetaInput.value = 'General';
  }

  if (borradorInfo) {
    borradorInfo.hidden = true;
  }

  if (typeof actualizarContadorCaracteres === 'function') {
    actualizarContadorCaracteres();
  }
}

function obtenerBorrador() {
  const datos = localStorage.getItem(CLAVE_BORRADOR);

  if (!datos) {
    return null;
  }

  try {
    return JSON.parse(datos);
  } catch (error) {
    console.error('No se pudo leer el borrador:', error);
    return null;
  }
}


function mostrarAvisoBorrador(visible) {
  if (!borradorInfoEl) {
    return;
  }

  borradorInfoEl.hidden = !visible;
}

function guardarBorrador() {
  const nombre = nombreInput.value;
  const mensaje = mensajeInput.value;
  const etiqueta = etiquetaInput ? etiquetaInput.value : 'General';

  if (!nombre.trim() && !mensaje.trim()) {
    eliminarBorrador();
    return;
  }

  const borrador = { nombre, mensaje, etiqueta };

  localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(borrador));

  mostrarAvisoBorrador(true);
}

function eliminarBorrador() {
  localStorage.removeItem(CLAVE_BORRADOR);
  mostrarAvisoBorrador(false);
}

function restaurarBorrador() {
  const borrador = obtenerBorrador();

  if (!borrador) {
    return;
  }

  nombreInput.value = borrador.nombre || '';
  mensajeInput.value = borrador.mensaje || '';

  if (
    etiquetaInput &&
    ETIQUETAS_VALIDAS.includes(borrador.etiqueta)
  ) {
    etiquetaInput.value = borrador.etiqueta;
  }

  if (typeof actualizarContadorCaracteres === 'function') {
    actualizarContadorCaracteres();
  }

  mostrarAvisoBorrador(true);
}

function agregarEventosBorrador() {
  [nombreInput, mensajeInput, etiquetaInput].forEach((campo) => {
    if (!campo) {
      return;
    }

    campo.addEventListener('input', guardarBorrador);
  });

  if (btnDescartarBorradorEl) {
    btnDescartarBorradorEl.addEventListener('click', () => {
      form.reset();
      eliminarBorrador();

      if (typeof actualizarContadorCaracteres === 'function') {
        actualizarContadorCaracteres();
      }

      nombreInput.focus();
    });
  }
}

restaurarBorrador();
agregarEventosBorrador();

function inicializarBorrador() {
  const borrador = obtenerBorradorGuardado();

  if (!borrador || !nombreInput || !mensajeInput) {
    return;
  }

  nombreInput.value = borrador.nombre || '';
  mensajeInput.value = borrador.mensaje || '';

  if (etiquetaInput) {
    etiquetaInput.value = borrador.etiqueta || 'General';
  }

  if (borradorInfo) {
    borradorInfo.hidden = !(borrador.nombre || borrador.mensaje);
  }

  if (typeof actualizarContadorCaracteres === 'function') {
    actualizarContadorCaracteres();
  }
}

if (formulario) {
  formulario.addEventListener('submit', () => {
    localStorage.removeItem(BORRADOR_KEY);

    if (borradorInfo) {
      borradorInfo.hidden = true;
    }
  });
}

if (nombreInput) {
  nombreInput.addEventListener('input', guardarBorrador);
}

if (mensajeInput) {
  mensajeInput.addEventListener('input', guardarBorrador);
}

if (etiquetaInput) {
  etiquetaInput.addEventListener('change', guardarBorrador);
}

if (btnDescartarBorrador) {
  btnDescartarBorrador.addEventListener('click', descartarBorrador);
}

const eliminarBorrador = descartarBorrador;

inicializarBorrador();
