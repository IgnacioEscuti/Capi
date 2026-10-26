import DateTimePicker from '@react-native-community/datetimepicker';
import { colores } from '@/theme';

// Calendario de la hoja "Fecha" (iOS). Al tocar un día, lo devuelve con onElegir.
export default function CalendarioFecha({ valor, onElegir }) {
  return (
    <DateTimePicker
      value={valor}
      mode="date"
      display="inline"
      locale="es-AR"
      themeVariant="dark"
      accentColor={colores.acento}
      onValueChange={(_evento, fecha) => onElegir(fecha)}
    />
  );
}
