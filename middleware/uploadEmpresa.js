import multer from "multer"; // deja leer archivos subidos por formularios
import path from "path"; // arma y manipula rutas URL entre carpetas y archivos
import fs from "fs"; // deja Leer, Crear, Borrar archivos y carpetas del disco duro
import { fileURLToPath } from "url";

// En modulos ES ("type": "module") no existe "__dirname" como en
// CommonJS -- hay que armarlo a mano a partir de la URL de este archivo.
const __filename = fileURLToPath(import.meta.url); // la URL completa del archivo actual "uploadEmpresa.js"
const __dirname = path.dirname(__filename); // La URL de la carpeta que contiene el archivo

// Carpeta donde quedan guardados los logos, DENTRO del backend (no del
// frontend). Queda en: backend/public/uploads/empresa
const carpetaLogos = path.join(__dirname, "..", "public", "uploads", "empresa");

// si la carpeta no existe (primera vez que corre el proyecto en una
// maquina nueva) la creamos, para que no truene al subir el primer logo
if (!fs.existsSync(carpetaLogos)) {
    // fs => para crear ..... .mkdirSync => crea toda la ruta que tiene carpetaLogo
    fs.mkdirSync(carpetaLogos, { recursive: true });
}

// donde y con que nombre multer guarda el archivo que llega
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, carpetaLogos); // Esta funcion es para decir en que carpeta se guarda las imagenes 
        // null => es para si hay algun error muestre null
        // carpetaLogos => es la direccion donde se guarda
    },
    filename: (req, file, cb) => {
        // nombre unico (fecha en milisegundos) para que un logo nuevo
        // nunca sobreescriba a otro por casualidad
        const extension = path.extname(file.originalname).toLowerCase(); // nombre del archivo original ene le que aparece en nuestro pc antes de subirlo
        // path.extname(...) => le saca solo la extencion .JPG y lo pasa en minusculas
        const nombreUnico = `logo-${Date.now()}${extension}`; // milesegundo
        cb(null, nombreUnico); // ejecuta la funcion filename()
    }
});

// solo se aceptan imagenes (jpg, png, webp)
const filtroArchivo = (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    // si hay un error envia el mensae que no es permitido
    // file.mimetype => es el "tipo real" del archivo, que reporta el navegador
    if (!tiposPermitidos.includes(file.mimetype)) {
        return cb(new Error('Solo se permiten imagenes JPG, PNG o WEBP'));
    }

    cb(null, true);
}

// limite de 2MB por archivo
const uploadEmpresa = multer({
    storage, // donde se guarda "/carpeta/"y como se llamara el archivo
    fileFilter: filtroArchivo, // tipo de archivos permitidos o el error
    limits: { fileSize: 2 * 1024 * 1024 } // tamaño maximo permitido en bytes
});

export default uploadEmpresa; // se usa en rutas para procesar la subida
export { carpetaLogos }; // se usa en el controlador para poder armar la ruta del logo anterior y borrarlo
