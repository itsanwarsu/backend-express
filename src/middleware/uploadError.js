module.exports = (err, req, res, next) => {
  if (err.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Ukuran foto maksimal 5MB"
        : err.code === "LIMIT_UNEXPECTED_FILE" || err.code === "LIMIT_FILE_COUNT"
        ? "Maksimal 10 foto"
        : err.message;
    return res.status(400).json({ message });
  }

  if (err.message && err.message.includes("JPG, PNG")) {
    return res.status(400).json({ message: err.message });
  }

  next(err);
};
