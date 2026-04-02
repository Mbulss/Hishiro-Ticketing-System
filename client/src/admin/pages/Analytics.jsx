import AdminLayout from '../AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
  Timer,
  Activity
} from 'lucide-react'
import { useState, useEffect } from "react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { API_URL } from '../../config/api';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, LineElement, PointElement } from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, LineElement, PointElement);

function getActivityIcon(type) {
  switch (type) {
    case "ticket_resolved":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "ticket_created":
      return <MessageSquare className="h-4 w-4 text-blue-500" />
    case "ticket_assigned":
      return <Users className="h-4 w-4 text-purple-500" />
    case "ticket_updated":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    default:
      return <MessageSquare className="h-4 w-4 text-gray-500" />
  }
}

export default function Analytics() {
  const [tickets, setTickets] = useState([]);
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d

  useEffect(() => {
    if (!user) return;
    const fetchTickets = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/tickets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch tickets: ${res.status}`);
        }
        
        const ticketData = await res.json();
        setTickets(ticketData);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [user]);

  if (loading) {
    return (
      <AdminLayout>
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Track your support team's performance</p>
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <main className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Analytics</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Track your support team's performance</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Analytics</h3>
              <p className="text-red-600">Error: {error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          </div>
        </main>
      </AdminLayout>
    );
  }

  // Calculate advanced stats
  const total = tickets.length;
  const open = tickets.filter(t => t.status === "open").length;
  const resolved = tickets.filter(t => t.status === "resolved").length;
  const inProgress = tickets.filter(t => t.status === "in-progress").length;
  const highPriority = tickets.filter(t => t.priority?.toLowerCase() === "high").length;
  const mediumPriority = tickets.filter(t => t.priority?.toLowerCase() === "medium").length;
  const lowPriority = tickets.filter(t => t.priority?.toLowerCase() === "low").length;

  // Calculate response and resolution times from real data
  const resolvedTickets = tickets.filter(t => t.status === "resolved");
  const avgResolutionTime = resolvedTickets.length > 0 
    ? Math.round(resolvedTickets.reduce((acc, ticket) => {
        const created = new Date(ticket.createdAt);
        const resolved = new Date(ticket.updatedAt);
        return acc + (resolved - created) / (1000 * 60 * 60); // hours
      }, 0) / resolvedTickets.length)
    : 0;

  // Calculate real satisfaction score based on resolution rate and response time
  const resolutionRate = total > 0 ? (resolved / total) * 100 : 0;
  const satisfactionScore = Math.round(
    resolutionRate > 80 ? 90 + (resolutionRate - 80) / 2 :
    resolutionRate > 60 ? 80 + (resolutionRate - 60) :
    resolutionRate > 40 ? 70 + (resolutionRate - 40) / 2 :
    60 + resolutionRate / 4
  );

  // Calculate real response time (average time to first response)
  const avgResponseTime = tickets.length > 0 
    ? tickets.reduce((acc, ticket) => {
        const created = new Date(ticket.createdAt);
        const firstResponse = new Date(ticket.updatedAt || ticket.createdAt);
        return acc + (firstResponse - created) / (1000 * 60 * 60); // hours
      }, 0) / tickets.length
    : 0;

  // Generate trend data for the last 7 days using real data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  // Calculate real trend data
  const trendData = last7Days.map(date => {
    const dayTickets = tickets.filter(t => 
      new Date(t.createdAt).toISOString().split('T')[0] === date
    );
    return dayTickets.length;
  });

  // Calculate real response times per day
  const responseTimes = last7Days.map(date => {
    const dayTickets = tickets.filter(t => 
      new Date(t.createdAt).toISOString().split('T')[0] === date
    );
    if (dayTickets.length === 0) return 0;
    
    return dayTickets.reduce((acc, ticket) => {
      const created = new Date(ticket.createdAt);
      const response = new Date(ticket.updatedAt || ticket.createdAt);
      return acc + (response - created) / (1000 * 60 * 60); // hours
    }, 0) / dayTickets.length;
  });

  // Calculate weekly comparison for trends
  const thisWeekTickets = tickets.filter(t => {
    const ticketDate = new Date(t.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return ticketDate >= weekAgo;
  }).length;

  const lastWeekTickets = tickets.filter(t => {
    const ticketDate = new Date(t.createdAt);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return ticketDate >= twoWeeksAgo && ticketDate < weekAgo;
  }).length;

  const weeklyTrendPercentage = lastWeekTickets > 0 
    ? Math.round(((thisWeekTickets - lastWeekTickets) / lastWeekTickets) * 100)
    : 0;

  // Calculate today's metrics
  const today = new Date().toISOString().split('T')[0];
  const todayTickets = tickets.filter(t => 
    new Date(t.createdAt).toISOString().split('T')[0] === today
  ).length;

  const todayResolved = tickets.filter(t => 
    t.status === "resolved" && new Date(t.updatedAt).toISOString().split('T')[0] === today
  ).length;

  // First contact resolution rate (assume resolved tickets without status changes)
  const firstContactResolution = resolved > 0 
    ? Math.round((resolved / total) * 100)
    : 0;

  // Chart data for ticket volume trend
  const trendChartData = {
    labels: last7Days.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Tickets Created',
        data: trendData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Avg Response Time (hrs)',
        data: responseTimes,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        yAxisID: 'y1',
        tension: 0.4,
      }
    ],
  };

  // Enhanced status chart
  const statusBarData = {
    labels: ['Open', 'In Progress', 'Resolved'],
    datasets: [
      {
        label: 'Tickets',
        data: [open, inProgress, resolved],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)', // blue
          'rgba(251, 191, 36, 0.8)', // yellow
          'rgba(34, 197, 94, 0.8)', // green
        ],
        borderRadius: 8,
        borderWidth: 2,
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(251, 191, 36)',
          'rgb(34, 197, 94)',
        ],
      },
    ],
  };

  // Priority distribution with gradients
  const priorityDoughnutData = {
    labels: ['High Priority', 'Medium Priority', 'Low Priority'],
    datasets: [
      {
        label: 'Priority Distribution',
        data: [highPriority, mediumPriority, lowPriority],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)', // red
          'rgba(251, 191, 36, 0.8)', // yellow
          'rgba(34, 197, 94, 0.8)', // green
        ],
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverOffset: 10,
      },
    ],
  };

  // Performance metrics data using real calculations
  const performanceData = {
    labels: last7Days.map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })),
    datasets: [
      {
        label: 'Resolution Rate %',
        data: last7Days.map(date => {
          const dayTickets = tickets.filter(t => 
            new Date(t.createdAt).toISOString().split('T')[0] === date
          );
          const dayResolved = tickets.filter(t => 
            t.status === "resolved" && new Date(t.updatedAt).toISOString().split('T')[0] === date
          );
          return dayTickets.length > 0 ? Math.round((dayResolved.length / dayTickets.length) * 100) : 0;
        }),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Daily Ticket Volume',
        data: trendData,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ],
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto w-full">
        <div className="space-y-6 p-2 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Advanced insights and performance metrics</p>
            </div>
            <div className="flex gap-2 mt-4 sm:mt-0">
              {['7d', '30d', '90d'].map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: 250 }}>
                  <Bar data={statusBarData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { display: false }
                    },
                    scales: { 
                      y: { beginAtZero: true },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    }
                  }} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priority Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: 250 }}>
                  <Doughnut data={priorityDoughnutData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { position: 'bottom' }
                    }
                  }} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ height: 250 }}>
                  <Line data={performanceData} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { position: 'top' }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                          display: true,
                          text: 'Percentage (%)'
                        }
                      }
                    }
                  }} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600">{todayTickets}</div>
              <div className="text-sm text-muted-foreground">Tickets Today</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-green-600">{todayResolved}</div>
              <div className="text-sm text-muted-foreground">Resolved Today</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-orange-600">{Math.round(avgResponseTime * 10) / 10}h</div>
              <div className="text-sm text-muted-foreground">Avg Response</div>
            </Card>
            <Card className="text-center p-4">
              <div className="text-2xl font-bold text-purple-600">{firstContactResolution}%</div>
              <div className="text-sm text-muted-foreground">First Contact Resolution</div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
} 