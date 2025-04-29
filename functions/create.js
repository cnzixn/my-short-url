import { connectToDatabase } from '../utils/db';
import { customAlphabet } from "nanoid";

const KEY_LENGTH = 6;
const MAX_RETRIES = 3;
const CUSTOM_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const generateKey = customAlphabet(CUSTOM_CHARS, KEY_LENGTH);

export async function handler(event) {
  const requestId = event.headers['x-nf-request-id'] || 'local-dev';
  console.log(`[${requestId}] 开始处理请求`);

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '请求体不能为空' })
    };
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '无效的JSON格式' })
    };
  }

  const urls = Array.isArray(parsedBody.url) ? parsedBody.url : [parsedBody.url];

  const result = [];

  let client;
  try {
    const { db, client: dbClient } = await connectToDatabase();
    client = dbClient;

    for (const url of urls) {
      if (!url) {
        result.push({ url, error: '缺少URL参数' });
        continue;
      }

      try {
        new URL(url);
      } catch {
        result.push({ url, error: '无效的URL格式' });
        continue;
      }

      const existing = await db.collection('links').findOne({ url });
      if (existing) {
        result.push({ url, key: existing.key, existing: true });
        continue;
      }

      let key;
      let inserted = false;
      let retries = 0;

      while (retries < MAX_RETRIES && !inserted) {
        key = generateKey();
        try {
          await db.collection('links').insertOne({
            key,
            url,
            createdAt: new Date(),
            clicks: 0
          });
          inserted = true;
          result.push({ url, key });
        } catch (err) {
          if (err.code === 11000) {
            retries++;
            continue;
          }
          throw err;
        }
      }

      if (!inserted) {
        result.push({ url, error: '生成失败，重试次数过多' });
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results: result })
    };

  } catch (error) {
    console.error(`[${requestId}] 服务器错误:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '服务器内部错误', detail: error.message })
    };
  } finally {
    if (client) {
      await client.close();
      console.log(`[${requestId}] 数据库连接已关闭`);
    }
  }
}