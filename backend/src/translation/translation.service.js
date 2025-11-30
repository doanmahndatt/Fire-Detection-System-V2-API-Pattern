export class TranslationService {

    normalizeRawData(rawData) {
        console.log('🔄 Translating raw data:', rawData);

        // Translation Protocol: Chuẩn hóa dữ liệu thô từ ESP8266
        const normalized = {
            timestamp: new Date().toISOString(),
            temperature: this.validateTemperature(rawData.temperature),
            humidity: this.validateHumidity(rawData.humidity),
            flameDetected: this.normalizeFlameData(rawData.flame_detected),
            rawSystemStatus: rawData.system_status, // Giữ nguyên system_status từ ESP8266
            rawData: rawData // Giữ nguyên dữ liệu gốc để debug
        };

        console.log('✅ Normalized data:', normalized);
        return normalized;
    }

    validateTemperature(temp) {
        if (temp === null || temp === undefined || temp < -50 || temp > 150) {
            console.warn('⚠️ Invalid temperature value:', temp);
            return 0;
        }
        return parseFloat(temp.toFixed(1));
    }

    validateHumidity(humidity) {
        if (humidity === null || humidity === undefined || humidity < 0 || humidity > 100) {
            console.warn('⚠️ Invalid humidity value:', humidity);
            return 0;
        }
        return parseFloat(humidity.toFixed(1));
    }

    normalizeFlameData(flameValue) {
        // ESP8266: 0 = có lửa, 1 = không có lửa
        // Chuẩn hóa: true = có lửa, false = không có lửa
        const normalized = flameValue === 0;
        console.log(`🔥 Flame detection: ${flameValue} -> ${normalized}`);
        return normalized;
    }
}