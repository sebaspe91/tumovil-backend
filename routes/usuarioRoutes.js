// Importaciones
import express from 'express';
import {
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
} from "../controllers/usuarioController.js";
import checkAuth from '../middleware/authMiddleware.js';



// Instanciamos la funcion
const usuarioRoutes = express.Router();


// --- Rutas Publicas ----- //

usuarioRoutes.post('/', registrarUsuario);
usuarioRoutes.get('/confirmar/:token', confirmarUsuario); // confirmar usuario con token
usuarioRoutes.post('/login',autenticar); // gneras token jwt para iniciar sesion
usuarioRoutes.post('/olvide-password', olvidePassword); // solicita recuperar password con email
usuarioRoutes.get('/olvide-password/:token', comprobarToken); // envia el token de un email para validacion
usuarioRoutes.post('/olvide-password/:token', nuevoPassword); // crear el nuevo password


// ---- Rutas Privadas ---- //
usuarioRoutes.get('/perfil', checkAuth, perfilUsuario); // incias sesion
usuarioRoutes.put('/perfil/:id', checkAuth, actualizarPerfil); // incias sesion - actualiza perfil
usuarioRoutes.put('/cambiar-password', checkAuth, actualizarPassword); // incias sesion - actualiza password
usuarioRoutes.get('/lista-usuarios', checkAuth, listaUsuarios); // incias sesion - lista de usuarios
usuarioRoutes.get('/obtener-usuario/:id', checkAuth, obtenerUsuario); // incias sesion - obtener un usuario
usuarioRoutes.put('/actualizar-usuario/:id', checkAuth, actualizarUsuario); // incias sesion - actualizar un usuario
usuarioRoutes.put('/eliminar-usuario/:id', checkAuth, eliminarUsuario); // incias sesion - elimina un usuario
usuarioRoutes.get('/eliminados', checkAuth, listaUsuariosEliminados); // lista user eliminados
usuarioRoutes.patch('/activar/:id', checkAuth, activarUsurio); // activar user


// exportamos
export default usuarioRoutes;