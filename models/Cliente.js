import { Sequelize } from "sequelize";
import db from "../config/db.js";


const Cliente = db.define('clientes', {
    id_cliente: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nombre_cliente: {
        type: Sequelize.STRING
    },
    apellido_cliente: {
        type: Sequelize.STRING
    },
    cedula_cliente: {
        type: Sequelize.STRING
    },
    correo_cliente: {
        type: Sequelize.STRING
    },
    telefono_cliente: {
        type: Sequelize.STRING
    },
    estado_cli: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    }
});


export default Cliente;