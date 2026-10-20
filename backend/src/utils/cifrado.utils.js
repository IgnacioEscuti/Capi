import crypto from "node:crypto";
import { env } from "../config/env.js";

// AES-256-GCM: cifra y además autentica. Si alguien modifica el texto
// guardado (o se usa otra clave), decipher.final() tira error en vez de
// devolver basura.
const ALGORITMO = "aes-256-gcm";
const BYTES_IV = 12; // Tamaño recomendado para GCM.
const BYTES_TAG = 16;
const CLAVE = Buffer.from(env.MP_TOKEN_KEY, "hex");

// Devuelve "iv.tag.cifrado" en base64. El IV es aleatorio en cada llamada
// (nunca se repite con la misma clave) y no es secreto: se guarda junto al
// texto cifrado porque hace falta para descifrar.
export function cifrar(texto) {
  const iv = crypto.randomBytes(BYTES_IV);
  const cipher = crypto.createCipheriv(ALGORITMO, CLAVE, iv, { authTagLength: BYTES_TAG });
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, cifrado].map((parte) => parte.toString("base64")).join(".");
}

export function descifrar(guardado) {
  const [iv, tag, cifrado] = guardado.split(".").map((parte) => Buffer.from(parte, "base64"));
  const decipher = crypto.createDecipheriv(ALGORITMO, CLAVE, iv, { authTagLength: BYTES_TAG });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString("utf8");
}
