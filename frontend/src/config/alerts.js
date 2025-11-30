export const ALERT_MESSAGES = {
    // Trạng thái hệ thống
    NORMAL: {
        title: 'BÌNH THƯỜNG',
        message: 'Hệ thống hoạt động bình thường',
        type: 'success',
        duration: 3000 // 3 giây
    },
    WARNING: {
        title: 'CẢNH BÁO',
        message: 'CẢNH BÁO: Nguy cơ cháy!',
        type: 'warning',
        duration: 5000 // 5 giây cho cảnh báo
    },
    DANGER: {
        title: 'BÁO ĐỘNG',
        message: 'CẢNH BÁO NGUY HIỂM: Cháy đang xảy ra!',
        type: 'danger',
        duration: 0 // Không tự tắt cho cảnh báo nguy hiểm
    },

    // Điều khiển thiết bị
    BUZZER_OFF: {
        message: 'Đã tắt còi báo động',
        type: 'success',
        duration: 3000
    },
    PUMP_OFF: {
        message: 'Đã tắt bơm nước',
        type: 'success',
        duration: 3000
    },
    SYSTEM_REBOOT: {
        message: 'Đã khởi động lại hệ thống',
        type: 'info',
        duration: 3000
    },

    // Lỗi hệ thống
    CONNECTION_ERROR: {
        message: 'Mất kết nối đến server',
        type: 'error',
        duration: 5000
    },
    SENSOR_ERROR: {
        message: 'Lỗi kết nối cảm biến',
        type: 'error',
        duration: 5000
    }
};

export const getAlertMessage = (status, flameDetected) => {
    switch (status) {
        case 'danger':
            return ALERT_MESSAGES.DANGER;
        case 'warning':
            return flameDetected
                ? ALERT_MESSAGES.WARNING
                : {
                    ...ALERT_MESSAGES.WARNING,
                    message: 'Nhiệt độ cao',
                    duration: 5000
                };
        default:
            return ALERT_MESSAGES.NORMAL;
    }
};

// Hàm helper để lấy thời gian tự động tắt
export const getAlertDuration = (alertType) => {
    return ALERT_MESSAGES[alertType]?.duration || 3000;
};