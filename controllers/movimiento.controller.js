import db from '../database/db.js';

/**
 * Obtiene todos los movimientos
 */
export const getAllMovements = (req, res) => {
    const query = "SELECT * FROM movimiento ORDER BY fecha DESC";
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        return res.status(200).json({ success: true, data: result });
    });
};

/**
 * Obtiene movimientos por artículo
 */
export const getMovementsByArticle = (req, res) => {
    const { articuloId } = req.params;
    const query = "SELECT * FROM movimiento WHERE id_articulo = ? ORDER BY fecha DESC";
    db.query(query, [articuloId], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        return res.status(200).json({ success: true, data: result });
    });
};

/**
 * Crea un nuevo movimiento
 */
export const createMovement = (req, res) => {
    const { accion, doc, detalle, cantidad, costo_unidad, id_articulo } = req.body;
    
    // Primero creamos el movimiento
    const movementQuery = "INSERT INTO movimiento (accion, doc, detalle, cantidad, costo_unidad, id_articulo) VALUES (?, ?, ?, ?, ?, ?)";
    
    db.query(movementQuery, [accion, doc, detalle, cantidad, costo_unidad, id_articulo], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        
        // Actualizamos el stock del artículo
        const stockUpdate = accion === 'ENTRADA' ? 
            "UPDATE articulo SET stock = stock + ? WHERE id_articulo = ?" :
            "UPDATE articulo SET stock = stock - ? WHERE id_articulo = ?";
        
        db.query(stockUpdate, [cantidad, id_articulo], (stockErr, stockResult) => {
            if (stockErr) {
                return res.status(500).json({ success: false, message: "Error al actualizar stock: " + stockErr.message });
            }
            return res.status(201).json({ 
                success: true, 
                message: "Movimiento creado exitosamente", 
                id: result.insertId 
            });
        });
    });
};

/**
 * Obtiene un movimiento por ID
 */
export const getMovementById = (req, res) => {
    const { id } = req.params;
    const query = "SELECT * FROM movimiento WHERE id_movimiento = ?";
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "Movimiento no encontrado" });
        }
        return res.status(200).json({ success: true, data: result[0] });
    });
};

/**
 * Elimina un movimiento
 */
export const deleteMovement = (req, res) => {
    const { id } = req.params;
    
    // Primero obtenemos los datos del movimiento para revertir el stock
    const getQuery = "SELECT * FROM movimiento WHERE id_movimiento = ?";
    db.query(getQuery, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "Movimiento no encontrado" });
        }
        
        const movement = result[0];
        const stockRevert = movement.accion === 'ENTRADA' ? 
            "UPDATE articulo SET stock = stock - ? WHERE id_articulo = ?" :
            "UPDATE articulo SET stock = stock + ? WHERE id_articulo = ?";
        
        db.query(stockRevert, [movement.cantidad, movement.id_articulo], (stockErr) => {
            if (stockErr) {
                return res.status(500).json({ success: false, message: "Error al revertir stock: " + stockErr.message });
            }
            
            // Eliminamos el movimiento
            const deleteQuery = "DELETE FROM movimiento WHERE id_movimiento = ?";
            db.query(deleteQuery, [id], (deleteErr, deleteResult) => {
                if (deleteErr) {
                    return res.status(500).json({ success: false, message: deleteErr.message });
                }
                return res.status(200).json({ success: true, message: "Movimiento eliminado exitosamente" });
            });
        });
    });
};
