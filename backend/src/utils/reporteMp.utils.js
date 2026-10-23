// Convierte el CSV del reporte de liquidaciones (release_report) de MP en
// movimientos de Capi. Solo se importan las transferencias a bancos
// (DESCRIPTION = "payout"): los pagos ya vienen por /v1/payments/search, los
// rendimientos (asset_management) no se importan y las filas reserve_* son
// reservas temporales que MP hace y deshace en el mismo segundo.
// Reglas en PLAN.md → Etapa 4.
import { huellaCbu } from "./cifrado.utils.js";

const DESCRIPCION_TRANSFERENCIA = "payout";
// Columnas que Capi necesita en el reporte (se agregan a la configuración del usuario).
export const COLUMNAS_REPORTE = ["DATE", "SOURCE_ID", "DESCRIPTION", "NET_DEBIT_AMOUNT", "PAYOUT_BANK_ACCOUNT_NUMBER"];

// Parser de CSV con comillas: algunas columnas (METADATA) traen JSON con el
// separador adentro, así que no alcanza con split(). Devuelve un array de filas
// (cada fila, un array de strings) sin las líneas vacías.
function leerCsv(texto, separador) {
  const filas = [];
  let fila = [];
  let campo = "";
  let entreComillas = false;

  const cerrarFila = () => {
    fila.push(campo);
    if (fila.some((valor) => valor !== "")) filas.push(fila);
    fila = [];
    campo = "";
  };

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];
    if (entreComillas) {
      if (caracter === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (caracter === '"') {
        entreComillas = false;
      } else {
        campo += caracter;
      }
    } else if (caracter === '"') {
      entreComillas = true;
    } else if (caracter === separador) {
      fila.push(campo);
      campo = "";
    } else if (caracter === "\n" || caracter === "\r") {
      if (caracter === "\r" && texto[i + 1] === "\n") i++;
      cerrarFila();
    } else {
      campo += caracter;
    }
  }
  if (campo !== "" || fila.length > 0) cerrarFila();
  return filas;
}

// Cada usuario puede tener otro separador en su configuración. Los nombres de
// columna son solo mayúsculas y guiones bajos, así que el primer carácter que
// no sea eso en el encabezado es el separador.
function detectarSeparador(encabezado) {
  return encabezado.match(/[^A-Z_]/)?.[0] ?? ",";
}

function mapearTransferencia(fila) {
  const monto = Number(fila.NET_DEBIT_AMOUNT);
  const fecha = new Date(fila.DATE);
  if (!fila.SOURCE_ID || !(monto > 0) || Number.isNaN(fecha.getTime())) return null;

  // Del CBU (dato de un tercero) se guarda solo una huella para reconocer
  // al destinatario y los últimos 4 dígitos para mostrarlo.
  const cbu = fila.PAYOUT_BANK_ACCOUNT_NUMBER.trim();
  const ultimos4 = cbu ? cbu.slice(-4) : null;

  return {
    tipo: "expense",
    monto,
    fecha,
    descripcion: ultimos4 ? `Transferencia a CBU …${ultimos4}` : "Transferencia a banco",
    // Con prefijo para que nunca choque con el ID de un pago (misma fuente 'mp_api').
    externalId: `payout_${fila.SOURCE_ID}`,
    contraparteMpId: null,
    cuentaHash: cbu ? huellaCbu(cbu) : null,
    cuentaUltimos4: ultimos4,
  };
}

// Devuelve los movimientos de las transferencias del reporte. Si faltan
// columnas tira error: sin ellas no se puede importar bien (por ejemplo, si el
// usuario cambió la configuración del reporte entre el pedido y la descarga).
export function leerTransferencias(csv) {
  const texto = csv.replace(/^\uFEFF/, ""); // BOM de UTF-8, si viene.
  const [encabezado = [], ...filas] = leerCsv(texto, detectarSeparador(texto.split(/\r?\n/, 1)[0]));

  const faltantes = COLUMNAS_REPORTE.filter((columna) => !encabezado.includes(columna));
  if (faltantes.length > 0) {
    throw new Error(`El reporte de liquidaciones no trae las columnas ${faltantes.join(", ")}`);
  }

  return filas
    .map((valores) => Object.fromEntries(encabezado.map((columna, i) => [columna, valores[i] ?? ""])))
    .filter((fila) => fila.DESCRIPTION === DESCRIPCION_TRANSFERENCIA)
    .map(mapearTransferencia)
    .filter(Boolean);
}
