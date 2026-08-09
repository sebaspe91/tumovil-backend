import express from "express";
import {
    registrarCategoria,
    listaCategoria,
    obtenerCategoria,
    actualizarCategoria,
    eliminarCategoria,
    listaCategoriasEliminadas,
    activarCategoria
} from "../controllers/categoriaController.js";
import checkAuth from '../middleware/authMiddleware.js';

// rutas
const categoriaRoutes = express.Router();

// privadas
categoriaRoutes.route('/')
    .post(checkAuth, registrarCategoria)
    .get(checkAuth, listaCategoria);
// fin

categoriaRoutes.get('/eliminados', checkAuth, listaCategoriasEliminadas);
categoriaRoutes.put('/eliminar/:id', checkAuth, eliminarCategoria);

categoriaRoutes.route('/:id')
    .get(checkAuth, obtenerCategoria)
    .put(checkAuth, actualizarCategoria)
    .patch(checkAuth, activarCategoria);
// fin


export default categoriaRoutes;