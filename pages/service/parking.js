const { getMyParking, bindCar } = require('../../api/service');

Page({
    data: {
        parkingList: [],
        plate_number: '',
        loading: false,
        showModal: false,
        currentId: null
    },

    onShow() {
        this.getParking();
    },

    async getParking() {
        this.setData({ loading: true });
        try {
            const res = await getMyParking();
            // Support list or single object
            let list = [];
            if (Array.isArray(res)) {
                list = res;
            } else if (res) {
                list = [res];
            }
            this.setData({ parkingList: list });
        } catch (e) {
            console.error(e);
            // If 404 or other error, parkingInfo remains null
        } finally {
            this.setData({ loading: false });
        }
    },

    onInput(e) {
        this.setData({ plate_number: e.detail.value });
    },

    showBindModal(e) {
        const id = e.currentTarget.dataset.id;
        this.setData({
            showModal: true,
            currentId: id,
            plate_number: '' // reset input
        });
    },

    closeModal() {
        this.setData({ showModal: false, currentId: null });
    },

    async handleBindConfirm() {
        const plate = String(this.data.plate_number || '').trim().toUpperCase();
        if (!plate) {
            wx.showToast({ title: '请输入车牌号', icon: 'none' });
            return;
        }

        // Standard blue plate regex: 1 province abbreviation, 1 letter, and 5 alphanumeric chars
        const regex = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼][A-Z][A-Z0-9]{5}$/;
        if (!regex.test(plate)) {
            wx.showToast({
                title: '请输入正确的蓝色车牌号（如：粤A88888）',
                icon: 'none',
                duration: 1500
            });
            return;
        }

        try {
            await bindCar({
                car_plate: plate, // Send the formatted uppercase plate
                parking_id: Number(this.data.currentId) // Backend expects parking_id
            });
            wx.showToast({ title: '绑定成功', icon: 'success' });
            this.closeModal();
            this.getParking();
        } catch (e) {
            console.error(e);
        }
    }
});
