// importaciones
import 'dotenv/config'; // asegura que el .env ya esté cargado cuando se lea process.env
import { Sequelize } from "sequelize";

// opciones comunes: sirven igual para la base local y para la de la nube
const opciones = {
    dialect: 'mysql',
    define: {
        timestamps: false
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
};

// Si existe DATABASE_URL en el .env -> nube.
// Si no existe -> la base local de siempre.
const db = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, opciones)
    : new Sequelize('tumovil', 'root', '', {
        host: '127.0.0.1',
        port: 3306,
        ...opciones
    });

export default db;