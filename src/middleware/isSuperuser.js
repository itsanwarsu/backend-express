function isSuperuser(req, res, next) {
  if (!req.user || req.user.role !== "superuser") {
    return res.status(403).json({ message: "Akses ditolak" });
  }
  next();
}

module.exports = isSuperuser;
