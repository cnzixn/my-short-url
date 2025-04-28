import { connectToDatabase } from '../utils/db';
import QRCode from 'qrcode';

const MOBILE_REGEX = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i;

export async function handler(event) {
  try {
    const key = event.path.split('/')[1];
    const { db, client } = await connectToDatabase();
    const collection = db.collection('links');
    
    const doc = await collection.findOne({ key });
    client.close();
    
    if (!doc) return { statusCode: 404 };

    const isMobile = MOBILE_REGEX.test(event.headers['user-agent']);
    
    if (isMobile) {
      return {
        statusCode: 302,
        headers: { Location: doc.url }
      };
    }

    // PC端显示二维码
    const qr = await QRCode.toDataURL(doc.url);
    
    return {
      statusCode: 200,
      headers: {'Content-Type': 'text/html'},
      body: `
        <h1>扫描访问</h1>
        <img src="${qr}" width="200" alt="QR Code">
        <p>原始链接：<a href="${doc.url}">${doc.url}</a></p>
      `
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: '服务器错误'
    };
  }
}
