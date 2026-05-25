import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  fetchPackages,
  formatPrice,
  formatDataVolume,
  formatDuration,
  getLocationDisplay,
  getMaxNetworkType,
  getPricePerGB,
  getCountryCount,
} from "../lib/api";
import type { EsimPackage } from "../types";
import { X, Loader2, ShoppingCart, Check, ArrowLeft } from "lucide-react";
import { useCart } from "../context/CartContext";

export default function ComparePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addItem, items, removeItem } = useCart();
  const [packages, setPackages] = useState<EsimPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const codes = searchParams.get("codes")?.split(",").filter(Boolean) ?? [];

  useEffect(() => {
    loadPackages();
  }, []);

  async function loadPackages() {
    setLoading(true);
    try {
      const all = await fetchPackages();
      const filtered = (all as EsimPackage[]).filter((p) => codes.includes(p.packageCode));
      setPackages(filtered);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  function removePackage(code: string) {
    const remaining = codes.filter((c) => c !== code);
    if (remaining.length === 0) {
      navigate("/");
    } else {
      navigate(`/compare?codes=${remaining.join(",")}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (packages.length < 2) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Select at least 2 plans to compare</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 bg-sky-500 text-white text-sm rounded-xl hover:bg-sky-600">
            Browse Plans
          </button>
        </div>
      </div>
    );
  }

  const specRows: { label: string; getValue: (p: EsimPackage) => string }[] = [
    { label: "Price", getValue: (p) => formatPrice(p.retailPrice > 0 ? p.retailPrice : p.price) },
    { label: "Price per GB", getValue: (p) => { const pp = getPricePerGB(p); return pp > 0 ? `$${pp.toFixed(2)}` : "N/A"; } },
    { label: "Data", getValue: (p) => formatDataVolume(p.volume) },
    { label: "Duration", getValue: (p) => formatDuration(p.duration, p.durationUnit) },
    { label: "Countries", getValue: (p) => `${getCountryCount(p)}` },
    { label: "Network", getValue: (p) => getMaxNetworkType(p) },
    { label: "Speed", getValue: (p) => p.speed || "Standard" },
    { label: "Top-Up", getValue: (p) => p.supportTopUpType === 2 ? "Yes" : "No" },
    { label: "Activation", getValue: (p) => p.activeType === 1 ? "Auto" : `Type ${p.activeType}` },
    { label: "FUP Policy", getValue: (p) => p.fupPolicy || "N/A" },
    { label: "IP Export", getValue: (p) => p.ipExport || "N/A" },
    { label: "SMS", getValue: (p) => p.smsStatus === 0 ? "No" : "Yes" },
    { label: "Package Code", getValue: (p) => p.packageCode },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-2xl font-bold text-slate-800 mb-6">
          Comparing {packages.length} Plans
        </h1>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="p-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-36">
                  Specification
                </th>
                {packages.map((pkg) => (
                  <th key={pkg.packageCode} className="p-4 text-center relative">
                    <button
                      onClick={() => removePackage(pkg.packageCode)}
                      className="absolute top-2 right-2 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-sm font-semibold text-slate-800 mb-1">{pkg.name}</div>
                    <div className="text-xs text-slate-400">{getLocationDisplay(pkg)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {specRows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? "bg-slate-50/50" : ""}>
                  <td className="p-3 text-sm font-medium text-slate-600 border-r border-slate-100">
                    {row.label}
                  </td>
                  {packages.map((pkg) => (
                    <td key={pkg.packageCode} className="p-3 text-sm text-slate-700 text-center">
                      {row.getValue(pkg)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Buy row */}
              <tr className="border-t border-slate-200">
                <td className="p-3 text-sm font-medium text-slate-600 border-r border-slate-100">Action</td>
                {packages.map((pkg) => {
                  const inCart = items.some((i) => i.packageCode === pkg.packageCode);
                  const retailPrice = pkg.retailPrice > 0 ? pkg.retailPrice : pkg.price;
                  return (
                    <td key={pkg.packageCode} className="p-3 text-center">
                      <button
                        onClick={() =>
                          inCart
                            ? removeItem(pkg.packageCode)
                            : addItem({
                                packageCode: pkg.packageCode,
                                packageName: pkg.name,
                                country: getLocationDisplay(pkg),
                                dataAmount: formatDataVolume(pkg.volume),
                                validity: formatDuration(pkg.duration, pkg.durationUnit),
                                price: retailPrice,
                              })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                          inCart
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-sky-500 text-white hover:bg-sky-600"
                        }`}
                      >
                        {inCart ? <><Check className="w-3 h-3" /> In Cart</> : <><ShoppingCart className="w-3 h-3" /> Add</>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
