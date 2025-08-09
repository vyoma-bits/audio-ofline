// Initialize components
const deviceDiscovery = new DeviceDiscovery();
const networkManager = new NetworkManager();

// DOM elements
let statusElement, startHostButton, joinNetworkButton, clearDataButton;

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    statusElement = document.getElementById('status');
    startHostButton = document.getElementById('startHost');
    joinNetworkButton = document.getElementById('joinNetwork');
    clearDataButton = document.getElementById('clearData');

    // Setup event listeners
    startHostButton.addEventListener('click', startAsHost);
    joinNetworkButton.addEventListener('click', joinAsClient);
    clearDataButton.addEventListener('click', clearAllData);

    // Setup network monitoring
    networkManager.setupNetworkMonitoring();

    // Initial device discovery (to see if there are existing devices)
    deviceDiscovery.discoverDevices();

    console.log('Device Discovery Test App initialized');
});

// Start as host
function startAsHost() {
    try {
        // Register as host
        const hostDevice = deviceDiscovery.registerDevice('host');
        
        // Update UI
        statusElement.textContent = `📡 Host Active - Waiting for connections`;
        statusElement.className = 'status host';
        
        // Start scanning for connecting devices
        deviceDiscovery.startScanning();
        
        // Update buttons
        startHostButton.textContent = '📡 Host Running';
        startHostButton.disabled = true;
        joinNetworkButton.disabled = true;
        
        console.log('Started as host:', hostDevice);
        
    } catch (error) {
        console.error('Error starting as host:', error);
        statusElement.textContent = '❌ Failed to start as host';
        statusElement.className = 'status error';
    }
}

// Join as client
function joinAsClient() {
    try {
        // Register as client
        const clientDevice = deviceDiscovery.registerDevice('client');
        
        // Update UI
        statusElement.textContent = `📱 Connected as Client - Discovering devices`;
        statusElement.className = 'status client';
        
        // Start scanning for other devices
        deviceDiscovery.startScanning();
        
        // Update buttons
        joinNetworkButton.textContent = '📱 Client Connected';
        joinNetworkButton.disabled = true;
        startHostButton.disabled = true;
        
        console.log('Joined as client:', clientDevice);
        
    } catch (error) {
        console.error('Error joining as client:', error);
        statusElement.textContent = '❌ Failed to join as client';
        statusElement.className = 'status error';
    }
}

// Clear all data and reset
function clearAllData() {
    // Stop scanning
    deviceDiscovery.stopScanning();
    
    // Clear device data
    deviceDiscovery.clearAllData();
    
    // Reset UI
    statusElement.textContent = 'Ready to test device discovery';
    statusElement.className = 'status';
    
    // Reset buttons
    startHostButton.textContent = '📡 Start as Host';
    startHostButton.disabled = false;
    joinNetworkButton.textContent = '📱 Join as Client';
    joinNetworkButton.disabled = false;
    
    console.log('All data cleared and app reset');
}

// Handle page unload (cleanup)
window.addEventListener('beforeunload', function() {
    deviceDiscovery.stopScanning();
});
