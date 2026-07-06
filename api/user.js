const request = require('../utils/request');

function uploadFace(filePath) {
    return new Promise((resolve, reject) => {
        const token = wx.getStorageSync('token');
        const header = {};
        if (token) {
            header.Authorization = `Bearer ${token}`;
        }

        wx.uploadFile({
            url: `${request.BASE_URL}/upload`,
            filePath,
            name: 'file',
            header,
            success: (res) => {
                let data = {};
                try {
                    data = JSON.parse(res.data || '{}');
                } catch (e) {
                    reject(new Error('上传解析失败'));
                    return;
                }

                if (res.statusCode >= 200 && res.statusCode < 300 && (data.code === 0 || data.code === 200)) {
                    const url = data?.data?.url || data?.url;
                    if (!url) {
                        reject(new Error('上传成功但未返回图片地址'));
                        return;
                    }
                    resolve(url);
                    return;
                }
                reject(new Error(data.msg || '上传失败'));
            },
            fail: reject
        });
    });
}

async function registerFace(filePath) {
    const faceImageUrl = await uploadFace(filePath);
    return request({
        url: '/users/me/face',
        method: 'POST',
        data: {
            face_image_url: faceImageUrl
        }
    });
}

module.exports = {
    getUserInfo() {
        return request({
            url: '/users/me',
            method: 'GET'
        });
    },

    updateUserInfo(data) {
        return request({
            url: '/users/me',
            method: 'PUT',
            data
        });
    },

    changePassword(data) {
        return request({
            url: '/users/me/password',
            method: 'PUT',
            data
        });
    },

    registerFace
};
