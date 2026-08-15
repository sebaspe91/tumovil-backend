// Importaciones
import express from "express";
import dotenv from 'dotenv';
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

// Habilitar JSON para express
app.use(express.json());

// para utilizar .env
dotenv.config();

// conexion de la DB
db.authenticate()
    .then(() => console.log('Base de datos Conectada'))
    .catch(error => console.error(error));
// 


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