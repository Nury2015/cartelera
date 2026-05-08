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
    renderMenu();

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
//  Render — Selector de cine + precios + comida
// ============================================================
function renderSelectorCine() {
    const tabs = document.getElementById('cine-tabs');
    tabs.innerHTML = CINES.map((c, i) => `
        <button class="cine-tab ${i === cineActivo ? 'activo' : ''}" onclick="seleccionarCine(${i})">
            ${c.nombre}
        </button>`).join('');
    renderPrecios();
    renderMenu();
}

function seleccionarCine(index) {
    cineActivo = index;
    document.querySelectorAll('.cine-tab').forEach((b, i) =>
        b.classList.toggle('activo', i === index));
    renderPrecios();
    renderMenu();
}

function renderPrecios() {
    const cine = CINES[cineActivo];
    document.getElementById('precios-boletas').innerHTML = `
        <div class="precios-wrap">
            <div class="boletas-grid">
                <h3 class="precios-titulo">Boletas</h3>
                ${cine.boletas.map(b => `
                    <div class="boleta-item">
                        <span class="boleta-tipo">${b.tipo}</span>
                        <span class="boleta-precio">${b.precio}</span>
                    </div>`).join('')}
            </div>
            <div class="promos-box">
                <h3 class="precios-titulo">Promociones</h3>
                ${cine.promos.map(p => `<p class="promo-item">&#10003; ${p}</p>`).join('')}
                <p class="precios-nota">* Precios aproximados. Pueden variar según ciudad y función.</p>
            </div>
        </div>`;
}

function renderMenu() {
    const menu = CINES[cineActivo]?.menu || MENU_COMIDA;
    const combos    = menu.find(c => c.categoria === 'Combos');
    const crispetas = menu.find(c => c.categoria === 'Crispetas');
    const bebidas   = menu.find(c => c.categoria === 'Bebidas');
    const snacks    = menu.find(c => c.categoria === 'Snacks');

    document.getElementById('menu-container').innerHTML = `
        ${renderCombos(combos)}
        ${renderCrispetas(crispetas)}
        ${renderBebidas(bebidas)}
        ${renderSnacks(snacks)}
    `;
}

const COMBO_EMOJIS   = ['🍿\n🥤', '🍿🍿\n🥤🥤', '🍿🍿\n🥤🥤\n🌮', '🍿🍿\n🥤🥤\n🌮🌭'];
const COMBO_COLORES  = ['#2a1500', '#1a1500', '#1a1a00', '#1a0a1a'];

function renderCombos(cat) {
    if (!cat) return '';
    return `
        <div class="menu-bloque">
            <h2 class="menu-cat-titulo">🍿 Combos</h2>
            <div class="combos-grid">
                ${cat.items.map((item, i) => `
                    <div class="combo-card" style="--c:${COMBO_COLORES[i % 4]}">
                        <div class="combo-emoji">${COMBO_EMOJIS[i % 4]}</div>
                        <div class="combo-info">
                            <h3>${item.nombre}</h3>
                            <p>${item.descripcion}</p>
                            <span class="combo-precio">${item.precio}</span>
                        </div>
                    </div>`).join('')}
            </div>
        </div>`;
}

const CRISPETA_SIZES = ['sm', 'md', 'lg', 'cr'];
const CRISPETA_ICONS = ['🍿', '🍿', '🍿', '🍿'];

function renderCrispetas(cat) {
    if (!cat) return '';
    return `
        <div class="menu-bloque">
            <div class="showcase-banner">
                <div class="showcase-producto">
                    <span class="showcase-emoji">🍿</span>
                    <span class="showcase-label">Crispetas</span>
                    <span class="showcase-desde">desde ${cat.items[0]?.precio}</span>
                </div>
                <div class="showcase-mas">+</div>
                <div class="showcase-producto">
                    <span class="showcase-emoji">🥤</span>
                    <span class="showcase-label">Bebida</span>
                </div>
                <div class="showcase-texto">
                    <strong>La combinación perfecta del cine</strong>
                </div>
            </div>

            <h2 class="menu-cat-titulo">🍿 Crispetas</h2>
            <div class="crispetas-grid">
                ${cat.items.map((item, i) => `
                    <div class="crispeta-card ${CRISPETA_SIZES[i]}">
                        <span class="crispeta-icono">${CRISPETA_ICONS[i]}</span>
                        <h3>${item.nombre.replace('Crispetas ', '')}</h3>
                        <p class="crispeta-sub">${item.descripcion}</p>
                        <span class="crispeta-precio">${item.precio}</span>
                    </div>`).join('')}
            </div>
        </div>`;
}

function renderBebidas(cat) {
    if (!cat) return '';
    return `
        <div class="menu-bloque">
            <h2 class="menu-cat-titulo">🥤 Bebidas</h2>
            <div class="bebidas-grid">
                ${cat.items.map(item => `
                    <div class="bebida-card">
                        <div class="bebida-icono">${item.nombre.includes('Agua') ? '💧' : '🥤'}</div>
                        <h3>${item.nombre}</h3>
                        <p>${item.descripcion}</p>
                        <span class="bebida-precio">${item.precio}</span>
                    </div>`).join('')}
            </div>
        </div>`;
}

function renderSnacks(cat) {
    if (!cat) return '';
    const SNACK_ICONS = { 'Nachos': '🌮', 'Perro': '🌭', 'Papas': '🍟', 'Churros': '🥐' };
    return `
        <div class="menu-bloque">
            <h2 class="menu-cat-titulo">🌮 Snacks</h2>
            <div class="snacks-grid">
                ${cat.items.map(item => {
                    const icon = Object.entries(SNACK_ICONS).find(([k]) => item.nombre.includes(k))?.[1] || '🍴';
                    return `
                    <div class="snack-card">
                        <span class="snack-icono">${icon}</span>
                        <div class="snack-info">
                            <h3>${item.nombre}</h3>
                            <p>${item.descripcion}</p>
                        </div>
                        <span class="snack-precio">${item.precio}</span>
                    </div>`;
                }).join('')}
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
