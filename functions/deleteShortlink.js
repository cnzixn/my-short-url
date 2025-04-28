// functions/deleteShortlink.js
import { connectToDatabase } from '../utils/db';

export async function handler(event) {
  const requestId = event.headers['x-nf-request-id'] || 'local-dev';
  console.log(`[${requestId}] 删除短链接`);

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const { password, key } = JSON.parse(event.body);

  if (password !== process.env.ADMIN_PASSWORD) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: '无效的管理员密码' })
    };
  }

  if (!key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '缺少短链接标识' })
    };
  }

  let client;
  try {
    const { db, client: dbClient } = await connectToDatabase();
    client = dbClient;
    const result = await db.collection('links').deleteOne({ key });

    if (result.deletedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: '未找到短链接' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error(`[${requestId}] 数据库操作失败:`, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: '服务器内部错误',
        ...(process.env.NODE_ENV === 'development' && { detail: error.message })
      })
    };
  } finally {
    if (client) {
      await client.close();
      console.log(`[${requestId}] 数据库连接已关闭`);
    }
  }
}