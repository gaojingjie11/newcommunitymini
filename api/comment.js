const request = require('../utils/request');

module.exports = {
    // 获取评论列表
    getCommentList(params) {
        return request({
            url: '/mall/comments',
            method: 'GET',
            data: params
        });
    },

    // 发表评论
    createComment(data) {
        return request({
            url: '/mall/comments',
            method: 'POST',
            data
        });
    }
};
