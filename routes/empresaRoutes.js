import express from "express";
import {
    obtenerEmpresa,
    actualizarEmpresa
} from "../controllers/empresaController.js";
import checkAuth from "../middleware/authMiddleware.js";
import uploadEmpresa from "../middleware/uploadEmpresa.js";


// instanciar
const empresaRoutes = express.Router();

// La empresa es una unica fila fija en la base de datos: aca solo se
// puede consultar (GET) y actualizar (PUT). No existe crear, eliminar
// ni activar/desactivar -- esas rutas se quitaron a proposito para que
// nadie pueda usarlas ni llamando la API directo (Postman, curl, etc).
//
// "uploadEmpresa.single('logo')" va ANTES del controlador: es lo que
// procesa el formulario multipart/form-data que manda el frontend,
// deja los campos de texto en req.body (igual que siempre) y, si
// llego un archivo, lo deja disponible en req.file.
empresaRoutes.route('/')
    .get(checkAuth, obtenerEmpresa)
    .put(checkAuth, uploadEmpresa.single('logo'), actualizarEmpresa);

// exportar
export default empresaRoutes;
