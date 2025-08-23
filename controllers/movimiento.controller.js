const db = require('../database/db.js');
const { createErrorResponse } = require('../utils/errorHandler.js');

/**
 * Crea un nuevo movimiento de artículo
 */
const createMovement = (req, res) => {
    const { id_articulo, accion, doc, detalle, cantidad, costo_unidad } = req.body;
    
    // Validar campos requeridos
    if (!id_articulo || !accion || !cantidad) {
        return res.status(400).json({
            success: false,
            message: "Los campos artículo, acción y cantidad son requeridos"
        });
    }

    // Validar que la acción sea válida
    if (!['ENTRADA', 'SALIDA'].includes(accion)) {
        return res.status(400).json({
            success: false,
            message: "La acción debe ser 'ENTRADA' o 'SALIDA'"
        });
    }

    // Validar que la cantidad sea positiva
    if (parseFloat(cantidad) <= 0) {
        return res.status(400).json({
            success: false,
            message: "La cantidad debe ser mayor a 0"
        });
    }

    // Para entradas, validar que se proporcione costo unitario
    if (accion === 'ENTRADA' && (!costo_unidad || parseFloat(costo_unidad) <= 0)) {
        return res.status(400).json({
            success: false,
            message: "Para entradas, el costo unitario es requerido y debe ser mayor a 0"
        });
    }

    // Iniciar transacción
    db.beginTransaction((err) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'movimiento', 'iniciar_transaccion'));
        }

        // Verificar que el artículo existe
        const checkArticleQuery = "SELECT id_articulo, stock FROM articulo WHERE id_articulo = ?";
        db.query(checkArticleQuery, [id_articulo], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    res.status(500).json(createErrorResponse(err, 'movimiento', 'verificar_articulo'));
                });
            }

            if (result.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({
                        success: false,
                        message: "El artículo especificado no existe"
                    });
                });
            }

            const currentStock = parseFloat(result[0].stock) || 0;
            let newStock = currentStock;

            // Calcular nuevo stock
            if (accion === 'ENTRADA') {
                const cantidadFloat = parseFloat(cantidad);
                newStock = currentStock + cantidadFloat;
            } else if (accion === 'SALIDA') {
                const cantidadFloat = parseFloat(cantidad);
                // Verificar que hay suficiente stock para la salida
                if (currentStock < cantidadFloat) {
                    return db.rollback(() => {
                        res.status(400).json({
                            success: false,
                            message: `Stock insuficiente. Stock actual: ${currentStock}, Cantidad solicitada: ${cantidad}`
                        });
                    });
                }
                newStock = currentStock - cantidadFloat;
            }

            // Crear el movimiento
            const insertMovementQuery = "INSERT INTO movimiento (id_articulo, accion, doc, detalle, cantidad, costo_unidad) VALUES (?, ?, ?, ?, ?, ?)";
            const movementValues = [
                id_articulo,
                accion,
                doc || null,
                detalle || null,
                cantidad,
                accion === 'SALIDA' ? null : costo_unidad
            ];

            db.query(insertMovementQuery, movementValues, (err, movementResult) => {
                if (err) {
                    return db.rollback(() => {
                        res.status(500).json(createErrorResponse(err, 'movimiento', 'crear'));
                    });
                }

                // Actualizar el stock del artículo
                const updateStockQuery = "UPDATE articulo SET stock = ? WHERE id_articulo = ?";
                db.query(updateStockQuery, [newStock, id_articulo], (err, stockResult) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json(createErrorResponse(err, 'movimiento', 'actualizar_stock'));
                        });
                    }

                    // Commit de la transacción
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json(createErrorResponse(err, 'movimiento', 'commit'));
                            });
                        }

                        return res.status(201).json({
                            success: true,
                            message: `Movimiento de ${accion.toLowerCase()} registrado exitosamente`,
                            data: {
                                id: movementResult.insertId,
                                stock_anterior: currentStock,
                                stock_nuevo: newStock,
                                diferencia: accion === 'ENTRADA' ? cantidad : -cantidad
                            }
                        });
                    });
                });
            });
        });
    });
};

/**
 * Obtiene los movimientos de un artículo específico
 */
const getArticleMovements = (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT m.*, a.nombre as nombre_articulo, a.codigo
        FROM movimiento m
        INNER JOIN articulo a ON m.id_articulo = a.id_articulo
        WHERE m.id_articulo = ?
        ORDER BY m.fecha DESC
    `;
    
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'movimiento', 'obtener_por_articulo'));
        }
        
        return res.status(200).json({ success: true, data: result });
    });
};

/**
 * Obtiene todos los movimientos del sistema
 */
const getAllMovements = (req, res) => {
    const query = `
        SELECT m.*, a.nombre as nombre_articulo, a.codigo
        FROM movimiento m
        INNER JOIN articulo a ON m.id_articulo = a.id_articulo
        ORDER BY m.fecha DESC
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'movimiento', 'obtener_todos'));
        }
        
        return res.status(200).json({ success: true, data: result });
    });
};

module.exports = {
    createMovement,
    getArticleMovements,
    getAllMovements
};
