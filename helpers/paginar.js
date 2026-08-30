

// --- Paginacion y busqueda para las listas de usuarios ---
// listaUsuarios (activos) y listaUsuariosEliminados necesitan exactamente
// la misma logica de "traer una pagina" y "buscar por texto", asi que la
// sacamos a estas dos funciones para no repetirla dos veces.

// Lee ?pagina= y ?limite= de la URL (siempre llegan como texto) y los deja
// listos para usarlos en Sequelize (limit/offset). Si no vienen, o vienen
// con algo invalido (letras, negativos), usa valores por defecto en vez
// de reventar: parseInt('abc') da NaN, y NaN || 1 cae en el 1 por defecto.

// query = es el objeto que va despues del ? en en URL que se envia 
// Math.max(1, parseInt(query.pagina, 10) || 1);  
//      => 1, => es el rango minimi;
//      => parseInt(query.pagina, 10) => el dato que llega lo pasa a decimal
//      => || 1 => valor por defecto
// (pagina - 1) * limite;
//      => le resta un numero al numero de pagina para saltarse los datos neceseraios

const leerPaginacion = (query) => {
    const pagina = Math.max(1, parseInt(query.pagina, 10) || 1);
    const limite = Math.max(1, parseInt(query.limite, 10) || 5);
    const offset = (pagina - 1) * limite; // saltar los datos necesarios
    return { pagina, limite, offset };
};

export {
    leerPaginacion
}