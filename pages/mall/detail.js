const { getProductDetail, addFavorite, removeFavorite, checkFavorite } = require('../../api/product');
const { addToCart } = require('../../api/order');
const { getCommentList } = require('../../api/comment');
const { formatTime } = require('../../utils/util');

function formatCommentTime(value) {
    if (value === null || value === undefined || value === '') return '';

    let date = null;
    if (typeof value === 'number' || /^\d+$/.test(String(value))) {
        let ts = Number(value);
        if (!Number.isNaN(ts) && ts > 0) {
            // Compatible with seconds timestamps.
            if (ts < 1e12) ts *= 1000;
            date = new Date(ts);
        }
    } else {
        date = new Date(value);
    }

    if (!date || Number.isNaN(date.getTime())) {
        return String(value);
    }

    return formatTime(date, false).replace(/\//g, '-');
}

Page({
    data: {
        product: null,
        isFavorite: false,
        comments: [],
        page: 1,
        size: 10,
        total: 0
    },

    onLoad(options) {
        if (options.id) {
            this.getProductDetail(options.id);
            this.getComments(options.id);
            this.checkFavorite(options.id);
        }
    },

    async getProductDetail(id) {
        try {
            const res = await getProductDetail(id);
            this.setData({ product: res });
        } catch (e) {
            console.error(e);
        }
    },

    async getComments(id) {
        try {
            const res = await getCommentList({
                product_id: id,
                page: this.data.page,
                size: this.data.size
            });
            const list = (res.list || res || []).map((item) => {
                const userObj = item.user || {
                    avatar: item.avatar,
                    username: item.username,
                    real_name: item.real_name || item.username
                };
                return {
                    ...item,
                    user: userObj,
                    created_at_text: formatCommentTime(item.created_at)
                };
            });
            this.setData({ comments: list });
        } catch (e) {
            console.error(e);
        }
    },

    async checkFavorite(id) {
        try {
            const res = await checkFavorite(id);
            // res is { is_favorite: bool }
            this.setData({ isFavorite: res.is_favorite });
        } catch (e) {
            console.error(e);
        }
    },

    async toggleFavorite() {
        if (!this.data.product) return;
        const id = this.data.product.id;
        try {
            if (this.data.isFavorite) {
                await removeFavorite(id);
                this.setData({ isFavorite: false });
                wx.showToast({ title: '已取消', icon: 'none' });
            } else {
                await addFavorite(id);
                this.setData({ isFavorite: true });
                wx.showToast({ title: '已收藏', icon: 'none' });
            }
        } catch (e) {
            console.error(e);
            wx.showToast({ title: '操作失败', icon: 'none' });
        }
    },

    async addToCart() {
        if (!this.data.product) return;
        try {
            await addToCart({
                product_id: this.data.product.id,
                quantity: 1
            });
            wx.showToast({ title: '已加入购物车' });
        } catch (e) {
            console.error(e);
        }
    },

});
