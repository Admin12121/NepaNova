"use client";

import React, { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  DollarSign,
  Users,
  ShoppingCart,
  CreditCard,
  Calendar as CalendarIcon,
  Download,
  TrendingUp,
} from "lucide-react";
import {
  format,
  subDays,
  subMonths,
  subYears,
  startOfYear,
  startOfMonth,
} from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useAuthUser } from "@/hooks/use-auth-user";
import {
  useGetDashboardStatsQuery,
  useGetSalesChartQuery,
  useGetTopProductsQuery,
  useGetRecentOrdersQuery,
  useGetVisitorStatsQuery,
  useGetCategoryPerformanceQuery,
  useGetRecentBookingsQuery,
} from "@/lib/store/Service/api";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending:
    "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400",
  verified: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  proceed:
    "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400",
  packed:
    "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400",
  delivered:
    "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  successful:
    "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
  unpaid: "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400",
  confirmed: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress:
    "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed:
    "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400",
};

// Chart Configurations
const revenueChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const statusChartConfig = {
  count: {
    label: "Orders",
  },
  pending: {
    label: "Pending",
    color: "hsl(var(--chart-1))",
  },
  confirmed: {
    label: "Confirmed",
    color: "hsl(var(--chart-2))",
  },
  delivered: {
    label: "Delivered",
    color: "hsl(var(--chart-3))",
  },
  cancelled: {
    label: "Cancelled",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

const visitorsChartConfig = {
  views: {
    label: "Page Views",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const categoryChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { accessToken: token } = useAuthUser();
  const skip = !token;

  const [dateRange, setDateRange] = useState("monthly");

  const dateParams = React.useMemo(() => {
    const today = new Date();
    let start = subDays(today, 30); // Default

    switch (dateRange) {
      case "monthly":
        start = startOfMonth(today);
        break;
      case "6months":
        start = subMonths(today, 6);
        break;
      case "yearly":
        start = startOfYear(today);
        break;
      case "all":
        start = new Date("2000-01-01");
        break;
    }

    return {
      start_date: format(start, "yyyy-MM-dd"),
      end_date: format(today, "yyyy-MM-dd"),
    };
  }, [dateRange]);

  // Using the dateParams in all queries that support it
  const { data: stats, isLoading: statsLoading } = useGetDashboardStatsQuery(
    { token, ...dateParams },
    { skip },
  );
  const { data: salesChart, isLoading: salesChartLoading } =
    useGetSalesChartQuery({ token, ...dateParams }, { skip });
  const { data: topProducts, isLoading: topProductsLoading } =
    useGetTopProductsQuery({ token, limit: 5 }, { skip }); // Top products usually all time or recent, keep as is unless requested
  const { data: recentOrders, isLoading: recentOrdersLoading } =
    useGetRecentOrdersQuery({ token, limit: 7 }, { skip });
  const { data: recentBookings, isLoading: recentBookingsLoading } =
    useGetRecentBookingsQuery({ token, limit: 5 }, { skip });
  const { data: visitorStats, isLoading: visitorStatsLoading } =
    useGetVisitorStatsQuery({ token }, { skip });
  const { data: categoryPerf, isLoading: categoryPerfLoading } =
    useGetCategoryPerformanceQuery({ token }, { skip });

  // Prepare chart data
  const statusData =
    salesChart?.by_status?.map((item: any, index: number) => ({
      ...item,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    })) || [];

  const totalRevenue = React.useMemo(() => {
    return (
      salesChart?.daily?.reduce(
        (acc: any, curr: any) => acc + curr.revenue,
        0,
      ) || 0
    );
  }, [salesChart?.daily]);

  return (
    <div className="flex flex-col gap-6 p-6 space-y-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            Overview of your store&apos;s performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <CalendarIcon className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={`Rs ${stats?.total_revenue?.toLocaleString() ?? 0}`}
          description={`${stats?.revenue_change !== undefined ? (stats.revenue_change >= 0 ? "+" : "") + stats.revenue_change.toFixed(1) : "0"}% from last period`}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatsCard
          title="Monthly Revenue"
          value={`Rs ${stats?.monthly_revenue?.toLocaleString() ?? 0}`}
          description="Revenue this month"
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatsCard
          title="Total Orders"
          value={stats?.total_orders.toString() ?? "0"}
          description={`${stats?.pending_orders ?? 0} pending orders`}
          icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
        <StatsCard
          title="Active Users"
          value={stats?.active_users.toString() ?? "0"}
          description={`${stats?.new_users_month ?? 0} new this month`}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          loading={statsLoading}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports" disabled>
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Revenue Chart */}
            <Card className="col-span-4 lg:col-span-5">
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>
                  Revenue for{" "}
                  {dateRange === "all"
                    ? "All Time"
                    : dateRange === "monthly"
                      ? "this month"
                      : dateRange === "yearly"
                        ? "this year"
                        : "last 6 months"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-0">
                {salesChartLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ChartContainer
                    config={revenueChartConfig}
                    className="aspect-auto h-[350px] w-full"
                  >
                    <AreaChart
                      data={salesChart?.daily || []}
                      margin={{
                        left: 12,
                        right: 12,
                      }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) =>
                          format(new Date(value), "MMM dd")
                        }
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => `Rs${value}`}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Area
                        dataKey="revenue"
                        type="natural"
                        fill="var(--color-revenue)"
                        fillOpacity={0.4}
                        stroke="var(--color-revenue)"
                        stackId="a"
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Sales by Status Pie Chart */}
            <Card className="col-span-4 lg:col-span-2 flex flex-col">
              <CardHeader className="items-center pb-0">
                <CardTitle>Order Status</CardTitle>
                <CardDescription>Distribution of active orders</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-0">
                {salesChartLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <ChartContainer
                    config={statusChartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={statusData}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={60}
                        strokeWidth={5}
                      >
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-foreground text-3xl font-bold"
                                  >
                                    {stats?.total_orders.toLocaleString()}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 24}
                                    className="fill-muted-foreground"
                                  >
                                    Orders
                                  </tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 font-medium leading-none">
                  Most orders are{" "}
                  {stats?.pending_orders > 0 ? "Pending" : "Completed"}{" "}
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="leading-none text-muted-foreground">
                  Showing total orders for current period
                </div>
              </CardFooter>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Recent Orders */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  Latest transactions from store
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentOrdersLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Order</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders?.orders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            No orders found
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentOrders?.orders.map((order: any) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium text-xs">
                              #{order.id}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {order.customer}
                                </span>
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {order.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  STATUS_COLORS[order.status] || "bg-gray-100"
                                }
                              >
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              Rs {order.total.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best sellers by quantity sold</CardDescription>
              </CardHeader>
              <CardContent>
                {topProductsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-4 w-[100px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {topProducts?.products.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center">
                        No sales data yet
                      </p>
                    ) : (
                      topProducts?.products.map((product: any) => (
                        <div key={product.id} className="flex items-center">
                          <Avatar className="h-9 w-9 rounded-md border">
                            <AvatarImage
                              src={product.image}
                              alt={product.name || "Product"}
                            />
                            <AvatarFallback className="rounded-md">
                              {(product.name || "?")
                                .substring(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {product.name || "Unknown Product"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {product.quantity_sold} sold
                            </p>
                          </div>
                          <div className="ml-auto font-medium text-sm">
                            Rs {product.revenue.toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>
                  Latest appointments from customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentBookingsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Preferred Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentBookings?.bookings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            No bookings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentBookings?.bookings.map((booking: any) => (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">
                              #{booking.id}
                            </TableCell>
                            <TableCell>{booking.name}</TableCell>
                            <TableCell className="capitalize">
                              {booking.type}
                            </TableCell>
                            <TableCell>
                              {booking.date}
                              <span className="text-xs text-muted-foreground ml-2">
                                {booking.time}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  STATUS_COLORS[booking.status] || "bg-gray-100"
                                }
                              >
                                {booking.status?.replace("_", " ")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Category Performance</CardTitle>
                <CardDescription>Revenue by product category</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryPerfLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : (
                  <ChartContainer
                    config={categoryChartConfig}
                    className="min-h-[200px] w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={categoryPerf?.categories || []}
                      layout="vertical"
                      margin={{ left: 0 }}
                    >
                      <CartesianGrid horizontal={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={100}
                      />
                      <XAxis type="number" hide />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent />}
                      />
                      <Bar
                        dataKey="revenue"
                        layout="vertical"
                        fill="var(--color-revenue)"
                        radius={4}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Visitor Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Visitors</CardTitle>
                <CardDescription>Site traffic over last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {visitorStatsLoading ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : (
                  <ChartContainer
                    config={visitorsChartConfig}
                    className="min-h-[200px] w-full"
                  >
                    <LineChart
                      accessibilityLayer
                      data={visitorStats?.daily || []}
                      margin={{
                        left: 12,
                        right: 12,
                      }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) =>
                          format(new Date(value), "EEE")
                        }
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent />}
                      />
                      <Line
                        dataKey="views"
                        type="natural"
                        stroke="var(--color-views)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatsCard({
  title,
  value,
  description,
  icon,
  loading,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
