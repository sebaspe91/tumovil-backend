import Categoria from "../models/Categoria.js";

const registrarCategoria = async (req, res) => {
    const {nombre_categoria, codigo_categoria} = req.body;

    if ([nombre_categoria, codigo_categoria].includes('')) {
        const error = new Error('Hay campos obligatorios vacios');
        return res.status(400).json({msg: error.message}); 
    }

    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        // validar si la categoria ya existe
        const categoriaExiste = await Categoria.findOne({where:{codigo_categoria}});

        if (categoriaExiste) {
            const error = new Error('Existe el mismo codigo en categoria');
            return res.status(409).json({msg: error.message}); 
        }

        // Registrar categoria
        const categoria = await Categoria.create({
            nombre_categoria: nombre_categoria.toUpperCase().trim(),
            codigo_categoria: codigo_categoria.toUpperCase().trim()
        });

        // respuesta json
        res.json({
            msg: 'La categoria se registro correctamente',
            categoria
        }); 
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo registrar la categoria');
        return res.status(500).json({msg: err.message});
    }
}

// listar Categoria
const listaCategoria = async (req, res) => {
    try {
        // listar 
        const categoria = await Categoria.findAll({
            where: {estado_categoria: true}
        });

        res.json({
            categoria
        });
    } catch (error) {
        console.log(error);
        const err = new Error('Lista de categoria no encontrada');
        return res.status(500).json({msg: err.message});
    }
}

// obtener categoria
const obtenerCategoria = async (req, res) => {
    try {
        const {id} = req.params;

        const categoria = await Categoria.findByPk(id);

        if (!categoria) {
            const error = new Error('La categoria no existe');
            return res.status(404).json({msg: error.message});
        }

        res.json({categoria});
    } catch (error) {
        console.log(error);
        const err = new Error('Error al encontrar la categoria');
        return res.status(500).json({msg: err.message});
    }
}

// Actualizar Categoria
const actualizarCategoria = async (req, res) => {

    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const {id} = req.params;
        const {nombre_categoria, codigo_categoria, estado_categoria} = req.body;

        const categoria = await Categoria.findByPk(id);
        
        if (!categoria) {
            const error = new Error('La categoria no existe');
            return res.status(404).json({msg: error.message});
        }

        // Valorar que el codigo ingresado no se repita
        if (categoria.codigo_categoria !== codigo_categoria) {
            const categoriaExiste = await Categoria.findOne({where: {codigo_categoria}});

            // validar que el email no sea duplicado
            if (categoriaExiste) {
                const error = new Error("Codigo repetido");
                return res.status(409).json({msg: error.message});
            }
        }

        //  todo bien
        // primero comprobamos que el campo llego antes de llamar
        // .toUpperCase() sobre el, para no reventar con TypeError cuando el
        // frontend no manda ese campo (igual que en actualizarUsuario)
        const actualizarCategoria = await categoria.update({
            nombre_categoria: nombre_categoria ? nombre_categoria.toUpperCase().trim() : categoria.nombre_categoria,
            codigo_categoria: codigo_categoria ? codigo_categoria.toUpperCase().trim() : categoria.codigo_categoria,
            estado_categoria: estado_categoria !== undefined ? Boolean(Number(estado_categoria)) : categoria.estado_categoria
        });

        res.json({
            msg: "La Categoria Actualizada correctamente",
            actualizarCategoria
        });
      
    } catch (error) {
        console.log(error);
        const err = new Error('Error al actualizar la categoria');
        return res.status(500).json({msg: err.message});
    }
}


// eliminar categoria
const eliminarCategoria = async (req, res) => {

    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const {id} = req.params;
        const categoria = await Categoria.findByPk(id);

        if (!categoria) {
            const error = new Error("La categoria no existe");
            return res.status(404).json({msg: error.message});
        }

        // validar si es categoria admin
        if (req.usuario.tipo_user !== 'ADMIN') {
            const error = new Error('No tiene permisos para esta accion');
            return res.status(403).json({msg: error.message});
        }

        // eliminar categoria
        await categoria.update({
            estado_categoria: false
        });

        res.json({
            msg: "La categoria fue eliminada"
        });
    } catch (error) {
        console.log(error);
        const err = new Error('Error al eliminar la categoria');
        return res.status(500).json({msg: err.message}); 
    }
}

// Lista categoria eliminados
const listaCategoriasEliminadas = async (req, res) => {

    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const categoria = await Categoria.findAll({
            where: {estado_categoria: 0}
        });

        res.json({
            categoria
        });
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo listar las categoria eliminadas');
        return res.status(500).json({msg: err.message});
    }
}

// activar
const activarCategoria = async (req, res) => {

    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const {id} = req.params;

        const categoria = await Categoria.findByPk(id);
        
        if (!categoria) {
            const error = new Error('La categoria no existe');
            return res.status(404).json({msg: error.message});
        }

        //  todo bien 
       await categoria.update({
            estado_categoria: true
        });

        res.json({
            msg: "La categoria se Activado correctamente"
        });
      
    } catch (error) {
        console.log(error);
        const err = new Error('Error al activar la categoria');
        return res.status(500).json({msg: err.message});
    }
}


// exportaciones
export {
    registrarCategoria,
    listaCategoria,
    obtenerCategoria,
    actualizarCategoria,
    eliminarCategoria,
    listaCategoriasEliminadas,
    activarCategoria
}