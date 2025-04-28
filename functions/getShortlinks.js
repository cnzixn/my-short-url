// functions/getShortlinks.js
import { connectToDatabase } from '../utils/db';

export async function handler(event) {
  const requestId = event.headers['x-nf-request-id'] || 'local-dev';
  console.log(`[${requestId}] 获取所有短链接`);

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  let client;
  try {
    const { db, client: dbClient } = await connectToDatabase();
    client = dbClient;
    const shortlinks = await db.collection('links').find().toArray();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortlinks })
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