import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronRight,
  ChevronLeft,
  Package,
  CreditCard,
  CheckCircle,
  AlertCircle,
  MapPin,
  Phone,
  User,
  Banknote,
  Smartphone,
  Truck,
  ShoppingBag,
  Lock,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import useCartStore from "../../store/cartStore.js";
import useAuthStore from "../../store/authStore.js";
import orderService from "../../services/orderService.js";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const SHIPPING_THRESHOLD = 5000;
const SHIPPING_FEE = 200;
const formatPrice = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;

const PROVINCES = [
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Gilgit-Baltistan",
  "Azad Kashmir",
  "Islamabad Capital Territory",
];

const PAYMENT_METHODS = [
  {
    id: "cod",
    label: "Cash on Delivery",
    icon: Banknote,
    desc: "Pay in cash when your order arrives.",
  },
  {
    id: "easypaisa",
    label: "EasyPaisa",
    icon: Smartphone,
    desc: "Send payment to our EasyPaisa account.",
    requiresProof: true,
  },
  {
    id: "jazzcash",
    label: "JazzCash",
    icon: Smartphone,
    desc: "Send payment to our JazzCash account.",
    requiresProof: true,
  },
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    icon: CreditCard,
    desc: "Transfer to our bank account.",
    requiresProof: true,
  },
];

// ─────────────────────────────────────────────
// STEPS
// ─────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Address", icon: MapPin },
  { id: 2, label: "Payment", icon: CreditCard },
  { id: 3, label: "Review", icon: CheckCircle },
];

// ─────────────────────────────────────────────
// VALIDATION SCHEMA
// ─────────────────────────────────────────────
const addressSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  phone: z
    .string()
    .regex(/^(\+92|0)[0-9]{10}$/, "Enter a valid Pakistani phone number"),
  street: z.string().min(5, "Street address is required"),
  city: z.string().min(2, "City is required"),
  province: z.string().min(1, "Province is required"),
  postalCode: z
    .string()
    .optional()
    .refine((v) => !v || /^[0-9]{5}$/.test(v), "Postal code must be 5 digits"),
  notes: z.string().max(500).optional(),
  // Guest-only fields
  guestEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

// ─────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const done = current > step.id;
        const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  done
                    ? "bg-[#1a1a1a] border-[#1a1a1a]"
                    : active
                      ? "border-[#1a1a1a] bg-white"
                      : "border-[#d0c8be] bg-white"
                }`}
              >
                {done ? (
                  <CheckCircle size={16} className="text-[#c9a96e]" />
                ) : (
                  <step.icon
                    size={15}
                    className={active ? "text-[#1a1a1a]" : "text-[#bbb]"}
                  />
                )}
              </div>
              <span
                className={`text-[10px] tracking-[1px] uppercase font-medium ${
                  active ? "text-[#1a1a1a]" : done ? "text-[#888]" : "text-[#bbb]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-16 sm:w-24 h-px mx-3 mb-5 transition-colors duration-300 ${
                  current > step.id ? "bg-[#1a1a1a]" : "bg-[#e0d8ce]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// FORM FIELD COMPONENT
// ─────────────────────────────────────────────
function Field({ label, error, required, children }) {
  return (
    <div>
      <label className="block text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] mb-1.5">
        {label} {required && <span className="text-[#c9a96e]">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] placeholder:text-[#bbb] focus:outline-none focus:border-[#1a1a1a] bg-white transition-colors";

// ─────────────────────────────────────────────
// STEP 1: SHIPPING ADDRESS
// ─────────────────────────────────────────────
function AddressStep({ onNext, savedAddress }) {
  const { user, isAuthenticated } = useAuthStore();
  const defaultAddress = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: savedAddress || {
      fullName: defaultAddress?.fullName || user?.name || "",
      phone: defaultAddress?.phone || user?.phone || "",
      street: defaultAddress?.street || "",
      city: defaultAddress?.city || "",
      province: defaultAddress?.province || "",
      postalCode: defaultAddress?.postalCode || "",
      notes: "",
      guestEmail: "",
    },
  });

  // Address book quick-fill
  const fillFromAddress = (addr) => {
    setValue("fullName", addr.fullName);
    setValue("phone", addr.phone);
    setValue("street", addr.street);
    setValue("city", addr.city);
    setValue("province", addr.province);
    setValue("postalCode", addr.postalCode || "");
  };

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      {/* Guest email */}
      {!isAuthenticated && (
        <Field label="Email Address (for order updates)" error={errors.guestEmail?.message}>
          <input
            {...register("guestEmail")}
            type="email"
            placeholder="your@email.com"
            className={inputClass}
          />
        </Field>
      )}

      {/* Address book */}
      {isAuthenticated && user?.addresses?.length > 0 && (
        <div className="border border-[#e0d8ce] p-4 bg-[#fafaf8]">
          <p className="text-xs tracking-[1.5px] uppercase font-semibold text-[#888] mb-3">
            Saved Addresses
          </p>
          <div className="space-y-2">
            {user.addresses.map((addr) => (
              <button
                key={addr._id}
                type="button"
                onClick={() => fillFromAddress(addr)}
                className="w-full text-left p-3 border border-[#e0d8ce] hover:border-[#1a1a1a] transition-colors text-xs text-[#555] group"
              >
                <span className="font-medium text-[#1a1a1a] group-hover:text-[#c9a96e] transition-colors">
                  {addr.label || "Address"}
                </span>{" "}
                · {addr.fullName} · {addr.street}, {addr.city}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Name & phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name" required error={errors.fullName?.message}>
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
            <input
              {...register("fullName")}
              placeholder="Recipient's full name"
              className={`${inputClass} pl-9`}
            />
          </div>
        </Field>
        <Field label="Phone Number" required error={errors.phone?.message}>
          <div className="relative">
            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
            <input
              {...register("phone")}
              placeholder="03001234567"
              className={`${inputClass} pl-9`}
            />
          </div>
        </Field>
      </div>

      {/* Street */}
      <Field label="Street Address" required error={errors.street?.message}>
        <div className="relative">
          <MapPin size={14} className="absolute left-3 top-3 text-[#bbb]" />
          <textarea
            {...register("street")}
            placeholder="House/Flat no., Street name, Area"
            rows={2}
            className={`${inputClass} pl-9 resize-none`}
          />
        </div>
      </Field>

      {/* City, Province, Postal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="City" required error={errors.city?.message}>
          <input
            {...register("city")}
            placeholder="e.g. Lahore"
            className={inputClass}
          />
        </Field>
        <Field label="Province" required error={errors.province?.message}>
          <select {...register("province")} className={inputClass}>
            <option value="">Select province</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Postal Code" error={errors.postalCode?.message}>
          <input
            {...register("postalCode")}
            placeholder="54000"
            maxLength={5}
            className={inputClass}
          />
        </Field>
      </div>

      {/* Notes */}
      <Field label="Delivery Instructions (Optional)" error={errors.notes?.message}>
        <textarea
          {...register("notes")}
          placeholder="E.g. call before delivery, leave with neighbour…"
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </Field>

      <button
        type="submit"
        className="w-full bg-[#1a1a1a] text-white text-xs tracking-[2px] uppercase font-bold py-4 hover:bg-[#c9a96e] transition-colors flex items-center justify-center gap-2 group"
      >
        Continue to Payment
        <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────
// STEP 2: PAYMENT METHOD
// ─────────────────────────────────────────────
function PaymentStep({ onNext, onBack, savedPayment }) {
  const [selected, setSelected] = useState(savedPayment?.method || "cod");
  const [transactionId, setTransactionId] = useState(savedPayment?.transactionId || "");

  const handleNext = () => {
    const method = PAYMENT_METHODS.find((m) => m.id === selected);
    if (method?.requiresProof && !transactionId.trim()) {
      toast.error("Please enter your transaction ID or reference number.");
      return;
    }
    onNext({ method: selected, transactionId: transactionId.trim() });
  };

  const activeMethod = PAYMENT_METHODS.find((m) => m.id === selected);

  return (
    <div className="space-y-5">
      {/* Payment options */}
      <div className="space-y-3">
        {PAYMENT_METHODS.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelected(id)}
            className={`w-full flex items-start gap-4 p-4 border-2 text-left transition-all duration-150 ${
              selected === id
                ? "border-[#1a1a1a] bg-[#fafaf8]"
                : "border-[#e0d8ce] hover:border-[#999]"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                selected === id ? "border-[#1a1a1a]" : "border-[#bbb]"
              }`}
            >
              {selected === id && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#1a1a1a]" />
              )}
            </div>
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Icon size={18} className="text-[#c9a96e] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[#1a1a1a]">{label}</p>
                <p className="text-xs text-[#888] mt-0.5">{desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Transaction ID for non-COD */}
      {activeMethod?.requiresProof && (
        <div className="border border-[#e0d8ce] bg-[#fafaf8] p-4 space-y-3">
          <div className="text-xs text-[#555] space-y-1.5">
            <p className="font-semibold text-[#1a1a1a]">
              How to Pay via {activeMethod.label}:
            </p>
            {selected === "easypaisa" && (
              <p>Send <strong>your total</strong> to: <span className="text-[#c9a96e] font-mono">0300-XXXXXXX</span> (ZEE BY ZOHAIB)</p>
            )}
            {selected === "jazzcash" && (
              <p>Send <strong>your total</strong> to: <span className="text-[#c9a96e] font-mono">0300-XXXXXXX</span> (ZEE BY ZOHAIB)</p>
            )}
            {selected === "bank_transfer" && (
              <>
                <p>Bank: <strong>Meezan Bank</strong></p>
                <p>Account: <span className="text-[#c9a96e] font-mono">XXXX-XXXX-XXXX</span></p>
                <p>Title: <strong>ZEE BY ZOHAIB</strong></p>
              </>
            )}
          </div>
          <div>
            <label className="text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] block mb-1.5">
              Transaction ID / Reference *
            </label>
            <input
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Enter your transaction reference number"
              className={inputClass}
            />
            <p className="text-[10px] text-[#aaa] mt-1">
              Your order will be confirmed once payment is verified (within 2 hours).
            </p>
          </div>
        </div>
      )}

      {selected === "cod" && (
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200">
          <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Please keep the exact amount ready at the time of delivery. Our rider will not carry change.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs tracking-[1.5px] uppercase font-medium text-[#555] border border-[#d0c8be] px-5 py-3.5 hover:border-[#1a1a1a] transition-colors"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 bg-[#1a1a1a] text-white text-xs tracking-[2px] uppercase font-bold py-3.5 hover:bg-[#c9a96e] transition-colors flex items-center justify-center gap-2 group"
        >
          Review Order
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 3: ORDER REVIEW
// ─────────────────────────────────────────────
function ReviewStep({ address, payment, items, subtotal, onBack, onPlace, isPlacing }) {
  const shippingFee = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shippingFee;
  const paymentLabel = PAYMENT_METHODS.find((m) => m.id === payment.method)?.label;

  return (
    <div className="space-y-6">
      {/* Delivery details */}
      <div className="border border-[#e0d8ce] p-4 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs tracking-[1.5px] uppercase font-bold text-[#1a1a1a]">
            Delivery To
          </p>
          <button
            type="button"
            onClick={() => onBack(1)}
            className="text-[11px] text-[#c9a96e] hover:underline"
          >
            Edit
          </button>
        </div>
        <p className="text-sm font-semibold text-[#1a1a1a]">{address.fullName}</p>
        <p className="text-sm text-[#555]">{address.phone}</p>
        <p className="text-sm text-[#555]">{address.street}</p>
        <p className="text-sm text-[#555]">
          {address.city}, {address.province}
          {address.postalCode && ` — ${address.postalCode}`}
        </p>
        {address.notes && (
          <p className="text-xs text-[#888] italic mt-1">Note: {address.notes}</p>
        )}
      </div>

      {/* Payment */}
      <div className="border border-[#e0d8ce] p-4 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs tracking-[1.5px] uppercase font-bold text-[#1a1a1a]">
            Payment
          </p>
          <button
            type="button"
            onClick={() => onBack(2)}
            className="text-[11px] text-[#c9a96e] hover:underline"
          >
            Edit
          </button>
        </div>
        <p className="text-sm font-semibold text-[#1a1a1a]">{paymentLabel}</p>
        {payment.transactionId && (
          <p className="text-sm text-[#555]">Ref: {payment.transactionId}</p>
        )}
      </div>

      {/* Items */}
      <div className="border border-[#e0d8ce]">
        <div className="px-4 py-3 border-b border-[#e0d8ce]">
          <p className="text-xs tracking-[1.5px] uppercase font-bold text-[#1a1a1a]">
            Items ({items.length})
          </p>
        </div>
        <div className="divide-y divide-[#f0ebe3]">
          {items.map((item) => (
            <div key={item._id} className="flex items-center gap-3 px-4 py-3">
              {item.product?.image && (
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-12 h-14 object-cover bg-[#f4f1ec] shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1a1a] truncate">
                  {item.product?.name}
                </p>
                <p className="text-xs text-[#888]">
                  {item.variant?.color} · {item.variant?.size} · Qty {item.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold text-[#1a1a1a] shrink-0">
                {formatPrice(item.currentPrice * item.quantity)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="border border-[#e0d8ce] p-4 space-y-2.5 text-sm">
        <div className="flex justify-between text-[#555]">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-[#555]">
          <span>Shipping</span>
          {shippingFee === 0 ? (
            <span className="text-green-600 font-medium text-xs uppercase">Free</span>
          ) : (
            <span>{formatPrice(shippingFee)}</span>
          )}
        </div>
        <div className="border-t border-[#ece8e0] pt-2.5 flex justify-between font-bold text-base">
          <span className="text-[#1a1a1a]">Total</span>
          <span className="font-serif text-lg text-[#1a1a1a]">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-center gap-2 text-[11px] text-[#888]">
        <Lock size={12} />
        <span>Your order details are secure and will not be shared with third parties.</span>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onBack(2)}
          className="flex items-center gap-1.5 text-xs tracking-[1.5px] uppercase font-medium text-[#555] border border-[#d0c8be] px-5 py-3.5 hover:border-[#1a1a1a] transition-colors"
        >
          <ChevronLeft size={14} /> Back
        </button>
        <button
          type="button"
          onClick={onPlace}
          disabled={isPlacing}
          className="flex-1 bg-[#c9a96e] text-[#1a1a1a] text-xs tracking-[2px] uppercase font-bold py-3.5 hover:bg-[#1a1a1a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPlacing ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Placing Order…
            </>
          ) : (
            <>
              <Package size={15} />
              Place Order
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CHECKOUT PAGE
// ─────────────────────────────────────────────
export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { items, subtotal, clearLocalCart } = useCartStore();

  const [step, setStep] = useState(1);
  const [address, setAddress] = useState(null);
  const [payment, setPayment] = useState(null);

  // Redirect to cart if empty
  useEffect(() => {
    if (items.length === 0) {
      navigate("/cart");
    }
  }, [items.length, navigate]);

  const { mutate: placeOrder, isPending } = useMutation({
    mutationFn: (payload) => orderService.placeOrder(payload),
    onSuccess: (data) => {
      clearLocalCart();
      navigate(`/order-confirmation/${data.order._id}`, {
        state: {
          order: data.order,
          paymentInstructions: data.paymentInstructions,
        },
        replace: true,
      });
    },
    onError: (err) => {
      toast.error(err.message || "Could not place your order. Please try again.");
    },
  });

  const handleAddressNext = (data) => {
    setAddress(data);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePaymentNext = (data) => {
    setPayment(data);
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = (toStep) => {
    setStep(toStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePlaceOrder = () => {
    const orderItems = items.map((item) => ({
      productId: item.product?._id,
      variantId: item.variant?._id,
      quantity: item.quantity,
    }));

    const payload = {
      items: orderItems,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        street: address.street,
        city: address.city,
        province: address.province,
        postalCode: address.postalCode || undefined,
      },
      paymentMethod: payment.method,
      paymentTransactionId: payment.transactionId || undefined,
      notes: address.notes || undefined,
      // Guest fields
      ...(!isAuthenticated && {
        guestName: address.fullName,
        guestEmail: address.guestEmail || undefined,
        guestPhone: address.phone,
      }),
    };

    placeOrder(payload);
  };

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      {/* Header */}
      <div className="bg-white border-b border-[#ece8e0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="font-serif text-sm tracking-[3px] text-[#1a1a1a] uppercase hover:text-[#c9a96e] transition-colors"
          >
            ZEE.BY ZOHAIB
          </Link>
          <Link
            to="/cart"
            className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#c9a96e] transition-colors"
          >
            <ShoppingBag size={14} />
            Back to Cart
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a] text-center mb-8">
          Checkout
        </h1>

        <StepIndicator current={step} />

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Form area */}
          <div className="lg:flex-1 min-w-0">
            <div className="bg-white border border-[#e8e0d4] p-5 sm:p-7">
              {step === 1 && (
                <AddressStep onNext={handleAddressNext} savedAddress={address} />
              )}
              {step === 2 && (
                <PaymentStep
                  onNext={handlePaymentNext}
                  onBack={() => handleBack(1)}
                  savedPayment={payment}
                />
              )}
              {step === 3 && (
                <ReviewStep
                  address={address}
                  payment={payment}
                  items={items}
                  subtotal={subtotal}
                  onBack={handleBack}
                  onPlace={handlePlaceOrder}
                  isPlacing={isPending}
                />
              )}
            </div>
          </div>

          {/* Sidebar summary */}
          <div className="lg:w-72 xl:w-80 shrink-0">
            <div className="bg-white border border-[#e8e0d4] p-5 sticky top-24">
              <h2 className="font-serif text-lg text-[#1a1a1a] mb-4">
                Order Summary
              </h2>
              <div className="space-y-3 mb-4">
                {items.slice(0, 3).map((item) => (
                  <div key={item._id} className="flex items-center gap-3">
                    {item.product?.image ? (
                      <img
                        src={item.product.image}
                        alt=""
                        className="w-10 h-12 object-cover bg-[#f4f1ec] shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-12 bg-[#f4f1ec] shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#1a1a1a] truncate">
                        {item.product?.name}
                      </p>
                      <p className="text-[11px] text-[#888]">
                        Qty {item.quantity} · {formatPrice(item.currentPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-xs text-[#888] text-center">
                    +{items.length - 3} more item{items.length - 3 > 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <div className="border-t border-[#ece8e0] pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-[#555]">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#555]">
                  <span>Shipping</span>
                  {subtotal >= SHIPPING_THRESHOLD ? (
                    <span className="text-green-600 text-xs font-medium uppercase">Free</span>
                  ) : (
                    <span>{formatPrice(SHIPPING_FEE)}</span>
                  )}
                </div>
                <div className="flex justify-between font-bold text-base pt-1 border-t border-[#ece8e0]">
                  <span className="text-[#1a1a1a]">Total</span>
                  <span className="font-serif text-[#1a1a1a]">
                    {formatPrice(subtotal + (subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}