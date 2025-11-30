import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Notification from './components/Notification.js';
import { ALERT_MESSAGES, getAlertMessage } from './config/alerts.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const API_BASE = 'http://localhost:3001/api';

function App() {
    const [sensorData, setSensorData] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [notification, setNotification] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [lastSystemStatus, setLastSystemStatus] = useState('normal');

    // Hiển thị thông báo - CHỈ cho user actions và errors
    const showNotification = useCallback((message, type = 'info', title = '', duration = null) => {
        console.log('📢 Showing notification:', { message, type, title, duration });

        const alertConfig = ALERT_MESSAGES[type] || {};
        setNotification({
            message,
            type,
            title,
            duration: duration || alertConfig.duration || 3000,
            key: Date.now() // Unique key để force re-render
        });
    }, []);

    // Close notification
    const closeNotification = useCallback(() => {
        console.log('🗑️ Closing notification');
        setNotification(null);
    }, []);

    // Cập nhật thời gian mỗi giây
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch dữ liệu sensor
    const fetchSensorData = async () => {
        try {
            const response = await axios.get(`${API_BASE}/sensor-data`);
            setSensorData(response.data);
            setConnectionStatus('connected');
        } catch (error) {
            console.error('Error fetching sensor data:', error);
            setConnectionStatus('disconnected');
            // CHỈ alert khi mất kết nối
            showNotification(
                ALERT_MESSAGES.CONNECTION_ERROR.message,
                ALERT_MESSAGES.CONNECTION_ERROR.type,
                '',
                ALERT_MESSAGES.CONNECTION_ERROR.duration
            );
        }
    };

    // Fetch lịch sử
    const fetchHistory = async () => {
        try {
            const response = await axios.get(`${API_BASE}/history`);
            setHistoryData(response.data);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    };

    // Fetch dữ liệu mỗi 5s
    useEffect(() => {
        fetchSensorData();
        fetchHistory();
        setIsLoading(false);

        const interval = setInterval(() => {
            fetchSensorData();
            fetchHistory();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Theo dõi thay đổi trạng thái hệ thống - CHỈ alert khi có CẢNH BÁO hoặc NGUY HIỂM
    useEffect(() => {
        if (sensorData && sensorData.system_status) {
            const currentStatus = sensorData.system_status;

            // CHỈ hiển thị alert khi chuyển sang trạng thái CẢNH BÁO hoặc NGUY HIỂM
            if ((currentStatus === 'warning' || currentStatus === 'danger') && lastSystemStatus !== currentStatus) {
                console.log('🚨 System status changed to alert state:', currentStatus);
                const alert = getAlertMessage(currentStatus, sensorData.flameDetected);
                showNotification(alert.message, alert.type, alert.title, alert.duration);
            }

            // Cập nhật lastSystemStatus
            setLastSystemStatus(currentStatus);
        }
    }, [sensorData?.system_status, sensorData?.flameDetected, showNotification, lastSystemStatus]);

    // Điều khiển thiết bị - VẪN alert khi user thao tác
    const handleControlDevice = async (device, action) => {
        try {
            await axios.post(`${API_BASE}/control-device`, {
                device,
                action
            });

            // HIỂN THỊ alert khi user thao tác thành công
            if (device === 'buzzer' && action === 'off') {
                showNotification(
                    ALERT_MESSAGES.BUZZER_OFF.message,
                    ALERT_MESSAGES.BUZZER_OFF.type,
                    '',
                    ALERT_MESSAGES.BUZZER_OFF.duration
                );
            } else if (device === 'pump' && action === 'off') {
                showNotification(
                    ALERT_MESSAGES.PUMP_OFF.message,
                    ALERT_MESSAGES.PUMP_OFF.type,
                    '',
                    ALERT_MESSAGES.PUMP_OFF.duration
                );
            } else if (device === 'system' && action === 'reboot') {
                showNotification(
                    ALERT_MESSAGES.SYSTEM_REBOOT.message,
                    ALERT_MESSAGES.SYSTEM_REBOOT.type,
                    '',
                    ALERT_MESSAGES.SYSTEM_REBOOT.duration
                );
            }
        } catch (error) {
            // HIỂN THỊ alert khi có lỗi
            showNotification('Lỗi khi gửi lệnh điều khiển', 'error', '', 5000);
        }
    };

    // Format thời gian
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Format ngày tháng
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    // Lấy text trạng thái
    const getStatusText = (status) => {
        switch (status) {
            case 'danger': return 'BÁO ĐỘNG !';
            case 'warning': return 'CẢNH BÁO !';
            default: return 'BÌNH THƯỜNG';
        }
    };

    // Lấy mô tả trạng thái
    const getStatusDescription = (status, flameDetected) => {
        switch (status) {
            case 'danger':
                return 'Nhiệt độ cao, phát hiện lửa';
            case 'warning':
                return flameDetected ? 'Phát hiện lửa trong khu vực' : 'Nhiệt độ cao';
            default:
                return 'Hệ thống hoạt động bình thường';
        }
    };

    // Lấy icon trạng thái kết nối
    const getConnectionIcon = () => {
        switch (connectionStatus) {
            case 'connected': return '🟢';
            case 'disconnected': return '🔴';
            default: return '🟡';
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Đang kết nối đến hệ thống...</div>
            </div>
        );
    }

    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="container-fluid">
                    <div className="row align-items-center">
                        <div className="col-md-8">
                            <h1 className="mb-0">HỆ THỐNG GIÁM SÁT VÀ PHÁT HIỆN HỎA HOẠN</h1>
                        </div>
                        <div className="col-md-4 text-end">
                            <div className="header-info">
                                <div className="current-time">
                                    {currentTime.toLocaleDateString('vi-VN')} - {currentTime.toLocaleTimeString('vi-VN')}
                                </div>
                                <div className={`connection-status ${connectionStatus}`}>
                                    {getConnectionIcon()} {connectionStatus === 'connected' ? 'Đã kết nối' : 'Mất kết nối'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="dashboard">
                <div className="container-fluid">
                    {/* Layout 3-6-3 với Bootstrap */}
                    <div className="row g-3">
                        {/* Cột trái: Thông số cảm biến - col-md-3 */}
                        <div className="col-md-3">
                            <div className="sensor-panel h-100">
                                <h3>THÔNG SỐ CẢM BIẾN</h3>

                                {/* Nhiệt độ */}
                                <div className="sensor-item">
                                    <div className="sensor-header">
                                        <div className="sensor-icon">🌡️</div>
                                        <h4>Nhiệt độ</h4>
                                    </div>
                                    <div className="sensor-value">{sensorData?.temperature || 0}°C</div>
                                    <div className="sensor-time">
                                        Cập nhật: {sensorData ? formatTime(sensorData.timestamp) : '--:--:--'}
                                    </div>
                                </div>

                                {/* Độ ẩm */}
                                <div className="sensor-item">
                                    <div className="sensor-header">
                                        <div className="sensor-icon">💧</div>
                                        <h4>Độ ẩm</h4>
                                    </div>
                                    <div className="sensor-value">{sensorData?.humidity || 0}%</div>
                                    <div className="sensor-time">
                                        Cập nhật: {sensorData ? formatTime(sensorData.timestamp) : '--:--:--'}
                                    </div>
                                </div>

                                {/* Trạng thái lửa */}
                                <div className={`sensor-item status-item ${sensorData?.system_status || 'normal'}`}>
                                    <div className="sensor-header">
                                        <div className="sensor-icon">🔥</div>
                                        <h4>TRẠNG THÁI LỬA</h4>
                                    </div>
                                    <div className="sensor-value status-text">
                                        {sensorData ? getStatusText(sensorData.system_status) : 'BÌNH THƯỜNG'}
                                    </div>
                                    <div className="sensor-time">
                                        Cập nhật: {sensorData ? formatTime(sensorData.timestamp) : '--:--:--'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cột giữa: Biểu đồ - col-md-6 */}
                        <div className="col-md-6">
                            <div className="chart-section h-100">
                                <h3>BIỂU ĐỒ DỮ LIỆU</h3>
                                <div className="chart-container">
                                    <div className="line-chart">
                                        <div className="chart-title">Lịch sử dữ liệu cảm biến</div>
                                        <div className="chart-legend">
                                            <div className="legend-item">
                                                <div className="legend-color temp-color"></div>
                                                <span>Nhiệt độ (°C)</span>
                                            </div>
                                            <div className="legend-item">
                                                <div className="legend-color humi-color"></div>
                                                <span>Độ ẩm (%)</span>
                                            </div>
                                        </div>
                                        <div className="chart-area">
                                            <svg className="line-chart-svg" viewBox="0 0 500 200" preserveAspectRatio="none">
                                                {/* Grid lines */}
                                                {[0, 25, 50, 75, 100].map((percent, index) => (
                                                    <line
                                                        key={`grid-${index}`}
                                                        x1="0"
                                                        y1={percent * 2}
                                                        x2="500"
                                                        y2={percent * 2}
                                                        stroke="#e0e0e0"
                                                        strokeWidth="1"
                                                    />
                                                ))}

                                                {/* Temperature Line */}
                                                <polyline
                                                    fill="none"
                                                    stroke="#d32f2f"
                                                    strokeWidth="3"
                                                    points={historyData.slice(0, 7).map((data, index) => {
                                                        const x = (index / 6) * 500;
                                                        const y = 200 - (data.temperature * 2);
                                                        return `${x},${y}`;
                                                    }).join(' ')}
                                                />

                                                {/* Humidity Line */}
                                                <polyline
                                                    fill="none"
                                                    stroke="#1976d2"
                                                    strokeWidth="3"
                                                    points={historyData.slice(0, 7).map((data, index) => {
                                                        const x = (index / 6) * 500;
                                                        const y = 200 - (data.humidity * 2);
                                                        return `${x},${y}`;
                                                    }).join(' ')}
                                                />

                                                {/* Temperature Points */}
                                                {historyData.slice(0, 7).map((data, index) => {
                                                    const x = (index / 6) * 500;
                                                    const y = 200 - (data.temperature * 2);
                                                    return (
                                                        <circle
                                                            key={`temp-${index}`}
                                                            cx={x}
                                                            cy={y}
                                                            r="4"
                                                            fill="#d32f2f"
                                                        />
                                                    );
                                                })}

                                                {/* Humidity Points */}
                                                {historyData.slice(0, 7).map((data, index) => {
                                                    const x = (index / 6) * 500;
                                                    const y = 200 - (data.humidity * 2);
                                                    return (
                                                        <circle
                                                            key={`humi-${index}`}
                                                            cx={x}
                                                            cy={y}
                                                            r="4"
                                                            fill="#1976d2"
                                                        />
                                                    );
                                                })}
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cột phải: Nhật ký và Điều khiển - col-md-3 */}
                        <div className="col-md-3">
                            <div className="d-flex flex-column h-100">
                                {/* Nhật ký hoạt động */}
                                <div className="log-section flex-grow-1 mb-3">
                                    <h3>NHẬT KÝ HOẠT ĐỘNG</h3>
                                    <div className="log-table-container">
                                        <table className="log-table">
                                            <thead>
                                            <tr>
                                                <th>Thời gian</th>
                                                <th>Sự kiện</th>
                                                <th>Mô tả</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {historyData.slice(0, 8).map((log, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <div className="log-time">
                                                            {formatTime(log.timestamp)}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className={`event-type ${log.system_status}`}>
                                                            {log.system_status === 'danger' ? 'BÁO ĐỘNG' :
                                                                log.system_status === 'warning' ? 'CẢNH BÁO' : 'BÌNH THƯỜNG'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="log-description">
                                                            {getStatusDescription(log.system_status, log.flameDetected)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Điều khiển thiết bị */}
                                <div className="control-section">
                                    <h3>ĐIỀU KHIỂN THIẾT BỊ</h3>
                                    <div className="control-buttons">
                                        <button
                                            className="control-btn buzzer-btn"
                                            onClick={() => handleControlDevice('buzzer', 'off')}
                                            title="Tắt còi báo động"
                                        >
                                            <div className="btn-icon">🚨</div>
                                            <div className="btn-text">
                                                <div className="btn-title">TẮT CÒI</div>
                                                <div className="btn-desc">Báo động âm thanh</div>
                                            </div>
                                        </button>

                                        <button
                                            className="control-btn pump-btn"
                                            onClick={() => handleControlDevice('pump', 'off')}
                                            title="Tắt bơm nước"
                                        >
                                            <div className="btn-icon">💦</div>
                                            <div className="btn-text">
                                                <div className="btn-title">TẮT BƠM</div>
                                                <div className="btn-desc">Hệ thống chữa cháy</div>
                                            </div>
                                        </button>

                                        <button
                                            className="control-btn reboot-btn"
                                            onClick={() => handleControlDevice('system', 'reboot')}
                                            title="Khởi động lại toàn bộ hệ thống"
                                        >
                                            <div className="btn-icon">🔄</div>
                                            <div className="btn-text">
                                                <div className="btn-title">KHỞI ĐỘNG LẠI</div>
                                                <div className="btn-desc">Reset hệ thống</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="app-footer mt-3">
                <div className="container-fluid">
                    <div className="footer-content">
                        <p className="mb-1"><strong>Hệ thống giám sát và phát hiện hỏa hoạn</strong> - Doãn Mạnh Đạt - B20DCCN170</p>
                    </div>
                </div>
            </footer>

            {/* Notification */}
            {notification && (
                <Notification
                    key={notification.key}
                    message={notification.message}
                    type={notification.type}
                    onClose={closeNotification}
                    duration={notification.duration}
                    title={notification.title}
                />
            )}
        </div>
    );
}

export default App;