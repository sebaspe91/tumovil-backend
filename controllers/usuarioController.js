import Usuario from "../models/Usuario.js";
import generarJWT from "../helpers/generarJWT.js";



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

        const usuario = await Usuario.create({
            nombre_user,
            apellido_user,
            cedula_user,
            password,
            correo_user,
            telefono_user
        });

        res.json({
            msg: 'Usuario creado correctamente',
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre_user: usuario.nombre_user,
                apellido_user: usuario.apellido_user,
                correo_user: usuario.correo_user
            }
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
            token: generarJWT(usuarioExiste.id_usuario) // generamos el token
        }); // crea el wet token
    } else {
        const error = new Error("El Password es incorrecto");
        return res.status(403).json({msg: error.message});
    }
}



// exportaciones
export {
    registrarUsuario,
    confirmarUsuario,
    autenticar
}