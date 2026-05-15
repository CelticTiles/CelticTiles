"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/utils"
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface StatusBreakdownItem {
  name: string
  value: number
}

interface SalesReportChartsProps {
  revenueChartData: Array<{ date: string; revenue: number }>
  statusBreakdown: StatusBreakdownItem[]
  statusColors: Record<string, string>
}

export function SalesReportCharts({ revenueChartData, statusBreakdown, statusColors }: SalesReportChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="h-[350px]">
        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Revenue Growth</h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenueChartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#64748b' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(v) => `€${v}`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              formatter={(value) => [formatPrice(value as number), 'Revenue']} 
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#8B1A1A" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#8B1A1A', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={true} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-[350px]">
        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Market Share (Status)</h4>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusBreakdown}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              isAnimationActive={true}
            >
              {statusBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={statusColors[entry.name] || "#6b7280"} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value) => <span className="text-xs font-medium text-slate-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
