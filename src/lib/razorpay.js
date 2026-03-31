const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

let razorpayPromise;

export function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }

  if (!razorpayPromise) {
    razorpayPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);

      if (existing) {
        existing.addEventListener('load', () => resolve(window.Razorpay), { once: true });
        existing.addEventListener('error', () => reject(new Error('Could not load Razorpay.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = RAZORPAY_SCRIPT;
      script.async = true;
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => reject(new Error('Could not load Razorpay.'));
      document.body.appendChild(script);
    });
  }

  return razorpayPromise;
}
