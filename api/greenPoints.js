const request = require('../utils/request');

function normalizeGreenPointsErrorMessage(msg, fallback = '识别失败，请稍后重试') {
    const text = String(msg || '').trim();
    if (!text) return fallback;

    if (/garbage recognition failed/i.test(text) || /unexpected end of json input/i.test(text)) {
        return '图片识别失败，请重新拍摄清晰图片后重试';
    }

    if (/invalid image|decode|unsupported/i.test(text)) {
        return '图片格式不支持，请上传清晰的 JPG/PNG 图片';
    }

    return text;
}

function uploadGarbageImage(filePath) {
    return new Promise((resolve, reject) => {
        const token = wx.getStorageSync('token');
        const header = {};
        if (token) {
            header.Authorization = `Bearer ${token}`;
        }

        wx.uploadFile({
            url: `${request.BASE_URL}/green-points/upload-garbage`,
            filePath,
            name: 'file',
            header,
            success: (res) => {
                let data = null;
                try {
                    data = JSON.parse(res.data || '{}');
                } catch (e) {
                    const message = '识别服务响应异常，请稍后重试';
                    wx.showToast({ title: message, icon: 'none' });
                    reject({ message, __toastShown: true });
                    return;
                }

                if (res.statusCode >= 200 && res.statusCode < 300 && (data.code === 0 || data.code === 200)) {
                    resolve(data.data);
                    return;
                }

                if (data.code === 401 || res.statusCode === 401) {
                    wx.removeStorageSync('token');
                    wx.redirectTo({ url: '/pages/auth/login' });
                }

                const message = normalizeGreenPointsErrorMessage(data.msg, '图片识别失败，请稍后重试');
                wx.showToast({
                    title: message,
                    icon: 'none'
                });
                reject({
                    ...(data || {}),
                    message,
                    __toastShown: true
                });
            },
            fail: (err) => {
                const message = '网络错误，请检查网络后重试';
                wx.showToast({ title: message, icon: 'none' });
                reject({
                    ...(err || {}),
                    message,
                    __toastShown: true
                });
            }
        });
    });
}

function getGreenPointsLeaderboard(params) {
    return request({
        url: '/green-points/leaderboard',
        method: 'GET',
        data: params
    });
}

module.exports = {
    uploadGarbageImage,
    getGreenPointsLeaderboard
};
