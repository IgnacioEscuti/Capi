import { MovimientoDTO } from "./movimiento.dto.js";

// pg devuelve SUM(...) de NUMERIC como string: se pasa a number (ver movimiento.dto.js).
// Se redondea a centavos porque sumar decimales en JS no es exacto (0.1 + 0.2 = 0.30000000000000004).
const sumarTotales = (filas) => Math.round(filas.reduce((suma, fila) => suma + Number(fila.total), 0) * 100) / 100;

// null = "Sin categoría" (como en MovimientoDTO). La app la pinta de gris.
const categoriaDeFila = (fila) =>
  fila.id != null ? { id: fila.id, nombre: fila.name, icono: fila.icon, color: fila.color } : null;

export class GastosPorCategoriaDTO {
  constructor({ mes, cantidadMovimientos, categorias }) {
    this.mes = mes;
    // 0 = el mes no tiene ingresos ni egresos (estado vacío).
    this.cantidadMovimientos = cantidadMovimientos;
    this.totalGastado = sumarTotales(categorias);
    this.categorias = categorias.map((fila) => ({
      categoria: categoriaDeFila({ ...fila, id: fila.category_id }),
      total: Number(fila.total),
      cantidad: fila.movement_count,
    }));
  }
}

// Los números ya vienen calculados del service (ver reporteService.resumen).
export class ResumenMesDTO {
  constructor({ mes, ingresos, egresos, ahorro, tasaAhorro, comparacion, gastoPromedioDiario, meses }) {
    this.mes = mes;
    this.ingresos = ingresos;
    this.egresos = egresos;
    this.ahorro = ahorro;
    this.tasaAhorro = tasaAhorro; // % o null (sin ingresos)
    // tipo: "mismo_dia" (mes actual) o "mes_anterior" (mes pasado). variacion: % o null.
    this.comparacion = {
      tipo: comparacion.tipo,
      egresosAnteriores: comparacion.egresosAnteriores,
      variacion: comparacion.variacion,
    };
    this.gastoPromedioDiario = gastoPromedioDiario;
    this.meses = meses.map(({ mes: mesFila, ingresos: ingresosFila, egresos: egresosFila }) => ({
      mes: mesFila,
      ingresos: ingresosFila,
      egresos: egresosFila,
    }));
  }
}

export class DetalleCategoriaDTO {
  constructor({ mes, categoria, gastos, delMes, meses, movimientos }) {
    this.mes = mes;
    this.categoria = categoria ? categoriaDeFila(categoria) : null;
    this.total = delMes ? Number(delMes.total) : 0;
    this.cantidad = delMes ? delMes.movement_count : 0;
    // Total gastado del mes en todas las categorías, para el porcentaje.
    this.totalGastado = sumarTotales(gastos);
    this.meses = meses.map((fila) => ({ mes: fila.month, total: Number(fila.total) }));
    this.movimientos = movimientos.map((movimiento) => new MovimientoDTO(movimiento));
  }
}
