// admin.js

import { api } from './api.js';

// DOM元素缓存
const elements = {
  passwordSection: document.getElementById('password-section'),
  shortlinksSection: document.getElementById('shortlinks-section'),
  adminPassword: document.getElementById('admin-password'),
  verifyButton: document.getElementById('verify-password'),
  passwordError: document.getElementById('password-error'),
  shortlinksTable: document.getElementById('shortlinks-table')
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadShortlinks(1);
  bindEvents();
  checkAuth();
});

// 事件绑定
function bindEvents() {
  elements.verifyButton.addEventListener('click', handleVerify);
  elements.adminPassword.addEventListener('keypress', e => {
    if (e.key === 'Enter') handleVerify();
  });
}

// 密码验证处理
async function handleVerify() {
  const password = elements.adminPassword.value.trim();
  
  if (!password) {
    showError('请输入密码');
    return;
  }

  try {
    elements.passwordError.style.display = 'none';
    elements.verifyButton.disabled = true;
    
    const result = await api.verifyPassword(password);
    api.setAuthToken(result.token); // 假设后端返回认证令牌
    
    elements.passwordSection.style.display = 'none';
    elements.shortlinksSection.style.display = 'block';
    await loadShortlinks(1);
  } catch (error) {
    showError(error.message);
  } finally {
    elements.verifyButton.disabled = false;
  }
}

// 加载短链列表
async function loadShortlinks(page = 1) {
  try {
    showLoading(true);
    const data = await api.getShortlinks({ page, limit: 20 });
    
    updateTable(data.shortlinks);
    setupPagination(data.total, page);
  } catch (error) {
    showError(`加载失败: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

// 表格更新
function updateTable(links) {
  const tbody = elements.shortlinksTable.querySelector('tbody');
  tbody.innerHTML = '';

  links.forEach(link => {
    const row = document.createElement('tr');
    
    // 操作列
    const actionCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '删除';
    deleteBtn.addEventListener('click', () => confirmDelete(link.key));
    actionCell.appendChild(deleteBtn);

    // 数据列
    row.insertCell().textContent = link.clicks.toLocaleString();
    row.insertCell().innerHTML = `<a href="${window.location.origin}/s/${link.key}" target="_blank">${link.key}</a>`;
    row.insertCell().textContent = link.url;

    tbody.appendChild(row);
  });
}

// 确认删除
async function confirmDelete(key) {
  const confirmed = confirm('确定要删除这个短链吗？');
  if (!confirmed) return;

  try {
    const password = prompt('请输入管理员密码确认删除:');
    if (!password) return;

    await api.deleteShortlink(key, password);
    loadShortlinks(1); // 刷新列表
  } catch (error) {
    showError(error.message);
  }
}

// 分页设置
function setupPagination(total, currentPage) {
  const pagination = document.createElement('div');
  pagination.className = 'pagination';
  
  const totalPages = Math.ceil(total / 20);
  
  pagination.innerHTML = `
    <button ${currentPage === 1 ? 'disabled' : ''} onclick="loadShortlinks(${currentPage - 1})">上一页</button>
    <span>第 ${currentPage} 页 / 共 ${totalPages} 页</span>
    <button ${currentPage === totalPages ? 'disabled' : ''} onclick="loadShortlinks(${currentPage + 1})">下一页</button>
  `;

  elements.shortlinksSection.prepend(pagination);
}

// 辅助函数
function showError(message) {
  elements.passwordError.textContent = message;
  elements.passwordError.style.display = 'block';
  setTimeout(() => elements.passwordError.style.display = 'none', 3000);
}

function showLoading(isLoading) {
  elements.verifyButton.textContent = isLoading ? '加载中...' : '验证密码';
  elements.verifyButton.classList.toggle('loading', isLoading);
}

function checkAuth() {
  const savedPassword = localStorage.getItem('adminPassword');
  if (savedPassword) {
    elements.adminPassword.value = savedPassword;
    handleVerify();
  }
}
