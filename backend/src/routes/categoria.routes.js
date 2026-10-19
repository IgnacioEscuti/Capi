import { Router } from "express";
import {
  listarCategorias,
  crearCategoria,
  renombrarCategoria,
  borrarCategoria,
} from "../controllers/categoria.controllers.js";
import { autenticarActual } from "../middlewares/passport.middlewares.js";
import { validarCategoria, validarIdParam } from "../middlewares/validacion.middlewares.js";

const router = Router();

router.use(autenticarActual);

router.get("/", listarCategorias);
router.post("/", validarCategoria, crearCategoria);
router.patch("/:id", validarIdParam, validarCategoria, renombrarCategoria);
router.delete("/:id", validarIdParam, borrarCategoria);

export default router;
