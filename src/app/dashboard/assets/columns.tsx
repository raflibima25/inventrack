"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Pencil, Trash2, QrCode } from "lucide-react";
import Link from "next/link";

export type AssetRow = {
  id: string;
  assetCode: string;
  name: string;
  brand: string | null;
  yearPurchased: number | null;
  userName: string | null;
  itemCode: string | null;
  nup: string | null;
  acquisitionValue: number | null;
  depreciation: number | null;
  category: { name: string };
  condition: { name: string; severityLevel: number };
  fundSource: { name: string } | null;
  location: { name: string } | null;
};

function conditionVariant(severity: number) {
  if (severity <= 1) return "default" as const;
  if (severity <= 2) return "secondary" as const;
  if (severity <= 3) return "destructive" as const;
  return "outline" as const;
}

export function getColumns(
  isAdmin: boolean,
  onDelete: (id: string, name: string) => void
): ColumnDef<AssetRow>[] {
  const cols: ColumnDef<AssetRow>[] = [
    {
      accessorKey: "assetCode",
      header: "Kode Aset",
      cell: ({ row }) => (
        <Link
          href={`/dashboard/assets/${row.original.id}`}
          className="font-mono text-sm text-primary hover:underline"
        >
          {row.original.assetCode}
        </Link>
      ),
    },
    {
      accessorKey: "itemCode",
      header: "Kode Barang",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.itemCode || "-"}</span>
      ),
    },
    { accessorKey: "name", header: "Nama Barang" },
    {
      accessorKey: "nup",
      header: "NUP",
      cell: ({ row }) => row.original.nup || "-",
    },
    {
      accessorKey: "category.name",
      header: "Kategori",
      cell: ({ row }) => row.original.category.name,
    },
    {
      accessorKey: "brand",
      header: "Merk",
      cell: ({ row }) => row.original.brand || "-",
    },
    {
      accessorKey: "yearPurchased",
      header: "Tahun",
      cell: ({ row }) => row.original.yearPurchased ?? "-",
    },
    {
      accessorKey: "userName",
      header: "Pengguna",
      cell: ({ row }) => row.original.userName || "-",
    },
    {
      accessorKey: "condition.name",
      header: "Kondisi",
      cell: ({ row }) => (
        <Badge variant={conditionVariant(row.original.condition.severityLevel)}>
          {row.original.condition.name}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href={`/dashboard/assets/${row.original.id}`}>
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                Lihat Detail
              </DropdownMenuItem>
            </Link>
            {isAdmin && (
              <>
                <Link href={`/dashboard/assets/${row.original.id}/edit`}>
                  <DropdownMenuItem>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </Link>
                <Link href={`/dashboard/assets/${row.original.id}#qr`}>
                  <DropdownMenuItem>
                    <QrCode className="mr-2 h-4 w-4" />
                    QR Code
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(row.original.id, row.original.name)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Hapus
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return cols;
}

