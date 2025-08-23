const db = require("../database/db.js");
const { getFriendlyErrorMessage, createErrorResponse } = require('../utils/errorHandler.js');

/**
 * Obtiene todos los artículos
 */
const getAllArticles = (req, res) => {
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
const getArticleById = (req, res) => {
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
const getArticlesByCategory = (req, res) => {
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
const createArticle = (req, res) => {
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
        // La fecha de vencimiento es opcional, si está vacía se guarda como null
        const fechaVencimiento = fecha_vencimiento && fecha_vencimiento.trim() !== '' ? fecha_vencimiento : null;
        
        const insertQuery = "INSERT INTO articulo (codigo, nombre, unidad, detalle, fecha_vencimiento, otros, stock) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(insertQuery, [codigo, nombre, unidad, detalle, fechaVencimiento, otros, stock], (err, result) => {
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
                        message: "Artículo creado exitosamente",
                        data: { id: articleId, codigo, nombre, unidad }
                    });
                });
            } else {
                return res.status(201).json({ 
                    success: true, 
                    message: "Artículo creado exitosamente",
                    data: { id: articleId, codigo, nombre, unidad }
                });
            }
        });
    });
};

/**
 * Actualiza un artículo
 */
const updateArticle = (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, unidad, detalle, fecha_vencimiento, otros, stock } = req.body;
    
    // La fecha de vencimiento es opcional, si está vacía se guarda como null
    const fechaVencimiento = fecha_vencimiento && fecha_vencimiento.trim() !== '' ? fecha_vencimiento : null;
    
    const query = "UPDATE articulo SET codigo = ?, nombre = ?, unidad = ?, detalle = ?, fecha_vencimiento = ?, otros = ?, stock = ? WHERE id_articulo = ?";
    db.query(query, [codigo, nombre, unidad, detalle, fechaVencimiento, otros, stock, id], (err, result) => {
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
 * Actualiza el stock de un artículo
 */
const updateStock = (req, res) => {
    const { id } = req.params;
    const { stock } = req.body;
    
    if (stock === undefined || stock < 0) {
        return res.status(400).json({ success: false, message: "El stock debe ser un número mayor o igual a 0" });
    }
    
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

/**
 * Elimina un artículo
 */
const deleteArticle = (req, res) => {
    const { id } = req.params;
    
    // Iniciar transacción para eliminación en cascada
    db.beginTransaction((err) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'articulo', 'iniciar_transaccion'));
        }
        
        // Primero eliminar todos los movimientos relacionados
        const deleteMovementsQuery = "DELETE FROM movimiento WHERE id_articulo = ?";
        db.query(deleteMovementsQuery, [id], (err, movementsResult) => {
            if (err) {
                return db.rollback(() => {
                    res.status(500).json(createErrorResponse(err, 'articulo', 'eliminar_movimientos'));
                });
            }
            
            // Luego eliminar las relaciones con categorías
            const deleteCategoryQuery = "DELETE FROM categoria_articulo WHERE id_articulo = ?";
            db.query(deleteCategoryQuery, [id], (err, categoryResult) => {
                if (err) {
                    return db.rollback(() => {
                        res.status(500).json(createErrorResponse(err, 'articulo', 'eliminar_relaciones'));
                    });
                }
                
                // Finalmente eliminar el artículo
                const deleteArticleQuery = "DELETE FROM articulo WHERE id_articulo = ?";
                db.query(deleteArticleQuery, [id], (err, articleResult) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json(createErrorResponse(err, 'articulo', 'eliminar'));
                        });
                    }
                    
                    if (articleResult.affectedRows === 0) {
                        return db.rollback(() => {
                            res.status(404).json({ success: false, message: "Artículo no encontrado" });
                        });
                    }
                    
                    // Commit de la transacción
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json(createErrorResponse(err, 'articulo', 'commit'));
                            });
                        }
                        
                        return res.status(200).json({ 
                            success: true, 
                            message: "Artículo y todos sus registros relacionados eliminados exitosamente" 
                        });
                    });
                });
            });
        });
    });
};

/**
 * Busca artículos duplicados por nombre y devuelve información detallada
 */
const findDuplicateArticlesByName = (req, res) => {
    const { nombre } = req.params;
    
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ 
            success: false, 
            message: "El nombre del artículo es requerido" 
        });
    }
    
    const query = `
        SELECT 
            a.id_articulo,
            a.codigo,
            a.nombre,
            c.id_categoria,
            c.nombre as categoria_nombre,
            c.icono as categoria_icono
        FROM articulo a
        INNER JOIN categoria_articulo ca ON a.id_articulo = ca.id_articulo
        INNER JOIN categoria c ON ca.id_categoria = c.id_categoria
        WHERE a.nombre = ?
        ORDER BY c.nombre, a.codigo
    `;
    
    db.query(query, [nombre.trim()], (err, result) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'articulo', 'buscar_duplicados'));
        }
        
        if (result.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: "No se encontraron artículos con ese nombre",
                data: []
            });
        }
        
        return res.status(200).json({ 
            success: true, 
            message: `Se encontraron ${result.length} artículo(s) con el nombre "${nombre}"`,
            data: result
        });
    });
};

module.exports = {
    getAllArticles,
    getArticleById,
    getArticlesByCategory,
    createArticle,
    updateArticle,
    updateStock,
    deleteArticle,
    findDuplicateArticlesByName
};