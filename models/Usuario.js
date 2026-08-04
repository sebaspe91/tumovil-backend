import Siquelize from 'sequelize';
import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import generarId from '../helpers/generarId.js';

const Usuario = db.define('usuarios', {
    id_usuario: {
        type: Siquelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nombre_user: {
        type: Siquelize.STRING
    },
    apellido_user: {
        type: Siquelize.STRING
    },
    cedula_user: {
        type: Siquelize.STRING
    },
    password: {
        type: Siquelize.STRING
    },
    correo_user: {
        type: Siquelize.STRING
    },
    telefono_user: {
        type: Siquelize.STRING
    },
    tipo_user: {
        type: Siquelize.STRING,
        defaultValue: "VENDEDOR"
    },
    token: {
        type: Siquelize.STRING,
        defaultValue: generarId
    },
    confirmar: {
        type: Siquelize.BOOLEAN,
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