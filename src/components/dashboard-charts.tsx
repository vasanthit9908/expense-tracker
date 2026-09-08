"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/currency";

const COLORS = ["#0f766e", "#1d4ed8", "#b45309", "#be123c", "#6d28d9", "#365314"];

export function DashboardCharts({
  currency,
  costBreakdown,
  projectProfit,
}: {
  currency: string;
  costBreakdown: { name: string; value: number }[];
  projectProfit: { name: string; profit: number; revenue: number; cost: number }[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="h-80 rounded-xl border p-4">
        <h3 className="mb-2 font-medium">Cost mix</h3>
        <ResponsiveContainer width="100%" height="90%">
          <PieChart>
            <Pie data={costBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
              {costBreakdown.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatMoney(BigInt(Math.round(Number(value))), currency)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="h-80 rounded-xl border p-4">
        <h3 className="mb-2 font-medium">Project profitability</h3>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={projectProfit}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip formatter={(value) => formatMoney(BigInt(Math.round(Number(value))), currency)} />
            <Legend />
            <Bar dataKey="revenue" fill="#1d4ed8" name="Revenue" />
            <Bar dataKey="cost" fill="#b45309" name="Cost" />
            <Bar dataKey="profit" fill="#0f766e" name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
