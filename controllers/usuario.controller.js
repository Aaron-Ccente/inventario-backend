const db = require('../database/db.js');
const { createErrorResponse } = require('../utils/errorHandler.js');

/**
 * Autentica un usuario
 */
const loginUser = (req, res) => {
    const { email, password } = req.body;
    const query = `SELECT id_usuario, nombre, email FROM usuario WHERE email = ? AND password = ?`;
    db.query(query, [email, password], (err, result) => {
        if (err) {
            console.log("Error al autenticar usuario:", err);
            return res.status(500).json(createErrorResponse(err, 'usuario', 'autenticar'));
        } else {
            if (result.length > 0) {
                const user = result[0];
                return res.status(200).json({ 
                    success: true, 
                    message: 'Login exitoso',
                    user: {
                        id: user.id_usuario,
                        name: user.nombre,
                        email: user.email
                    }
                });
            } else {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Credenciales incorrectas' 
                });
            }
        }
    });
};

/**
 * Registra un nuevo usuario
 */
const registerUser = (req, res) => {
    const { name, email, password } = req.body;
    const query = `INSERT INTO usuario (nombre, email, password) VALUES (?, ?, ?)`;
    db.query(query, [name, email, password], (err, result) => {
        if (err) {
            console.log('Error al registrar usuario:', err);
            return res.status(500).json(createErrorResponse(err, 'usuario', 'registrar'));
        } else {
            return res.status(200).json({ success: true, message: 'Usuario registrado exitosamente' });
        }
    });
};

module.exports = {
    loginUser,
    registerUser
};