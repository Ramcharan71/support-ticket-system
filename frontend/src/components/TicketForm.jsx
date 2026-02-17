import { useState, useEffect } from 'react';
import { createTicket } from '../api/tickets';
import { useClassify } from '../hooks/useClassify';

const CATEGORIES = ['billing', 'technical', 'account', 'general'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const PRIORITY_COLORS = {
  low: '#28a745',
  medium: '#ffc107',
  high: '#fd7e14',
  critical: '#dc3545',
};

function TicketForm({ onTicketCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [createdTicket, setCreatedTicket] = useState(null);
  const [userTouchedCategory, setUserTouchedCategory] = useState(false);
  const [userTouchedPriority, setUserTouchedPriority] = useState(false);

  const { classify, isClassifying, suggestion, error: classifyError, resetSuggestion } = useClassify();

  // Apply AI suggestions when they arrive (unless user manually changed)
  useEffect(() => {
    if (suggestion) {
      if (!userTouchedCategory) {
        setCategory(suggestion.suggested_category);
      }
      if (!userTouchedPriority) {
        setPriority(suggestion.suggested_priority);
      }
    }
  }, [suggestion, userTouchedCategory, userTouchedPriority]);

  const handleDescriptionBlur = () => {
    classify(description);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const ticket = await createTicket({ title, description, category, priority });
      setSuccessMsg(`Ticket #${ticket.id} created successfully!`);
      setCreatedTicket(ticket);
      setTitle('');
      setDescription('');
      setCategory('general');
      setPriority('medium');
      setUserTouchedCategory(false);
      setUserTouchedPriority(false);
      resetSuggestion();
      if (onTicketCreated) onTicketCreated();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const messages = Object.entries(data)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join(' | ');
        setErrorMsg(messages);
      } else {
        setErrorMsg('Failed to create ticket. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ticket-form-container">
      <h2>Submit a Support Ticket</h2>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

      <form onSubmit={handleSubmit} className="ticket-form">
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            placeholder="Brief summary of your issue"
          />
          <span className="char-count">{title.length}/200</span>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            required
            rows={5}
            placeholder="Describe your issue in detail..."
          />
          {isClassifying && (
            <div className="classify-loading">
              <span className="spinner" /> AI is analyzing your description...
            </div>
          )}
          {classifyError && (
            <div className="classify-error">{classifyError}</div>
          )}
          {suggestion && !isClassifying && (
            <div className="classify-success">
              AI suggested: <strong>{suggestion.suggested_category}</strong> / <strong>{suggestion.suggested_priority}</strong>
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">
              Category
              {suggestion && !userTouchedCategory && <span className="ai-badge">AI suggested</span>}
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setUserTouchedCategory(true);
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="priority">
              Priority
              {suggestion && !userTouchedPriority && <span className="ai-badge">AI suggested</span>}
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setUserTouchedPriority(true);
              }}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>

      {createdTicket && (
        <div className="created-ticket">
          <h3>Recently Created Ticket</h3>
          <div className="ticket-card">
            <div className="ticket-card-header">
              <h3 className="ticket-title">{createdTicket.title}</h3>
              <span
                className="priority-badge"
                style={{ backgroundColor: PRIORITY_COLORS[createdTicket.priority] }}
              >
                {createdTicket.priority.toUpperCase()}
              </span>
            </div>
            <p className="ticket-description">{createdTicket.description}</p>
            <div className="ticket-card-footer">
              <span className="category-badge">{createdTicket.category}</span>
              <span className={`status-badge status-${createdTicket.status}`}>
                {createdTicket.status === 'in_progress' ? 'In Progress' : createdTicket.status.charAt(0).toUpperCase() + createdTicket.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketForm;
