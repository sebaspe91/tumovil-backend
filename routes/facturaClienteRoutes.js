import express from "express";
import checkAuth from "../middleware/authMiddleware.js";
import {
    registrarFacturaCliente,
    obtenerTotalFactura,
    obtenerFacturaCliente,
    listaFacturaCliente,
    actualizarFacturaCliente,
    eliminarFacturaCliente,
    listaFacturaClienteEliminadas,
    reactivarFacturaCliente
} from "../controllers/facturaClienteController.js";


const facturaClienteRoutes = express.Router();


// privados
facturaClienteRoutes.route('/')
    .post(checkAuth, registrarFacturaCliente)
    .get(checkAuth, listaFacturaCliente)
// fin


facturaClienteRoutes.get('/eliminados', checkAuth, listaFacturaClienteEliminadas);
facturaClienteRoutes.get('/total/:id', checkAuth, obtenerTotalFactura);
facturaClienteRoutes.put('/eliminar/:id', checkAuth, eliminarFacturaCliente);


facturaClienteRoutes.route('/:id')
    .get(checkAuth, obtenerFacturaCliente)
    .put(checkAuth, actualizarFacturaCliente)
    .patch(checkAuth, reactivarFacturaCliente);
// fin



export default facturaClienteRoutes;