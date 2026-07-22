"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { CategoryPoint } from "@/lib/data-sources/types";

function formatValue(value: number, valueFormat?: "currency" | "number" | "percent"): string {
  if (valueFormat === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (valueFormat === "percent") return `${value}%`;
  return new Intl.NumberFormat("en-US").format(value);
}

export function CategoryBarChart({
  data,
  valueFormat = "number",
  layout = "vertical",
}: {
  data: CategoryPoint[];
  valueFormat?: "currency" | "number" | "percent";
  layout?: "vertical" | "horizontal";
}) {
  const isHorizontal = layout === "horizontal";
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 32)}>
      <BarChart
        data={data}
        layout={isHorizontal ? "vertical" : "horizontal"}
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          horizontal={!isHorizontal}
          vertical={isHorizontal}
          stroke="var(--color-border)"
          strokeDasharray="3 3"
        />
        {isHorizontal ? (
          <>
            <XAxis
              type="number"
              tickFormatter={(v) => formatValue(v, valueFormat)}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={140}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tickFormatter={(v) => formatValue(v, valueFormat)}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={valueFormat === "currency" ? 64 : 40}
            />
          </>
        )}
        <Tooltip
          formatter={(value) => formatValue(Number(value), valueFormat)}
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" fill="var(--color-chart-1)" radius={[4, 4, 4, 4]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
