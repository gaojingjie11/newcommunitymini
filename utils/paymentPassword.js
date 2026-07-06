const request = require('./request');

function confirmAction(title, content) {
    return new Promise((resolve) => {
        wx.showModal({
            title,
            content,
            success: (res) => resolve(!!res.confirm),
            fail: () => resolve(false)
        });
    });
}

function promptPaymentPassword(options = {}) {
    const title = options.title || '支付验证';
    const placeholder = options.placeholder || '请输入登录密码';

    return new Promise((resolve) => {
        wx.showModal({
            title,
            editable: true,
            placeholderText: placeholder,
            success: (res) => {
                if (!res.confirm) {
                    resolve('');
                    return;
                }
                resolve((res.content || '').trim());
            },
            fail: () => resolve('')
        });
    });
}

function chooseFaceImageFromCamera() {
    return new Promise((resolve, reject) => {
        if (typeof wx.chooseMedia === 'function') {
            wx.chooseMedia({
                count: 1,
                mediaType: ['image'],
                sourceType: ['camera'],
                sizeType: ['compressed'],
                success: (res) => {
                    const filePath = res?.tempFiles?.[0]?.tempFilePath || '';
                    if (!filePath) {
                        reject(new Error('未获取到人脸照片'));
                        return;
                    }
                    resolve(filePath);
                },
                fail: reject
            });
            return;
        }

        wx.chooseImage({
            count: 1,
            sourceType: ['camera'],
            sizeType: ['compressed'],
            success: (res) => {
                const filePath = res?.tempFilePaths?.[0] || '';
                if (!filePath) {
                    reject(new Error('未获取到人脸照片'));
                    return;
                }
                resolve(filePath);
            },
            fail: reject
        });
    });
}

function compressFaceImage(filePath, quality = 70) {
    return new Promise((resolve) => {
        if (typeof wx.compressImage !== 'function') {
            resolve(filePath);
            return;
        }
        wx.compressImage({
            src: filePath,
            quality,
            success: (res) => resolve(res?.tempFilePath || filePath),
            fail: () => resolve(filePath)
        });
    });
}

function uploadFaceImage(filePath) {
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
                    reject(new Error('人脸上传响应解析失败'));
                    return;
                }

                if (res.statusCode >= 200 && res.statusCode < 300 && (data.code === 0 || data.code === 200)) {
                    const imageURL = data?.data?.url || data?.url || (typeof data?.data === 'string' ? data.data : '');
                    if (!imageURL) {
                        reject(new Error('上传成功但未返回图片地址'));
                        return;
                    }
                    resolve(imageURL);
                    return;
                }

                if (data.code === 401 || res.statusCode === 401) {
                    wx.removeStorageSync('token');
                    wx.redirectTo({ url: '/pages/auth/login' });
                }
                reject(new Error(data.msg || '人脸上传失败'));
            },
            fail: (err) => reject(err || new Error('人脸上传失败'))
        });
    });
}

function isUserCancelError(err) {
    const text = String(err?.errMsg || err?.message || '').toLowerCase();
    return text.includes('cancel');
}

async function promptPaymentAuth(options = {}) {
    const title = options.title || '支付验证';
    const passwordPlaceholder = options.passwordPlaceholder || '请输入登录密码';
    const allowFace = options.allowFace !== false;
    const faceRegistered = !!options.faceRegistered;

    const method = await new Promise((resolve) => {
        const itemList = allowFace ? ['密码支付', '刷脸支付'] : ['密码支付'];
        wx.showActionSheet({
            itemList,
            success: (res) => resolve(Number(res.tapIndex)),
            fail: () => resolve(-1)
        });
    });

    if (method < 0) {
        return null;
    }

    if (method === 0 || !allowFace) {
        const password = await promptPaymentPassword({
            title,
            placeholder: passwordPlaceholder
        });
        if (!password) {
            return null;
        }
        return { pay_type: 'password', password };
    }

    if (!faceRegistered) {
        wx.showToast({
            title: '当前账号未录入人脸，请先在个人中心录入',
            icon: 'none'
        });
        return null;
    }

    let prepareErrorMessage = '';
    try {
        wx.showLoading({ title: '拍照并上传中', mask: true });
        const filePath = await chooseFaceImageFromCamera();
        const compressedPath = await compressFaceImage(filePath, 70);
        const faceImageURL = await uploadFaceImage(compressedPath);
        return { pay_type: 'face', face_image_url: faceImageURL };
    } catch (err) {
        if (isUserCancelError(err)) {
            return null;
        }
        prepareErrorMessage = err?.message || '刷脸支付准备失败';
        return null;
    } finally {
        wx.hideLoading();
        if (prepareErrorMessage) {
            wx.showToast({
                title: prepareErrorMessage,
                icon: 'none'
            });
        }
    }
}

module.exports = {
    confirmAction,
    promptPaymentPassword,
    promptPaymentAuth
};
