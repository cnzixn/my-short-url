import { Nanoid } from 'nanoid';
import { kv } from 'netlify-kv';

const nanoid = new Nanoid({ size: 8 });

export async function handler(event) {
    const { url } = JSON.parse(event.body);
    const key = nanoid();
    
    await kv.set(key, url);
    
    return {
        statusCode: 200,
        body: JSON.stringify({ key })
    };
}
