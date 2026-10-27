import { reporteService } from "../services/reporte.service.js";
import { GastosPorCategoriaDTO, DetalleCategoriaDTO, ResumenMesDTO } from "../DTOs/reporte.dto.js";
import { SIN_CATEGORIA } from "../middlewares/validacion.middlewares.js";

export async function getGastosPorCategoria(req, res) {
  const reporte = await reporteService.gastosPorCategoria(req.usuario.id, req.query.mes);
  res.status(200).json(new GastosPorCategoriaDTO(reporte));
}

export async function getResumen(req, res) {
  const resumen = await reporteService.resumen(req.usuario.id, req.query.mes);
  res.status(200).json(new ResumenMesDTO(resumen));
}

export async function getDetalleCategoria(req, res) {
  const categoriaId = req.params.id === SIN_CATEGORIA ? null : Number(req.params.id);
  const detalle = await reporteService.detalleCategoria(req.usuario.id, categoriaId, req.query.mes);
  res.status(200).json(new DetalleCategoriaDTO(detalle));
}
