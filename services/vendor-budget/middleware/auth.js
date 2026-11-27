const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Authentication token is required.'
        });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return res.status(500).json({
            message: 'Authentication configuration error.'
        });
    }

    try {
        const decoded = jwt.verify(token, secret, {
            algorithms: ['HS256']
        });

        if (!decoded.user_id || !decoded.role) {
            return res.status(401).json({
                message: 'Invalid token claims.'
            });
        }

        req.user = {
            user_id: decoded.user_id,
            role: decoded.role
        };

        next();

    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired authentication token.'
        });
    }
}

function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Authentication required.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'You do not have permission to perform this action.'
            });
        }

        next();
    };
}

module.exports = {
    authenticate,
    authorize
};