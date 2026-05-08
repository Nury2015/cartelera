// Obtén tu clave gratis en: https://www.themoviedb.org/settings/api
// 1. Crea una cuenta en themoviedb.org
// 2. Ve a Configuración > API > Solicitar API Key (opción "Developer")
// 3. Pega tu API Key (v3) aquí abajo

const CONFIG = {
    TMDB_API_KEY: '8bf8dfb691ef5f7ca4e77d65c299c82a',
    TMDB_BASE:    'https://api.themoviedb.org/3',
    IMG_BASE:      'https://image.tmdb.org/t/p/w500',  // modal
    IMG_CARD:      'https://image.tmdb.org/t/p/w342',  // cards — más rápido
    LANG:          'es-CO',
    REGION:        'CO',
    MAX_CARTELERA:    12,
    MAX_PROXIMAMENTE: 160,  // 8 páginas → cubre todo el año
};
