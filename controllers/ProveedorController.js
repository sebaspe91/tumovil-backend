import {Op} from "sequelize";
import Proveedor from "../models/Proveedor.js";
import { leerPaginacion } from "../helpers/paginar.js";

const armarWhereProveedor = (estado_prov, busqueda) => {
    const where = {estado_prov}

    if (busqueda && busqueda.trim() !== '') {
        const texto = busqueda.trim();
        where[Op.or] = [
            {nombre_prov: {[Op.like]: `%${texto.toUpperCase()}%`}},
            {nit_prov: {[Op.like]: `%${texto.toUpperCase()}%`}},
            {correo_prov: {[Op.like]: `%${texto.toUpperCase()}%`}},
            {telefono_prov: {[Op.like]: `%${texto.toUpperCase()}%`}},
            {cuenta_prov: {[Op.like]: `%${texto.toUpperCase()}%`}},
        ];
    }

    return where;
}

// registrar cliente
const registrarProveedor = async (req, res) => {
    const {nombre_prov, nit_prov, correo_prov, telefono_prov, cuenta_prov} = req.body;

    // validar campos obligatorios
    if ([nombre_prov, nit_prov, correo_prov, telefono_prov].includes('')) {
        const error = new Error('Hay campos obligatorios vacios');
        return res.status(400).json({msg: error.message});  
    }

    try {
        // validar si el cliente ya existe
        const proveedorExiste = await Proveedor.findOne({where:{nit_prov}});

        if (proveedorExiste) {
            const error = new Error('El proveedor ya esta registrado');
            return res.status(404).json({msg: error.message}); 
        }

        // Registrar proveedor
        const proveedor = await Proveedor.create({
            nombre_prov: nombre_prov.toUpperCase().trim(),
            nit_prov: nit_prov.trim(),
            correo_prov: correo_prov.toUpperCase().trim(),
            telefono_prov: telefono_prov.trim(),
            cuenta_prov: cuenta_prov.trim()
        });

        // respuesta json
        res.json({
            msg: 'El proveedor se registro correctamente',
            proveedor
        });    
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo registrar el proveedor');
        return res.status(500).json({msg: err.message});
    }
}


// listar proveedor
const listaProveedor = async (req, res) => {
    console.log('Desde lista proveedor')
    try {
        // listar 
        const {pagina, limite, offset} = leerPaginacion(req.query);
        const where = armarWhereProveedor(true, req.query.busqueda);

        const {count, rows: proveedores} = await Proveedor.findAndCountAll({
            where,
            limit: limite,
            offset,
            order: [['id_proveedor', 'DESC']]
        });

        res.json({
            msg: 'Lista De Proveedores',
            proveedores,
            paginacion: {
                total: count,
                totalPaginas: Math.max(1, Math.ceil(count / limite)),
                paginaActual: pagina,
                limite
            }
        });
    } catch (error) {
        console.log(error);
        const err = new Error('Error al listar los proveeores');
        return res.status(500).json({msg: err.message});
    }
}

// obtener Proveedor
const obtenerProveedor = async (req, res) => {
    try {
        const {id} = req.params;

        const proveedor = await Proveedor.findByPk(id);

        if (!proveedor) {
            const error = new Error('El proveedor no existe');
            return res.status(404).json({msg: error.message});
        }

        res.json({proveedor});
    } catch (error) {
        console.log(error);
        const err = new Error('Error al encontrar el proveedor');
        return res.status(500).json({msg: err.message});
    }
}

// Actualizar Proveedor
const actualizarProveedor = async (req, res) => {
    try {
        const {id} = req.params;
        const {nombre_prov, nit_prov, correo_prov, telefono_prov, cuenta_prov, estado_prov} = req.body;

        const proveedor = await Proveedor.findByPk(id);
        
        if (!proveedor) {
            const error = new Error('El proveedor no existe');
            return res.status(404).json({msg: error.message});
        }

        // Valorar que el codigo ingresado no se repita
        if (proveedor.nit_prov !== nit_prov) {
            const proveedorExiste = await Proveedor.findOne({where: {nit_prov}});

            // validar que el email no sea duplicado
            if (proveedorExiste) {
                const error = new Error("El nit del proveedor ya esta registrado");
                return res.status(409).json({msg: error.message});
            }
        }

        //  todo bien
        // primero comprobamos que el campo llego antes de llamar
        // .toUpperCase()/.trim() sobre el (igual que en actualizarUsuario)
        const actualizarProveedor = await proveedor.update({
            nombre_prov: nombre_prov ? nombre_prov.toUpperCase().trim() : proveedor.nombre_prov,
            nit_prov: nit_prov ? nit_prov.trim() : proveedor.nit_prov,
            correo_prov: correo_prov ? correo_prov.toUpperCase().trim() : proveedor.correo_prov,
            telefono_prov: telefono_prov ? telefono_prov.trim() : proveedor.telefono_prov,
            cuenta_prov: cuenta_prov ? cuenta_prov.trim() : proveedor.cuenta_prov,
            estado_prov: estado_prov !== undefined ? Boolean(Number(estado_prov)) : proveedor.estado_prov
        });

        res.json({
            msg: "Proveedor Actualizada correctamente",
            actualizarProveedor
        });
      
    } catch (error) {
        console.log(error);
        const err = new Error('Error al actualizar el proveedor');
        return res.status(500).json({msg: err.message});
    }
}

// eliminar proveedor
const eliminarProveedor = async (req, res) => {
    try {
        const {id} = req.params;
        const proveedor = await Proveedor.findByPk(id);

        if (!proveedor) {
            const error = new Error("El proveedor no existe");
            return res.status(404).json({msg: error.message});
        }

        // validar si es proveedor admin
        if (req.usuario.tipo_user !== 'ADMIN') {
            const error = new Error('No tiene permisos para esta accion');
            return res.status(403).json({msg: error.message});
        }

        // eliminar proveedor
        await proveedor.update({
            estado_prov: false
        });

        res.json({
            msg: "El proveedor fue eliminado"
        });
    } catch (error) {
        console.log(error);
        const err = new Error('Error al eliminar el proveedor');
        return res.status(500).json({msg: err.message}); 
    }
}

// Lista proveedores eliminados
const listaProveedoresEliminados = async (req, res) => {
    // validar que sea admin (igual que listaCategoriasEliminadas)
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        // preparar paginacion y el buscador
        const {pagina, limite, offset} = leerPaginacion(req.query);
        const where = armarWhereProveedor(false, req.query.busqueda);
        
        const {count, rows: proveedores} = await Proveedor.findAndCountAll({
            where,
            limit: limite,
            offset,
            order: [['id_proveedor', 'DESC']]
        });

        res.json({
            msg: 'Lista de Proveedores',
            proveedores,
            paginacion: {
                total: count,
                totalPaginas: Math.max(1, Math.ceil(count / limite)),
                paginaActual: pagina,
                limite
            }
        });
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo listar los proveedores eliminados');
        return res.status(500).json({msg: err.message});
    }
}


// activar
const activarProveedor = async (req, res) => {

    // validar que sea admin (igual que activarCategoria)
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const {id} = req.params;

        const proveedor = await Proveedor.findByPk(id);

        if (!proveedor) {
            const error = new Error('El proveedor no existe');
            return res.status(404).json({msg: error.message});
        }

        //  todo bien 
       await proveedor.update({
            estado_prov: true
        });

        res.json({
            msg: "El proveedor se Activado correctamente"
        });
      
    } catch (error) {
        console.log(error);
        const err = new Error('Error al activar el proveedor');
        return res.status(500).json({msg: err.message});
    }
}



// exportar
export {
    registrarProveedor,
    listaProveedor,
    obtenerProveedor,
    actualizarProveedor,
    eliminarProveedor,
    listaProveedoresEliminados,
    activarProveedor
}