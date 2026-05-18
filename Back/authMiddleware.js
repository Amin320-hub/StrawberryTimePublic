import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const token = authHeader.split(' ')[1];
    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Token invalido o expirado' });
    }
}
