const express = require("express");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");
const reviewController = require("../controllers/reviewController");

const router = express.Router();

router.get("/:productId", reviewController.getReviews);
router.post(
  "/:productId",
  protect,
  upload.single("image"),
  reviewController.createReview
);

module.exports = router;
