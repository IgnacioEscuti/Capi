import { reporteRepository } from "../repositories/reporte.repository.js";
import { categoriaRepository } from "../repositories/categoria.repository.js";
import { ErrorHttp } from "../utils/errorHttp.utils.js";

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
