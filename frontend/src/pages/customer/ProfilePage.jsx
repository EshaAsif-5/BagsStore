import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { User, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import useAuthStore from "../../store/authStore.js";
import authService from "../../services/authService.js";
import toast from "react-hot-toast";

const profileSchema = z.object({
  name:  z.string().min(2, "Name must be at least 2 characters").max(80),
  phone: z.string().regex(/^(\+92|0)[0-9]{10}$/, "Enter a valid Pakistani phone number").optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Must include uppercase, lowercase, and a number"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const inputClass = "w-full border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] placeholder:text-[#bbb] focus:outline-none focus:border-[#1a1a1a] bg-white transition-colors";

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs tracking-[1.5px] uppercase font-semibold text-[#1a1a1a] mb-1.5">
        {label}{required && <span className="text-[#c9a96e] ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  );
}

function PasswordInput({ register, name, placeholder, errors }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...register(name)}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        className={`${inputClass} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((p) => !p)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#555] transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white border border-[#e8e0d4] p-5 sm:p-7">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#f0ebe3]">
        <div className="w-9 h-9 rounded-full bg-[#f0ebe3] flex items-center justify-center">
          <Icon size={16} className="text-[#c9a96e]" />
        </div>
        <h2 className="font-serif text-xl text-[#1a1a1a]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();

  // ── Profile form ──────────────────────────────
  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors, isDirty: profileDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || "", phone: user?.phone || "" },
  });

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: (data) => authService.updateProfile(data),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast.success("Profile updated successfully.");
    },
    onError: (err) => toast.error(err.message || "Could not update profile."),
  });

  // ── Password form ─────────────────────────────
  const {
    register: regPwd,
    handleSubmit: handlePwd,
    reset: resetPwd,
    formState: { errors: pwdErrors },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  const { mutate: savePassword, isPending: savingPassword } = useMutation({
    mutationFn: (data) => authService.changePassword(data),
    onSuccess: () => {
      toast.success("Password changed. Please sign in again.");
      resetPwd();
    },
    onError: (err) => toast.error(err.message || "Could not change password."),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a]">My Profile</h1>

      {/* Account info header */}
      <div className="flex items-center gap-4 p-5 bg-white border border-[#e8e0d4]">
        <div className="w-14 h-14 rounded-full bg-[#1a1a1a] flex items-center justify-center shrink-0">
          <span className="text-white text-xl font-semibold uppercase">
            {user?.name?.charAt(0)}
          </span>
        </div>
        <div>
          <p className="font-semibold text-[#1a1a1a]">{user?.name}</p>
          <p className="text-sm text-[#888]">{user?.email}</p>
          <span className="inline-block mt-1 text-[9px] tracking-[2px] uppercase font-bold bg-[#f0ebe3] text-[#c9a96e] px-2 py-0.5">
            Customer
          </span>
        </div>
      </div>

      {/* Edit profile */}
      <Section icon={User} title="Personal Information">
        <form onSubmit={handleProfile((d) => saveProfile(d))} className="space-y-5">
          <Field label="Full Name" required error={profileErrors.name?.message}>
            <input {...regProfile("name")} placeholder="Your full name" className={inputClass} />
          </Field>
          <Field label="Email Address">
            <input
              value={user?.email || ""}
              disabled
              className={`${inputClass} bg-[#f9f7f4] text-[#aaa] cursor-not-allowed`}
            />
            <p className="text-[10px] text-[#aaa] mt-1">Email cannot be changed.</p>
          </Field>
          <Field label="Phone Number" error={profileErrors.phone?.message}>
            <input {...regProfile("phone")} placeholder="03001234567" className={inputClass} />
          </Field>
          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={savingProfile || !profileDirty}
              className="flex items-center gap-2 bg-[#1a1a1a] text-white text-xs tracking-[1.5px] uppercase font-bold px-7 py-3 hover:bg-[#c9a96e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingProfile ? (
                <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
              ) : (
                <><CheckCircle size={13} />Save Changes</>
              )}
            </button>
            {!profileDirty && (
              <p className="text-xs text-[#aaa]">No changes to save</p>
            )}
          </div>
        </form>
      </Section>

      {/* Change password */}
      <Section icon={Lock} title="Change Password">
        <form onSubmit={handlePwd((d) => savePassword(d))} className="space-y-5">
          <Field label="Current Password" required error={pwdErrors.currentPassword?.message}>
            <PasswordInput register={regPwd} name="currentPassword" placeholder="Your current password" />
          </Field>
          <div className="h-px bg-[#f0ebe3]" />
          <Field label="New Password" required error={pwdErrors.newPassword?.message}>
            <PasswordInput register={regPwd} name="newPassword" placeholder="At least 8 characters" />
          </Field>
          <Field label="Confirm New Password" required error={pwdErrors.confirmPassword?.message}>
            <PasswordInput register={regPwd} name="confirmPassword" placeholder="Repeat new password" />
          </Field>
          <div className="flex items-start gap-2 text-[11px] text-[#888] bg-[#f9f7f4] p-3 border border-[#ece8e0]">
            <AlertCircle size={12} className="text-[#c9a96e] shrink-0 mt-0.5" />
            Changing your password will sign you out of all devices.
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="flex items-center gap-2 bg-[#1a1a1a] text-white text-xs tracking-[1.5px] uppercase font-bold px-7 py-3 hover:bg-[#c9a96e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingPassword ? (
              <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
            ) : (
              <><Lock size={13} />Update Password</>
            )}
          </button>
        </form>
      </Section>
    </div>
  );
}