// Colores de las categorías (solo se usan en Reportes): 30, uno distinto para cada
// categoría hasta ahí; de la 31 en adelante se repiten. Ninguno se parece al rojo
// de egresos, al verde de ingresos ni al naranja de acento.
// "Sin categoría" no tiene color guardado: la app la pinta de gris.
export const PALETA_CATEGORIAS = [
  // Los 7 del diseño + 3 con el mismo estilo (los de las 10 categorías iniciales).
  "#8B9CFF", "#5EC8F2", "#C39BFF", "#FFC857", "#F78FB3", "#6FD6C6", "#E0B48A", "#B5D96A", "#FF9C8A", "#E58BE0",
  // Más profundos.
  "#4B84D2", "#624BD2", "#A54BD2", "#D24BA5", "#D24B6D", "#4BC7D2", "#4BA5D2", "#D2B74B", "#D28F4B", "#8FD24B",
  // Más claros, en los matices que quedan entre los del diseño.
  "#B4F3F9", "#B4D0F9", "#BDB4F9", "#E6B4F9", "#F9B4E2", "#F9B4B9", "#F9C8B4", "#F9F9B4", "#D0F9B4", "#B4F9E2",
];

// Categorías que se le crean a cada usuario al registrarse.
// Los íconos son nombres de MaterialIcons (@expo/vector-icons).
// "compensa": en el resumen del mes suma su neto (entradas − salidas) a ingresos.
export const CATEGORIAS_INICIALES = [
  { nombre: "Sueldo", icono: "payments", color: "#E58BE0", compensa: true },
  { nombre: "Supermercado", icono: "shopping-cart", color: "#5EC8F2" },
  { nombre: "Comida", icono: "restaurant", color: "#FFC857" },
  { nombre: "Transporte", icono: "directions-car", color: "#F78FB3" },
  { nombre: "Servicios", icono: "bolt", color: "#C39BFF" },
  { nombre: "Alquiler", icono: "home", color: "#8B9CFF" },
  { nombre: "Salud", icono: "medical-services", color: "#B5D96A" },
  { nombre: "Salidas", icono: "local-bar", color: "#6FD6C6" },
  { nombre: "Compras", icono: "shopping-bag", color: "#E0B48A" },
  { nombre: "Otros", icono: "category", color: "#FF9C8A" },
];

// Ícono de las categorías que crea el usuario.
export const ICONO_GENERICO = "label";
