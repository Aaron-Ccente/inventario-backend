const db = require('../database/db.js');
const { createErrorResponse } = require('../utils/errorHandler.js');

/**
 * Obtiene todas las categorías
 */
const getAllCategories = (req, res) => {
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
            return res.status(500).json(createErrorResponse(err, 'categoria', 'obtener_todas'));
        }
        return res.status(200).json({ success: true, data: result });
    });
};

/**
 * Obtiene una categoría por ID
 */
const getCategoryById = (req, res) => {
    const { id } = req.params;
    const query = "SELECT * FROM categoria WHERE id_categoria = ?";
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'categoria', 'obtener_por_id'));
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
const createCategory = (req, res) => {
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
            return res.status(500).json(createErrorResponse(err, 'categoria', 'verificar_duplicado'));
        }
        
        if (result.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: `Ya existe una categoría con el nombre "${nombre.trim()}"` 
            });
        }
        
        // Si no existe, crear la nueva categoría
        const insertQuery = "INSERT INTO categoria (nombre, icono, descripcion) VALUES (?, ?, ?)";
        db.query(insertQuery, [nombre.trim(), icono, descripcion || null], (err, result) => {
            if (err) {
                return res.status(500).json(createErrorResponse(err, 'categoria', 'crear'));
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
const updateCategory = (req, res) => {
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
            return res.status(500).json(createErrorResponse(err, 'categoria', 'verificar_duplicado'));
        }
        
        if (result.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: `Ya existe otra categoría con el nombre "${nombre.trim()}"` 
            });
        }
        
        // Si no hay duplicados, actualizar la categoría
        const updateQuery = "UPDATE categoria SET nombre = ?, icono = ?, descripcion = ? WHERE id_categoria = ?";
        db.query(updateQuery, [nombre.trim(), icono, descripcion || null, id], (err, result) => {
            if (err) {
                return res.status(500).json(createErrorResponse(err, 'categoria', 'actualizar'));
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Categoría no encontrada" });
            }
            
            return res.status(200).json({ 
                success: true, 
                message: "Categoría actualizada exitosamente" 
            });
        });
    });
};

/**
 * Elimina una categoría
 */
const deleteCategory = (req, res) => {
    const { id } = req.params;
    
    // Verificar si la categoría tiene artículos asignados
    const checkArticlesQuery = "SELECT COUNT(*) as total FROM categoria_articulo WHERE id_categoria = ?";
    db.query(checkArticlesQuery, [id], (err, result) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'categoria', 'verificar_articulos'));
        }
        
        const totalArticles = result[0].total;
        
        if (totalArticles > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `No se puede eliminar la categoría porque tiene ${totalArticles} artículo(s) asignado(s). Primero debes reasignar o eliminar estos artículos.` 
            });
        }
        
        // Si no tiene artículos, eliminar la categoría
        const deleteQuery = "DELETE FROM categoria WHERE id_categoria = ?";
        db.query(deleteQuery, [id], (err, result) => {
            if (err) {
                return res.status(500).json(createErrorResponse(err, 'categoria', 'eliminar'));
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: "Categoría no encontrada" });
            }
            
            return res.status(200).json({ 
                success: true, 
                message: "Categoría eliminada exitosamente" 
            });
        });
    });
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
