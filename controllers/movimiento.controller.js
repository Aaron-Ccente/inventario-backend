const db = require('../database/db.js');
const { createErrorResponse } = require('../utils/errorHandler.js');

/**
 * Crea un nuevo movimiento de artículo
 */
const createMovement = async (req, res) => {
  const { id_articulo, accion, doc, detalle, cantidad, costo_unidad } = req.body;

  // Validar campos requeridos
  if (!id_articulo || !accion || !cantidad) {
    return res.status(400).json({
      success: false,
      message: "Los campos artículo, acción y cantidad son requeridos"
    });
  }

  // Validar que la acción sea válida
  if (!['ENTRADA', 'SALIDA'].includes(accion)) {
    return res.status(400).json({
      success: false,
      message: "La acción debe ser 'ENTRADA' o 'SALIDA'"
    });
  }

  // Validar que la cantidad sea positiva
  if (parseFloat(cantidad) <= 0) {
    return res.status(400).json({
      success: false,
      message: "La cantidad debe ser mayor a 0"
    });
  }

  // Para entradas, validar costo unitario
  if (accion === 'ENTRADA' && (!costo_unidad || parseFloat(costo_unidad) <= 0)) {
    return res.status(400).json({
      success: false,
      message: "Para entradas, el costo unitario es requerido y debe ser mayor a 0"
    });
  }

  let connection;

  try {
    // 1️. Obtener conexión del pool
    connection = await db.promise().getConnection();

    // 2️. Iniciar transacción
    await connection.beginTransaction();

    // 3️. Verificar artículo
    const [result] = await connection.query(
      "SELECT id_articulo, stock FROM articulo WHERE id_articulo = ?",
      [id_articulo]
    );

    if (result.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "El artículo especificado no existe"
      });
    }

    const currentStock = parseFloat(result[0].stock) || 0;
    let newStock = currentStock;
    const cantidadFloat = parseFloat(cantidad);

    // Calcular nuevo stock
    if (accion === 'ENTRADA') {
      newStock = currentStock + cantidadFloat;
    } else {
      if (currentStock < cantidadFloat) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente. Stock actual: ${currentStock}, Cantidad solicitada: ${cantidad}`
        });
      }
      newStock = currentStock - cantidadFloat;
    }

    // 4️⃣ Crear movimiento
    const [movementResult] = await connection.query(
      `INSERT INTO movimiento 
       (id_articulo, accion, doc, detalle, cantidad, costo_unidad)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id_articulo,
        accion,
        doc || null,
        detalle || null,
        cantidadFloat,
        accion === 'SALIDA' ? null : costo_unidad
      ]
    );

    // 5️⃣ Actualizar stock
    await connection.query(
      "UPDATE articulo SET stock = ? WHERE id_articulo = ?",
      [newStock, id_articulo]
    );

    // 6️⃣ Commit
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: `Movimiento de ${accion.toLowerCase()} registrado exitosamente`,
      data: {
        id: movementResult.insertId,
        stock_anterior: currentStock,
        stock_nuevo: newStock,
        diferencia: accion === 'ENTRADA' ? cantidadFloat : -cantidadFloat
      }
    });

  } catch (err) {
    if (connection) await connection.rollback();

    return res.status(500).json(
      createErrorResponse(err, 'movimiento', 'transaccion')
    );
  } finally {
    if (connection) connection.release(); // 🔑 SIEMPRE liberar
  }
};


/**
 * Obtiene los movimientos de un artículo específico
 */
const getArticleMovements = (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT m.*, a.nombre as nombre_articulo, a.codigo
        FROM movimiento m
        INNER JOIN articulo a ON m.id_articulo = a.id_articulo
        WHERE m.id_articulo = ?
        ORDER BY m.fecha DESC
    `;
    
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'movimiento', 'obtener_por_articulo'));
        }
        
        return res.status(200).json({ success: true, data: result });
    });
};

/**
 * Obtiene todos los movimientos del sistema
 */
const getAllMovements = (req, res) => {
    const query = `
        SELECT m.*, a.nombre as nombre_articulo, a.codigo
        FROM movimiento m
        INNER JOIN articulo a ON m.id_articulo = a.id_articulo
        ORDER BY m.fecha DESC
    `;
    
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).json(createErrorResponse(err, 'movimiento', 'obtener_todos'));
        }
        
        return res.status(200).json({ success: true, data: result });
    });
};

module.exports = {
    createMovement,
    getArticleMovements,
    getAllMovements
};
