import Usuario from './models/Usuario.js';

const usuario = await Usuario.findOne({
    where: { nombre_user: 'JUAN22' },
    attributes: { exclude: ['password', 'token'] }
});

console.log(JSON.stringify(usuario, null, 2));
process.exit(0);
