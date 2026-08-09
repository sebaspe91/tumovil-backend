import express from "express";
import {
    registrarCliente,
    listaCliente,
    obtenerCliente,
    actualizarCliente,
    eliminarCliente,
    listaClientesEliminados,
    activarCliente
} from "../controllers/clienteController.js";
import checkAuth from '../middleware/authMiddleware.js';


// rutas
const clienteRoutes = express.Router();

// privadas
clienteRoutes.route('/')
    .post(checkAuth, registrarCliente)
    .get(checkAuth, listaCliente);
// fin

clienteRoutes.get('/eliminados', checkAuth, listaClientesEliminados);
clienteRoutes.put('/eliminar/:id', checkAuth, eliminarCliente);

clienteRoutes.route('/:id')
    .get(checkAuth, obtenerCliente)
    .put(checkAuth, actualizarCliente)
    .patch(checkAuth, activarCliente);
// fin


export default clienteRoutes;