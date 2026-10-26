// pg devuelve las columnas NUMERIC como string (para no perder precisión).
// Con NUMERIC(14,2) el máximo es 999.999.999.999,99, que entra sin problema
// en un number de JS, así que acá se convierten.
const aNumero = (valor) => Number(valor);

export class MovimientoDTO {
  constructor(movimiento) {
    this.id = movimiento.id;
    this.tipo = movimiento.type;
    this.monto = aNumero(movimiento.amount);
    this.fecha = movimiento.occurred_at;
    this.descripcion = movimiento.description;
    this.origen = movimiento.source;
    this.categoria = movimiento.category_id
      ? { id: movimiento.category_id, nombre: movimiento.category_name, icono: movimiento.category_icon }
      : null;
    // Si se le puede crear una regla. Sin exponer el ID de MP ni la huella del CBU.
    this.tieneContraparte = movimiento.counterparty_mp_id != null || movimiento.counterparty_account_hash != null;
    this.regla = movimiento.rule_id
      ? {
          id: movimiento.rule_id,
          nombre: movimiento.rule_name,
          categoria: {
            id: movimiento.rule_category_id,
            nombre: movimiento.rule_category_name,
            icono: movimiento.rule_category_icon,
          },
        }
      : null;
  }
}

export class InicioDTO {
  constructor(resumen, ultimos) {
    this.saldo = aNumero(resumen.balance);
    this.esteMes = {
      ingresos: aNumero(resumen.month_income),
      egresos: aNumero(resumen.month_expense),
    };
    this.ultimos = ultimos.map((movimiento) => new MovimientoDTO(movimiento));
  }
}
