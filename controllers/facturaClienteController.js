// controllers/facturaController.js
import puppeteer from 'puppeteer'; // para interpretar codigo html a pdf
import plantillaFacturaCliente from '../utils/plantillaFacturaCliente.js';
import db from '../config/db.js';
import { Op } from 'sequelize'; // Op = operadores de busqueda: Op.like, Op.or, Op.and, Op.gte, Op.lte
import { leerPaginacion } from '../helpers/paginar.js'; // calcula pagina, limite y offset desde la URL
import { FacturaCliente, DetalleCliente, Producto, Cliente, Empresa, Usuario } from '../associations/index.js';

// calcular factura
const calcularTotalFactura = (detalles) => {
    return detalles.reduce((total, detalle) => {
        return total + (detalle.cantidad_dc_venta * detalle.precio_dc_venta);
    }, 0);
};




const registrarFacturaCliente = async (req, res) => {
    const { cliente_id, productos } = req.body;
    // productos: [{ producto_dc_id, cantidad_dc_venta }, ...]
    //
    // OJO: ya NO se recibe "empresa_fc_id" del body. Antes el frontend lo
    // mandaba, y para eso necesitaba consultar GET /empresa primero -- pero
    // esa ruta es SOLO PARA ADMIN (ver empresaController.obtenerEmpresa), asi
    // que un usuario VENDEDOR nunca podia conseguir ese id y la factura
    // fallaba con "Debe indicar cliente, empresa y al menos un producto"
    // aunque hubiera elegido cliente y productos. La solucion: la empresa
    // SIEMPRE es la unica fila activa, el backend ya sabe cual es (es la
    // misma consulta que usa obtenerEmpresa) -- no hace falta que nadie se
    // la mande, y asi cualquier usuario logueado puede registrar una factura.

    if (!cliente_id || !Array.isArray(productos) || productos.length === 0) {
        const error = new Error('Debe indicar cliente y al menos un producto');
        return res.status(400).json({ msg: error.message });
    }

    const t = await db.transaction(); // pausa la transaccion de la base de datos no se ejecuta hasta verl el commit()

    try {
        const cliente = await Cliente.findByPk(cliente_id);
        if (!cliente) {
            await t.rollback();  // revierte la transaction
            return res.status(404).json({ msg: 'El cliente no existe' });
        }

        // la unica empresa activa -- no depende de lo que mande el frontend
        const empresa = await Empresa.findOne({
            where: { estado_empresa: true },
            transaction: t
        });
        if (!empresa) {
            await t.rollback(); // cancela la transaction de DB
            return res.status(404).json({ msg: 'No hay ninguna empresa registrada' });
        }

        // crear la cabecera de la factura
        const factura = await FacturaCliente.create({
            cliente_id,
            usuario_fc_id: req.usuario.id_usuario, // usuario autenticado, no del body
            empresa_fc_id: empresa.id_empresa,
            fecha_fc: new Date()
        }, { transaction: t }); // Se ejecuta esta transaccion sin importar el commit() pero queda en el estado de reposo si hay error se borra

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

            // creamos el detalleCliente
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
// =====================================================================
//  FILTROS + PAGINACION PARA LAS LISTAS DE FACTURAS (historial)
// =====================================================================
//  Antes el backend mandaba TODAS las facturas y el frontend filtraba con
//  .filter() en el navegador. Eso funciona con 20 facturas pero con 20.000
//  seria lento (viaja todo por la red y el navegador carga todo). Ahora
//  el backend hace el trabajo: la BASE DE DATOS filtra y entrega solo la
//  pagina que se esta viendo.
//
//  La URL puede traer 4 datos opcionales (query string):
//      ?busqueda=juan perez   -> texto para buscar por CLIENTE
//      ?desde=2026-10-01T05:00:00.000Z  -> fecha inicial de la FACTURA
//      ?hasta=2026-10-02T04:59:59.999Z  -> fecha final de la FACTURA
//      ?pagina=2&limite=5     -> paginacion (la lee leerPaginacion)
//  Si alguno no viene, simplemente no se aplica ese filtro.
// =====================================================================

// PASO 1 -- leerFecha: convierte el texto que llega por la URL en una
// fecha de verdad. Si viene vacio o con basura ("hola"), devuelve null
// en vez de reventar (new Date('hola') seria "Invalid Date").
const leerFecha = (valor) => {
    if (!valor) return null;                 // no vino el parametro
    const fecha = new Date(valor);           // intenta convertir el texto a fecha
    return Number.isNaN(fecha.getTime()) ? null : fecha; // getTime() es NaN si es invalida --- > 
    
    // .isNaN(..) => si NO se puede convertir en fecha = true

    // getTime() => devuelve los milesegundos de esa fecha
};

// PASO 2 -- escaparLike: en un LIKE los simbolos % y _ son comodines.
// Si el usuario escribe "50%" no queremos que % signifique "cualquier cosa",
// asi que les anteponemos una barra invertida para que cuenten como texto normal.
const escaparLike = (texto) => texto.replace(/[\\%_]/g, '\\$&');

// PASO 3 -- armarFiltrosFactura: construye el "WHERE" de la consulta.
//   estado -> true  = facturas activas, false = facturas eliminadas
//   query  -> req.query (lo que viene despues del ? en la URL)
// Devuelve { error } si los datos no son validos o { where } si todo bien.
const armarFiltrosFactura = (estado, query) => {
    // Condicion base: siempre filtramos por estado (activas o eliminadas).
    const where = { estado_fc: estado };

    // ---- Filtro por FECHA de la factura (casilla aparte en el frontend) ----
    const desde = leerFecha(query.desde);
    const hasta = leerFecha(query.hasta);

    // Si el usuario puso un rango al reves (desde mayor que hasta) no tiene
    // sentido: avisamos en vez de devolver una lista vacia misteriosa.
    if (desde && hasta && desde > hasta) {
        return { error: 'La fecha "desde" no puede ser mayor que la fecha "hasta"' };
    }

    // Op.gte = "mayor o igual" (>=), Op.lte = "menor o igual" (<=).
    // Se arma un objeto { [Op.gte]: desde, [Op.lte]: hasta } solo con las
    // partes que vinieron; asi se puede filtrar solo "desde", solo "hasta" o ambos.
    if (desde || hasta) {
        where.fecha_fc = {};
        if (desde) where.fecha_fc[Op.gte] = desde;
        if (hasta) where.fecha_fc[Op.lte] = hasta;
    }

    // ---- Filtro por CLIENTE (casilla de busqueda) ----
    const texto = (query.busqueda || '').toString().trim();
    if (texto) {
        // Separamos en palabras: "juan perez" -> ["juan", "perez"].
        // CADA palabra debe aparecer (AND) en el nombre, el apellido o la
        // cedula (OR) del cliente. Asi "juan perez" encuentra a "JUAN PEREZ"
        // aunque nombre y apellido esten en columnas distintas.
        const palabras = texto.split(/\s+/); // separa el texto en arrays

        where[Op.and] = palabras.map((palabra) => {
            const limpia = escaparLike(palabra); // valida caracteres especiales %
            return {
                [Op.or]: [
                    // '$cliente.nombre_cliente$' = columna de la tabla unida (alias "cliente")
                    { '$cliente.nombre_cliente$': { [Op.like]: `%${limpia.toUpperCase()}%` } },
                    { '$cliente.apellido_cliente$': { [Op.like]: `%${limpia.toUpperCase()}%` } },
                    // la cedula son numeros, no hace falta pasarla a mayusculas
                    { '$cliente.cedula_cliente$': { [Op.like]: `%${limpia}%` } }
                ]
            };
        });
    }

    return { where };
};

// PASO 4 -- consultarFacturasPaginadas: hace la consulta completa.
// Se hace en DOS PASOS a proposito:
//   Paso A: pedir SOLO los ids de la pagina (barato) aplicando filtros,
//           orden, limit y offset.  Aqui se une con "cliente" para poder buscar.
//   Paso B: con esos ids, pedir las facturas COMPLETAS (cliente, vendedor,
//           empresa, detalles y productos).
// Por que no todo junto? Cada factura tiene VARIOS detalles (hasMany). Si
// pones limit:5 sobre una consulta con hasMany, la base de datos cuenta filas
// de detalles y no facturas: podrias recibir 2 facturas en vez de 5.
const consultarFacturasPaginadas = async (estado, req) => {
    // 4.1 filtros
    const { where, error } = armarFiltrosFactura(estado, req.query);
    if (error) return { error };

    // 4.2 pagina, limite y offset (helper que ya usan clientes/usuarios)
    const { pagina, limite, offset } = leerPaginacion(req.query);

    // 4.3 orden: mas reciente primero; el id desempata si dos facturas
    // tienen la misma fecha (asi una factura nunca se repite ni se salta
    // entre una pagina y otra).
    const orden = [['fecha_fc', 'DESC'], ['id_fact_cli', 'DESC']];

    // 4.4 PASO A: solo ids + total.
    // findAndCountAll devuelve { count, rows }: count = total de facturas que
    // cumplen los filtros (sin importar la pagina) y rows = las de esta pagina.
    const { count, rows } = await FacturaCliente.findAndCountAll({
        where,
        attributes: ['id_fact_cli'],   // solo necesitamos el id
        include: [{
            model: Cliente,
            as: 'cliente',
            attributes: [],            // une la tabla para filtrar pero no trae sus columnas
            required: true             // INNER JOIN: solo facturas que tengan cliente
        }],
        order: orden,
        limit: limite,
        offset,
        raw: true                      // objetos simples, mas rapido
    });

    const ids = rows.map((fila) => fila.id_fact_cli);

    // 4.5 PASO B: facturas completas de esos ids (misma forma que antes,
    // asi el frontend no cambia la forma en que lee cada factura).
    let facturas = [];
    if (ids.length > 0) {
        facturas = await FacturaCliente.findAll({
            where: { id_fact_cli: ids },   // WHERE id_fact_cli IN (ids)
            order: orden,                  // el mismo orden que en el paso A
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
    }

    // 4.6 datos de paginacion: la misma forma que usan clientes y usuarios,
    // asi el componente <Paginacion /> del frontend funciona sin cambios.
    const paginacion = {
        total: count,                              // cuantas facturas cumplen los filtros
        totalPaginas: Math.ceil(count / limite),   // redondeo hacia arriba: 11 facturas / 5 = 3 paginas
        paginaActual: pagina,
        limite
    };

    return { facturas, paginacion };
};

// LISTA DE FACTURAS ACTIVAS (con filtros y paginacion)
const listaFacturaCliente = async (req, res) => {
    try {
        const { facturas, paginacion, error } = await consultarFacturasPaginadas(true, req);

        if (error) {
            return res.status(400).json({ msg: error });
        }

        res.json({
            msg: 'Lista de Facturas obtenidas correctamente',
            listaFacturaCliente: facturas,
            paginacion
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
// LISTA DE FACTURAS ELIMINADAS (mismos filtros y paginacion, estado_fc = false)
const listaFacturaClienteEliminadas = async (req, res) => {
    try {
        const { facturas, paginacion, error } = await consultarFacturasPaginadas(false, req);

        if (error) {
            return res.status(400).json({ msg: error });
        }

        res.json({
            msg: 'Lista de facturas eliminadas obtenida correctamente',
            listaFacturaClienteEliminadas: facturas,
            paginacion
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

// factura PDF
const generarPDFFacturaCliente = async (req, res) => {
    try {
        const { id } = req.params;

        const factura = await FacturaCliente.findByPk(id, {
            include: [
                { 
                    model: Cliente, 
                    as: 'cliente', 
                    attributes: ['nombre_cliente', 'apellido_cliente', 'cedula_cliente', 'correo_cliente'] 
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

        if (!factura) {
            return res.status(404).json({ msg: 'Factura no encontrada' });
        }

        const total = calcularTotalFactura(factura.detalles);
        const html = plantillaFacturaCliente(factura, total);

        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // ancho de recibo térmico, alto automático según el contenido
        const pdfBuffer = await page.pdf({
            width: '80mm',
            height: '297mm', // alto grande, se recorta al contenido real al imprimir
            printBackground: true
        });

        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=recibo_${factura.id_fact_cli}.pdf`
        });
        res.send(pdfBuffer);

    } catch (error) {
        console.log(error);
        if (!res.headersSent) {
            res.status(500).json({ msg: 'No se pudo generar el recibo' });
        }
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
    reactivarFacturaCliente,
    generarPDFFacturaCliente
};