const BASE = '/api';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: getHeaders(),
    ...options,
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('请重新登录');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

export const api = {
  dashboard: () => request('/dashboard'),

  exportData: () => request('/export'),

  trends: {
    mood: (days = 30) => request('/trends/mood?days=' + days),
    habitsWeekly: (days = 7) => request('/trends/habits-weekly?days=' + days),
    goals: () => request('/trends/goals'),
    lifewheelCompare: () => request('/trends/lifewheel-compare'),
  },

  goals: {
    list: (params) => {
      const q = new URLSearchParams(params).toString();
      return request('/goals' + (q ? '?' + q : ''));
    },
    create: (data) => request('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request('/goals/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request('/goals/' + id, { method: 'DELETE' }),
  },

  habits: {
    list: () => request('/habits'),
    create: (data) => request('/habits', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request('/habits/' + id, { method: 'PUT', body: JSON.stringify(data) }),
    toggle: (id, date) => request('/habits/' + id + '/toggle', { method: 'POST', body: JSON.stringify({ date }) }),
    delete: (id) => request('/habits/' + id, { method: 'DELETE' }),
  },

  journals: {
    list: (limit = 30) => request('/journals?limit=' + limit),
    get: (date) => request('/journals/' + date),
    create: (data) => request('/journals', { method: 'POST', body: JSON.stringify(data) }),
    update: (date, data) => request('/journals/' + date, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (date) => request('/journals/' + date, { method: 'DELETE' }),
  },

  lifewheel: {
    list: (limit = 12) => request('/lifewheel?limit=' + limit),
    create: (data) => request('/lifewheel', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request('/lifewheel/' + id, { method: 'DELETE' }),
  },
};