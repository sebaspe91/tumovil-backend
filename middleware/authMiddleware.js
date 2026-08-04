// Archivo creado para las paginas privadas

import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";

const checkAuth = async (req, res, next) => {
    let token;

    // validar si el token aun esta activo
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // codigo para comprobar el token
        try {
            token = req.headers.authorization.split(' ')[1]; // toma solo el token e ignora el Bearer que viene con el token

            // desiframos el token con la palabra secreta
            const decoded = jwt.verify(token, process.env.JWT_SECRET); 

            // consultar el usuario con el id del token y excluir campos sensibles
            req.usuario = await Usuario.findByPk(decoded.id, {
                attributes: { exclude: ['password', 'token', 'confirmar'] }
            });

            return next();

        } catch (error) {
            const e = new Error('Token No Válido');
            return res.status(403).json({msg: e.message});
        }
    }

    // Nunca hubo token
    if (!token) {
        const error = new Error('Token No Válido o inexistente');
        return res.status(403).json({msg: error.message});
    }

    next();
}

export default checkAuth;