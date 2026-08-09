import Sequelize from 'sequelize';
import db from '../config/db.js';

const DetalleCliente = db.define('detalle_cliente', {
    id_detalle_cli: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    producto_dc_id: {
        type: Sequelize.INTEGER
    },
    fact_cli_id: {
        type: Sequelize.INTEGER
    },
    cantidad_dc_venta: {
        type: Sequelize.INTEGER
    },
    precio_dc_venta: {
        type: Sequelize.DOUBLE
    }
});

export default DetalleCliente;