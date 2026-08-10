import express from "express";
import checkAuth from "../middleware/authMiddleware.js";
import {
    registrarFacturaCliente,
    obtenerTotalFactura,
    obtenerFacturaCliente,
    listaFacturaCliente,
    actualizarFactura
} from "../controllers/facturaClienteController.js";


const facturaClienteRoutes = express.Router();


// privados
facturaClienteRoutes.route('/')
    .post(checkAuth, registrarFacturaCliente)
    .get(checkAuth, listaFacturaCliente)
// fin


facturaClienteRoutes.get('/total/:id', checkAuth, obtenerTotalFactura);


facturaClienteRoutes.route('/:id')
    .get(checkAuth, obtenerFacturaCliente)
    .put(checkAuth, actualizarFactura);
// fin



export default facturaClienteRoutes;