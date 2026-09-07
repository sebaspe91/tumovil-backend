import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// En modulos ES ("type": "module") no existe "__dirname" como en
// CommonJS -- hay que armarlo a mano a partir de la URL de este archivo.
const __filename = fileURLToPath(import.meta.url); // toma el nombre de la URL
const __dirname = path.dirname(__filename); // agrega los partrones de direccion

// Carpeta donde quedan guardados los logos, DENTRO del backend (no del
// frontend). Queda en: backend/public/uploads/empresa
const carpetaLogos = path.join(__dirname, "..", "public", "uploads", "empresa");

// si la carpeta no existe (primera vez que corre el proyecto en una
// maquina nueva) la creamos, para que no truene al subir el primer logo
if (!fs.existsSync(carpetaLogos)) {
    fs.mkdirSync(carpetaLogos, { recursive: true });
}

// donde y con que nombre multer guarda el archivo que llega
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, carpetaLogos);
    },
    filename: (req, file, cb) => {
        // nombre unico (fecha en milisegundos) para que un logo nuevo
        // nunca sobreescriba a otro por casualidad
        const extension = path.extname(file.originalname).toLowerCase();
        const nombreUnico = `logo-${Date.now()}${extension}`;
        cb(null, nombreUnico);
    }
});

// solo se aceptan imagenes (jpg, png, webp)
const filtroArchivo = (req, file, cb) => {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!tiposPermitidos.includes(file.mimetype)) {
        return cb(new Error('Solo se permiten imagenes JPG, PNG o WEBP'));
    }

    cb(null, true);
}

// limite de 2MB por archivo
const uploadEmpresa = multer({
    storage,
    fileFilter: filtroArchivo,
    limits: { fileSize: 2 * 1024 * 1024 }
});

export default uploadEmpresa;
export { carpetaLogos };
