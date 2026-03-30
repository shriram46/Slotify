const logger = require("../utils/logger");

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {

  logger.warn("Forbidden access attempt (non-admin)", {
  userId: req.user?.userId,
  path: req.originalUrl
});

    return res.status(403).json({
      error: {
        code: "FORBIDDEN",
        message: "Admin access required"
      }
    });
  }
  next();
};

module.exports = adminMiddleware;
