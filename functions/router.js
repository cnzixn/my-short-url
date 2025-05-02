import { 
  createShortLink,
  getShortLink,
  updateShortLink,
  deleteShortLink,
  redirectShortLink
} from './shortener';

export async function handler(event) {
  const path = event.path;
  const method = event.httpMethod;

  try {
    // 路由分发
    if (path === '/api/links' && method === 'POST') {
      return await createShortLink(event);
    }
    
    if (path === '/api/links' && method === 'GET') {
      return await getShortLink(event);
    }
    
    if (path === '/api/links' && method === 'PUT') {
      return await updateShortLink(event);
    }
    
    if (path === '/api/links' && method === 'DELETE') {
      return await deleteShortLink(event);
    }
    
    if (path.startsWith('/l/') && method === 'GET') {
      return await redirectShortLink(event);
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not Found' })
    };
  } catch (err) {
    console.error('处理请求时出错:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      })
    };
  }
}
