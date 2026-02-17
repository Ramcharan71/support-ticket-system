import { useState, useCallback } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import TicketForm from './components/TicketForm';
import TicketList from './components/TicketList';
import Dashboard from './components/Dashboard';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">Support Tickets</div>
        <div className="navbar-links">
          <NavLink to="/" end>New Ticket</NavLink>
          <NavLink to="/tickets">All Tickets</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </div>
      </nav>

      <main className="container">
        <Routes>
          <Route
            path="/"
            element={<TicketForm onTicketCreated={triggerRefresh} />}
          />
          <Route
            path="/tickets"
            element={<TicketList refreshKey={refreshKey} />}
          />
          <Route
            path="/dashboard"
            element={<Dashboard refreshKey={refreshKey} />}
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
