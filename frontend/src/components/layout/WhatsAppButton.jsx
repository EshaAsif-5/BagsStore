import { MessageCircle } from "lucide-react";
import { env } from "../../config/env.js";

const WHATSAPP_NUMBER = env.whatsappNumber;
const DEFAULT_MESSAGE = "Hi! I'd like to know more about ZEE.BY ZUNAISHA bags.";

// ─────────────────────────────────────────────
// WHATSAPP FLOATING ACTION BUTTON
// Fixed bottom-right on all public pages.
// Pre-fills a message to reduce friction.
// ─────────────────────────────────────────────
export default function WhatsAppButton({ message = DEFAULT_MESSAGE }) {
  const encodedMessage = encodeURIComponent(message);
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-5 z-40 flex items-center gap-2 bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:bg-[#20bf5c] transition-all duration-200 rounded-full group"
    >
      {/* Expanded label on hover — desktop only */}
      <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 ease-out whitespace-nowrap pl-0 group-hover:pl-4 text-sm font-medium hidden sm:block">
        Chat with us
      </span>
      <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#25D366]">
        <MessageCircle size={26} strokeWidth={1.8} />
      </div>
    </a>
  );
}