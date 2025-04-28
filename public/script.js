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
        data.shortlinks.forEach(link => {
            const row = tableBody.insertRow();

            // row.insertCell(0).textContent = `${window.location.origin}/s/${link.key}`;
            row.insertCell(0).textContent = `${link.key}`;

            row.insertCell(1).textContent = link.url;

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '删除';
            deleteButton.addEventListener('click', () => deleteLink(link.key));
            row.insertCell(2).appendChild(deleteButton);
        });
    } catch (error) {
        console.error('加载短链列表失败:', error);
    }
}

// 删除短链
async function deleteLink(key) {
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
                location.reload();
            } else {
                alert(data.error || '删除失败');
            }
        } catch (error) {
            console.error('删除短链失败:', error);
        }
    }
}