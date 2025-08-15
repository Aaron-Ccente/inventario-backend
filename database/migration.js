import db from './db.js'

// Tabla para usuario
const usuario = `CREATE TABLE usuario(
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    email VARCHAR(80) NOT NULL,
    password VARCHAR(80) NOT NULL
);`

//tabla para articulos
const articulo = `CREATE TABLE articulo (
    id_articulo INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) NOT NULL,
    nombre TEXT NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    detalle VARCHAR(150),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE,
    otros VARCHAR(150),
    stock DECIMAL(10,2) DEFAULT 0.00
);`

// Tabla para categorias
const categoria = `CREATE TABLE categoria (
    id_categoria INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL
);`

// Tabla para los movimientos del articulo
const movimiento_articulo = `CREATE TABLE movimiento (
    id_movimiento INT PRIMARY KEY AUTO_INCREMENT,
    accion ENUM('ENTRADA', 'SALIDA') NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    doc VARCHAR(150),
    detalle VARCHAR(200), -- detalle proveedor o cliente
    cantidad DECIMAL(10,2) NOT NULL,
    costo_unidad DECIMAL(10,2) DEFAULT NULL
);`

// Tabla para relacionar los articulos con su categoria
const categoria_articulo = `CREATE TABLE categoria_articulo (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_categoria INT NOT NULL,
    id_articulo INT NOT NULL,
    FOREIGN KEY (id_categoria) REFERENCES categoria(id_categoria),
    FOREIGN KEY (id_articulo) REFERENCES articulo(id_articulo)
);`

const dbseed = `${usuario}
                ${articulo}
                ${categoria}
                ${movimiento_articulo}
                ${categoria_articulo}
                `

db.query(dbseed, (err, result)=>{
    if(err){
        console.log('Error al crear las tablas', err)
        return {success:false, message: err.message}
    }
    else{
        return {success: true, message: result}
    }
})