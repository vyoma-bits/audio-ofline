// PWA Install Handler
let deferredPrompt;
let isInstalled = false;

// Check if app is already installed
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA: Install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    showInstallPrompt();
});

// Show install prompt
function showInstallPrompt() {
    const installPrompt = document.getElementById('installPrompt');
    const installButton = document.getElementById('installButton');
    
    if (!isInstalled && deferredPrompt) {
        installPrompt.classList.add('show');
        
        installButton.addEventListener('click', async () => {
            installPrompt.classList.remove('show');
            deferredPrompt.prompt();
            
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA: User response: ${outcome}`);
            deferredPrompt = null;
        });
    }
}

// Detect if app was installed
window.addEventListener('appinstalled', (evt) => {
    console.log('PWA: App was installed');
    isInstalled = true;
    document.getElementById('installPrompt').style.display = 'none';
});

// Audio Stream Host Class
class AudioStreamHost {
    constructor() {
        this.peerConnections = new Map();
        this.localStream = null;
        this.connectionStorage = new Map();
        this.isOnline = navigator.onLine;
    }

    async startAsHost() {
        try {
            // Check if we're in PWA mode
            if (!this.isPWAMode()) {
                this.showPWARecommendation();
            }

            // Get microphone access
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Create offer for others to connect
            const offer = await this.createOffer();
            
            // Generate short connection ID
            const connectionId = this.generateShortId();
            
            // Store full offer with short ID (offline storage)
            localStorage.setItem(`host_${connectionId}`, JSON.stringify(offer));
            this.connectionStorage.set(connectionId, offer);
            
            // Update UI
            document.getElementById('connectionCode').style.display = 'block';
            document.getElementById('codeText').textContent = connectionId;
            document.getElementById('status').innerHTML = 
                `🟢 Host Active - Code: <strong>${connectionId}</strong>`;
            document.getElementById('toggleMic').style.display = 'block';

            // Start listening for client answers
            this.listenForClientAnswers(connectionId);

            // Show success notification if supported
            this.showNotification('Host Started', `Share code: ${connectionId}`);

        } catch (error) {
            console.error('Failed to start host:', error);
            document.getElementById('status').innerHTML = '❌ Failed to start: ' + error.message;
        }
    }

    // Check if running as PWA
    isPWAMode() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    }

    // Show PWA recommendation
    showPWARecommendation() {
        if (!isInstalled && window.innerWidth <= 768) {
            console.log('PWA: Recommending installation for better offline experience');
        }
    }

    // Generate simple 6-character connection ID
    generateShortId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async createOffer() {
        const pc = new RTCPeerConnection({ 
            iceServers: [],
            iceCandidatePoolSize: 10
        });
        
        // Add local audio stream
        this.localStream.getTracks().forEach(track => {
            pc.addTrack(track, this.localStream);
        });

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
            this.updateConnectionStatus();
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        return offer;
    }

    // Listen for client answers and establish connections
    listenForClientAnswers(connectionId) {
        const checkInterval = setInterval(() => {
            const answerKey = `client_answer_${connectionId}`;
            const storedAnswer = localStorage.getItem(answerKey);
            
            if (storedAnswer && !this.peerConnections.has(answerKey)) {
                this.handleClientAnswer(JSON.parse(storedAnswer), answerKey);
                localStorage.removeItem(answerKey);
            }
        }, 2000);

        // Store interval for cleanup
        this.answerCheckInterval = checkInterval;
    }

    async handleClientAnswer(answer, clientId) {
        try {
            const pc = new RTCPeerConnection({ iceServers: [] });
            
            // Add local stream to this connection
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });

            // Handle remote audio
            pc.ontrack = (event) => {
                console.log('Client audio connected:', clientId);
            };

            // Set remote description (client's answer)
            await pc.setRemoteDescription(answer);
            
            // Store this peer connection
            this.peerConnections.set(clientId, pc);
            
            // Update UI
            this.updateConnectedCount();
            
        } catch (error) {
            console.error('Failed to handle client answer:', error);
        }
    }

    updateConnectedCount() {
        const count = this.peerConnections.size;
        document.getElementById('status').innerHTML = 
            `🟢 Host Active - ${count} client(s) connected`;
        
        // Show notification for new connections
        if (count > 0) {
            this.showNotification('New Connection', `${count} device(s) connected`);
        }
    }

    updateConnectionStatus() {
        // Update UI based on connection states
        const networkStatus = document.getElementById('networkStatus');
        if (this.isOnline) {
            networkStatus.className = 'network-status connected';
            networkStatus.innerHTML = '📶 Connected - Ready for audio sharing';
        }
    }

    // Show notification if supported
    showNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/icon-96x96.png',
                badge: '/icon-72x72.png',
                silent: true
            });
        }
    }
}

// Audio Stream Client Class
class AudioStreamClient {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    async joinGroup() {
        const connectionId = prompt('Enter connection code (e.g., ABC123):');
        if (!connectionId) return;

        try {
            // Look for host's offer using the short ID
            const hostOfferKey = `host_${connectionId.toUpperCase()}`;
            const storedOffer = localStorage.getItem(hostOfferKey);
            
            if (!storedOffer) {
                document.getElementById('status').innerHTML = 
                    '❌ Connection code not found. Make sure you\'re connected to host\'s WiFi.';
                return;
            }

            const offer = JSON.parse(storedOffer);

            // Get microphone access
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Create peer connection
            this.peerConnection = new RTCPeerConnection({ 
                iceServers: [],
                iceCandidatePoolSize: 10
            });

            // Add local stream
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Handle remote audio (from host and other clients)
            this.peerConnection.ontrack = (event) => {
                const audio = new Audio();
                audio.srcObject = event.streams[0];
                audio.play().catch(e => console.log('Audio play failed:', e));
            };

            // Handle connection state
            this.peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', this.peerConnection.connectionState);
                if (this.peerConnection.connectionState === 'disconnected') {
                    this.handleReconnection(connectionId);
                }
            };

            // Set host's offer as remote description
            await this.peerConnection.setRemoteDescription(offer);
            
            // Create answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // Store answer for host to pick up
            const answerKey = `client_answer_${connectionId.toUpperCase()}`;
            localStorage.setItem(answerKey, JSON.stringify(answer));

            // Update UI
            document.getElementById('status').innerHTML = 
                '🟢 Connected to group - You can now talk and listen';
            document.getElementById('toggleMic').style.display = 'block';

            // Show success notification
            this.showNotification('Connected', 'You can now share audio with the group');

        } catch (error) {
            console.error('Failed to join group:', error);
            document.getElementById('status').innerHTML = '❌ Failed to join: ' + error.message;
        }
    }

    // Handle reconnection attempts
    async handleReconnection(connectionId) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            document.getElementById('status').innerHTML = 
                `🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`;
            
            setTimeout(() => {
                this.joinGroup();
            }, 2000);
        } else {
            document.getElementById('status').innerHTML = 
                '❌ Connection lost. Please rejoin manually.';
        }
    }

    showNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/icon-96x96.png',
                silent: true
            });
        }
    }
}

// FIXED: Simplified network connection checker
async function checkNetworkConnection() {
    // Simple check: just verify browser thinks we're online
    if (!navigator.onLine) {
        return false;
    }
    
    // Additional check: if we can access localStorage, assume we're connected
    try {
        localStorage.setItem('connectivity-test', 'test');
        localStorage.removeItem('connectivity-test');
        return true;
    } catch (e) {
        return false;
    }
}

// Alternative: Even simpler check that always passes if browser is online
function checkNetworkConnectionSimple() {
    return navigator.onLine;
}

// Initialize PWA and app when page loads
let audioApp = null;

document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // FIXED: Simplified network status check
    setInterval(() => {
        const networkStatus = document.getElementById('networkStatus');
        
        if (navigator.onLine) {
            networkStatus.className = 'network-status connected';
            networkStatus.innerHTML = '📶 WiFi Connected - Ready to join';
            document.getElementById('joinGroup').disabled = false;
        } else {
            networkStatus.className = 'network-status disconnected';
            networkStatus.innerHTML = '❌ Check your WiFi connection';
            document.getElementById('joinGroup').disabled = true;
        }
    }, 3000);

    // Button event listeners
    document.getElementById('startHost').addEventListener('click', () => {
        audioApp = new AudioStreamHost();
        audioApp.startAsHost();
    });

    // FIXED: Removed complex network check
    document.getElementById('joinGroup').addEventListener('click', () => {
        // Simple check: only verify browser is online
        if (!navigator.onLine) {
            document.getElementById('status').innerHTML = 
                '⚠️ You appear to be offline. Connect to host\'s WiFi first!';
            return;
        }
        
        audioApp = new AudioStreamClient();
        audioApp.joinGroup();
    });

    document.getElementById('toggleMic').addEventListener('click', () => {
        if (audioApp && audioApp.localStream) {
            const audioTrack = audioApp.localStream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            
            const button = document.getElementById('toggleMic');
            if (audioTrack.enabled) {
                button.innerHTML = '<span>🎤</span> Mute Microphone';
                button.className = 'button warning';
            } else {
                button.innerHTML = '<span>🔇</span> Unmute Microphone';
                button.className = 'button secondary';
            }
        }
    });

    // Clear old connection data on page load
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('host_') || key.startsWith('client_answer_')) {
            localStorage.removeItem(key);
        }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
        console.log('PWA: Back online');
        const networkStatus = document.getElementById('networkStatus');
        networkStatus.className = 'network-status connected';
        networkStatus.innerHTML = '🔄 Connection restored';
    });

    window.addEventListener('offline', () => {
        console.log('PWA: Gone offline');
        const networkStatus = document.getElementById('networkStatus');
        networkStatus.className = 'network-status disconnected';
        networkStatus.innerHTML = '⚠️ Working offline';
    });
});

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log('PWA: Service Worker registered successfully:', registration.scope);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    console.log('PWA: New version available');
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available, show update prompt
                            if (confirm('New version available! Reload to update?')) {
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch((error) => {
                console.log('PWA: Service Worker registration failed:', error);
            });
    });
}
