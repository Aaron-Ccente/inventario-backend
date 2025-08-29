const express = require('express');
const router = express.Router();
const { generateGeneralReport } = require('../controllers/reporte.controller.js');


// Ruta para generar el informe general en PDF
router.get('/general', generateGeneralReport);

module.exports = router;
