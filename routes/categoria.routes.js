const { Router } = require('express');
const { 
    getAllCategories, 
    getCategoryById, 
    createCategory, 
    updateCategory, 
    deleteCategory 
} = require('../controllers/categoria.controller.js');

const router = Router();

// Obtener todas las categorías
router.get('/', getAllCategories);

// Obtener categoría por ID
router.get('/:id', getCategoryById);

// Crear nueva categoría
router.post('/', createCategory);

// Actualizar categoría
router.put('/:id', updateCategory);

// Eliminar categoría
router.delete('/:id', deleteCategory);

module.exports = router;
