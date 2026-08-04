// Importaciones
import express from 'express';
import {
    registrarUsuario,
    confirmarUsuario,
    autenticar
} from "../controllers/usuarioController.js";
import checkAuth from '../middleware/authMiddleware.js';



// Instanciamos la funcion
const usuarioRoutes = express.Router();


// --- Rutas Publicas ----- //

usuarioRoutes.post('/', registrarUsuario);
usuarioRoutes.get('/confirmar/:token', confirmarUsuario); // confirmar usuario con token
usuarioRoutes.post('/login',autenticar);


// ---- Rutas Privadas ---- //



// exportamos
export default usuarioRoutes;