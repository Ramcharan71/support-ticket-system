import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const getTickets = (params = {}) =>
  api.get('/tickets/', { params }).then((res) => res.data);

export const createTicket = (data) =>
  api.post('/tickets/', data).then((res) => res.data);

export const updateTicket = (id, data) =>
  api.patch(`/tickets/${id}/`, data).then((res) => res.data);

export const classifyText = (description) =>
  api.post('/tickets/classify/', { description }).then((res) => res.data);

export const getStats = () =>
  api.get('/tickets/stats/').then((res) => res.data);
