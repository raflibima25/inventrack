"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, Package } from "lucide-react";
import Image from "next/image";

const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

type LoginFormData = z.infer<typeof loginSchema>;

type LoginFormProps = {
  appName: string;
  institutionName: string;
  appDescription: string | null;
  logoUrl: string | null;
};

export function LoginForm({ appName, appDescription, logoUrl }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(data: LoginFormData) {
    setError(null);
    const result = await signIn("credentials", {
      username: data.username,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Username atau password salah. Silakan coba lagi.");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">

      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative items-center justify-center bg-brand-600 dark:bg-brand-700 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-brand-300 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-brand-400 blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-md px-10 text-white text-center">
          {/* Logo Icon */}
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-theme-lg overflow-hidden">
            {logoUrl ? (
              <Image src={logoUrl} alt={appName} width={56} height={56} className="h-14 w-14 object-contain" unoptimized />
            ) : (
              <Package className="h-10 w-10 text-white" />
            )}
          </div>

          <h1 className="text-4xl font-bold tracking-tight mb-4">
            {appName}
          </h1>
          <p className="text-lg text-brand-100 leading-relaxed mb-8">
            {appDescription || "Sistem manajemen inventaris & pelabelan aset berbasis QR Code yang terintegrasi dan mudah digunakan."}
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {["QR Code Label", "Lacak Aset", "Laporan Real-time"].map((f) => (
              <span
                key={f}
                className="rounded-full bg-white/15 border border-white/20 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex w-full lg:w-1/2 xl:w-2/5 items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 shadow-theme-sm overflow-hidden">
                {logoUrl ? (
                  <Image src={logoUrl} alt={appName} width={28} height={28} className="h-7 w-7 object-contain" unoptimized />
                ) : (
                  <Package className="h-5 w-5 text-white" />
                )}
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">{appName}</span>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white/90">
              Selamat datang kembali!
            </h2>
            <p className="mt-1.5 text-theme-sm text-gray-500 dark:text-gray-400">
              Masukkan kredensial Anda untuk mengakses dashboard.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-500/10 px-4 py-3.5">
              <svg className="mt-0.5 w-4 h-4 text-error-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" fill="currentColor"/>
              </svg>
              <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Masukkan username"
                autoComplete="username"
                {...register("username")}
                className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark px-4 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-brand-400 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-colors duration-200"
              />
              {errors.username && (
                <p className="text-xs text-error-500">{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  {...register("password")}
                  className="w-full h-11 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-dark px-4 pr-11 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-brand-400 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-colors duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-error-500">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shadow-theme-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
            © {new Date().getFullYear()} {appName}. Sistem Inventaris Aset.
          </p>
        </div>
      </div>
    </div>
  );
}
