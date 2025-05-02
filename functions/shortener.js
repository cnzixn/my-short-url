import { connectToDatabase } from '../utils/db';
import { customAlphabet } from 'nanoid';
import { URL } from 'url';

// 配置常量
const CONFIG = {
  KEY_LENGTH: 6,
  MAX_RETRIES: 3,
  CUSTOM_CHARS: 'abcdefghijklmnopqrstuvwxyz0123456789',
  MAX_BATCH_SIZE: 100
};

const generateKey = customAlphabet(CONFIG.CUSTOM_CHARS, CONFIG.KEY_LENGTH);

/**
 * 验证URL格式
 * @param {string} url - 要验证的URL
 * @returns {boolean} 是否有效
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 创建短链接 (Create)
 */
export async function createShortLink(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '请求体不能为空' }),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '无效的JSON格式' }),
    };
  }

  const { url, key } = parsed;
  const originalUrl = url?.trim();
  const customKey = key?.trim();

  // URL验证
  if (!originalUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL不能为空' }),
    };
  }

  if (!isValidUrl(originalUrl)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '无效的URL格式，必须包含http://或https://' }),
    };
  }

  const { db, client } = await connectToDatabase();
  const links = db.collection('links');

  try {
    // 检查是否已存在相同URL
    const existing = await links.findOne({ url: originalUrl });
    if (existing) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          url: originalUrl,
          key: existing.key,
          existing: true
        }),
      };
    }

    // 处理自定义key
    if (customKey) {
      if (!/^[a-z0-9]+$/i.test(customKey)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: '自定义短链只能包含字母和数字' }),
        };
      }

      if (customKey.length > CONFIG.KEY_LENGTH * 2) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `自定义短链过长 (最大 ${CONFIG.KEY_LENGTH * 2} 字符)` }),
        };
      }

      const conflict = await links.findOne({ key: customKey });
      if (conflict) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: '自定义短链已存在' }),
        };
      }

      await links.insertOne({
        key: customKey,
        url: originalUrl,
        createdAt: new Date(),
        clicks: 0,
      });

      return {
        statusCode: 201,
        body: JSON.stringify({ 
          url: originalUrl,
          key: customKey
        }),
      };
    }

    // 自动生成key
    let retries = 0;
    let autoKey;

    while (retries < CONFIG.MAX_RETRIES) {
      autoKey = generateKey();
      try {
        await links.insertOne({
          key: autoKey,
          url: originalUrl,
          createdAt: new Date(),
          clicks: 0,
        });

        return {
          statusCode: 201,
          body: JSON.stringify({ 
            url: originalUrl,
            key: autoKey
          }),
        };
      } catch (err) {
        if (err.code === 11000) { // 重复键错误
          retries++;
        } else {
          throw err;
        }
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: '生成短链失败，请重试' }),
    };
  } catch (err) {
    console.error('数据库操作失败:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }),
    };
  } finally {
    await client.close();
  }
}

/**
 * 获取短链接信息 (Read)
 */
export async function getShortLink(event) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'GET' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const { key } = event.queryStringParameters || {};

  if (!key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '缺少短链key参数' }),
    };
  }

  const { db, client } = await connectToDatabase();
  const links = db.collection('links');

  try {
    const link = await links.findOne({ key });

    if (!link) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: '短链接不存在' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: link.url,
        key: link.key,
        clicks: link.clicks,
        createdAt: link.createdAt
      }),
    };
  } catch (err) {
    console.error('数据库操作失败:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }),
    };
  } finally {
    await client.close();
  }
}

/**
 * 更新短链接 (Update)
 */
export async function updateShortLink(event) {
  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'PUT' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '请求体不能为空' }),
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '无效的JSON格式' }),
    };
  }

  const { key, newUrl } = parsed;
  const originalKey = key?.trim();
  const updatedUrl = newUrl?.trim();

  if (!originalKey) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '短链key不能为空' }),
    };
  }

  if (!updatedUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '新URL不能为空' }),
    };
  }

  if (!isValidUrl(updatedUrl)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '无效的URL格式，必须包含http://或https://' }),
    };
  }

  const { db, client } = await connectToDatabase();
  const links = db.collection('links');

  try {
    // 检查短链接是否存在
    const existing = await links.findOne({ key: originalKey });
    if (!existing) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: '短链接不存在' }),
      };
    }

    // 检查新URL是否已存在
    const urlConflict = await links.findOne({ url: updatedUrl, key: { $ne: originalKey } });
    if (urlConflict) {
      return {
        statusCode: 409,
        body: JSON.stringify({ 
          error: '该URL已对应另一个短链接',
          existingKey: urlConflict.key
        }),
      };
    }

    // 更新URL
    const result = await links.updateOne(
      { key: originalKey },
      { $set: { url: updatedUrl } }
    );

    if (result.modifiedCount === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'URL未改变',
          key: originalKey,
          url: updatedUrl
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        key: originalKey,
        url: updatedUrl,
        message: 'URL更新成功'
      }),
    };
  } catch (err) {
    console.error('数据库操作失败:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }),
    };
  } finally {
    await client.close();
  }
}

/**
 * 删除短链接 (Delete)
 */
export async function deleteShortLink(event) {
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'DELETE' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const { key } = event.queryStringParameters || {};

  if (!key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '缺少短链key参数' }),
    };
  }

  const { db, client } = await connectToDatabase();
  const links = db.collection('links');

  try {
    const result = await links.deleteOne({ key });

    if (result.deletedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: '短链接不存在' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: '短链接删除成功',
        key
      }),
    };
  } catch (err) {
    console.error('数据库操作失败:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }),
    };
  } finally {
    await client.close();
  }
}

/**
 * 重定向到原始URL
 */
export async function redirectShortLink(event) {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'GET' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const { key } = event.pathParameters || {};

  if (!key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: '缺少短链key参数' }),
    };
  }

  const { db, client } = await connectToDatabase();
  const links = db.collection('links');

  try {
    const link = await links.findOneAndUpdate(
      { key },
      { $inc: { clicks: 1 } },
      { returnDocument: 'after' }
    );

    if (!link.value) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: '短链接不存在' }),
      };
    }

    return {
      statusCode: 302,
      headers: {
        Location: link.value.url,
        'Cache-Control': 'no-cache'
      },
      body: ''
    };
  } catch (err) {
    console.error('数据库操作失败:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }),
    };
  } finally {
    await client.close();
  }
}
