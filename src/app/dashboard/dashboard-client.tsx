"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import type { ApexOptions } from "apexcharts";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Stats = {
  totalAssets: number;
  conditionGood: number;
  conditionDamaged: number;
  conditionLost: number;
  assetsByCondition: { name: string; count: number }[];
  assetsByCategory: { name: string; count: number }[];
  assetsByYear: { year: number; count: number }[];
  assetsByFundSource: { name: string; count: number }[];
  recentAssets: {
    id: string;
    assetCode: string;
    name: string;
    createdAt: string;
    category: { name: string };
  }[];
  recentScans: {
    id: string;
    scannedAt: string;
    ipAddress: string | null;
    asset: { assetCode: string; name: string };
  }[];
};

const cardStyle =
  "rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark p-5 shadow-theme-xs";

export function DashboardClient({ stats, appName = "InvenTrack" }: { stats: Stats; appName?: string }) {
  const statCards = [
    {
      title: "Total Aset",
      value: stats.totalAssets,
      subtitle: "Seluruh aset terdaftar",
      icon: Package,
      iconBg: "bg-brand-50 dark:bg-brand-500/10",
      iconColor: "text-brand-500 dark:text-brand-400",
    },
    {
      title: "Kondisi Baik",
      value: stats.conditionGood,
      subtitle: "Aset dalam kondisi layak",
      icon: CheckCircle2,
      iconBg: "bg-success-50 dark:bg-success-500/10",
      iconColor: "text-success-500 dark:text-success-400",
    },
    {
      title: "Rusak / Perbaikan",
      value: stats.conditionDamaged,
      subtitle: "Perlu tindak lanjut",
      icon: AlertTriangle,
      iconBg: "bg-warning-50 dark:bg-warning-500/10",
      iconColor: "text-warning-500 dark:text-warning-400",
    },
    {
      title: "Hilang",
      value: stats.conditionLost,
      subtitle: "Tidak ditemukan",
      icon: XCircle,
      iconBg: "bg-error-50 dark:bg-error-500/10",
      iconColor: "text-error-500 dark:text-error-400",
    },
  ];

  // Chart: Aset per Kategori (Bar)
  const categoryChart: ApexOptions = {
    colors: ["#465fff"],
    chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 250, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: "50%", borderRadius: 5, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: { categories: stats.assetsByCategory.map((c) => c.name), axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { title: { text: undefined } },
    grid: { yaxis: { lines: { show: true } } },
    fill: { opacity: 1 },
    tooltip: { y: { formatter: (val: number) => `${val} aset` } },
  };

  // Chart: Aset per Kondisi (Donut)
  const conditionChart: ApexOptions = {
    colors: ["#12b76a", "#f79009", "#f04438", "#667085"],
    chart: { fontFamily: "Outfit, sans-serif", type: "donut", height: 250 },
    labels: stats.assetsByCondition.map((c) => c.name),
    legend: { position: "bottom", fontFamily: "Outfit" },
    dataLabels: { enabled: true },
    tooltip: { y: { formatter: (val: number) => `${val} aset` } },
  };

  // Chart: Aset per Tahun (Bar)
  const yearChart: ApexOptions = {
    colors: ["#465fff"],
    chart: { fontFamily: "Outfit, sans-serif", type: "bar", height: 250, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: "50%", borderRadius: 5, borderRadiusApplication: "end" } },
    dataLabels: { enabled: false },
    xaxis: { categories: stats.assetsByYear.map((y) => String(y.year)), axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { title: { text: undefined } },
    grid: { yaxis: { lines: { show: true } } },
    fill: { opacity: 1 },
    tooltip: { y: { formatter: (val: number) => `${val} aset` } },
  };

  // Chart: Aset per Sumber Dana (Donut)
  const fundSourceChart: ApexOptions = {
    colors: ["#465fff", "#12b76a", "#f79009", "#f04438", "#7a5af8", "#667085"],
    chart: { fontFamily: "Outfit, sans-serif", type: "donut", height: 250 },
    labels: stats.assetsByFundSource.map((f) => f.name),
    legend: { position: "bottom", fontFamily: "Outfit" },
    dataLabels: { enabled: true },
    tooltip: { y: { formatter: (val: number) => `${val} aset` } },
  };

  const hasData = stats.totalAssets > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-title-sm font-bold text-gray-900 dark:text-white/90">
            Dashboard
          </h2>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            Selamat datang di {appName}. Berikut ringkasan inventaris aset Anda.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Periode: Semua waktu</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.title} className={cardStyle}>
            <div className="flex items-start justify-between">
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.iconBg}`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
                <ArrowUpRight className="w-3 h-3" />
                <span>—</span>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white/90">
                {stat.value}
              </h3>
              <p className="mt-0.5 text-theme-sm font-medium text-gray-700 dark:text-gray-300">
                {stat.title}
              </p>
              <p className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
                {stat.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {hasData ? (
        <>
          {/* Charts Row 1: Kategori + Kondisi */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className={cardStyle}>
              <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
                Aset per Kategori
              </h3>
              <ReactApexChart
                options={categoryChart}
                series={[{ name: "Jumlah", data: stats.assetsByCategory.map((c) => c.count) }]}
                type="bar"
                height={250}
              />
            </div>
            <div className={cardStyle}>
              <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
                Aset per Kondisi
              </h3>
              <ReactApexChart
                options={conditionChart}
                series={stats.assetsByCondition.map((c) => c.count)}
                type="donut"
                height={250}
              />
            </div>
          </div>

          {/* Charts Row 2: Tahun + Sumber Dana */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className={cardStyle}>
              <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
                Aset per Tahun Pengadaan
              </h3>
              <ReactApexChart
                options={yearChart}
                series={[{ name: "Jumlah", data: stats.assetsByYear.map((y) => y.count) }]}
                type="bar"
                height={250}
              />
            </div>
            <div className={cardStyle}>
              <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
                Aset per Sumber Dana
              </h3>
              <ReactApexChart
                options={fundSourceChart}
                series={stats.assetsByFundSource.map((f) => f.count)}
                type="donut"
                height={250}
              />
            </div>
          </div>

          {/* Tables Row: Recent Assets + Recent Scans */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Assets */}
            <div className={cardStyle}>
              <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
                10 Aset Terbaru
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Kode</th>
                      <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Nama</th>
                      <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Kategori</th>
                      <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentAssets.map((asset) => (
                      <tr key={asset.id} className="border-b border-gray-50 dark:border-gray-800/50">
                        <td className="py-2">
                          <Link
                            href={`/dashboard/assets/${asset.id}`}
                            className="font-mono text-xs text-brand-500 hover:underline"
                          >
                            {asset.assetCode}
                          </Link>
                        </td>
                        <td className="py-2 text-gray-700 dark:text-gray-300">{asset.name}</td>
                        <td className="py-2 text-gray-500 dark:text-gray-400">{asset.category.name}</td>
                        <td className="py-2 text-gray-400 dark:text-gray-500 text-xs">
                          {new Date(asset.createdAt).toLocaleDateString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Scans */}
            <div className={cardStyle}>
              <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
                10 Scan QR Terbaru
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Kode Aset</th>
                      <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Nama</th>
                      <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">IP</th>
                      <th className="pb-2 text-left font-medium text-gray-500 dark:text-gray-400">Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentScans.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-400">
                          Belum ada scan
                        </td>
                      </tr>
                    ) : (
                      stats.recentScans.map((scan) => (
                        <tr key={scan.id} className="border-b border-gray-50 dark:border-gray-800/50">
                          <td className="py-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                            {scan.asset.assetCode}
                          </td>
                          <td className="py-2 text-gray-700 dark:text-gray-300">{scan.asset.name}</td>
                          <td className="py-2 text-gray-400 dark:text-gray-500 text-xs">
                            {scan.ipAddress || "-"}
                          </td>
                          <td className="py-2 text-gray-400 dark:text-gray-500 text-xs">
                            {new Date(scan.scannedAt).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
            <Package className="h-7 w-7 text-brand-500 dark:text-brand-400" />
          </div>
          <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Belum ada data aset
          </h4>
          <p className="mt-1 text-theme-sm text-gray-400 dark:text-gray-500 max-w-sm mx-auto">
            Mulai tambahkan aset pertama Anda untuk melihat statistik dan laporan inventaris di sini.
          </p>
          <Link
            href="/dashboard/assets/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition-colors duration-200"
          >
            <Package className="w-4 h-4" />
            Tambah Aset Pertama
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className={cardStyle + " p-6"}>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90 mb-4">
          Aksi Cepat
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Tambah Aset Baru", href: "/dashboard/assets/new", color: "bg-brand-500 hover:bg-brand-600 text-white" },
            { label: "Lihat Semua Aset", href: "/dashboard/assets", color: "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" },
            { label: "Cetak Label QR", href: "/dashboard/labels", color: "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200 ${action.color}`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
