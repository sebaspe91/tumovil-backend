import express from 'express';
import { 
    registrarFacturaProveedor,
    listaFacturaProveedor,
    obtenerFacturaProveedro,
    obtenerTotalFactura,
    actualizarFacturaProveedor,
    elimnarFacturaProveedor,
    listaFacturaProveedorEliminadas,
    reactivarFacturaProveedor,
    generarPDFFacturaProveedor
} from '../controllers/facturaProveedorController.js';
import checkAuth from '../middleware/authMiddleware.js';


const facturaProveedorRoutes = express.Router();


// rutas privadas
facturaProveedorRoutes.route('/')
    .post(checkAuth, registrarFacturaProveedor)
    .get(checkAuth, listaFacturaProveedor);
// fin


facturaProveedorRoutes.get('/eliminados', checkAuth, listaFacturaProveedorEliminadas);
facturaProveedorRoutes.get('/total/:id', checkAuth, obtenerTotalFactura);
facturaProveedorRoutes.get('/factura-pdf/:id', checkAuth, generarPDFFacturaProveedor);
facturaProveedorRoutes.put('/eliminar/:id', checkAuth, elimnarFacturaProveedor);


facturaProveedorRoutes.route('/:id')
    .get(checkAuth, obtenerFacturaProveedro)
    .put(checkAuth, actualizarFacturaProveedor)
    .patch(checkAuth, reactivarFacturaProveedor);
// fin
    




export default facturaProveedorRoutes;