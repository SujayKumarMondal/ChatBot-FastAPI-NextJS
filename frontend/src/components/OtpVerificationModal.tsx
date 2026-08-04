import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

type OtpVerificationModalProps = {
  isOpen: boolean;
  title: string;
  subtitle: string;
  email: string;
  onConfirm: (otp: string) => Promise<void> | void;
  onCancel: () => void;
  onResend?: () => Promise<void> | void;
  isSubmitting?: boolean;
  error?: string;
  submittingLabel?: string;
};

export default function OtpVerificationModal({
  isOpen,
  title,
  subtitle,
  email,
  onConfirm,
  onCancel,
  onResend,
  isSubmitting = false,
  error,
  submittingLabel = "Verifying...",
}: OtpVerificationModalProps) {
  const [otp, setOtp] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setOtp("");
      setLocalError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setLocalError("Please enter the 6-digit OTP.");
      return;
    }

    setLocalError("");
    await onConfirm(otp.trim());
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-card p-6 shadow-2xl shadow-primary/20">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close OTP dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Verification code</label>
            <Input
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              className="text-center tracking-[0.35em]"
            />
            <p className="mt-2 text-sm text-muted-foreground">Code sent to {email}</p>
          </div>

          {(localError || error) && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {localError || error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? submittingLabel : "Verify OTP"}
          </Button>

          {onResend && (
            <Button type="button" variant="outline" className="w-full" onClick={() => onResend()} disabled={isSubmitting}>
              Resend OTP
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
