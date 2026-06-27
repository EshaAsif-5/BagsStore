import { Link } from "react-router-dom";
import { Home, ShoppingBag, MessageCircle, ArrowRight } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#f9f7f4] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-16">
        <div className="max-w-lg w-full text-center">
          <p className="text-[11px] tracking-[3px] uppercase text-[#c9a96e] font-semibold mb-4">
            404 — Page Not Found
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl text-[#1a1a1a] mb-4">
            Lost your way?
          </h1>
          <p className="text-sm text-[#888] leading-relaxed mb-10">
            The page you are looking for does not exist or may have been moved.
            Let us help you find your way back to ZEE.BY ZOHAIB.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-[#1a1a1a] text-white text-xs tracking-[2px] uppercase font-semibold hover:bg-[#333] transition-colors"
            >
              <Home size={15} />
              Back to Home
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 border border-[#1a1a1a] text-[#1a1a1a] text-xs tracking-[2px] uppercase font-semibold hover:bg-[#1a1a1a] hover:text-white transition-colors"
            >
              <ShoppingBag size={15} />
              Browse Bags
            </Link>
          </div>

          <Link
            to="/contact"
            className="inline-flex items-center gap-1.5 mt-8 text-sm text-[#888] hover:text-[#c9a96e] transition-colors group"
          >
            <MessageCircle size={15} />
            Need help? Contact us
            <ArrowRight
              size={14}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
