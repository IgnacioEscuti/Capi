import { reglaService } from "../services/regla.service.js";
import { ReglaDTO } from "../DTOs/regla.dto.js";

export async function listarReglas(req, res) {
  const reglas = await reglaService.listar(req.usuario.id);
  res.status(200).json({ reglas: reglas.map((regla) => new ReglaDTO(regla)) });
}

export async function actualizarRegla(req, res) {
  const regla = await reglaService.actualizar(Number(req.params.id), req.usuario.id, req.body);
  res.status(200).json({ regla: new ReglaDTO(regla) });
}

export async function borrarRegla(req, res) {
  await reglaService.borrar(Number(req.params.id), req.usuario.id);
  res.status(204).end();
}
