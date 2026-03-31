import { useRef } from 'react';


export default function OtpInput({ value, onChange, length = 6, disabled = false }) {
  const inputsRef = useRef([]);
  const digits = Array.from({ length }, (_, index) => value[index] || '');

  function focusInput(index) {
    const element = inputsRef.current[index];
    if (element) {
      element.focus();
      element.select();
    }
  }

  function updateDigit(index, rawValue) {
    const digit = rawValue.replace(/\D/g, '').slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    onChange(nextDigits.join(''));

    if (digit && index < length - 1) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      focusInput(index - 1);
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  }

  function handlePaste(event) {
    event.preventDefault();
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pastedDigits) {
      return;
    }

    onChange(pastedDigits);
    focusInput(Math.min(pastedDigits.length, length) - 1);
  }

  return (
    <div className="otp-input-wrap" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          aria-label={`OTP digit ${index + 1}`}
          autoComplete="one-time-code"
          className="otp-box"
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          onChange={event => updateDigit(index, event.target.value)}
          onFocus={event => event.target.select()}
          onKeyDown={event => handleKeyDown(index, event)}
          pattern="[0-9]*"
          ref={element => {
            inputsRef.current[index] = element;
          }}
          type="text"
          value={digit}
        />
      ))}
    </div>
  );
}
