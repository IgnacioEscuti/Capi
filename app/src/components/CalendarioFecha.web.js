// PROVISORIO-WEB: el datetimepicker no funciona en web. Se usa el <input type="date">
// del navegador (en Safari del iPhone abre la ruedita nativa de fecha).
// Safari puede avisar cada cambio de la ruedita, así que el día se confirma con "Listo".
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import BotonPrimario from '@/components/BotonPrimario';
import { colores, fuentes, radios } from '@/theme';

export default function CalendarioFecha({ valor, onElegir }) {
  const [texto, setTexto] = useState(aTextoInput(valor));

  return (
    <View style={styles.contenedor}>
      {/* Elemento del DOM: en web, React Native Web convive con HTML común. */}
      <input
        type="date"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        aria-label="Fecha"
        style={estiloInput}
      />
      <BotonPrimario titulo="Listo" onPress={() => onElegir(texto ? deTextoInput(texto) : valor)} />
    </View>
  );
}

// El input trabaja con "AAAA-MM-DD" en hora local (toISOString daría el día en UTC).
function aTextoInput(fecha) {
  const dosCifras = (numero) => String(numero).padStart(2, '0');
  return `${fecha.getFullYear()}-${dosCifras(fecha.getMonth() + 1)}-${dosCifras(fecha.getDate())}`;
}

function deTextoInput(texto) {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

const styles = StyleSheet.create({
  contenedor: {
    gap: 16,
    paddingBottom: 4,
  },
});

// Estilo CSS (no de React Native): va directo al <input>.
const estiloInput = {
  boxSizing: 'border-box',
  width: '100%',
  height: 56,
  padding: '0 16px',
  border: 'none',
  borderRadius: radios.mensaje,
  backgroundColor: colores.elevado,
  color: colores.texto,
  colorScheme: 'dark',
  fontFamily: fuentes.medio,
  fontSize: 17,
  outline: 'none',
  WebkitAppearance: 'none',
};
