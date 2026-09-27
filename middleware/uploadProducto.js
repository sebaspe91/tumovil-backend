import multer from "multer"; // lee archivos
import path from "path"; // maneja URL
import fs from "fs"; // crud de archivos o carpetas
import { fileURLToPath } from "url";

// ubicacion actual URL
const __filename = fileURLToPath(import.meta.url);

// ubicacion de la carpeta actual URL
const __dirname = path.dirname(__filename);

// Carpeta donde va quedar los archivos
const carpetaProductos = path.join(__dirname, "..","public", "uploads", "productos");

// si la carpeta aun noexiste la crea
if (!fs.existsSync(carpetaProductos)) {
    fs.mkdirSync(carpetaProductos, {recursive: true}); // crea la carpeta
}

// donde y con que nombre se guarda el archivo
const storage = multer.diskStorage({
    // ubicacion del archivo
    destination: (req, file, cb) => {
        cb(null, carpetaProductos);
    },
    // nombre del archivo
    filename: (req, file, cb) => {
        // extencion .JPG
        const extension = path.extname(file.originalname).toLowerCase();

        // nombre del archivo
        const nombreUnico = `prod-${Date.now()}${extension}`;

        // ejecutar la funcion
        cb(null, nombreUnico);
    }
});

// tipo de imagenes que se aceptan
const filtroArchivo = (req, file, cb) => {
    // tipo de archivos
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    // Valida el tipo de archivos que llega del frontend
    if (!tiposPermitidos.includes(file.mimetype)) {
        return cb(new Error('Solo se permiten imagenes JPG, PNG, o WEBP'));
    }

    // ejecuta la funcion
    cb(null, true);
}

// limite de 2MB por archivo
const uploadProducto = multer({
    storage, // donde se guarda el archivo
    fileFilter: filtroArchivo, // tipo de archivos permitidos o error
    limits: {fileSize: 2 * 1024 * 1024} // tamaño maximo en bytes
});

// exportaciones
export default uploadProducto; // para rutas
export { carpetaProductos }; // para controladores