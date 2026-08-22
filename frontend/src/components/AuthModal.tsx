import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { sendOtp, verifyOtp } from "../lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [phoneInput, setPhoneInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [otpInput, setOtpInput] = useState(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setDevOtpNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalizePhone = (raw: string): string => {
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.startsWith("84")) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+84${cleaned.slice(1)}`;
    if (cleaned.length > 0 && !raw.startsWith("+")) return `+84${cleaned}`;
    return raw.trim();
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setDevOtpNotice(null);

    const normalized = normalizePhone(phoneInput);
    if (!normalized || normalized.length < 10) {
      setError("Vui lòng nhập số điện thoại hợp lệ (VD: 0912345678).");
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(normalized);
      if (res.success) {
        setStep("OTP");
        setCooldown(60);
        if (res.devOtp) {
          setDevOtpNotice(`Mã OTP thử nghiệm: ${res.devOtp}`);
        }
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(res.message || "Không thể gửi OTP. Vui lòng thử lại.");
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi khi kết nối tới máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, "");
    if (cleaned.length > 1) {
      // Pasted full OTP
      const digits = cleaned.slice(0, 6).split("");
      const newOtp = [...otpInput];
      digits.forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtpInput(newOtp);
      const nextFocus = Math.min(digits.length, 5);
      otpRefs.current[nextFocus]?.focus();
      return;
    }

    const newOtp = [...otpInput];
    newOtp[index] = cleaned;
    setOtpInput(newOtp);

    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpInput[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const fullOtp = otpInput.join("");
    if (fullOtp.length !== 6) {
      setError("Vui lòng nhập đầy đủ 6 chữ số mã OTP.");
      return;
    }

    const normalized = normalizePhone(phoneInput);
    setLoading(true);

    try {
      const res = await verifyOtp(normalized, fullOtp, displayName.trim() || undefined);
      if (res.success && res.token && res.sessionId) {
        login(res.token, res.sessionId, {
          id: res.user.id,
          phoneNumber: res.user.phoneNumber,
          full_name: res.user.displayName,
          displayName: res.user.displayName,
          role: "STUDENT",
          avatarUrl: res.user.avatarUrl,
          quota: res.user.quota,
        });
        onClose();
      } else {
        setError(res.message || "Mã OTP không chính xác.");
      }
    } catch (err: any) {
      setError(err?.message || "Xác thực thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-white">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition text-lg"
          aria-label="Đóng"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center mx-auto mb-3 text-indigo-400 text-2xl">
            📱
          </div>
          <h2 className="text-2xl font-bold">
            {step === "PHONE" ? "Đăng Nhập / Đăng Ký" : "Xác Thực Mã OTP"}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {step === "PHONE"
              ? "Một tài khoản duy nhất gắn với số điện thoại của bạn"
              : `Mã OTP đã được gửi đến số ${normalizePhone(phoneInput)}`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Dev OTP Notice */}
        {devOtpNotice && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
            <span>ℹ️</span>
            <span>{devOtpNotice}</span>
          </div>
        )}

        {step === "PHONE" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Số Điện Thoại
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="0912345678 hoặc +84912345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Họ & Tên (Tuỳ chọn cho tài khoản mới)
              </label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg transition duration-200 disabled:opacity-50 mt-2"
            >
              {loading ? "⏳ Đang gửi mã OTP..." : "Nhận Mã Xác Thực (SMS)"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 text-center">
                Nhập 6 Chữ Số OTP
              </label>
              <div className="flex justify-center gap-2 sm:gap-3">
                {otpInput.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-slate-800 border border-slate-700 rounded-xl focus:border-indigo-500 focus:outline-none text-white transition"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpInput.join("").length !== 6}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg transition duration-200 disabled:opacity-50"
            >
              {loading ? "⏳ Đang xác thực..." : "Xác Nhận & Đăng Nhập"}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep("PHONE")}
                className="hover:text-white transition"
              >
                ← Đổi số điện thoại
              </button>

              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={cooldown > 0 || loading}
                className="text-indigo-400 hover:text-indigo-300 transition disabled:text-slate-600"
              >
                {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : "Gửi lại OTP"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
