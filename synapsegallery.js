const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
    mediaFolder: './media', // Change this to your media folder path (relative or absolute)
    outputFile: './gallery.html', // Output HTML file location
    tagsFile: './media-tags.json', // JSON file to store tags for each media file
    supportedImages: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
    supportedVideos: ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v'],
    useFileProtocol: false // Set to true if you want to use file:// protocol (may have CORS issues)
};

// Media collection
let mediaFiles = [];
let mediaTags = {};

// Get absolute path for the media folder
const absoluteMediaPath = path.resolve(CONFIG.mediaFolder);

// Load existing tags from JSON file
function loadTags() {
    if (fs.existsSync(CONFIG.tagsFile)) {
        try {
            const data = fs.readFileSync(CONFIG.tagsFile, 'utf8');
            mediaTags = JSON.parse(data);
            console.log(`📋 Loaded tags for ${Object.keys(mediaTags).length} files`);
        } catch (error) {
            console.warn('⚠️  Failed to load tags file, starting fresh:', error.message);
            mediaTags = {};
        }
    } else {
        console.log('📋 No tags file found, will create new one');
        mediaTags = {};
    }
}

// Save tags to JSON file
function saveTags() {
    try {
        fs.writeFileSync(CONFIG.tagsFile, JSON.stringify(mediaTags, null, 2));
        console.log(`✅ Saved tags to ${CONFIG.tagsFile}`);
    } catch (error) {
        console.error('❌ Failed to save tags:', error.message);
    }
}

// Scan directory recursively
function scanDirectory(dirPath, parentFolder = null) {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            // Recursive scan with folder name as category
            scanDirectory(fullPath, item);
        } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            const isImage = CONFIG.supportedImages.includes(ext);
            const isVideo = CONFIG.supportedVideos.includes(ext);
            
            if (isImage || isVideo) {
                // Create relative path from the HTML file location to the media file
                const relativePath = path.relative(path.dirname(CONFIG.outputFile), fullPath);
                const webPath = relativePath.replace(/\\/g, '/');
                
                // Use relative path as unique identifier for tags
                const fileId = webPath;
                
                // Get tags for this file (empty array if none)
                const fileTags = mediaTags[fileId] || [];
                
                mediaFiles.push({
                    id: crypto.randomBytes(8).toString('hex'),
                    name: item,
                    path: webPath,
                    fileId: fileId, // Used for tag lookup
                    type: isImage ? 'image' : 'video',
                    category: parentFolder || 'uncategorized',
                    tags: fileTags,
                    size: stat.size,
                    modified: stat.mtime
                });
            }
        }
    });
}

// Generate HTML with embedded tag saving functionality
function generateHTML() {
    mediaFiles.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    const tagsFilePath = path.relative(path.dirname(CONFIG.outputFile), CONFIG.tagsFile).replace(/\\/g, '/');

    try {
        let template = fs.readFileSync('./template.html', 'utf8');

        // USE REGEX FOR REPLACEMENT
        // This looks for {{MEDIA_DATA}} regardless of surrounding spaces
        const finalHtml = template
            .replace(/\{\{\s*MEDIA_DATA\s*\}\}/g, JSON.stringify(mediaFiles, null, 2))
            .replace(/\{\{\s*TAGS_FILE_PATH\s*\}\}/g, tagsFilePath);

        return finalHtml;
    } catch (error) {
        console.error("❌ Error reading template.html:", error.message);
        process.exit(1);
    }
}

// Main execution
console.log('🎬 Media Gallery Generator with Live Tags');
console.log('==========================================');
console.log(`📁 Scanning folder: ${absoluteMediaPath}`);

// Check if media folder exists
if (!fs.existsSync(CONFIG.mediaFolder)) {
    console.error(`❌ Media folder not found: ${CONFIG.mediaFolder}`);
    console.log('Please update the CONFIG.mediaFolder path in this script.');
    process.exit(1);
}

// Load existing tags
loadTags();

// Scan media folder
scanDirectory(CONFIG.mediaFolder);

console.log(`✅ Found ${mediaFiles.length} media files`);
console.log(`   - Images: ${mediaFiles.filter(m => m.type === 'image').length}`);
console.log(`   - Videos: ${mediaFiles.filter(m => m.type === 'video').length}`);
console.log(`   - Files with tags: ${mediaFiles.filter(m => m.tags.length > 0).length}`);

if (mediaFiles.length === 0) {
    console.warn('⚠️  No media files found! Check that your folder contains supported formats.');
}

// Generate HTML
const html = generateHTML();
fs.writeFileSync(CONFIG.outputFile, html);

console.log(`\n✅ Generated HTML: ${path.resolve(CONFIG.outputFile)}`);
console.log(`✅ Tags file: ${path.resolve(CONFIG.tagsFile)}`);
console.log('\n🎉 Success! Your media gallery has been generated.');
console.log('\n📝 Instructions:');
console.log('   1. Open the HTML file directly in your browser');
console.log('   2. The HTML references your media files using relative paths');
console.log('   3. Keep the HTML file and media folder in their relative positions');
console.log('\n🏷️  Live Tagging System:');
console.log('   • Add/remove tags directly in the browser UI');
console.log('   • Click "🏷️ Edit Tags" button in modal view');
console.log('   • Press Ctrl+S (or Cmd+S on Mac) to download updated tags JSON');
console.log('   • Replace your media-tags.json with the downloaded file');
console.log('   • Re-run this script to regenerate the HTML with saved tags');
console.log('\n🎮 Complete Controls:');
console.log('');
console.log('GALLERY VIEW:');
console.log('   • Ctrl + Scroll Wheel: Zoom thumbnails in/out');
console.log('   • Click +/- buttons: Adjust thumbnail size');
console.log('   • Category dropdown: Select multiple categories');
console.log('   • Tags dropdown: Filter by tags');
console.log('   • Search bar: Filter by name, category, or tags');
console.log('');
console.log('MODAL VIEW (Single Media):');
console.log('   • 🏷️ Edit Tags button: Open tag editor');
console.log('   • Rotation buttons: Rotate 90° left/right or reset');
console.log('   • R key: Rotate 90° clockwise');
console.log('   • C key: Add to comparison view');
console.log('   • Scroll Wheel: Zoom in/out');
console.log('   • Click & Drag: Pan when zoomed');
console.log('   • Left/Right Arrows: Navigate between media');
console.log('   • Up/Down Arrows: Adjust video volume');
console.log('   • Ctrl+S (Cmd+S): Save/export tags to JSON file');
console.log('   • Escape: Close modal or tag editor');
console.log('');
console.log('MULTI-VIEW MODE (Compare up to 4 media):');
console.log('   • + Add to Compare button: Add current media to grid');
console.log('   • Rotation buttons: Rotate all media simultaneously');
console.log('   • R key: Rotate all media 90° clockwise');
console.log('   • × button on each slot: Remove from comparison');
console.log('   • Clear All button: Exit multi-view mode');
console.log('   • Videos play simultaneously when in grid');
console.log('');
console.log('TAG EDITOR:');
console.log('   • Type tag name - autocomplete suggests existing tags');
console.log('   • Arrow keys: Navigate autocomplete suggestions');
console.log('   • Enter: Select suggestion or add new tag');
console.log('   • Click × to remove a tag');
console.log('   • Click suggestions to quickly add existing tags');
console.log('   • Changes are immediate in the UI');
console.log('   • Press Ctrl+S to download updated tags');
console.log('');
console.log('💡 Workflow:');
console.log('   1. Open gallery.html in your browser');
console.log('   2. Browse media and add tags using the UI');
console.log('   3. Use R to rotate media for better viewing');
console.log('   4. Use C to compare up to 4 media side-by-side');
console.log('   5. Press Ctrl+S to download the updated media-tags.json');
console.log('   6. Replace the old media-tags.json with the downloaded one');
console.log('   7. Re-run this script to regenerate with your new tags');
console.log(`\n📂 Your media files remain in: ${absoluteMediaPath}`);