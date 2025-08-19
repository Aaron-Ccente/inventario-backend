import db from "../database/db.js";
import { getFriendlyErrorMessage, createErrorResponse } from '../utils/errorHandler.js';

/**
 * Obtiene todos los artículos
 */
export const getAllArticles = (req, res) => {
    const query = "SELECT * FROM articulo";
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        return res.status(200).json({ success: true, data: result });
    });
};

/**
 * Obtiene un artículo por ID
 */
export const getArticleById = (req, res) => {
    const { id } = req.params;
    const query = "SELECT * FROM articulo WHERE id_articulo = ?";
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "Artículo no encontrado" });
        }
        return res.status(200).json({ success: true, data: result[0] });
    });
};

/**
 * Obtiene artículos por categoría
 */
export const getArticlesByCategory = (req, res) => {
    const { categoriaId } = req.params;
    
    const query = `
        SELECT a.* FROM articulo a
        INNER JOIN categoria_articulo ca ON a.id_articulo = ca.id_articulo
        WHERE ca.id_categoria = ?
    `;
    
    db.query(query, [categoriaId], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        
        return res.status(200).json({ success: true, data: result });
    });
};

/**
 * Crea un nuevo artículo
 */
export const createArticle = (req, res) => {
    const { codigo, nombre, unidad, detalle, fecha_vencimiento, otros, stock, id_categoria } = req.body;
    
    // Validar campos requeridos
    if (!codigo || !nombre || !unidad) {
        return res.status(400).json({ 
            success: false, 
            message: "Los campos código, nombre y unidad son requeridos" 
        });
    }

    // Verificar si ya existe un artículo con el mismo código en la misma categoría
    const checkQuery = "SELECT a.id_articulo FROM articulo a INNER JOIN categoria_articulo ca ON a.id_articulo = ca.id_articulo WHERE a.codigo = ? AND ca.id_categoria = ?";
    db.query(checkQuery, [codigo, id_categoria], (err, result) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'articulo', 'verificar_duplicado'));
        }
        
        if (result.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: `Ya existe un artículo con el código "${codigo}" en esta categoría` 
            });
        }
        
        // Si no existe, crear el nuevo artículo
        const insertQuery = "INSERT INTO articulo (codigo, nombre, unidad, detalle, fecha_vencimiento, otros, stock) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(insertQuery, [codigo, nombre, unidad, detalle, fecha_vencimiento, otros, stock], (err, result) => {
            if (err) {
                return res.status(500).json(createErrorResponse(err, 'articulo', 'crear'));
            }
            
            const articleId = result.insertId;
            
            // Si se proporciona una categoría, crear la relación
            if (id_categoria) {
                const categoryQuery = "INSERT INTO categoria_articulo (id_categoria, id_articulo) VALUES (?, ?)";
                db.query(categoryQuery, [id_categoria, articleId], (err, categoryResult) => {
                                    if (err) {
                    // Si falla la creación de la relación, eliminar el artículo creado
                    db.query("DELETE FROM articulo WHERE id_articulo = ?", [articleId]);
                    return res.status(500).json(createErrorResponse(err, 'articulo', 'asignar_categoria'));
                }
                    
                    return res.status(201).json({ 
                        success: true, 
                        message: "Artículo creado exitosamente y categoría asignada", 
                        id: articleId,
                        id_categoria: id_categoria
                    });
                });
            } else {
                return res.status(201).json({ 
                    success: true, 
                    message: "Artículo creado exitosamente", 
                    id: articleId 
                });
            }
        });
    });
};

/**
 * Actualiza un artículo
 */
export const updateArticle = (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, unidad, detalle, fecha_vencimiento, otros, stock } = req.body;
    const query = "UPDATE articulo SET codigo = ?, nombre = ?, unidad = ?, detalle = ?, fecha_vencimiento = ?, otros = ?, stock = ? WHERE id_articulo = ?";
    
    db.query(query, [codigo, nombre, unidad, detalle, fecha_vencimiento, otros, stock, id], (err, result) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'articulo', 'actualizar'));
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Artículo no encontrado" });
        }
        return res.status(200).json({ success: true, message: "Artículo actualizado exitosamente" });
    });
};

/**
 * Elimina un artículo
 */
export const deleteArticle = (req, res) => {
    const { id } = req.params;
    
    // Iniciar transacción para eliminar en cascada
    db.beginTransaction((err) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'articulo', 'eliminar_transaccion'));
        }
        
        // Primero verificar si el artículo tiene movimientos
        const checkMovementsQuery = "SELECT COUNT(*) as total FROM movimiento WHERE id_articulo = ?";
        db.query(checkMovementsQuery, [id], (err, movementResult) => {
            if (err) {
                return db.rollback(() => {
                    res.status(500).json(createErrorResponse(err, 'articulo', 'verificar_movimientos'));
                });
            }
            
            const totalMovements = movementResult[0].total;
            
            // Eliminar todos los movimientos del artículo
            if (totalMovements > 0) {
                const deleteMovementsQuery = "DELETE FROM movimiento WHERE id_articulo = ?";
                db.query(deleteMovementsQuery, [id], (err, deleteMovementsResult) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json(createErrorResponse(err, 'articulo', 'eliminar_movimientos'));
                        });
                    }
                    
                    // Continuar con la eliminación del artículo
                    deleteArticleAndRelations();
                });
            } else {
                // No hay movimientos, continuar directamente
                deleteArticleAndRelations();
            }
            
            // Función para eliminar artículo y relaciones
            function deleteArticleAndRelations() {
                // Eliminar la relación en categoria_articulo
                const deleteRelationQuery = "DELETE FROM categoria_articulo WHERE id_articulo = ?";
                db.query(deleteRelationQuery, [id], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json(createErrorResponse(err, 'articulo', 'eliminar_relacion'));
                        });
                    }
                    
                    // Luego eliminar el artículo
                    const deleteArticleQuery = "DELETE FROM articulo WHERE id_articulo = ?";
                    db.query(deleteArticleQuery, [id], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json(createErrorResponse(err, 'articulo', 'eliminar_articulo'));
                            });
                        }
                        
                        if (result.affectedRows === 0) {
                            return db.rollback(() => {
                                res.status(404).json({ success: false, message: "Artículo no encontrado" });
                            });
                        }
                        
                        // Commit de la transacción
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => {
                                    res.status(500).json(createErrorResponse(err, 'articulo', 'commit_eliminacion'));
                                });
                            }
                            
                            const responseMessage = totalMovements > 0 
                                ? `Artículo eliminado exitosamente junto con ${totalMovements} movimientos registrados`
                                : "Artículo eliminado exitosamente";
                            
                            return res.status(200).json({ 
                                success: true, 
                                message: responseMessage,
                                data: {
                                    movimientos_eliminados: totalMovements
                                }
                            });
                        });
                    });
                });
            }
        });
    });
};

/**
 * Actualiza el stock de un artículo
 */
export const updateStock = (req, res) => {
    const { id } = req.params;
    const { stock } = req.body;
    const query = "UPDATE articulo SET stock = ? WHERE id_articulo = ?";
    
    db.query(query, [stock, id], (err, result) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'articulo', 'actualizar_stock'));
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Artículo no encontrado" });
        }
        return res.status(200).json({ success: true, message: "Stock actualizado exitosamente" });
    });
};