import { useEffect, useRef, useState } from 'react';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let googleScriptPromise;

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.google), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Failed to load Google script.'));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

export default function GoogleSignInButton({
  text = 'continue_with',
  onSuccess,
  onError,
  disabled = false,
}) {
  const containerRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const [message, setMessage] = useState('');

  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setMessage('Google sign-in is not configured yet.');
      return undefined;
    }

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
          return;
        }

        containerRef.current.innerHTML = '';
        const width = Math.min(containerRef.current.offsetWidth || 360, 360);

        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: async response => {
            if (!response.credential) {
              onErrorRef.current?.('Google did not return a credential.');
              return;
            }

            try {
              await onSuccessRef.current?.(response.credential);
            } catch (error) {
              onErrorRef.current?.(error.message || 'Google sign-in failed.');
            }
          },
        });

        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          logo_alignment: 'left',
          width,
        });

        setMessage('');
      })
      .catch(() => {
        if (!cancelled) {
          setMessage('Could not load Google sign-in.');
        }
      });

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [text]);

  return (
    <div className={`google-signin-stack${disabled ? ' is-disabled' : ''}`}>
      <div aria-hidden={disabled} className="google-signin-shell" ref={containerRef} />
      {disabled && <div className="google-signin-overlay" />}
      {message && <p className="google-signin-message">{message}</p>}
    </div>
  );
}
