const { Router } = require('express');
const { 
    getArticlesByCategory, 
    getCategoriesByArticle, 
    assignArticleToCategory, 
    removeArticleFromCategory 
} = require('../controllers/categoria_articulo.controller.js');

const router = Router();

// Obtener artículos por categoría
router.get('/categoria/:categoriaId', getArticlesByCategory);

// Obtener categorías por artículo
router.get('/articulo/:articuloId', getCategoriesByArticle);

// Asignar artículo a categoría
router.post('/', assignArticleToCategory);

// Remover artículo de categoría
router.delete('/:categoriaId/:articuloId', removeArticleFromCategory);

module.exports = router;
