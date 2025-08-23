const db = require('../database/db.js');

/**
 * Obtiene todos los artículos de una categoría
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
 * Obtiene todas las categorías de un artículo
 */
const getCategoriesByArticle = (req, res) => {
    const { articuloId } = req.params;
    const query = `
        SELECT c.* FROM categoria c
        INNER JOIN categoria_articulo ca ON c.id_categoria = ca.id_categoria
        WHERE ca.id_articulo = ?
    `;
    
    db.query(query, [articuloId], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        return res.status(200).json({ success: true, data: result });
    });
};

/**
 * Asigna un artículo a una categoría
 */
const assignArticleToCategory = (req, res) => {
    const { id_categoria, id_articulo } = req.body;
    
    // Verificar que la relación no exista ya
    const checkQuery = "SELECT * FROM categoria_articulo WHERE id_categoria = ? AND id_articulo = ?";
    db.query(checkQuery, [id_categoria, id_articulo], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        
        if (result.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: "El artículo ya está asignado a esta categoría" 
            });
        }
        
        // Crear la relación
        const insertQuery = "INSERT INTO categoria_articulo (id_categoria, id_articulo) VALUES (?, ?)";
        db.query(insertQuery, [id_categoria, id_articulo], (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }
            return res.status(201).json({ success: true, message: "Artículo asignado a la categoría exitosamente" });
        });
    });
};

/**
 * Remueve un artículo de una categoría
 */
const removeArticleFromCategory = (req, res) => {
    const { categoriaId, articuloId } = req.params;
    const query = "DELETE FROM categoria_articulo WHERE id_categoria = ? AND id_articulo = ?";
    
    db.query(query, [categoriaId, articuloId], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Relación no encontrada" });
        }
        return res.status(200).json({ success: true, message: "Artículo removido de la categoría exitosamente" });
    });
};

module.exports = {
    getArticlesByCategory,
    getCategoriesByArticle,
    assignArticleToCategory,
    removeArticleFromCategory
};
