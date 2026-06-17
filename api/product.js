const request = require('../utils/request');

module.exports = {
    // 获取商品列表
    getProductList(params) {
        return request({
            url: '/mall/products',
            method: 'GET',
            data: params
        });
    },

    // 获取商品详情
    getProductDetail(id) {
        return request({
            url: `/mall/products/${id}`,
            method: 'GET'
        });
    },

    // 添加收藏
    addFavorite(productId) {
        return request({
            url: '/mall/favorites',
            method: 'POST',
            data: { product_id: productId }
        });
    },

    // 取消收藏
    removeFavorite(productId) {
        return request({
            url: `/mall/favorites/${productId}`,
            method: 'DELETE'
        });
    },

    // 获取收藏列表
    getFavoriteList() {
        return request({
            url: '/mall/favorites',
            method: 'GET'
        });
    },

    // 检查是否收藏
    checkFavorite(productId) {
        return request({
            url: `/mall/favorites/check/${productId}`,
            method: 'GET'
        });
    },

    // 获取分类列表
    getCategories() {
        return request({
            url: '/mall/categories',
            method: 'GET'
        });
    }
};
