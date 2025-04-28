import { nanoid } from 'nanoid';
import { connectToDatabase } from '../utils/db';

exports.handler = async (event) => {
  try {
    // 解析请求体
    const { url } = JSON.parse(event.body);
    
    if (!url) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "缺少URL参数" }) 
      };
    }

    // 生成唯一key（示例使用 nanoid）
    const { nanoid } = await import('nanoid');
    const key = nanoid(6);

    // 此处应添加数据库存储逻辑
    
    return {
      statusCode: 200,
      body: JSON.stringify({ key }) // 确保返回正确的数据结构
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "服务器内部错误" })
    };
  }
};

