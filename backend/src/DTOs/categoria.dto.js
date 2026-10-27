export class CategoriaDTO {
  constructor(categoria) {
    this.id = categoria.id;
    this.nombre = categoria.name;
    this.icono = categoria.icon;
    this.color = categoria.color;
    this.cantidadMovimientos = categoria.movement_count;
    this.cantidadReglas = categoria.rule_count;
  }
}
