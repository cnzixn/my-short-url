export async function handler(event) {
    const body = JSON.parse(event.body);
    const { password } = body;

    const correctPassword = process.env.ADMIN_PASSWORD; // 确保环境变量已正确配置

    console.log('收到的密码:', password);  // 打印密码，确保接收正确
    console.log('正确的密码:', correctPassword);  // 打印环境变量中的密码，确认密码是否正确

    if (password === correctPassword) {
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    }
    
    return {
        statusCode: 403,
        body: JSON.stringify({ success: false, error: '密码错误' })
    };
}