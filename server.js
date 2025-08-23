import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env') });

const PORT = process.env.PORT || 3000;

import userRoutes from './routes/usuario.routes.js';
import articleRoutes from './routes/articulo.routes.js';
import categoryRoutes from './routes/categoria.routes.js';
import movementRoutes from './routes/movimiento.routes.js';
import categoryArticleRoutes from './routes/categoria_articulo.routes.js';
const app = express();

// Middleware
app.use(cors());   
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba de conexión
app.get('/api', (_, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'API Connection Success',
        timestamp: new Date().toISOString(),
        environment: process.pkg ? 'packaged' : 'development'
    });
});

// Rutas
app.use('/api/user', userRoutes);         
app.use('/api/article', articleRoutes);     
app.use('/api/category', categoryRoutes);
app.use('/api/movement', movementRoutes);   
app.use('/api/category-article', categoryArticleRoutes);

const frontendPath = path.join(process.cwd(), 'dist');

app.use(express.static(frontendPath, {
    index: false,
    setHeaders: (res, path) => {
        if (path.endsWith('.js') || path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 año
        }
    }
}));

// Esta ruta captura todas las rutas que no sean API y remite index.html
app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    if (!req.path.startsWith('/api')) {
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error('Error serving frontend:', err);
                res.status(500).json({ 
                    error: 'Frontend not found', 
                    message: 'Make sure the dist folder exists next to the executable' 
                });
            }
        });
    } else {
        res.status(404).json({ 
            error: 'API endpoint not found',
            path: req.path 
        });
    }
});

// INICIALIZACIÓN DEL SERVIDOR
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('SERVIDOR INVENTARIO PNP INICIADO');
    console.log('='.repeat(60));
    console.log(`Puerto: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    
    if (process.pkg) {
        console.log('Ejecutando como aplicación empaquetada (pkg)');
        console.log(`Frontend servido desde: ${frontendPath}`);
        console.log(`Directorio de trabajo: ${process.cwd()}`);
    } else {
        console.log('Ejecutando en modo desarrollo');
    }
    
    console.log('Rutas de API disponibles:');
});
