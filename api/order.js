const request = require('../utils/request');

module.exports = {
    // 添加到购物车
    addToCart(data) {
        return request({
            url: '/mall/cart/items',
            method: 'POST',
            data
        });
    },

    // 获取购物车列表
    getCartList() {
        return request({
            url: '/mall/cart/items',
            method: 'GET'
        }).then((res) => {
            const list = res?.list || res || [];
            return list.map(item => ({
                id: item.id,
                user_id: item.user_id,
                product_id: item.product_id,
                quantity: item.quantity,
                created_at: item.created_at,
                product: {
                    id: item.product_id,
                    name: item.product_name || item.product?.name,
                    price: item.product_price || item.product?.price,
                    image_url: item.product_image || item.product?.image_url
                }
            }));
        });
    },

    // 删除购物车项
    deleteCartItem(id) {
        return request({
            url: `/mall/cart/items/${id}`,
            method: 'DELETE'
        });
    },

    // 修改购物车数量
    updateCartQuantity(id, quantity) {
        return request({
            url: `/mall/cart/items/${id}`,
            method: 'PUT',
            data: { quantity }
        });
    },

    // 创建订单
    createOrder(data) {
        return request({
            url: '/mall/orders',
            method: 'POST',
            data
        });
    },

    // 获取订单列表
    getOrderList(params) {
        return request({
            url: '/mall/orders',
            method: 'GET',
            data: params
        }).then((res) => {
            const list = res?.list || res || [];
            const mapItems = (items) => (items || []).map(item => ({
                ...item,
                product: {
                    id: item.product_id,
                    name: item.product_name,
                    image_url: item.product_image
                }
            }));

            const mappedList = list.map(order => ({
                ...order,
                items: mapItems(order.items)
            }));

            if (res && res.list) {
                return {
                    ...res,
                    list: mappedList
                };
            }
            return mappedList;
        });
    },

    // 支付订单
    payOrder(data) {
        const orderId = data.order_id || data.business_id || data.id;
        const idempotencyKey = data.idempotency_key || `order-pay-${orderId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        return request({
            url: `/mall/orders/${orderId}/pay`,
            method: 'POST',
            data: {
                pay_type: data.pay_type || 'password',
                password: data.password || '',
                face_image_url: data.face_image_url || '',
                idempotency_key: idempotencyKey,
                return_url: ''
            }
        });
    },

    // 取消订单
    cancelOrder(orderId) {
        return request({
            url: `/mall/orders/${orderId}/cancel`,
            method: 'POST'
        });
    },

    // 确认收货
    receiveOrder(id) {
        return request({
            url: `/mall/orders/${id}/receive`,
            method: 'POST'
        });
    },

    // 获取订单详情
    getOrderDetail(id) {
        return request({
            url: `/mall/orders/${id}`,
            method: 'GET'
        }).then((res) => {
            if (!res) return res;
            return {
                ...res,
                store: {
                    id: res.store_id,
                    name: res.store_name,
                    address: res.store_address,
                    phone: res.store_phone
                },
                items: (res.items || []).map(item => ({
                    ...item,
                    product: {
                        id: item.product_id,
                        name: item.product_name,
                        image_url: item.product_image
                    }
                }))
            };
        });
    }
};
