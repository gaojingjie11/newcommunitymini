const {
    getConversations,
    createConversation,
    getChatHistory,
    chatStream,
    approveAction,
    rejectAction
} = require('../../api/chat');
const { getUserInfo } = require('../../api/user');
const { promptPaymentAuth } = require('../../utils/paymentPassword');

function nowTime() {
    const date = new Date();
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

function buildGreetingMessage() {
    return {
        role: 'assistant',
        content: '您好，我是智享生活助手。您可以让我帮您总结通知、创建报修、搜索商品、下单和支付。',
        time: nowTime()
    };
}

Page({
    data: {
        conversationId: '',
        messages: [],
        inputContent: '',
        loading: false,
        lastMessageId: 'msg-0',
        userInfo: null
    },

    onLoad() {
        this.initChat();
    },

    async initChat() {
        this.setData({ loading: true });
        try {
            // Load user info for payment checks
            const user = await getUserInfo().catch(() => null);
            if (user) {
                this.setData({ userInfo: user });
            }

            const resList = await getConversations();
            const list = resList?.list || resList || [];
            let activeId = '';
            if (list && list.length > 0) {
                activeId = list[0].id;
            } else {
                const res = await createConversation({ title: '新会话' });
                activeId = res.id;
            }

            this.setData({ conversationId: activeId });
            await this.loadHistory(activeId);
        } catch (e) {
            console.error(e);
            this.setData({ messages: [buildGreetingMessage()] });
        } finally {
            this.setData({ loading: false });
        }
    },

    async handleNewSession() {
        if (this.data.loading) return;
        this.setData({ loading: true });
        wx.showLoading({ title: '新建会话中...', mask: true });
        try {
            const res = await createConversation({ title: '新会话' });
            const activeId = res.id;
            this.setData({
                conversationId: activeId,
                messages: []
            });
            await this.loadHistory(activeId);
            wx.showToast({ title: '已新建对话', icon: 'success' });
        } catch (e) {
            console.error(e);
            wx.showToast({ title: '新建对话失败', icon: 'none' });
        } finally {
            this.setData({ loading: false });
            wx.hideLoading();
        }
    },

    async loadHistory(convId) {
        try {
            const list = await getChatHistory(convId);
            const messages = (list || []).map((item, idx) => {
                let proposedAction = null;
                if (item.event_type === 'approval_required' && item.event_payload) {
                    try {
                        proposedAction = JSON.parse(item.event_payload);
                    } catch (e) {
                        console.error('Failed to parse history event_payload', e);
                    }
                }

                // Parse order creation result payload if available
                let resultPayload = null;
                if (item.result_payload) {
                    try {
                        resultPayload = JSON.parse(item.result_payload);
                    } catch (e) {
                        resultPayload = item.result_payload;
                    }
                }

                return {
                    role: item.role || 'assistant',
                    content: item.content || '',
                    time: this.formatMessageTime(item.created_at),
                    proposed_action: proposedAction,
                    action_resolved: item.action_resolved || null, // 'approved' or 'rejected'
                    result_payload: resultPayload
                };
            });

            if (messages.length === 0) {
                messages.push(buildGreetingMessage());
            }

            this.setData({ messages }, this.scrollToBottom);
        } catch (e) {
            console.error(e);
            this.setData({ messages: [buildGreetingMessage()] }, this.scrollToBottom);
        }
    },

    formatMessageTime(value) {
        if (!value) return nowTime();
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return nowTime();
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    },

    onInput(e) {
        this.setData({ inputContent: e.detail.value });
    },

    scrollToBottom() {
        const idx = this.data.messages.length - 1;
        this.setData({ lastMessageId: `msg-${idx}` });
    },

    async handleSend() {
        const content = (this.data.inputContent || '').trim();
        if (!content || this.data.loading) return;

        const { conversationId } = this.data;
        if (!conversationId) {
            wx.showToast({ title: '会话未就绪', icon: 'none' });
            return;
        }

        // Add user message
        const userMsg = {
            role: 'user',
            content,
            time: nowTime()
        };
        const messages = [...this.data.messages, userMsg];
        this.setData({
            messages,
            inputContent: '',
            loading: true
        }, this.scrollToBottom);

        // Add bot message placeholder for streaming
        const botMsgIndex = this.data.messages.length;
        const botMsg = {
            role: 'assistant',
            content: '',
            time: nowTime(),
            tool_status: '智能管家正在思考中...'
        };
        this.setData({
            messages: [...this.data.messages, botMsg]
        }, this.scrollToBottom);

        let activeText = '';
        chatStream(
            {
                conversation_id: conversationId,
                message: content
            },
            (event) => {
                const currentBotMsg = this.data.messages[botMsgIndex];
                if (!currentBotMsg) return;

                if (event.type === 'message_delta') {
                    activeText += event.data.chunk;
                    const field = `messages[${botMsgIndex}].content`;
                    const statusField = `messages[${botMsgIndex}].tool_status`;
                    this.setData({
                        [field]: activeText,
                        [statusField]: ''
                    });
                } else if (event.type === 'tool_call_start') {
                    let toolText = '智能管家正在处理业务...';
                    if (event.data.tool === 'list_products') {
                        toolText = '正在查询商城商品列表...';
                    } else if (event.data.tool === 'query_notices') {
                        toolText = '正在检索社区公告通知...';
                    } else if (event.data.tool === 'create_order') {
                        toolText = '正在生成商品订单...';
                    } else if (event.data.tool === 'pay_order') {
                        toolText = '正在发起订单余额扣款支付...';
                    } else if (event.data.tool === 'submit_repair') {
                        toolText = '正在提交物业报修单...';
                    }
                    const statusField = `messages[${botMsgIndex}].tool_status`;
                    this.setData({ [statusField]: toolText });
                } else if (event.type === 'tool_call_end') {
                    const statusField = `messages[${botMsgIndex}].tool_status`;
                    this.setData({ [statusField]: '' });
                } else if (event.type === 'approval_required') {
                    const actionField = `messages[${botMsgIndex}].proposed_action`;
                    const statusField = `messages[${botMsgIndex}].tool_status`;
                    this.setData({
                        [actionField]: event.data,
                        [statusField]: '',
                        loading: false
                    });
                }
            },
            () => {
                // Done
                this.setData({ loading: false });
                this.scrollToBottom();
            },
            (err) => {
                // Error
                console.error(err);
                const currentBotMsg = this.data.messages[botMsgIndex];
                if (currentBotMsg) {
                    const field = `messages[${botMsgIndex}].content`;
                    const statusField = `messages[${botMsgIndex}].tool_status`;
                    this.setData({
                        [field]: currentBotMsg.content + '\n⚠️ 错误: ' + (err.message || '网络连接异常'),
                        [statusField]: ''
                    });
                }
                this.setData({ loading: false });
                this.scrollToBottom();
            }
        );
    },

    async handleApprove(e) {
        const index = e.currentTarget.dataset.index;
        const msg = this.data.messages[index];
        if (!msg || !msg.proposed_action || msg.action_submitting) return;

        const actionId = msg.proposed_action.action_id;
        const actionType = msg.proposed_action.action_type;

        const subField = `messages[${index}].action_submitting`;
        this.setData({ [subField]: true });

        try {
            let payload = {};
            if (actionType === 'pay_order') {
                const authPayload = await promptPaymentAuth({
                    title: '付款验证',
                    faceRegistered: !!(this.data.userInfo && this.data.userInfo.face_registered)
                });
                if (!authPayload) {
                    this.setData({ [subField]: false });
                    return;
                }
                payload = {
                    pay_type: authPayload.pay_type,
                    payment_password: authPayload.password || '',
                    face_image_url: authPayload.face_image_url || ''
                };
            }

            wx.showLoading({ title: '正在执行...', mask: true });
            const res = await approveAction(this.data.conversationId, actionId, payload);
            wx.hideLoading();

            const resolvedField = `messages[${index}].action_resolved`;
            this.setData({
                [resolvedField]: 'approved'
            });

            if (actionType === 'create_order' && res?.order_id) {
                const payloadField = `messages[${index}].result_payload`;
                this.setData({
                    [payloadField]: { order_id: res.order_id }
                });
            }

            wx.showToast({ title: '操作已授权执行', icon: 'success' });
            
            // Reload history to sync latest state
            await this.loadHistory(this.data.conversationId);
        } catch (err) {
            wx.hideLoading();
            wx.showToast({
                title: err?.message || '授权执行失败',
                icon: 'none'
            });
        } finally {
            this.setData({ [subField]: false });
        }
    },

    async handleReject(e) {
        const index = e.currentTarget.dataset.index;
        const msg = this.data.messages[index];
        if (!msg || !msg.proposed_action || msg.action_submitting) return;

        const actionId = msg.proposed_action.action_id;
        const subField = `messages[${index}].action_submitting`;
        this.setData({ [subField]: true });

        try {
            wx.showLoading({ title: '正在取消...', mask: true });
            await rejectAction(this.data.conversationId, actionId);
            wx.hideLoading();

            const resolvedField = `messages[${index}].action_resolved`;
            this.setData({
                [resolvedField]: 'rejected'
            });
            wx.showToast({ title: '已拒绝该操作', icon: 'none' });
            
            // Reload history to sync latest state
            await this.loadHistory(this.data.conversationId);
        } catch (err) {
            wx.hideLoading();
            wx.showToast({
                title: err?.message || '拒绝操作失败',
                icon: 'none'
            });
        } finally {
            this.setData({ [subField]: false });
        }
    },

    goToPay(e) {
        wx.navigateTo({
            url: `/pages/order/list`
        });
    }
});
