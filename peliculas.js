const PELICULAS_EN_CARTELERA = [
  {
    id: 1,
    titulo: "Mi villano favorito 4",
    imagen: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQ7xF3fzFhsXDggKXUa8UMSyG1kgMg3OXHgg&s",
    generos: ["Animación", "Comedia", "Aventura"],
    duracion: "94 min",
    clasificacion: "Todo público",
    estreno: "2024-07-03",
    descripcion: "Gru se enfrenta a un misterioso archienemigo mientras intenta llevar una vida tranquila con su familia. Una nueva aventura lo llevará a descubrir secretos de su pasado.",
    salas: {
      "Sala 1": ["12:00", "14:30", "17:00"],
      "Sala 2": ["13:00", "15:30", "18:00", "20:30"]
    },
    calificacion: 7.1
  },
  {
    id: 2,
    titulo: "Intensamente 2",
    imagen: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSTS_J9b94ev7DVi9IczSe4MfYkitivnv30w&s",
    generos: ["Animación", "Aventura", "Drama"],
    duracion: "100 min",
    clasificacion: "Todo público",
    estreno: "2024-06-14",
    descripcion: "Riley es ahora una adolescente. Nuevas emociones irrumpen en la sala de control de su mente, poniendo patas arriba todo lo que existe. Alegría deberá enfrentar un reto sin precedentes.",
    salas: {
      "Sala 3": ["11:00", "13:30", "16:00", "18:30", "21:00"],
      "Sala 1": ["12:30", "15:00", "17:30"]
    },
    calificacion: 7.9
  },
  {
    id: 3,
    titulo: "El depredador",
    imagen: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSq9SoWNRu9aLb69QRgRCIGQpt7wU8dyDDPwQ&s",
    generos: ["Acción", "Ciencia ficción", "Terror"],
    duracion: "119 min",
    clasificacion: "Mayores de 16",
    estreno: "2024-08-13",
    descripcion: "Una joven cazadora enfrenta al extraterrestre más peligroso del universo en las llanuras del continente americano, cientos de años atrás. El origen de una leyenda.",
    salas: {
      "Sala 4": ["14:00", "16:30", "19:00", "21:30"],
      "Sala 2": ["15:00", "17:30", "20:00"]
    },
    calificacion: 8.1
  },
  {
    id: 4,
    titulo: "El planeta de los simios",
    imagen: "https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcSci1J1mSfb-AI_XsU2y0i3pDOOlXKekXXjd8PF3yNu778-WkOp",
    generos: ["Acción", "Ciencia ficción", "Aventura"],
    duracion: "145 min",
    clasificacion: "Mayores de 13",
    estreno: "2024-05-10",
    descripcion: "En un mundo donde los simios dominan y los humanos han sido reducidos a vivir como animales, un joven simio emprende un viaje que lo llevará a cuestionar los cimientos de su sociedad.",
    salas: {
      "Sala 5": ["13:00", "16:00", "19:00"],
      "Sala 3": ["14:30", "17:30", "20:30"]
    },
    calificacion: 7.5
  },
  {
    id: 5,
    titulo: "Rohirrim",
    imagen: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTS0HAZS1wT6LBp57cMOfOQg12BREF4OiYcYskcVITbyG5XaFBqQg83WAgVnY8086m611s&usqp=CAU",
    generos: ["Animación", "Fantasía", "Aventura"],
    duracion: "134 min",
    clasificacion: "Todo público",
    estreno: "2024-12-13",
    descripcion: "La historia épica de los Rohirrim, los legendarios guerreros a caballo del Señor de los Anillos. Mil años antes de la Guerra del Anillo, una reina lucha por salvar su pueblo.",
    salas: {
      "Sala 1": ["11:30", "14:30", "17:30", "20:30"]
    },
    calificacion: 7.3
  },
  {
    id: 6,
    titulo: "Clic",
    imagen: "https://www.ecartelera.com/carteles/1000/1062/001_m.jpg",
    generos: ["Comedia", "Fantasía", "Drama"],
    duracion: "107 min",
    clasificacion: "Todo público",
    estreno: "2006-06-23",
    descripcion: "Un arquitecto workaholic obtiene un control remoto mágico que le permite adelantar, pausar y retroceder partes de su vida. Pronto descubre que el pasado es todo lo que tenemos.",
    salas: {
      "Sala 2": ["12:00", "14:30", "17:00"]
    },
    calificacion: 6.4
  },
  {
    id: 7,
    titulo: "El despertar",
    imagen: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQF_64-tIxGHBEp0SjN6YLGq_OrE7ytU3eYZg&s",
    generos: ["Terror", "Misterio", "Suspenso"],
    duracion: "107 min",
    clasificacion: "Mayores de 13",
    estreno: "2011-11-11",
    descripcion: "En la Inglaterra de los años 20, una investigadora de fraudes paranormales es convocada a una escuela rural para investigar el fantasma de un niño que aterroriza a los estudiantes.",
    salas: {
      "Sala 4": ["18:00", "20:00", "22:00"]
    },
    calificacion: 6.8
  },
  {
    id: 8,
    titulo: "Ojalá fuera cierto",
    imagen: "https://es.web.img3.acsta.net/c_310_420/medias/nmedia/18/78/66/37/20165822.jpg",
    generos: ["Comedia", "Romance", "Fantasía"],
    duracion: "96 min",
    clasificacion: "Todo público",
    estreno: "2005-08-05",
    descripcion: "Un médico descubre que su nuevo apartamento ya está habitado por el fantasma de una bella mujer. Los dos se enamoran en una imposible historia de amor entre mundos.",
    salas: {
      "Sala 3": ["11:00", "13:00", "15:00", "17:00"]
    },
    calificacion: 6.6
  }
];

const PROXIMAMENTE = [
  {
    id: 9,
    titulo: "Deadpool & Wolverine",
    imagen: "https://placehold.co/220x300/1a0a0a/d4af37?text=Deadpool+%26+Wolverine",
    generos: ["Acción", "Comedia", "Superhéroes"],
    duracion: "127 min",
    clasificacion: "Mayores de 16",
    estreno: "2024-07-26",
    descripcion: "Deadpool y Wolverine se unen en una aventura que sacudirá el multiverso de Marvel de maneras inesperadas y muy irreverentes."
  },
  {
    id: 10,
    titulo: "Joker: Folie à Deux",
    imagen: "https://placehold.co/220x300/0a0a1a/d4af37?text=Joker+2",
    generos: ["Drama", "Crimen", "Musical"],
    duracion: "138 min",
    clasificacion: "Mayores de 18",
    estreno: "2024-10-04",
    descripcion: "Arthur Fleck está recluido en el Arkham State Hospital. Allí conoce a Harley Quinn y los dos se embarcan en una alucinante historia de amor y caos."
  },
  {
    id: 11,
    titulo: "Gladiador 2",
    imagen: "https://placehold.co/220x300/1a1000/d4af37?text=Gladiador+2",
    generos: ["Acción", "Drama", "Historia"],
    duracion: "148 min",
    clasificacion: "Mayores de 13",
    estreno: "2024-11-22",
    descripcion: "La secuela del épico ganador del Óscar. Una nueva generación de guerreros lucha por Roma en las arenas del Coliseo."
  },
  {
    id: 12,
    titulo: "Kraven el cazador",
    imagen: "https://placehold.co/220x300/001a0a/d4af37?text=Kraven",
    generos: ["Acción", "Aventura", "Superhéroes"],
    duracion: "127 min",
    clasificacion: "Mayores de 16",
    estreno: "2024-12-13",
    descripcion: "El origen de uno de los villanos más brutales del universo Spider-Man. Sergei Kravinoff está decidido a probar que es el mejor cazador del mundo."
  }
];

const MENU_COMIDA = [
  {
    categoria: "Combos",
    icono: "🍿",
    items: [
      { nombre: "Combo Solo", descripcion: "Crispetas medianas + bebida grande", precio: "$22.000" },
      { nombre: "Combo Pareja", descripcion: "2 crispetas medianas + 2 bebidas grandes", precio: "$38.000" },
      { nombre: "Combo Familiar", descripcion: "Crispetas grandes + 4 bebidas medianas + nachos", precio: "$58.000" },
      { nombre: "Combo Premium", descripcion: "Crispetas grandes + 2 bebidas + nachos + perro caliente", precio: "$48.000" }
    ]
  },
  {
    categoria: "Crispetas",
    icono: "🍿",
    items: [
      { nombre: "Crispetas Pequeñas", descripcion: "Con mantequilla", precio: "$9.000" },
      { nombre: "Crispetas Medianas", descripcion: "Con mantequilla", precio: "$13.000" },
      { nombre: "Crispetas Grandes", descripcion: "Con mantequilla", precio: "$18.000" },
      { nombre: "Crispetas Caramelo", descripcion: "Sabor caramelo, tamaño mediano", precio: "$15.000" }
    ]
  },
  {
    categoria: "Bebidas",
    icono: "🥤",
    items: [
      { nombre: "Gaseosa Pequeña", descripcion: "300 ml, varios sabores", precio: "$7.000" },
      { nombre: "Gaseosa Mediana", descripcion: "500 ml, varios sabores", precio: "$10.000" },
      { nombre: "Gaseosa Grande", descripcion: "750 ml, varios sabores", precio: "$13.000" },
      { nombre: "Agua Cristal", descripcion: "600 ml", precio: "$5.000" }
    ]
  },
  {
    categoria: "Snacks",
    icono: "🌮",
    items: [
      { nombre: "Nachos con Queso", descripcion: "Con dip de queso cheddar caliente", precio: "$16.000" },
      { nombre: "Perro Caliente", descripcion: "Con mostaza, kétchup y mayonesa", precio: "$12.000" },
      { nombre: "Papas Fritas", descripcion: "Porción mediana con aderezo", precio: "$11.000" },
      { nombre: "Churros", descripcion: "3 unidades con chocolate", precio: "$9.000" }
    ]
  }
];
