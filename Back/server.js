import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import usuariosRouter    from './routes/usuario.js';
import jornadasRouter    from './routes/fichaje.js';
import estadisticasRouter from './routes/estadisticas.js';
import sesionRouter  from './routes/sesion.js';
import configRouter       from './routes/config.js';
import dispositivosRouter from './routes/dispositivos.js';
import incidenciasRouter  from './routes/incidencias.js';
import auditoriaRouter    from './routes/auditoria.js';
import turnosRouter       from './routes/turnos.js';
import puestosRouter      from './routes/puestos.js';
import { authMiddleware } from './authMiddleware.js';

const app = express();
app.use(cors());
app.use(express.json());
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));


// Rutas publicas (no requieren token)
app.use('/sesion', sesionRouter);

// Rutas protegidas (requieren token JWT valido)
app.use('/usuarios',     authMiddleware, usuariosRouter);
app.use('/jornadas',     authMiddleware, jornadasRouter);
app.use('/estadisticas', authMiddleware, estadisticasRouter);
app.use('/config',       authMiddleware, configRouter);
app.use('/dispositivos', authMiddleware, dispositivosRouter);
app.use('/incidencias',  authMiddleware, incidenciasRouter);
app.use('/auditoria',    authMiddleware, auditoriaRouter);
app.use('/turnos',       authMiddleware, turnosRouter);
app.use('/puestos',      authMiddleware, puestosRouter);
// 0.0.0.0 para que Docker pueda recibir las peticiones
app.listen(4000, '0.0.0.0', () => {
  console.log('Servidor escuchando en http://0.0.0.0:4000');
});
