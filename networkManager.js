class NetworkManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.networkType = 'unknown';
    }

    // Check if device is connected to a network
    checkNetworkConnection() {
        return navigator.onLine;
    }

    // Simulate getting local IP (for testing)
    getLocalIP() {
        // In real implementation, this would use WebRTC to get actual IP
        return '192.168.43.' + (Math.floor(Math.random() * 200) + 2);
    }

    // Get network information
    getNetworkInfo() {
        const connection = navigator.connection || 
                          navigator.mozConnection || 
                          navigator.webkitConnection;
        
        if (connection) {
            return {
                type: connection.effectiveType || 'unknown',
                downlink: connection.downlink || 'unknown',
                rtt: connection.rtt || 'unknown'
            };
        }
        
        return { type: 'unknown', downlink: 'unknown', rtt: 'unknown' };
    }

    // Monitor network status changes
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Network: Online');
            this.updateNetworkStatus('Connected to network');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Network: Offline');
            this.updateNetworkStatus('Network disconnected');
        });
    }

    // Update network status in UI
    updateNetworkStatus(message) {
        const statusElement = document.getElementById('status');
        if (statusElement && !statusElement.classList.contains('host') && !statusElement.classList.contains('client')) {
            statusElement.textContent = message;
        }
    }
}
