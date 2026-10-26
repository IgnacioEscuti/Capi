// Nunca expone la contraparte (ID de MP ni huella del CBU): solo de dónde
// viene y, si es un CBU, sus últimos 4 dígitos para reconocerlo.
export class ReglaDTO {
  constructor(regla) {
    this.id = regla.id;
    this.nombre = regla.name;
    this.origen = regla.origin;
    this.ultimos4 = regla.origin === "cbu" ? regla.counterparty_account_last4 : null;
    this.categoria = { id: regla.category_id, nombre: regla.category_name, icono: regla.category_icon };
  }
}
