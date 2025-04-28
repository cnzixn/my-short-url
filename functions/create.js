import { nanoid } from 'nanoid';
import { connectToDatabase } from '../utils/db';

export async function handler(event) {
  try {
    const { url } = JSON.parse(event.body);
    const { db, client } = await connectToDatabase();
    
    // 生成唯一短码
    const key = nanoid(8);
    const collection = db.collection('links');
    
    await collection.insertOne({
      key,
      url,
      createdAt: new Date(),
    });

    client.close();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ key })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '生成失败' })
    };
  }
}
