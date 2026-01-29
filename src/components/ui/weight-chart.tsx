'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WeightChartProps {
  data: { date: string; value: number | undefined }[]
  color?: string
  showGrid?: boolean
  height?: number
}

export function WeightChart({
  data,
  color = '#E8A5B3',
  showGrid = true,
  height = 200,
}: WeightChartProps) {
  const formattedData = data.map((item) => ({
    ...item,
    formattedDate: format(parseISO(item.date), 'dd/MM', { locale: ptBR }),
  }))

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-xl"
        style={{ height }}
      >
        <p className="text-gray-400 text-sm">Sem dados para exibir</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={formattedData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
        <XAxis
          dataKey="formattedDate"
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={['dataMin - 2', 'dataMax + 2']}
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}kg`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
          formatter={(value: number) => [`${value} kg`, 'Peso']}
          labelFormatter={(label) => `Data: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={3}
          dot={{ fill: color, strokeWidth: 0, r: 4 }}
          activeDot={{ fill: color, strokeWidth: 0, r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
