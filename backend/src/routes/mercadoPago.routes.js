import { Router } from "express";
import {
  getUrlDeConexion,
  callback,
  getEstado,
  desconectar,
  sincronizar,
} from "../controllers/mercadoPago.controllers.js";
import { autenticarActual } from "../middlewares/passport.middlewares.js";
import { validarReturnUrl } from "../middlewares/validacion.middlewares.js";

const router = Router();

// Sin autenticación: lo llama MP. El usuario se identifica con el state firmado.
router.get("/callback", callback);

router.get("/conectar", autenticarActual, validarReturnUrl, getUrlDeConexion);
router.get("/estado", autenticarActual, getEstado);
router.delete("/conexion", autenticarActual, desconectar);
router.post("/sincronizar", autenticarActual, sincronizar);

export default router;
