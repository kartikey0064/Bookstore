import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { createBook, updateBook, uploadBookCover } from '../services/api';
import { toast } from '../component/Toast';

const INITIAL_FORM = {
  name: '',
  author: '',
  description: '',
  categories: [],
  price: '',
  discount: '0',
  stock: '0',
  imageUrl: '',
};

const CATEGORIES = [
  'Fiction',
  'Non Fiction',
  'Fantasy',
  'Science Fiction',
  'Biography',
  'Business',
  'Technology',
  'Self Help',
  'Psychology',
  'History',
  'Children',
  'Romance',
];

function PlusIcon({ className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function UploadIcon({ className = 'h-6 w-6' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M20 16.5v1a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-1" />
    </svg>
  );
}

function SpinnerIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      aria-hidden="true"
      className={`${className} animate-spin`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}

function isValidImageUrl(value) {
  if (!value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'data:';
  } catch {
    return false;
  }
}

function validateForm(values, imageFile) {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = 'Book name is required.';
  }

  if (!values.author.trim()) {
    errors.author = 'Author name is required.';
  }

  if (!Array.isArray(values.categories) || values.categories.length === 0) {
    errors.category = 'Please add at least one category.';
  }

  if (values.price === '') {
    errors.price = 'Price is required.';
  } else if (Number.isNaN(Number(values.price)) || Number(values.price) <= 0) {
    errors.price = 'Price must be greater than 0.';
  }

  if (values.discount === '') {
    errors.discount = 'Discount is required.';
  } else if (Number.isNaN(Number(values.discount)) || Number(values.discount) < 0 || Number(values.discount) > 100) {
    errors.discount = 'Discount must be between 0 and 100.';
  }

  if (values.stock === '') {
    errors.stock = 'Stock is required.';
  } else if (!Number.isInteger(Number(values.stock)) || Number(values.stock) < 0) {
    errors.stock = 'Stock must be 0 or more.';
  }

  if (!imageFile && !values.imageUrl.trim()) {
    errors.image = 'Upload a cover image or paste a cover URL.';
  } else if (!imageFile && values.imageUrl.trim() && !isValidImageUrl(values.imageUrl)) {
    errors.image = 'Enter a valid image URL.';
  }

  return errors;
}

function normalizeCategories(values = []) {
  const uniqueValues = [];
  const seen = new Set();

  values.forEach(value => {
    const trimmed = String(value || '').trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) {
      return;
    }
    seen.add(key);
    uniqueValues.push(trimmed);
  });

  return uniqueValues;
}

function buildFormFromBook(book) {
  if (!book) {
    return INITIAL_FORM;
  }

  const categories = normalizeCategories(
    Array.isArray(book.categories) && book.categories.length
      ? book.categories
      : [book.category],
  );

  return {
    name: String(book.name || book.title || ''),
    author: String(book.author || ''),
    description: String(book.description || ''),
    categories,
    price: book.price == null ? '' : String(book.price),
    discount: book.discount == null ? '0' : String(book.discount),
    stock: book.stock == null ? '0' : String(book.stock),
    imageUrl: String(book.imageUrl || book.image || ''),
  };
}

export default function AddBookModal({
  book = null,
  mode = 'create',
  onClose,
  onCreated,
  onSaved,
  open,
}) {
  const isEdit = mode === 'edit';
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setCustomCategoryInput('');
      setTouched({});
      setErrors({});
      setImageFile(null);
      setPreviewUrl('');
      setIsDragging(false);
      setIsSubmitting(false);
      return;
    }

    const nextForm = buildFormFromBook(book);
    setForm(nextForm);
    setCustomCategoryInput('');
    setTouched({});
    setErrors({});
    setImageFile(null);
    setPreviewUrl('');
    setIsDragging(false);
    setIsSubmitting(false);
  }, [book, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!imageFile) {
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [imageFile]);

  const discountedPrice = useMemo(() => {
    const price = Number(form.price);
    const discount = Number(form.discount);

    if (Number.isNaN(price) || price <= 0 || Number.isNaN(discount) || discount < 0 || discount > 100) {
      return null;
    }

    return price - (price * discount) / 100;
  }, [form.discount, form.price]);

  const coverPreview = previewUrl || form.imageUrl.trim();
  const selectedCategories = form.categories || [];

  function inputClasses(fieldName) {
    return [
      'mt-2 w-full rounded-xl border bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition duration-200',
      'placeholder:text-slate-500 focus:border-yellow-300 focus:ring-4 focus:ring-yellow-200/20',
      errors[fieldName] && touched[fieldName] ? 'border-rose-400/80' : 'border-slate-700/80',
    ].join(' ');
  }

  function setField(name, value) {
    const nextValues = { ...form, [name]: value };
    setForm(nextValues);

    if (touched[name] || (name === 'imageUrl' && touched.image)) {
      setErrors(validateForm(nextValues, imageFile));
    }
  }

  function handleBlur(event) {
    const rawName = event.target.name;
    const name = rawName === 'customCategory'
      ? 'category'
      : rawName;
    const nextTouched = { ...touched, [name]: true };
    setTouched(nextTouched);
    setErrors(validateForm(form, imageFile));
  }

  function toggleCategory(category) {
    const exists = selectedCategories.some(value => value.toLowerCase() === category.toLowerCase());
    const nextCategories = exists
      ? selectedCategories.filter(value => value.toLowerCase() !== category.toLowerCase())
      : [...selectedCategories, category];

    setTouched(current => ({ ...current, category: true }));
    setField('categories', normalizeCategories(nextCategories));
  }

  function handleCustomCategoryChange(event) {
    const nextValue = event.target.value;
    setCustomCategoryInput(nextValue);
  }

  function addCustomCategory() {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) {
      setTouched(current => ({ ...current, category: true }));
      setErrors(current => ({ ...current, category: 'Enter a custom category name.' }));
      return;
    }

    const nextCategories = normalizeCategories([...selectedCategories, trimmed]);
    setTouched(current => ({ ...current, category: true }));
    setCustomCategoryInput('');
    setField('categories', nextCategories);
  }

  function removeCategory(categoryToRemove) {
    setTouched(current => ({ ...current, category: true }));
    setField(
      'categories',
      selectedCategories.filter(category => category.toLowerCase() !== categoryToRemove.toLowerCase()),
    );
  }

  function handleFileSelection(file) {
    if (!file) {
      return;
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setTouched(current => ({ ...current, image: true }));
      setErrors(current => ({ ...current, image: 'Only JPG and PNG files are allowed.' }));
      return;
    }

    setImageFile(file);
    setTouched(current => ({ ...current, image: true }));
    setErrors(validateForm(form, file));
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files?.[0]);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const submittedForm = new FormData(event.currentTarget);
    const submittedCategories = normalizeCategories(form.categories);
    const submittedValues = {
      name: String(submittedForm.get('name') || '').trim(),
      author: String(submittedForm.get('author') || '').trim(),
      description: String(submittedForm.get('description') || '').trim(),
      categories: submittedCategories,
      price: String(submittedForm.get('price') || '').trim(),
      discount: String(submittedForm.get('discount') || '').trim(),
      stock: String(submittedForm.get('stock') || '').trim(),
      imageUrl: String(submittedForm.get('imageUrl') || '').trim(),
    };

    setForm(submittedValues);

    const nextTouched = {
        name: true,
        author: true,
        category: true,
      price: true,
      discount: true,
      stock: true,
      image: true,
    };

    const nextErrors = validateForm(submittedValues, imageFile);
    setTouched(current => ({ ...current, ...nextTouched }));
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const imageUrl = imageFile ? await uploadBookCover(imageFile) : submittedValues.imageUrl;
      const payload = {
        name: submittedValues.name,
        title: submittedValues.name,
        author: submittedValues.author,
        description: submittedValues.description,
        category: submittedValues.categories[0] || '',
        categories: submittedValues.categories,
        price: Number(submittedValues.price),
        discount: Number(submittedValues.discount),
        stock: Number(submittedValues.stock),
        imageUrl,
        image: imageUrl,
      };
      const savedBook = isEdit
        ? await updateBook(book?.id, payload)
        : await createBook(payload);
      const normalizedSavedBook = {
        ...savedBook,
        category: savedBook?.category || submittedValues.categories[0] || '',
        categories: normalizeCategories(
          Array.isArray(savedBook?.categories) && savedBook.categories.length
            ? savedBook.categories
            : submittedValues.categories,
        ),
      };

      toast(isEdit ? 'Book Updated Successfully' : 'Book Added Successfully', 'success');
      onCreated?.(normalizedSavedBook);
      onSaved?.(normalizedSavedBook, { mode, categories: normalizedSavedBook.categories });
      onClose?.();
    } catch (error) {
      toast(error.message || 'Something went wrong', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const modalContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-950/70 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-6"
          initial={{ opacity: 0 }}
          onClick={onClose}
          transition={{ duration: 0.2 }}
        >
          <div className="flex min-h-full items-start justify-center">
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative my-4 max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.5)] sm:my-8 sm:max-h-[calc(100vh-4rem)] sm:p-8"
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              onClick={event => event.stopPropagation()}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <button
                className="absolute right-4 top-4 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
                onClick={onClose}
                type="button"
              >
                Close
              </button>

            <div className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-yellow-200">
                  <PlusIcon className="h-4 w-4" />
                  {isEdit ? 'Update Book' : 'Add Book'}
                </div>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                  {isEdit ? 'Update inventory item' : 'Create a new inventory item'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  {isEdit
                    ? 'Adjust the cover, pricing, stock, or metadata, then save the refreshed book details.'
                    : 'Upload a cover image, fill in the product details, and publish the book directly to your inventory.'}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                Discounted price:
                <span className="ml-2 text-lg font-semibold">
                  {discountedPrice == null ? '--' : `Rs. ${discountedPrice.toFixed(2)}`}
                </span>
              </div>
            </div>

              <form className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]" onSubmit={handleSubmit}>
                <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-200">Book Name</label>
                  <input
                    autoFocus
                    className={inputClasses('name')}
                    name="name"
                    onBlur={handleBlur}
                    onChange={event => setField('name', event.target.value)}
                    placeholder="Atomic Habits"
                    value={form.name}
                  />
                  <p className="mt-2 min-h-5 text-xs text-rose-300">{touched.name ? errors.name || '' : ''}</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-200">Author Name</label>
                  <input
                    className={inputClasses('author')}
                    name="author"
                    onBlur={handleBlur}
                    onChange={event => setField('author', event.target.value)}
                    placeholder="James Clear"
                    value={form.author}
                  />
                  <p className="mt-2 min-h-5 text-xs text-rose-300">{touched.author ? errors.author || '' : ''}</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-200">Description</label>
                  <textarea
                    className={`${inputClasses('description')} min-h-[132px] resize-y`}
                    name="description"
                    onBlur={handleBlur}
                    onChange={event => setField('description', event.target.value)}
                    placeholder="Write a short description for the book..."
                    value={form.description}
                  />
                  <p className="mt-2 min-h-5 text-xs text-slate-500">Optional, but helpful for the storefront.</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-200">Categories</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CATEGORIES.map(category => {
                      const active = selectedCategories.some(value => value.toLowerCase() === category.toLowerCase());
                      return (
                        <button
                          key={category}
                          className={[
                            'rounded-full border px-3 py-2 text-sm font-medium transition',
                            active
                              ? 'border-yellow-300 bg-yellow-300/15 text-yellow-100'
                              : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-white',
                          ].join(' ')}
                          onClick={() => toggleCategory(category)}
                          type="button"
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 min-h-5 text-xs text-rose-300">{touched.category ? errors.category || '' : ''}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-200">Custom Category</label>
                  <div className="mt-2 flex gap-2">
                    <input
                      className={`${inputClasses('category')} mt-0`}
                      name="customCategory"
                      onBlur={handleBlur}
                      onChange={handleCustomCategoryChange}
                      placeholder="Add your own category"
                      value={customCategoryInput}
                    />
                    <button
                      className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-yellow-600"
                      onClick={addCustomCategory}
                      type="button"
                    >
                      Add
                    </button>
                  </div>
                  <p className="mt-2 min-h-5 text-xs text-slate-500">Add as many custom categories as you want.</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-200">Selected Categories</label>
                  <div className="mt-2 flex min-h-[52px] flex-wrap gap-2 rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-3">
                    {selectedCategories.length ? selectedCategories.map(category => (
                      <span
                        key={category}
                        className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1.5 text-sm text-yellow-100"
                      >
                        {category}
                        <button
                          className="text-yellow-50/80 transition hover:text-white"
                          onClick={() => removeCategory(category)}
                          type="button"
                        >
                          ×
                        </button>
                      </span>
                    )) : (
                      <span className="text-sm text-slate-500">No categories selected yet.</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-200">Price</label>
                  <input
                    className={inputClasses('price')}
                    min="0"
                    name="price"
                    onBlur={handleBlur}
                    onChange={event => setField('price', event.target.value)}
                    placeholder="499"
                    step="0.01"
                    type="number"
                    value={form.price}
                  />
                  <p className="mt-2 min-h-5 text-xs text-rose-300">{touched.price ? errors.price || '' : ''}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-200">Discount (%)</label>
                  <input
                    className={inputClasses('discount')}
                    max="100"
                    min="0"
                    name="discount"
                    onBlur={handleBlur}
                    onChange={event => setField('discount', event.target.value)}
                    placeholder="10"
                    step="1"
                    type="number"
                    value={form.discount}
                  />
                  <p className="mt-2 min-h-5 text-xs text-rose-300">{touched.discount ? errors.discount || '' : ''}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-200">Stock</label>
                  <input
                    className={inputClasses('stock')}
                    min="0"
                    name="stock"
                    onBlur={handleBlur}
                    onChange={event => setField('stock', event.target.value)}
                    placeholder="12"
                    step="1"
                    type="number"
                    value={form.stock}
                  />
                  <p className="mt-2 min-h-5 text-xs text-rose-300">{touched.stock ? errors.stock || '' : ''}</p>
                </div>
                </div>

                <div className="flex flex-col gap-5">
                  <div
                    className={[
                      'rounded-[24px] border border-dashed p-5 transition duration-200',
                      isDragging
                        ? 'border-yellow-300 bg-yellow-300/10'
                        : errors.image && touched.image
                          ? 'border-rose-400/70 bg-rose-400/5'
                          : 'border-slate-700 bg-slate-900/60',
                    ].join(' ')}
                    onDragLeave={() => setIsDragging(false)}
                    onDragOver={event => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDrop={handleDrop}
                  >
                    <input
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={event => handleFileSelection(event.target.files?.[0])}
                      ref={fileInputRef}
                      type="file"
                    />

                    <div className="flex flex-col items-center text-center">
                      <div className="mb-4 rounded-full border border-yellow-300/30 bg-yellow-300/10 p-4 text-yellow-200">
                        <UploadIcon />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Upload book cover</h3>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
                        Drag and drop a JPG or PNG here, browse from your computer, or paste a direct cover URL below.
                      </p>
                      <button
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-yellow-600"
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Choose Image
                      </button>
                      <div className="mt-5 w-full max-w-sm text-left">
                        <label className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          Or paste image URL
                        </label>
                        <input
                          className={inputClasses('image')}
                          name="imageUrl"
                          onBlur={() => {
                            setTouched(current => ({ ...current, image: true }));
                            setErrors(validateForm(form, imageFile));
                          }}
                          onChange={event => {
                            setField('imageUrl', event.target.value);
                            setTouched(current => ({ ...current, image: true }));
                          }}
                          placeholder="https://example.com/cover.jpg"
                          type="url"
                          value={form.imageUrl}
                        />
                      </div>
                      <p className="mt-3 min-h-5 text-xs text-rose-300">{touched.image ? errors.image || '' : ''}</p>
                    </div>
                  </div>

                  <motion.div
                    animate={{ opacity: previewUrl ? 1 : 0.7, y: 0 }}
                    className="overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950/70"
                    initial={{ opacity: 0.7, y: 8 }}
                  >
                    <div className="flex min-h-[280px] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.12),transparent_55%),linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.95))] p-6 sm:min-h-[360px]">
                      {coverPreview ? (
                        <img
                          alt="Book cover preview"
                          className="max-h-[320px] w-auto rounded-2xl object-cover shadow-[0_25px_60px_rgba(0,0,0,0.45)]"
                          src={coverPreview}
                        />
                      ) : (
                        <div className="text-center text-slate-400">
                          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Preview</p>
                          <p className="mt-3 text-base text-slate-300">Your uploaded book cover will appear here.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <motion.button
                      className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
                      onClick={onClose}
                      type="button"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSubmitting}
                      type="submit"
                      whileHover={!isSubmitting ? { y: -1, scale: 1.01 } : {}}
                      whileTap={!isSubmitting ? { scale: 0.99 } : {}}
                    >
                      {isSubmitting ? (
                        <>
                          <SpinnerIcon />
                          {isEdit ? 'Updating Book...' : 'Adding Book...'}
                        </>
                      ) : (
                        <>
                          <PlusIcon className="h-4 w-4" />
                          {isEdit ? 'Update Book' : 'Add Book'}
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}
