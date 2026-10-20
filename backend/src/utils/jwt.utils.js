import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const JWT_ALGORITMO = "HS256";
const JWT_DURACION = "30d";

// El "state" de OAuth de MP también es un JWT firmado con JWT_SECRET. La
// audiencia lo distingue de un token de sesión: uno de sesión no sirve
// como state (y uno de state no tiene "id", así que no sirve como sesión).
const STATE_MP_AUDIENCIA = "mp-oauth";
const STATE_MP_DURACION = "10m";

export function generarToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, { algorithm: JWT_ALGORITMO, expiresIn: JWT_DURACION });
}

export function generarStateMp({ userId, returnUrl }) {
  return jwt.sign({ userId, returnUrl }, env.JWT_SECRET, {
    algorithm: JWT_ALGORITMO,
    expiresIn: STATE_MP_DURACION,
    audience: STATE_MP_AUDIENCIA,
  });
}

// Tira error si la firma no es válida, si venció o si no es un state de MP.
export function verificarStateMp(state) {
  return jwt.verify(state, env.JWT_SECRET, { algorithms: [JWT_ALGORITMO], audience: STATE_MP_AUDIENCIA });
}
