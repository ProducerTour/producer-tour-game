/**
 * Analytics Tab with Tremor Components
 * Premium analytics dashboard with KPIs, charts, and detailed breakdowns
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Title,
  Text,
  Metric,
  Flex,
  Grid,
  List,
  ListItem,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableFoot,
  TableFooterCell,
} from '@tremor/react';
import { dashboardApi } from '../../lib/api';
import { TerritoryHeatmap } from '../TerritoryHeatmap';
import { ChartCard } from '../ChartCard';
import { NivoLineChart, NivoBarChart, NivoPieChart } from '../charts';

export default function AnalyticsTabTremor() {
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});

  const toggleChartExpansion = (chartId: string) => {
    setExpandedCharts(prev => ({
      ...prev,
      [chartId]: !prev[chartId]
    }));
  };

  // Data queries
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data;
    },
  });

  const { data: platformData, isLoading: platformLoading } = useQuery({
    queryKey: ['platform-breakdown'],
    queryFn: async () => {
      const response = await dashboardApi.getPlatformBreakdown();
      return response.data;
    },
  });

  const { data: organizationData, isLoading: organizationLoading } = useQuery({
    queryKey: ['organization-breakdown'],
    queryFn: async () => {
      const response = await dashboardApi.getOrganizationBreakdown();
      return response.data;
    },
  });

  const { data: territoryData, isLoading: territoryLoading } = useQuery({
    queryKey: ['territory-breakdown'],
    queryFn: async () => {
      const response = await dashboardApi.getTerritoryBreakdown();
      return response.data;
    },
  });

  // Currency formatter for tooltips
  const currencyFormatter = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Transform data for Nivo charts
  // Line chart format: { id, data: [{ x, y }] }
  const getRevenueTimelineData = () => {
    if (!stats?.revenueTimeline) return [];
    return [{
      id: 'Revenue',
      data: stats.revenueTimeline.map((item: any) => ({
        x: item.month,
        y: Number(item.revenue) || 0,
      })),
    }];
  };

  // Pie chart format: { id, label, value }
  const getProBreakdownData = () => {
    if (!stats?.proBreakdown) return [];
    return stats.proBreakdown.map((item: any) => ({
      id: item.proType,
      label: item.proType,
      value: Number(item.revenue) || 0,
    }));
  };

  // Bar chart format: { indexKey, ...values }
  const getProBarChartData = () => {
    if (!stats?.proBreakdown) return [];
    return stats.proBreakdown.map((item: any) => ({
      proType: item.proType,
      Revenue: Number(item.revenue) || 0,
      Statements: item.count || 0,
    }));
  };

  const getPlatformPieData = () => {
    if (!platformData?.platforms) return [];
    return platformData.platforms.map((item: any) => ({
      id: item.platform,
      label: item.platform,
      value: Number(item.revenue) || 0,
    }));
  };

  const getPlatformBarData = () => {
    if (!platformData?.platforms) return [];
    return platformData.platforms.map((item: any) => ({
      platform: item.platform,
      Revenue: Number(item.revenue) || 0,
      Items: item.count || 0,
    }));
  };

  const getOrganizationPieData = () => {
    if (!organizationData?.organizations) return [];
    return organizationData.organizations.map((item: any) => ({
      id: item.organization,
      label: item.organization,
      value: Number(item.revenue) || 0,
    }));
  };

  const getOrganizationBarData = () => {
    if (!organizationData?.organizations) return [];
    return organizationData.organizations.map((item: any) => ({
      organization: item.organization,
      Revenue: Number(item.revenue) || 0,
      Statements: item.count || 0,
    }));
  };

  if (isLoading) {
    return <div className="text-center text-text-secondary py-8">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Title className="text-white text-2xl">Platform Analytics</Title>
        <Text className="text-gray-400">Comprehensive overview of platform performance</Text>
      </div>

      {/* KPI Cards Grid */}
      <Grid numItemsSm={2} numItemsMd={3} numItemsLg={5} className="gap-4">
        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="blue"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Total Writers</Text>
              <Metric className="text-white mt-1">{stats?.totalWriters || 0}</Metric>
            </div>
            <div className="text-2xl">👥</div>
          </Flex>
        </Card>

        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="emerald"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Total Statements</Text>
              <Metric className="text-white mt-1">{stats?.totalStatements || 0}</Metric>
            </div>
            <div className="text-2xl">📊</div>
          </Flex>
        </Card>

        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="violet"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Processed</Text>
              <Metric className="text-white mt-1">{stats?.processedStatements || 0}</Metric>
            </div>
            <div className="text-2xl">✅</div>
          </Flex>
        </Card>

        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="amber"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Unique Works</Text>
              <Metric className="text-white mt-1">{stats?.uniqueWorks || 0}</Metric>
            </div>
            <div className="text-2xl">🎵</div>
          </Flex>
        </Card>

        <Card
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0"
          decoration="top"
          decorationColor="cyan"
        >
          <Flex alignItems="start">
            <div>
              <Text className="text-gray-400">Total Revenue</Text>
              <Metric className="text-white mt-1 text-lg">
                ${Number(stats?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Metric>
            </div>
            <div className="text-2xl">💰</div>
          </Flex>
        </Card>
      </Grid>

      {/* Revenue & PRO Charts Row */}
      <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
        {/* Revenue Timeline */}
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="mb-4">
            <Title className="text-white">Revenue Over Time</Title>
            <Text className="text-gray-400">12-month revenue trend</Text>
          </div>
          {getRevenueTimelineData().length > 0 && getRevenueTimelineData()[0]?.data?.length > 0 ? (
            <NivoLineChart
              data={getRevenueTimelineData()}
              height={288}
              enableArea={true}
              colors={['#10b981']}
              valueFormat={currencyFormatter}
            />
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400">
              No revenue data available
            </div>
          )}
        </Card>

        {/* PRO Breakdown Pie */}
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="mb-4">
            <Title className="text-white">Revenue by PRO</Title>
            <Text className="text-gray-400">Distribution across PROs</Text>
          </div>
          {getProBreakdownData().length > 0 ? (
            <NivoPieChart
              data={getProBreakdownData()}
              height={208}
              innerRadius={0.5}
              enableArcLinkLabels={getProBreakdownData().length <= 5}
              valueFormat={currencyFormatter}
            />
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400">
              No PRO data available
            </div>
          )}
        </Card>
      </Grid>

      {/* PRO Statistics Bar Chart */}
      {getProBarChartData().length > 0 && (
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="mb-4">
            <Title className="text-white">PRO Statistics</Title>
            <Text className="text-gray-400">Revenue and statement count by PRO</Text>
          </div>
          <NivoBarChart
            data={getProBarChartData()}
            keys={['Revenue']}
            indexBy="proType"
            height={288}
            colors={['#10b981']}
            valueFormat={currencyFormatter}
          />
        </Card>
      )}

      {/* Platform Breakdown Section */}
      {!platformLoading && platformData?.platforms?.length > 0 && (
        <div className="space-y-6">
          <div>
            <Title className="text-white">Revenue by Platform (DSP)</Title>
            <Text className="text-gray-400">Breakdown by streaming service</Text>
          </div>

          <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
            {/* Platform Pie */}
            <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
              <Title className="text-white mb-4">Platform Distribution</Title>
              <NivoPieChart
                data={getPlatformPieData()}
                height={208}
                innerRadius={0.5}
                enableArcLinkLabels={getPlatformPieData().length <= 6}
                valueFormat={currencyFormatter}
              />
            </Card>

            {/* Platform Bar Chart */}
            <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
              <Title className="text-white mb-4">Platform Revenue</Title>
              <NivoBarChart
                data={getPlatformBarData()}
                keys={['Revenue']}
                indexBy="platform"
                height={208}
                layout="horizontal"
                colors={['#10b981']}
                valueFormat={currencyFormatter}
              />
            </Card>
          </Grid>

          {/* Platform Details Table */}
          <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
            <Flex justifyContent="between" className="mb-4">
              <Title className="text-white">Platform Details</Title>
              <Text className="text-gray-400">
                {platformData.platforms.length} platform{platformData.platforms.length !== 1 ? 's' : ''}
              </Text>
            </Flex>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="text-gray-400">Platform</TableHeaderCell>
                  <TableHeaderCell className="text-gray-400">Service Type</TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-400">Items</TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-400">Gross Revenue</TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-400">Net Revenue</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {platformData.platforms.map((platform: any) => (
                  <TableRow key={platform.platform}>
                    <TableCell className="text-white font-semibold">{platform.platform}</TableCell>
                    <TableCell>
                      <Flex justifyContent="start" className="gap-1 flex-wrap">
                        {platform.offerings?.length > 0 ? (
                          platform.offerings.map((offering: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-white/[0.08] rounded-lg text-xs text-gray-300">
                              {offering}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </Flex>
                    </TableCell>
                    <TableCell className="text-right text-gray-300">{platform.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-emerald-400 font-semibold">
                      ${Number(platform.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-emerald-300">
                      ${Number(platform.netRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFoot>
                <TableRow>
                  <TableFooterCell className="text-white font-bold">TOTAL</TableFooterCell>
                  <TableFooterCell></TableFooterCell>
                  <TableFooterCell className="text-right text-white font-bold">
                    {platformData.totalCount.toLocaleString()}
                  </TableFooterCell>
                  <TableFooterCell className="text-right text-emerald-400 font-bold">
                    ${Number(platformData.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableFooterCell>
                  <TableFooterCell className="text-right text-emerald-300 font-bold">
                    ${Number(platformData.totalNetRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableFooterCell>
                </TableRow>
              </TableFoot>
            </Table>
          </Card>
        </div>
      )}

      {/* Organization Breakdown Section */}
      {!organizationLoading && organizationData?.organizations?.length > 0 && (
        <div className="space-y-6">
          <div>
            <Title className="text-white">Revenue by Organization</Title>
            <Text className="text-gray-400">Breakdown by collecting organization</Text>
          </div>

          <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
            {/* Organization Pie */}
            <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
              <Title className="text-white mb-4">Organization Distribution</Title>
              <NivoPieChart
                data={getOrganizationPieData()}
                height={208}
                innerRadius={0.5}
                enableArcLinkLabels={getOrganizationPieData().length <= 6}
                valueFormat={currencyFormatter}
              />
            </Card>

            {/* Organization Bar Chart */}
            <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
              <Title className="text-white mb-4">Organization Revenue</Title>
              <NivoBarChart
                data={getOrganizationBarData()}
                keys={['Revenue']}
                indexBy="organization"
                height={208}
                colors={['#8b5cf6']}
                valueFormat={currencyFormatter}
              />
            </Card>
          </Grid>

          {/* Organization Details Table */}
          <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
            <Title className="text-white mb-4">Organization Details</Title>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="text-gray-400">Organization</TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-400">Statements</TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-400">Revenue</TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-400">Net</TableHeaderCell>
                  <TableHeaderCell className="text-right text-gray-400">Commission</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {organizationData.organizations.map((org: any) => (
                  <TableRow key={org.organization}>
                    <TableCell className="text-white font-medium">{org.organization}</TableCell>
                    <TableCell className="text-right text-gray-300">{org.count}</TableCell>
                    <TableCell className="text-right text-emerald-400 font-medium">
                      ${Number(org.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-emerald-300">
                      ${Number(org.netRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-blue-400">
                      ${Number(org.commissionAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFoot>
                <TableRow>
                  <TableFooterCell className="text-white font-bold">Total</TableFooterCell>
                  <TableFooterCell className="text-right text-white font-bold">
                    {organizationData.totalCount}
                  </TableFooterCell>
                  <TableFooterCell className="text-right text-emerald-400 font-bold">
                    ${Number(organizationData.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableFooterCell>
                  <TableFooterCell></TableFooterCell>
                  <TableFooterCell></TableFooterCell>
                </TableRow>
              </TableFoot>
            </Table>
          </Card>
        </div>
      )}

      {/* Territory Revenue Heatmap */}
      <div>
        <Title className="text-white mb-2">Revenue by Territory</Title>
        <Text className="text-gray-400 mb-4">Global distribution of earnings</Text>
        <ChartCard
          title="Global Revenue Heatmap"
          chartId="territory-heatmap"
          isExpanded={expandedCharts['territory-heatmap'] || false}
          onToggleExpand={toggleChartExpansion}
        >
          {territoryLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Loading territory data...
            </div>
          ) : territoryData?.territories?.length > 0 ? (
            <TerritoryHeatmap territories={territoryData.territories} />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No territory data available yet
            </div>
          )}
        </ChartCard>
      </div>

      {/* Recent Statements */}
      {stats?.recentStatements?.length > 0 && (
        <Card className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-white/[0.08] ring-0">
          <div className="mb-4">
            <Title className="text-white">Recent Statements</Title>
            <Text className="text-gray-400">Latest processed statements</Text>
          </div>
          <List className="mt-4">
            {stats.recentStatements.map((statement: any) => (
              <ListItem key={statement.id}>
                <Flex justifyContent="start" className="truncate space-x-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    statement.proType === 'BMI' ? 'bg-blue-500/20 text-blue-400' :
                    statement.proType === 'ASCAP' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-violet-500/20 text-violet-400'
                  }`}>
                    {statement.proType}
                  </span>
                  <Text className="text-white truncate">{statement.filename}</Text>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    statement.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-400' :
                    statement.status === 'PROCESSED' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {statement.status}
                  </span>
                </Flex>
                <Text className="text-emerald-400 font-semibold">
                  ${Number(statement.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </ListItem>
            ))}
          </List>
        </Card>
      )}
    </div>
  );
}
