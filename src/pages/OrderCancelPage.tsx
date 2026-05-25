import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";

export default function OrderCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Payment Cancelled</h1>
        <p className="text-slate-500 text-sm mb-8">
          Your payment was not completed. No charges have been made. You can try again anytime.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate("/cart")}
            className="px-6 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors"
          >
            Return to Cart
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Browse Plans
          </button>
        </div>
      </div>
    </div>
  );
}
