const cloudinary = require("../config/cloudinary");
const Product = require("../models/Product");
const streamifier = require("streamifier");

exports.createProduct = async (req, res) => {
  try {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "products" },
      async (error, result) => {
        if (error) {
          return res.status(500).json(error);
        }

        const product = await Product.create({
          name: req.body.name,
          price: req.body.price,
          image: result.secure_url,
        });

        res.json(product);
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (err) {
    res.status(500).json(err);
  }
};
