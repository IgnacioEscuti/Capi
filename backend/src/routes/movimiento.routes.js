import { Router } from "express";
import {
  listarMovimientos,
  crearMovimiento,
  actualizarMovimiento,
  borrarMovimiento,
} from "../controllers/movimiento.controllers.js";
import { autenticarActual } from "../middlewares/passport.middlewares.js";
import { validarMovimiento, validarIdParam } from "../middlewares/validacion.middlewares.js";

const router = Router();

router.use(autenticarActual);

router.get("/", listarMovimientos);
router.post("/", validarMovimiento, crearMovimiento);
router.put("/:id", validarIdParam, validarMovimiento, actualizarMovimiento);
router.delete("/:id", validarIdParam, borrarMovimiento);

export default router;
