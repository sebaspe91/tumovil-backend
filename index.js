// Importaciones
import express from "express";
import dotenv from 'dotenv';
import cors from 'cors';
import usuarioRoutes from "./routes/usuarioRoutes.js";
import marcaRoutes from "./routes/marcaRoutes.js";
import productoRoutes from "./routes/productoRoutes.js";
import clienteRoutes from "./routes/clienteRoutes.js";
import empresaRoutes from "./routes/empresaRoutes.js";
import categoriaRoutes from "./routes/categoriaRoutes.js";
import proveedorRoutes from "./routes/proveedorRoutes.js";
import facturaClienteRoutes from "./routes/facturaClienteRoutes.js";
import facturaProveedorRoutes from "./routes/facturaProveedorRoutes.js";
import db from "./config/db.js";
import './associations/index.js'; // Se hace para que se ejecuten las relaciones de Sequelize y usar los includes

// inicializamos
const app = express();

// Desactivamos el ETag: por defecto Express calcula un "hash" del contenido
// de cada respuesta y si el navegador vuelve a pedir la misma URL, contesta
// "304 Not Modified" (sin body) si ese hash no cambio. El problema es que
// esto se combina con el cache HTTP del navegador y en una API donde los
// datos cambian todo el tiempo (crear/eliminar/activar) puede terminar
// mostrando datos viejos hasta que se hace un refresh fuerte. Como esta API
// siempre debe reflejar el estado actual de la base de datos, no queremos
// que nada quede cacheado.
app.disable('etag');

// Habilitar JSON para express
app.use(express.json());

// Le decimos al navegador explicitamente que NO guarde en cache ninguna
// respuesta de la API (esto refuerza lo de arriba: sin esto, el navegador
// podria decidir cachear igual por su cuenta en ciertos casos).
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// para utilizar .env
dotenv.config();

// conexion de la DB
db.authenticate()
    .then(() => console.log('Base de datos Conectada'))
    .catch(error => console.error(error));
// 

// perimios a URLS cors
const dominiosPermitidos = [process.env.FRONTEND_URL];

const corsOptions = {
    origin: function(origin, callback) {
        if (dominiosPermitidos.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    }
}

app.use(cors(corsOptions));
// ----- Fin cors -------------


// redireccionar a una app en especifico
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/marcas', marcaRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/factura-cliente', facturaClienteRoutes);
app.use('/api/factura-proveedor', facturaProveedorRoutes);



// Puerto web o local 
const PORT =  process.env.PORT || 4000;

// Inicializamos el servidor
app.listen(PORT, () => {
    console.log(`Servidor funcionando en el puerto ${PORT}`);
});