const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { exec } = require('child_process');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const PORT = process.env.PORT || 8081;

const userRoutes = require('./routes/usuario.routes.js');
const articleRoutes = require('./routes/articulo.routes.js');
const categoryRoutes = require('./routes/categoria.routes.js');
const movementRoutes = require('./routes/movimiento.routes.js');
const categoryArticleRoutes = require('./routes/categoria_articulo.routes.js');
const app = express();

app.use(cors());                   
app.use(express.json());         
app.use(express.urlencoded({ extended: true })); 

app.get('/api', (_, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'API Connection Success',
        timestamp: new Date().toISOString(),
        environment: process.pkg ? 'packaged' : 'development'
    });
});

//Rutas
app.use('/api/user', userRoutes);          
app.use('/api/article', articleRoutes);    
app.use('/api/category', categoryRoutes);   
app.use('/api/movement', movementRoutes); 
app.use('/api/category-article', categoryArticleRoutes);
const frontendPath = path.join(process.cwd(), 'dist');

app.use(express.static(frontendPath, {
    index: false,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    }
}));

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

app.listen(PORT, "0.0.0.0", () => {
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
    exec(`start http://localhost:${PORT}`);
});