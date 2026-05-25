import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Wifi, ShoppingCart, User, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path
      ? "text-sky-600 font-semibold"
      : "text-slate-600 hover:text-sky-600";

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">
              eSIM<span className="text-sky-500">Store</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className={`text-sm transition-colors ${isActive("/")}`}>
              Browse
            </Link>
            <Link to="/orders" className={`text-sm transition-colors ${isActive("/orders")}`}>
              My eSIMs
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/cart"
              className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-sky-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="max-w-[120px] truncate">{user.email}</span>
                </Link>
                <button
                  onClick={signOut}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors shadow-sm"
              >
                Sign In
              </Link>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-xl hover:bg-slate-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-3 space-y-2">
            <Link
              to="/"
              className="block px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              onClick={() => setMobileOpen(false)}
            >
              Browse Plans
            </Link>
            <Link
              to="/orders"
              className="block px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              onClick={() => setMobileOpen(false)}
            >
              My eSIMs
            </Link>
            <Link
              to="/cart"
              className="block px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              onClick={() => setMobileOpen(false)}
            >
              Cart {itemCount > 0 && `(${itemCount})`}
            </Link>
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                  onClick={() => setMobileOpen(false)}
                >
                  Account Settings
                </Link>
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="block px-3 py-2 rounded-lg text-sm text-sky-600 font-medium hover:bg-sky-50"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
