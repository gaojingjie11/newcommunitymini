const { getCommunityMessages, sendCommunityMessage } = require('../../api/community');
const { getUserInfo } = require('../../api/user');

const POLL_INTERVAL = 5000;
const DEFAULT_AVATAR = '/assets/icons/user.png';

function formatChatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}:${ss}`;
}

Page({
    data: {
        messages: [],
        draft: '',
        canSend: false,
        loading: false,
        sending: false,
        currentUserId: 0,
        lastMessageId: '',
        scrollTop: 0,
        defaultAvatar: DEFAULT_AVATAR
    },

    onLoad() {
        this._pollTimer = null;
    },

    async onShow() {
        await this.ensureCurrentUser();
        await this.fetchMessages();
        this.startPolling();
    },

    onHide() {
        this.stopPolling();
    },

    onUnload() {
        this.stopPolling();
    },

    async onPullDownRefresh() {
        try {
            await this.fetchMessages();
        } finally {
            wx.stopPullDownRefresh();
        }
    },

    async ensureCurrentUser() {
        if (this.data.currentUserId > 0) return;
        try {
            const user = await getUserInfo();
            this.setData({
                currentUserId: Number((user && user.id) || 0)
            });
        } catch (e) {
            console.error('failed to load current user', e);
        }
    },

    startPolling() {
        if (this._pollTimer) return;
        this._pollTimer = setInterval(() => {
            this.fetchMessages({ silent: true });
        }, POLL_INTERVAL);
    },

    stopPolling() {
        if (!this._pollTimer) return;
        clearInterval(this._pollTimer);
        this._pollTimer = null;
    },

    normalizeMessages(list) {
        const currentUserId = Number(this.data.currentUserId || 0);
        return list.map((item, index) => {
            const uid = Number((item && item.user_id) || 0);
            const user = (item && item.user) || {};
            return {
                id: item.id,
                user_id: uid,
                content: (item && item.content) || '',
                created_at: item.created_at,
                timeText: formatChatTime(item.created_at),
                avatar: item.avatar || user.avatar || DEFAULT_AVATAR,
                username: item.username || user.username || '用户',
                isSelf: currentUserId > 0 && uid === currentUserId,
                viewId: `msg-${index}`
            };
        });
    },

    scrollToBottom() {
        if (this.data.messages.length <= 0) {
            this.setData({ lastMessageId: '', scrollTop: 0 });
            return;
        }

        // Reset anchor first to force scroll-into-view retrigger.
        this.setData({
            lastMessageId: '',
            scrollTop: Number(this.data.scrollTop || 0) + 1
        }, () => {
            setTimeout(() => {
                this.setData({
                    lastMessageId: 'chat-bottom-anchor',
                    // Fallback for some base library versions.
                    scrollTop: Number(this.data.scrollTop || 0) + 100000
                });
            }, 20);
        });
    },

    async fetchMessages(options = {}) {
        const silent = !!options.silent;
        if (!silent) {
            this.setData({ loading: true });
        }

        try {
            const res = await getCommunityMessages({ page: 1, size: 100 });
            const descList = Array.isArray(res && res.list) ? res.list : [];
            const ascList = descList.slice().reverse();
            const messages = this.normalizeMessages(ascList);
            this.setData({ messages }, () => {
                this.scrollToBottom();
                setTimeout(() => this.scrollToBottom(), 120);
            });
        } catch (e) {
            console.error('failed to fetch community messages', e);
        } finally {
            if (!silent) {
                this.setData({ loading: false });
            }
        }
    },

    onDraftInput(e) {
        const draft = e.detail.value || '';
        this.setData({
            draft,
            canSend: !!String(draft).trim()
        });
    },

    async handleSend() {
        const content = String(this.data.draft || '').trim();
        if (!content || this.data.sending) return;

        this.setData({ sending: true });
        try {
            await sendCommunityMessage({ content });
            this.setData({ draft: '', canSend: false });
            await this.fetchMessages({ silent: true });
        } catch (e) {
            console.error('failed to send community message', e);
        } finally {
            this.setData({ sending: false });
        }
    }
});
