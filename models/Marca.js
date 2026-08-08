import Sequelize from 'sequelize';
import db from '../config/db.js';

const Marca = db.define('marcas', {
    id_marca: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nombre_marca: {
        type: Sequelize.STRING
    },
    codigo_marca: {
        type: Sequelize.STRING,
        unique: true
    },
    estado_marca: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    },
});



export default Marca;