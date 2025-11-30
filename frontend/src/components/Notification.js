import React, { useEffect, useRef } from 'react';
import './Notification.css';

const Notification = ({
                          message,
                          type = 'info',
                          onClose,
                          duration = 3000,
                          title
                      }) => {
    const timerRef = useRef(null);

    useEffect(() => {
        console.log('🔄 Notification mounted with duration:', duration);

        // Clear any existing timer
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Nếu duration > 0, set timer để tự động tắt
        if (duration > 0) {
            timerRef.current = setTimeout(() => {
                console.log('⏰ Auto closing notification after', duration, 'ms');
                onClose();
            }, duration);
        }

        // Cleanup function
        return () => {
            console.log('🧹 Cleaning up notification timer');
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [duration, onClose]);

    const handleClose = () => {
        console.log('❌ Manual close triggered');
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        onClose();
    };

    const getNotificationIcon = () => {
        switch (type) {
            case 'success': return '✅';
            case 'warning': return '⚠️';
            case 'danger': return '🚨';
            case 'error': return '❌';
            case 'info': return 'ℹ️';
            default: return '💡';
        }
    };

    return (
        <div className={`notification ${type}`}>
            <div className="notification-content">
                <div className="notification-icon">
                    {getNotificationIcon()}
                </div>
                <div className="notification-body">
                    {title && <div className="notification-title">{title}</div>}
                    <div className="notification-message">{message}</div>
                </div>
                <button
                    className="notification-close"
                    onClick={handleClose}
                    aria-label="Đóng thông báo"
                >
                    ×
                </button>
            </div>

            {/* Progress bar cho notification */}
            {duration > 0 && (
                <div
                    className="notification-progress"
                    style={{
                        animationDuration: `${duration}ms`
                    }}
                />
            )}
        </div>
    );
};

export default Notification;