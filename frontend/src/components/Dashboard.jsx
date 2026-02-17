import { useState, useEffect } from 'react';
import { getStats } from '../api/tickets';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function Dashboard({ refreshKey }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await getStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [refreshKey]);

  if (loading) return <div className="loading-state">Loading dashboard...</div>;
  if (!stats) return <div className="empty-state">Failed to load statistics.</div>;

  const priorityData = Object.entries(stats.priority_breakdown).map(
    ([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })
  );

  const categoryData = Object.entries(stats.category_breakdown).map(
    ([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })
  );

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>

      {/* Summary Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-value">{stats.total_tickets}</div>
          <div className="stat-label">Total Tickets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.open_tickets}</div>
          <div className="stat-label">Open Tickets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avg_tickets_per_day}</div>
          <div className="stat-label">Avg / Day</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="chart-container">
          <h3>Priority Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {priorityData.map((entry, idx) => (
                  <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#4f8ef7">
                {categoryData.map((entry, idx) => (
                  <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
