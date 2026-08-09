import Sequelize from 'sequelize';
import db from '../config/db.js';

const DetalleProveedor = db.define('detalle_proveedor', {
    id_detalle_prov: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    producto_dp_id: {
        type: Sequelize.INTEGER
    },
    fact_prov_id: {
        type: Sequelize.INTEGER
    },
    cantidad_dp_compra: {
        type: Sequelize.INTEGER
    },
    precio_dp_compra: {
        type: Sequelize.INTEGER
    }
});

export default DetalleProveedor;