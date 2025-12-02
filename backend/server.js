import express from 'express';
import mqtt from 'mqtt';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import { TranslationService } from './src/translation/translation.service.js';
import { FireDetectionService } from './src/services/fire-detection.service.js';
import { DataController } from './src/controllers/data.controller.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Khởi tạo database
const db = new sqlite3.Database('./fire_detection.db');

// Khởi tạo services
const translationService = new TranslationService();
const fireDetectionService = new FireDetectionService();
const dataController = new DataController(db);

// Kết nối MQTT Broker
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com:1883');

mqttClient.on('connect', () => {
    console.log('✅ Connected to MQTT Broker');
    mqttClient.subscribe('fire_detection/sensor_data');
});

mqttClient.on('error', (error) => {
    console.error('❌ MQTT Connection Error:', error);
});

// Xử lý dữ liệu từ ESP8266 theo Translation Protocol
mqttClient.on('message', (topic, message) => {
    if (topic === 'fire_detection/sensor_data') {
        try {
            console.log('📨 Received MQTT message:', message.toString());
            const rawData = JSON.parse(message.toString());

            // Bước 1: Translation Protocol - Chuẩn hóa dữ liệu
            const normalizedData = translationService.normalizeRawData(rawData);

            // Bước 2: Xử lý logic phát hiện hỏa hoạn
            const processedData = fireDetectionService.processSensorData(normalizedData);

            // Bước 3: Lưu vào database
            dataController.saveSensorData(processedData);

        } catch (error) {
            console.error('❌ Error processing MQTT message:', error);
        }
    }
});

// API routes
app.get('/api/sensor-data', (req, res) => {
    dataController.getLatestData(req, res);
});

app.get('/api/history', (req, res) => {
    dataController.getHistory(req, res);
});

app.post('/api/control-device', (req, res) => {
    dataController.controlDevice(req, res, mqttClient);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Fire Detection System Backend is running',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🔥 Fire Detection Backend running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});