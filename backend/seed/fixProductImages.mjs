import "dotenv/config";
import connectDB from "../src/config/db.js";
import Product from "../src/models/Product.model.js";
import mongoose from "mongoose";

const IMAGE_FIXES = {
  "scholar-laptop-bag": {
    url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80",
    alt: "Scholar Laptop Bag",
  },
  "urban-daypack": {
    url: "https://images.unsplash.com/photo-1564422170194-896b89110ef8?w=800&q=80",
    alt: "Urban Daypack",
  },
};

const fix = async () => {
  await connectDB();

  for (const [slug, image] of Object.entries(IMAGE_FIXES)) {
    const product = await Product.findOne({ slug });
    if (!product) {
      console.log(`Skip: no product with slug "${slug}"`);
      continue;
    }

    if (product.images?.length > 0) {
      product.images[0].url = image.url;
      product.images[0].alt = image.alt;
      product.images[0].isPrimary = true;
    } else {
      product.images = [{ ...image, isPrimary: true }];
    }

    await product.save();
    console.log(`Updated image for: ${product.name}`);
  }

  await mongoose.disconnect();
};

fix().catch((err) => {
  console.error("Fix failed:", err.message);
  process.exit(1);
});
