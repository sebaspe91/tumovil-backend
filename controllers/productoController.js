import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import { Producto, Categoria, Marca } from "../associations/index.js";
import { carpetaProductos } from "../middleware/uploadProducto.js";
import { leerPaginacion } from "../helpers/paginar.js";

// funciones nativas

// construir un where para las listas
const armarWhereProducto = (estado_prod, filtros = {}) => {
    // los datos que vienen del frontEnd
    const {
        nombre_prod,
        codigo_prod,
        categoria_id,
        marca_id,
        precioVentaMin,
        precioVentaMax,
        precioCompraMin,
        precioCompraMax
    } = filtros;

    const where = { estado_prod };

    // busqueda por nombre, independiente de codigo
    if (nombre_prod && nombre_prod.trim() !== '') {
        where.nombre_prod = { [Op.like]: `%${nombre_prod.trim().toUpperCase()}%` };
    }

    // busqueda por codigo, independiente de nombre
    if (codigo_prod && codigo_prod.trim() !== '') {
        where.codigo_prod = { [Op.like]: `%${codigo_prod.trim().toUpperCase()}%` };
    }

    // filtros exactos por id (categoria y marca)
    if (categoria_id) where.categoria_id = categoria_id; // categoria
    if (marca_id) where.marca_id = marca_id; // marca

    // rango de precio: solo uno de los dos, nunca los dos al mismo tiempo
    if (precioVentaMin || precioVentaMax) {
        where.precio_venta = {}; // pordefecto vacio

        // se hace por ceparados para que se pueda enviar solo un valor

        // precio de venta >= precio Minimo
        if (precioVentaMin) where.precio_venta[Op.gte] = Number(precioVentaMin);

        // precio de venta >= precio Maximo
        if (precioVentaMax) where.precio_venta[Op.lte] = Number(precioVentaMax);

    } else if (precioCompraMin || precioCompraMax) {
        where.precio_compra = {};
        if (precioCompraMin) where.precio_compra[Op.gte] = Number(precioCompraMin);
        if (precioCompraMax) where.precio_compra[Op.lte] = Number(precioCompraMax);
    }

    return where;
}



// funciones de exportacion

// registrar
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

        // si llego algun archivo
        let foto_producto = req.file.filename;

        // toda validacion superada
        const producto = await Producto.create({
            categoria_id: Number(categoria_id),
            marca_id: Number(marca_id),
            nombre_prod: nombre_prod.toUpperCase().trim(),
            cantidad_prod: Number(cantidad_prod),
            precio_compra: parseFloat(precio_compra),
            precio_venta: parseFloat(precio_venta),
            foto_producto: foto_producto? foto_producto.trim() : null,
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
        // acondiconar la lista
        const {pagina, limite, offset} = leerPaginacion(req.query);
        
        // armar el where para el filtrado
        const where = armarWhereProducto(true, {
            nombre_prod: req.query.nombre_prod,
            codigo_prod: req.query.codigo_prod,
            categoria_id: req.query.categoria_id,
            marca_id: req.query.marca_id,
            precioVentaMin: req.query.precioVentaMin,
            precioVentaMax: req.query.precioVentaMax,
            precioCompraMin: req.query.precioCompraMin,
            precioCompraMax: req.query.precioCompraMax
        });

        const {count, rows: productos} = await Producto.findAndCountAll({
            where,
            limit: limite,
            offset,
            order: [['id_producto', 'DESC']],
            include: [
                { model: Categoria, as: 'categoria' },
                { model: Marca, as: 'marca' }
            ]
        });

        res.json({
            msg: 'Lista de Productos',
            productos,
            paginacion: {
                total: count,
                totalPaginas: Math.max(1, Math.ceil(count / limite)),
                paginaActual: pagina,
                limite
            }
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

        // Si el produicto ya tiene imagen
        let foto_producto = producto.foto_producto;

        // Validar si llego un archivo del frontEnd
        if (req.file) {
            // valida si ya hay imagen para ese archivo en la DB
            if (producto.foto_producto) {
                // Se arma la URL de la imagen anterior para eliminarla del DISCO
                const rutaImgAnterior = path.join(carpetaProductos, producto.foto_producto);

                // si existe la elimina
                if (fs.existsSync(rutaImgAnterior)) {
                    fs.unlinkSync(rutaImgAnterior);
                }
            }

            // actualiza la imagen con la del forntEnd
            foto_producto = req.file.filename;
        }

        const actualizarProducto = await producto.update({
            categoria_id: categoria_id !== undefined ? Number(categoria_id) : producto.categoria_id,
            marca_id: marca_id !== undefined ? Number(marca_id) : producto.marca_id,
            nombre_prod: nombre_prod ? nombre_prod.toUpperCase().trim() : producto.nombre_prod,
            cantidad_prod: cantidad_prod !== undefined ? Number(cantidad_prod) : producto.cantidad_prod,
            precio_compra: precio_compra !== undefined ? parseFloat(precio_compra) : producto.precio_compra,
            precio_venta: precio_venta !== undefined ? parseFloat(precio_venta) : producto.precio_venta,
            foto_producto, // va la imagen
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
        // acondiconar la lista
        const {pagina, limite, offset} = leerPaginacion(req.query);
        
        // armar el where para el filtrado
        const where = armarWhereProducto(false, {
            nombre_prod: req.query.nombre_prod,
            codigo_prod: req.query.codigo_prod,
            categoria_id: req.query.categoria_id,
            marca_id: req.query.marca_id,
            precioVentaMin: req.query.precioVentaMin,
            precioVentaMax: req.query.precioVentaMax,
            precioCompraMin: req.query.precioCompraMin,
            precioCompraMax: req.query.precioCompraMax
        });

        const {count, rows: productos} = await Producto.findAndCountAll({
            where,
            limit: limite,
            offset,
            order: [['id_producto', 'DESC']],
            include: [
                { model: Categoria, as: 'categoria' },
                { model: Marca, as: 'marca' }
            ]
        });

        res.json({
            msg: 'Lista de Productos Eliminados',
            productos,
            paginacion: {
                total: count,
                totalPaginas: Math.max(1, Math.ceil(count / limite)),
                paginaActual: pagina,
                limite
            }
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

// obtener categorias
// Lista categorias
const listaCategorias = async (req, res) => {
    try {

        const categorias = await Categoria.findAll({
            where: {estado_categoria: true},
        });

        res.json({
            msg: 'Lista de categorias',
            categorias
        });
    } catch (error) {
        console.log(error);
        const err = new Error('No se pudo listar los categorias');
        return res.status(500).json({ msg: err.message });
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
    activarProducto,
    listaCategorias
}