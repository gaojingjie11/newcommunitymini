const BASE_URL = 'https://api.communitysvc.xyz/api';

const normalizeErrorMessage = (msg, fallback = '请求失败') => {
  const text = String(msg || '').trim();
  if (!text) return fallback;

  if (/invalid payment password/i.test(text)) {
    return '支付密码错误，请重试';
  }

  if (/payment password is required/i.test(text)) {
    return '\u5f53\u524d\u652f\u4ed8\u65b9\u5f0f\u9700\u8981\u652f\u4ed8\u5bc6\u7801\uff0c\u8bf7\u6539\u7528\u5bc6\u7801\u652f\u4ed8\u6216\u68c0\u67e5\u540e\u7aef\u5237\u8138\u652f\u4ed8\u914d\u7f6e';
  }

  if (/face image is required/i.test(text)) {
    return '\u672a\u83b7\u53d6\u5230\u4eba\u8138\u56fe\u7247\uff0c\u8bf7\u91cd\u65b0\u62cd\u7167\u4e0a\u4f20';
  }

  return text;
};

const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    };

    if (token) {
      header.Authorization = `Bearer ${token}`;
    }

    wx.request({
      url: `${BASE_URL}${options.url}`,
      method: options.method || 'GET',
      data: options.data,
      timeout: options.timeout || 10000,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const data = res.data || {};
          if (data.code === 0 || data.code === 200) {
            resolve(data.data);
            return;
          }

          if (data.code === 401) {
            wx.removeStorageSync('token');
            wx.redirectTo({ url: '/pages/auth/login' });
            reject(data);
            return;
          }

          wx.showToast({
            title: normalizeErrorMessage(data.msg, '请求失败'),
            icon: 'none'
          });
          reject(data);
          return;
        }

        if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.redirectTo({ url: '/pages/auth/login' });
        }

        wx.showToast({
          title: normalizeErrorMessage(res?.data?.msg || res?.data?.message, '请求失败'),
          icon: 'none'
        });
        reject(res);
      },
      fail: (err) => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
};

module.exports = request;
module.exports.BASE_URL = BASE_URL;
