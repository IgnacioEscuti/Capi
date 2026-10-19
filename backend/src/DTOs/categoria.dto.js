export class CategoriaDTO {
  constructor(categoria) {
    this.id = categoria.id;
    this.nombre = categoria.name;
    this.icono = categoria.icon;
    this.cantidadMovimientos = categoria.movement_count;
  }
}
