import { movimientoService } from "../services/movimiento.service.js";
import { MovimientoDTO, InicioDTO } from "../DTOs/movimiento.dto.js";

export async function listarMovimientos(req, res) {
  const movimientos = await movimientoService.listar(req.usuario.id);
  res.status(200).json({ movimientos: movimientos.map((movimiento) => new MovimientoDTO(movimiento)) });
}

export async function crearMovimiento(req, res) {
  const movimiento = await movimientoService.crear(req.usuario.id, req.body);
  res.status(201).json({ movimiento: new MovimientoDTO(movimiento) });
}

export async function actualizarMovimiento(req, res) {
  const movimiento = await movimientoService.actualizar(Number(req.params.id), req.usuario.id, req.body);
  res.status(200).json({ movimiento: new MovimientoDTO(movimiento) });
}

export async function borrarMovimiento(req, res) {
  await movimientoService.borrar(Number(req.params.id), req.usuario.id);
  res.status(204).end();
}

export async function getInicio(req, res) {
  const { resumen, ultimos } = await movimientoService.inicio(req.usuario.id);
  res.status(200).json(new InicioDTO(resumen, ultimos));
}
