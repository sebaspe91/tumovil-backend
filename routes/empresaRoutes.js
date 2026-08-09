import express from "express";
import {
    registrarEmpresa,
    listaEmpresas,
    obtenerEmpresa,
    actualizarEmpresa,
    eliminarEmpresa,
    listaEmpresasEliminados,
    activarEmpresa
} from "../controllers/empresaController.js";
import checkAuth from "../middleware/authMiddleware.js";


// instanciar
const empresaRoutes = express.Router();

// privados
empresaRoutes.route('/')
    .post(checkAuth, registrarEmpresa)
    .get(checkAuth, listaEmpresas);
// fin

empresaRoutes.get('/eliminados', checkAuth, listaEmpresasEliminados);
empresaRoutes.put('/eliminar/:id', checkAuth, eliminarEmpresa);

// empresa
empresaRoutes.route('/:id')
    .get(checkAuth, obtenerEmpresa)
    .put(checkAuth, actualizarEmpresa)
    .patch(checkAuth, activarEmpresa)
// fin


// exportar
export default empresaRoutes;