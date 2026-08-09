import express from 'express';
import {
    registrarMarca,
    listaMarcas,
    obtenerMarca,
    actualizarMarca,
    eliminarMarca,
    listaMarcasEliminados,
    activarMarca
} from '../controllers/marcaController.js';
import checkAuth from '../middleware/authMiddleware.js';

// ruta

const marcaRoutes = express.Router();

// Privadas
marcaRoutes.route('/')
    .post(checkAuth, registrarMarca)
    .get(checkAuth, listaMarcas)
// Fin --

marcaRoutes.get('/eliminados', checkAuth, listaMarcasEliminados);
marcaRoutes.put('/eliminar/:id', checkAuth, eliminarMarca);

marcaRoutes.route('/:id')
    .get(checkAuth, obtenerMarca)
    .put(checkAuth, actualizarMarca)  
    .patch(checkAuth, activarMarca)  
// fin ---


// exportaciones
export default marcaRoutes;