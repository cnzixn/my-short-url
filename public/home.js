
// 新增文件上传处理逻辑
document.getElementById('fileUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    document.getElementById('batchInput').value = text.replace(/\r/g, '');
  } catch (err) {
    document.getElementById('result').innerHTML = 
      `<div style="color: red;">文件读取失败：${err.message}</div>`;
  }
});

document.getElementById('generateBatch').addEventListener('click', async () => {
  const generateBtn = document.getElementById('generateBatch');
  const loadingDiv = document.getElementById('loading');
  const resultDiv = document.getElementById('result');
  const tableBody = document.querySelector('#shortlinks-table tbody');

  try {
    // 禁用按钮并显示加载状态
    generateBtn.disabled = true;
    loadingDiv.style.display = 'block';
    resultDiv.innerHTML = '';
    tableBody.innerHTML = '';

    const lines = document.getElementById('batchInput').value.trim().split('\n');
    if (!lines.length) return;

    const batch = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      return { url: parts[0], key: parts[1] || '' };
    });

    const res = await fetch('/.netlify/functions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch })
    });

    if (!res.ok) throw new Error(`状态码: ${res.status}`);
    const data = await res.json();

    // 更新表格
    data.results.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <a href="${window.location.origin}/s/${row.key}" 
             target="_blank"
             title="完整路径：${window.location.origin}/s/${row.key}">
            ${row.key}
          </a>
        </td>
        <td>${row.url}</td>
      `;
      tableBody.appendChild(tr);
    });

    resultDiv.innerHTML = `<div style="color: green;">✅ 成功生成 ${data.results.length} 个短链</div>`;
  } catch (err) {
    resultDiv.innerHTML = `<div style="color: red;">❌ 生成失败：${err.message}</div>`;
  } finally {
    // 恢复界面状态
    generateBtn.disabled = false;
    loadingDiv.style.display = 'none';
  }
});

document.getElementById('exportCSV').addEventListener('click', () => {
  const rows = [['短链', '原链']];
  document.querySelectorAll('#shortlinks-table tbody tr').forEach(tr => {
    const cols = tr.querySelectorAll('td');
    rows.push([
      `${window.location.origin}/s/${cols[0].innerText}`,
      cols[1].innerText
    ]);
  });

  const txtContent = [
    rows[0].join('    '),
    ...rows.slice(1).map(row => row.join('    '))
  ].join('\n');

  const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'shortlinks.txt';
  link.click();
});
