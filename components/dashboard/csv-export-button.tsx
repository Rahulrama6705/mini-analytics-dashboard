"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface CsvExportButtonProps {
  filename: string;
  rows: Record<string, string | number>[];
}

export function CsvExportButton({ filename, rows }: CsvExportButtonProps) {
  function handleExport() {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport} disabled={rows.length === 0}>
      <Download className="h-3 w-3" />
      Export CSV
    </Button>
  );
}
