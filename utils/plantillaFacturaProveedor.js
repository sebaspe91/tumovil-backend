const plantillaFacturaProveedor = (factura, total) => {
    const filas = factura.detalles.map(d => `
        <tr>
            <td>${d.producto.nombre_prod}</td>
            <td class="num">${d.cantidad_dp_compra}</td>
            <td class="num">$${d.precio_dp_compra.toLocaleString()}</td>
            <td class="num">$${(d.cantidad_dp_compra * d.precio_dp_compra).toLocaleString()}</td>
        </tr>
    `).join(''); // une todos los array en un solo string sin separador para insertarlo en el HTML

    return `
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
            h1 { font-size: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f2f2f2; }

            /* Columnas numéricas: alineadas a la derecha y con dígitos de ancho fijo */
            th.num, td.num {
                text-align: right;
                font-variant-numeric: tabular-nums;
            }

            .total { text-align: right; font-weight: bold; margin-top: 10px; }
        </style>
    </head>
    <body>
        <h1>${factura.empresa.nombre_empresa}</h1>
        <p>NIT: ${factura.empresa.nit_empresa} | Tel: ${factura.empresa.cel_empresa}</p>
        <hr/>
        <p><strong>Factura N°:</strong> ${factura.id_fact_prov}</p>
        <p><strong>Proveedor:</strong> ${factura.proveedor.nombre_prov} (NIT ${factura.proveedor.nit_prov})</p>
        <p><strong>Fecha:</strong> ${new Date(factura.fecha_fp).toLocaleDateString()}</p>

        <table>
            <thead>
                <tr>
                    <th>Producto</th>
                    <th class="num">Cantidad</th>
                    <th class="num">Precio</th>
                    <th class="num">Subtotal</th>
                </tr>
            </thead>
            <tbody>${filas}</tbody>
        </table>

        <p class="total">Total: $${total.toLocaleString()}</p>
    </body>
    </html>
    `;
};

export default plantillaFacturaProveedor;