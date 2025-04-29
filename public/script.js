// 尝试从 localStorage 中获取密码
const storedPassword = localStorage.getItem('adminPassword');
if (storedPassword) {
    document.getElementById('admin-password').value = storedPassword;
}

// 管理员密码验证
document.getElementById('verify-password').addEventListener('click', async () => {
    const password = document.getElementById('admin-password').value;

    if (!password) {
        alert('请输入密码');
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/verifyPassword', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await response.json();
        if (data.success) {
            // 验证成功后，将密码存储到 localStorage
            localStorage.setItem('adminPassword', password);
            document.getElementById('password-section').style.display = 'none';
            document.getElementById('shortlinks-section').style.display = 'block';
            loadShortlinks();
        } else {
            document.getElementById('password-error').style.display = 'block';
        }
    } catch (error) {
        console.error('密码验证失败:', error);
        alert('密码验证失败，请稍后重试');
    }
});

// 加载短链列表
async function loadShortlinks() {
    try {
        const response = await fetch('/.netlify/functions/getShortlinks');
        const data = await response.json();

        const tableBody = document.getElementById('shortlinks-table').getElementsByTagName('tbody')[0];
        // 先清空表格内容
        tableBody.innerHTML = '';
        data.shortlinks.forEach(link => {
            const row = tableBody.insertRow();

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '删除';
            deleteButton.addEventListener('click', () => deleteLink(link.key));

            row.insertCell(0).appendChild(deleteButton); // 索引 0：删除按钮
            row.insertCell(1).textContent = link.clicks.toString(); // 索引 1：点击次数
            row.insertCell(2).textContent = `${window.location.origin}/s/${link.key}`; // 索引 2：短链
            row.insertCell(3).textContent = link.url; // 索引 3：原始 URL

        });
    } catch (error) {
        console.error('加载短链列表失败:', error);
    }
}

async function deleteLink(key) {
    const promptForPassword = () => {
        const pwd = prompt("请输入管理员密码以确认删除:");
        if (pwd) localStorage.setItem('adminPassword', pwd);
        return pwd;
    };

    const removeRowByKey = (key) => {
        const table = document.getElementById('shortlinks-table');
        const rows = table.getElementsByTagName('tr');
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.getElementsByTagName('td');
            if (cells.length > 1 && cells[1].textContent.includes(key)) {
                table.deleteRow(i);
                return i; // 返回已删除行的位置
            }
        }
        return -1;
    };

    const restoreRow = (key, index, rowHTML) => {
        const table = document.getElementById('shortlinks-table');
        const newRow = table.insertRow(index);
        newRow.outerHTML = rowHTML;
    };

    let password = localStorage.getItem('adminPassword') || promptForPassword();
    if (!password) return;

    // 先移除行以提升响应感
    const table = document.getElementById('shortlinks-table');
    const rows = table.getElementsByTagName('tr');
    let removedRowIndex = -1;
    let removedRowHTML = '';

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        if (cells.length > 1 && cells[1].textContent.includes(key)) {
            removedRowIndex = i;
            removedRowHTML = row.outerHTML;
            table.deleteRow(i);
            break;
        }
    }

    try {
        const response = await fetch('/.netlify/functions/deleteShortlink', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, key })
        });

        const data = await response.json();
        if (data.success) {
            alert('短链接已删除');
        } else {
            alert(data.error || '删除失败');
            if (removedRowIndex >= 0) restoreRow(key, removedRowIndex, removedRowHTML);
        }
    } catch (error) {
        console.error('删除短链失败:', error);
        alert('网络异常，删除失败');
        if (removedRowIndex >= 0) restoreRow(key, removedRowIndex, removedRowHTML);
    }
}

