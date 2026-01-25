const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
    res.send('StudyConnect - Minimal Server Running');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on 0.0.0.0:${PORT}`);
});