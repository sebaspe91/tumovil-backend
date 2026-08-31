import { Op } from "sequelize";
import Cliente from "../models/Cliente.js";
import { leerPaginacion } from "../helpers/paginar.js";



const armarWhereUsuarios = (estado_cli, busqueda) => {
    const where = { estado_cli };

    if (busqueda && busqueda.trim() !== '') {
        const texto = busqueda.trim();
        where[Op.or] = [
            { nombre_cliente: { [Op.like]: `%${texto.toUpperCase()}%` } },
            { apellido_cliente: { [Op.like]: `%${texto.toUpperCase()}%` } },
            { cedula_cliente: { [Op.like]: `%${texto}%` } },
            { correo_cliente: { [Op.like]: `%${texto.toUpperCase()}%` } },
            { telefono_cliente: { [Op.like]: `%${texto.toUpperCase()}%` } }
        ];
    }

    return where;
};


// registrar cliente
const registrarCliente = async (req, res) => {
    const {nombre_cliente, apellido_cliente,cedula_cliente, correo_cliente, telefono_cliente} = req.body;

    // validar campos obligatorios
    if ([nombre_cliente, apellido_cliente,cedula_cliente, correo_cliente].includes('')) {
        const error = new Error('Hay campos obligatorios vacios');
        return res.status(400).json({msg: error.message});  
    }

    try {
        // validar si el cliente ya existe
        const clienteExiste = await Cliente.findOne({where:{cedula_cliente}});

        if (clienteExiste) {
            const error = new Error('El cliente ya esta registrado');
            return res.status(404).json({msg: error.message}); 
        }

        // Registrar cliente
        const cliente = await Cliente.create({
            nombre_cliente: nombre_cliente.toUpperCase().trim(),
            apellido_cliente: apellido_cliente.toUpperCase().trim(),
            cedula_cliente: cedula_cliente.trim(),
            correo_cliente: correo_cliente.toUpperCase().trim(),
            telefono_cliente: telefono_cliente.toUpperCase().trim() || 'S/N',
        });

        // respuesta json
        res.json({
            msg: 'El cliente se registro correctamente',
            cliente
        });    
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo registrar el cliente');
        return res.status(500).json({msg: err.message});
    }
}


// listar Cliente
const listaCliente = async (req, res) => {
    try {
        // listar 
        const { pagina, limite, offset } = leerPaginacion(req.query);
        const where = armarWhereUsuarios(true, req.query.busqueda);

        const { count, rows: clientes } = await Cliente.findAndCountAll({
            where,
            limit: limite,
            offset,
            order: [['id_cliente', 'DESC']]
        });

        res.json({
            msg: 'Lista de Clientes',
            clientes,
            paginacion: {
                total: count,
                totalPaginas: Math.max(1, Math.ceil(count / limite)),
                paginaActual: pagina,
                limite
            }
        });
    } catch (error) {
        console.log(error);
        const err = new Error('Lista de clientes no encontrada');
        return res.status(500).json({msg: err.message});
    }
}

// obtener cliente
const obtenerCliente = async (req, res) => {
    try {
        const {id} = req.params;

        const cliente = await Cliente.findByPk(id);

        if (!cliente) {
            const error = new Error('El cliente no existe');
            return res.status(404).json({msg: error.message});
        }

        res.json({cliente});
    } catch (error) {
        console.log(error);
        const err = new Error('Error al encontrar el cliente');
        return res.status(500).json({msg: err.message});
    }
}

// Actualizar marca
const actualizarCliente = async (req, res) => {
    try {
        const {id} = req.params;
        const {nombre_cliente, apellido_cliente,cedula_cliente, correo_cliente, telefono_cliente, estado_cli} = req.body;

        const cliente = await Cliente.findByPk(id);
        
        if (!cliente) {
            const error = new Error('El cliente no existe');
            return res.status(404).json({msg: error.message});
        }

        // Valorar que el codigo ingresado no se repita
        if (cliente.cedula_cliente !== cedula_cliente) {
            const clienteExiste = await Cliente.findOne({where: {cedula_cliente}});

            // validar que el email no sea duplicado
            if (clienteExiste) {
                const error = new Error("La cedula que modificaste ya la tiene otro cliente");
                return res.status(409).json({msg: error.message});
            }
        }

        //  todo bien
        // primero comprobamos que el campo llego antes de llamar
        // .toUpperCase()/.trim() sobre el (igual que en actualizarUsuario)
        const actualizarCliente = await cliente.update({
            nombre_cliente: nombre_cliente ? nombre_cliente.toUpperCase().trim() : cliente.nombre_cliente,
            apellido_cliente: apellido_cliente ? apellido_cliente.toUpperCase().trim() : cliente.apellido_cliente,
            cedula_cliente: cedula_cliente ? cedula_cliente.trim() : cliente.cedula_cliente,
            correo_cliente: correo_cliente ? correo_cliente.toUpperCase().trim() : cliente.correo_cliente,
            telefono_cliente: telefono_cliente ? telefono_cliente.toUpperCase().trim() : cliente.telefono_cliente,
        });

        res.json({
            msg: "Cliente Actualizada correctamente",
            actualizarCliente
        });
      
    } catch (error) {
        console.log(error);
        const err = new Error('Error al actualizar el cliente');
        return res.status(500).json({msg: err.message});
    }
}

// eliminar cliente
const eliminarCliente = async (req, res) => {
    try {
        const {id} = req.params;
        const cliente = await Cliente.findByPk(id);

        if (!cliente) {
            const error = new Error("El cliente no existe");
            return res.status(404).json({msg: error.message});
        }

        // validar si es cliente admin
        if (req.usuario.tipo_user !== 'ADMIN') {
            const error = new Error('No tiene permisos para esta accion');
            return res.status(403).json({msg: error.message});
        }

        // eliminar cliente
        await cliente.update({
            estado_cli: false
        });

        res.json({
            msg: "El cliente fue eliminado"
        });
    } catch (error) {
        console.log(error);
        const err = new Error('Error al eliminar el cliente');
        return res.status(500).json({msg: err.message}); 
    }
}

// Lista clientes eliminados
const listaClientesEliminados = async (req, res) => {
    // validar que sea admin (igual que listaCategoriasEliminadas)
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const { pagina, limite, offset } = leerPaginacion(req.query);
        const where = armarWhereUsuarios(false, req.query.busqueda);

        const { count, rows: clientes } = await Cliente.findAndCountAll({
            where,
            limit: limite,
            offset,
            order: [['id_cliente', 'DESC']]
        });

        res.json({
            msg: 'Lista de Clientes',
            clientes,
            paginacion: {
                total: count,
                totalPaginas: Math.max(1, Math.ceil(count / limite)),
                paginaActual: pagina,
                limite
            }
        });
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo listar los clientes eliminados');
        return res.status(500).json({msg: err.message});
    }
}


// activar
const activarCliente = async (req, res) => {

    // validar que sea admin (igual que activarCategoria)
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const {id} = req.params;

        const cliente = await Cliente.findByPk(id);

        if (!cliente) {
            const error = new Error('El cliente no existe');
            return res.status(404).json({msg: error.message});
        }

        //  todo bien 
       await cliente.update({
            estado_cli: true
        });

        res.json({
            msg: "El cliente se Activado correctamente"
        });
      
    } catch (error) {
        console.log(error);
        const err = new Error('Error al activar el cliente');
        return res.status(500).json({msg: err.message});
    }
}



// exportar
export {
    registrarCliente,
    listaCliente,
    obtenerCliente,
    actualizarCliente,
    eliminarCliente,
    listaClientesEliminados,
    activarCliente
}