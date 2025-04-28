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
            row.insertCell(0).appendChild(deleteButton);

            row.insertCell(1).textContent = `${window.location.origin}/${link.key}`;
            // row.insertCell(0).textContent = `${link.key}`;

            row.insertCell(2).textContent = link.url;

            row.insertCell(3).textContent = link.clicks;

        });
    } catch (error) {
        console.error('加载短链列表失败:', error);
    }
}

// 删除短链
async function deleteLink(key) {
    const storedPassword = localStorage.getItem('adminPassword');
    if (storedPassword) {
        try {
            const response = await fetch('/.netlify/functions/deleteShortlink', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: storedPassword, key })
            });

            const data = await response.json();
            if (data.success) {
                alert('短链接已删除');
                // 从 DOM 中移除对应的行
                const table = document.getElementById('shortlinks-table');
                const rows = table.getElementsByTagName('tr');
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const cells = row.getElementsByTagName('td');
                    if (cells.length > 1 && cells[1].textContent.includes(key)) {
                        table.deleteRow(i);
                        break;
                    }
                }
            } else {
                alert(data.error || '删除失败');
            }
        } catch (error) {
            console.error('删除短链失败:', error);
        }
    } else {
        const password = prompt("请输入管理员密码以确认删除:");
        if (password) {
            try {
                const response = await fetch('/.netlify/functions/deleteShortlink', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password, key })
                });

                const data = await response.json();
                if (data.success) {
                    alert('短链接已删除');
                    // 从 DOM 中移除对应的行
                    const table = document.getElementById('shortlinks-table');
                    const rows = table.getElementsByTagName('tr');
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        const cells = row.getElementsByTagName('td');
                        if (cells.length > 1 && cells[1].textContent.includes(key)) {
                            table.deleteRow(i);
                            break;
                        }
                    }
                } else {
                    alert(data.error || '删除失败');
                }
            } catch (error) {
                console.error('删除短链失败:', error);
            }
        }
    }
}
