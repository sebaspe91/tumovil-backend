const plantillaFacturaCliente = (factura, total) => {
    const filas = factura.detalles.map(d => {
        const subtotal = d.cantidad_dc_venta * d.precio_dc_venta;
        return `
        <div class="item">
            <div class="item-nombre">${d.producto.nombre_prod}</div>
            <div class="item-detalle">
                <span>${d.cantidad_dc_venta} x $${d.precio_dc_venta.toLocaleString()}</span>
                <span class="num">$${subtotal.toLocaleString()}</span>
            </div>
        </div>
        `;
    }).join('');

    return `
    <html>
    <head>
        <style>
            @page { size: 80mm auto; margin: 0; }

            body {
                width: 280px;
                margin: 0 auto;
                padding: 15px 10px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                color: #000;
            }

            .center { text-align: center; }
            .bold { font-weight: bold; }

            .linea-punteada {
                border-top: 1px dashed #000;
                margin: 8px 0;
            }

            .encabezado h1 {
                font-size: 15px;
                margin: 0 0 2px 0;
            }
            .encabezado p {
                margin: 0;
                font-size: 11px;
            }

            .datos p {
                margin: 2px 0;
            }

            .item { margin: 6px 0; }
            .item-nombre { font-weight: bold; }
            .item-detalle {
                display: flex;
                justify-content: space-between;
                font-variant-numeric: tabular-nums;
            }
            .item-detalle .num { text-align: right; }

            .total-row {
                display: flex;
                justify-content: space-between;
                font-size: 14px;
                font-weight: bold;
                margin-top: 6px;
                font-variant-numeric: tabular-nums;
            }

            .footer {
                text-align: center;
                margin-top: 15px;
                font-size: 11px;
            }
        </style>
    </head>
    <body>
        <div class="encabezado center">
            <h1>${factura.empresa.nombre_empresa}</h1>
            <p>NIT: ${factura.empresa.nit_empresa}</p>
            <p>Tel: ${factura.empresa.cel_empresa}</p>
        </div>

        <div class="linea-punteada"></div>

        <div class="datos">
            <p>Recibo N°: ${factura.id_fact_cli}</p>
            <p>Fecha: ${new Date(factura.fecha_fc).toLocaleDateString()} ${new Date(factura.fecha_fc).toLocaleTimeString()}</p>
            <p>Cliente: ${factura.cliente.nombre_cliente}</p>
            <p>CC: ${factura.cliente.cedula_cliente}</p>
        </div>

        <div class="linea-punteada"></div>

        ${filas}

        <div class="linea-punteada"></div>

        <div class="total-row">
            <span>TOTAL</span>
            <span>$${total.toLocaleString()}</span>
        </div>

        <div class="linea-punteada"></div>

        <div class="footer">
            <p>¡Gracias por su compra!</p>
        </div>
    </body>
    </html>
    `;
};

export default plantillaFacturaCliente;