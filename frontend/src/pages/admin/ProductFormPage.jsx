import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, Pencil, Trash2, Eye, EyeOff, Package,
  ChevronLeft, ChevronRight, Star,
} from "lucide-react";
import productService from "../../services/productService.js";
import toast from "react-hot-toast";

const formatPrice = (n) => `PKR ${Number(n).toLocaleString("en-PK")}`;

const CATEGORIES = [
  { value: "",           label: "All Categories" },
  { value: "university", label: "University" },
  { value: "modern",     label: "Modern" },
  { value: "luxury",     label: "Luxury" },
  { value: "stylish",    label: "Stylish" },
];

const LIMIT = 15;

export default function ProductListPage() {
  const queryClient = useQueryClient();
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState("");
  const [page,     setPage]     = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin", "products", { page, limit: LIMIT, category, isActive, search }],
    queryFn:  () => productService.getProductsAdmin({
      page, limit: LIMIT,
      category:  category  || undefined,
      isActive:  isActive  !== "" ? isActive  : undefined,
      search:    search    || undefined,
    }),
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  const products   = data?.products   || [];
  const total      = data?.total      || 0;
  const totalPages = data?.totalPages || 1;

  const { mutate: toggleStatus } = useMutation({
    mutationFn: ({ id, current }) => productService.updateProduct(id, { isActive: !current }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Product status updated.");
    },
    onError: () => toast.error("Could not update product."),
  });

  const { mutate: deleteProduct } = useMutation({
    mutationFn: (id) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Product deactivated.");
    },
    onError: () => toast.error("Could not delete product."),
  });

  const handleDelete = (id, name) => {
    if (!window.confirm(`Deactivate "${name}"? It will no longer appear in the catalog.`)) return;
    deleteProduct(id);
  };

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); };
  const handleCategory = (v) => { setCategory(v); setPage(1); };
  const handleStatus   = (v) => { setIsActive(v); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-[#1a1a1a]">Products</h1>
          <p className="text-xs text-[#888] mt-1">{total} product{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-2 bg-[#1a1a1a] text-white text-xs tracking-[1.5px] uppercase font-bold px-5 py-2.5 hover:bg-[#c9a96e] transition-colors"
        >
          <Plus size={14} /> Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search products…"
            className="w-full border border-[#d0c8be] pl-9 pr-3.5 py-2.5 text-sm text-[#333] placeholder:text-[#bbb] focus:outline-none focus:border-[#1a1a1a] bg-white"
          />
        </div>
        <select
          value={category}
          onChange={(e) => handleCategory(e.target.value)}
          className="border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] focus:outline-none focus:border-[#1a1a1a] bg-white"
        >
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select
          value={isActive}
          onChange={(e) => handleStatus(e.target.value)}
          className="border border-[#d0c8be] px-3.5 py-2.5 text-sm text-[#333] focus:outline-none focus:border-[#1a1a1a] bg-white"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className={`bg-white border border-[#e8e0d4] overflow-hidden transition-opacity ${isFetching && !isLoading ? "opacity-70" : "opacity-100"}`}>
        {isLoading ? (
          <div className="divide-y divide-[#f0ebe3]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-10 h-12 bg-[#ece8e0]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/5 bg-[#ece8e0] rounded-full" />
                  <div className="h-2.5 w-2/5 bg-[#ece8e0] rounded-full" />
                </div>
                <div className="h-3 w-20 bg-[#ece8e0] rounded-full" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={28} className="mx-auto text-[#ccc] mb-3" />
            <p className="text-sm text-[#888]">No products found.</p>
            <Link to="/admin/products/new" className="mt-3 inline-block text-xs text-[#c9a96e] hover:underline font-medium">
              Add your first product →
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div className="hidden md:grid grid-cols-[auto_1fr_100px_80px_80px_100px] gap-4 px-5 py-3 border-b border-[#f0ebe3] bg-[#f9f7f4]">
              {["", "Product", "Price", "Stock", "Rating", "Actions"].map((h) => (
                <p key={h} className="text-[10px] tracking-[2px] uppercase font-bold text-[#888]">{h}</p>
              ))}
            </div>

            <div className="divide-y divide-[#f0ebe3]">
              {products.map((product) => {
                const primaryImg = product.images?.find((i) => i.isPrimary) || product.images?.[0];
                const minPrice   = product.variants?.length ? Math.min(...product.variants.map((v) => v.price)) : 0;
                const totalStock = product.variants?.reduce((s, v) => s + (v.stock || 0), 0) || 0;
                const lowStock   = totalStock > 0 && totalStock <= 5;

                return (
                  <div key={product._id} className="flex flex-col md:grid md:grid-cols-[auto_1fr_100px_80px_80px_100px] gap-4 items-start md:items-center px-5 py-4 hover:bg-[#f9f7f4] transition-colors">
                    {/* Image */}
                    <div className="w-10 h-12 bg-[#f4f1ec] shrink-0 overflow-hidden">
                      {primaryImg?.url ? (
                        <img src={primaryImg.url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={14} className="text-[#ccc]" />
                        </div>
                      )}
                    </div>

                    {/* Name + meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#1a1a1a] line-clamp-1">{product.name}</p>
                        {!product.isActive && (
                          <span className="text-[9px] tracking-[1.5px] uppercase font-bold bg-red-100 text-red-600 px-1.5 py-0.5">Inactive</span>
                        )}
                        {product.isFeatured && (
                          <span className="text-[9px] tracking-[1.5px] uppercase font-bold bg-[#f0ebe3] text-[#c9a96e] px-1.5 py-0.5">Featured</span>
                        )}
                      </div>
                      <p className="text-xs text-[#888] mt-0.5 capitalize">{product.category}</p>
                    </div>

                    {/* Price */}
                    <p className="text-sm font-medium text-[#1a1a1a]">{formatPrice(minPrice)}</p>

                    {/* Stock */}
                    <p className={`text-sm font-medium ${totalStock === 0 ? "text-red-500" : lowStock ? "text-amber-500" : "text-green-600"}`}>
                      {totalStock === 0 ? "Out" : totalStock}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center gap-1">
                      <Star size={11} className="text-[#c9a96e] fill-[#c9a96e]" />
                      <span className="text-xs text-[#555]">{Number(product.averageRating || 0).toFixed(1)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/admin/products/${product._id}/edit`}
                        className="p-2 text-[#888] hover:text-[#1a1a1a] transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        onClick={() => toggleStatus({ id: product._id, current: product.isActive })}
                        className={`p-2 transition-colors ${product.isActive ? "text-green-500 hover:text-[#888]" : "text-[#bbb] hover:text-green-500"}`}
                        title={product.isActive ? "Deactivate" : "Activate"}
                      >
                        {product.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        onClick={() => handleDelete(product._id, product.name)}
                        className="p-2 text-[#bbb] hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#888]">Page {page} of {totalPages} · {total} products</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="w-9 h-9 flex items-center justify-center border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-9 h-9 flex items-center justify-center border border-[#d0c8be] text-[#555] hover:border-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}