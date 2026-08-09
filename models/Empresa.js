import { Sequelize } from "sequelize";
import db from "../config/db.js";


const Empresa = db.define('empresa', {
    id_empresa : {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nombre_empresa: {
        type: Sequelize.STRING
    },
    nit_empresa: {
        type: Sequelize.STRING,
        unique: true
    },
    correo_empresa: {
        type: Sequelize.STRING
    },
    cel_empresa: {
        type: Sequelize.STRING
    },
    logo_empresa: {
        type: Sequelize.STRING
    },
    estado_empresa: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    }, 
}, {
    freezeTableName: true // usa el nombre tal cual, sin pluralizar
});

export default Empresa;