import express from "express";
import {
    obtenerEmpresa,
    actualizarEmpresa
} from "../controllers/empresaController.js";
import checkAuth from "../middleware/authMiddleware.js";


// instanciar
const empresaRoutes = express.Router();

// La empresa es una unica fila fija en la base de datos: aca solo se
// puede consultar (GET) y actualizar (PUT). No existe crear, eliminar
// ni activar/desactivar -- esas rutas se quitaron a proposito para que
// nadie pueda usarlas ni llamando la API directo (Postman, curl, etc).
empresaRoutes.route('/')
    .get(checkAuth, obtenerEmpresa)
    .put(checkAuth, actualizarEmpresa);

// exportar
export default empresaRoutes;
