// public/script.js
document.getElementById('scanNetwork').addEventListener('click', scanNetwork);
document.getElementById('applyLimit').addEventListener('click', setDataLimit);

async function scanNetwork() {
    try {
        const response = await fetch('/api/scan', { method: 'POST' });
        const data = await response.json();
        updateDeviceList(data.devices);
    } catch (error) {
        showStatus('Error scanning network');
        console.error(error);
    }
}

async function setDataLimit() {
    const limit = document.getElementById('dataLimit').value;
    if (!limit) return showStatus('Please enter a valid limit');

    try {
        await fetch('/api/set-limit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: parseInt(limit) })
        });
        showStatus('Limit updated successfully');
        scanNetwork();
    } catch (error) {
        showStatus('Error setting limit');
        console.error(error);
    }
}

async function kickDevice(mac) {
    if (!confirm('Are you sure you want to kick this device?')) return;

    try {
        await fetch('/api/kick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mac })
        });
        showStatus('Device disconnected');
        scanNetwork();
    } catch (error) {
        showStatus('Error kicking device');
        console.error(error);
    }
}

function updateDeviceList(devices) {
    const deviceList = document.getElementById('deviceList');
    deviceList.innerHTML = '';

    devices.forEach(device => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${device.name || 'Unknown'}</td>
            <td>${device.mac}</td>
            <td>${device.ip}</td>
            <td>${device.dataUsage.toFixed(2)}</td>
            <td>${device.connectionType}</td>
            <td class="status-${device.status.toLowerCase()}">${device.status}</td>
            <td><button class="kick-btn" onclick="kickDevice('${device.mac}')">Kick</button></td>
        `;
        deviceList.appendChild(row);
    });
}

function showStatus(message) {
    const status = document.getElementById('status');
    status.textContent = message;
    setTimeout(() => status.textContent = '', 3000);
}

// Auto-refresh every 10 seconds
setInterval(scanNetwork, 10000);
