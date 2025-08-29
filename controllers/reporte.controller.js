const db = require('../database/db.js');
const { createErrorResponse } = require('../utils/errorHandler.js');

const limpiarNombreCategoria = (nombre) => {
    if (!nombre) return '';
    
    return nombre
        .normalize('NFD')                    
        .replace(/[\u0300-\u036f]/g, '')     
        .replace(/[Ø=Ü»]/g, '')              
        .replace(/[^\w\s]/g, '')           
        .replace(/\s+/g, ' ')               
        .trim()                            
        || 'Categoría';                      
};

let PDFDocument;
try {
    PDFDocument = require('pdfkit');
} catch (error) {
    console.warn('PDFKit no está instalado. Instalando con: npm install pdfkit');
    PDFDocument = null;
}

const generateGeneralReport = (req, res) => {
    if (!PDFDocument) {
        return res.status(500).json({
            success: false,
            message: 'PDFKit no está instalado. Ejecuta: npm install pdfkit'
        });
    }

    const query = `
        SELECT 
            c.id_categoria,
            c.nombre as nombre_categoria,
            c.icono as icono_categoria,
            a.id_articulo,
            a.codigo,
            a.nombre as nombre_articulo,
            a.unidad,
            a.stock,
            a.detalle,
            COALESCE(a.stock, 0) as stock_actual,
            (SELECT COUNT(*) FROM movimiento m WHERE m.id_articulo = a.id_articulo) as total_movimientos,
            (SELECT 
                COALESCE(SUM(
                    CASE 
                        WHEN m.accion = 'ENTRADA' THEN m.cantidad 
                        WHEN m.accion = 'SALIDA' THEN -m.cantidad 
                        ELSE 0 
                    END
                ), 0)
                FROM movimiento m 
                WHERE m.id_articulo = a.id_articulo
            ) as total_movimientos_acumulado
        FROM categoria c
        LEFT JOIN categoria_articulo ca ON c.id_categoria = ca.id_categoria
        LEFT JOIN articulo a ON ca.id_articulo = a.id_articulo
        ORDER BY c.nombre, a.nombre
    `;

    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'reporte', 'obtener_datos'));
        }

        // Crear el documento PDF
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            autoFirstPage: true,
            bufferPages: true
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=informe_general_articulos.pdf');
        doc.pipe(res);
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Informe General de Todos los Artículos', {
               align: 'center'
           })
           .moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica')
           .text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES', {
               year: 'numeric',
               month: 'long',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
           })}`, {
               align: 'center'
           })
           .moveDown(2);

        const categorias = {};
        result.forEach(row => {
            if (!categorias[row.nombre_categoria]) {
                categorias[row.nombre_categoria] = {
                    icono: row.icono_categoria,
                    articulos: []
                };
            }
            if (row.id_articulo) {
                // Calcular stock inicial y final
                let stockInicial = 0;
                let stockFinal = row.stock_actual;
                if (row.total_movimientos === 0) {
                    stockInicial = row.stock_actual;
                    stockFinal = row.stock_actual;
                } else {
                    stockFinal = row.stock_actual;
                    stockInicial = row.stock_actual - row.total_movimientos_acumulado;
                }
                
                categorias[row.nombre_categoria].articulos.push({
                    codigo: row.codigo,
                    nombre: row.nombre_articulo,
                    unidad: row.unidad,
                    stock_inicial: stockInicial,
                    stock_final: stockFinal,
                    detalle: row.detalle,
                    total_movimientos: row.total_movimientos
                });
            }
        });
        Object.keys(categorias).forEach((nombreCategoria, index) => {
            const categoria = categorias[nombreCategoria];
            const nombreCategoriaLimpio = limpiarNombreCategoria(nombreCategoria);
            doc.fontSize(16)
               .font('Helvetica-Bold')
               .text(`${nombreCategoriaLimpio}`, {
                   underline: true
               })
               .moveDown(0.5);

            if (categoria.articulos.length === 0) {
                doc.fontSize(10)
                   .font('Helvetica-Oblique')
                   .text('No hay artículos en esta categoría.')
                   .moveDown(1);
            } else {
                const tableTop = doc.y;
                const tableLeft = 50;
                const columnWidths = [80, 150, 80, 100, 100];
                const columns = [
                    { name: 'Código', width: columnWidths[0] },
                    { name: 'Artículo', width: columnWidths[1] },
                    { name: 'Unidad', width: columnWidths[2] },
                    { name: 'Stock Inicial', width: columnWidths[3] },
                    { name: 'Stock Final', width: columnWidths[4] }
                ];
                
                const rowHeight = 25;
                let currentX = tableLeft;
                const columnPositions = columns.map((col, index) => {
                    const pos = currentX;
                    currentX += col.width;
                    return pos;
                });
                
                // Encabezados de la tabla
                doc.fontSize(10).font('Helvetica-Bold');
                
                columns.forEach((col, i) => {
                    const x = columnPositions[i];
                    const maxWidth = columnWidths[i];
                    const textWidth = doc.widthOfString(col.name);
                    const centerX = x + (maxWidth - textWidth) / 2;
                    
                    doc.text(col.name, centerX, tableTop);
                });
                const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
                doc.moveTo(tableLeft, tableTop + 15)
                   .lineTo(tableLeft + totalWidth, tableTop + 15)
                   .stroke();
                doc.fontSize(9).font('Helvetica');
                
                categoria.articulos.forEach((articulo, rowIndex) => {
                    const y = tableTop + 20 + (rowIndex * rowHeight);
                    if (y > 750) {
                        doc.addPage();
                                                 doc.fontSize(16)
                            .font('Helvetica-Bold')
                            .text(`${nombreCategoriaLimpio} (continuación)`, {
                                underline: true
                            })
                           .moveDown(0.5);
                        const newTableTop = doc.y;
                        doc.fontSize(10).font('Helvetica-Bold');
                        columns.forEach((col, i) => {
                            const x = columnPositions[i];
                            const maxWidth = columnWidths[i];
                            const textWidth = doc.widthOfString(col.name);
                            const centerX = x + (maxWidth - textWidth) / 2;
                            
                            doc.text(col.name, centerX, newTableTop);
                        });
                        doc.moveTo(tableLeft, newTableTop + 15)
                           .lineTo(tableLeft + totalWidth, newTableTop + 15)
                           .stroke();
                        
                        doc.fontSize(9).font('Helvetica');
                        const newY = newTableTop + 20;
                        const dataToDraw = [
                            articulo.codigo,
                            articulo.nombre,
                            articulo.unidad,
                            articulo.stock_inicial.toString(),
                            articulo.stock_final.toString()
                        ];
                        
                        dataToDraw.forEach((data, i) => {
                            const x = columnPositions[i];
                            const maxWidth = columnWidths[i];
                            if (i === 0 || i === 2) {
                                const textWidth = doc.widthOfString(data);
                                const centerX = x + (maxWidth - textWidth) / 2;
                                doc.text(data, centerX, newY);
                            }
                            else if (i === 1) {
                                doc.text(data.substring(0, 20), x + 5, newY);
                            }
                            else {
                                const textWidth = doc.widthOfString(data);
                                const centerX = x + (maxWidth - textWidth) / 2;
                                doc.text(data, centerX, newY);
                            }
                        });
                    } else {
                        const dataToDraw = [
                            articulo.codigo,
                            articulo.nombre,
                            articulo.unidad,
                            articulo.stock_inicial.toString(),
                            articulo.stock_final.toString()
                        ];
                        
                        dataToDraw.forEach((data, i) => {
                            const x = columnPositions[i];
                            const maxWidth = columnWidths[i];
                            if (i === 0 || i === 2) {
                                const textWidth = doc.widthOfString(data);
                                const centerX = x + (maxWidth - textWidth) / 2;
                                doc.text(data, centerX, y);
                            }
                            else if (i === 1) {
                                doc.text(data.substring(0, 20), x + 5, y);
                            }
                            else {
                                const textWidth = doc.widthOfString(data);
                                const centerX = x + (maxWidth - textWidth) / 2;
                                doc.text(data, centerX, y);
                            }
                        });
                    }
                });

                doc.moveDown(2);
            }
            if (index < Object.keys(categorias).length - 1) {
                doc.addPage();
            }
        });
        doc.end();
    });
};

module.exports = {
    generateGeneralReport
};
