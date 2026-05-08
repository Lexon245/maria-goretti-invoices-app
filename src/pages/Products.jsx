import React, { useState, useEffect, useRef } from 'react';
import useDatabase from '../hooks/useDatabase';
import useSettings from '../hooks/useSettings';
import useFocusTrap from '../hooks/useFocusTrap';
import Button from '../components/Button';
import Input from '../components/Input';
import CategoryEditor from '../components/CategoryEditor';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Plus, Search, Package, Edit2, Trash2,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, AlertCircle
} from 'lucide-react';
import './Products.css';

const EMPTY_PRODUCT = {
  name: '', name_de: '', name_fr: '',
  description: '', description_de: '', description_fr: '',
  rate: 0, unit: 'hour', category_id: '',
};

const parseLocaleNumber = (v) => {
  const s = String(v ?? '').trim().replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const Products = () => {
  const { query, run } = useDatabase();
  const { loadSettings } = useSettings();
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeLang, setActiveLang] = useState('en');
  const [formData, setFormData] = useState(EMPTY_PRODUCT);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null); // { id, name } | { categoryId, categoryName }

  // Category UI state
  const [showStripEditor, setShowStripEditor] = useState(false);
  const [showManagePanel, setShowManagePanel] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [showInlineModalCatEditor, setShowInlineModalCatEditor] = useState(false);

  const modalRef = useRef(null);
  const openBtnRef = useRef(null);
  useFocusTrap(modalRef, { active: showModal, triggerRef: openBtnRef });

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await loadSettings();
        setSettings(s);
      } catch (_e) {
        // ignore; fallback to EUR
      }
    })();
  }, [loadSettings]);

  const fetchAll = async () => {
    try {
      setError(null);
      await Promise.all([fetchProducts(), fetchCategories()]);
    } catch (_err) {
      setError('Failed to load products. Please restart the app.');
    }
  };

  const fetchProducts = async () => {
    const data = await query('SELECT * FROM products ORDER BY name ASC');
    setProducts(data);
  };

  const fetchCategories = async () => {
    const data = await query('SELECT * FROM product_categories ORDER BY sort_order ASC, name ASC');
    setCategories(data);
  };

  // ----- product CRUD -----
  const handleSubmit = async (e) => {
    e.preventDefault();
    const id = editingProduct ? editingProduct.id : crypto.randomUUID();

    if (editingProduct) {
      await run(
        `UPDATE products SET
           name = ?, name_de = ?, name_fr = ?,
           description = ?, description_de = ?, description_fr = ?,
           rate = ?, unit = ?, category_id = ?
         WHERE id = ?`,
        [
          formData.name, formData.name_de, formData.name_fr,
          formData.description, formData.description_de, formData.description_fr,
          formData.rate, formData.unit, formData.category_id || null,
          id,
        ]
      );
    } else {
      await run(
        `INSERT INTO products (
           id, name, name_de, name_fr,
           description, description_de, description_fr,
           rate, unit, category_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, formData.name, formData.name_de, formData.name_fr,
          formData.description, formData.description_de, formData.description_fr,
          formData.rate, formData.unit, formData.category_id || null,
        ]
      );
    }

    setShowModal(false);
    setEditingProduct(null);
    setFormData(EMPTY_PRODUCT);
    fetchProducts();
  };

  const handleDelete = (id, name) => setConfirm({ type: 'product', id, name });

  const handleDeleteCategoryRequest = (id, name) => setConfirm({ type: 'category', id, name });

  const handleConfirmed = async () => {
    if (!confirm) return;
    if (confirm.type === 'product') {
      await run('DELETE FROM products WHERE id = ?', [confirm.id]);
      fetchProducts();
    } else if (confirm.type === 'category') {
      await run('UPDATE products SET category_id = NULL WHERE category_id = ?', [confirm.id]);
      await run('DELETE FROM product_categories WHERE id = ?', [confirm.id]);
      if (activeCategory === confirm.id) setActiveCategory('all');
      fetchAll();
    }
    setConfirm(null);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      name_de: product.name_de || '',
      name_fr: product.name_fr || '',
      description: product.description || '',
      description_de: product.description_de || '',
      description_fr: product.description_fr || '',
      rate: product.rate || 0,
      unit: product.unit || 'hour',
      category_id: product.category_id || '',
    });
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingProduct(null);
    setFormData({
      ...EMPTY_PRODUCT,
      category_id: activeCategory !== 'all' ? activeCategory : '',
    });
    setShowInlineModalCatEditor(false);
    setShowModal(true);
  };

  // ----- category CRUD -----
  const saveCategory = async (data) => {
    if (data.id) {
      await run(
        'UPDATE product_categories SET name = ?, name_de = ?, name_fr = ?, color = ? WHERE id = ?',
        [data.name, data.name_de, data.name_fr, data.color, data.id]
      );
    } else {
      const id = crypto.randomUUID();
      const nextOrder = categories.length;
      await run(
        'INSERT INTO product_categories (id, name, name_de, name_fr, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [id, data.name, data.name_de, data.name_fr, data.color, nextOrder]
      );
      data.id = id;
    }
    await fetchCategories();
    return data;
  };

  const deleteCategory = (id, name) => handleDeleteCategoryRequest(id, name);

  const moveCategory = async (id, direction) => {
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const a = categories[idx];
    const b = categories[swapIdx];
    await run('UPDATE product_categories SET sort_order = ? WHERE id = ?', [b.sort_order, a.id]);
    await run('UPDATE product_categories SET sort_order = ? WHERE id = ?', [a.sort_order, b.id]);
    fetchCategories();
  };

  const handleStripSave = async (data) => {
    await saveCategory(data);
    setShowStripEditor(false);
  };

  const handleManageSave = async (data) => {
    await saveCategory(data);
    setEditingCategoryId(null);
  };

  const handleModalCatSave = async (data) => {
    const saved = await saveCategory(data);
    setFormData((p) => ({ ...p, category_id: saved.id }));
    setShowInlineModalCatEditor(false);
  };

  // ----- filtering -----
  const filteredProducts = products
    .filter((p) => activeCategory === 'all' || p.category_id === activeCategory)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const categoryById = (id) => categories.find(c => c.id === id);

  return (
    <div className="products-page">
      <div className="page-header">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search products/services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button ref={openBtnRef} variant="primary" icon={Plus} onClick={handleNew}>
          Add Product
        </Button>
      </div>

      {error && (
        <div className="page-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="categories-strip-wrap">
        <div className="categories-strip">
          <button
            className={`cat-chip ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All <span className="cat-chip-count">{products.length}</span>
          </button>
          {categories.map((cat) => {
            const count = products.filter(p => p.category_id === cat.id).length;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                className={`cat-chip ${isActive ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                style={isActive ? { backgroundColor: cat.color, color: '#0a0c10', borderColor: cat.color } : { borderColor: cat.color }}
              >
                <span className="cat-chip-dot" style={{ backgroundColor: cat.color }} />
                {cat.name} <span className="cat-chip-count">{count}</span>
              </button>
            );
          })}
          {!showStripEditor && (
            <button
              className="cat-chip cat-chip-add"
              onClick={() => setShowStripEditor(true)}
              title="Create category"
            >
              <Plus size={14} /> New Category
            </button>
          )}
        </div>
        {showStripEditor && (
          <CategoryEditor
            initial={null}
            onSave={handleStripSave}
            onCancel={() => setShowStripEditor(false)}
          />
        )}
        {categories.length > 0 && (
          <button
            className="manage-categories-toggle"
            onClick={() => setShowManagePanel(!showManagePanel)}
          >
            {showManagePanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showManagePanel ? 'Hide' : 'Manage'} categories
          </button>
        )}

        {showManagePanel && (
          <div className="manage-categories-panel">
            {categories.map((cat, idx) => (
              <div key={cat.id} className="manage-cat-row">
                {editingCategoryId === cat.id ? (
                  <CategoryEditor
                    initial={cat}
                    onSave={handleManageSave}
                    onCancel={() => setEditingCategoryId(null)}
                  />
                ) : (
                  <>
                    <span className="manage-cat-swatch" style={{ backgroundColor: cat.color }} />
                    <span className="manage-cat-name">{cat.name}</span>
                    <span className="manage-cat-langs">
                      {cat.name_de && <span className="cat-lang-tag">DE</span>}
                      {cat.name_fr && <span className="cat-lang-tag">FR</span>}
                    </span>
                    <div className="manage-cat-actions">
                      <button title="Move up" onClick={() => moveCategory(cat.id, 'up')} disabled={idx === 0}>
                        <ArrowUp size={14} />
                      </button>
                      <button title="Move down" onClick={() => moveCategory(cat.id, 'down')} disabled={idx === categories.length - 1}>
                        <ArrowDown size={14} />
                      </button>
                      <button title="Edit" onClick={() => setEditingCategoryId(cat.id)}>
                        <Edit2 size={14} />
                      </button>
                      <button title="Delete" aria-label={`Delete category ${cat.name}`} onClick={() => deleteCategory(cat.id, cat.name)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="products-grid">
        {filteredProducts.length === 0 && (
          <div className="products-empty">
            <Package size={32} strokeWidth={1.3} />
            <div className="products-empty-title">
              {search ? `No products match "${search}"` : 'No products yet'}
            </div>
            <div className="products-empty-desc">
              {search ? 'Try a different search term.' : 'Add a product or service to quickly populate your invoices.'}
            </div>
          </div>
        )}
        {filteredProducts.map((product) => {
          const cat = categoryById(product.category_id);
          return (
            <div key={product.id} className="product-card">
              <div className="product-card-header">
                <div className="product-info">
                  <div className="product-title-row">
                    {cat && <span className="product-cat-dot" style={{ backgroundColor: cat.color }} />}
                    <h3>{product.name}</h3>
                  </div>
                  <span className="product-rate">
                    {product.rate.toLocaleString('de-DE', { style: 'currency', currency: settings?.default_currency || 'EUR' })}
                    <small>/{product.unit}</small>
                  </span>
                </div>
                <div className="product-actions">
                  <button aria-label={`Edit ${product.name}`} title="Edit" onClick={() => handleEdit(product)}><Edit2 size={16} /></button>
                  <button aria-label={`Delete ${product.name}`} title="Delete" onClick={() => handleDelete(product.id, product.name)}><Trash2 size={16} /></button>
                </div>
              </div>
              {product.description && <p className="product-desc">{product.description}</p>}
              <div className="product-card-footer">
                {cat && (
                  <span className="product-cat-tag" style={{ borderColor: cat.color, color: cat.color }}>
                    {cat.name}
                  </span>
                )}
                {(product.name_de || product.name_fr) && (
                  <div className="product-langs">
                    {product.name_de && <span className="lang-tag">DE</span>}
                    {product.name_fr && <span className="lang-tag">FR</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={editingProduct ? 'Edit Product' : 'Add Product'}>
          <div className="modal-content" ref={modalRef}>
            <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>

            <div className="lang-tabs">
              <button className={activeLang === 'en' ? 'active' : ''} onClick={() => setActiveLang('en')}>EN</button>
              <button className={activeLang === 'de' ? 'active' : ''} onClick={() => setActiveLang('de')}>DE</button>
              <button className={activeLang === 'fr' ? 'active' : ''} onClick={() => setActiveLang('fr')}>FR</button>
            </div>

            <form onSubmit={handleSubmit}>
              {activeLang === 'en' && (
                <>
                  <Input
                    label="Product Name (EN)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Description (EN)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </>
              )}
              {activeLang === 'de' && (
                <>
                  <Input
                    label="Product Name (DE)"
                    value={formData.name_de}
                    onChange={(e) => setFormData({ ...formData, name_de: e.target.value })}
                  />
                  <Input
                    label="Description (DE)"
                    value={formData.description_de}
                    onChange={(e) => setFormData({ ...formData, description_de: e.target.value })}
                  />
                </>
              )}
              {activeLang === 'fr' && (
                <>
                  <Input
                    label="Product Name (FR)"
                    value={formData.name_fr}
                    onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
                  />
                  <Input
                    label="Description (FR)"
                    value={formData.description_fr}
                    onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })}
                  />
                </>
              )}

              <div className="form-row">
                <Input
                  label="Rate (EUR)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: parseLocaleNumber(e.target.value) })}
                />
                <div className="input-group">
                  <label className="input-label">Unit</label>
                  <select
                    className="input-field"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="hour">per hour</option>
                    <option value="day">per day</option>
                    <option value="item">per item</option>
                    <option value="fixed">fixed price</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Category</label>
                <div className="category-select-row">
                  <select
                    className="input-field"
                    value={formData.category_id}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowInlineModalCatEditor(true);
                      } else {
                        setFormData({ ...formData, category_id: e.target.value });
                      }
                    }}
                  >
                    <option value="">— Uncategorised —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="__new__">+ New category…</option>
                  </select>
                </div>
                {showInlineModalCatEditor && (
                  <div style={{ marginTop: 'var(--space-sm)' }}>
                    <CategoryEditor
                      initial={null}
                      onSave={handleModalCatSave}
                      onCancel={() => setShowInlineModalCatEditor(false)}
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.type === 'category' ? 'Delete category?' : 'Delete product?'}
          message={
            confirm.type === 'category'
              ? `"${confirm.name}" will be deleted. Products in this category will become uncategorised.`
              : `"${confirm.name}" will be permanently deleted.`
          }
          confirmLabel="Delete"
          onConfirm={handleConfirmed}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};

export default Products;
