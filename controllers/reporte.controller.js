const db = require('../database/db.js');
const { createErrorResponse } = require('../utils/errorHandler.js');

const generateGeneralReport = (req, res) => {
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
        res.json({
            success: true,
            data: result
        });
    });
};

module.exports = {
    generateGeneralReport
};