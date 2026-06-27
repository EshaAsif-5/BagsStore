import { Outlet } from "react-router-dom";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";
import WhatsAppButton from "./WhatsAppButton.jsx";

// ─────────────────────────────────────────────
// PUBLIC LAYOUT
// Shell for all public-facing pages:
//   Navbar → page content (Outlet) → Footer
// WhatsApp FAB floats above footer on all pages.
// ─────────────────────────────────────────────
export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f9f7f4]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
