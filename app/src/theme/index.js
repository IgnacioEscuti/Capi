export const colores = {
  fondo: '#1A1B1E',
  tarjeta: '#25262A',
  elevado: '#303136',
  pistaBarra: '#36373C',
  borde: 'rgba(255,255,255,0.06)',
  bordeAvatar: 'rgba(255,255,255,0.08)',
  navbarGlass: 'rgba(48,49,54,0.55)',
  bordeNavbar: 'rgba(255,255,255,0.10)',
  tabActiva: 'rgba(255,255,255,0.10)',
  presionado: 'rgba(255,255,255,0.06)',
  segmentoActivo: '#3A3B40',
  velo: 'rgba(0,0,0,0.6)',

  texto: '#F4F4F5',
  texto2: '#A1A3A8',
  texto3: '#76787E',
  textoAtenuado: 'rgba(244,244,245,0.5)',
  iconoMovimiento: '#C8CACE',

  acento: '#FF8A3D',
  acentoSuave: 'rgba(255,138,61,0.16)',
  sobreAcento: '#1F0D00',

  ingreso: '#3DDC84',
  egreso: '#FF4D5E',
  egresoSuave: 'rgba(255,77,94,0.16)',
  egresoFondo: 'rgba(255,77,94,0.06)',
  egresoBorde: 'rgba(255,77,94,0.20)',
};

// En React Native el peso no se elige con fontWeight: cada peso de Outfit es una fuente distinta.
export const fuentes = {
  regular: 'Outfit_400Regular',
  medio: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
};

// letterSpacing en RN va en puntos, no en em: -0.035em a 60px = -2.1.
export const tipografia = {
  display: { fontFamily: fuentes.bold, fontSize: 60, letterSpacing: -2.1, lineHeight: 63 },
  tituloGrande: { fontFamily: fuentes.bold, fontSize: 42, letterSpacing: -1.26, lineHeight: 46 },
  titulo: { fontFamily: fuentes.bold, fontSize: 28, letterSpacing: -0.56 },
  seccion: { fontFamily: fuentes.semibold, fontSize: 21, letterSpacing: -0.21 },
  cuerpo: { fontFamily: fuentes.medio, fontSize: 16 },
  meta: { fontFamily: fuentes.regular, fontSize: 13 },
};

export const radios = {
  hoja: 32,
  tarjeta: 28,
  logo: 18,
  mensaje: 16,
  icono: 13,
  iconoCampo: 12,
  pildora: 999,
};

export const espaciado = {
  pantalla: 16,
  pantallaAuth: 24,
  navbarInferior: 28,
  // Alto del navbar + su margen: espacio libre al final del contenido para que no lo tape.
  debajoDelNavbar: 130,
};

export const sombras = {
  logo: '0 12px 36px rgba(255,138,61,0.35)',
  boton: '0 14px 36px rgba(255,138,61,0.28)',
  botonAgregar: '0 12px 30px rgba(255,138,61,0.4)',
  navbar: '0 16px 36px rgba(0,0,0,0.35)',
};
