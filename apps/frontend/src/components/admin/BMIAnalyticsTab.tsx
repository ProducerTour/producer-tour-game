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

// Color palettes
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

// Enhanced custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-xl p-4 shadow-2xl shadow-black/50">
        <p className="text-white font-semibold text-sm mb-3 pb-2 border-b border-white/10">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shadow-lg"
                  style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}50` }}
                />
                <span className="text-gray-400 text-sm">{entry.name}</span>
              </div>
              <span className="text-white font-medium text-sm">
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

// Custom pie chart legend
const CustomPieLegend = ({ data }: { data: any[] }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="space-y-2 mt-4">
      {data.map((entry: any, index: number) => (
        <div key={index} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-gray-300 text-sm">{entry.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white font-medium text-sm">
              ${entry.value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </span>
            <span className="text-gray-500 text-xs w-12 text-right">
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
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white/10 rounded-xl"></div>
            ))}
          </div>
          <div className="h-80 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
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
        <Flex justifyContent="between" alignItems="start">
          <div>
            <Title className="text-white text-2xl flex items-center gap-2">
              <Radio className="w-6 h-6 text-blue-400" />
              BMI Analytics
            </Title>
            <Text className="text-gray-400">Broadcast Music Inc. statement analysis</Text>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            (kpis?.totalStatements || 0) > 0
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
              : 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              (kpis?.totalStatements || 0) > 0 ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'
            }`} />
            <span className="font-semibold">{kpis?.totalStatements || 0}</span>
            <span className="text-gray-400">Statements Processed</span>
          </div>
        </Flex>
      </div>

      {/* KPI Cards */}
      <Grid numItemsSm={2} numItemsMd={4} numItemsLg={6} className="gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 ring-0">
          <Flex alignItems="start" justifyContent="between">
            <div>
              <Text className="text-gray-400 text-sm">Total Revenue</Text>
              <Metric className="text-white text-2xl mt-1">{currencyFormat(kpis?.totalRevenue || 0)}</Metric>
            </div>
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </Flex>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 ring-0">
          <Flex alignItems="start" justifyContent="between">
            <div>
              <Text className="text-gray-400 text-sm">Net Revenue</Text>
              <Metric className="text-white text-2xl mt-1">{currencyFormat(kpis?.totalNetRevenue || 0)}</Metric>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
          </Flex>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30 ring-0">
          <Flex alignItems="start" justifyContent="between">
            <div>
              <Text className="text-gray-400 text-sm">Unique Songs</Text>
              <Metric className="text-white text-2xl mt-1">{(kpis?.uniqueSongs || 0).toLocaleString()}</Metric>
            </div>
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Music className="w-5 h-5 text-purple-400" />
            </div>
          </Flex>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30 ring-0">
          <Flex alignItems="start" justifyContent="between">
            <div>
              <Text className="text-gray-400 text-sm">Territories</Text>
              <Metric className="text-white text-2xl mt-1">{kpis?.uniqueTerritories || 0}</Metric>
            </div>
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Globe className="w-5 h-5 text-orange-400" />
            </div>
          </Flex>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 ring-0">
          <Flex alignItems="start" justifyContent="between">
            <div>
              <Text className="text-gray-400 text-sm">Countries</Text>
              <Metric className="text-white text-2xl mt-1">{kpis?.uniqueCountries || 0}</Metric>
            </div>
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <MapPin className="w-5 h-5 text-cyan-400" />
            </div>
          </Flex>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border-pink-500/30 ring-0">
          <Flex alignItems="start" justifyContent="between">
            <div>
              <Text className="text-gray-400 text-sm">Perf. Sources</Text>
              <Metric className="text-white text-2xl mt-1">{kpis?.uniquePerfSources || 0}</Metric>
            </div>
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Radio className="w-5 h-5 text-pink-400" />
            </div>
          </Flex>
        </Card>
      </Grid>

      {/* Revenue Timeline */}
      {timelineAreaData.length > 0 && (
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Title className="text-white mb-1">Revenue by Quarter/Period</Title>
              <Text className="text-gray-500 text-sm">Gross and net revenue over time</Text>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30" />
                <span className="text-gray-400 text-xs">Gross</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/30" />
                <span className="text-gray-400 text-xs">Net</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineAreaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenueBmi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5}/>
                    <stop offset="50%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNetBmi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5}/>
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}/>
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
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenueBmi)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="netRevenue"
                  name="Net Revenue"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorNetBmi)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Territory and Performance Source Breakdown */}
      <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
        {/* Territory Pie Chart */}
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="mb-4">
            <Title className="text-white mb-1">Revenue by Territory</Title>
            <Text className="text-gray-500 text-sm">Geographic distribution of earnings</Text>
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
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
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
              <Text className="text-gray-500">No territory data available</Text>
            </div>
          )}
        </Card>

        {/* Performance Source Bar Chart */}
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Title className="text-white mb-1">Performance Source Breakdown</Title>
              <Text className="text-gray-500 text-sm">Revenue by source (Radio, TV, Streaming, etc.)</Text>
            </div>
          </div>
          {perfSourceBarData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfSourceBarData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="bmiBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={1}/>
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
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="url(#bmiBarGrad)"
                    radius={[0, 6, 6, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <Text className="text-gray-500">No performance source data available</Text>
            </div>
          )}
        </Card>
      </Grid>

      {/* Top Songs */}
      <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Title className="text-white mb-1">Top Performing Songs</Title>
            <Text className="text-gray-500 text-sm">Revenue and territory distribution (top 10)</Text>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-violet-500" />
              <span className="text-gray-400 text-xs">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-amber-500" />
              <span className="text-gray-400 text-xs">Territories</span>
            </div>
          </div>
        </div>
        {topSongsBarData.length > 0 ? (
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={topSongsBarData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="bmiTopSongsGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={1}/>
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
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="url(#bmiTopSongsGrad)"
                  radius={[0, 8, 8, 0]}
                  barSize={16}
                />
                <Line
                  type="monotone"
                  dataKey="territories"
                  name="Territories"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', r: 5, stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center">
            <Text className="text-gray-500">No song data available</Text>
          </div>
        )}
      </Card>

      {/* Country Breakdown */}
      {countryBarData.length > 0 && (
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Title className="text-white mb-1">Revenue by Country of Performance</Title>
              <Text className="text-gray-500 text-sm">Detailed country-level breakdown</Text>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={countryBarData} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="bmiCountryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={1}/>
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
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="url(#bmiCountryGrad)"
                  radius={[6, 6, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Commission Summary */}
      <Card className="bg-gradient-to-br from-blue-500/10 via-white/[0.05] to-blue-600/5 border-blue-500/20 ring-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <Flex justifyContent="between" alignItems="center" className="relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <Title className="text-white">Commission Summary</Title>
            </div>
            <Text className="text-gray-400">Total commission earned from BMI statements</Text>
          </div>
          <div className="text-right">
            <Metric className="text-blue-400 text-3xl font-bold">{currencyFormat(kpis?.totalCommission || 0)}</Metric>
            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="px-2 py-0.5 bg-blue-500/20 rounded-full text-blue-400 text-xs font-medium">
                {kpis?.marginPercentage || 0}% margin
              </span>
            </div>
          </div>
        </Flex>
      </Card>
    </div>
  );
}
