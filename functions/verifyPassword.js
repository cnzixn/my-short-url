// functions/verifyPassword.js
export async function handler(event) {
  const requestId = event.headers['x-nf-request-id'] || 'local-dev';
  console.log(`[${requestId}] 验证管理员密码`);

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const { password } = JSON.parse(event.body);

  if (password === process.env.ADMIN_PASSWORD) {
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } else {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: '无效的管理员密码' })
    };
  }
}