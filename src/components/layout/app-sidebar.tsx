"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSidebar } from "@/context/SidebarContext";
import {
  LayoutDashboard,
  Package,
  Plus,
  Printer,
  ScanLine,
  ArrowLeftRight,
  FolderTree,
  MapPin,
  Wallet,
  ShieldCheck,
  Users,
  FileText,
  Settings,
  LogOut,
  MoreHorizontal,
} from "lucide-react";

// ============================================================
// Nav Config
// ============================================================
type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: "Menu Utama",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Aset",
    items: [
      { name: "Daftar Aset", href: "/dashboard/assets", icon: Package },
      { name: "Tambah Aset", href: "/dashboard/assets/new", icon: Plus, adminOnly: true },
      { name: "Cetak Label", href: "/dashboard/labels", icon: Printer, adminOnly: true },
      { name: "Scanner QR", href: "/dashboard/scan", icon: ScanLine },
      { name: "Mutasi Aset", href: "/dashboard/mutations", icon: ArrowLeftRight, adminOnly: true },
    ],
  },
  {
    label: "Data Master",
    items: [
      { name: "Kategori", href: "/dashboard/master/categories", icon: FolderTree, adminOnly: true },
      { name: "Lokasi", href: "/dashboard/master/locations", icon: MapPin, adminOnly: true },
      { name: "Sumber Dana", href: "/dashboard/master/fund-sources", icon: Wallet, adminOnly: true },
      { name: "Kondisi", href: "/dashboard/master/conditions", icon: ShieldCheck, adminOnly: true },
    ],
  },
  {
    label: "Administrasi",
    items: [
      { name: "Pengguna", href: "/dashboard/users", icon: Users, adminOnly: true },
      { name: "Audit Log", href: "/dashboard/audit-log", icon: FileText, adminOnly: true },
      { name: "Pengaturan", href: "/dashboard/settings", icon: Settings, adminOnly: true },
    ],
  },
];

// ============================================================
// Props
// ============================================================
type AppSidebarProps = {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
  appName?: string;
  logoUrl?: string | null;
};

// ============================================================
// AppSidebar Component
// ============================================================
export function AppSidebar({ user, appName = "InvenTrack", logoUrl }: AppSidebarProps) {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";
  const isVisible = isExpanded || isHovered || isMobileOpen;

  // Collect all nav hrefs (flattened) to detect more-specific matches
  const allHrefs = navSections.flatMap((s) => s.items.map((i) => i.href));

  // Active check — only highlight if no more-specific nav item also matches
  // e.g. /dashboard/assets should NOT be active when /dashboard/assets/new is
  const isActive = useCallback(
    (href: string) => {
      if (href === "/dashboard") return pathname === "/dashboard";
      const matches = pathname === href || pathname.startsWith(href + "/");
      if (!matches) return false;
      // Check if there's a more specific nav item that also matches
      const moreSpecific = allHrefs.some(
        (other) =>
          other !== href &&
          other.startsWith(href) &&
          (pathname === other || pathname.startsWith(other + "/"))
      );
      return !moreSpecific;
    },
    [pathname, allHrefs]
  );


  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => {}} // handled by toggle in header
        />
      )}

      <aside
        data-print-hide
        className={`fixed top-0 left-0 flex flex-col h-screen px-5
          bg-white dark:bg-gray-dark border-r border-gray-200 dark:border-gray-800
          transition-all duration-300 ease-in-out z-50
          ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
        onMouseEnter={() => !isExpanded && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo */}
        <div
          className={`flex py-8 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5">
            {logoUrl ? (
              <>
                <Image
                  src={logoUrl}
                  alt={appName}
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain flex-shrink-0"
                  unoptimized
                />
                {isVisible && (
                  <span className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {appName}
                  </span>
                )}
              </>
            ) : isVisible ? (
              <>
                <Image
                  className="dark:hidden"
                  src="/images/logo/logo.svg"
                  alt={appName}
                  width={160}
                  height={36}
                  priority
                />
                <Image
                  className="hidden dark:block"
                  src="/images/logo/logo-dark.svg"
                  alt={appName}
                  width={160}
                  height={36}
                  priority
                />
              </>
            ) : (
              <Image
                src="/images/logo/logo-icon.svg"
                alt={appName}
                width={32}
                height={32}
                priority
              />
            )}
          </Link>
        </div>

        {/* Nav */}
        <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
          <nav className="mb-6">
            <div className="flex flex-col gap-4">
              {navSections.map((section) => {
                const visibleItems = section.items.filter(
                  (item) => !item.adminOnly || isAdmin
                );
                if (visibleItems.length === 0) return null;

                return (
                  <div key={section.label}>
                    {/* Section Label */}
                    <h2
                      className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 font-semibold tracking-wider
                        ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}
                      `}
                    >
                      {isVisible ? (
                        section.label
                      ) : (
                        <MoreHorizontal className="w-4 h-4" />
                      )}
                    </h2>

                    {/* Items */}
                    <ul className="flex flex-col gap-1">
                      {visibleItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={`menu-item group ${
                                active ? "menu-item-active" : "menu-item-inactive"
                              } ${!isVisible ? "lg:justify-center" : ""}`}
                            >
                              <span
                                className={
                                  active
                                    ? "menu-item-icon-active"
                                    : "menu-item-icon-inactive"
                                }
                              >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                              </span>
                              {isVisible && (
                                <span className="truncate">{item.name}</span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Footer — User Info */}
        <div className="mt-auto pb-6 border-t border-gray-200 dark:border-gray-800 pt-4">
          <div
            className={`flex items-center gap-3 ${!isVisible ? "lg:justify-center" : ""}`}
          >
            {/* Avatar */}
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-semibold text-sm">
              {user.name?.charAt(0).toUpperCase() ?? "U"}
            </div>

            {/* Info + Logout */}
            {isVisible && (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                    {user.name ?? "User"}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors duration-200 cursor-pointer"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
