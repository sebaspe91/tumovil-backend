import Sequelize from 'sequelize';
import db from '../config/db.js';

const Categoria = db.define('categorias', {
    id_categoria: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nombre_categoria: {
        type: Sequelize.STRING
    },
    codigo_categoria: {
        type: Sequelize.STRING,
        unique: true
    }
});

export default Categoria;