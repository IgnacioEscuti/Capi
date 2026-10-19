import { Router } from "express";
import { getInicio } from "../controllers/movimiento.controllers.js";
import { autenticarActual } from "../middlewares/passport.middlewares.js";

const router = Router();

router.get("/", autenticarActual, getInicio);

export default router;
