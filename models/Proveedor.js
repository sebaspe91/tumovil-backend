import Sequelize from 'sequelize';
import db from '../config/db.js';

const Proveedor = db.define('proveedores', {
    id_proveedor: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nombre_prov: {
        type: Sequelize.STRING
    },
    nit_prov: {
        type: Sequelize.STRING,
        unique: true
    },
    correo_prov: {
        type: Sequelize.STRING
    },
    telefono_prov: {
        type: Sequelize.STRING
    },
    cuenta_prov: {
        type: Sequelize.STRING
    },
    estado_prov: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    }
});

export default Proveedor;