const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Configuration
const CONFIG = {
    mediaFolder: './media',
    tagsFile: './media-tags.json',
    supportedImages: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
    supportedVideos: ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v']
};

// Middleware
app.use(express.json()); // Allows server to read JSON from the browser
app.use('/media', express.static(path.resolve(CONFIG.mediaFolder))); // Serves your media files

// --- Helper Functions ---
function loadTags() {
    if (fs.existsSync(CONFIG.tagsFile)) {
        try {
            return JSON.parse(fs.readFileSync(CONFIG.tagsFile, 'utf8'));
        } catch (error) {
            return {};
        }
    }
    return {};
}

function scanDirectory(dirPath, mediaTags, parentFolder = null) {
    let results = [];
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            results = results.concat(scanDirectory(fullPath, mediaTags, item));
        } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            const isImage = CONFIG.supportedImages.includes(ext);
            const isVideo = CONFIG.supportedVideos.includes(ext);
            
            if (isImage || isVideo) {
                // Ensure the path formats match your old script exactly
                const relativePath = path.relative(__dirname, fullPath);
                const webPath = relativePath.replace(/\\/g, '/'); 
                
                results.push({
                    id: crypto.randomBytes(8).toString('hex'),
                    name: item,
                    path: webPath,
                    fileId: webPath, 
                    type: isImage ? 'image' : 'video',
                    category: parentFolder || 'uncategorized',
                    tags: mediaTags[webPath] || [],
                    size: stat.size,
                    modified: stat.mtime
                });
            }
        }
    });
    return results;
}

// --- Server Routes ---

// 1. Serve the Main Gallery
app.get('/', (req, res) => {
    try {
        const mediaTags = loadTags();
        const mediaFiles = scanDirectory(CONFIG.mediaFolder, mediaTags);
        
        // Sort by date descending
        mediaFiles.sort((a, b) => new Date(b.modified) - new Date(a.modified));

        const template = fs.readFileSync('./template.html', 'utf8');
        const finalHtml = template.replace(/\{\{\s*MEDIA_DATA\s*\}\}/g, JSON.stringify(mediaFiles, null, 2));
        
        res.send(finalHtml);
    } catch (error) {
        res.status(500).send("Error generating gallery: " + error.message);
    }
});

// 2. Silent API Endpoint to save tags
app.post('/save-tags', (req, res) => {
    try {
        const newTags = req.body;
        fs.writeFileSync(CONFIG.tagsFile, JSON.stringify(newTags, null, 2));
        console.log('✅ Tags auto-saved from browser!');
        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Failed to save tags:', error);
        res.status(500).send(error.message);
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🎬 Gallery Server Running!`);
    console.log(`👉 Open http://localhost:${PORT} in your browser`);
    console.log(`(Press Ctrl+C to stop the server)`);
});