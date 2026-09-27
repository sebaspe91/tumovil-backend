import express from "express";
import { 
    registrarProducto,
    listaProductos,
    obtenerProducto,
    actualizarProducto,
    eliminarProducto,
    listaProductosEliminados,
    activarProducto,
    listaCategorias
} from "../controllers/productoController.js";
import checkAuth from "../middleware/authMiddleware.js";
import uploadProducto from "../middleware/uploadProducto.js";


// ruta
const productoRoutes = express.Router();

// rutas privadas
productoRoutes.route('/')
    .post(checkAuth, uploadProducto.single('foto_producto'), registrarProducto)
    .get(checkAuth, listaProductos)
// fin

productoRoutes.get('/eliminados', checkAuth, listaProductosEliminados);
productoRoutes.put('/eliminar/:id', checkAuth, eliminarProducto);
productoRoutes.get('/categorias', checkAuth, listaCategorias);

productoRoutes.route('/:id')
    .get(checkAuth, obtenerProducto)
    .put(checkAuth, uploadProducto.single('foto_producto'), actualizarProducto)
    .patch(checkAuth, activarProducto);
// fin



// exportaciones
export default productoRoutes;