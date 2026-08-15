import express from 'express';
import { 
    registrarFacturaProveedor,
    listaFacturaProveedor,
    obtenerFacturaProveedro,
    obtenerTotalFactura,
    actualizarFacturaProveedor
} from '../controllers/facturaProveedorController.js';
import checkAuth from '../middleware/authMiddleware.js';


const facturaProveedorRoutes = express.Router();


// rutas privadas
facturaProveedorRoutes.route('/')
    .post(checkAuth, registrarFacturaProveedor)
    .get(checkAuth, listaFacturaProveedor);
// fin

facturaProveedorRoutes.get('/total/:id', checkAuth, obtenerTotalFactura);


facturaProveedorRoutes.route('/:id')
    .get(checkAuth, obtenerFacturaProveedro)
    .put(checkAuth, actualizarFacturaProveedor)
// fin
    







export default facturaProveedorRoutes;