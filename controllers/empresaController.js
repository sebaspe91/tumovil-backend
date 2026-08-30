import Empresa from "../models/Empresa.js";

// registrar Empresa
const registrarEmpresa = async (req, res) => {
    const {nombre_empresa, nit_empresa, correo_empresa, cel_empresa} = req.body;

    // validar campos obligatorios
    if ([nombre_empresa, nit_empresa, correo_empresa, cel_empresa].includes('')) {
        const error = new Error('Hay campos obligatorios vacios');
        return res.status(400).json({msg: error.message});  
    }

    // validar si es admin
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        // validar si la empresa ya existe
        const EmpresaExiste = await Empresa.findOne({where:{nit_empresa}});

        if (EmpresaExiste) {
            const error = new Error('La empresa ya esta registrado');
            return res.status(409).json({msg: error.message}); 
        }

        // Registrar Empresa
        const empresa = await Empresa.create({
            nombre_empresa: nombre_empresa.toUpperCase().trim(),
            nit_empresa: nit_empresa.trim(),
            correo_empresa: correo_empresa.toUpperCase().trim(),
            cel_empresa: cel_empresa.trim()
        });

        // respuesta json
        res.json({
            msg: 'La empresa se registro correctamente',
            empresa
        });    
    } catch (error) {
        console.log(error);
        const err = new Error('Error al registrar la empresa');
        return res.status(500).json({msg: err.message});
    }
}

// listar Empresas
const listaEmpresas = async (req, res) => {
    // validar si es admin
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }
    try {
        // listar 
        const empresas = await Empresa.findAll({
            where: {estado_empresa: true}
        });

        res.json({
            empresas
        });
    } catch (error) {
        console.log(error);
        const err = new Error('Lista de empresas no encontrada');
        return res.status(500).json({msg: err.message});
    }
}

// obtener Empresa
const obtenerEmpresa = async (req, res) => {

    // validar si es admin
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const {id} = req.params;

        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            const error = new Error('La empresa no existe');
            return res.status(404).json({msg: error.message});
        }

        res.json({empresa});
    } catch (error) {
        console.log(error);
        const err = new Error('Error al encontrar las empresa');
        return res.status(500).json({msg: err.message});
    }
}

// Actualizar empresa
const actualizarEmpresa = async (req, res) => {

    // validar si es admin
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const {id} = req.params;
        const {nombre_empresa, nit_empresa, correo_empresa, cel_empresa, estado_empresa} = req.body;

        const empresa = await Empresa.findByPk(id);
        
        if (!empresa) {
            const error = new Error('La empresa no existe');
            return res.status(404).json({msg: error.message});
        }

        // Valorar que el codigo ingresado no se repita
        // Ojo: era "empresa.findOne" (la instancia que ya trajimos con
        // findByPk), pero las instancias de Sequelize no tienen findOne --
        // ese metodo es del modelo "Empresa" (mayuscula). Con la instancia
        // esto reventaba con TypeError cada vez que se cambiaba el NIT.
        if (empresa.nit_empresa !== nit_empresa) {
            const empresaExiste = await Empresa.findOne({where: {nit_empresa}});

            // validar que el nit no sea duplicado
            if (empresaExiste) {
                const error = new Error("El nit que modificaste ya lo tiene otra empresa");
                return res.status(409).json({msg: error.message});
            }
        }

        //  todo bien 
        const actualizarEmpresa = await empresa.update({
            nombre_empresa: nombre_empresa ? nombre_empresa.toUpperCase().trim() : empresa.nombre_empresa,
            nit_empresa: nit_empresa ? nit_empresa.trim() : empresa.nit_empresa,
            correo_empresa: correo_empresa ? correo_empresa.toUpperCase().trim() : empresa.correo_empresa,
            cel_empresa: cel_empresa ? cel_empresa.trim() : empresa.cel_empresa,
            estado_empresa: estado_empresa !== undefined ? Boolean(Number(estado_empresa)) : empresa.estado_empresa
        });

        res.json({
            msg: "La empresa se Actualizo correctamente",
            actualizarEmpresa
        });
      
    } catch (error) {
        console.log(error);
        const err = new Error('Error al actualizar la empresa');
        return res.status(500).json({msg: err.message});
    }
}

// eliminar empresa
const eliminarEmpresa = async (req, res) => {

    // validar si es admin
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const {id} = req.params;
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            const error = new Error("La empresa no existe");
            return res.status(404).json({msg: error.message});
        }

        // eliminar empresa
        await empresa.update({
            estado_empresa: false
        });

        res.json({
            msg: "La empresa fue eliminada"
        });
    } catch (error) {
        console.log(error);
        const err = new Error('Error al eliminar la empresa');
        return res.status(500).json({msg: err.message}); 
    }
}

// Lista empresas eliminados
const listaEmpresasEliminados = async (req, res) => {
    // validar que se admin
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const empresa = await Empresa.findAll({
            where: {estado_empresa: 0}
        });

        res.json({
            empresa
        });
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo listar las empresas eliminadas');
        return res.status(500).json({msg: err.message});
    }
}


// activar
const activarEmpresa = async (req, res) => {

    // validar si es admin
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const {id} = req.params;

        const empresa = await Empresa.findByPk(id);
        
        if (!empresa) {
            const error = new Error('La empresa no existe');
            return res.status(404).json({msg: error.message});
        }

        //  todo bien 
       await empresa.update({
            estado_empresa: true
        });

        res.json({
            msg: "La empresa se Activado correctamente"
        });
      
    } catch (error) {
        console.log(error);
        const err = new Error('Error al activar la empresa');
        return res.status(500).json({msg: err.message});
    }
}




// exprotar
export {
    registrarEmpresa,
    listaEmpresas,
    obtenerEmpresa,
    actualizarEmpresa,
    eliminarEmpresa,
    listaEmpresasEliminados,
    activarEmpresa
}