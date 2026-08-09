import Proveedor from "../models/Proveedor.js";

// registrar cliente
const registrarProveedor = async (req, res) => {
    const {nombre_prov, nit_prov, correo_prov, telefono_prov} = req.body;

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
            telefono_prov: telefono_prov.trim()
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
    try {
        // listar 
        const proveedores = await Proveedor.findAll({
            where: {estado_prov: true}
        });

        res.json({
            proveedores
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
        const {nombre_prov, nit_prov, correo_prov, telefono_prov, estado_prov} = req.body;

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
        const actualizarProveedor = await proveedor.update({
            nombre_prov: nombre_prov.toUpperCase().trim() || proveedor.nombre_prov.toUpperCase().trim(),
            nit_prov: nit_prov.trim() || proveedor.nit_prov.trim(),
            correo_prov: correo_prov.toUpperCase().trim() || proveedor.correo_prov.toUpperCase().trim(),
            telefono_prov: telefono_prov.trim() || proveedor.telefono_prov.trim(),
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
    try {
        const proveedores = await Proveedor.findAll({
            where: {estado_prov: 0}
        });

        res.json({
            proveedores
        });
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo listar los proveedores eliminados');
        return res.status(500).json({msg: err.message});
    }
}


// activar
const activarProveedor = async (req, res) => {

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