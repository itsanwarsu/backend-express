const prisma = require("../../config/prisma");
const cloudinary = require("../../config/cloudinary");

// Helper: upload buffer ke Cloudinary lewat stream
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "reviews" },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

// ===============================
// GET REVIEWS BY PRODUCT
// ===============================
exports.getReviews = async (req, res) => {
  try {
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "productId tidak valid",
      });
    }

    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        comment: true,
        imageUrl: true,
        createdAt: true,
        user: {
          select: { name: true },
        },
      },
    });

    const formatted = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      image: r.imageUrl,
      createdAt: r.createdAt,
      name: r.user.name,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("Get Reviews Error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

// ===============================
// CREATE REVIEW
// ===============================
exports.createReview = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const productId = Number(req.params.productId);
    const { comment, rating } = req.body;

    if (!Number.isInteger(userId)) {
      return res.status(401).json({
        message: "User tidak valid",
      });
    }

    if (!Number.isInteger(productId)) {
      return res.status(400).json({
        message: "productId tidak valid",
      });
    }

    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({
        message: "Ulasan minimal 10 karakter",
      });
    }

    const ratingNum = Number(rating);

    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        message: "Rating harus antara 1-5",
      });
    }

    let imageUrl = null;

    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          message: "File harus berupa gambar",
        });
      }

      const result = await uploadToCloudinary(req.file.buffer);
      imageUrl = result.secure_url;
    }

    const newReview = await prisma.review.create({
      data: {
        productId,
        userId,
        rating: ratingNum,
        comment: comment.trim(),
        imageUrl,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        imageUrl: true,
        createdAt: true,
        user: {
          select: { name: true },
        },
      },
    });

    return res.status(201).json({
      id: newReview.id,
      rating: newReview.rating,
      comment: newReview.comment,
      image: newReview.imageUrl,
      createdAt: newReview.createdAt,
      name: newReview.user.name,
    });
  } catch (err) {
    console.error("Create Review Error:", err);

    if (err.code === "P2003") {
      return res.status(400).json({
        message: "Produk tidak ditemukan",
      });
    }

    return res.status(500).json({
      message: err.message,
    });
  }
};
