import { Wifi, Globe, Clock, ShoppingCart, Check, Info } from "lucide-react";
import type { EsimPackage } from "../types";
import { useCart } from "../context/CartContext";
import { formatPrice, formatDataVolume, formatDuration, getLocationDisplay, getMaxNetworkType, getPricePerGB, isGlobalPlan, isRegionalPlan } from "../lib/api";

interface Props {
  pkg: EsimPackage;
  showCompare?: boolean;
  compared?: boolean;
  onToggleCompare?: () => void;
  onViewDetail?: () => void;
}

export default function PackageCard({ pkg, showCompare, compared, onToggleCompare, onViewDetail }: Props) {
  const { items, addItem, removeItem } = useCart();
  const inCart = items.some((i) => i.packageCode === pkg.packageCode);

  const retailPrice = pkg.retailPrice > 0 ? pkg.retailPrice : pkg.price;
  const dataStr = formatDataVolume(pkg.volume);
  const durationStr = formatDuration(pkg.duration, pkg.durationUnit);
  const locationDisplay = getLocationDisplay(pkg);
  const networkType = getMaxNetworkType(pkg);
  const pricePerGB = getPricePerGB(pkg);
  const isGlobal = isGlobalPlan(pkg);
  const isRegional = isRegionalPlan(pkg);

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-50 transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-50/0 to-cyan-50/0 group-hover:from-sky-50/50 group-hover:to-cyan-50/30 transition-all duration-300" />

      <div className="relative p-5">
        {/* Header: Badge + Network type */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
              <Wifi className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              {isGlobal && (
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Global</span>
              )}
              {isRegional && !isGlobal && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Regional</span>
              )}
              {!isGlobal && !isRegional && (
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{locationDisplay}</span>
              )}
            </div>
          </div>
          {networkType && (
            <span className="text-xs font-medium text-sky-500 bg-sky-50 px-2 py-0.5 rounded-md">
              {networkType}
            </span>
          )}
        </div>

        {/* Plan Name */}
        <h3 className="text-base font-semibold text-slate-800 mb-1 line-clamp-2">
          {pkg.name}
        </h3>

        {/* Location for multi-country plans */}
        {(isGlobal || isRegional) && (
          <p className="text-xs text-slate-500 mb-2">
            <Globe className="w-3 h-3 inline mr-1 text-sky-400" />
            {locationDisplay}
          </p>
        )}

        {/* Specs */}
        <div className="flex items-center gap-4 mt-3 mb-4">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Wifi className="w-3.5 h-3.5 text-sky-500" />
            <span>{dataStr}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            <span>{durationStr}</span>
          </div>
        </div>

        {/* Price per GB */}
        {pricePerGB > 0 && (
          <p className="text-xs text-slate-400 mb-3">
            {formatPrice(pricePerGB * 10000)}/GB
          </p>
        )}

        {/* Price + Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-2xl font-bold text-slate-800">
            {formatPrice(retailPrice)}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onViewDetail}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-sky-600 transition-colors"
              title="More Info"
            >
              <Info className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                inCart
                  ? removeItem(pkg.packageCode)
                  : addItem({
                      packageCode: pkg.packageCode,
                      packageName: pkg.name,
                      country: locationDisplay,
                      dataAmount: dataStr,
                      validity: durationStr,
                      price: retailPrice,
                    })
              }
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                inCart
                  ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  : "bg-sky-500 text-white hover:bg-sky-600 shadow-sm hover:shadow-md"
              }`}
            >
              {inCart ? (
                <>
                  <Check className="w-4 h-4" />
                  Added
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Add
                </>
              )}
            </button>
          </div>
        </div>

        {/* Compare checkbox */}
        {showCompare && onToggleCompare && (
          <label className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={compared}
              onChange={onToggleCompare}
              className="w-3.5 h-3.5 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
            />
            <span className="text-xs text-slate-500">Compare</span>
          </label>
        )}
      </div>
    </div>
  );
}
