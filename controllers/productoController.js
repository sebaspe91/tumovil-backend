import { Producto, Categoria, Marca } from "../associations/index.js";

const registrarProducto = async (req, res) => {
    const {categoria_id, marca_id, nombre_prod, cantidad_prod, precio_compra, precio_venta, detalle_prod} = req.body;

    // Validar si hay campos vacios obligatorios
    if ([categoria_id, marca_id, nombre_prod, cantidad_prod, precio_compra, precio_venta, detalle_prod].includes('')){
        const error = new Error('Hay campos vacios que son obligatorios');
        return res.status(400).json({msg: error.message});
    }

    // validar que lo valores vengan en Numeros enteros
    if (!Number.isInteger(Number(categoria_id)) || !Number.isInteger(Number(marca_id)) || !Number.isInteger(Number(cantidad_prod))) {
        const error = new Error('Formato de categoria, marca o cantidad incorrectos');
        return res.status(400).json({msg: error.message});
    }

    // validar los precios en numeros decimales
    if (isNaN(parseFloat(precio_compra)) || !isFinite(parseFloat(precio_compra)) ||  isNaN(parseFloat(precio_venta)) || !isFinite(parseFloat(precio_venta))) {
        const error = new Error('Los precios deben ser un número');
        return res.status(400).json({msg: error.message});
    }

    // Validar que las cantidades precios sean positivos
    if (parseFloat(precio_compra) <= 0 || parseFloat(precio_venta) <= 0 || Number(cantidad_prod) < 0 ) {
        const error = new Error('Los precios y cantidad no pueden ser negativo');
        return res.status(400).json({msg: error.message});
    }

    // validar que los precios sean diferentes o iguales
    if (parseFloat(precio_compra) > parseFloat(precio_venta)) {
        const error = new Error('El precio de venta debe ser mayor al de compra');
        return res.status(400).json({msg: error.message});
    }

    try {
        const productoExiste = await Producto.findOne({where:{nombre_prod}});
        if (productoExiste) {
            const error = new Error('El producto ya esta registrado');
            return res.status(409).json({msg: error.message});
        }

        // toda validacion superada
        const producto = await Producto.create({
            categoria_id: Number(categoria_id),
            marca_id: Number(marca_id),
            nombre_prod: nombre_prod.toUpperCase().trim(),
            cantidad_prod: Number(cantidad_prod),
            precio_compra: parseFloat(precio_compra),
            precio_venta: parseFloat(precio_venta),
            detalle_prod: detalle_prod.toUpperCase().trim()
        });

        res.json({
            msg: "Producto creado correctamente",
            producto
        });
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo registrar el producto');
        return res.status(500).json({msg: err.message});
    }
}

// Lista productos
const listaProductos = async (req, res) => {
    try {
        const productos = await Producto.findAll({
            where: { estado_prod: true },
            include: [
                { model: Categoria, as: 'categoria' },
                { model: Marca, as: 'marca' }
            ]
        });

        res.json({
            productos
        });
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo listar los productos');
        return res.status(500).json({ msg: err.message });
    }
}

// obtener un producto
const obtenerProducto = async (req, res) => {
    try {
        const { id } = req.params;

        const producto = await Producto.findByPk(id, {
            include: [
                { model: Categoria, as: 'categoria' },
                { model: Marca, as: 'marca' }
            ]
        });

        if (!producto) {
            const error = new Error('El producto no existe');
            return res.status(404).json({ msg: error.message });
        }
        res.json({ producto });
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo Obtener el producto');
        return res.status(500).json({ msg: err.message });
    }
}

// Actualizar producto
const actualizarProducto = async (req, res) => {
    try {
        const {id} = req.params;
        const {categoria_id, marca_id, nombre_prod, cantidad_prod, precio_compra, precio_venta, estado_prod, detalle_prod} = req.body;

        const producto = await Producto.findByPk(id);

        // validar que exista el producto
        if (!producto) {
            const error = new Error('El producto no existe');
            return res.status(404).json({msg: error.message});  
        }

        // solo admin
        if (req.usuario.tipo_user !== 'ADMIN') {
            const error = new Error('No tiene permisos para esta accion');
            return res.status(403).json({msg: error.message});
        }

        const actualizarProducto = await producto.update({
            categoria_id: categoria_id !== undefined ? Number(categoria_id) : producto.categoria_id,
            marca_id: marca_id !== undefined ? Number(marca_id) : producto.marca_id,
            nombre_prod: nombre_prod ? nombre_prod.toUpperCase().trim() : producto.nombre_prod,
            cantidad_prod: cantidad_prod !== undefined ? Number(cantidad_prod) : producto.cantidad_prod,
            precio_compra: precio_compra !== undefined ? parseFloat(precio_compra) : producto.precio_compra,
            precio_venta: precio_venta !== undefined ? parseFloat(precio_venta) : producto.precio_venta,
            estado_prod: estado_prod !== undefined ? Boolean(Number(estado_prod)) : producto.estado_prod,
            detalle_prod: detalle_prod ? detalle_prod.toUpperCase().trim() : producto.detalle_prod
        });

        res.json({
            msg: "Producto Actualizado correctamente",
            actualizarProducto
        });
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo Actualizar el producto');
        return res.status(500).json({msg: err.message});
    }
}


// Eliminar Producto
const eliminarProducto = async (req, res) => {
    try {
        const {id} = req.params;
        const producto = await Producto.findByPk(id);

        if (!producto) {
            const error = new Error('El producto no existe');
            return res.status(404).json({msg: error.message}); 
        }

        // solo admin
        if (req.usuario.tipo_user !== 'ADMIN') {
            const error = new Error('No tiene permisos para esta accion');
            return res.status(403).json({msg: error.message});
        }

        // eliminar
        await producto.update({
            estado_prod: false
        });

        res.json({
            msg: "El producto fue eliminado"
        });

    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo Eliminar el producto');
        return res.status(500).json({msg: err.message});
    }
}


// Lista productos eliminados
const listaProductosEliminados = async (req, res) => {
    // validar que se admin
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({ msg: error.message });
    }

    try {
        const productos = await Producto.findAll({
            where: { estado_prod: 0 },
            include: [
                { model: Categoria, as: 'categoria' },
                { model: Marca, as: 'marca' }
            ]
        });

        res.json({
            msg: "Producto Activado",
            productos
        });
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo listar los productos eliminados');
        return res.status(500).json({ msg: err.message });
    }
}


// activar
const activarProducto = async (req, res) => {

    // validar que sea admin (igual que activarCategoria)
    if (req.usuario.tipo_user !== 'ADMIN') {
        const error = new Error('No tiene permisos para esta accion');
        return res.status(403).json({msg: error.message});
    }

    try {
        const {id} = req.params;

        const producto = await Producto.findByPk(id);
        
        if (!producto) {
            const error = new Error('El producto no existe');
            return res.status(404).json({msg: error.message});
        }

        //  todo bien 
       await producto.update({
            estado_prod: true
        });

        res.json({
            msg: "El producto se Activado correctamente"
        });
      
    } catch (error) {
        console.log(error);
        const err = new Error('Error al activar el producto');
        return res.status(500).json({msg: err.message});
    }
}



// exportaciones
export {
    registrarProducto,
    listaProductos,
    obtenerProducto,
    actualizarProducto,
    eliminarProducto,
    listaProductosEliminados,
    activarProducto
}