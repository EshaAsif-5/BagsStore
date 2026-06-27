import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  UserPlus,
  Mail,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../../store/authStore.js";

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(80, "Name cannot exceed 80 characters."),
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Please enter a valid email address."),
    phone: z
      .string()
      .trim()
      .optional()
      .refine(
        (val) => !val || /^(\+92|0)[0-9]{10}$/.test(val),
        "Enter a valid Pakistani number (e.g. 03001234567)."
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(64, "Password cannot exceed 64 characters.")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Must include uppercase, lowercase, and a number."
      ),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const inputClass =
  "w-full border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] placeholder:text-[#bbb] focus:outline-none focus:border-[#1a1a1a] bg-white transition-colors";

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] mb-1.5">
        {label}
        {required && <span className="text-[#c9a96e] ml-0.5">*</span>}
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

function PasswordInput({ register, label, name, placeholder, error, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} required error={error}>
      <div className="relative">
        <input
          {...register(name)}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#555] transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </Field>
  );
}

function getRedirectPath(user, fromLocation) {
  const fromPath = fromLocation?.pathname;
  if (fromPath && fromPath !== "/login" && fromPath !== "/register") {
    return fromPath + (fromLocation.search || "") + (fromLocation.hash || "");
  }
  return user?.role === "admin" ? "/admin" : "/account";
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register: registerUser, isLoading, error, clearError, isAuthenticated, user } =
    useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => () => clearError(), [clearError]);

  if (isAuthenticated) {
    return (
      <Navigate
        to={getRedirectPath(user, location.state?.from)}
        replace
      />
    );
  }

  const onSubmit = async (data) => {
    try {
      const newUser = await registerUser({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password,
      });
      toast.success("Account created successfully!");
      navigate(getRedirectPath(newUser, location.state?.from), {
        replace: true,
      });
    } catch {
      // Error message is stored in authStore.error
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      <div className="bg-white border-b border-[#ece8e0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <nav className="text-[11px] tracking-[1.5px] uppercase text-[#aaa] mb-3 flex items-center gap-2">
            <Link to="/" className="hover:text-[#c9a96e] transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-[#555]">Register</span>
          </nav>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a]">
            Create Account
          </h1>
          <p className="text-sm text-[#888] mt-2">
            Join ZEE.BY ZOHAIB to save your orders, wishlist, and delivery
            addresses.
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 lg:py-12">
        <div className="bg-white border border-[#e8e0d4] p-5 sm:p-7">
          {error && (
            <div className="flex items-start gap-2 p-3 mb-5 bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Field label="Full Name" required error={errors.name?.message}>
              <input
                {...register("name")}
                placeholder="Your full name"
                autoComplete="name"
                className={inputClass}
              />
            </Field>

            <Field label="Email Address" required error={errors.email?.message}>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]"
                />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </Field>

            <Field label="Phone Number" error={errors.phone?.message}>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]"
                />
                <input
                  {...register("phone")}
                  placeholder="03001234567"
                  autoComplete="tel"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </Field>

            <PasswordInput
              register={register}
              label="Password"
              name="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              error={errors.password?.message}
            />

            <PasswordInput
              register={register}
              label="Confirm Password"
              name="confirmPassword"
              placeholder="Repeat your password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
            />

            <div className="flex items-start gap-2 text-[11px] text-[#888] bg-[#f9f7f4] p-3 border border-[#ece8e0]">
              <AlertCircle size={12} className="text-[#c9a96e] shrink-0 mt-0.5" />
              Password must include uppercase, lowercase, and a number.
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] text-white text-xs tracking-[2px] uppercase font-bold px-7 py-3.5 hover:bg-[#c9a96e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Account…
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-sm text-[#888] text-center mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              state={location.state}
              className="text-[#c9a96e] font-medium hover:text-[#1a1a1a] transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
