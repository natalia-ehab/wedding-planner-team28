
const jwt = require("jsonwebtoken");

// Verify the JWT sent with the request
function authenticate(event) {
    const headers = event.headers || {};

    const authHeader =
        headers.Authorization || headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
            error: {
                statusCode: 401,
                message: "Authentication token is required"
            }
        };
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return {
            error: {
                statusCode: 401,
                message: "Invalid authentication token"
            }
        };
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }

    try {
        const decoded = jwt.verify(token, secret, {
            algorithms: ["HS256"]
        });

        if (!decoded.user_id || !decoded.role) {
            return {
                error: {
                    statusCode: 401,
                    message: "Invalid token claims"
                }
            };
        }

        return {
            user: {
                user_id: decoded.user_id,
                role: decoded.role
            }
        };

    } catch (error) {
        return {
            error: {
                statusCode: 401,
                message: "Invalid or expired authentication token"
            }
        };
    }
}

// Check whether the authenticated user has permission
// Returns 401 if no authenticated user is provided.
//Returns 403 if the user's role isn't allowed.
//Returns null if access is permitted.
function authorize(user, allowedRoles) {
    if (!user || !user.role) {
        return {
            statusCode: 401,
            message: "Authentication required"
        };
    }

    if (!allowedRoles.includes(user.role)) {
        return {
            statusCode: 403,
            message: "You do not have permission to perform this action"
        };
    }

    return null;
}

module.exports = {
    authenticate,
    authorize
};
