import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  MapPin, Plus, Pencil, Trash2, CheckCircle, X, AlertCircle, Star,
} from "lucide-react";
import useAuthStore from "../../store/authStore.js";
import authService from "../../services/authService.js";
import toast from "react-hot-toast";

const PROVINCES = [
  "Punjab","Sindh","Khyber Pakhtunkhwa","Balochistan",
  "Gilgit-Baltistan","Azad Kashmir","Islamabad Capital Territory",
];

const addressSchema = z.object({
  label:      z.string().max(30).optional(),
  fullName:   z.string().min(2, "Full name is required").max(80),
  phone:      z.string().regex(/^(\+92|0)[0-9]{10}$/, "Valid Pakistani number required"),
  street:     z.string().min(5, "Street address is required").max(200),
  city:       z.string().min(2, "City is required").max(60),
  province:   z.string().min(1, "Province is required"),
  postalCode: z.string().optional().refine((v) => !v || /^[0-9]{5}$/.test(v), "5 digits required"),
  isDefault:  z.boolean().optional(),
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

function AddressForm({ initial, onSave, onCancel, isSaving }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label:      initial?.label      || "",
      fullName:   initial?.fullName   || "",
      phone:      initial?.phone      || "",
      street:     initial?.street     || "",
      city:       initial?.city       || "",
      province:   initial?.province   || "",
      postalCode: initial?.postalCode || "",
      isDefault:  initial?.isDefault  ?? false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4 p-5 bg-[#f9f7f4] border border-[#e0d8ce]">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Label" error={errors.label?.message}>
          <input {...register("label")} placeholder='e.g. "Home", "Office"' className={inputClass} />
        </Field>
        <Field label="Full Name" required error={errors.fullName?.message}>
          <input {...register("fullName")} placeholder="Recipient's name" className={inputClass} />
        </Field>
      </div>
      <Field label="Phone" required error={errors.phone?.message}>
        <input {...register("phone")} placeholder="03001234567" className={inputClass} />
      </Field>
      <Field label="Street Address" required error={errors.street?.message}>
        <textarea {...register("street")} placeholder="House no., Street name, Area" rows={2} className={`${inputClass} resize-none`} />
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="City" required error={errors.city?.message}>
          <input {...register("city")} placeholder="Lahore" className={inputClass} />
        </Field>
        <Field label="Province" required error={errors.province?.message}>
          <select {...register("province")} className={inputClass}>
            <option value="">Select</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Postal Code" error={errors.postalCode?.message}>
          <input {...register("postalCode")} placeholder="54000" maxLength={5} className={inputClass} />
        </Field>
      </div>
      <label className="flex items-center gap-2.5 cursor-pointer">
        <input type="checkbox" {...register("isDefault")} className="w-4 h-4 accent-[#1a1a1a]" />
        <span className="text-sm text-[#555]">Set as default address</span>
      </label>
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 bg-[#1a1a1a] text-white text-xs tracking-[1.5px] uppercase font-bold px-6 py-3 hover:bg-[#c9a96e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
          ) : (
            <><CheckCircle size={13} />Save Address</>
          )}
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 text-xs tracking-[1.5px] uppercase font-medium text-[#555] border border-[#d0c8be] px-5 py-3 hover:border-[#1a1a1a] transition-colors">
          <X size={13} />Cancel
        </button>
      </div>
    </form>
  );
}

function AddressCard({ address, onEdit, onDelete, onSetDefault }) {
  return (
    <div className={`bg-white border p-4 sm:p-5 transition-all ${address.isDefault ? "border-[#1a1a1a]" : "border-[#e8e0d4] hover:border-[#999]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${address.isDefault ? "bg-[#1a1a1a]" : "bg-[#f0ebe3]"}`}>
            <MapPin size={14} className={address.isDefault ? "text-[#c9a96e]" : "text-[#888]"} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {address.label && (
                <span className="text-[10px] tracking-[1.5px] uppercase font-bold text-[#888]">{address.label}</span>
              )}
              {address.isDefault && (
                <span className="text-[9px] tracking-[1.5px] uppercase font-bold bg-[#1a1a1a] text-[#c9a96e] px-2 py-0.5 flex items-center gap-1">
                  <Star size={8} />Default
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-[#1a1a1a]">{address.fullName}</p>
            <p className="text-xs text-[#777] mt-0.5">{address.phone}</p>
            <p className="text-xs text-[#777]">{address.street}</p>
            <p className="text-xs text-[#777]">
              {address.city}, {address.province}
              {address.postalCode && ` — ${address.postalCode}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {!address.isDefault && (
            <button
              onClick={() => onSetDefault(address._id)}
              className="text-[10px] text-[#888] hover:text-[#c9a96e] transition-colors tracking-wide whitespace-nowrap"
            >
              Set Default
            </button>
          )}
          <button
            onClick={() => onEdit(address)}
            className="p-1.5 text-[#888] hover:text-[#1a1a1a] transition-colors"
            aria-label="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(address._id)}
            className="p-1.5 text-[#888] hover:text-red-500 transition-colors"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddressesPage() {
  const { user, addAddressLocally, updateAddressLocally, removeAddressLocally } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null); // address object

  const addresses = user?.addresses || [];

  const { mutate: addAddress, isPending: adding } = useMutation({
    mutationFn: (data) => authService.addAddress(data),
    onSuccess: (updated) => {
      const newest = updated[updated.length - 1];
      if (newest) addAddressLocally(newest);
      setShowForm(false);
      toast.success("Address added.");
    },
    onError: (err) => toast.error(err.message || "Could not add address."),
  });

  const { mutate: updateAddress, isPending: updating } = useMutation({
    mutationFn: ({ id, data }) => authService.updateAddress(id, data),
    onSuccess: (_, { id, data }) => {
      updateAddressLocally(id, data);
      setEditing(null);
      toast.success("Address updated.");
    },
    onError: (err) => toast.error(err.message || "Could not update address."),
  });

  const { mutate: deleteAddress } = useMutation({
    mutationFn: (id) => authService.deleteAddress(id),
    onSuccess: (_, id) => {
      removeAddressLocally(id);
      toast.success("Address removed.");
    },
    onError: (err) => toast.error(err.message || "Could not delete address."),
  });

  const handleDelete = (id) => {
    if (!window.confirm("Remove this address?")) return;
    deleteAddress(id);
  };

  const handleSetDefault = (id) => {
    updateAddress({ id, data: { isDefault: true } });
  };

  const handleSave = (data) => {
    if (editing) {
      updateAddress({ id: editing._id, data });
    } else {
      addAddress(data);
    }
  };

  const defaultAddr = addresses.find((a) => a.isDefault);
  const otherAddrs  = addresses.filter((a) => !a.isDefault);
  const sorted      = defaultAddr ? [defaultAddr, ...otherAddrs] : addresses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a]">Delivery Addresses</h1>
          <p className="text-xs text-[#888] mt-1">
            {addresses.length} / 5 saved addresses
          </p>
        </div>
        {!showForm && !editing && addresses.length < 5 && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#1a1a1a] text-white text-xs tracking-[1.5px] uppercase font-bold px-5 py-2.5 hover:bg-[#c9a96e] transition-colors"
          >
            <Plus size={14} /> Add Address
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <AddressForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          isSaving={adding}
        />
      )}

      {/* Address list */}
      {sorted.length === 0 && !showForm ? (
        <div className="bg-white border border-[#e8e0d4] p-12 text-center">
          <MapPin size={30} className="mx-auto text-[#e0d8ce] mb-4" />
          <h2 className="font-serif text-xl text-[#1a1a1a] mb-2">No Addresses Saved</h2>
          <p className="text-sm text-[#888] mb-5">Add a delivery address to speed up checkout.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white text-xs tracking-[2px] uppercase font-bold px-7 py-3.5 hover:bg-[#c9a96e] transition-colors"
          >
            <Plus size={13} /> Add Your First Address
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((address) =>
            editing?._id === address._id ? (
              <AddressForm
                key={address._id}
                initial={address}
                onSave={handleSave}
                onCancel={() => setEditing(null)}
                isSaving={updating}
              />
            ) : (
              <AddressCard
                key={address._id}
                address={address}
                onEdit={(a) => { setShowForm(false); setEditing(a); }}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            )
          )}
        </div>
      )}

      {addresses.length >= 5 && !showForm && !editing && (
        <p className="text-xs text-[#aaa] text-center">
          Maximum 5 addresses reached. Delete one to add another.
        </p>
      )}
    </div>
  );
}