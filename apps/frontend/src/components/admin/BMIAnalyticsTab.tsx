/**
 * BMI Analytics Tab
 * Analytics dashboard for BMI statement data with territory and performance source breakdowns
 */

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Title,
  Text,
  Metric,
  Flex,
  Grid,
} from '@tremor/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  Line,
} from 'recharts';
import { dashboardApi } from '../../lib/api';
import { TrendingUp, Music, DollarSign, Globe, MapPin, Radio } from 'lucide-react';

// Color palettes - Cassette theme with yellow accent
const COLORS = ['#f0e226', '#c4c41c', '#a3a311', '#d9d920', '#e6e623', '#f5f54a', '#f7f76e', '#fafa8f'];

// Enhanced custom tooltip component - Cassette themed
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#19181a] border border-white/10 p-4 shadow-2xl">
        <p className="text-[#f0e226] font-light text-sm mb-3 pb-2 border-b border-white/10">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-white/40 text-sm">{entry.name}</span>
              </div>
              <span className="text-white font-light text-sm">
                ${entry.value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Custom pie chart legend - Cassette themed
const CustomPieLegend = ({ data }: { data: any[] }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="space-y-2 mt-4">
      {data.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between px-3 py-2 bg-black/30 hover:bg-black/50 border border-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-white/60 text-sm">{entry.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white font-light text-sm">
              ${entry.value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-white/30 text-xs w-12 text-right">
              {total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function BMIAnalyticsTab() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bmi-analytics'],
    queryFn: async () => {
      const response = await dashboardApi.getBmiAnalytics();
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#f0e226]/20 border-t-[#f0e226] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 p-6 text-center">
        <Text className="text-red-400">Failed to load BMI Analytics. Make sure you have BMI statements uploaded and processed.</Text>
      </div>
    );
  }

  const { kpis, territories, countries, perfSources, timeline, topSongs } = data;

  // Prepare data for charts
  const territoryPieData = territories?.slice(0, 8).map((t: any, i: number) => ({
    name: t.territory,
    value: Number(t.revenue) || 0,
    fill: COLORS[i % COLORS.length],
  })) || [];

  const perfSourceBarData = perfSources?.slice(0, 10).map((p: any) => ({
    name: p.source.length > 15 ? p.source.slice(0, 15) + '...' : p.source,
    fullName: p.source,
    revenue: Number(p.revenue) || 0,
    netRevenue: Number(p.netRevenue) || 0,
    performances: Number(p.performances) || 0,
  })) || [];

  const timelineAreaData = timeline?.map((t: any) => ({
    quarter: t.quarter,
    revenue: Number(t.revenue) || 0,
    netRevenue: Number(t.netRevenue) || 0,
    performances: Number(t.performances) || 0,
  })) || [];

  const topSongsBarData = topSongs?.slice(0, 10).map((s: any) => ({
    title: s.title.length > 25 ? s.title.slice(0, 25) + '...' : s.title,
    fullTitle: s.title,
    revenue: Number(s.revenue) || 0,
    performances: Number(s.performances) || 0,
    territories: Number(s.territoryCount) || 0,
  })) || [];

  const countryBarData = countries?.slice(0, 10).map((c: any) => ({
    name: c.country.length > 12 ? c.country.slice(0, 12) + '...' : c.country,
    fullName: c.country,
    revenue: Number(c.revenue) || 0,
    performances: Number(c.performances) || 0,
  })) || [];

  const currencyFormat = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-white text-2xl font-light flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-[#f0e226]/10 flex items-center justify-center">
                <Radio className="w-5 h-5 text-[#f0e226]" />
              </div>
              BMI Analytics
            </h2>
            <p className="text-white/40">Broadcast Music Inc. statement analysis</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
            (kpis?.totalStatements || 0) > 0
              ? 'bg-[#f0e226]/15 text-[#f0e226] border border-[#f0e226]/30'
              : 'bg-white/5 text-white/40 border border-white/10'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              (kpis?.totalStatements || 0) > 0 ? 'bg-[#f0e226] animate-pulse' : 'bg-white/30'
            }`} />
            <span className="font-light">{kpis?.totalStatements || 0}</span>
            <span className="text-white/40">Statements Processed</span>
          </div>
        </div>
      </div>

      {/* KPI Cards - Cassette Theme */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="group relative overflow-hidden bg-[#19181a] border border-white/5 p-4 hover:border-[#f0e226]/30 transition-all duration-300 border-t-2 border-t-[#f0e226]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-[0.2em]">Total Revenue</p>
              <p className="text-[#f0e226] text-2xl font-light mt-1">{currencyFormat(kpis?.totalRevenue || 0)}</p>
            </div>
            <div className="p-2 bg-[#f0e226]/10">
              <DollarSign className="w-5 h-5 text-[#f0e226]" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-[#19181a] border border-white/5 p-4 hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-[0.2em]">Net Revenue</p>
              <p className="text-white text-2xl font-light mt-1">{currencyFormat(kpis?.totalNetRevenue || 0)}</p>
            </div>
            <div className="p-2 bg-[#f0e226]/10">
              <TrendingUp className="w-5 h-5 text-[#f0e226]" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-[#19181a] border border-white/5 p-4 hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-[0.2em]">Unique Songs</p>
              <p className="text-white text-2xl font-light mt-1">{(kpis?.uniqueSongs || 0).toLocaleString()}</p>
            </div>
            <div className="p-2 bg-[#f0e226]/10">
              <Music className="w-5 h-5 text-[#f0e226]" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-[#19181a] border border-white/5 p-4 hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-[0.2em]">Territories</p>
              <p className="text-white text-2xl font-light mt-1">{kpis?.uniqueTerritories || 0}</p>
            </div>
            <div className="p-2 bg-[#f0e226]/10">
              <Globe className="w-5 h-5 text-[#f0e226]" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-[#19181a] border border-white/5 p-4 hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-[0.2em]">Countries</p>
              <p className="text-white text-2xl font-light mt-1">{kpis?.uniqueCountries || 0}</p>
            </div>
            <div className="p-2 bg-[#f0e226]/10">
              <MapPin className="w-5 h-5 text-[#f0e226]" />
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden bg-[#19181a] border border-white/5 p-4 hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-xs uppercase tracking-[0.2em]">Perf. Sources</p>
              <p className="text-white text-2xl font-light mt-1">{kpis?.uniquePerfSources || 0}</p>
            </div>
            <div className="p-2 bg-[#f0e226]/10">
              <Radio className="w-5 h-5 text-[#f0e226]" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Timeline - Cassette Theme */}
      {timelineAreaData.length > 0 && (
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-light text-white mb-1">Revenue by Quarter/Period</h3>
              <p className="text-white/40 text-sm">Gross and net revenue over time</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#f0e226]" />
                <span className="text-white/40 text-xs">Gross</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white/60" />
                <span className="text-white/40 text-xs">Net</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineAreaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenueBmi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f0e226" stopOpacity={0.5}/>
                    <stop offset="50%" stopColor="#f0e226" stopOpacity={0.15}/>
                    <stop offset="100%" stopColor="#f0e226" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNetBmi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.3}/>
                    <stop offset="50%" stopColor="#ffffff" stopOpacity={0.1}/>
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} vertical={false} />
                <XAxis
                  dataKey="quarter"
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#374151', strokeWidth: 1 }}
                  dy={10}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                  dx={-5}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6b7280', strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Gross Revenue"
                  stroke="#f0e226"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenueBmi)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#f0e226', stroke: '#000', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="netRevenue"
                  name="Net Revenue"
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorNetBmi)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#ffffff', stroke: '#000', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Territory and Performance Source Breakdown - Cassette Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Territory Pie Chart */}
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
          <div className="mb-4">
            <h3 className="text-lg font-light text-white mb-1">Revenue by Territory</h3>
            <p className="text-white/40 text-sm">Geographic distribution of earnings</p>
          </div>
          {territoryPieData.length > 0 ? (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="h-56 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {COLORS.map((color, i) => (
                        <linearGradient key={i} id={`bmiPieGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={1}/>
                          <stop offset="100%" stopColor={color} stopOpacity={0.7}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={territoryPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={85}
                      innerRadius={55}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth={1}
                    >
                      {territoryPieData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={`url(#bmiPieGrad-${index})`} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => currencyFormat(value)}
                      contentStyle={{
                        backgroundColor: '#19181a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '12px',
                      }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1">
                <CustomPieLegend data={territoryPieData} />
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center">
              <p className="text-white/40">No territory data available</p>
            </div>
          )}
        </div>

        {/* Performance Source Bar Chart */}
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-light text-white mb-1">Performance Source Breakdown</h3>
              <p className="text-white/40 text-sm">Revenue by source (Radio, TV, Streaming, etc.)</p>
            </div>
          </div>
          {perfSourceBarData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfSourceBarData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="bmiBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f0e226" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#f5f54a" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#6b7280"
                    fontSize={10}
                    tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={{ stroke: '#374151' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#9ca3af"
                    fontSize={11}
                    width={100}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(240,226,38,0.05)' }} />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="url(#bmiBarGrad)"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <p className="text-white/40">No performance source data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Songs - Cassette Theme */}
      <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-light text-white mb-1">Top Performing Songs</h3>
            <p className="text-white/40 text-sm">Revenue and territory distribution (top 10)</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#f0e226]" />
              <span className="text-white/40 text-xs">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-white/60" />
              <span className="text-white/40 text-xs">Territories</span>
            </div>
          </div>
        </div>
        {topSongsBarData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={topSongsBarData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="bmiTopSongsGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f0e226" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#f5f54a" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#6b7280"
                  fontSize={10}
                  tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis
                  dataKey="title"
                  type="category"
                  stroke="#9ca3af"
                  fontSize={10}
                  width={150}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#d1d5db' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(240,226,38,0.05)' }} />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="url(#bmiTopSongsGrad)"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
                <Line
                  type="monotone"
                  dataKey="territories"
                  name="Territories"
                  stroke="#ffffff"
                  strokeWidth={3}
                  dot={{ fill: '#ffffff', r: 5, stroke: '#000', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#ffffff', stroke: '#000', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center">
            <p className="text-white/40">No song data available</p>
          </div>
        )}
      </div>

      {/* Country Breakdown - Cassette Theme */}
      {countryBarData.length > 0 && (
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/20 transition-all duration-300">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-light text-white mb-1">Revenue by Country of Performance</h3>
              <p className="text-white/40 text-sm">Detailed country-level breakdown</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryBarData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="bmiCountryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f0e226" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#f5f54a" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={10}
                  tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(240,226,38,0.05)' }} />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="url(#bmiCountryGrad)"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Commission Summary */}
      <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#f0e226]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="flex justify-between items-center relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#f0e226] animate-pulse" />
              <h3 className="text-white font-light text-lg">Commission Summary</h3>
            </div>
            <p className="text-white/40">Total commission earned from BMI statements</p>
          </div>
          <div className="text-right">
            <div className="text-[#f0e226] text-3xl font-light">{currencyFormat(kpis?.totalCommission || 0)}</div>
            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="px-2 py-0.5 bg-[#f0e226]/15 text-[#f0e226] text-xs border border-[#f0e226]/30">
                {kpis?.marginPercentage || 0}% margin
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
