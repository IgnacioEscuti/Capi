import { categoriaService } from "../services/categoria.service.js";
import { CategoriaDTO } from "../DTOs/categoria.dto.js";

export async function listarCategorias(req, res) {
  const categorias = await categoriaService.listar(req.usuario.id);
  res.status(200).json({ categorias: categorias.map((categoria) => new CategoriaDTO(categoria)) });
}

export async function crearCategoria(req, res) {
  const categoria = await categoriaService.crear(req.usuario.id, req.body.nombre);
  res.status(201).json({ categoria: new CategoriaDTO(categoria) });
}

export async function renombrarCategoria(req, res) {
  const categoria = await categoriaService.renombrar(Number(req.params.id), req.usuario.id, req.body.nombre);
  res.status(200).json({ categoria: new CategoriaDTO(categoria) });
}

export async function borrarCategoria(req, res) {
  await categoriaService.borrar(Number(req.params.id), req.usuario.id);
  res.status(204).end();
}
