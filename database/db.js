const mysql2 = require('mysql2');
const { DB_PORT, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = require('../config/config.js');

const db = mysql2.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    multipleStatements: true
});

module.exports = db;