// Convierte un pago de /v1/payments/search en un movimiento de Capi.
// Reglas en PLAN.md → Etapa 3 → 3b ("Mapeo al importar").

const DESCRIPCION_MAX_CARACTERES = 200; // Igual que la validación de movimientos.

const aId = (valor) => (valor == null ? null : String(valor));

// Lo que realmente se movió en el saldo:
// - Ingreso: transaction_details.net_received_amount (lo que llega después de
//   comisiones y retenciones de charges_details/fee_details).
// - Egreso: transaction_details.total_paid_amount (lo que pagué en total).
// - Interno: transaction_amount (pasa entera de la cuenta a la reserva o al revés).
// Si el campo no viene o viene en 0, se usa transaction_amount.
function montoMovido(pago, tipo) {
  const detalle = pago.transaction_details ?? {};
  const monto =
    tipo === "income" ? detalle.net_received_amount : tipo === "expense" ? detalle.total_paid_amount : null;
  return monto > 0 ? monto : pago.transaction_amount;
}

// El branch real trae texto de más y no siempre con el mismo formato
// ("AM-to-POT - Partition Transfer", "POT-to-AM-Partition Transfer"):
// se compara solo el comienzo.
function descripcionDeReserva(pago) {
  const branch = pago.point_of_interaction?.business_info?.branch ?? "";
  const haciaReserva = pago.amounts?.collector?.transaction_destination?.subpartition?.name;
  const desdeReserva = pago.amounts?.payer?.transaction_source?.partitions?.[0]?.subpartition?.name;

  if (branch.startsWith("AM-to-POT") || (!branch && haciaReserva)) {
    return haciaReserva ? `A reserva: ${haciaReserva}` : "A reserva";
  }
  if (branch.startsWith("POT-to-AM") || (!branch && desdeReserva)) {
    return desdeReserva ? `Desde reserva: ${desdeReserva}` : "Desde reserva";
  }
  return "Movimiento de reserva";
}

// Devuelve el movimiento o null si el pago no se importa.
export function mapearPago(pago, mpUserId) {
  if (pago.status !== "approved") return null;

  // MP no es consistente: cuando yo cobro trae payer.id y collector_id;
  // cuando yo pago trae payer_id y collector.id (y los otros en null).
  const yo = aId(mpUserId);
  const pagador = aId(pago.payer_id ?? pago.payer?.id);
  const cobrador = aId(pago.collector_id ?? pago.collector?.id);

  let tipo;
  let descripcion = null;
  let contraparteMpId = null;

  switch (pago.operation_type) {
    case "partition_transfer":
      tipo = "internal";
      descripcion = descripcionDeReserva(pago);
      break;

    // Ingreso por CVU: payer y collector soy yo, así que la regla general
    // no sirve. Siempre es ingreso y sin persona.
    case "account_fund":
      tipo = "income";
      break;

    case "money_transfer":
    case "regular_payment":
    case "recurring_payment":
      if (pagador === yo) tipo = "expense";
      else if (cobrador === yo) tipo = "income";
      else return null;

      if (pago.operation_type === "money_transfer") {
        contraparteMpId = tipo === "income" ? pagador : cobrador;
      } else {
        descripcion = pago.description ?? null;
      }
      break;

    default:
      return null;
  }

  // Sin monto o sin fecha no se puede guardar (y haría fallar todo el lote).
  const monto = montoMovido(pago, tipo);
  const fecha = pago.date_approved ?? pago.date_created;
  if (!(monto > 0) || !fecha) return null;

  return {
    tipo,
    monto,
    fecha,
    descripcion: descripcion?.trim().slice(0, DESCRIPCION_MAX_CARACTERES) || null,
    externalId: String(pago.id),
    contraparteMpId,
  };
}
