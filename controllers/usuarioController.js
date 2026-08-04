import Usuario from "../models/Usuario.js";
import generarJWT from "../helpers/generarJWT.js";
import generarId from "../helpers/generarId.js";
import { where } from "sequelize";
import e from "express";



const registrarUsuario = async (req, res) => {
    const {nombre_user, apellido_user, cedula_user, password, correo_user, telefono_user} = req.body;

    // validar 

    // campos vacios
    if ([nombre_user, apellido_user, cedula_user, password, correo_user].includes('')) {
        const error = new Error('Hay campos vacidos');
        return res.status(400).json({msg: error.message}); 
    }

    try {

            // correo 
        const usuarioExiste = await Usuario.findOne({where: {correo_user}});

        if (usuarioExiste) {
            const error = new Error('El correo ya esta registrado');
            return res.status(400).json({msg: error.message});
        }

        // guardando los datos en la DB
        const usuario = await Usuario.create({
            nombre_user,
            apellido_user,
            cedula_user,
            password,
            correo_user,
            telefono_user
        });

        // Enviar EMAIL

        // respuesta json
        res.json({
            msg: 'Registrando Usuario...'
        });            
      
    } catch (error) {
        console.log(error);
    }
}

// Confirmar usuario por token
const confirmarUsuario = async (req, res) => {
    const {token} = req.params;
    
    // buscar si el token esta registrado
    const usuarioConfirmado = await Usuario.findOne({where: {token}});
    
    if (!usuarioConfirmado) {
        const error = new Error('Token No Valido');
        return res.status(404).json({msg: error.message});
    }

    try {
        // modificamos los valores
        await usuarioConfirmado.update({
            token: null,
            confirmar: true
        });

        res.json({
            msg: "Usuario Confirmado Correctamente"
        });

    } catch (error) {
        console.log(error);
    }
}


// Autenticar usuario
const autenticar = async (req, res) => {
    const {correo_user, password} = req.body;
    
    const usuarioExiste = await Usuario.findOne({where: {correo_user}});

    // valida si el usuario existe en la DB
    if (!usuarioExiste) {
        const error = new Error('El usuario no existe');
        return res.status(404).json({msg: error.message});
    }

    // comprobar si el usuario esta confirmado
    if (!usuarioExiste.confirmar) {
        const error = new Error('Tu Cuenta no ha sido confirmada');
        return res.status(403).json({msg: error.message});
    }

    // comprobar si el passwoard es el mismo que el de la base de datos
    if (await usuarioExiste.verificarPassword(password)) {
        // INICIA SESION
        
        // enviamos la respuesta con la informacion necesaria
        res.json({
            id_usuario: usuarioExiste.id_usuario,
            nombre_user: usuarioExiste.nombre_user,
            correo_user: usuarioExiste.correo_user,
            tipo_user: usuarioExiste.tipo_user,
            token: generarJWT(usuarioExiste.id_usuario) // generamos el token
        }); // crea el wet token
    } else {
        const error = new Error("El Password es incorrecto");
        return res.status(403).json({msg: error.message});
    }
}

// Perfil inicio de sesion activa
const perfilUsuario = (req, res) => {
    // Agrega los datos de Auth en perfil
    const {usuario} = req;

    res.json({
        perfil:usuario
    });
}


// Para recuperar password

const olvidePassword = async (req, res) => {
    const {correo_user} = req.body;

    const usuarioExiste = await Usuario.findOne({where:{correo_user}});

    if (!usuarioExiste) {
        const error = new Error('El usuario no existe');
        return res.status(404).json({msg: error.message});
    }

    // comprobar si el usuario esta confirmado
    if (!usuarioExiste.confirmar) {
        const error = new Error('Tu Cuenta no ha sido confirmada');
        return res.status(403).json({msg: error.message});
    }

    try {
        // generar el token
        await usuarioExiste.update({
            token: generarId()
        });

        // seccion de enviar EMAIL

        // respuesta json
        res.json({
            msg: "Hemos enviado un email con las instrucciones"
        });

    } catch (error) {
        console.log(error);
    }

} 

// comprobar token de recuperar password
const comprobarToken = async (req, res) => {
    const {token} = req.params;
    
    // buscar user que tenga el token
    const usuarioExiste = await Usuario.findOne({where: {token}});

    if (!usuarioExiste) {
        const error = new Error('Token No Valido');
        return res.status(404).json({msg: error.message});
    }

    res.json({
        msg: "Token Valido y el usuario existe"
    });

}

// Nuevo password
const nuevoPassword = async (req, res) => {
    const {token} = req.params;
    const {password} = req.body;

    // Buscar el usuario que tenga el token
    const usuario = await Usuario.findOne({where: {token}});

    if (!usuario) {
        const error = new Error('Token no válido');
        return res.status(404).json({msg: error.message});  
    }

    // validar password
    if (password.trim() === '') {
        const error = new Error('Contraseña no válida');
        return res.status(400).json({msg: error.message});     
    }

    try {
        await usuario.update({
            token: null,
            password: password.trim()
        });

        res.json({
            msg: "Nuevo Password Creado Correctamente"
        });
    } catch (error) {
        console.log(error);
    }

}

// privados

// Actualizar perfil
const actualizarPerfil = async (req, res) => {
    const {id} = req.params;
    const {nombre_user, apellido_user, cedula_user, correo_user, telefono_user} = req.body;

    // existe el usuario del id
    const usuario = await Usuario.findByPk(id);

    // usuariop no encontrado
    if (!usuario) {
        const error = new Error("El usuario no existe");
        return res.status(403).json({msg: error.message});
    }

    // Validar cuando se cambie el Email no sea el mismo
    if (usuario.correo_user !== correo_user) {
        // miramos si el usuario existe
        const usuarioExiste = await Usuario.findOne({where: {correo_user}});

        // validar que el email no sea duplicado
        if (usuarioExiste) {
            const error = new Error("El Email ya esta Registrado");
            return res.status(400).json({msg: error.message});
        }
    }

    try {
        const usuarioActualizado = await usuario.update({
            nombre_user : nombre_user || usuario.nombre_user,
            apellido_user : apellido_user || usuario.apellido_user,
            cedula_user : cedula_user || usuario.cedula_user,
            correo_user : correo_user || usuario.correo_user,
            telefono_user : telefono_user || usuario.telefono_user
        });

        res.json(usuarioActualizado);

    } catch (error) {
        console.log(error);
    }

}

// Actualizar Password
const actualizarPassword = async (req, res) => {
    const {id_usuario} = req.usuario; // variable guardada cuando se autentico en authMiddleware.js
    const {actualPassword, password} = req.body; // estos datos depende de react

    // comprobar que el usuario existe
    // existe el usuario del id
    const usuario = await Usuario.findByPk(id_usuario);

    // usuariop no encontrado
    if (!usuario) {
        const error = new Error("El usuario no existe");
        return res.status(403).json({msg: error.message});
    }

    // validar password
    if (await usuario.verificarPassword(actualPassword)) {
        // agregamos el nuevo password
        await usuario.update({
            password: password.trim()
        });

        res.json({
            msg: 'Password almacenado correctamente',
            error: false
        });
    } else {
        const error = new Error("El passwoard actual es invalido");
        return res.status(403).json({msg: error.message});  
    }

}



// exportaciones
export {
    registrarUsuario,
    confirmarUsuario,
    autenticar,
    perfilUsuario,
    olvidePassword,
    comprobarToken,
    nuevoPassword,
    actualizarPerfil,
    actualizarPassword
}