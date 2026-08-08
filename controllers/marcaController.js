import Marca from "../models/Marca.js";

const registrarMarca = async (req, res) => {
    const {nombre_marca, codigo_marca} = req.body;

    // validar campos
    if ([nombre_marca, codigo_marca].includes('')) {
        const error = new Error('Hay campos vacios');
        return res.status(400).json({msg: error.message});
    }

    // Validar longitud del código
    if (!(codigo_marca.length === 2 || codigo_marca.length === 3)) {
        const error = new Error('El código de marca debe tener 2 o 3 caracteres');
        return res.status(400).json({msg: error.message});
    }

    try {
        // validar si existe el mismo codigo
        const marcaExiste = await Marca.findOne({where: {codigo_marca}});

        // si existe el codigo
        if (marcaExiste) {
            const error = new Error('El código de marca ya esta registrado, debe de ser unico');
            return res.status(400).json({msg: error.message});
        }

        const marca = await Marca.create({
            nombre_marca: nombre_marca.toUpperCase(), // mayuscula
            codigo_marca: codigo_marca.toUpperCase()
        });

        res.json({
            msg: 'Marca registrada correctamente',
            marca
        });
    } catch (error) {
        console.log(error)
        const err = new Error('No se registro la marca');
        return res.status(404).json({msg: err.message});
    }
}


// lista de marca
const listaMarcas = async (req, res) => {
    try {
        // listar 
        const marcas = await Marca.findAll({
            where: {estado_marca: true}
        });

        res.json({
            marcas
        });
    } catch (error) {
        console.log(error);
    }
}


// obtener marca
const obtenerMarca = async (req, res) => {
    try {
        const {id} = req.params;

        const marca = await Marca.findByPk(id);

        if (!marca) {
            const error = new Error('Marca del producto no existe');
            return res.status(400).json({msg: error.message});
        }

        res.json({marca});
    } catch (error) {
        console.log(error);
    }
}

// Actualizar marca
const actualizarMarca = async (req, res) => {
    try {
        const {id} = req.params;
        const {nombre_marca, codigo_marca} = req.body;

        const marca = await Marca.findByPk(id);
        
        if (!marca) {
                const error = new Error('Marca del producto no existe');
            return res.status(400).json({msg: error.message});
        }

        // Valorar que el codigo ingresado no se repita
        if (marca.codigo_marca !== codigo_marca) {
            const marcaExiste = await Marca.findOne({where: {codigo_marca}});

            // validar que el email no sea duplicado
            if (marcaExiste) {
                const error = new Error("El codigo para marca ya existe");
                return res.status(400).json({msg: error.message});
            }
        }

        //  todo bien 
        const actualizarMarca = await marca.update({
            nombre_marca: nombre_marca.toUpperCase() || marca.nombre_marca.toUpperCase(),
            codigo_marca: codigo_marca.toUpperCase() || marca.codigo_marca.toUpperCase()
        });

        res.json({
            msg: "Marca Actualizada correctamente",
            actualizarMarca
        });
      
    } catch (error) {
        console.log(error);
    }
}


// eliminar marca
const eliminarMarca = async (req, res) => {
    try {
        const {id} = req.params;
        const marca = await Marca.findByPk(id);

        if (!marca) {
            const error = new Error("La marca no existe");
            return res.status(403).json({msg: error.message});
        }

        // validar si es marca admin
        if (req.usuario.tipo_user !== 'ADMIN') {
            const error = new Error('No tiene permisos para esta accion');
            return res.status(404).json({msg: error.message});
        }

        // eliminar marca
        await marca.update({
            estado_marca: false
        });

        res.json({
            msg: "La marca fue eliminado"
        });
    } catch (error) {
        const err = new Error('La marca no existe');
        return res.status(401).json({msg: err.message}); 
    }
}



export {
    registrarMarca,
    listaMarcas,
    obtenerMarca,
    actualizarMarca,
    eliminarMarca
}