const { createVisitor, getVisitorList } = require('../../api/service');

Page({
    data: {
        activeTab: 0, // 0: 登记, 1: 记录
        name: '',
        mobile: '',
        visit_time: '',
        reason: '',
        historyList: [],
        page: 1,
        size: 10,
        total: 0,
        loading: false
    },

    onLoad() {
        // Set default visit time to now
        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        this.setData({ visit_time: timeStr });
    },

    switchTab(e) {
        const index = Number(e.currentTarget.dataset.index);
        this.setData({ activeTab: index });
        if (index === 1 && this.data.historyList.length === 0) {
            this.getHistory(true);
        }
    },

    bindDateChange(e) {
        this.setData({
            visit_time: e.detail.value
        })
    },

    onInput(e) {
        const field = e.currentTarget.dataset.field;
        this.setData({ [field]: e.detail.value });
    },

    async handleSubmit() {
        const { name, mobile, visit_time, reason } = this.data;
        if (!name || !mobile || !visit_time || !reason) {
            wx.showToast({ title: '请填写必要信息', icon: 'none' });
            return;
        }

        // Format time to YYYY-MM-DD HH:mm:ss
        // Assumes input is valid string that Date can parse, or simpler string manipulation
        let formattedTime = visit_time;
        const date = new Date(visit_time);
        if (!isNaN(date.getTime())) {
            const { formatTime } = require('../../utils/util');
            formattedTime = formatTime(date); // This returns "YYYY/MM/DD HH:mm:ss"
            // Backend in Go (time.ParseInLocation("2006-01-02 15:04:05", ...)) expects dashes
            formattedTime = formattedTime.replace(/\//g, '-');

            // Should ensure seconds are present. formatTime adds them by default.
            // If user input "2026-01-12 14:46", formatTime might ensure it matches style.

            // Check if user input manually matches needed format approximately
        }

        try {
            await createVisitor({
                visitor_name: name,
                visitor_phone: mobile,
                visit_purpose: reason,
                release_time: formattedTime,
                valid_date: formattedTime.split(' ')[0]
            });
            wx.showToast({ title: '登记成功', icon: 'success' });
            // Reset form
            this.setData({
                name: '',
                mobile: '',
                reason: ''
            });
            // Refresh list if needed
            this.getHistory(true);
        } catch (e) {
            console.error(e);
        }
    },

    async getHistory(reset = false) {
        if (this.data.loading) return;
        this.setData({ loading: true });

        try {
            const res = await getVisitorList({
                page: this.data.page,
                size: this.data.size
            });

            let list = res.list || res || [];

            // Format dates
            const { formatTime } = require('../../utils/util');
            list = list.map(item => {
                const dateStr = item.release_time || item.visit_time || '';
                const date = new Date(dateStr);
                const isValid = !isNaN(date.getTime()) && date.getFullYear() > 2000;
                return {
                    ...item,
                    visit_time: isValid ? formatTime(date) : '',
                    visitor_mobile: item.visitor_phone || item.visitor_mobile || item.mobile || '',
                    visitor_name: item.visitor_name || item.name || '',
                    reason: item.visit_purpose || item.reason || ''
                };
            });

            if (reset) {
                this.setData({ historyList: list, total: res.total || 0 });
            } else {
                this.setData({ historyList: [...this.data.historyList, ...list], total: res.total || 0 });
            }
        } catch (e) {
            console.error(e);
        } finally {
            this.setData({ loading: false });
        }
    },

    onReachBottom() {
        if (this.data.activeTab === 1 && this.data.historyList.length < this.data.total) {
            this.setData({ page: this.data.page + 1 });
            this.getHistory();
        }
    }
});
