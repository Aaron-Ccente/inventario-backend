const express = require('express');
const { createMovement, getArticleMovements, getAllMovements } = require('../controllers/movimiento.controller.js');

const router = express.Router();

// Crear nuevo movimiento
router.post('/', createMovement);

// Obtener movimientos de un artículo
router.get('/articulo/:id', getArticleMovements);

// Obtener todos los movimientos
router.get('/', getAllMovements);

module.exports = router;
