import * as dotenv from "dotenv";
dotenv.config(); 

interface Message {
    to: string;
    message: string;
    sender: string;
    custom_ref?: string | null;
}

export async function sendSMS(messages: Message[]): Promise<any> {
    if (!messages || messages.length === 0) {
        throw new Error("No messages provided");
    }

    const checkApostrophes = (message: string) => {
        for (let i = 0; i < message.length; i++) {
            let code = message.charCodeAt(i);
            if (code === 39) {

            } else if (code === 8217) {

            } else if (code === 8216) {

            }
        }
    };
    ;

    // 檢查每個 message 是否都有必填欄位
    messages.forEach((msg, index) => {
        if (!msg.to || !msg.message || !msg.sender) {
            throw new Error(`Message at index ${index} is missing required fields: 'to', 'message', or 'sender'`);
        }
    });
    
    const messageData = { messages };
    const apiUrl = process.env.MOBILE_MESSAGE_API_URL;
        if (!apiUrl) throw new Error("Missing MOBILE_MESSAGE_API_URL in .env");
    
    ;
    ;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${process.env.MOBILE_MESSAGE_API_USERNAME}:${process.env.MOBILE_MESSAGE_API_PASSWORD}`),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });
        const responseData = await response.json();
        ;
        if (responseData.status !== 'complete') {
            throw new Error(`Failed to send messages: ${responseData.error || 'Unknown error'}`);
        }
        ;
        return responseData;
        
    } catch (error: any) {
        console.error("Error sending messages:", error);
        throw new Error(`Failed to send messages: ${error.message}`);
    }

}