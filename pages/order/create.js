const { getCartList, createOrder } = require('../../api/order');
const { getStoreList } = require('../../api/service');

Page({
    data: {
        cartItems: [],
        storeList: [],
        selectedStoreIndex: 0,
        totalCount: 0,
        totalPrice: '0.00',
        submitting: false
    },

    onLoad() {
        this.loadData();
    },

    async loadData() {
        try {
            const [cartRes, storeRes] = await Promise.all([
                getCartList(),
                getStoreList()
            ]);

            const stores = storeRes || [];
            const items = cartRes || [];

            this.setData({
                storeList: stores,
                cartItems: items
            });

            this.calculateTotal();

            if (items.length === 0) {
                wx.showToast({ title: '购物车为空', icon: 'none' });
                setTimeout(() => wx.switchTab({ url: '/pages/mall/index' }), 1500);
            }
        } catch (e) {
            console.error(e);
        }
    },

    calculateTotal() {
        let count = 0;
        let total = 0;
        this.data.cartItems.forEach(item => {
            count += item.quantity;
            total += (parseFloat(item.product.price) * item.quantity);
        });
        this.setData({
            totalCount: count,
            totalPrice: total.toFixed(2)
        });
    },

    bindStoreChange(e) {
        this.setData({ selectedStoreIndex: e.detail.value });
    },

    async submitOrder() {
        const { storeList, selectedStoreIndex, cartItems } = this.data;
        if (storeList.length === 0) return;

        const storeId = storeList[selectedStoreIndex].id;
        if (!storeId) {
            wx.showToast({ title: '请选择门店', icon: 'none' });
            return;
        }

        this.setData({ submitting: true });

        // Extract cart IDs
        const cartIds = cartItems.map(item => Number(item.id));

        try {
            await createOrder({
                store_id: Number(storeId),
                cart_ids: cartIds
            });

            wx.showToast({ title: '下单成功' });
            setTimeout(() => {
                wx.redirectTo({ url: '/pages/order/list' });
            }, 1500);

        } catch (e) {
            console.error(e);
        } finally {
            this.setData({ submitting: false });
        }
    }
});
