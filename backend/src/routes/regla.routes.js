import { Router } from "express";
import { listarReglas, actualizarRegla, borrarRegla } from "../controllers/regla.controllers.js";
import { autenticarActual } from "../middlewares/passport.middlewares.js";
import { validarRegla, validarIdParam } from "../middlewares/validacion.middlewares.js";

const router = Router();

router.use(autenticarActual);

// Sin POST: las reglas se crean desde el PUT de un movimiento ("regla": { nombre }).
router.get("/", listarReglas);
router.put("/:id", validarIdParam, validarRegla, actualizarRegla);
router.delete("/:id", validarIdParam, borrarRegla);

export default router;
