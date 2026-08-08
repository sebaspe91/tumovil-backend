import { Op } from 'sequelize';
import Categoria from "../models/Categoria.js";
import Marca from "../models/Marca.js";

const generarCodigo = async (categoria_id, marca_id, Producto, idExcluir = null) => {
    const categoria = await Categoria.findByPk(categoria_id);
    const marca = await Marca.findByPk(marca_id);

    if (!categoria || !marca) {
        throw new Error('Categoría o marca no válida para generar codigo');
    }

    const prefijo = `${categoria.codigo_categoria}${marca.codigo_marca}`;

    const whereClause = {
        codigo_prod: { [Op.like]: `${prefijo}-%` }
    };

    if (idExcluir) {
        whereClause.id_producto = { [Op.ne]: idExcluir };
    }

    const productosPrefijo = await Producto.findAll({
        where: whereClause,
        attributes: ['codigo_prod']
    });

    let siguienteNumero = 1;

    if (productosPrefijo.length > 0) {
        const numeros = productosPrefijo.map(p => parseInt(p.codigo_prod.split('-')[1], 10));
        siguienteNumero = Math.max(...numeros) + 1;
    }

    const numeroFormateado = String(siguienteNumero).padStart(3, '0');

    return `${prefijo}-${numeroFormateado}`;
};

export default generarCodigo;