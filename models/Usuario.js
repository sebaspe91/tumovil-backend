import Sequelize from 'sequelize';
import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import generarId from '../helpers/generarId.js';

const Usuario = db.define('usuarios', {
    id_usuario: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nombre_user: {
        type: Sequelize.STRING
    },
    apellido_user: {
        type: Sequelize.STRING
    },
    cedula_user: {
        type: Sequelize.STRING
    },
    password: {
        type: Sequelize.STRING
    },
    correo_user: {
        type: Sequelize.STRING
    },
    telefono_user: {
        type: Sequelize.STRING
    },
    tipo_user: {
        type: Sequelize.STRING,
        defaultValue: "VENDEDOR"
    },
    estado_user: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
    },
    token: {
        type: Sequelize.STRING,
        defaultValue: generarId
    },
    confirmar: {
        type: Sequelize.BOOLEAN,
        defaultValue:false
    },
}, {
    // Forma para hashear los password y el actualizado
    hooks: {
        beforeCreate: async function (registro) {
            const salt = await bcrypt.genSalt(10);
            registro.password = await bcrypt.hash(registro.password, salt);
        },
        beforeUpdate: async function (registro) {
            if (registro.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                registro.password = await bcrypt.hash(registro.password, salt);
            }
        }
    }
});

// Método para comparar el password al hacer login
Usuario.prototype.verificarPassword = function (passwordFormulario) {
    return bcrypt.compareSync(passwordFormulario, this.password);
};

export default Usuario;