import Sequelize from 'sequelize';
import db from '../config/db.js';

const FacturaProveedor = db.define('factura_proveedor', {
    id_fact_prov: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    proveedor_id: {
        type: Sequelize.INTEGER
    },
    usuario_fp_id: {
        type: Sequelize.INTEGER
    },
    empresa_fp_id: {
        type: Sequelize.INTEGER
    },
    fecha_fp: {
        type: Sequelize.DATE
    }
});

export default FacturaProveedor;