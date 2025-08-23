const { Router } = require('express');
const { 
    getAllArticles, 
    getArticleById, 
    getArticlesByCategory, 
    createArticle, 
    updateArticle, 
    deleteArticle, 
    updateStock,
    findDuplicateArticlesByName
} = require('../controllers/articulo.controller.js');

const router = Router();

// Obtener todos los artículos
router.get('/', getAllArticles);

// Obtener artículo por ID
router.get('/:id', getArticleById);

// Obtener artículos por categoría
router.get('/categoria/:categoriaId', getArticlesByCategory);

// Buscar artículos duplicados por nombre
router.get('/duplicados/:nombre', findDuplicateArticlesByName);

// Crear nuevo artículo
router.post('/', createArticle);

// Actualizar artículo
router.put('/:id', updateArticle);

// Actualizar stock
router.patch('/:id/stock', updateStock);

// Eliminar artículo
router.delete('/:id', deleteArticle);

module.exports = router;
