const request = require('../utils/request');

module.exports = {
    // 获取公告列表
    getNoticeList(params) {
        return request({
            url: '/community/notices',
            method: 'GET',
            data: params
        });
    },

    // 获取公告详情
    getNoticeDetail(id) {
        return request({
            url: `/community/notices/${id}`,
            method: 'GET'
        });
    },

    // 标记公告已读
    readNotice(id) {
        return request({
            url: `/community/notices/${id}/read`,
            method: 'POST'
        });
    },

    // 创建报修
    createRepair(data) {
        return request({
            url: '/workorders',
            method: 'POST',
            data: {
                type: Number(data.type) === 2 ? 'complaint' : 'repair',
                category: data.category,
                description: data.content
            }
        });
    },

    // 获取报修列表
    getRepairList(params) {
        return request({
            url: '/workorders',
            method: 'GET',
            data: params
        }).then((res) => {
            const list = res.list || res || [];
            const mappedList = list.map(item => ({
                ...item,
                type: item.type === 'complaint' ? 2 : 1,
                category: item.category,
                content: item.description
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

    // 创建访客登记
    createVisitor(data) {
        return request({
            url: '/community/visitors',
            method: 'POST',
            data
        });
    },

    // 获取访客列表
    getVisitorList(params) {
        return request({
            url: '/community/visitors',
            method: 'GET',
            data: params
        });
    },

    // 获取我的车位
    getMyParking() {
        return request({
            url: '/community/parking-spaces/my',
            method: 'GET'
        });
    },

    // 绑定车牌
    bindCar(data) {
        const parkingId = data.parking_id;
        return request({
            url: `/community/parking-spaces/${parkingId}/plate`,
            method: 'PUT',
            data: {
                car_plate: data.car_plate
            }
        });
    },

    // 获取物业费列表
    getPropertyFeeList(params) {
        return request({
            url: '/community/property-fees',
            method: 'GET',
            data: params
        });
    },

    // 缴纳物业费
    payPropertyFee(data) {
        const feeId = data.related_id || data.business_id || data.id;
        const idempotencyKey = data.idempotency_key || `property-fee-${feeId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        return request({
            url: `/community/property-fees/${feeId}/pay`,
            method: 'POST',
            data: {
                pay_type: data.pay_type || 'password',
                password: data.password || '',
                face_image_url: data.face_image_url || '',
                idempotency_key: idempotencyKey
            }
        });
    },

    // 获取门店列表
    getStoreList() {
        return request({
            url: '/mall/stores',
            method: 'GET'
        });
    }
};
