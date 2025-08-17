import db from '../database/db.js';

/**
 * Obtiene todas las categorías
 */
export const getAllCategories = (req, res) => {
    const query = `
        SELECT c.*, 
               COALESCE(COUNT(ca.id_articulo), 0) as total_articulos
        FROM categoria c
        LEFT JOIN categoria_articulo ca ON c.id_categoria = ca.id_categoria
        GROUP BY c.id_categoria, c.nombre, c.icono, c.descripcion
        ORDER BY c.nombre
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        return res.status(200).json({ success: true, data: result });
    });
};

/**
 * Obtiene una categoría por ID
 */
export const getCategoryById = (req, res) => {
    const { id } = req.params;
    const query = "SELECT * FROM categoria WHERE id_categoria = ?";
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "Categoría no encontrada" });
        }
        return res.status(200).json({ success: true, data: result[0] });
    });
};

/**
 * Crea una nueva categoría
 */
export const createCategory = (req, res) => {
    const { nombre, icono, descripcion } = req.body;
    
    // Validar que se proporcione un nombre
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ success: false, message: "El nombre de la categoría es requerido" });
    }
    
    // Validar que se proporcione un icono
    if (!icono) {
        return res.status(400).json({ success: false, message: "El icono de la categoría es requerido" });
    }
    
    // Verificar si ya existe una categoría con el mismo nombre
    const checkQuery = "SELECT id_categoria FROM categoria WHERE nombre = ?";
    db.query(checkQuery, [nombre.trim()], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        
        if (result.length > 0) {
            return res.status(409).json({ success: false, message: "Ya existe una categoría con ese nombre" });
        }
        
        // Si no existe, crear la nueva categoría
        const insertQuery = "INSERT INTO categoria (nombre, icono, descripcion) VALUES (?, ?, ?)";
        db.query(insertQuery, [nombre.trim(), icono, descripcion || null], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            return res.status(201).json({ 
                success: true, 
                message: "Categoría creada exitosamente", 
                id: result.insertId,
                nombre: nombre.trim(),
                icono: icono,
                descripcion: descripcion
            });
        });
    });
};

/**
 * Actualiza una categoría
 */
export const updateCategory = (req, res) => {
    const { id } = req.params;
    const { nombre, icono, descripcion } = req.body;
    
    // Validar que se proporcione un nombre
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ success: false, message: "El nombre de la categoría es requerido" });
    }
    
    // Verificar si ya existe otra categoría con el mismo nombre (excluyendo la actual)
    const checkQuery = "SELECT id_categoria FROM categoria WHERE nombre = ? AND id_categoria != ?";
    db.query(checkQuery, [nombre.trim(), id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        
        if (result.length > 0) {
            return res.status(409).json({ success: false, message: "Ya existe otra categoría con ese nombre" });
        }
        
        // Actualizar la categoría
        const updateQuery = "UPDATE categoria SET nombre = ?, icono = ?, descripcion = ? WHERE id_categoria = ?";
        db.query(updateQuery, [nombre.trim(), icono, descripcion || null, id], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Categoría no encontrada" });
            }
            return res.status(200).json({ 
                success: true, 
                message: "Categoría actualizada exitosamente",
                data: { nombre: nombre.trim(), icono, descripcion }
            });
        });
    });
};

/**
 * Elimina una categoría
 */
export const deleteCategory = (req, res) => {
    const { id } = req.params;
    
    // Primero verificar si la categoría tiene artículos
    const checkArticlesQuery = "SELECT COUNT(*) as count FROM categoria_articulo WHERE id_categoria = ?";
    
    db.query(checkArticlesQuery, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        
        const hasArticles = result[0].count > 0;
        
        // Iniciar transacción para eliminar en cascada
        db.beginTransaction((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            
            // Si hay artículos, eliminarlos primero
            if (hasArticles) {
                // Obtener IDs de artículos relacionados
                const getArticlesQuery = "SELECT id_articulo FROM categoria_articulo WHERE id_categoria = ?";
                db.query(getArticlesQuery, [id], (err, articlesResult) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: err.message });
                        });
                    }
                    
                    if (articlesResult.length > 0) {
                        const articleIds = articlesResult.map(article => article.id_articulo);
                        
                        // Eliminar relaciones primero
                        const deleteRelationsQuery = "DELETE FROM categoria_articulo WHERE id_categoria = ?";
                        db.query(deleteRelationsQuery, [id], (err) => {
                            if (err) {
                                return db.rollback(() => {
                                    res.status(500).json({ success: false, message: err.message });
                                });
                            }
                            
                            // Eliminar artículos
                            const deleteArticlesQuery = "DELETE FROM articulo WHERE id_articulo IN (?)";
                            db.query(deleteArticlesQuery, [articleIds], (err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        res.status(500).json({ success: false, message: err.message });
                                    });
                                }
                                
                                // Finalmente eliminar la categoría
                                const deleteCategoryQuery = "DELETE FROM categoria WHERE id_categoria = ?";
                                db.query(deleteCategoryQuery, [id], (err, result) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            res.status(500).json({ success: false, message: err.message });
                                        });
                                    }
                                    
                                    if (result.affectedRows === 0) {
                                        return db.rollback(() => {
                                            res.status(404).json({ success: false, message: "Categoría no encontrada" });
                                        });
                                    }
                                    
                                    // Commit de la transacción
                                    db.commit((err) => {
                                        if (err) {
                                            return db.rollback(() => {
                                                res.status(500).json({ success: false, message: err.message });
                                            });
                                        }
                                        
                                        return res.status(200).json({ 
                                            success: true, 
                                            message: `Categoría eliminada exitosamente junto con ${articlesResult.length} artículos relacionados`,
                                            articlesDeleted: articlesResult.length
                                        });
                                    });
                                });
                            });
                        });
                    } else {
                        // No hay artículos, solo eliminar la categoría
                        const deleteCategoryQuery = "DELETE FROM categoria WHERE id_categoria = ?";
                        db.query(deleteCategoryQuery, [id], (err, result) => {
                            if (err) {
                                return db.rollback(() => {
                                    res.status(500).json({ success: false, message: err.message });
                                });
                            }
                            
                            if (result.affectedRows === 0) {
                                return db.rollback(() => {
                                    res.status(404).json({ success: false, message: "Categoría no encontrada" });
                                });
                            }
                            
                            // Commit de la transacción
                            db.commit((err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        res.status(500).json({ success: false, message: err.message });
                                    });
                                }
                                
                                return res.status(200).json({ 
                                    success: true, 
                                    message: "Categoría eliminada exitosamente",
                                    articlesDeleted: 0
                                });
                            });
                        });
                    }
                });
            } else {
                // No hay artículos, solo eliminar la categoría
                const deleteCategoryQuery = "DELETE FROM categoria WHERE id_categoria = ?";
                db.query(deleteCategoryQuery, [id], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: err.message });
                        });
                    }
                    
                    if (result.affectedRows === 0) {
                        return db.rollback(() => {
                            res.status(404).json({ success: false, message: "Categoría no encontrada" });
                        });
                    }
                    
                    // Commit de la transacción
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json({ success: false, message: err.message });
                            });
                        }
                        
                        return res.status(200).json({ 
                            success: true, 
                            message: "Categoría eliminada exitosamente",
                            articlesDeleted: 0
                        });
                    });
                });
            }
        });
    });
};
