// controllers/facturaController.js
import db from '../config/db.js';
import { FacturaCliente, DetalleCliente, Producto, Cliente, Empresa, Usuario } from '../associations/index.js';

// calcular factura
const calcularTotalFactura = (detalles) => {
    return detalles.reduce((total, detalle) => {
        return total + (detalle.cantidad_dc_venta * detalle.precio_dc_venta);
    }, 0);
};




const registrarFacturaCliente = async (req, res) => {
    const { cliente_id, empresa_fc_id, productos } = req.body;
    // productos: [{ producto_dc_id, cantidad_dc_venta }, ...]

    if (!cliente_id || !empresa_fc_id || !Array.isArray(productos) || productos.length === 0) {
        const error = new Error('Debe indicar cliente, empresa y al menos un producto');
        return res.status(400).json({ msg: error.message });
    }

    const t = await db.transaction(); // pausa la transaccion de la base de datos no se ejecuta hasta verl el commit()

    try {
        const cliente = await Cliente.findByPk(cliente_id);
        if (!cliente) {
            await t.rollback();  // revierte la transaction
            return res.status(404).json({ msg: 'El cliente no existe' });
        }

        const empresa = await Empresa.findByPk(empresa_fc_id);
        if (!empresa) {
            await t.rollback(); // cancela la transaction de DB
            return res.status(404).json({ msg: 'La empresa no existe' });
        }

        // crear la cabecera de la factura
        const factura = await FacturaCliente.create({
            cliente_id,
            usuario_fc_id: req.usuario.id_usuario, // usuario autenticado, no del body
            empresa_fc_id,
            fecha_fc: new Date()
        }, { transaction: t }); // Se ejecuta esta transaccion sin importar el commit()

        // creamos lista para los detalle y su total
        const detallesCreados = [];

        // crear el detalle de cada producto vendido
        for (const item of productos) { // este for es para que respete las promesas el forEach no la respeta en los await se pierde
            const { producto_dc_id, cantidad_dc_venta } = item;

            const producto = await Producto.findByPk(producto_dc_id, { transaction: t });

            if (!producto) {
                await t.rollback();  // cancela la transaction de DB
                return res.status(404).json({ msg: `El producto con id ${producto_dc_id} no existe` });
            }

            if (producto.cantidad_prod < cantidad_dc_venta) {
                await t.rollback();  // cancela la transaction de DB
                return res.status(400).json({ msg: `No hay suficiente stock de "${producto.nombre_prod}"` });
            }

            const detalle = await DetalleCliente.create({
                producto_dc_id,
                fact_cli_id: factura.id_fact_cli,
                cantidad_dc_venta,
                precio_dc_venta: producto.precio_venta // el precio se toma del producto, no del cliente
            }, { transaction: t }); // Se ejecuta esta transaccion sin importar el commit()

            detallesCreados.push(detalle);

            // descontar el stock vendido
            await producto.update({
                cantidad_prod: producto.cantidad_prod - cantidad_dc_venta
            }, { transaction: t }); // Se ejecuta esta transaccion sin importar el commit()
        }

        await t.commit();  // confirma la transaction de DB y guarda en la base de datos

        const total = calcularTotalFactura(detallesCreados);

        const facturaCompleta = await FacturaCliente.findByPk(factura.id_fact_cli, {
            include: [
                { 
                    model: Cliente, 
                    as: 'cliente',
                    attributes: ['nombre_cliente', 'apellido_cliente', 'cedula_cliente']
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
                    model: DetalleCliente,
                    as: 'detalles',
                    include: { 
                        model: Producto, 
                        as: 'producto',
                        attributes: ['nombre_prod']
                    },
                    attributes: ['precio_dc_venta', 'cantidad_dc_venta']
                }
            ]
        });

        res.json({
            msg: 'Factura registrada correctamente',
            total,
            factura: facturaCompleta
        });

    } catch (error) {
        await t.rollback();
        console.log(error);
        res.status(500).json({ msg: 'No se pudo registrar la factura' });
    }
};

// Obtiene la factura 
const listaFacturaCliente = async (req, res) => {
    try {

        const factura = await FacturaCliente.findAll({
            where: {estado_fc: true},
            order: [['fecha_fc', 'DESC']], // ordena las facturas mas reciente primero
            include: [
                {
                    model: Cliente,
                    as: 'cliente',
                    attributes: ['nombre_cliente', 'apellido_cliente', 'cedula_cliente']
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
                    model: DetalleCliente,
                    as: 'detalles',
                    attributes: ['precio_dc_venta', 'cantidad_dc_venta'],
                    include: {
                        model: Producto,
                        as: 'producto',
                        attributes: ['nombre_prod']
                    }
                }
            ]
        });

        if (!factura) {
            return res.status(404).json({ msg: 'Facturas no encontradas' });
        }

        res.json({
            msg: 'Lista de Facturas obtenidas correctamente',
            listaFacturaCliente: factura
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'No se pudo obtener la lista de las facturas' });
    }
};

// Obtiene la factura 
const obtenerFacturaCliente = async (req, res) => {
    try {
        const { id } = req.params;

        const factura = await FacturaCliente.findByPk(id, {
            where: {id_fact_cli: id},
            include: [
                {
                    model: Cliente,
                    as: 'cliente',
                    attributes: ['nombre_cliente', 'apellido_cliente', 'cedula_cliente']
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
                    model: DetalleCliente,
                    as: 'detalles',
                    attributes: ['precio_dc_venta', 'cantidad_dc_venta'],
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
};


// Calcula el total de facturas
const obtenerTotalFactura = async (req, res) => {
    try {
        const { id } = req.params;

        const factura = await FacturaCliente.findByPk(id, {
            include: {
                model: DetalleCliente,
                as: 'detalles'
            }
        });

        if (!factura) {
            return res.status(404).json({ msg: 'Factura no encontrada' });
        }

        const total = calcularTotalFactura(factura.detalles);

        res.json({ 
            id_fact_cli: factura.id_fact_cli, 
            total 
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'No se pudo calcular el total' });
    }
};

// actualizar una factura y su detalle
const actualizarFacturaCliente = async (req, res) => {
    const { id } = req.params;
    const { cliente_id, empresa_fc_id, productos } = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ msg: 'Debe indicar al menos un producto' });
    }

    if (req.usuario.tipo_user !== 'ADMIN') {
        return res.status(403).json({ msg: 'No tiene permisos para esta acción' });
    }

    const t = await db.transaction();

    try {
        const factura = await FacturaCliente.findByPk(id, {
            include: { model: DetalleCliente, as: 'detalles' },
            transaction: t
        });

        if (!factura) {
            await t.rollback();
            return res.status(404).json({ msg: 'Factura no encontrada' });
        }

        if (factura.estado_fc === false) {
            await t.rollback();
            return res.status(400).json({ msg: 'No se puede actualizar una factura eliminada' });
        }

        // 1. devolver el stock de los detalles actuales
        for (const detalle of factura.detalles) {
            const producto = await Producto.findByPk(detalle.producto_dc_id, { transaction: t });
            if (producto) {
                await producto.update({
                    cantidad_prod: producto.cantidad_prod + detalle.cantidad_dc_venta
                }, { transaction: t });
            }
        }

        // 2. borrar los detalles actuales
        await DetalleCliente.destroy({
            where: { fact_cli_id: factura.id_fact_cli },
            transaction: t
        });

        // 3. actualizar cliente/empresa si vinieron en el body
        await factura.update({
            cliente_id: cliente_id ?? factura.cliente_id,
            empresa_fc_id: empresa_fc_id ?? factura.empresa_fc_id
        }, { transaction: t });

        // 4. crear los nuevos detalles, validando stock otra vez
        const detallesCreados = [];

        for (const item of productos) {
            const { producto_dc_id, cantidad_dc_venta } = item;

            const producto = await Producto.findByPk(producto_dc_id, { transaction: t });

            if (!producto) {
                await t.rollback();
                return res.status(404).json({ msg: `El producto con id ${producto_dc_id} no existe` });
            }

            if (producto.cantidad_prod < cantidad_dc_venta) {
                await t.rollback();
                return res.status(400).json({ msg: `No hay suficiente stock de "${producto.nombre_prod}"` });
            }

            const detalle = await DetalleCliente.create({
                producto_dc_id,
                fact_cli_id: factura.id_fact_cli,
                cantidad_dc_venta,
                precio_dc_venta: producto.precio_venta
            }, { transaction: t });

            detallesCreados.push(detalle);

            await producto.update({
                cantidad_prod: producto.cantidad_prod - cantidad_dc_venta
            }, { transaction: t });
        }

        await t.commit();

        const total = calcularTotalFactura(detallesCreados);

        const facturaActualizada = await FacturaCliente.findByPk(factura.id_fact_cli, {
            include: [
                { model: Cliente, as: 'cliente', attributes: ['nombre_cliente', 'apellido_cliente'] },
                { model: Usuario, as: 'usuario', attributes: ['nombre_user', 'apellido_user'] },
                { model: Empresa, as: 'empresa', attributes: ['nombre_empresa'] },
                {
                    model: DetalleCliente,
                    as: 'detalles',
                    include: { model: Producto, as: 'producto', attributes: ['nombre_prod'] }
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
};

// eliminar (soft delete) una factura y devolver el stock de sus productos
const eliminarFacturaCliente = async (req, res) => {
    const { id } = req.params;

    if (req.usuario.tipo_user !== 'ADMIN') {
        return res.status(403).json({ msg: 'No tiene permisos para esta acción' });
    }

    const t = await db.transaction();

    try {
        const factura = await FacturaCliente.findByPk(id, {
            include: { model: DetalleCliente, as: 'detalles' },
            transaction: t
        });

        if (!factura) {
            await t.rollback();
            return res.status(404).json({ msg: 'Factura no encontrada' });
        }

        if (factura.estado_fc === false) {
            await t.rollback();
            return res.status(400).json({ msg: 'La factura ya se encuentra eliminada' });
        }

        // devolver el stock de cada detalle
        for (const detalle of factura.detalles) {
            const producto = await Producto.findByPk(detalle.producto_dc_id, { transaction: t });
            if (producto) {
                await producto.update({
                    cantidad_prod: producto.cantidad_prod + detalle.cantidad_dc_venta
                }, { transaction: t });
            }
        }

        // marcar como eliminada en vez de borrar la fila
        await factura.update({ estado_fc: false }, { transaction: t });

        await t.commit();

        res.json({ msg: 'Factura eliminada correctamente' });

    } catch (error) {
        await t.rollback();
        console.log(error);
        res.status(500).json({ msg: 'No se pudo eliminar la factura' });
    }
};

// lista solo las facturas eliminadas
const listaFacturaClienteEliminadas = async (req, res) => {
    try {
        const facturas = await FacturaCliente.findAll({
            where: { estado_fc: false },
            order: [['fecha_fc', 'DESC']],
            include: [
                { model: Cliente, as: 'cliente', attributes: ['nombre_cliente', 'apellido_cliente', 'cedula_cliente'] },
                { model: Usuario, as: 'usuario', attributes: ['nombre_user', 'apellido_user', 'cedula_user', 'tipo_user'] },
                { model: Empresa, as: 'empresa', attributes: ['nombre_empresa', 'nit_empresa', 'cel_empresa'] },
                {
                    model: DetalleCliente,
                    as: 'detalles',
                    attributes: ['precio_dc_venta', 'cantidad_dc_venta'],
                    include: { model: Producto, as: 'producto', attributes: ['nombre_prod'] }
                }
            ]
        });

        res.json({
            msg: 'Lista de facturas eliminadas obtenida correctamente',
            listaFacturaClienteEliminadas: facturas
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'No se pudo obtener la lista de facturas eliminadas' });
    }
};

// reactivar una factura eliminada, validando stock de TODOS los productos antes de descontar nada
const reactivarFacturaCliente = async (req, res) => {
    const { id } = req.params;

    if (req.usuario.tipo_user !== 'ADMIN') {
        return res.status(403).json({ msg: 'No tiene permisos para esta acción' });
    }

    const t = await db.transaction();

    try {
        const factura = await FacturaCliente.findByPk(id, {
            include: { model: DetalleCliente, as: 'detalles' },
            transaction: t
        });

        if (!factura) {
            await t.rollback();
            return res.status(404).json({ msg: 'Factura no encontrada' });
        }

        if (factura.estado_fc !== false) {
            await t.rollback();
            return res.status(400).json({ msg: 'La factura no se encuentra eliminada' });
        }

        // 1. validar stock de todos los detalles antes de tocar nada
        const errores = [];
        const productosPorDetalle = [];

        for (const detalle of factura.detalles) { // detalle = va contener todo el detalle de esa factura
            const producto = await Producto.findByPk(detalle.producto_dc_id, { transaction: t });

            if (!producto) {
                errores.push(`El producto con id ${detalle.producto_dc_id} ya no existe, no se puede reactivar`);
                continue;
            }

            if (producto.cantidad_prod < detalle.cantidad_dc_venta) {
                errores.push(`No hay suficiente stock de "${producto.nombre_prod}" (disponible: ${producto.cantidad_prod}, requerido: ${detalle.cantidad_dc_venta})`);
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
                cantidad_prod: producto.cantidad_prod - detalle.cantidad_dc_venta
            }, { transaction: t });
        }

        // 3. reactivar la factura
        await factura.update({ estado_fc: true }, { transaction: t });

        await t.commit();

        const facturaReactivada = await FacturaCliente.findByPk(factura.id_fact_cli, {
            include: [
                { model: Cliente, as: 'cliente', attributes: ['nombre_cliente', 'apellido_cliente'] },
                { model: Usuario, as: 'usuario', attributes: ['nombre_user', 'apellido_user'] },
                { model: Empresa, as: 'empresa', attributes: ['nombre_empresa'] },
                {
                    model: DetalleCliente,
                    as: 'detalles',
                    include: { model: Producto, as: 'producto', attributes: ['nombre_prod'] }
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

export { 
    registrarFacturaCliente,
    obtenerTotalFactura,
    obtenerFacturaCliente,
    listaFacturaCliente,
    actualizarFacturaCliente,
    eliminarFacturaCliente,
    listaFacturaClienteEliminadas,
    reactivarFacturaCliente
};