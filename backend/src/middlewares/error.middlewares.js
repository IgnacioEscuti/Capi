import { ErrorHttp } from "../utils/errorHttp.utils.js";

export function rutaNoEncontrada(req, res, next) {
  next(new ErrorHttp(404, "Ruta no encontrada"));
}

export function errorHandler(err, req, res, next) {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo de la request no es un JSON válido" });
  }

  if (err.statusCode && err.statusCode < 500) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Errores 5xx con mensaje pensado para el usuario (por ejemplo, 502 cuando
  // Mercado Pago no responde). Ya se loguearon donde se crearon.
  if (err instanceof ErrorHttp) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  console.error(`Error no controlado en ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ error: "Ocurrió un error en el servidor" });
}
