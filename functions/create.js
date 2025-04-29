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

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '无效的 JSON 格式' })
    };
  }

  const isBatch = Array.isArray(body.batch);
  const items = isBatch ? body.batch : [body];

  // 连接数据库
  let client;
  try {
    const { db, client: dbClient } = await connectToDatabase();
    client = dbClient;

    const results = [];

    for (const item of items) {
      const { url, key: customKey } = item;

      if (!url) {
        results.push({ url: null, error: '缺少 URL' });
        continue;
      }

      try {
        new URL(url);
      } catch {
        results.push({ url, error: '无效的 URL 格式' });
        continue;
      }

      // 查找是否已存在
      const existing = await db.collection('links').findOne({ url });
      if (existing) {
        results.push({ url, key: existing.key, existing: true });
        continue;
      }

      // 生成 key（可自定义）
      let key = customKey;
      if (!key) {
        let retries = 0;
        while (retries < MAX_RETRIES) {
          key = generateKey();
          const exists = await db.collection('links').findOne({ key });
          if (!exists) break;
          retries++;
        }
        if (retries >= MAX_RETRIES) {
          results.push({ url, error: '生成唯一短链失败' });
          continue;
        }
      }

      try {
        await db.collection('links').insertOne({
          key,
          url,
          createdAt: new Date(),
          clicks: 0
        });
        results.push({ url, key });
      } catch (e) {
        if (e.code === 11000) {
          results.push({ url, error: '短链 key 重复' });
        } else {
          results.push({ url, error: '插入失败' });
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isBatch ? results : results[0])
    };

  } catch (e) {
    console.error(`[${requestId}] 出错:`, e.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '服务器内部错误' })
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
}