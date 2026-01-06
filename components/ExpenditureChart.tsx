"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  amount: {
    label: "Spent",
    color: "#0f172a",
  },
} satisfies ChartConfig;

export function ExpenditureChart({
  data,
  view,
  type,
}: {
  data: any[];
  view: "daily" | "cumulative";
  type: "date" | "category";
}) {
  const processedData = React.useMemo(() => {
    // 1. Logic for Category Bar Chart
    if (type === "category") {
      const groups = data.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {});
      return Object.keys(groups)
        .map((cat) => ({ name: cat, amount: groups[cat] }))
        .sort((a, b) => b.amount - a.amount);
    }

    // 2. Logic for Date Timeline (Daily or Cumulative)
    const groups = data.reduce((acc, curr) => {
      const dateKey = new Date(curr.created_at).toISOString().split("T")[0];
      acc[dateKey] = (acc[dateKey] || 0) + curr.amount;
      return acc;
    }, {});

    const sortedDates = Object.keys(groups).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    let runningTotal = 0;
    return sortedDates.map((date) => {
      runningTotal += groups[date];
      return {
        date: new Date(date).toLocaleDateString("en-GB", {
          month: "short",
          day: "numeric",
        }),
        amount: view === "cumulative" ? runningTotal : groups[date],
      };
    });
  }, [data, view, type]);

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      {type === "date" ? (
        <AreaChart
          data={processedData}
          margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="fillAmount" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-amount)"
                stopOpacity={0.15}
              />
              <stop
                offset="95%"
                stopColor="var(--color-amount)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="#f1f5f9"
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            minTickGap={32}
            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
          />
          <YAxis hide />
          <ChartTooltip
            cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    Rs. {Number(value).toLocaleString("en-PK")}
                  </div>
                )}
              />
            }
          />
          <Area
            dataKey="amount"
            type="monotone"
            fill="url(#fillAmount)"
            stroke="var(--color-amount)"
            strokeWidth={2}
            animationDuration={1500}
          />
        </AreaChart>
      ) : (
        <BarChart
          data={processedData}
          layout="vertical"
          margin={{ left: -20, right: 20 }}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fontWeight: 600 }}
            width={80}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    Rs. {Number(value).toLocaleString("en-PK")}
                  </div>
                )}
              />
            }
          />
          <Bar
            dataKey="amount"
            fill="var(--color-amount)"
            radius={[0, 4, 4, 0]}
            barSize={24}
          />
        </BarChart>
      )}
    </ChartContainer>
  );
}
