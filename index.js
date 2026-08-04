// Importaciones
import express from "express";
import dotenv from 'dotenv';
import usuarioRoutes from "./routes/usuarioRoutes.js";
import db from "./config/db.js";

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



// Puerto web o local 
const PORT =  process.env.PORT || 4000;

// Inicializamos el servidor
app.listen(PORT, () => {
    console.log(`Servidor funcionando en el puerto ${PORT}`);
});