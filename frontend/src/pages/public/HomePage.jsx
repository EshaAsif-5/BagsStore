import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Truck, RefreshCw, MessageCircle } from "lucide-react";
import ProductGrid from "../../components/product/ProductGrid.jsx";
import productService from "../../services/productService.js";
import { env } from "../../config/env.js";

// Isolated product shot — white bg removed via mix-blend-darken on dark hero
const HERO_BAG_IMAGE =
  "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900&q=85&auto=format&fit=crop";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const CATEGORIES = [
  {
    slug: "university",
    label: "University Bags",
    description: "Built for campus life",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
    accent: "#4a6741",
  },
  {
    slug: "modern",
    label: "Modern Bags",
    description: "Clean, contemporary design",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80",
    accent: "#1a1a1a",
  },
  {
    slug: "luxury",
    label: "Luxury Bags",
    description: "Crafted for occasions",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80",
    accent: "#c9a96e",
  },
  {
    slug: "stylish",
    label: "Stylish Bags",
    description: "Make a statement",
    image: "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&q=80",
    accent: "#8b6f5e",
  },
];

const BRAND_VALUES = [
  {
    Icon: Shield,
    title: "Quality Guaranteed",
    desc: "Every bag passes our rigorous quality check before dispatch.",
  },
  {
    Icon: Truck,
    title: "Pakistan-Wide Delivery",
    desc: "Fast and reliable shipping to all major cities in Pakistan.",
  },
  {
    Icon: RefreshCw,
    title: "Easy Returns",
    desc: "Not satisfied? Return within 7 days, no questions asked.",
  },
  {
    Icon: MessageCircle,
    title: "WhatsApp Support",
    desc: "Reach us instantly on WhatsApp — we reply within the hour.",
  },
];

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#1a1a1a] min-h-[85vh] sm:min-h-[90vh] flex items-center">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            #fff 0px,
            #fff 1px,
            transparent 1px,
            transparent 50%
          )`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Accent glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#c9a96e] opacity-[0.07] blur-[120px] -translate-y-1/4 translate-x-1/4" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="max-w-xl text-left">
            {/* Eyebrow */}
            <p className="text-[11px] tracking-[4px] uppercase text-[#c9a96e] font-medium mb-6">
              New Collection 2024
            </p>

            {/* Headline */}
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.05] mb-6">
              Bags That
              <span className="block italic text-[#c9a96e]">Speak for You</span>
            </h1>

            <p className="text-base text-[#998f83] leading-relaxed max-w-md mb-10">
              Premium bags for every occasion — from university halls to luxury
              events. Crafted with care, delivered across Pakistan.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 bg-[#c9a96e] text-[#1a1a1a] text-sm tracking-[2px] uppercase font-bold px-8 py-4 hover:bg-white transition-colors duration-200 group"
              >
                Shop Collection
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/products?category=luxury"
                className="inline-flex items-center justify-center gap-2 border border-[#333] text-[#d4cdc2] text-sm tracking-[2px] uppercase font-medium px-8 py-4 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors duration-200"
              >
                View Luxury
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 mt-12 pt-8 border-t border-[#2a2a2a]">
              {[
                { value: "20–50", label: "Products" },
                { value: "4", label: "Categories" },
                { value: `PKR ${(env.shippingFreeThreshold / 1000).toFixed(0)}K+`, label: "Free Shipping" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-lg font-serif text-white leading-none">{value}</p>
                  <p className="text-[10px] tracking-[1.5px] uppercase text-[#555] mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <img
              src={HERO_BAG_IMAGE}
              alt="Modern black leather handbag"
              draggable={false}
              className="w-full max-w-xs sm:max-w-sm lg:max-w-md xl:max-w-lg h-auto object-contain mix-blend-darken select-none pointer-events-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
            />
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#f9f7f4] to-transparent" />
    </section>
  );
}

function CategorySection() {
  return (
    <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Heading */}
      <div className="text-center mb-10">
        <p className="text-[10px] tracking-[3px] uppercase text-[#c9a96e] font-medium mb-2">
          Collections
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a]">
          Shop by Category
        </h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {CATEGORIES.map(({ slug, label, description, image }) => (
          <Link
            key={slug}
            to={`/products?category=${slug}`}
            className="group relative overflow-hidden aspect-[3/4] block bg-[#1a1a1a]"
          >
            {/* Category image */}
            <img
              src={image}
              alt={label}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Text */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
              <p className="text-[10px] tracking-[2px] uppercase text-[#c9a96e] font-medium mb-1">
                {description}
              </p>
              <h3 className="font-serif text-lg sm:text-xl text-white leading-snug">
                {label}
              </h3>
              <div className="flex items-center gap-1.5 mt-3 text-white/70 text-xs group-hover:text-[#c9a96e] transition-colors">
                <span>Explore</span>
                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeaturedProductsSection() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => productService.getFeaturedProducts(8),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[10px] tracking-[3px] uppercase text-[#c9a96e] font-medium mb-2">
              Handpicked
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a]">
              Featured Bags
            </h2>
          </div>
          <Link
            to="/products?isFeatured=true"
            className="flex items-center gap-2 text-xs tracking-[2px] uppercase font-semibold text-[#1a1a1a] hover:text-[#c9a96e] transition-colors group whitespace-nowrap"
          >
            View All
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <ProductGrid
          products={products}
          isLoading={isLoading}
          skeletonCount={8}
          columns="grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
        />
      </div>
    </section>
  );
}

function BrandValuesSection() {
  return (
    <section className="py-16 sm:py-20 bg-[#f9f7f4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[10px] tracking-[3px] uppercase text-[#c9a96e] font-medium mb-2">
            Why ZEE.BY ZUNAISHA
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a]">
            Our Promise to You
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {BRAND_VALUES.map(({ Icon, title, desc }) => (
            <div key={title} className="text-center group">
              <div className="w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4 group-hover:bg-[#c9a96e] transition-colors duration-300">
                <Icon size={22} className="text-[#c9a96e] group-hover:text-[#1a1a1a] transition-colors duration-300" />
              </div>
              <h3 className="font-serif text-lg text-[#1a1a1a] mb-2">{title}</h3>
              <p className="text-sm text-[#777] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewArrivalsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["products", "new-arrivals"],
    queryFn: () => productService.getProducts({ sortBy: "newest", limit: 4 }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-[10px] tracking-[3px] uppercase text-[#c9a96e] font-medium mb-2">
            Just Arrived
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a]">
            New Arrivals
          </h2>
        </div>
        <Link
          to="/products?sortBy=newest"
          className="flex items-center gap-2 text-xs tracking-[2px] uppercase font-semibold text-[#1a1a1a] hover:text-[#c9a96e] transition-colors group whitespace-nowrap"
        >
          View All New
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <ProductGrid
        products={data?.products}
        isLoading={isLoading}
        skeletonCount={4}
        columns="grid-cols-2 md:grid-cols-4"
      />
    </section>
  );
}

function CTABannerSection() {
  const WHATSAPP = env.whatsappNumber;
  return (
    <section className="bg-[#1a1a1a] py-16 sm:py-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-[#c9a96e] font-medium mb-4">
          Exclusive
        </p>
        <h2 className="font-serif text-4xl sm:text-5xl text-white mb-5 leading-tight">
          Not Sure Which Bag?
        </h2>
        <p className="text-[#998f83] leading-relaxed mb-8 max-w-md mx-auto">
          Message us on WhatsApp and our styling team will help you find the
          perfect bag for your needs and budget.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={`https://wa.me/${WHATSAPP}?text=Hi! I need help choosing a bag from ZEE.BY ZUNAISHA.`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 bg-[#25D366] text-white text-sm tracking-[2px] uppercase font-bold px-8 py-4 hover:bg-[#20bf5c] transition-colors"
          >
            <MessageCircle size={18} />
            Chat on WhatsApp
          </a>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 border border-[#333] text-[#d4cdc2] text-sm tracking-[2px] uppercase font-medium px-8 py-4 hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────
export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <CategorySection />
      <FeaturedProductsSection />
      <BrandValuesSection />
      <NewArrivalsSection />
      <CTABannerSection />
    </div>
  );
}