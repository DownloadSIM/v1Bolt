import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatPrice, sendVerificationCode, verifyCode, createCheckoutSession } from "../lib/api";
import { ShoppingCart, Trash2, ArrowRight, Loader2, CreditCard, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";

type Step = "cart" | "email" | "verify" | "checkout";

export default function CartPage() {
  const { items, removeItem, clearCart, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("cart");
  const [email, setEmail] = useState(user?.email ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [_codeSent, setCodeSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  function startResendTimer() {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendCode() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await sendVerificationCode(email);
      if (data.error) {
        setError(data.error);
        return;
      }
      setCodeSent(true);
      setStep("verify");
      startResendTimer();
    } catch {
      setError("Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!code || code.length !== 4) {
      setError("Please enter the 4-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await verifyCode(email, code);
      if (!data.success || !data.verified) {
        setError(data.error || "Invalid code. Please try again.");
        return;
      }
      setStep("checkout");
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    setLoading(true);
    setError("");

    try {
      const data = await createCheckoutSession(items, user?.id ?? null, email);
      if (data.error) {
        setError(data.error);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Your cart is empty</h2>
          <p className="text-slate-500 text-sm mb-6">Browse our eSIM plans and add some to your cart.</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors"
          >
            Browse Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">Shopping Cart</h1>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { key: "cart", label: "Cart" },
            { key: "email", label: "Email" },
            { key: "verify", label: "Verify" },
            { key: "checkout", label: "Payment" },
          ].map((s, i) => {
            const stepOrder = ["cart", "email", "verify", "checkout"];
            const currentIdx = stepOrder.indexOf(step);
            const thisIdx = i;
            const isActive = step === s.key;
            const isDone = currentIdx > thisIdx;
            return (
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-sky-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isDone ? "\u2713" : i + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    isActive ? "text-sky-600" : isDone ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
                {i < 3 && (
                  <div
                    className={`flex-1 h-0.5 rounded ${
                      isDone ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step: Cart */}
        {step === "cart" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.packageCode} className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800 truncate">{item.packageName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.country} &middot; {item.dataAmount} &middot; {item.validity}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{formatPrice(item.price)}</span>
                  <button
                    onClick={() => removeItem(item.packageCode)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-500">Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})</span>
                <span className="text-xl font-bold text-slate-800">{formatPrice(total)}</span>
              </div>
              <button
                onClick={() => {
                  if (user) {
                    setEmail(user.email ?? "");
                    setStep("checkout");
                  } else {
                    setStep("email");
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 transition-all"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={clearCart}
                className="w-full mt-3 text-sm text-slate-400 hover:text-red-500 transition-colors"
              >
                Clear cart
              </button>
            </div>
          </div>
        )}

        {/* Step: Email Entry */}
        {step === "email" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-sky-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Enter your email</h2>
              <p className="text-sm text-slate-500 mt-1">
                We'll send a 4-digit code to verify your email. This ensures you receive your eSIM installation details.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl p-3">{error}</p>}

              <button
                onClick={handleSendCode}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Verification Code"}
              </button>

              <button
                onClick={() => setStep("cart")}
                className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Back to cart
              </button>
            </div>
          </div>
        )}

        {/* Step: Verify Code */}
        {step === "verify" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Verify your email</h2>
              <p className="text-sm text-slate-500 mt-1">
                We sent a 4-digit code to <span className="font-medium text-slate-700">{email}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">4-digit code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="0000"
                  maxLength={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl p-3">{error}</p>}

              <button
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 4}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Code"}
              </button>

              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-xs text-slate-400">Resend code in {resendTimer}s</p>
                ) : (
                  <button
                    onClick={handleSendCode}
                    className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                  >
                    Resend code
                  </button>
                )}
              </div>

              <button
                onClick={() => { setStep("email"); setCode(""); setError(""); }}
                className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Change email address
              </button>
            </div>
          </div>
        )}

        {/* Step: Checkout */}
        {step === "checkout" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6 text-sky-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Ready to pay</h2>
              <p className="text-sm text-slate-500 mt-1">
                {items.length} eSIM plan{items.length !== 1 ? "s" : ""} &middot; {formatPrice(total)}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                eSIM details will be sent to <span className="font-medium">{email}</span>
              </p>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl p-3 mb-4">{error}</p>}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Pay with Stripe
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={() => setStep(user ? "cart" : "verify")}
              className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
