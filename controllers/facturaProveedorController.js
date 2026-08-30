import puppeteer from 'puppeteer';
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


// enpont
const registrarFacturaProveedor = async (req, res) => {
    // elementos enviados por el usuario
    const {proveedor_id, empresa_fp_id, productos} = req.body;

    if (!proveedor_id || !empresa_fp_id || !Array.isArray(productos) || productos.length === 0) {
        const error = new Error('Debe indicar el proveedor, empresa y al menos un producto');
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
        const empresa = await Empresa.findByPk(empresa_fp_id);
        if (!empresa) {
            await t.rollback(); // revierte la transaction de DB
            return res.status(404).json({ msg: 'La empresa no existe' });
        }

        // Creamos la factura 
        const factura = await FacturaProveedor.create({
            proveedor_id,
            usuario_fp_id: req.usuario.id_usuario,
            empresa_fp_id,
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

// listar las facturas de proveedor
const listaFacturaProveedor = async (req, res) => {
    try {
        const factura = await FacturaProveedor.findAll({
            where: {estado_fp: true},
            order: [['fecha_fp', 'DESC']],
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

        // Validar si existe
        if (!factura) {
            return res.status(404).json({ msg: 'Facturas no encontradas' });
        }

        res.json({
            msg: 'Lista de Facturas obtenidas correctamente',
            listaFacturaProveedor: factura
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

        // 1. devolver el stock de los detalles actuales
        for (const detalle of factura.detalles) {
            const producto = await Producto.findByPk(detalle.producto_dp_id, { transaction: t });
            if (producto) {
                await producto.update({
                    cantidad_prod: producto.cantidad_prod - detalle.cantidad_dp_compra
                }, { transaction: t });
            }
        } // ------------- OJO ----------------------------

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

 // 4. crear los nuevos detalles, validando stock otra vez
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

        // devolver el stock de cada detalle
        for (const detalle of factura.detalles) {
            const producto = await Producto.findByPk(detalle.producto_dp_id, { transaction: t });
            if (producto) {
                await producto.update({
                    cantidad_prod: producto.cantidad_prod + detalle.cantidad_dp_compra
                }, { transaction: t });
            }
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
        const facturas = await FacturaProveedor.findAll({
            where: { estado_fp: false },
            order: [['fecha_fp', 'DESC']],
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
            msg: 'Lista de facturas eliminadas obtenida correctamente',
            listaFacturaProveedorEliminadas: facturas
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

        // 1. validar stock de todos los detalles antes de tocar nada
        const errores = [];
        const productosPorDetalle = [];

        for (const detalle of factura.detalles) { // detalle = va contener todo el detalle de esa factura
            const producto = await Producto.findByPk(detalle.producto_dp_id, { transaction: t });

            if (!producto) {
                errores.push(`El producto con id ${detalle.producto_dp_id} ya no existe, no se puede reactivar`);
                continue;
            }

            if (producto.cantidad_prod < detalle.cantidad_dp_compra) {
                errores.push(`No hay suficiente stock de "${producto.nombre_prod}" (disponible: ${producto.cantidad_prod}, requerido: ${detalle.cantidad_dp_compra})`);
                continue;
            }

            productosPorDetalle.push({ producto, detalle });
        }

        // si hay un error cancelar la operacion
        if (errores.length > 0) {
            await t.rollback();
            return res.status(400).json({
                msg: 'No se puede reactivar la factura',
                errores
            });
        }

        // 2. descontar el stock, ya validado que alcanza para todos
        for (const { producto, detalle } of productosPorDetalle) {
            await producto.update({
                cantidad_prod: producto.cantidad_prod - detalle.cantidad_dp_compra
            }, { transaction: t });
        }

        // 3. reactivar la factura
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