import "dotenv/config";
import connectDB from "../src/config/db.js";
import Product from "../src/models/Product.model.js";
import mongoose from "mongoose";

const SAMPLE_PRODUCTS = [
  {
    name: "Campus Classic Backpack",
    description:
      "A durable everyday backpack built for university life. Spacious main compartment, padded laptop sleeve, and water-resistant fabric.",
    category: "university",
    tags: ["backpack", "campus", "laptop"],
    isFeatured: true,
    isActive: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
        alt: "Campus Classic Backpack",
        isPrimary: true,
      },
    ],
    variants: [
      { color: "Black", colorHex: "#1a1a1a", size: "Standard", price: 4500, stock: 25, sku: "CCB-BLK-STD" },
      { color: "Navy", colorHex: "#1e3a5f", size: "Standard", price: 4500, stock: 18, sku: "CCB-NVY-STD" },
    ],
  },
  {
    name: "Metro Sling Bag",
    description:
      "Compact crossbody sling for daily essentials. Lightweight, modern silhouette, and adjustable strap.",
    category: "modern",
    tags: ["sling", "crossbody", "minimal"],
    isFeatured: true,
    isActive: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
        alt: "Metro Sling Bag",
        isPrimary: true,
      },
    ],
    variants: [
      { color: "Charcoal", colorHex: "#333333", size: "One Size", price: 3200, stock: 30, sku: "MSB-CHR-OS" },
    ],
  },
  {
    name: "Heritage Leather Tote",
    description:
      "Premium faux-leather tote for work and occasions. Structured shape with gold-tone hardware.",
    category: "luxury",
    tags: ["tote", "leather", "premium"],
    isFeatured: true,
    isActive: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80",
        alt: "Heritage Leather Tote",
        isPrimary: true,
      },
    ],
    variants: [
      { color: "Cognac", colorHex: "#8b6f5e", size: "Large", price: 8900, comparePrice: 9900, stock: 12, sku: "HLT-COG-LG" },
    ],
  },
  {
    name: "Statement Chain Bag",
    description:
      "Bold chain-strap bag for evenings out. Compact but eye-catching with metallic accent chain.",
    category: "stylish",
    tags: ["chain", "evening", "statement"],
    isFeatured: false,
    isActive: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80",
        alt: "Statement Chain Bag",
        isPrimary: true,
      },
    ],
    variants: [
      { color: "Gold", colorHex: "#c9a96e", size: "Mini", price: 5500, stock: 15, sku: "SCB-GLD-MN" },
      { color: "Black", colorHex: "#1a1a1a", size: "Mini", price: 5200, stock: 20, sku: "SCB-BLK-MN" },
    ],
  },
  {
    name: "Scholar Laptop Bag",
    description:
      "Padded compartment fits up to 15.6\" laptops. Multiple organizer pockets for stationery and chargers.",
    category: "university",
    tags: ["laptop", "scholar", "organizer"],
    isFeatured: false,
    isActive: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80",
        alt: "Scholar Laptop Bag",
        isPrimary: true,
      },
    ],
    variants: [
      { color: "Grey", colorHex: "#888888", size: "Standard", price: 4800, stock: 22, sku: "SLB-GRY-STD" },
    ],
  },
  {
    name: "Urban Daypack",
    description:
      "Clean lines and neutral tones for the modern commuter. Water bottle side pockets included.",
    category: "modern",
    tags: ["daypack", "commuter", "urban"],
    isFeatured: true,
    isActive: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1564422170194-896b89110ef8?w=800&q=80",
        alt: "Urban Daypack",
        isPrimary: true,
      },
    ],
    variants: [
      { color: "Olive", colorHex: "#4a6741", size: "Standard", price: 4100, stock: 28, sku: "UDP-OLV-STD" },
    ],
  },
  {
    name: "Royal Clutch",
    description:
      "Elegant clutch with detachable chain strap. Perfect for weddings and formal events.",
    category: "luxury",
    tags: ["clutch", "formal", "wedding"],
    isFeatured: false,
    isActive: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80",
        alt: "Royal Clutch",
        isPrimary: true,
      },
    ],
    variants: [
      { color: "Champagne", colorHex: "#d4cdc2", size: "One Size", price: 6500, stock: 10, sku: "RCL-CHP-OS" },
    ],
  },
  {
    name: "Trendsetter Mini Bag",
    description:
      "Instagram-ready mini bag with bold colour blocking. Small but fits phone, cards, and keys.",
    category: "stylish",
    tags: ["mini", "trendy", "colour-block"],
    isFeatured: true,
    isActive: true,
    images: [
      {
        url: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=800&q=80",
        alt: "Trendsetter Mini Bag",
        isPrimary: true,
      },
    ],
    variants: [
      { color: "Blush", colorHex: "#e8b4b8", size: "Mini", price: 3800, stock: 35, sku: "TMB-BLS-MN" },
    ],
  },
];

const seed = async () => {
  await connectDB();

  const existing = await Product.countDocuments({ slug: { $ne: null } });
  if (existing > 0) {
    console.log(`Database already has ${existing} product(s). Skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  // Remove any broken documents from a failed bulk insert (null slug)
  await Product.deleteMany({ slug: null });

  for (const productData of SAMPLE_PRODUCTS) {
    await Product.create(productData);
  }
  const count = await Product.countDocuments();
  console.log(`Seeded ${count} products successfully.`);
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
