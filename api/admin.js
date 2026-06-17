const request = require('../utils/request');

module.exports = {
    getAIReportList(params) {
        return request({
            url: '/statistics/ai-report/list',
            method: 'GET',
            data: params
        });
    },

    generateAIReport() {
        return request({
            url: '/statistics/ai-report/generate',
            method: 'POST',
            timeout: 120000
        });
    },

    getAIReportDetail(id) {
        return request({
            url: `/statistics/ai-report/${id}`,
            method: 'GET'
        });
    }
};
