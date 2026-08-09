import Sequelize from 'sequelize';
import db from '../config/db.js';

const FacturaCliente = db.define('factura_cliente', {
    id_fact_cli: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    cliente_id: {
        type: Sequelize.INTEGER
    },
    usuario_fc_id: {
        type: Sequelize.INTEGER
    },
    empresa_fc_id: {
        type: Sequelize.INTEGER
    },
    fecha_fc: {
        type: Sequelize.DATE
    }
});

export default FacturaCliente;