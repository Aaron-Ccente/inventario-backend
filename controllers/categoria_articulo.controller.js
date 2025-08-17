import db from '../database/db.js';

/**
 * Asigna una categoría a un artículo
 */
export const assignCategoryToArticle = (req, res) => {
    const { id_categoria, id_articulo } = req.body;
    const query = "INSERT INTO categoria_articulo (id_categoria, id_articulo) VALUES (?, ?)";
    
    db.query(query, [id_categoria, id_articulo], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        return res.status(201).json({ success: true, message: "Categoría asignada exitosamente" });
    });
};

/**
 * Obtiene todas las categorías de un artículo
 */
export const getArticleCategories = (req, res) => {
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
 * Elimina la relación entre un artículo y una categoría
 */
export const removeCategoryFromArticle = (req, res) => {
    const { id_categoria, id_articulo } = req.params;
    const query = "DELETE FROM categoria_articulo WHERE id_categoria = ? AND id_articulo = ?";
    
    db.query(query, [id_categoria, id_articulo], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Relación no encontrada" });
        }
        return res.status(200).json({ success: true, message: "Categoría removida del artículo exitosamente" });
    });
};
