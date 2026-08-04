import Usuario from "../models/Usuario.js";



const registrarUsuario = async (req, res) => {
    const {nombre_user, apellido_user, cedula_user, password, correo_user, telefono_user} = req.body;

    // validar 

    // campos vacios
    if ([nombre_user, apellido_user, cedula_user, password, correo_user].includes('')) {
        const error = new Error('Hay campos vacidos');
        return res.status(400).json({msg: error.message}); 
    }



    // si todo esta bien
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



// exportaciones
export {
    registrarUsuario
}