import { useState, useCallback } from 'react';
import PaystackPop from '@paystack/inline-js';

const PRESET_AMOUNTS_ZAR = [10, 20, 50, 100] as const;
const ZAR_TO_CENTS = 100;

export interface DonateModalProps {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string;
  onSuccess?: () => void;
}

export default function DonateModal({ open, onClose, defaultEmail, onSuccess }: DonateModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string | undefined;
  const isConfigured = Boolean(paystackKey?.trim());

  const getAmountCents = useCallback((): number | null => {
    if (customAmount.trim()) {
      const parsed = parseInt(customAmount.replace(/\D/g, ''), 10);
      if (isNaN(parsed) || parsed <= 0) return null;
      return parsed * ZAR_TO_CENTS;
    }
    if (selectedAmount != null && selectedAmount > 0) return selectedAmount * ZAR_TO_CENTS;
    return null;
  }, [selectedAmount, customAmount]);

  const handleDonate = useCallback(() => {
    setError(null);
    if (!isConfigured) {
      setError('Donations are not configured.');
      return;
    }

    const amountCents = getAmountCents();
    if (amountCents == null || amountCents <= 0) {
      setError('Please choose or enter an amount.');
      return;
    }

    const email = defaultEmail?.trim() || guestEmail.trim();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    const paystack = new PaystackPop();
    paystack.newTransaction({
      key: paystackKey!,
      email,
      amount: amountCents,
      currency: 'ZAR',
      metadata: {
        custom_fields: [
          { display_name: 'Type', variable_name: 'type', value: 'donation' },
        ],
      },
      onSuccess: () => {
        setIsSubmitting(false);
        onSuccess?.();
        onClose();
      },
      onCancel: () => {
        setIsSubmitting(false);
        onClose();
      },
      onError: (err: { message?: string }) => {
        setIsSubmitting(false);
        setError(err?.message || 'Payment could not be started. Please try again.');
      },
    });
  }, [isConfigured, paystackKey, getAmountCents, defaultEmail, guestEmail, onSuccess, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content donate-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Support DreamDelusion</h3>
        <p className="donate-modal-description">
          Help keep the app running. Any amount is appreciated.
        </p>

        <div className="donate-amount-section">
          <span className="donate-amount-label">Choose amount (ZAR)</span>
          <div className="donate-preset-buttons">
            {PRESET_AMOUNTS_ZAR.map((amount) => (
              <button
                key={amount}
                type="button"
                className={`donate-preset-btn ${selectedAmount === amount ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedAmount(amount);
                  setCustomAmount('');
                  setError(null);
                }}
              >
                R{amount}
              </button>
            ))}
          </div>
          <div className="donate-custom-row">
            <label htmlFor="donate-custom-amount">Or enter amount (ZAR)</label>
            <input
              id="donate-custom-amount"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 100"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedAmount(null);
                setError(null);
              }}
              className="donate-custom-input"
            />
          </div>
        </div>

        {!defaultEmail && (
          <div className="donate-email-row">
            <label htmlFor="donate-email">Email</label>
            <input
              id="donate-email"
              type="email"
              placeholder="your@email.com"
              value={guestEmail}
              onChange={(e) => {
                setGuestEmail(e.target.value);
                setError(null);
              }}
              className="donate-email-input"
            />
          </div>
        )}

        {error && <p className="donate-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="account-button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className="account-button primary"
            onClick={handleDonate}
            disabled={isSubmitting || !isConfigured}
          >
            {!isConfigured ? 'Donations not configured' : isSubmitting ? 'Opening…' : 'Donate'}
          </button>
        </div>
      </div>
    </div>
  );
}
