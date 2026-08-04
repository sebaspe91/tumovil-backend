// Importaciones
import express from 'express';
import {
    registrarUsuario
} from "../controllers/usuarioController.js"



// Instanciamos la funcion
const usuarioRoutes = express.Router();


// --- Rutas Publicas ----- //

usuarioRoutes.post('/', registrarUsuario);


// ---- Rutas Privadas ---- //



// exportamos
export default usuarioRoutes;