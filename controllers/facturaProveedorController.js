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


// enpont
const registrarFacturaProveedor = async (req, res) => {
    // elementos enviados por el usuario
    console.log(req.body)
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
                cantidad_dp_compra,
                precio_dp_compra: precio_compra
            }, {transaction:t});

            // guardamos los detalles en el array para una suma total
            detallesCreados.push(detalle);

            // aumentar el almacen
            await producto.update({
                cantidad_prod: producto.cantidad_prod + cantidad_dp_compra
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
            const { producto_dp_id, cantidad_dp_compra } = item;

            const producto = await Producto.findByPk(producto_dp_id, { transaction: t });

            if (!producto) {
                await t.rollback();
                return res.status(404).json({ msg: `El producto con id ${producto_dp_id} no existe` });
            }


            const detalle = await DetalleProveedor.create({
                producto_dp_id,
                fact_prov_id: factura.id_fact_prov,
                cantidad_dp_compra,
                precio_dp_compra: producto.precio_compra
            }, { transaction: t });

            detallesCreados.push(detalle);

            await producto.update({
                cantidad_prod: producto.cantidad_prod + cantidad_dp_compra
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



// exportamos 
export {
    registrarFacturaProveedor,
    listaFacturaProveedor,
    obtenerFacturaProveedro,
    obtenerTotalFactura,
    actualizarFacturaProveedor
}