import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

function isEmailValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value) {
  return value.replace(/\D/g, '').slice(0, 10);
}

function FieldError({ error }) {
  if (!error) {
    return null;
  }

  return <p className="mt-2 text-xs text-rose-300">{error}</p>;
}

export default function CheckoutModal({
  cartCount,
  initialValues,
  isOpen,
  onClose,
  onSubmit,
  submitting,
  total,
}) {
  const [form, setForm] = useState(initialValues);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm(initialValues);
      setTouched({});
    }
  }, [initialValues, isOpen]);

  const errors = useMemo(() => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Name is required';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!isEmailValid(form.email.trim())) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (normalizePhone(form.phone).length !== 10) {
      nextErrors.phone = 'Phone must be exactly 10 digits';
    }

    if (!form.addressLine.trim()) {
      nextErrors.addressLine = 'Address cannot be empty';
    }

    return nextErrors;
  }, [form]);

  const canPay = Object.keys(errors).length === 0 && !submitting;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm(current => ({
      ...current,
      [name]: name === 'phone' ? normalizePhone(value) : value,
    }));
  }

  function handleBlur(event) {
    const { name } = event.target;
    setTouched(current => ({ ...current, [name]: true }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setTouched({
      name: true,
      email: true,
      phone: true,
      addressLine: true,
    });

    if (!canPay) {
      return;
    }

    await onSubmit({
      ...form,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: normalizePhone(form.phone),
      addressLine: form.addressLine.trim(),
    });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl overflow-hidden rounded-[32px] border border-slate-700/70 bg-[linear-gradient(160deg,#111827_0%,#0f172a_100%)] shadow-checkout"
            exit={{ opacity: 0, y: 20 }}
            initial={{ opacity: 0, y: 20 }}
            onClick={event => event.stopPropagation()}
            transition={{ duration: 0.4 }}
          >
            <div className="border-b border-slate-700/60 px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-blue-200/80">Checkout</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                    Confirm delivery details
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Add your contact details first, then continue to Razorpay payment.
                  </p>
                </div>
                <button
                  className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 transition hover:border-blue-300/60 hover:text-white"
                  onClick={onClose}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <form className="space-y-5 px-6 py-6 sm:px-8" onSubmit={handleSubmit}>
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                  initial={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="checkout-label" htmlFor="checkout-name">Name</label>
                      <input
                        className="checkout-input"
                        id="checkout-name"
                        name="name"
                        onBlur={handleBlur}
                        onChange={handleChange}
                        placeholder="Full name"
                        value={form.name}
                      />
                      <FieldError error={touched.name ? errors.name : ''} />
                    </div>

                    <div>
                      <label className="checkout-label" htmlFor="checkout-email">Email</label>
                      <input
                        className="checkout-input"
                        id="checkout-email"
                        name="email"
                        onBlur={handleBlur}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        type="email"
                        value={form.email}
                      />
                      <FieldError error={touched.email ? errors.email : ''} />
                    </div>
                  </div>

                  <div>
                    <label className="checkout-label" htmlFor="checkout-phone">Phone number</label>
                    <input
                      className="checkout-input"
                      id="checkout-phone"
                      inputMode="numeric"
                      maxLength={10}
                      name="phone"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      value={form.phone}
                    />
                    <FieldError error={touched.phone ? errors.phone : ''} />
                  </div>

                  <div>
                    <label className="checkout-label" htmlFor="checkout-address">Address</label>
                    <textarea
                      className="checkout-input min-h-[126px] resize-y"
                      id="checkout-address"
                      name="addressLine"
                      onBlur={handleBlur}
                      onChange={handleChange}
                      placeholder="House / street / locality"
                      value={form.addressLine}
                    />
                    <FieldError error={touched.addressLine ? errors.addressLine : ''} />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <motion.button
                      className="w-full rounded-full border border-slate-600/70 bg-slate-900/70 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-blue-300/60 hover:text-white sm:w-auto"
                      onClick={onClose}
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Back to cart
                    </motion.button>

                    <motion.button
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-400 to-sky-300 px-6 py-3 text-base font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!canPay}
                      type="submit"
                      whileHover={canPay ? { scale: 1.05 } : {}}
                      whileTap={canPay ? { scale: 0.95 } : {}}
                    >
                      {submitting && <span className="spinner" />}
                      {submitting ? 'Preparing Razorpay...' : 'Pay Now'}
                    </motion.button>
                  </div>
                </motion.div>
              </form>

              <div className="border-t border-slate-700/60 bg-slate-950/35 px-6 py-6 lg:border-l lg:border-t-0 sm:px-8">
                <div className="rounded-[24px] border border-slate-700/70 bg-slate-900/70 p-5">
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Order summary</p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Items</p>
                      <p className="text-3xl font-semibold text-white">{cartCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Total</p>
                      <p className="text-3xl font-semibold text-white">₹{Number(total).toFixed(0)}</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3 text-sm text-slate-300">
                    <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3">
                      Razorpay prefill will use your name, email, and `+91` phone.
                    </div>
                    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3">
                      Payment stays locked until the phone number and address are valid.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
