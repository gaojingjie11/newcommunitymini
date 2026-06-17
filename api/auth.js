const request = require('../utils/request');

module.exports = {
    // 用户注册
    register(data) {
        return request({
            url: '/users/register',
            method: 'POST',
            data
        });
    },

    // 用户登录
    login(data) {
        return request({
            url: '/users/login',
            method: 'POST',
            data
        });
    },

    // 退出登录
    logout() {
        return request({
            url: '/users/logout',
            method: 'POST'
        });
    },

    // 获取用户信息
    getUserInfo() {
        return request({
            url: '/users/me',
            method: 'GET'
        });
    },

    // 更新用户信息
    updateUserInfo(data) {
        return request({
            url: '/users/me',
            method: 'PUT',
            data
        });
    },

    // 修改密码
    changePassword(data) {
        return request({
            url: '/users/me/password',
            method: 'PUT',
            data
        });
    },

    // 发送验证码
    sendCode(data) {
        return request({
            url: '/users/sms-code',
            method: 'POST',
            data
        });
    },

    // 验证码登录
    loginCode(data) {
        return request({
            url: '/users/login-code',
            method: 'POST',
            data
        });
    }
};
