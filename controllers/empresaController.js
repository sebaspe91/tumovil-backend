import Empresa from "../models/Empresa.js";

// La empresa es una fila UNICA en la base de datos (se crea directo ahi,
// nunca desde la app). Por eso este controlador ya no tiene "crear",
// "eliminar" ni "listar varias" -- solo existen dos operaciones:
// consultarla y actualizarla.

// obtener la Empresa (siempre la unica fila marcada como activa)
const obtenerEmpresa = async (req, res) => {

    // validar si es admin
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        // No se busca por nombre ni por un id fijo: se trae la fila que
        // tenga estado_empresa en true. Asi, aunque cambien el
        // nombre/nit de la empresa desde el formulario, el backend
        // siempre encuentra la misma fila sin depender de esos datos.
        const empresa = await Empresa.findOne({
            where: {estado_empresa: true}
        });

        if (!empresa) {
            const error = new Error('No hay ninguna empresa registrada');
            return res.status(404).json({msg: error.message});
        }

        res.json({empresa});
    } catch (error) {
        console.log(error);
        const err = new Error('Error al encontrar la empresa');
        return res.status(500).json({msg: err.message});
    }
}

// actualizar la Empresa (siempre la misma fila activa, nunca se crea ni se elimina)
const actualizarEmpresa = async (req, res) => {

    // validar si es admin
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const {nombre_empresa, nit_empresa, correo_empresa, cel_empresa} = req.body;

        const empresa = await Empresa.findOne({
            where: {estado_empresa: true}
        });

        if (!empresa) {
            const error = new Error('No hay ninguna empresa registrada');
            return res.status(404).json({msg: error.message});
        }

        // Por si algun dia queda mas de una fila en la tabla por error,
        // validamos que el nit nuevo no choque con otra empresa distinta
        // a la que estamos actualizando.
        if (nit_empresa && empresa.nit_empresa !== nit_empresa) {
            const nitDuplicado = await Empresa.findOne({where: {nit_empresa}});

            if (nitDuplicado) {
                const error = new Error('Ese Nit ya lo tiene registrado otra empresa');
                return res.status(409).json({msg: error.message});
            }
        }

        const empresaActualizada = await empresa.update({
            nombre_empresa: nombre_empresa ? nombre_empresa.toUpperCase().trim() : empresa.nombre_empresa,
            nit_empresa: nit_empresa ? nit_empresa.trim() : empresa.nit_empresa,
            correo_empresa: correo_empresa ? correo_empresa.toUpperCase().trim() : empresa.correo_empresa,
            cel_empresa: cel_empresa ? cel_empresa.trim() : empresa.cel_empresa
        });

        res.json({
            msg: 'La empresa se actualizó correctamente',
            empresa: empresaActualizada
        });

    } catch (error) {
        console.log(error);
        const err = new Error('Error al actualizar la empresa');
        return res.status(500).json({msg: err.message});
    }
}

export {
    obtenerEmpresa,
    actualizarEmpresa
}
