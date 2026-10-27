import { Router } from "express";
import { getGastosPorCategoria, getDetalleCategoria, getResumen } from "../controllers/reporte.controllers.js";
import { autenticarActual } from "../middlewares/passport.middlewares.js";
import { validarMesReporte, validarCategoriaReporte } from "../middlewares/validacion.middlewares.js";

const router = Router();

router.use(autenticarActual);

// ?mes=2026-10. El detalle acepta un id o "sin-categoria".
router.get("/resumen", validarMesReporte, getResumen);
router.get("/categorias", validarMesReporte, getGastosPorCategoria);
router.get("/categorias/:id", validarCategoriaReporte, validarMesReporte, getDetalleCategoria);

export default router;
