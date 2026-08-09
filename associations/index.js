import Categoria from '../models/Categoria.js';
import Marca from '../models/Marca.js';
import Producto from '../models/Producto.js';
import Cliente from '../models/Cliente.js';
import Proveedor from '../models/Proveedor.js';
import Usuario from '../models/Usuario.js';
import Empresa from '../models/Empresa.js';
import FacturaCliente from '../models/FacturaCliente.js';
import FacturaProveedor from '../models/FacturaProveedor.js';
import DetalleCliente from '../models/DetalleCliente.js';
import DetalleProveedor from '../models/DetalleProveedor.js';


// RELACIONES

// Categoria - Producto
Producto.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
Categoria.hasMany(Producto, { foreignKey: 'categoria_id', as: 'productos' });

// Marca - Producto
Producto.belongsTo(Marca, { foreignKey: 'marca_id', as: 'marca' });
Marca.hasMany(Producto, { foreignKey: 'marca_id', as: 'productos' });

// Factura Cliente - Cliente / Usuario / Empresa
FacturaCliente.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Cliente.hasMany(FacturaCliente, { foreignKey: 'cliente_id', as: 'facturas' });

FacturaCliente.belongsTo(Usuario, { foreignKey: 'usuario_fc_id', as: 'usuario' });
Usuario.hasMany(FacturaCliente, { foreignKey: 'usuario_fc_id', as: 'facturas_cliente' });

FacturaCliente.belongsTo(Empresa, { foreignKey: 'empresa_fc_id', as: 'empresa' });
Empresa.hasMany(FacturaCliente, { foreignKey: 'empresa_fc_id', as: 'facturas_cliente' });

// Factura Proveedor - Proveedor / Usuario / Empresa
FacturaProveedor.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });
Proveedor.hasMany(FacturaProveedor, { foreignKey: 'proveedor_id', as: 'facturas' });

FacturaProveedor.belongsTo(Usuario, { foreignKey: 'usuario_fp_id', as: 'usuario' });
Usuario.hasMany(FacturaProveedor, { foreignKey: 'usuario_fp_id', as: 'facturas_proveedor' });

FacturaProveedor.belongsTo(Empresa, { foreignKey: 'empresa_fp_id', as: 'empresa' });
Empresa.hasMany(FacturaProveedor, { foreignKey: 'empresa_fp_id', as: 'facturas_proveedor' });

// Detalle Cliente: une Producto <-> FacturaCliente
DetalleCliente.belongsTo(Producto, { foreignKey: 'producto_dc_id', as: 'producto' });
Producto.hasMany(DetalleCliente, { foreignKey: 'producto_dc_id', as: 'detalle_cliente' });

DetalleCliente.belongsTo(FacturaCliente, { foreignKey: 'fact_cli_id', as: 'factura' });
FacturaCliente.hasMany(DetalleCliente, { foreignKey: 'fact_cli_id', as: 'detalles' });

// Detalle Proveedor: une Producto <-> FacturaProveedor
DetalleProveedor.belongsTo(Producto, { foreignKey: 'producto_dp_id', as: 'producto' });
Producto.hasMany(DetalleProveedor, { foreignKey: 'producto_dp_id', as: 'detalle_proveedor' });

DetalleProveedor.belongsTo(FacturaProveedor, { foreignKey: 'fact_prov_id', as: 'factura' });
FacturaProveedor.hasMany(DetalleProveedor, { foreignKey: 'fact_prov_id', as: 'detalles' });


// EXPORTAR
export {
    Categoria,
    Marca,
    Producto,
    Cliente,
    Proveedor,
    Usuario,
    Empresa,
    FacturaCliente,
    FacturaProveedor,
    DetalleCliente,
    DetalleProveedor
};