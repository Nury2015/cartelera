// ============================================================
//  Estado global
// ============================================================
let filtroActivo     = 'todos';
let peliculaActual   = null;
let fechaSeleccionada = 0;
let peliculasCache   = [];   // cartelera
let proximasCache    = [];   // próximamente
let tendenciasCache  = [];   // trending semanal
let cineActivo       = 0;    // índice en CINES[]

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

    const apiConfigurada = CONFIG.TMDB_API_KEY && CONFIG.TMDB_API_KEY !== 'TU_API_KEY_AQUI';

    document.getElementById('anio-footer').textContent = new Date().getFullYear();
    renderSelectorCine();

    if (apiConfigurada) {
        mostrarLoading('tendencias-container', true);
        mostrarLoading('peliculas-container', true);
        mostrarLoading('pronto-container', true);
        try {
            await Promise.all([cargarTendencias(), cargarCartelera(), cargarProximamente()]);
        } catch (err) {
            console.warn('Error con la API, usando datos locales:', err);
            usarDatosLocales();
        }
    } else {
        usarDatosLocales();
    }
});

function usarDatosLocales() {
    peliculasCache  = PELICULAS_EN_CARTELERA;
    proximasCache   = PROXIMAMENTE;
    tendenciasCache = PELICULAS_EN_CARTELERA.slice(0, 6);
    renderTendencias();
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

async function cargarTendencias() {
    const data = await tmdbFetch('/trending/movie/week');
    tendenciasCache = data.results.slice(0, 6).map(normalizarPelicula);
    mostrarLoading('tendencias-container', false);
    renderTendencias();
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

    // Sin filtro de región para incluir todas las películas (Marvel, etc.)
    const params = `primary_release_date.gte=${hoy}&primary_release_date.lte=${finAnio}`
                 + `&sort_by=release_date.asc&vote_count.gte=0`
                 + `&with_original_language=en|es`;

    const pages = await Promise.all([1, 2, 3, 4].map(p =>
        tmdbFetch(`/discover/movie?${params}&page=${p}`)
    ));

    const todos = pages.flatMap(p => p.results);
    const unicos = [...new Map(todos.map(m => [m.id, m])).values()];
    proximasCache = unicos.slice(0, CONFIG.MAX_PROXIMAMENTE).map(normalizarPelicula);

    const h1 = document.querySelector('#pronto h1');
    if (h1) h1.textContent = `ESTRENOS ${new Date().getFullYear()}`;

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

async function cargarTrailer(id) {
    try {
        const data = await tmdbFetch(`/movie/${id}/videos`);
        const trailer = data.results.find(v =>
            v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
        );
        return trailer ? `https://www.youtube.com/embed/${trailer.key}?autoplay=1` : null;
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

function renderTendencias() {
    document.getElementById('tendencias-container').innerHTML =
        tendenciasCache.map(p => tarjetaPelicula(p, true)).join('');
}

let mesActivo    = null;
let gruposMeses  = {};

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function agruparPorMes(peliculas) {
    const g = {};
    peliculas.forEach(p => {
        if (!p.estreno) return;
        const [y, m] = p.estreno.split('-');
        const clave = `${y}-${m}`;
        if (!g[clave]) g[clave] = [];
        g[clave].push(p);
    });
    return g;
}

function renderProximamente() {
    if (proximasCache.length === 0) return;

    gruposMeses    = agruparPorMes(proximasCache);
    const claves   = Object.keys(gruposMeses).sort();
    if (!mesActivo || !gruposMeses[mesActivo]) mesActivo = claves[0];

    // Tabs de mes — van en su propio wrapper, FUERA del grid
    document.getElementById('mes-tabs-wrapper').innerHTML = `
        <div class="mes-tabs">
            ${claves.map(c => {
                const [y, m] = c.split('-');
                const label  = `${MESES_ES[parseInt(m) - 1]} ${y}`;
                return `<button class="mes-tab ${c === mesActivo ? 'activo' : ''}"
                                data-clave="${c}"
                                onclick="cambiarMes('${c}')">${label}</button>`;
            }).join('')}
        </div>`;

    // Películas del mes activo — van en el grid
    renderPelicularMes();
}

function renderPelicularMes() {
    document.getElementById('pronto-container').innerHTML =
        (gruposMeses[mesActivo] || []).map(p => tarjetaProximamente(p)).join('');
}

function cambiarMes(clave) {
    mesActivo = clave;
    document.querySelectorAll('.mes-tab').forEach(b =>
        b.classList.toggle('activo', b.dataset.clave === clave));
    renderPelicularMes();
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
                ${p.descripcion ? `<p class="carta-desc">${p.descripcion.slice(0, 90)}…</p>` : ''}
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
//  Render — Selector de cine + precios
// ============================================================
function renderSelectorCine() {
    const tabs = document.getElementById('cine-tabs');
    tabs.innerHTML = CINES.map((c, i) => `
        <button class="cine-tab ${i === cineActivo ? 'activo' : ''}"
                style="--cc:${c.color}"
                onclick="seleccionarCine(${i})">
            ${c.nombre}
        </button>`).join('');
    renderPrecios();
}

function seleccionarCine(index) {
    cineActivo = index;
    document.querySelectorAll('.cine-tab').forEach((b, i) =>
        b.classList.toggle('activo', i === index));
    renderPrecios();
}

function fmt(valor) {
    return '$' + valor.toLocaleString('es-CO');
}

function renderPrecios() {
    const cine = CINES[cineActivo];

    // Tipos comunes para la tabla comparativa
    const tiposComunes = ['2D — Adulto', '2D — Niño / Adulto mayor', '3D'];

    const comparativaHTML = tiposComunes.map(tipo => {
        const celdas = CINES.map(c => {
            const b = c.boletas.find(x => x.tipo === tipo);
            const esActivo = c.id === cine.id;
            return `<td class="${esActivo ? 'activo' : ''}">${b ? fmt(b.valor) : '—'}</td>`;
        }).join('');
        return `<tr><td class="tipo-label">${tipo}</td>${celdas}</tr>`;
    }).join('');

    document.getElementById('precios-boletas').innerHTML = `
        <div class="precios-layout">

            <!-- Tarjeta del cine seleccionado -->
            <div class="precio-card" style="--cc:${cine.color}">
                <div class="precio-card-header">
                    <h2>${cine.nombre}</h2>
                    <a href="${cine.web}" target="_blank" rel="noopener" class="btn-web-cine">
                        Sitio oficial →
                    </a>
                </div>

                <div class="boletas-lista">
                    ${cine.boletas.map(b => `
                        <div class="boleta-fila">
                            <span class="boleta-tipo">${b.tipo}</span>
                            <span class="boleta-precio">${fmt(b.valor)}</span>
                        </div>`).join('')}
                </div>

                <div class="promos-lista">
                    <h3>Promociones</h3>
                    ${cine.promos.map(p => `
                        <div class="promo-fila">
                            <span class="promo-dia">${p.dia}</span>
                            <span class="promo-texto">${p.texto}</span>
                        </div>`).join('')}
                </div>
            </div>

            <!-- Tabla comparativa -->
            <div class="comparativa-wrap">
                <h3 class="comparativa-titulo">Comparativa rápida</h3>
                <table class="comparativa-tabla">
                    <thead>
                        <tr>
                            <th></th>
                            ${CINES.map(c => `<th class="${c.id === cine.id ? 'activo' : ''}">${c.nombre}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>${comparativaHTML}</tbody>
                </table>
                <p class="precios-nota">* Precios aproximados. Pueden variar según ciudad, sala y función.</p>
            </div>

        </div>`;
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
    // Detener el trailer antes de ocultar el modal
    const frame = document.querySelector('.trailer-frame');
    if (frame) frame.src = '';
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
            <div class="modal-poster-wrap">
                <img class="modal-img" id="modal-poster" src="${p.imagen}" alt="${p.titulo}"
                     onerror="this.src='https://placehold.co/250x375/111/d4af37?text=${encodeURIComponent(p.titulo)}'">
                <button class="btn-trailer" id="btn-trailer" onclick="verTrailer(${p.id})">
                    &#9654; Ver trailer
                </button>
            </div>
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
                    <h3>Compra tus boletas</h3>
                    <div class="cines-links">
                        ${CINES.map(c => `
                            <a class="cine-link-btn"
                               href="${urlCine(c.id, p.titulo)}"
                               target="_blank" rel="noopener">
                                <span class="cine-link-nombre">${c.nombre}</span>
                                <span class="cine-link-sub">Ver horarios y comprar →</span>
                            </a>`).join('')}
                        <a class="cine-link-btn cine-link-google"
                           href="https://www.google.com/search?q=${encodeURIComponent(p.titulo + ' cine Colombia horarios')}"
                           target="_blank" rel="noopener">
                            <span class="cine-link-nombre">Buscar en Google</span>
                            <span class="cine-link-sub">Todos los cines cerca de ti →</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>`;
}

async function verTrailer(id) {
    const btn = document.getElementById('btn-trailer');
    if (btn) { btn.textContent = 'Cargando…'; btn.disabled = true; }

    const apiConfigurada = CONFIG.TMDB_API_KEY && CONFIG.TMDB_API_KEY !== 'TU_API_KEY_AQUI';
    const url = apiConfigurada ? await cargarTrailer(id) : null;

    if (!url) {
        mostrarToast('Trailer no disponible para esta película');
        if (btn) { btn.textContent = '✕ No disponible'; }
        return;
    }

    // Reemplaza el poster con el iframe de YouTube
    const wrap = document.getElementById('modal-poster').parentElement;
    wrap.innerHTML = `
        <iframe class="trailer-frame"
                src="${url}"
                frameborder="0"
                allow="autoplay; encrypted-media"
                allowfullscreen>
        </iframe>`;
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

function urlCine(cineId, titulo) {
    const q = encodeURIComponent(titulo);
    const urls = {
        'cine-colombia': `https://www.cinecolombia.com/buscar?q=${q}`,
        'cinemark':      `https://www.cinemark.com.co/peliculas`,
        'cinepolis':     `https://www.cinepolis.com.co/pelicula/${q.toLowerCase().replace(/%20/g, '-')}`
    };
    return urls[cineId] || `https://www.google.com/search?q=${q}+horarios+cine+colombia`;
}

function abrirPolitica() {
    document.getElementById('modal-politica').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function cerrarPolitica() {
    document.getElementById('modal-politica').style.display = 'none';
    document.body.style.overflow = '';
}
function abrirAcerca() {
    document.getElementById('modal-acerca').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function cerrarAcerca() {
    document.getElementById('modal-acerca').style.display = 'none';
    document.body.style.overflow = '';
}

function setupNavScroll() {
    document.querySelectorAll('nav a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
        });
    });
}
