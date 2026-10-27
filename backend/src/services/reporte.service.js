import { reporteRepository } from "../repositories/reporte.repository.js";
import { categoriaRepository } from "../repositories/categoria.repository.js";
import { ErrorHttp } from "../utils/errorHttp.utils.js";
import { diasDelMes, hoyEnArgentina, mesAnterior } from "../utils/fecha.utils.js";

// Restar o dividir decimales en JS no es exacto (0.3 - 0.1 = 0.19999999999999998).
const redondearCentavos = (valor) => Math.round(valor * 100) / 100;

export class ReporteService {
  constructor(repository, categoriaRepository) {
    this.repository = repository;
    this.categoriaRepository = categoriaRepository;
  }

  async gastosPorCategoria(userId, mes) {
    const [cantidadMovimientos, categorias] = await Promise.all([
      this.repository.contarMovimientos(userId, mes),
      this.repository.gastosPorCategoria(userId, mes),
    ]);
    return { mes, cantidadMovimientos, categorias };
  }

  // Resumen del mes + ingresos y egresos de los últimos 6 meses.
  async resumen(userId, mes) {
    const hoy = hoyEnArgentina();
    const esMesActual = mes === hoy.mes;
    const anterior = mesAnterior(mes);

    // Mes actual: el mes pasado del día 1 al mismo día de hoy (si tiene menos días, hasta el último).
    // Mes pasado: el anterior completo, que ya viene entre los 6 meses.
    const [meses, egresosHastaHoy] = await Promise.all([
      this.repository.ingresosYEgresosUltimos6Meses(userId, mes),
      esMesActual
        ? this.repository.egresosHastaElDia(userId, anterior, Math.min(hoy.dia, diasDelMes(anterior)))
        : null,
    ]);

    const ingresos = Number(meses.at(-1).income);
    const egresos = Number(meses.at(-1).expense);
    const ahorro = redondearCentavos(ingresos - egresos);
    const egresosAnteriores = Number(esMesActual ? egresosHastaHoy : meses.at(-2).expense);
    // Mes actual: los días que pasaron hasta hoy (incluido); mes pasado: todos los del mes.
    const dias = esMesActual ? hoy.dia : diasDelMes(mes);

    return {
      mes,
      ingresos,
      egresos,
      ahorro,
      // Sin ingresos (o con el neto de Sueldo negativo) la tasa no tiene sentido.
      tasaAhorro: ingresos > 0 ? (ahorro / ingresos) * 100 : null,
      comparacion: {
        tipo: esMesActual ? "mismo_dia" : "mes_anterior",
        egresosAnteriores,
        // Sin gastos el mes anterior no hay contra qué comparar.
        variacion: egresosAnteriores > 0 ? ((egresos - egresosAnteriores) / egresosAnteriores) * 100 : null,
      },
      gastoPromedioDiario: redondearCentavos(egresos / dias),
      meses: meses.map((fila) => ({ mes: fila.month, ingresos: Number(fila.income), egresos: Number(fila.expense) })),
    };
  }

  // categoriaId null = "Sin categoría".
  async detalleCategoria(userId, categoriaId, mes) {
    let categoria = null;
    if (categoriaId !== null) {
      categoria = await this.categoriaRepository.buscarPorId(categoriaId, userId);
      // No existe o es de otro usuario: 404 en los dos casos.
      if (!categoria) throw new ErrorHttp(404, "Categoría no encontrada");
    }

    const [gastos, meses, movimientos] = await Promise.all([
      this.repository.gastosPorCategoria(userId, mes),
      this.repository.gastosUltimos12Meses(userId, categoriaId, mes),
      this.repository.gastosDelMes(userId, categoriaId, mes),
    ]);
    // El total y la cantidad del mes salen del mismo cálculo que el ranking,
    // así el detalle coincide siempre con la fila que se tocó.
    const delMes = gastos.find((fila) => fila.category_id === categoriaId);

    return { mes, categoria, gastos, delMes, meses, movimientos };
  }
}

export const reporteService = new ReporteService(reporteRepository, categoriaRepository);
