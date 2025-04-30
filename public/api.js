// public/api.js

const API_BASE = '/.netlify/functions';
let authToken = localStorage.getItem('authToken');

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '请求失败');
  return data;
};

export const api = {
  // 密码验证
  async verifyPassword(password) {
    const response = await fetch(`${API_BASE}/verifyPassword`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` })
      },
      body: JSON.stringify({ password })
    });
    return handleResponse(response);
  },

  // 获取短链列表
  async getShortlinks({ page = 1, limit = 20 } = {}) {
    const response = await fetch(`${API_BASE}/getShortlinks`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` })
      },
      body: JSON.stringify({ page, limit })
    });
    return handleResponse(response);
  },

  // 删除短链
  async deleteShortlink(key, password) {
    const response = await fetch(`${API_BASE}/deleteShortlink`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` })
      },
      body: JSON.stringify({ key, password })
    });
    return handleResponse(response);
  },

  // 保存认证令牌
  setAuthToken(token) {
    authToken = token;
    localStorage.setItem('authToken', token);
  }
};
