import { useState, useEffect, useCallback, useRef } from 'react';
import { getTickets, updateTicket } from '../api/tickets';

const CATEGORIES = ['', 'billing', 'technical', 'account', 'general'];
const PRIORITIES = ['', 'low', 'medium', 'high', 'critical'];
const STATUSES = ['', 'open', 'in_progress', 'resolved', 'closed'];

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const PRIORITY_COLORS = {
  low: '#28a745',
  medium: '#ffc107',
  high: '#fd7e14',
  critical: '#dc3545',
};

function TicketList({ refreshKey }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    priority: '',
    status: '',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [editingId, setEditingId] = useState(null);
  const searchTimer = useRef(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.priority) params.priority = filters.priority;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const data = await getTickets(params);
      setTickets(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets, refreshKey]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearchChange = (value) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: value }));
    }, 400);
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const updated = await updateTicket(ticketId, { status: newStatus });
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? updated : t))
      );
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update ticket:', err);
    }
  };

  const truncate = (text, maxLen = 120) =>
    text.length > maxLen ? text.substring(0, maxLen) + '...' : text;

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="ticket-list-container">
      <h2>All Tickets</h2>

      {/* Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search tickets..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="search-input"
        />
        <select
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.filter(Boolean).map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
        >
          <option value="">All Priorities</option>
          {PRIORITIES.filter(Boolean).map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Ticket Cards */}
      {loading ? (
        <div className="loading-state">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">No tickets found.</div>
      ) : (
        <div className="ticket-cards">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="ticket-card">
              <div className="ticket-card-header">
                <h3 className="ticket-title">{ticket.title}</h3>
                <span
                  className="priority-badge"
                  style={{ backgroundColor: PRIORITY_COLORS[ticket.priority] }}
                >
                  {ticket.priority.toUpperCase()}
                </span>
              </div>
              <p className="ticket-description">{truncate(ticket.description)}</p>
              <div className="ticket-card-footer">
                <span className="category-badge">{ticket.category}</span>

                {editingId === ticket.id ? (
                  <select
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    autoFocus
                    className="status-select"
                  >
                    {STATUSES.filter(Boolean).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`status-badge status-${ticket.status}`}
                    onClick={() => setEditingId(ticket.id)}
                    title="Click to change status"
                  >
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </span>
                )}

                <span className="ticket-date">{formatDate(ticket.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TicketList;
