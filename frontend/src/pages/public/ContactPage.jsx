import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Mail,
  MessageCircle,
  Phone,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import contactService from "../../services/contactService.js";
import useAuthStore from "../../store/authStore.js";
import { env } from "../../config/env.js";

const WHATSAPP = env.whatsappNumber;

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name cannot exceed 80 characters."),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^(\+92|0)[0-9]{10}$/.test(val),
      "Enter a valid Pakistani number (e.g. 03001234567)."
    ),
  subject: z
    .string()
    .trim()
    .max(150, "Subject cannot exceed 150 characters.")
    .optional(),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters.")
    .max(2000, "Message cannot exceed 2000 characters."),
});

const inputClass =
  "w-full border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] placeholder:text-[#bbb] focus:outline-none focus:border-[#1a1a1a] bg-white";

const labelClass =
  "block text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] mb-1.5";

export default function ContactPage() {
  const user = useAuthStore((s) => s.user);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        subject: "",
        message: "",
      });
    }
  }, [user, reset]);

  const { mutate, isPending, isSuccess, reset: resetMutation } = useMutation({
    mutationFn: (payload) => contactService.submitContact(payload),
    onSuccess: () => {
      toast.success("Message sent! We will get back to you within 1–2 business days.");
      reset({
        name: user?.name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        subject: "",
        message: "",
      });
    },
    onError: (err) => {
      toast.error(err.message || "Could not send your message. Please try again.");
    },
  });

  const onSubmit = (data) => {
    mutate({
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      subject: data.subject || undefined,
      message: data.message,
    });
  };

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      {/* Header */}
      <div className="bg-white border-b border-[#ece8e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="text-[11px] tracking-[1.5px] uppercase text-[#aaa] mb-3 flex items-center gap-2">
            <Link to="/" className="hover:text-[#c9a96e] transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-[#555]">Contact</span>
          </nav>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a]">
            Contact Us
          </h1>
          <p className="text-sm text-[#888] mt-2 max-w-xl">
            Have a question about an order, a product, or a custom request?
            Send us a message and our team will respond within 1–2 business days.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Contact form */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[#e8e0d4] p-5 sm:p-7">
              {isSuccess ? (
                <div className="py-8 text-center">
                  <CheckCircle size={40} className="text-[#c9a96e] mx-auto mb-4" />
                  <h2 className="font-serif text-xl text-[#1a1a1a] mb-2">
                    Message received
                  </h2>
                  <p className="text-sm text-[#888] max-w-sm mx-auto mb-6">
                    Thank you for reaching out. We have sent a confirmation to
                    your email and will reply shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => resetMutation()}
                    className="text-xs tracking-[2px] uppercase font-semibold text-[#c9a96e] hover:text-[#1a1a1a] transition-colors"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>
                        Name <span className="text-[#c9a96e]">*</span>
                      </label>
                      <input
                        {...register("name")}
                        placeholder="Your full name"
                        className={inputClass}
                      />
                      {errors.name && (
                        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} />
                          {errors.name.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>
                        Email <span className="text-[#c9a96e]">*</span>
                      </label>
                      <input
                        {...register("email")}
                        type="email"
                        placeholder="you@example.com"
                        className={inputClass}
                      />
                      {errors.email && (
                        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} />
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Phone</label>
                      <div className="relative">
                        <Phone
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]"
                        />
                        <input
                          {...register("phone")}
                          placeholder="03001234567"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} />
                          {errors.phone.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Subject</label>
                      <input
                        {...register("subject")}
                        placeholder="Order inquiry, product question…"
                        className={inputClass}
                      />
                      {errors.subject && (
                        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle size={11} />
                          {errors.subject.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Message <span className="text-[#c9a96e]">*</span>
                    </label>
                    <textarea
                      {...register("message")}
                      rows={6}
                      placeholder="Tell us how we can help…"
                      className={`${inputClass} resize-y min-h-[140px]`}
                    />
                    {errors.message && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={11} />
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1a1a1a] text-white text-xs tracking-[2px] uppercase font-semibold hover:bg-[#333] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Send size={15} />
                    {isPending ? "Sending…" : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Contact info sidebar */}
          <div className="space-y-5">
            <div className="bg-white border border-[#e8e0d4] p-5 sm:p-6">
              <h2 className="text-xs tracking-[2.5px] uppercase font-bold text-[#1a1a1a] mb-5">
                Other ways to reach us
              </h2>
              <ul className="space-y-4">
                <li>
                  <a
                    href={`https://wa.me/${WHATSAPP}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 text-sm text-[#25D366] hover:text-[#1a1a1a] transition-colors group"
                  >
                    <MessageCircle size={18} className="shrink-0 mt-0.5" />
                    <span>
                      <span className="block font-semibold">WhatsApp</span>
                      <span className="text-[#888] group-hover:text-[#555] text-xs">
                        Fastest response — usually within an hour
                      </span>
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${env.supportEmail}`}
                    className="flex items-start gap-3 text-sm text-[#555] hover:text-[#c9a96e] transition-colors"
                  >
                    <Mail size={18} className="shrink-0 mt-0.5" />
                    <span>
                      <span className="block font-semibold">Email</span>
                      <span className="text-[#888] text-xs">
                        {env.supportEmail}
                      </span>
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            <div className="bg-[#1a1a1a] text-white p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-[#c9a96e]" />
                <p className="text-xs tracking-[2px] uppercase font-semibold">
                  Response time
                </p>
              </div>
              <p className="text-sm text-[#ccc] leading-relaxed">
                We reply to all messages within{" "}
                <span className="text-[#c9a96e] font-semibold">
                  1–2 business days
                </span>
                . For urgent order queries, WhatsApp is recommended.
              </p>
              <Link
                to="/track-order"
                className="inline-block mt-4 text-xs tracking-[1.5px] uppercase text-[#c9a96e] hover:text-white transition-colors underline underline-offset-2"
              >
                Track an existing order
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
