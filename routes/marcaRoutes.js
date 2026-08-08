import express from 'express';
import {
    registrarMarca,
    listaMarcas,
    obtenerMarca,
    actualizarMarca,
    eliminarMarca
} from '../controllers/marcaController.js';
import checkAuth from '../middleware/authMiddleware.js';

// ruta

const marcaRoutes = express.Router();

// Privadas
marcaRoutes.route('/')
    .post(checkAuth, registrarMarca)
    .get(checkAuth, listaMarcas)
// Fin --

marcaRoutes.route('/:id')
    .get(checkAuth, obtenerMarca)
    .put(checkAuth, actualizarMarca)    
// fin ---

marcaRoutes.put('/eliminar/:id', checkAuth, eliminarMarca);

// exportaciones
export default marcaRoutes;