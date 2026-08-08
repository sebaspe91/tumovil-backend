import Categoria from '../models/Categoria.js';
import Producto from '../models/Producto.js';
import Marca from '../models/Marca.js';



// RELACIONES

// Categoria - Producto
Producto.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
Categoria.hasMany(Producto, { foreignKey: 'categoria_id', as: 'productos' });

// Marca - Producto
Producto.belongsTo(Marca, { foreignKey: 'marca_id', as: 'marca' });
Marca.hasMany(Producto, { foreignKey: 'marca_id', as: 'productos' });



// EXPORTAR
export {
    Categoria,
    Producto,
    Marca
}