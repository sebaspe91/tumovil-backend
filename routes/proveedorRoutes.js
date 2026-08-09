import express from "express";
import {
    registrarProveedor,
    listaProveedor,
    obtenerProveedor,
    actualizarProveedor,
    eliminarProveedor,
    listaProveedoresEliminados,
    activarProveedor
} from "../controllers/ProveedorController.js";
import checkAuth from '../middleware/authMiddleware.js';


// rutas
const proveedorRoutes = express.Router();

// privadas
proveedorRoutes.route('/')
    .post(checkAuth, registrarProveedor)
    .get(checkAuth, listaProveedor);
// fin

proveedorRoutes.get('/eliminados', checkAuth, listaProveedoresEliminados);
proveedorRoutes.put('/eliminar/:id', checkAuth, eliminarProveedor);

proveedorRoutes.route('/:id')
    .get(checkAuth, obtenerProveedor)
    .put(checkAuth, actualizarProveedor)
    .patch(checkAuth, activarProveedor);
// fin


export default proveedorRoutes;