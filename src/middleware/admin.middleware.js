const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
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
