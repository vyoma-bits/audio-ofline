class DeviceDiscovery {
    constructor() {
        this.currentDevice = null;
        this.connectedDevices = [];
        this.isScanning = false;
        this.scanInterval = null;
    }

    // Register this device on the network
    registerDevice(role = 'client') {
        const deviceId = this.generateDeviceId();
        const deviceName = this.generateDeviceName();
        
        this.currentDevice = {
            deviceId: deviceId,
            deviceName: deviceName,
            role: role,
            connectionTime: new Date().toLocaleTimeString(),
            ipAddress: this.getLocalIP(),
            status: 'connected',
            lastSeen: Date.now()
        };

        // Store device info in localStorage
        const storageKey = role === 'host' ? 'network_host' : `device_${deviceId}`;
        localStorage.setItem(storageKey, JSON.stringify(this.currentDevice));
        
        console.log(`Registered as ${role}:`, this.currentDevice);
        this.updateDebugInfo(`Registered as ${role}: ${deviceName}`);
        
        return this.currentDevice;
    }

    // Discover all devices on the network
    discoverDevices() {
        this.connectedDevices = [];
        
        // Scan all localStorage keys for devices
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key === 'network_host' || key.startsWith('device_')) {
                try {
                    const deviceData = JSON.parse(localStorage.getItem(key));
                    
                    // Check if device data is still valid (not too old)
                    if (this.isDeviceActive(deviceData)) {
                        this.connectedDevices.push(deviceData);
                    } else {
                        // Remove stale device data
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    console.error('Error parsing device data:', error);
                    localStorage.removeItem(key); // Remove corrupted data
                }
            }
        }

        // Update last seen timestamp for current device
        if (this.currentDevice) {
            this.currentDevice.lastSeen = Date.now();
            const storageKey = this.currentDevice.role === 'host' ? 'network_host' : `device_${this.currentDevice.deviceId}`;
            localStorage.setItem(storageKey, JSON.stringify(this.currentDevice));
        }

        // Sort devices: host first, then by connection time
        this.connectedDevices.sort((a, b) => {
            if (a.role === 'host' && b.role !== 'host') return -1;
            if (b.role === 'host' && a.role !== 'host') return 1;
            return new Date(a.connectionTime) - new Date(b.connectionTime);
        });

        console.log('Discovered devices:', this.connectedDevices);
        this.displayConnectedDevices();
        
        return this.connectedDevices;
    }

    // Check if device is still active (seen within last 30 seconds)
    isDeviceActive(deviceData) {
        if (!deviceData.lastSeen) return false;
        const thirtySecondsAgo = Date.now() - (30 * 1000);
        return deviceData.lastSeen > thirtySecondsAgo;
    }

    // Start continuous device scanning
    startScanning() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        this.discoverDevices(); // Initial scan
        
        // Scan every 3 seconds
        this.scanInterval = setInterval(() => {
            this.discoverDevices();
        }, 3000);
        
        console.log('Started device scanning...');
    }

    // Stop device scanning
    stopScanning() {
        if (!this.isScanning) return;
        
        this.isScanning = false;
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        
        console.log('Stopped device scanning...');
    }

    // Display connected devices in UI
    displayConnectedDevices() {
        const deviceListElement = document.getElementById('deviceList');
        
        if (this.connectedDevices.length === 0) {
            deviceListElement.innerHTML = '<em>No devices found</em>';
            return;
        }

        let html = '';
        this.connectedDevices.forEach(device => {
            const isCurrentDevice = this.currentDevice && device.deviceId === this.currentDevice.deviceId;
            const deviceLabel = isCurrentDevice ? ' (You)' : '';
            const roleIcon = device.role === 'host' ? '📡' : '📱';
            
            html += `
                <div class="device-item">
                    ${roleIcon} <strong>${device.deviceName}${deviceLabel}</strong><br>
                    <small>Role: ${device.role} | Connected: ${device.connectionTime}</small>
                </div>
            `;
        });
        
        deviceListElement.innerHTML = html;
        
        // Update device count in debug info
        this.updateDebugInfo(`Found ${this.connectedDevices.length} device(s)`);
    }

    // Generate unique device ID
    generateDeviceId() {
        return 'dev_' + Math.random().toString(36).substr(2, 9);
    }

    // Generate friendly device name
    generateDeviceName() {
        const names = ['Explorer', 'Adventurer', 'Hiker', 'Traveler', 'Guide', 'Scout'];
        const numbers = Math.floor(Math.random() * 99) + 1;
        return names[Math.floor(Math.random() * names.length)] + numbers;
    }

    // Get local IP address (simplified)
    getLocalIP() {
        // This is a simplified version - in real implementation, 
        // you'd use WebRTC to get actual local IP
        return '192.168.43.' + (Math.floor(Math.random() * 200) + 2);
    }

    // Update debug information
    updateDebugInfo(message) {
        const debugElement = document.getElementById('debugText');
        if (debugElement) {
            const timestamp = new Date().toLocaleTimeString();
            debugElement.innerHTML = `[${timestamp}] ${message}`;
        }
    }

    // Clear all device data
    clearAllData() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key === 'network_host' || key.startsWith('device_')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        this.connectedDevices = [];
        this.currentDevice = null;
        this.displayConnectedDevices();
        
        console.log('Cleared all device data');
        this.updateDebugInfo('All device data cleared');
    }
}
