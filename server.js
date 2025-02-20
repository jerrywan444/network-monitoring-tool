// server.js
const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());

let devices = [];
let dataLimit = 1000; // Default limit in MB

// Scan network
app.post('/api/scan', (req, res) => {
    exec('nmap -sn 192.168.1.0/24', (error, stdout) => {
        if (error) {
            console.error('Scan error:', error);
            return res.status(500).json({ error: 'Network scan failed' });
        }

        devices = parseNmapOutput(stdout);
        monitorTraffic();
        res.json({ devices });
    });
});

// Set data limit
app.post('/api/set-limit', (req, res) => {
    dataLimit = req.body.limit;
    monitorTraffic();
    res.status(200).json({ message: 'Limit updated' });
});

// Kick device
app.post('/api/kick', (req, res) => {
    const { mac } = req.body;
    exec(`arp -n | grep ${mac} | awk '{print $1}'`, (error, stdout) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to get IP' });
        }

        const ip = stdout.trim();
        exec(`iptables -A INPUT -s ${ip} -j DROP && iptables -A OUTPUT -d ${ip} -j DROP`, 
            (error) => {
                if (error) {
                    console.error('Kick error:', error);
                    return res.status(500).json({ error: 'Failed to kick device' });
                }
                devices = devices.filter(d => d.mac !== mac);
                res.status(200).json({ message: 'Device kicked' });
            }
        );
    });
});

function parseNmapOutput(output) {
    const devices = [];
    const lines = output.split('\n');
    let currentDevice = {};

    lines.forEach(line => {
        if (line.includes('Nmap scan report')) {
            currentDevice.ip = line.split(' ').pop().replace(/[()]/g, '');
        }
        if (line.includes('MAC Address')) {
            currentDevice.mac = line.split(' ')[2];
            currentDevice.name = line.split('(')[1]?.replace(')', '');
            currentDevice.connectionType = Math.random() > 0.5 ? 'Wired' : 'Wireless';
            currentDevice.dataUsage = 0; // Will be updated by traffic monitoring
            currentDevice.status = 'Active';
            devices.push({ ...currentDevice });
            currentDevice = {};
        }
    });
    return devices;
}

function monitorTraffic() {
    // Simulated traffic monitoring - replace with actual implementation
    devices = devices.map(device => {
        const simulatedUsage = device.dataUsage + (Math.random() * 5);
        const exceedsLimit = simulatedUsage > dataLimit;
        
        if (exceedsLimit && device.status !== 'Limited') {
            limitDeviceBandwidth(device.mac);
        }

        return {
            ...device,
            dataUsage: simulatedUsage,
            status: exceedsLimit ? 'Limited' : 'Active'
        };
    });
}

function limitDeviceBandwidth(mac) {
    // Limit bandwidth to 100KB/s as an example
    exec(`iptables -A FORWARD -m mac --mac-source ${mac} -m limit --limit 100kb/s -j ACCEPT`, 
        (error) => {
            if (error) console.error(`Bandwidth limit error for ${mac}:`, error);
        }
    );
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    setInterval(monitorTraffic, 5000); // Update traffic every 5 seconds
});
