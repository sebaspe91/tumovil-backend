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
    actualizarPassword
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


// exportamos
export default usuarioRoutes;