import { Op } from "sequelize";
import Usuario from "../models/Usuario.js";
import generarJWT from "../helpers/generarJWT.js";
import generarId from "../helpers/generarId.js";
import emailRegistro from "../helpers/emailRegistro.js";
import emailOlvidePassword from "../helpers/emailOlvidePassword.js";


// --- Paginacion y busqueda para las listas de usuarios ---
// listaUsuarios (activos) y listaUsuariosEliminados necesitan exactamente
// la misma logica de "traer una pagina" y "buscar por texto", asi que la
// sacamos a estas dos funciones para no repetirla dos veces.

// Lee ?pagina= y ?limite= de la URL (siempre llegan como texto) y los deja
// listos para usarlos en Sequelize (limit/offset). Si no vienen, o vienen
// con algo invalido (letras, negativos), usa valores por defecto en vez
// de reventar: parseInt('abc') da NaN, y NaN || 1 cae en el 1 por defecto.

// query = es el objeto que va despues del ? en en URL que se envia 
// Math.max(1, parseInt(query.pagina, 10) || 1);  
//      => 1, => es el rango minimi;
//      => parseInt(query.pagina, 10) => el dato que llega lo pasa a decimal
//      => || 1 => valor por defecto
// (pagina - 1) * limite;
//      => le resta un numero al numero de pagina para saltarse los datos neceseraios
const leerPaginacion = (query) => {
    const pagina = Math.max(1, parseInt(query.pagina, 10) || 1);
    const limite = Math.max(1, parseInt(query.limite, 10) || 5);
    const offset = (pagina - 1) * limite; // saltar los datos necesarios
    return { pagina, limite, offset };
};

// Arma el "where" de Sequelize: siempre filtra por estado_user (activos o
// eliminados segun quien llame), y si llego texto en ?busqueda= ademas
// exige que ese texto aparezca en el nombre, apellido, cedula o correo.
// Op.or hace un "OR" entre esos 4 campos (con que coincida uno alcanza),
// y Op.like con los % es un "contiene" (como el LIKE '%texto%' de SQL).
const armarWhereUsuarios = (estado_user, busqueda) => {
    const where = { estado_user };

    if (busqueda && busqueda.trim() !== '') {
        const texto = busqueda.trim();
        where[Op.or] = [
            { nombre_user: { [Op.like]: `%${texto.toUpperCase()}%` } },
            { apellido_user: { [Op.like]: `%${texto.toUpperCase()}%` } },
            { cedula_user: { [Op.like]: `%${texto}%` } },
            { correo_user: { [Op.like]: `%${texto.toUpperCase()}%` } }
        ];
    }

    return where;
};


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
            return res.status(409).json({msg: error.message});
        }

        // guardando los datos en la DB
        const usuario = await Usuario.create({
            nombre_user: nombre_user.toUpperCase(),
            apellido_user: apellido_user.toUpperCase(),
            cedula_user: cedula_user,
            password,
            correo_user: correo_user.toUpperCase(),
            telefono_user
        });

        // Enviar EMAIL
        // sin await a proposito (no queremos que el usuario espere a que
        // salga el correo para recibir su respuesta), pero con .catch()
        // para que un fallo de nodemailer no quede como una promesa
        // rechazada sin atrapar (eso puede tumbar el proceso de Node)
        emailRegistro({
            nombre_user,
            apellido_user,
            correo_user,
            token: usuario.token
        }).catch(error => console.error('Error al enviar el email de registro:', error));

        // el password y el token no se devuelven al frontend

        // .toJSON() => lo convierte a un objeto plano normal, con solo las columnas de la tabla como propiedades: { id_usuario: 1, nombre_user: "JUAN", correo_user: "...", password: "$2b$10$...", token: "abc123", ... }. A partir de ahí ya puedes tratarlo como un objeto común y corriente.

        // password: _password => saca la propiedad password del objeto, pero guárdala en una variable llamada _password en vez de una llamada password

        // ...usuarioGuardado => esto es el rest operator dentro de una desestructuración. Significa "todo lo que sobre, que no haya sido nombrado explícitamente arriba (password y token), méterlo en un objeto nuevo llamado usuarioGuardado". Entonces usuarioGuardado termina siendo una copia del usuario completo, pero sin password ni token
        const { password: _password, token: _token, ...usuarioGuardado } = usuario.toJSON();

        // respuesta json
        // usuarioGuardado es lo que UsersProvider.jsx espera para agregar
        // el usuario recien creado a la lista sin tener que recargar
        res.json({
            msg: 'Registrando Usuario...',
            usuarioGuardado
        });

    } catch (error) {
        console.log(error);
        const err = new Error('Error al registrar al usuario');
        return res.status(500).json({msg: err.message}); 
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
        const err = new Error('Error al confirmar usuario');
        return res.status(500).json({msg: err.message}); 
    }
}


// Autenticar usuario
const autenticar = async (req, res) => {
    const {correo_user, password} = req.body;

    try {
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
                apellido_user: usuarioExiste.apellido_user,
                correo_user: usuarioExiste.correo_user,
                tipo_user: usuarioExiste.tipo_user,
                token: generarJWT(usuarioExiste.id_usuario) // generamos el token
            }); // crea el wet token
        } else {
            const error = new Error("El Password es incorrecto");
            return res.status(403).json({msg: error.message});
        }
    } catch (error) {
        console.log(error);
        const err = new Error('Error al iniciar sesion');
        return res.status(500).json({msg: err.message});
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
        // igual que en registrarUsuario: sin await, pero con .catch() para
        // no dejar una promesa rechazada sin atrapar si nodemailer falla
        emailOlvidePassword({
            correo_user,
            nombre_user: usuarioExiste.nombre_user,
            apellido_user: usuarioExiste.apellido_user,
            token: usuarioExiste.token
        }).catch(error => console.error('Error al enviar el email de recuperacion:', error));

        // respuesta json
        res.json({
            msg: "Hemos enviado un email con las instrucciones"
        });

    } catch (error) {
        console.log(error);
        const err = new Error('Error en la operacion olvide password');
        return res.status(500).json({msg: err.message}); 
    }

} 

// comprobar token de recuperar password
const comprobarToken = async (req, res) => {
    const {token} = req.params;

    try {
        // buscar user que tenga el token
        const usuarioExiste = await Usuario.findOne({where: {token}});

        if (!usuarioExiste) {
            const error = new Error('Token No Valido');
            return res.status(404).json({msg: error.message});
        }

        res.json({
            msg: "Token Valido y el usuario existe"
        });
    } catch (error) {
        console.log(error);
        const err = new Error('Error al comprobar el token');
        return res.status(500).json({msg: err.message});
    }
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
        const err = new Error('Error al actualizar el password de usuarios');
        return res.status(500).json({msg: err.message}); 
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
        return res.status(404).json({msg: error.message});
    }

    // Validar cuando se cambie el Email no sea el mismo
    if (usuario.correo_user !== correo_user) {
        // miramos si el usuario existe
        const usuarioExiste = await Usuario.findOne({where: {correo_user}});

        // validar que el email no sea duplicado
        if (usuarioExiste) {
            const error = new Error("El Email ya esta Registrado");
            return res.status(409).json({msg: error.message});
        }
    }

    try {
        // igual que en actualizarUsuario: primero comprobamos que el campo
        // llego antes de llamar .toUpperCase() sobre el, para no reventar
        // con TypeError cuando el frontend no manda ese campo
        const usuarioActualizado = await usuario.update({
            nombre_user : nombre_user ? nombre_user.toUpperCase() : usuario.nombre_user,
            apellido_user : apellido_user ? apellido_user.toUpperCase() : usuario.apellido_user,
            cedula_user : cedula_user || usuario.cedula_user,
            correo_user : correo_user ? correo_user.toUpperCase() : usuario.correo_user,
            telefono_user : telefono_user || usuario.telefono_user
        });

        res.json(usuarioActualizado);

    } catch (error) {
        console.log(error);
        const err = new Error('Error al Actualizar el usuario');
        return res.status(500).json({msg: err.message}); 
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
        return res.status(404).json({msg: error.message});
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
        return res.status(404).json({msg: error.message});  
    }

}

// lista de usuarios
const listaUsuarios = async (req, res) => {

    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    // si todo esta bien
    try {
        const { pagina, limite, offset } = leerPaginacion(req.query);
        const where = armarWhereUsuarios(true, req.query.busqueda);

        // findAndCountAll hace dos consultas en una sola llamada: cuenta
        // cuantos registros cumplen el "where" (count, sin limit) y trae
        // solo la pagina pedida (rows, con limit/offset) -- asi el
        // frontend sabe cuantas paginas hay en total sin tener que pedir
        // todos los usuarios de una vez

        // .findAndCountAll => es para gainacion, da las filas que pido y el total de las filas que nos dio

        // count => numero total de usuarios que cumplen el where
        // rows => el array real con los usuarios de esta pagina especifica, solo lleva los 5 usuarios de la pagina 2 o 1 o la que se pida

        /**
         * EJEMPLO:
         * Imagina que tienes 12 usuarios activos en la tabla, y pides la página 2 con limite = 5 (o sea offset = 5)
         * count te dice "hay 12 en total", 
         * rows te da exactamente los usuarios 6 al 10 (los que corresponden a la página 2). Con esos dos datos ya puedes calcular todo lo que necesitas en la respuesta:
         */
        const { count, rows: usuarios } = await Usuario.findAndCountAll({
            where,
            // ya no se excluye estado_user: Usuario.jsx lo necesita para
            // decidir si muestra los botones de Editar/Eliminar o el de
            // Activar
            attributes: { exclude: ['password', 'token'] },
            limit: limite,
            offset,
            order: [['id_usuario', 'DESC']]
        });

        res.json({
            msg: "Lista de Usuarios",
            usuarios,
            paginacion: {
                total: count,
                totalPaginas: Math.max(1, Math.ceil(count / limite)), // a si el resultado fuera 2.2 = lo redondea a 3
                paginaActual: pagina,
                limite
            }
        });
    } catch (error) {
        console.log(error);
        const err = new Error('Error al obtener la lista de usuarios');
        return res.status(500).json({msg: err.message});
    }

}

// Obtener un paciente en especifico
const obtenerUsuario = async (req, res) => {
    try {
        const {id} = req.params;

        const usuarioExiste = await Usuario.findByPk(id, {
            attributes: { exclude: ['password', 'token'] }
        });

        if (!usuarioExiste) {
            const error = new Error('Usuario no registrado');
            return res.status(404).json({msg: error.message});
        }

        // validacion para el usuario que esta logiado
        // if (usuarioExiste.tipo_user !== 'ADMIN') {
        //     const error = new Error('No tiene permisos para esta accion');
        //     return res.status(404).json({msg: error.message});
        // }

        res.json(usuarioExiste);
    } catch (error) {
        const err = new Error('Error al obtener el usuario');
        return res.status(500).json({msg: err.message}); 
    }

}


// actualizar usuario
const actualizarUsuario = async (req, res) => {
    try {
        const {id} = req.params;
        
        const {nombre_user, apellido_user, cedula_user, correo_user, telefono_user, password, tipo_user, estado_user} = req.body;

        const usuarioActual = await Usuario.findByPk(id);
        
        // validar si es usuario admin
        if (req.usuario.tipo_user !== 'ADMIN') {
            const error = new Error('No tiene permisos para esta accion');
            return res.status(403).json({msg: error.message});
        }

        // usuariop no encontrado
        if (!usuarioActual) {
            const error = new Error("El usuario no existe");
            return res.status(404).json({msg: error.message});
        }

        // Validar cuando se cambie el Email no sea el mismo
        if (usuarioActual.correo_user !== correo_user) {
            // miramos si el usuario existe
            const usuarioExiste = await Usuario.findOne({where: {correo_user}});

            // validar que el email no sea duplicado
            if (usuarioExiste) {
                const error = new Error("El Email ya esta Registrado");
                return res.status(409).json({msg: error.message});
            }
        }
        // Actualizar usuario.
        // Ojo: nombre_user.toUpperCase() (sin comprobar antes que nombre_user
        // exista) revienta con TypeError si el campo no vino en el body --
        // el || nunca alcanza a rescatarlo porque el error ya se lanzo al
        // evaluar el .toUpperCase(). Por eso se comprueba primero con un
        // condicional y solo se transforma el valor si de verdad llego.
        const usuarioActualizado = await usuarioActual.update({
            nombre_user : nombre_user ? nombre_user.toUpperCase() : usuarioActual.nombre_user,
            apellido_user : apellido_user ? apellido_user.toUpperCase() : usuarioActual.apellido_user,
            cedula_user : cedula_user || usuarioActual.cedula_user,
            correo_user : correo_user ? correo_user.toUpperCase() : usuarioActual.correo_user,
            telefono_user : telefono_user || usuarioActual.telefono_user,
            // tipo_user hoy no llega desde FormularioUsers.jsx (no tiene ese
            // input todavia), asi que sin este chequeo tronaria siempre
            tipo_user : tipo_user ? tipo_user.toUpperCase() : usuarioActual.tipo_user,
            // estado_user es booleano: con || un false explicito quedaria
            // ignorado (false es falsy), por eso aca se usa ?? en vez de ||
            estado_user : estado_user ?? usuarioActual.estado_user,
            // el password solo se toca si en verdad llego uno nuevo desde el
            // formulario (recuerda que ahora se omite cuando no se quiere
            // cambiar, ver FormularioUsers.jsx)
            ...(password ? { password: password.trim() } : {})
        });

        res.json({
            msg: "Usuario Actualizado",
            usuarioActualizado
        });
    } catch (error) {
        console.log(error);
        const err = new Error('Erro al actualizar al usuario');
        return res.status(500).json({msg: err.message}); 
    }
}


// eliminar un usuario
const eliminarUsuario = async (req, res) => {
    
    try {
        const {tipo_user} = req.usuario;
        const {id} = req.params;
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            const error = new Error("El usuario no existe");
            return res.status(404).json({msg: error.message});
        }

        // validar si es usuario admin
        if (tipo_user !== 'ADMIN') {
            const error = new Error('No tiene permisos para esta accion');
            return res.status(403).json({msg: error.message});
        }

        // eliminar usuario
        await usuario.update({
            estado_user: false
        });

        res.json({
            msg: "El Usuario fue eliminado"
        });

    } catch (error) {
        const err = new Error('Error al eliminar el Usuario');
        return res.status(500).json({msg: err.message}); 
    }
}


// Lista usuarios eliminados
const listaUsuariosEliminados = async (req, res) => {

    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const { pagina, limite, offset } = leerPaginacion(req.query);
        const where = armarWhereUsuarios(false, req.query.busqueda);

        const { count, rows: usuarios } = await Usuario.findAndCountAll({
            where,
            attributes: { exclude: ['password', 'token'] },
            limit: limite,
            offset,
            order: [['id_usuario', 'DESC']]
        });

        // la llave se llama "usuarios" (plural) para que coincida con lo
        // que lee el frontend en UsersProvider.jsx (data.usuarios)
        res.json({
            usuarios,
            paginacion: {
                total: count,
                totalPaginas: Math.max(1, Math.ceil(count / limite)),
                paginaActual: pagina,
                limite
            }
        });
    } catch (error) {
        console.log(error);
        const err = new Error('Error al listar los usuarios eliminados');
        return res.status(500).json({msg: err.message});
    }
}


// activar
const activarUsurio = async (req, res) => {

    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const {id} = req.params;

        const usuario = await Usuario.findByPk(id);
        
        if (!usuario) {
            const error = new Error('El usuario no existe');
            return res.status(404).json({msg: error.message});
        }

        //  todo bien 
       await usuario.update({
            estado_user: true
        });

        res.json({
            msg: "El usuario se Activado correctamente"
        });
      
    } catch (error) {
        console.log(error);
        const err = new Error('Error al activar el usuario');
        return res.status(500).json({msg: err.message});
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
    actualizarPassword,
    listaUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    eliminarUsuario,
    listaUsuariosEliminados,
    activarUsurio
}