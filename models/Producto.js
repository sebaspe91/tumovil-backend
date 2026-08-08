import Sequelize from 'sequelize';
import db from '../config/db.js';
import generarCodigo from "../helpers/generarCodigo.js"

const Producto = db.define('productos', {
    id_producto: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    categoria_id: {
        type: Sequelize.INTEGER
    },
    marca_id: {
        type: Sequelize.INTEGER
    },
    nombre_prod: {
        type: Sequelize.STRING
    },
    codigo_prod: {
        type: Sequelize.STRING,
        unique: true
    },
    cantidad_prod: {
        type: Sequelize.INTEGER
    },
    precio_compra: {
        type: Sequelize.DECIMAL
    },
    precio_venta: {
        type: Sequelize.DECIMAL
    },
    estado_prod: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    },
    detalle_prod: {
        type: Sequelize.STRING
    }
});

// hook: genera el codigo_prod automáticamente antes de insertar
Producto.beforeCreate(async (producto) => {
    producto.codigo_prod = await generarCodigo(producto.categoria_id, producto.marca_id, Producto);
});

// Actualizar el id producto
Producto.beforeUpdate(async (producto) => {
    if (producto.changed('categoria_id') || producto.changed('marca_id')) {
        producto.codigo_prod = await generarCodigo(
            producto.categoria_id,
            producto.marca_id,
            Producto,
            producto.id_producto
        );
    }
});

export default Producto;