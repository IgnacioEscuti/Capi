import { mercadoPagoService } from "../services/mercadoPago.service.js";

export function getUrlDeConexion(req, res) {
  const url = mercadoPagoService.urlDeConexion(req.usuario.id, req.query.returnUrl);
  res.status(200).json({ url });
}

// Lo llama MP (desde el navegador del usuario) después de autorizar.
// Nunca se loguean el code ni los tokens.
export async function callback(req, res) {
  const { code, state } = req.query;
  const datosState = typeof state === "string" ? mercadoPagoService.leerState(state) : null;

  if (!datosState) {
    return res.status(400).type("text").send("El enlace venció o no es válido. Volvé a intentar desde la app.");
  }

  let resultado = "ok";
  try {
    // Si el usuario cancela, MP vuelve con ?error=... y sin code.
    if (typeof code !== "string" || code === "") throw new Error("Mercado Pago no devolvió un code");
    await mercadoPagoService.conectar(datosState.userId, code);
  } catch (error) {
    console.error("No se pudo conectar Mercado Pago:", error.message);
    resultado = "error";
  }

  // La returnUrl viene del state firmado, así que ya fue validada en /conectar.
  const destino = new URL(datosState.returnUrl);
  destino.searchParams.set("mp", resultado);
  res.redirect(destino.toString());
}

export async function getEstado(req, res) {
  res.status(200).json(await mercadoPagoService.estado(req.usuario.id));
}

export async function desconectar(req, res) {
  await mercadoPagoService.desconectar(req.usuario.id);
  res.status(204).end();
}

export async function sincronizar(req, res) {
  res.status(200).json(await mercadoPagoService.sincronizar(req.usuario.id));
}
