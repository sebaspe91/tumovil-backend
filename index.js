// Importaciones
import express from "express";
import multer from "multer"; // para reconocer los errores que el propio Multer genera (archivo muy pesado, campo inesperado, etc.)
import dotenv from 'dotenv';
import cors from 'cors';
import path from "path"; // manejo de URL
import { fileURLToPath } from "url"; // tranforma la URL generada por una comprensible para el navegador segun el sistema operativo
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
app.disable('etag'); // DESABILIDTAR EL CACHE

// Habilitar JSON para express
app.use(express.json());

// "__dirname" no existe en modulos ES ("type": "module"), se arma a
// mano igual que en middleware/uploadEmpresa.js
const __filename = fileURLToPath(import.meta.url); // URL del archivo actual "index.js"
const __dirname = path.dirname(__filename); // URL de la carpeta donde esta

// Sirve la carpeta backend/public como archivos estaticos -- esto es lo
// que hace que una imagen guardada en public/uploads/empresa/logo.jpg
// se pueda pedir desde el navegador como http://localhost:4000/uploads/empresa/logo.jpg
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'))); // Se crea la carpeta completa para que pueda crear otras subCarpetas

// express.static( .. ) => crea un middleware especial cuyo único trabajo es "si la URL pedida coincide con un archivo que existe adentro de esta carpeta, mándalo tal cual, y ya".

// app.use('/uploads', ...) ==> el primer argumento ('/uploads') es el "prefijo" en la URL. Esto crea la traducción entre lo que pide el navegador y dónde buscarlo en el disco => Busca en disco:backend/public/uploads/empresa/logo-123.jpg

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


// Manejo de errores de subida de archivos (Multer): sin esto, un
// archivo muy pesado o con el nombre de campo equivocado tira un
// stack trace crudo en la consola y el frontend recibe una respuesta
// que no puede interpretar. Este middleware "atrapa" esos errores y le
// contesta al frontend un JSON con un mensaje claro, igual que hacen
// tus controladores normales.
//
// Un middleware con estos 4 parametros (err, req, res, next) es un
// "error handler" para Express: nunca se llama manualmente, Express lo
// invoca solo cuando algo antes llama a next(err) o lanza un error --
// por eso tiene que ir despues de todas las rutas (arriba), para que
// pueda atrapar los errores que salen de cualquiera de ellas.
app.use((err, req, res, next) => {

    // errores propios de Multer: archivo muy pesado, o el nombre del
    // campo del archivo no es el que la ruta espera
    if (err instanceof multer.MulterError) {
        let msg = 'No se pudo subir el archivo';

        if (err.code === 'LIMIT_FILE_SIZE') {
            msg = 'La imagen no puede pesar mas de 2MB';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            msg = 'El campo del archivo no es el esperado';
        }

        return res.status(400).json({ msg });
    }

    // errores del fileFilter de Multer (por ejemplo "Solo se permiten
    // imagenes JPG, PNG o WEBP", definidos en uploadEmpresa.js /
    // uploadProducto.js): ya traen un mensaje pensado para el usuario
    if (err && err.message) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }

    // cualquier otro error no esperado
    console.log(err);
    return res.status(500).json({ msg: 'Ocurrio un error inesperado en el servidor' });
});


// Puerto web o local 
const PORT =  process.env.PORT || 4000;

// Inicializamos el servidor
app.listen(PORT, () => {
    console.log(`Servidor funcionando en el puerto ${PORT}`);
});