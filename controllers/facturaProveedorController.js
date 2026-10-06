import puppeteer from 'puppeteer'; // para interpretar HTML a PDF
import plantillaFacturaProveedor from '../utils/plantillaFacturaProveedor.js';
import db from '../config/db.js';
import { 
    FacturaProveedor, 
    DetalleProveedor, 
    Producto, 
    Proveedor, 
    Empresa, 
    Usuario    
} from '../associations/index.js';
import { Op } from 'sequelize'; // Op = operadores de busqueda: Op.like, Op.or, Op.and, Op.gte, Op.lte
import { leerPaginacion } from '../helpers/paginar.js';

// calcular factura
const calcularTotalFactura = (detalles) => {
    return detalles.reduce((total, detalle) => {
        return total + (detalle.cantidad_dp_compra * detalle.precio_dp_compra);
    }, 0);
};

// El precio de compra NO tiene tope: se compra al precio que pida el
// proveedor, aunque suba, porque si el producto se necesita hay que
// comprarlo igual. Lo que sí se garantiza es que, con ese nuevo costo,
// el producto le siga dejando al menos esta ganancia al venderse -- si
// no le alcanza, se sube el precio de venta automáticamente.
const GANANCIA_MINIMA = 5000;

// valida que el precio de compra de un item de la factura venga informado
// y sea un numero valido mayor a cero. Devuelve el numero ya convertido,
// o null si no es valido (para que el controller responda el error).
const validarPrecioCompra = (precio_compra) => {
    if (precio_compra === undefined || precio_compra === null || precio_compra === '') {
        return null;
    }
    const precio = parseFloat(precio_compra);
    if (isNaN(precio) || !isFinite(precio) || precio <= 0) {
        return null;
    }
    return precio;
};

// valida que la cantidad comprada de un item venga informada y sea un
// entero mayor a cero. Devuelve el numero ya convertido, o null si no es
// valida.
const validarCantidadCompra = (cantidad_dp_compra) => {
    if (cantidad_dp_compra === undefined || cantidad_dp_compra === null || cantidad_dp_compra === '') {
        return null;
    }
    const cantidad = Number(cantidad_dp_compra);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
        return null;
    }
    return cantidad;
};

// si con el nuevo precio de compra ya no queda la ganancia minima al
// vender el producto a su precio_venta actual, sube el precio_venta lo
// justo para volver a dejarla
const calcularPrecioVentaConGanancia = (precioVentaActual, precioCompra) => {
    const precioVentaMinimo = precioCompra + GANANCIA_MINIMA;
    return precioVentaActual < precioVentaMinimo ? precioVentaMinimo : precioVentaActual;
};


// =====================================================================
//  STOCK EN COMPRAS: la regla es la INVERSA de la de ventas
// =====================================================================
//   Registrar una compra  -> SUMA al stock   (llega mercancia a la bodega)
//   Eliminar una compra   -> RESTA del stock (es como si nunca hubiera llegado)
//   Reactivar una compra  -> SUMA otra vez
//   Actualizar una compra -> RESTA lo de los detalles viejos y SUMA los nuevos
// Ojo: al RESTAR hay que validar que el stock alcance. Si ya se vendio parte
// de esa mercancia, restar dejaria el inventario en negativo.

// agrupa los detalles por producto y suma sus cantidades. Sirve por si la
// misma factura trae el mismo producto en dos lineas: validamos la SUMA y no
// cada linea por separado (dos lineas de 5 pasarian cada una con stock 8,
// pero juntas piden 10).
// Resultado: Map { id_producto => cantidad_total }
const agruparCantidadesPorProducto = (detalles) => {
    const cantidades = new Map();
    for (const detalle of detalles) {
        const actual = cantidades.get(detalle.producto_dp_id) || 0;
        cantidades.set(detalle.producto_dp_id, actual + detalle.cantidad_dp_compra);
    }
    return cantidades;
};

// RESTA del stock lo que sumo una compra (eliminar / actualizar).
// Primero valida TODOS los productos y solo si todos alcanzan resta. Si
// alguno no alcanza no se toca nada y devuelve la lista de errores
// (el controller hace rollback y responde con ellos).
const descontarStockDeCompra = async (detalles, t) => {
    const errores = [];
    const pendientes = [];

    for (const [productoId, cantidad] of agruparCantidadesPorProducto(detalles)) {
        const producto = await Producto.findByPk(productoId, { transaction: t });

        // si el producto ya no existe no hay stock que quitar: se salta
        if (!producto) continue;

        if (producto.cantidad_prod < cantidad) {
            errores.push(`No se puede quitar el stock de "${producto.nombre_prod}" (en bodega: ${producto.cantidad_prod}, de esta factura: ${cantidad}). Parte de esa mercancia ya se vendio`);
            continue;
        }

        pendientes.push({ producto, cantidad });
    }

    if (errores.length > 0) return { errores };

    // todo valido: ahora si se resta
    for (const { producto, cantidad } of pendientes) {
        await producto.update({
            cantidad_prod: producto.cantidad_prod - cantidad
        }, { transaction: t });
    }

    return { errores: [] };
};

// SUMA al stock lo de una compra (reactivar). Aca NO se valida que alcance:
// sumar mercancia nunca puede dejar el inventario en negativo. Solo se
// valida que el producto siga existiendo.
const reponerStockDeCompra = async (detalles, t) => {
    const errores = [];
    const pendientes = [];

    for (const [productoId, cantidad] of agruparCantidadesPorProducto(detalles)) {
        const producto = await Producto.findByPk(productoId, { transaction: t });

        if (!producto) {
            errores.push(`El producto con id ${productoId} ya no existe, no se puede reactivar`);
            continue;
        }

        pendientes.push({ producto, cantidad });
    }

    if (errores.length > 0) return { errores };

    for (const { producto, cantidad } of pendientes) {
        await producto.update({
            cantidad_prod: producto.cantidad_prod + cantidad
        }, { transaction: t });
    }

    return { errores: [] };
};


// enpont
const registrarFacturaProveedor = async (req, res) => {
    // elementos enviados por el usuario
    const {proveedor_id, productos} = req.body;

    if (!proveedor_id || !Array.isArray(productos) || productos.length === 0) {
        const error = new Error('Debe indicar el proveedor y al menos un producto');
        return res.status(400).json({ msg: error.message });
    }

    // controlamos la transaccion 
    const t = await db.transaction();

    try {
        const proveedor = await Proveedor.findByPk(proveedor_id);
        if (!proveedor) {
            await t.rollback();  // revierte la transaction
            return res.status(404).json({ msg: 'El proveedor no existe' });   
        }

        // empresa
        const empresa = await Empresa.findOne({
            where: { estado_empresa: true },
            transaction: t
        });
        if (!empresa) {
            await t.rollback(); // revierte la transaction de DB
            return res.status(404).json({ msg: 'La empresa no existe' });
        }

        // Creamos la cabecera factura 
        const factura = await FacturaProveedor.create({
            proveedor_id,
            usuario_fp_id: req.usuario.id_usuario,
            empresa_fp_id: empresa.id_empresa,
            fecha_fp: new Date()
        }, {transaction: t}); // se ejecuta esta accion pero se puede borrar si algo sale mal

        // para agregar el total
        const detallesCreados = [];

        // con el array productos que mando el usuario validamos y ejecutamos
        for (const item of productos) {

            // Extraemos todo los datos del array productos pro seccion
            const {producto_dp_id, cantidad_dp_compra, precio_compra} = item;

            // el precio de compra es obligatorio: es lo que en verdad se
            // pacto con el proveedor en esta factura, no se puede inventar
            const precioCompraValido = validarPrecioCompra(precio_compra);
            if (precioCompraValido === null) {
                await t.rollback();
                return res.status(400).json({ msg: `Debe indicar un precio de compra valido para el producto con id ${producto_dp_id}` });
            }

            const cantidadValida = validarCantidadCompra(cantidad_dp_compra);
            if (cantidadValida === null) {
                await t.rollback();
                return res.status(400).json({ msg: `La cantidad comprada del producto con id ${producto_dp_id} debe ser un numero entero mayor a cero` });
            }

            // consultamos el producto para validar
            const producto = await Producto.findByPk(producto_dp_id, {transaction:t});

            if (!producto) {
                await t.rollback();  // cancela la transaction de DB
                return res.status(404).json({ msg: `El producto con id ${producto_dp_id} no existe` });
            }


            // Creamos el detalleProveedor
            const detalle = await DetalleProveedor.create({
                producto_dp_id,
                fact_prov_id: factura.id_fact_prov,
                cantidad_dp_compra: cantidadValida,
                precio_dp_compra: precioCompraValido
            }, {transaction:t});

            // guardamos los detalles en el array para una suma total
            detallesCreados.push(detalle);

            // aumentar el almacen y, si con este costo ya no queda la
            // ganancia minima, subir el precio de venta para garantizarla
            await producto.update({
                cantidad_prod: producto.cantidad_prod + cantidadValida,
                precio_venta: calcularPrecioVentaConGanancia(producto.precio_venta, precioCompraValido)
            }, {transaction:t});
        }

        // se cumplete todas las transacciones no se borran
        await t.commit();

        const total = calcularTotalFactura(detallesCreados);

        const facturaCompleta = await FacturaProveedor.findByPk(factura.id_fact_prov, {
            include: [
                { 
                    model: Proveedor, 
                    as: 'proveedor',
                    attributes: ['nombre_prov', 'nit_prov', 'correo_prov']
                },                    
                { 
                    model: Usuario, 
                    as: 'usuario',
                    attributes: ['nombre_user', 'apellido_user', 'cedula_user', 'tipo_user']
                },
                { 
                    model: Empresa, 
                    as: 'empresa',
                    attributes: ['nombre_empresa', 'nit_empresa', 'cel_empresa']
                },
                {
                    model: DetalleProveedor,
                    as: 'detalles',
                    include: { 
                        model: Producto, 
                        as: 'producto',
                        attributes: ['nombre_prod']
                    },
                    attributes: ['precio_dp_compra', 'cantidad_dp_compra']
                }
            ]
        });

        res.json({
            msg: 'Factura registrada correctamente',
            total,
            factura: facturaCompleta
        });

    } catch (error) {
        await t.rollback(); // revierte todos los cambios de todas las transaccione
        console.log(error);
        res.status(500).json({ msg: 'No se pudo registrar la factura' });
    }
}



// -----------------------------------------------------------------------
// -------------------------- Inicio para listar las Facturas ------------

// validar el formato de fecha
const leerFecha = valor => {
    if (!valor) return null; // si no trae nada null
    const fecha = new Date(valor); // convertimos a formato fecha
    return Number.isNaN(fecha.getTime()) ? null : fecha; // valida si NO es formato fecha, si no es arroja null si es arroja la fecha
}

// validar si el texto de busqueda tiene caracteres especiales y tratarlos
const escaparLike = texto => texto.replace(/[\\%_]/g, '\\$&');

// construir el where
const armarFiltrosFactura = (estado, query) => {
    // estado de la factura
    const where = {estado_fp: estado};

    // filtrar por fecha
    const desde = leerFecha(query.desde);
    const hasta = leerFecha(query.hasta);

    // validar el rango
    if (desde && hasta && desde > hasta) {
        return {error: 'La fecha "desde" no puede ser mayor que la fecha "hasta"'};
    }

    // agregamos a where la fecha
    if (desde || hasta) {
        where.fecha_fp = {};
        if (desde) where.fecha_fp[Op.gte] = desde; // "mayor o igual" a desde
        if (hasta) where.fecha_fp[Op.lte] = hasta; // "menor o igual" a hasta
    }

    // filtro segun el PROVEEDOR (nombre, nit o correo)
    const texto = (query.busqueda || '').toString().trim();

    // solo si el usuario escribio algo (si no, no se agrega ninguna condicion)
    if (texto) {
        // separar por espacios: "distri norte" -> ['distri', 'norte']
        // CADA palabra debe aparecer (AND) en el nombre, el nit o el correo (OR)
        const palabras = texto.split(/\s+/);

        // OJO: antes decia "where[Op.and]. palabras.map" (con un punto). Eso no
        // asigna nada y revienta; hay que ASIGNAR el resultado con "="
        where[Op.and] = palabras.map((palabra) => {
            const limpia = escaparLike(palabra); // protege los comodines % y _
            return {
                [Op.or]: [
                    // '$proveedor.xxx$' = columna de la tabla unida. El nombre antes
                    // del punto es el ALIAS del include ("proveedor", singular)
                    {'$proveedor.nombre_prov$': {[Op.like]: `%${limpia.toUpperCase()}%`}},
                    {'$proveedor.nit_prov$': {[Op.like]: `%${limpia.toUpperCase()}%`}},
                    {'$proveedor.correo_prov$': {[Op.like]: `%${limpia.toUpperCase()}%`}},
                ]
            };
        });
    }

    return { where };
}

// consultar la pagina para facturas
const consultarFacturasPaginadas = async (estado, req) => {
    // filtros
    const { where, error } = armarFiltrosFactura(estado, req.query);
    if (error) return { error };

    // armar la paginacion
    const { pagina, limite, offset } = leerPaginacion(req.query);

    // el orden
    const orden = [['fecha_fp', 'DESC'], ['id_fact_prov', 'DESC']];

    // consulta para los ids
    const { count, rows } = await FacturaProveedor.findAndCountAll({
        where,
        attributes: ['id_fact_prov'], // solo necesitamos el id
        include: [{
            model: Proveedor,
            as: 'proveedor',
            attributes: [], // une la tabla para filtrar pero no trae sus columnas
            required: true // INNER JOIN: solo facturas que tengan proveedores
        }],
        order: orden,
        limit: limite,
        offset,
        raw: true // objetos simples, mas rapido
    });

    // lista de ids que se envian
    const ids = rows.map((fila) => fila.id_fact_prov);

    // Realizar la consulta real
    let facturas = [];

    // si la lista d eid trae algo
    if (ids.length > 0) {
        facturas = await FacturaProveedor.findAll({
            where: {id_fact_prov: ids},
            order: orden,
            include: [
                {
                    model: Proveedor,
                    as: 'proveedor',
                    attributes: ['nombre_prov', 'nit_prov', 'correo_prov']
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['nombre_user', 'apellido_user', 'cedula_user', 'tipo_user']
                },
                {
                    model: Empresa,
                    as: 'empresa',
                    attributes: ['nombre_empresa', 'nit_empresa', 'cel_empresa']
                },
                {
                    model: DetalleProveedor,
                    as: 'detalles',
                    attributes: ['precio_dp_compra', 'cantidad_dp_compra'],
                    include: {
                        model: Producto,
                        as: 'producto',
                        attributes: ['nombre_prod']
                    }
                }
            ]
        });
    }

    // creamos la paginacion
    const paginacion = {
        total: count, // cuantas facturas cumplen los filtros
        totalPaginas: Math.ceil(count / limite), // redondeo hacia arriba: 11 facturas / 5 = 3 paginas
        paginaActual: pagina,
        limite
    };

    return { facturas, paginacion };
}


// listar las facturas de proveedor
const listaFacturaProveedor = async (req, res) => {
    try {
        const { facturas, paginacion, error } = await consultarFacturasPaginadas(true, req);

        if (error) {
            return res.status(400).json({ msg: error });
        }

        res.json({
            msg: 'Lista de Facturas obtenidas correctamente',
            listaFacturaProveedor: facturas,
            paginacion
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'No se pudo obtener la lista de las facturas' });
    }
}

// Obtener factura proveedor
const obtenerFacturaProveedro = async (req, res) => {
    try {
        const {id} = req.params;
        const factura = await FacturaProveedor.findByPk(id, {
            include: [
                {
                    model: Proveedor,
                    as: 'proveedor',
                    attributes: ['nombre_prov', 'nit_prov', 'correo_prov']
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['nombre_user', 'apellido_user', 'cedula_user', 'tipo_user']
                },
                {
                    model: Empresa,
                    as: 'empresa',
                    attributes: ['nombre_empresa', 'nit_empresa', 'cel_empresa']
                },
                {
                    model: DetalleProveedor,
                    as: 'detalles',
                    attributes: ['precio_dp_compra', 'cantidad_dp_compra'],
                    include: {
                        model: Producto,
                        as: 'producto',
                        attributes: ['nombre_prod']
                    }
                }
            ]
        });

        if (!factura) {
            return res.status(404).json({ msg: 'Factura no encontrada' });
        }

        res.json({
            msg: 'Factura obtenida correctamente',
            facturaCompleta: factura
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'No se pudo obtener la factura' });
    }
}

// calcular el total de las facturas
const obtenerTotalFactura = async (req, res) => {
    try {
        const { id } = req.params;
        const factura = await FacturaProveedor.findByPk(id, {
            include: {
                model: DetalleProveedor,
                as: 'detalles'
            }
        });

        if (!factura) {
            return res.status(404).json({ msg: 'Factura no encontrada' });
        }

        const total = calcularTotalFactura(factura.detalles);

        res.json({
            id_fact_prov : factura.id_fact_prov,
            total
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'No se pudo calcular el total' });
    }
}





// actualizar factura cliente
const actualizarFacturaProveedor = async (req, res) => {
    const {id} = req.params;
    const {proveedor_id, empresa_fp_id, productos} = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ msg: 'Debe indicar al menos un producto' });
    }

    if (req.usuario.tipo_user !== 'ADMIN') {
        return res.status(403).json({ msg: 'No tiene permisos para esta acción' });
    }

    const t = await db.transaction();

    try {

        const factura = await FacturaProveedor.findByPk(id, {
            include: {
                model: DetalleProveedor,
                as: 'detalles'
            },
            transaction: t
        });

        if (!factura) {
            await t.rollback();
            return res.status(404).json({ msg: 'Factura no encontrada' });
        }

        if (factura.estado_fp === false) {
            await t.rollback();
            return res.status(400).json({ msg: 'No se puede actualizar una factura eliminada' });
        }

        // 1. deshacer la compra anterior: se RESTA del stock lo que sumaron los
        // detalles actuales (validando que alcance; si ya se vendio parte de esa
        // mercancia, no se puede editar la factura)
        const { errores: erroresStock } = await descontarStockDeCompra(factura.detalles, t);
        if (erroresStock.length > 0) {
            await t.rollback();
            return res.status(400).json({
                msg: 'No se puede actualizar la factura',
                errores: erroresStock
            });
        }

        // 2. borrar los detalles actuales
        await DetalleProveedor.destroy({
            where: { fact_prov_id: factura.id_fact_prov },
            transaction: t
        });

        // 3. actualizar cliente/empresa si vinieron en el body
        await factura.update({
            proveedor_id: proveedor_id ?? factura.proveedor_id,
            empresa_fp_id: empresa_fp_id ?? factura.empresa_fp_id
        }, { transaction: t });

        // 4. crear los nuevos detalles (en compra no hay tope de stock: se SUMA)
        const detallesCreados = [];

        for (const item of productos) {
            const { producto_dp_id, cantidad_dp_compra, precio_compra } = item;

            // mismo precio de compra obligatorio que en registrarFacturaProveedor
            // (antes aca se ignoraba lo que mandaba el body y se usaba
            // siempre producto.precio_compra, lo cual no dejaba corregir el
            // precio de una factura ya creada)
            const precioCompraValido = validarPrecioCompra(precio_compra);
            if (precioCompraValido === null) {
                await t.rollback();
                return res.status(400).json({ msg: `Debe indicar un precio de compra valido para el producto con id ${producto_dp_id}` });
            }

            const cantidadValida = validarCantidadCompra(cantidad_dp_compra);
            if (cantidadValida === null) {
                await t.rollback();
                return res.status(400).json({ msg: `La cantidad comprada del producto con id ${producto_dp_id} debe ser un numero entero mayor a cero` });
            }

            const producto = await Producto.findByPk(producto_dp_id, { transaction: t });

            if (!producto) {
                await t.rollback();
                return res.status(404).json({ msg: `El producto con id ${producto_dp_id} no existe` });
            }


            const detalle = await DetalleProveedor.create({
                producto_dp_id,
                fact_prov_id: factura.id_fact_prov,
                cantidad_dp_compra: cantidadValida,
                precio_dp_compra: precioCompraValido
            }, { transaction: t });

            detallesCreados.push(detalle);

            await producto.update({
                cantidad_prod: producto.cantidad_prod + cantidadValida,
                precio_venta: calcularPrecioVentaConGanancia(producto.precio_venta, precioCompraValido)
            }, { transaction: t });
        }

        await t.commit();

        const total = calcularTotalFactura(detallesCreados);

        const facturaActualizada = await FacturaProveedor.findByPk(factura.id_fact_prov, {
            include: [
                {
                    model: Proveedor,
                    as: 'proveedor',
                    attributes: ['nombre_prov', 'nit_prov', 'correo_prov']
                },
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['nombre_user', 'apellido_user', 'cedula_user', 'tipo_user']
                },
                {
                    model: Empresa,
                    as: 'empresa',
                    attributes: ['nombre_empresa', 'nit_empresa', 'cel_empresa']
                },
                {
                    model: DetalleProveedor,
                    as: 'detalles',
                    attributes: ['precio_dp_compra', 'cantidad_dp_compra'],
                    include: {
                        model: Producto,
                        as: 'producto',
                        attributes: ['nombre_prod']
                    }
                }
            ]
        });

        res.json({
            msg: 'Factura actualizada correctamente',
            total,
            facturaCompleta: facturaActualizada
        });
        
    } catch (error) {
        await t.rollback();
        console.log(error);
        res.status(500).json({ msg: 'No se pudo actualizar la factura' }); 
    }
}


// Eliminar Factura proveedor
const elimnarFacturaProveedor = async (req, res) => {
    const {id} = req.params;

    if (req.usuario.tipo_user !== 'ADMIN') {
        return res.status(403).json({ msg: 'No tiene permisos para esta acción' });
    }

    const t = await db.transaction();
    
    try {
        const factura = await FacturaProveedor.findByPk(id, {
            include: {
                model: DetalleProveedor,
                as: 'detalles'
            },
            transaction: t
        }); 

        if (!factura) {
            await t.rollback();
            return res.status(404).json({ msg: 'Factura no encontrada' });
        }

        if (factura.estado_fp === false) {
            await t.rollback();
            return res.status(400).json({ msg: 'La factura ya se encuentra eliminada' });
        }

        // eliminar una COMPRA = quitar del stock lo que esa compra habia sumado
        // (antes aca se SUMABA, que es lo que se hace al eliminar una VENTA).
        // Se valida que alcance: si ya se vendio parte de esa mercancia, el
        // stock quedaria negativo y se rechaza la operacion.
        const { errores } = await descontarStockDeCompra(factura.detalles, t);
        if (errores.length > 0) {
            await t.rollback();
            return res.status(400).json({
                msg: 'No se puede eliminar la factura',
                errores
            });
        }

        // marcar como eliminada en vez de borrar la fila
        await factura.update({ estado_fp: false }, { transaction: t });

        await t.commit();

        res.json({ msg: 'Factura eliminada correctamente' });

    } catch (error) {
        await t.rollback();
        console.log(error);
        res.status(500).json({ msg: 'No se pudo eliminar la factura' });
    }
}


// lista de facturas eliminadas
const listaFacturaProveedorEliminadas = async (req, res) => {
    try {
        const { facturas, paginacion, error } = await consultarFacturasPaginadas(false, req);

        if (error) {
            return res.status(400).json({ msg: error });
        }

        res.json({
            msg: 'Lista de Facturas Eliminadas obtenidas correctamente',
            listaFacturaProveedorEliminadas: facturas,
            paginacion
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'No se pudo obtener la lista de facturas eliminadas' });
    }
};


// Reactivar facturas eliminadas
const reactivarFacturaProveedor = async (req, res) => {
    const { id } = req.params;

    if (req.usuario.tipo_user !== 'ADMIN') {
        return res.status(403).json({ msg: 'No tiene permisos para esta acción' });
    }

    const t = await db.transaction();

    try {
        const factura = await FacturaProveedor.findByPk(id, {
            include: { model: DetalleProveedor, as: 'detalles' },
            transaction: t
        });

        if (!factura) {
            await t.rollback();
            return res.status(404).json({ msg: 'Factura no encontrada' });
        }

        if (factura.estado_fp !== false) {
            await t.rollback();
            return res.status(400).json({ msg: 'La factura no se encuentra eliminada' });
        }

        // reactivar una COMPRA = volver a SUMAR al stock lo que habia sumado.
        // (antes se validaba que hubiera stock y se restaba, que es lo de una
        // VENTA). Aca no hace falta validar cantidades: sumar nunca deja el
        // stock en negativo, solo se comprueba que los productos sigan existiendo.
        const { errores } = await reponerStockDeCompra(factura.detalles, t);

        // si hay un error cancelar la operacion
        if (errores.length > 0) {
            await t.rollback();
            return res.status(400).json({
                msg: 'No se puede reactivar la factura',
                errores
            });
        }

        // marcar la factura como activa otra vez
        await factura.update({ estado_fp: true }, { transaction: t });

        await t.commit();

        const facturaReactivada = await FacturaProveedor.findByPk(factura.id_fact_prov, {
            include: [
                { 
                    model: Proveedor, 
                    as: 'proveedor',
                    attributes: ['nombre_prov', 'nit_prov', 'correo_prov']
                },
                { 
                    model: Usuario, 
                    as: 'usuario', 
                    attributes: ['nombre_user', 'apellido_user'] 
                },
                { 
                    model: Empresa, 
                    as: 'empresa', 
                    attributes: ['nombre_empresa'] 
                },
                {
                    model: DetalleProveedor,
                    as: 'detalles',
                    include: { 
                        model: Producto, 
                        as: 'producto', 
                        attributes: ['nombre_prod']                         
                    }
                }
            ]
        });

        res.json({
            msg: 'Factura reactivada correctamente',
            facturaCompleta: facturaReactivada
        });

    } catch (error) {
        await t.rollback();
        console.log(error);
        res.status(500).json({ msg: 'No se pudo reactivar la factura' });
    }
};


// generar Facuras PDF
const generarPDFFacturaProveedor = async (req, res) => {
    try {
        const { id } = req.params;

        const factura = await FacturaProveedor.findByPk(id, {
            include: [
                { model: Proveedor, as: 'proveedor', attributes: ['nombre_prov', 'nit_prov', 'correo_prov'] },
                { model: Empresa, as: 'empresa', attributes: ['nombre_empresa', 'nit_empresa', 'cel_empresa'] },
                {
                    model: DetalleProveedor,
                    as: 'detalles',
                    include: { model: Producto, as: 'producto', attributes: ['nombre_prod'] },
                    attributes: ['precio_dp_compra', 'cantidad_dp_compra']
                }
            ]
        });

        if (!factura) {
            return res.status(404).json({ msg: 'Factura no encontrada' });
        }

        const total = calcularTotalFactura(factura.detalles);
        const html = plantillaFacturaProveedor(factura, total);

        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=factura_${factura.id_fact_prov}.pdf`
        });
        res.send(pdfBuffer);

    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'No se pudo generar el PDF' });
    }
};




// exportamos 
export {
    registrarFacturaProveedor,
    listaFacturaProveedor,
    obtenerFacturaProveedro,
    obtenerTotalFactura,
    actualizarFacturaProveedor,
    elimnarFacturaProveedor,
    listaFacturaProveedorEliminadas,
    reactivarFacturaProveedor,
    generarPDFFacturaProveedor
};