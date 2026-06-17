const request = require('../utils/request');

function getConversations() {
    return request({
        url: '/agent/conversations',
        method: 'GET'
    });
}

function createConversation(data) {
    return request({
        url: '/agent/conversations',
        method: 'POST',
        data
    });
}

function deleteConversation(id) {
    return request({
        url: `/agent/conversations/${id}`,
        method: 'DELETE'
    });
}

function getChatHistory(id) {
    return request({
        url: `/agent/conversations/${id}/history`,
        method: 'GET'
    }).then(res => {
        // Adapt format if backend returns a list or custom structure
        return res?.list || res || [];
    });
}

function approveAction(conversationId, actionId, data) {
    return request({
        url: `/agent/sessions/${conversationId}/actions/${actionId}/approve`,
        method: 'POST',
        data
    });
}

function rejectAction(conversationId, actionId) {
    return request({
        url: `/agent/sessions/${conversationId}/actions/${actionId}/reject`,
        method: 'POST'
    });
}

// Simple UTF-8 stream decoder
function createUtf8Decoder() {
    let buffer = [];
    return function decode(chunkBytes) {
        for (let i = 0; i < chunkBytes.length; i++) {
            buffer.push(chunkBytes[i]);
        }
        
        let i = 0;
        let str = '';
        while (i < buffer.length) {
            const c = buffer[i];
            let bytesNeeded = 0;
            let codePoint = 0;
            
            if (c < 0x80) {
                bytesNeeded = 1;
                codePoint = c;
            } else if ((c & 0xE0) === 0xC0) {
                bytesNeeded = 2;
                codePoint = c & 0x1F;
            } else if ((c & 0xF0) === 0xE0) {
                bytesNeeded = 3;
                codePoint = c & 0x0F;
            } else if ((c & 0xF8) === 0xF0) {
                bytesNeeded = 4;
                codePoint = c & 0x07;
            } else {
                i++;
                continue;
            }
            
            if (i + bytesNeeded > buffer.length) {
                break;
            }
            
            i++;
            for (let j = 1; j < bytesNeeded; j++) {
                const nextByte = buffer[i++];
                codePoint = (codePoint << 6) | (nextByte & 0x3F);
            }
            
            if (codePoint <= 0xFFFF) {
                str += String.fromCharCode(codePoint);
            } else {
                const u = codePoint - 0x10000;
                str += String.fromCharCode(0xD800 + (u >> 10), 0xDC00 + (u & 1023));
            }
        }
        
        buffer = buffer.slice(i);
        return str;
    };
}

function chatStream(data, onChunk, onDone, onError) {
    const token = wx.getStorageSync('token');
    const header = {
        'Content-Type': 'application/json'
    };
    if (token) {
        header.Authorization = `Bearer ${token}`;
    }

    const requestTask = wx.request({
        url: `${request.BASE_URL}/agent/chat/stream`,
        method: 'POST',
        header,
        data: {
            conversation_id: data.conversation_id,
            message: data.message,
            mode: data.mode || 'auto',
            pay_type: data.pay_type || '',
            payment_password: data.payment_password || '',
            face_image_url: data.face_image_url || ''
        },
        enableChunked: true,
        success: (res) => {
            // wx.request chunked success callback
        },
        fail: (err) => {
            onError(err);
        }
    });

    const utf8Decoder = createUtf8Decoder();
    let lineBuffer = '';

    requestTask.onChunkReceived((chunk) => {
        const arrayBuffer = chunk.data;
        const bytes = new Uint8Array(arrayBuffer);
        const decodedText = utf8Decoder(bytes);
        
        lineBuffer += decodedText;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop(); // Keep remaining incomplete line

        for (const line of lines) {
            const cleaned = line.trim();
            if (!cleaned) continue;

            if (cleaned.startsWith('data: ')) {
                const content = cleaned.slice(6);
                if (content === '[DONE]') {
                    onDone();
                    return;
                }
                if (content.startsWith('[ERROR]')) {
                    onError(new Error(content.slice(8)));
                    return;
                }
                try {
                    const parsed = JSON.parse(content);
                    onChunk(parsed);
                } catch (e) {
                    console.error('Error parsing stream chunk:', e);
                }
            }
        }
    });

    return requestTask;
}

module.exports = {
    getConversations,
    createConversation,
    deleteConversation,
    getChatHistory,
    approveAction,
    rejectAction,
    chatStream
};
