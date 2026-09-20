import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const createEntry = async (text) => {
  const response = await api.post('/entries', { text });
  return response.data;
};

export const getEntries = async () => {
  const response = await api.get('/entries');
  return response.data;
};

export const getEntry = async (id) => {
  const response = await api.get(`/entries/${id}`);
  return response.data;
};

export default api;
