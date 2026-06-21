const { verifyAccessToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/errors');

function verifyAccessTokenMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token required');
    }
    const token = authHeader.slice(7);
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      phone: decoded.phone,
    };
    next();
  } catch (err) {
    next(err);
  }
}

function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = verifyAccessToken(token);
      req.user = {
        id: decoded.sub,
        role: decoded.role,
        phone: decoded.phone,
      };
    }
    next();
  } catch {
    next();
  }
}

module.exports = { verifyAccessToken: verifyAccessTokenMiddleware, optionalAuth };
