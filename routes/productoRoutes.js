import express from "express";
import { 
    registrarProducto,
    listaProductos,
    obtenerProducto,
    actualizarProducto,
    eliminarProducto,
    listaProductosEliminados
} from "../controllers/productoController.js";
import checkAuth from "../middleware/authMiddleware.js";


// ruta
const productoRoutes = express.Router();

// rutas privadas
productoRoutes.route('/')
    .post(checkAuth, registrarProducto)
    .get(checkAuth, listaProductos)
// fin

productoRoutes.get('/eliminados', checkAuth, listaProductosEliminados);
productoRoutes.put('/eliminar/:id', checkAuth, eliminarProducto);

productoRoutes.route('/:id')
    .get(checkAuth, obtenerProducto)
    .put(checkAuth, actualizarProducto)
// fin



// exportaciones
export default productoRoutes;