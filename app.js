// ============================================================
//  Estado global
// ============================================================
let filtroActivo     = 'todos';
let peliculaActual   = null;
let fechaSeleccionada = 0;
let peliculasCache   = [];   // cartelera
let proximasCache    = [];   // próximamente

// Mapa de género IDs de TMDB → español
const GENEROS_TMDB = {
    28: 'Acción', 12: 'Aventura', 16: 'Animación', 35: 'Comedia',
    80: 'Crimen', 99: 'Documental', 18: 'Drama', 10751: 'Familiar',
    14: 'Fantasía', 36: 'Historia', 27: 'Terror', 10402: 'Música',
    9648: 'Misterio', 10749: 'Romance', 878: 'Ciencia ficción',
    53: 'Suspenso', 10752: 'Bélica', 37: 'Western'
};

// ============================================================
//  Inicialización
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    setupModal();
    setupNavScroll();
    renderMenu();

    const apiConfigurada = CONFIG.TMDB_API_KEY && CONFIG.TMDB_API_KEY !== 'TU_API_KEY_AQUI';

    if (apiConfigurada) {
        mostrarLoading('peliculas-container', true);
        mostrarLoading('pronto-container', true);
        try {
            await Promise.all([cargarCartelera(), cargarProximamente()]);
        } catch (err) {
            console.warn('Error con la API, usando datos locales:', err);
            usarDatosLocales();
        }
    } else {
        usarDatosLocales();
    }
});

function usarDatosLocales() {
    peliculasCache = PELICULAS_EN_CARTELERA;
    proximasCache  = PROXIMAMENTE;
    renderFiltros();
    renderPeliculas();
    renderProximamente();
}

// ============================================================
//  TMDB — carga de datos
// ============================================================
async function tmdbFetch(endpoint) {
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = `${CONFIG.TMDB_BASE}${endpoint}${sep}api_key=${CONFIG.TMDB_API_KEY}&language=${CONFIG.LANG}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB ${res.status}`);
    return res.json();
}

async function cargarCartelera() {
    const data = await tmdbFetch(`/movie/now_playing?region=${CONFIG.REGION}`);
    peliculasCache = data.results
        .slice(0, CONFIG.MAX_CARTELERA)
        .map(normalizarPelicula);
    mostrarLoading('peliculas-container', false);
    renderFiltros();
    renderPeliculas();
}

async function cargarProximamente() {
    const hoy     = new Date().toISOString().split('T')[0];
    const finAnio = `${new Date().getFullYear()}-12-31`;

    // Trae hasta 3 páginas (~60 estrenos) del año completo, ordenados por fecha
    const params = `primary_release_date.gte=${hoy}&primary_release_date.lte=${finAnio}`
                 + `&sort_by=release_date.asc&with_release_type=3`
                 + `&region=${CONFIG.REGION}&vote_count.gte=1`;

    const pages = await Promise.all([1, 2, 3].map(p =>
        tmdbFetch(`/discover/movie?${params}&page=${p}`)
    ));

    const todos = pages.flatMap(p => p.results);
    // Deduplicar por id
    const unicos = [...new Map(todos.map(m => [m.id, m])).values()];
    proximasCache = unicos.slice(0, CONFIG.MAX_PROXIMAMENTE).map(normalizarPelicula);

    // Actualizar título con el año en curso
    const h1Pronto = document.querySelector('#pronto h1');
    if (h1Pronto) h1Pronto.textContent = `ESTRENOS ${new Date().getFullYear()}`;

    mostrarLoading('pronto-container', false);
    renderProximamente();
}

async function cargarDetallePelicula(id) {
    try {
        return await tmdbFetch(`/movie/${id}`);
    } catch {
        return null;
    }
}

// ============================================================
//  Normalización de datos TMDB → formato interno
// ============================================================
function normalizarPelicula(m) {
    return {
        id:            m.id,
        titulo:        m.title,
        imagen:        m.poster_path
                         ? `${CONFIG.IMG_BASE}${m.poster_path}`
                         : `https://placehold.co/220x330/111/d4af37?text=${encodeURIComponent(m.title)}`,
        generos:       (m.genre_ids || []).slice(0, 3).map(id => GENEROS_TMDB[id] || 'Otro'),
        duracion:      m.runtime ? `${m.runtime} min` : null,
        clasificacion: m.adult ? 'Mayores de 18' : 'Todo público',
        estreno:       m.release_date || '',
        descripcion:   m.overview || 'Sin descripción disponible.',
        salas:         generarHorarios(m.id),
        calificacion:  Math.round(m.vote_average * 10) / 10
    };
}

// Horarios deterministas (siempre los mismos para la misma película)
function generarHorarios(id) {
    const base = ['11:00', '13:00', '14:30', '16:00', '17:30', '19:00', '20:30', '22:00'];
    const off1 = id % 5;
    const off2 = (id * 3) % 6;
    return {
        'Sala 1': [base[off1], base[off1 + 1], base[off1 + 2]].filter(Boolean),
        'Sala 2': [base[off2], base[off2 + 1], base[off2 + 2]].filter(Boolean)
    };
}

// ============================================================
//  Render — Cartelera
// ============================================================
function renderFiltros() {
    const generos = new Set();
    peliculasCache.forEach(p => p.generos.forEach(g => generos.add(g)));

    const container = document.getElementById('filtros');
    container.innerHTML = [
        `<button class="filtro activo" data-genero="todos">Todos</button>`,
        ...[...generos].map(g => `<button class="filtro" data-genero="${g}">${g}</button>`)
    ].join('');

    container.querySelectorAll('.filtro').forEach(btn => {
        btn.addEventListener('click', () => {
            filtroActivo = btn.dataset.genero;
            container.querySelectorAll('.filtro').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            renderPeliculas();
        });
    });
}

function renderPeliculas() {
    const filtradas = filtroActivo === 'todos'
        ? peliculasCache
        : peliculasCache.filter(p => p.generos.includes(filtroActivo));

    const container = document.getElementById('peliculas-container');

    if (filtradas.length === 0) {
        container.innerHTML = '<p class="sin-resultados">No hay películas en este género actualmente.</p>';
        return;
    }

    container.innerHTML = filtradas.map(p => tarjetaPelicula(p, true)).join('');
}

function renderProximamente() {
    document.getElementById('pronto-container').innerHTML =
        proximasCache.map(p => tarjetaProximamente(p)).join('');
}

function tarjetaPelicula(p, clickable) {
    return `
        <div class="carta${clickable ? '' : ' carta-pronto'}" ${clickable ? `onclick="abrirModal(${p.id})"` : ''}>
            <div class="carta-img-wrapper">
                <img src="${p.imagen}" alt="${p.titulo}"
                     onerror="this.src='https://placehold.co/220x330/111/d4af37?text=${encodeURIComponent(p.titulo)}'">
                ${clickable ? '<div class="carta-overlay"><span class="ver-horarios">Ver horarios</span></div>' : ''}
            </div>
            <div class="carta-info">
                <h2>${p.titulo}</h2>
                <div class="generos">
                    ${p.generos.map(g => `<span class="genero-badge">${g}</span>`).join('')}
                </div>
                <div class="meta">
                    <span class="rating">&#9733; ${p.calificacion || '—'}</span>
                    ${p.duracion ? `<span class="duracion">${p.duracion}</span>` : ''}
                </div>
            </div>
        </div>`;
}

function tarjetaProximamente(p) {
    return `
        <div class="carta carta-pronto">
            <div class="carta-img-wrapper">
                <img src="${p.imagen}" alt="${p.titulo}"
                     onerror="this.src='https://placehold.co/220x330/111/d4af37?text=${encodeURIComponent(p.titulo)}'">
                ${p.estreno ? `<div class="estreno-badge">Estreno ${formatFecha(p.estreno)}</div>` : ''}
            </div>
            <div class="carta-info">
                <h2>${p.titulo}</h2>
                <div class="generos">
                    ${p.generos.map(g => `<span class="genero-badge">${g}</span>`).join('')}
                </div>
                <p class="descripcion-corta">${p.descripcion.slice(0, 90)}…</p>
            </div>
        </div>`;
}

// ============================================================
//  Render — Comida
// ============================================================
function renderMenu() {
    document.getElementById('menu-container').innerHTML = MENU_COMIDA.map(cat => `
        <div class="menu-categoria">
            <h2 class="menu-cat-titulo">${cat.icono} ${cat.categoria}</h2>
            <div class="menu-items-grid">
                ${cat.items.map(item => `
                    <div class="menu-item">
                        <div class="menu-item-info">
                            <h3>${item.nombre}</h3>
                            <p>${item.descripcion}</p>
                        </div>
                        <span class="menu-item-precio">${item.precio}</span>
                    </div>`).join('')}
            </div>
        </div>`).join('');
}

// ============================================================
//  Modal
// ============================================================
function setupModal() {
    document.getElementById('modal-close').addEventListener('click', cerrarModal);
    document.getElementById('modal').addEventListener('click', e => {
        if (e.target === document.getElementById('modal')) cerrarModal();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') cerrarModal();
    });
}

async function abrirModal(id) {
    // Buscar en caché local primero
    let pelicula = peliculasCache.find(p => p.id === id);
    if (!pelicula) return;

    peliculaActual   = pelicula;
    fechaSeleccionada = 0;

    document.getElementById('modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    renderModal();

    // Si no tenemos duración, la buscamos en la API
    const apiConfigurada = CONFIG.TMDB_API_KEY && CONFIG.TMDB_API_KEY !== 'TU_API_KEY_AQUI';
    if (apiConfigurada && !pelicula.duracion) {
        const detalles = await cargarDetallePelicula(id);
        if (detalles && detalles.runtime) {
            pelicula.duracion = `${detalles.runtime} min`;
            renderModal();
        }
    }
}

function cerrarModal() {
    document.getElementById('modal').style.display = 'none';
    document.body.style.overflow = '';
}

function renderModal() {
    const p     = peliculaActual;
    const fechas = getProximasFechas();

    const horariosHTML = Object.entries(p.salas).map(([sala, horarios]) => `
        <div class="sala">
            <h4 class="sala-titulo">${sala}</h4>
            <div class="horarios">
                ${horarios.map(h => `
                    <button class="horario-btn"
                            onclick="reservar(${p.id},'${sala}',${fechaSeleccionada},'${h}')">
                        ${h}
                    </button>`).join('')}
            </div>
        </div>`).join('');

    document.getElementById('modal-body').innerHTML = `
        <div class="modal-pelicula">
            <img class="modal-img" src="${p.imagen}" alt="${p.titulo}"
                 onerror="this.src='https://placehold.co/250x375/111/d4af37?text=${encodeURIComponent(p.titulo)}'">
            <div class="modal-info">
                <h2>${p.titulo}</h2>
                <div class="modal-meta">
                    <span class="rating-grande">&#9733; ${p.calificacion || '—'}/10</span>
                    <span class="clasificacion-badge">${p.clasificacion}</span>
                    ${p.duracion ? `<span class="duracion-modal">${p.duracion}</span>` : ''}
                </div>
                <div class="generos">
                    ${p.generos.map(g => `<span class="genero-badge">${g}</span>`).join('')}
                </div>
                <p class="modal-descripcion">${p.descripcion}</p>

                <div class="horarios-section">
                    <h3>Selecciona tu función</h3>
                    <div class="fecha-tabs">
                        ${fechas.map((f, i) => `
                            <button class="fecha-tab ${i === fechaSeleccionada ? 'activo' : ''}"
                                    onclick="cambiarFecha(${i})">
                                ${i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : f.dia}
                                <span class="fecha-sub">${f.fecha}</span>
                            </button>`).join('')}
                    </div>
                    ${horariosHTML}
                </div>
            </div>
        </div>`;
}

function cambiarFecha(index) {
    fechaSeleccionada = index;
    renderModal();
}

function reservar(peliculaId, sala, fechaIndex, hora) {
    const p      = peliculasCache.find(x => x.id === peliculaId);
    const fechas = getProximasFechas();
    const label  = fechaIndex === 0 ? 'hoy' : fechaIndex === 1 ? 'mañana' : fechas[fechaIndex].fecha;
    mostrarToast(`Función: "${p.titulo}" — ${sala} — ${label} a las ${hora}`);
}

// ============================================================
//  Utilidades
// ============================================================
function mostrarLoading(containerId, visible) {
    const el = document.getElementById(containerId);
    if (visible) {
        el.innerHTML = '<div class="loading">Cargando…</div>';
    }
}

function mostrarToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 4000);
}

function getProximasFechas() {
    const hoy = new Date();
    return [0, 1, 2].map(offset => {
        const d = new Date(hoy);
        d.setDate(d.getDate() + offset);
        return {
            dia:   d.toLocaleDateString('es-MX', { weekday: 'short' }),
            fecha: d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
        };
    });
}

function formatFecha(str) {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

function setupNavScroll() {
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
        });
    });
}
