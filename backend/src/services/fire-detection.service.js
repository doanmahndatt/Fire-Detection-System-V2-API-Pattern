export class FireDetectionService {

    processSensorData(normalizedData) {
        const { temperature, humidity, flameDetected, rawSystemStatus } = normalizedData;

        console.log(`🔍 Processing sensor data - Temp: ${temperature}°C, Humidity: ${humidity}%, Flame: ${flameDetected}, System Status: ${rawSystemStatus}`);

        // Sử dụng trực tiếp system_status từ ESP8266 (rawData)
        let systemStatus = 'normal';
        let alertLevel = 0;

        // Sử dụng system_status từ rawData nếu có
        if (rawSystemStatus && ['normal', 'warning', 'danger'].includes(rawSystemStatus)) {
            systemStatus = rawSystemStatus;
            console.log(`✅ Using system_status from ESP8266: ${systemStatus}`);
        } else {
            // Fallback: Tính toán system_status nếu rawData không có
            console.log(`⚠️ No valid system_status from ESP8266, calculating locally`);
            systemStatus = this.calculateSystemStatus(temperature, flameDetected);
        }

        // Map system_status to alertLevel
        switch (systemStatus) {
            case 'danger':
                alertLevel = 2;
                console.log('🚨 DANGER Condition detected!');
                break;
            case 'warning':
                alertLevel = 1;
                console.log('⚠️ WARNING Condition detected!');
                break;
            default:
                alertLevel = 0;
                console.log('✅ NORMAL Condition');
        }

        // Xác định trạng thái thiết bị dựa trên system_status
        const deviceStatus = this.calculateDeviceStatus(systemStatus, alertLevel);

        const processedData = {
            ...normalizedData,
            systemStatus,
            alertLevel,
            deviceStatus,
            processedAt: new Date().toISOString()
        };

        console.log('✅ Processed fire detection data:', processedData);
        return processedData;
    }

    // Fallback method - chỉ dùng khi ESP8266 không gửi system_status
    calculateSystemStatus(temperature, flameDetected) {
        const warningCondition = (temperature >= 50 && temperature < 70) || flameDetected;
        const dangerCondition = temperature >= 70 && flameDetected;

        if (dangerCondition) {
            return 'danger';
        } else if (warningCondition) {
            return 'warning';
        } else {
            return 'normal';
        }
    }

    calculateDeviceStatus(systemStatus, alertLevel) {
        // Logic điều khiển thiết bị dựa trên system_status từ ESP8266
        let deviceStatus;

        switch (systemStatus) {
            case 'danger':
                deviceStatus = {
                    led: true,
                    buzzer: true,
                    pump: true,
                    message: 'CẢNH BÁO NGUY HIỂM: Cháy đang xảy ra!'
                };
                break;
            case 'warning':
                deviceStatus = {
                    led: true,
                    buzzer: true,
                    pump: false,
                    message: 'CẢNH BÁO: Nguy cơ cháy!'
                };
                break;
            default:
                deviceStatus = {
                    led: false,
                    buzzer: false,
                    pump: false,
                    message: 'Hệ thống hoạt động bình thường'
                };
        }

        console.log(`🎛️ Device status for ${systemStatus}:`, deviceStatus);
        return deviceStatus;
    }
}