import { Link } from "react-router-dom";
import {
  MessageCircle,
  Mail,
  MapPin,
  Camera,
  Share2,
  Video,
} from "lucide-react";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || "923001234567";

const FOOTER_LINKS = {
  Shop: [
    { label: "All Products", to: "/products" },
    { label: "University Bags", to: "/products?category=university" },
    { label: "Modern Bags", to: "/products?category=modern" },
    { label: "Luxury Bags", to: "/products?category=luxury" },
    { label: "Stylish Bags", to: "/products?category=stylish" },
  ],
  Help: [
    { label: "Track Your Order", to: "/track-order" },
    { label: "Contact Us", to: "/contact" },
    { label: "My Account", to: "/account" },
    { label: "My Orders", to: "/account/orders" },
  ],
};

// Payment method pill labels
const PAYMENT_METHODS = [
  "Cash on Delivery",
  "Bank Transfer",
  "EasyPaisa",
  "JazzCash",
  "Debit / Credit Card",
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1a1a1a] text-[#d4cdc2]">

      {/* Top section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-block mb-5">
              <p className="font-serif text-[17px] tracking-[4px] text-white uppercase">
                ZEE.BY ZOHAIB
              </p>
              <p className="text-[10px] tracking-[3px] text-[#c9a96e] uppercase mt-1">
                Crafted for You
              </p>
            </Link>
            <p className="text-sm leading-relaxed text-[#998f83] max-w-xs">
              Premium bags designed for Pakistan — from university halls to
              luxury occasions. Quality that speaks before you do.
            </p>

            {/* Contact info */}
            <div className="mt-6 space-y-3">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-[#25D366] hover:text-white transition-colors group"
              >
                <MessageCircle size={16} className="shrink-0" />
                <span>WhatsApp: +92 300 1234567</span>
              </a>
              <a
                href="mailto:hello@zeebyzohaib.com"
                className="flex items-center gap-3 text-sm text-[#998f83] hover:text-[#c9a96e] transition-colors"
              >
                <Mail size={16} className="shrink-0" />
                <span>hello@zeebyzohaib.com</span>
              </a>
              <div className="flex items-start gap-3 text-sm text-[#998f83]">
                <MapPin size={16} className="shrink-0 mt-0.5" />
                <span>Lahore, Punjab, Pakistan</span>
              </div>
            </div>

            {/* Social links */}
            <div className="mt-6 flex items-center gap-4">
              {[
                {
                  href: "https://instagram.com",
                  Icon: Camera,
                  label: "Instagram",
                },
                {
                  href: "https://facebook.com",
                  Icon: Share2,
                  label: "Facebook",
                },
                {
                  href: "https://youtube.com",
                  Icon: Video,
                  label: "YouTube",
                },
              ].map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-full border border-[#333] flex items-center justify-center text-[#998f83] hover:border-[#c9a96e] hover:text-[#c9a96e] transition-colors"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-xs tracking-[2.5px] uppercase text-white font-semibold mb-5">
                {heading}
              </h3>
              <ul className="space-y-3">
                {links.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-sm text-[#998f83] hover:text-[#c9a96e] transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Payment methods */}
          <div>
            <h3 className="text-xs tracking-[2.5px] uppercase text-white font-semibold mb-5">
              We Accept
            </h3>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <span
                  key={method}
                  className="text-[11px] tracking-wide px-2.5 py-1 border border-[#333] text-[#998f83] rounded-sm"
                >
                  {method}
                </span>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="text-xs tracking-[2.5px] uppercase text-white font-semibold mb-4">
                Delivery
              </h3>
              <p className="text-sm text-[#998f83] leading-relaxed">
                Pakistan-wide delivery. Free shipping on orders above{" "}
                <span className="text-[#c9a96e]">PKR 5,000</span>.
              </p>
              <p className="text-sm text-[#998f83] mt-2">
                Estimated delivery: 2–5 business days.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#2a2a2a]" />

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-[#554f48] tracking-wide">
            © {year} ZEE.BY ZOHAIB. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link
              to="/contact"
              className="text-[11px] text-[#554f48] hover:text-[#c9a96e] tracking-wide transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/contact"
              className="text-[11px] text-[#554f48] hover:text-[#c9a96e] tracking-wide transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/track-order"
              className="text-[11px] text-[#554f48] hover:text-[#c9a96e] tracking-wide transition-colors"
            >
              Track Order
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}