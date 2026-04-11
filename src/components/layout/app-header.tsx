"use client";

import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useTheme } from "@/context/ThemeContext";
import { signOut } from "next-auth/react";
import { useRef, useEffect, useState } from "react";
import { Sun, Moon, LogOut, Menu, X } from "lucide-react";

// ============================================================
// Breadcrumb map
// ============================================================
const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/assets": "Daftar Aset",
  "/dashboard/assets/new": "Tambah Aset",
  "/dashboard/assets/import": "Import Aset",
  "/dashboard/assets/export": "Export Aset",
  "/dashboard/assets/trash": "Aset Terhapus",
  "/dashboard/labels": "Cetak Label",
  "/dashboard/scan": "Scanner QR",
  "/dashboard/mutations": "Mutasi Aset",
  "/dashboard/master/categories": "Kategori",
  "/dashboard/master/locations": "Lokasi",
  "/dashboard/master/fund-sources": "Sumber Dana",
  "/dashboard/master/conditions": "Kondisi",
  "/dashboard/users": "Pengguna",
  "/dashboard/audit-log": "Audit Log",
  "/dashboard/settings": "Pengaturan",
};

function getPageTitle(pathname: string): string {
  if (breadcrumbMap[pathname]) return breadcrumbMap[pathname];
  if (/^\/dashboard\/assets\/[^/]+\/edit$/.test(pathname)) return "Edit Aset";
  if (/^\/dashboard\/assets\/[^/]+$/.test(pathname)) return "Detail Aset";
  return "Dashboard";
}

// ============================================================
// AppHeader Component
// ============================================================
type AppHeaderProps = {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
  appName?: string;
};

export function AppHeader({ user, appName = "InvenTrack" }: AppHeaderProps) {
  const pathname = usePathname();
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const title = getPageTitle(pathname);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const userName = user.name ?? "User";
  const userRole = user.role ?? "";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header data-print-hide className="sticky top-0 flex w-full bg-white dark:bg-gray-dark border-b border-gray-200 dark:border-gray-800 z-[99] shadow-theme-xs">
      <div className="flex items-center justify-between w-full px-4 py-3 lg:px-6">

        {/* Left: Sidebar Toggle + Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Page Title / Breadcrumb */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-gray-400 dark:text-gray-500 text-sm">{appName}</span>
            <span className="text-gray-300 dark:text-gray-700">/</span>
            <h1 className="text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h1>
          </div>
        </div>

        {/* Right: Search + Theme + User */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Search Bar (desktop only) */}
          <div className="hidden lg:flex items-center">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z" fill="currentColor" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Cari aset..."
                className="h-10 w-[240px] xl:w-[320px] rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent pl-10 pr-4 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-brand-300 dark:focus:border-brand-600 focus:ring-2 focus:ring-brand-500/10 transition-colors duration-200"
              />
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* User Dropdown */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-semibold text-sm flex-shrink-0">
                {userInitial}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-white/90 leading-tight">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                  {userRole}
                </p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark shadow-theme-lg z-50 overflow-hidden">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userRole}
                  </p>
                </div>

                {/* Actions */}
                <div className="py-1">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors duration-200 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
