import api from "./api.js";

// ─────────────────────────────────────────────
// PRODUCT SERVICE
// All product-related API calls.
// Used by TanStack Query hooks and admin forms.
// ─────────────────────────────────────────────

/**
 * Get a paginated, filtered, sorted product catalog.
 *
 * @param {Object} params
 * @param {number}   params.page
 * @param {number}   params.limit
 * @param {string}   params.category    — "university" | "modern" | "luxury" | "stylish"
 * @param {string}   params.sortBy      — "newest" | "price-asc" | "price-desc" | "rating-desc" | "popular"
 * @param {number}   params.minPrice
 * @param {number}   params.maxPrice
 * @param {string}   params.color
 * @param {string}   params.size
 * @param {boolean}  params.inStock
 * @param {boolean}  params.isFeatured
 * @param {string}   params.search
 */
const getProducts = async (params = {}) => {
  // Strip undefined/null/empty values to keep query string clean
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    )
  );
  const { data } = await api.get("/products", { params: cleanParams });
  return data.data;
};

/**
 * Get featured products for the homepage.
 * @param {number} limit — default 8, max 20
 */
const getFeaturedProducts = async (limit = 8) => {
  const { data } = await api.get("/products/featured", { params: { limit } });
  return data.data.products;
};

/**
 * Get filter sidebar metadata:
 * available colors, sizes, price range, categories.
 */
const getFilterMeta = async () => {
  const { data } = await api.get("/products/filters");
  return data.data.filters;
};

/**
 * Get a single product by URL slug.
 * Returns { product, related }.
 * @param {string} slug
 */
const getProductBySlug = async (slug) => {
  const { data } = await api.get(`/products/${slug}`);
  return data.data;
};

// ── Admin ─────────────────────────────────────

/**
 * Admin: get all products including inactive ones.
 * @param {Object} params — page, limit, category, isActive, search
 */
const getProductsAdmin = async (params = {}) => {
  const { data } = await api.get("/products/admin/all", { params });
  return data.data;
};

/**
 * Admin: get a single product by ID (including inactive).
 * @param {string} id
 */
const getProductByIdAdmin = async (id) => {
  const { data } = await api.get(`/products/admin/${id}`);
  return data.data.product;
};

/**
 * Admin: create a new product.
 * @param {{ name, description, category, variants[], tags[], isFeatured?, isActive? }} payload
 */
const createProduct = async (payload) => {
  const { data } = await api.post("/products", payload);
  return data.data.product;
};

/**
 * Admin: update product core fields.
 * Does NOT update variants or images (separate endpoints).
 * @param {string} id
 * @param {{ name?, description?, category?, tags?, isFeatured?, isActive? }} updates
 */
const updateProduct = async (id, updates) => {
  const { data } = await api.put(`/products/${id}`, updates);
  return data.data.product;
};

/**
 * Admin: soft-delete a product (sets isActive: false).
 * @param {string} id
 */
const deleteProduct = async (id) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};

// ── Image Management ──────────────────────────

/**
 * Admin: add a Cloudinary-uploaded image to a product.
 * @param {string} productId
 * @param {{ url, publicId, alt?, isPrimary? }} imageData
 */
const addProductImage = async (productId, imageData) => {
  const { data } = await api.post(`/products/${productId}/images`, imageData);
  return data.data.images;
};

/**
 * Admin: remove an image from a product.
 * @param {string} productId
 * @param {string} imageId — sub-document _id
 */
const removeProductImage = async (productId, imageId) => {
  const { data } = await api.delete(`/products/${productId}/images/${imageId}`);
  return data.data.images;
};

// ── Variant Management ────────────────────────

/**
 * Admin: add a new variant to a product.
 * @param {string} productId
 * @param {{ color, colorHex?, size, price, comparePrice?, stock, sku? }} variantData
 */
const addVariant = async (productId, variantData) => {
  const { data } = await api.post(`/products/${productId}/variants`, variantData);
  return data.data.variants;
};

/**
 * Admin: update a specific variant.
 * @param {string} productId
 * @param {string} variantId
 * @param {Object} updates
 */
const updateVariant = async (productId, variantId, updates) => {
  const { data } = await api.put(
    `/products/${productId}/variants/${variantId}`,
    updates
  );
  return data.data.variants;
};

/**
 * Admin: remove a variant from a product.
 * @param {string} productId
 * @param {string} variantId
 */
const removeVariant = async (productId, variantId) => {
  const { data } = await api.delete(
    `/products/${productId}/variants/${variantId}`
  );
  return data.data.variants;
};

const productService = {
  getProducts,
  getFeaturedProducts,
  getFilterMeta,
  getProductBySlug,
  getProductsAdmin,
  getProductByIdAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  removeProductImage,
  addVariant,
  updateVariant,
  removeVariant,
};

export default productService;