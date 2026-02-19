const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
    mediaFolder: './root media folder', // Change this to your media folder path (relative or absolute)
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
    // Sort media by date descending (newest first) by default
    mediaFiles.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    // Get all unique tags across all media
    const allTags = [...new Set(mediaFiles.flatMap(m => m.tags))].sort();
    
    // Calculate relative path from HTML to tags file
    const tagsFilePath = path.relative(path.dirname(CONFIG.outputFile), CONFIG.tagsFile).replace(/\\/g, '/');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Media Gallery with Tags</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #0f0f0f;
            color: #fff;
            min-height: 100vh;
        }
        
        header {
            background: #1a1a1a;
            padding: 1rem 2rem;
            position: sticky;
            top: 0;
            z-index: 100;
            border-bottom: 1px solid #333;
        }
        
        .header-content {
            max-width: 1600px;
            margin: 0 auto;
        }
        
        h1 {
            font-size: 1.8rem;
            margin-bottom: 1rem;
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .filters {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .filter-group {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }
        
        .filter-group label {
            font-size: 0.9rem;
            color: #999;
        }
        
        select, input[type="text"] {
            padding: 0.5rem 1rem;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            color: #fff;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        select:hover, input[type="text"]:hover {
            border-color: #666;
        }
        
        select:focus, input[type="text"]:focus {
            outline: none;
            border-color: #4ecdc4;
        }

        /* --- Custom Multi-Select Dropdown Styles --- */
        .custom-select-wrapper {
            position: relative;
            display: inline-block;
        }

        .custom-select-trigger {
            padding: 0.5rem 1rem;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            color: #fff;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-width: 200px;
        }

        .custom-select-trigger:hover {
            border-color: #666;
        }

        .custom-select-trigger::after {
            content: '▼';
            font-size: 0.6em;
            margin-left: 10px;
            color: #999;
        }

        .custom-select-options {
            display: none;
            position: absolute;
            top: 110%;
            left: 0;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            padding: 0.5rem;
            z-index: 101;
            max-height: 250px;
            overflow-y: auto;
            min-width: 200px;
        }

        .custom-select-wrapper.open .custom-select-options {
            display: block;
        }

        .custom-select-options label {
            display: block;
            padding: 0.5rem;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
        }
        .custom-select-options label:hover {
            background: #3a3a3a;
        }

        .custom-select-options input[type="checkbox"] {
            margin-right: 0.5rem;
        }
        /* --- End Custom Multi-Select Styles --- */
        
        .zoom-controls {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }
        
        .zoom-btn {
            padding: 0.5rem 0.8rem;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            color: #fff;
            cursor: pointer;
            font-size: 1.2rem;
            transition: all 0.3s ease;
        }
        
        .zoom-btn:hover {
            background: #3a3a3a;
            border-color: #666;
        }
        
        .zoom-level {
            font-size: 0.85rem;
            color: #999;
            min-width: 45px;
            text-align: center;
        }
        
        .stats {
            margin-top: 1rem;
            font-size: 0.85rem;
            color: #777;
        }
        
        .container {
            max-width: 1600px;
            margin: 2rem auto;
            padding: 0 2rem;
        }
        
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(var(--grid-size, 350px), 1fr));
            gap: 1rem;
            animation: fadeIn 0.5s ease;
            transition: all 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .media-item {
            background: #1a1a1a;
            border-radius: 8px;
            overflow: hidden;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .media-item:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 12px rgba(0,0,0,0.5);
        }
        
        .media-preview {
            position: relative;
            width: 100%;
            padding-bottom: 75%; /* 4:3 aspect ratio */
            background: #000;
            overflow: hidden;
        }
        
        .media-preview img,
        .media-preview video {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        
        .media-item:hover .media-preview img,
        .media-item:hover .media-preview video {
            transform: scale(1.05);
        }
        
        .media-type-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            padding: 0.2rem 0.4rem;
            background: rgba(0,0,0,0.7);
            border-radius: 4px;
            font-size: 0.65rem;
            font-weight: 600;
            text-transform: uppercase;
            backdrop-filter: blur(10px);
            z-index: 1;
        }
        
        .media-type-badge.video {
            background: rgba(255, 0, 0, 0.8);
        }
        
        .media-type-badge.image {
            background: rgba(0, 150, 255, 0.8);
        }
        
        .play-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 50px;
            height: 50px;
            background: rgba(0,0,0,0.7);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
            transition: all 0.3s ease;
            pointer-events: none;
        }
        
        .media-item:hover .play-overlay {
            background: rgba(255,0,0,0.8);
            transform: translate(-50%, -50%) scale(1.1);
        }
        
        .play-overlay::after {
            content: '';
            width: 0;
            height: 0;
            border-left: 18px solid #fff;
            border-top: 10px solid transparent;
            border-bottom: 10px solid transparent;
            margin-left: 3px;
        }
        
        .media-info {
            padding: 0.5rem 0.7rem;
            font-size: 0.7rem;
            background: #1a1a1a;
        }
        
        .media-title {
            font-size: 0.7rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #999;
            margin-bottom: 0.2rem;
        }
        
        .media-category {
            display: inline-block;
            padding: 0.1rem 0.3rem;
            background: #2a2a2a;
            border-radius: 3px;
            font-size: 0.65rem;
            color: #4ecdc4;
            margin-right: 0.3rem;
        }

        .media-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.2rem;
            margin-top: 0.3rem;
        }

        .media-tag {
            display: inline-block;
            padding: 0.1rem 0.3rem;
            background: #3a2a4a;
            border-radius: 3px;
            font-size: 0.6rem;
            color: #c084fc;
        }
        
        .media-meta {
            font-size: 0.65rem;
            color: #555;
            display: inline-block;
        }

        /* Tag Editor in Modal */
        .tag-editor {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(26, 26, 26, 0.95);
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid #444;
            z-index: 1002;
            min-width: 400px;
            max-width: 600px;
            backdrop-filter: blur(10px);
        }

        .tag-editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.5rem;
        }

        .tag-editor-title {
            font-size: 0.9rem;
            color: #4ecdc4;
            font-weight: 600;
        }

        .tag-editor-close {
            background: none;
            border: none;
            color: #999;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }

        .tag-editor-close:hover {
            color: #ff6b6b;
        }

        .tag-input-group {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }

        .tag-input {
            flex: 1;
            padding: 0.5rem;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 4px;
            color: #fff;
            font-size: 0.85rem;
        }

        .tag-add-btn {
            padding: 0.5rem 1rem;
            background: #4ecdc4;
            border: none;
            border-radius: 4px;
            color: #000;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s ease;
        }

        .tag-add-btn:hover {
            background: #3ab5ad;
        }

        .current-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.3rem;
            margin-top: 0.5rem;
        }

        .current-tag {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.3rem 0.5rem;
            background: #3a2a4a;
            border-radius: 4px;
            font-size: 0.75rem;
            color: #c084fc;
        }

        .current-tag-remove {
            background: none;
            border: none;
            color: #ff6b6b;
            cursor: pointer;
            font-size: 1rem;
            line-height: 1;
            padding: 0;
        }

        .current-tag-remove:hover {
            color: #ff5252;
        }

        .tag-suggestions {
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            border-top: 1px solid #333;
        }

        .tag-suggestions-title {
            font-size: 0.75rem;
            color: #999;
            margin-bottom: 0.3rem;
        }

        .tag-suggestion {
            display: inline-block;
            padding: 0.2rem 0.4rem;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 4px;
            font-size: 0.7rem;
            color: #999;
            margin-right: 0.3rem;
            margin-bottom: 0.3rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .tag-suggestion:hover {
            background: #3a3a3a;
            border-color: #c084fc;
            color: #c084fc;
        }

        /* Autocomplete for tag input */
        .tag-autocomplete {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #1a1a1a;
            border: 1px solid #444;
            border-top: none;
            border-radius: 0 0 4px 4px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 10;
            display: none;
        }

        .tag-autocomplete.show {
            display: block;
        }

        .tag-autocomplete-item {
            padding: 0.5rem;
            cursor: pointer;
            font-size: 0.85rem;
            color: #fff;
            transition: background 0.2s;
        }

        .tag-autocomplete-item:hover,
        .tag-autocomplete-item.selected {
            background: #3a2a4a;
            color: #c084fc;
        }

        .tag-autocomplete-item mark {
            background: #c084fc;
            color: #000;
            padding: 0 0.2rem;
            border-radius: 2px;
        }

        .tag-input-wrapper {
            position: relative;
            flex: 1;
        }

        .edit-tags-btn {
            position: absolute;
            bottom: 20px;
            right: 20px;
            padding: 0.5rem 1rem;
            background: rgba(78, 205, 196, 0.9);
            border: none;
            border-radius: 6px;
            color: #000;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            z-index: 1001;
            font-size: 0.85rem;
        }

        .edit-tags-btn:hover {
            background: rgba(78, 205, 196, 1);
            transform: scale(1.05);
        }

        /* Save notification */
        .save-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: rgba(78, 205, 196, 0.95);
            color: #000;
            border-radius: 6px;
            font-weight: 600;
            z-index: 2000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .save-notification.error {
            background: rgba(255, 107, 107, 0.95);
            color: #fff;
        }

        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        .save-notification.hiding {
            animation: slideOut 0.3s ease forwards;
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
        
        /* Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            z-index: 1000;
            animation: fadeIn 0.3s ease;
        }
        
        .modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 90%;
            height: 90%;
            overflow: hidden;
        }
        
        .modal-content img,
        .modal-content video {
            max-width: 100%;
            max-height: 100%;
            border-radius: 8px;
            position: absolute;
            cursor: grab;
            user-select: none;
        }
        
        .modal-content img.dragging,
        .modal-content video.dragging {
            cursor: grabbing;
        }
        
        .modal-close {
            position: absolute;
            top: 20px;
            right: 40px;
            font-size: 3rem;
            color: #fff;
            cursor: pointer;
            transition: color 0.3s ease;
            background: none;
            border: none;
            z-index: 1001;
        }
        
        .modal-close:hover {
            color: #ff6b6b;
        }
        
        .modal-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            font-size: 2rem;
            color: #fff;
            cursor: pointer;
            background: rgba(0,0,0,0.5);
            border: none;
            padding: 1rem;
            border-radius: 8px;
            transition: all 0.3s ease;
            z-index: 1001;
        }
        
        .modal-nav:hover {
            background: rgba(0,0,0,0.8);
        }
        
        .modal-prev {
            left: 20px;
        }
        
        .modal-next {
            right: 20px;
        }
        
        .volume-indicator {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            padding: 0.5rem 1rem;
            border-radius: 6px;
            color: #4ecdc4;
            font-size: 0.9rem;
            display: none;
            z-index: 1001;
        }
        
        .volume-indicator.show {
            display: block;
            animation: fadeInOut 1s ease;
        }
        
        @keyframes fadeInOut {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
        }
        
        .no-results {
            text-align: center;
            padding: 3rem;
            color: #666;
        }
        
        .error-message {
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid rgba(255, 0, 0, 0.3);
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
            color: #ff6b6b;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .gallery {
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 0.5rem;
            }
            
            header {
                padding: 1rem;
            }
            
            .container {
                padding: 0 1rem;
            }
            
            .modal-nav {
                display: none;
            }
            
            .zoom-controls {
                display: none;
            }

            .tag-editor {
                min-width: 90%;
                bottom: 10px;
            }

            .edit-tags-btn {
                bottom: 10px;
                right: 10px;
                font-size: 0.75rem;
                padding: 0.4rem 0.8rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="header-content">
            <h1>Media Gallery with Tags</h1>
            <div class="filters">
                <div class="filter-group">
                    <label>Type:</label>
                    <select id="typeFilter">
                        <option value="all">All Media</option>
                        <option value="image">Images Only</option>
                        <option value="video">Videos Only</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Sort by:</label>
                    <select id="sortOrder">
                        <option value="date_desc">Date (Newest First)</option>
                        <option value="date_asc">Date (Oldest First)</option>
                    </select>
                </div>
                 <div class="filter-group">
                    <label for="categoryFilterTrigger">Categories:</label>
                    <div class="custom-select-wrapper" id="categoryFilterWrapper">
                        <div class="custom-select-trigger" id="categoryFilterTrigger">
                            <span>All Categories</span>
                        </div>
                        <div class="custom-select-options" id="categoryFilterOptions">
                        </div>
                    </div>
                </div>
                <div class="filter-group">
                    <label for="tagFilterTrigger">Tags:</label>
                    <div class="custom-select-wrapper" id="tagFilterWrapper">
                        <div class="custom-select-trigger" id="tagFilterTrigger">
                            <span>All Tags</span>
                        </div>
                        <div class="custom-select-options" id="tagFilterOptions">
                        </div>
                    </div>
                </div>
                <div class="filter-group">
                    <label>Search:</label>
                    <input type="text" id="searchInput" placeholder="Search by name or category...">
                </div>
                <div class="zoom-controls">
                    <button class="zoom-btn" onclick="adjustZoom(-1)">−</button>
                    <span class="zoom-level" id="zoomLevel">100%</span>
                    <button class="zoom-btn" onclick="adjustZoom(1)">+</button>
                </div>
            </div>
            <div class="stats" id="stats"></div>
        </div>
    </header>
    
    <div class="container">
        <div id="errorMessage" class="error-message" style="display: none;"></div>
        <div class="gallery" id="gallery"></div>
        <div class="no-results" id="noResults" style="display: none;">
            No media files found matching your criteria.
        </div>
    </div>
    
    <div class="modal" id="modal">
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <button class="modal-nav modal-prev" onclick="navigateModal(-1)">&#8249;</button>
        <button class="modal-nav modal-next" onclick="navigateModal(1)">&#8250;</button>
        <button class="edit-tags-btn" onclick="toggleTagEditor()">🏷️ Edit Tags</button>
        <div class="modal-content" id="modalContent"></div>
        <div class="volume-indicator" id="volumeIndicator"></div>
        <div class="tag-editor" id="tagEditor" style="display: none;">
            <div class="tag-editor-header">
                <span class="tag-editor-title">Edit Tags</span>
                <button class="tag-editor-close" onclick="toggleTagEditor()">&times;</button>
            </div>
            <div class="tag-input-group">
                <div class="tag-input-wrapper">
                    <input type="text" class="tag-input" id="tagInput" placeholder="Enter tag name..." autocomplete="off">
                    <div class="tag-autocomplete" id="tagAutocomplete"></div>
                </div>
                <button class="tag-add-btn" onclick="addTag()">Add</button>
            </div>
            <div class="current-tags" id="currentTags"></div>
            <div class="tag-suggestions">
                <div class="tag-suggestions-title">Suggestions (click to add):</div>
                <div id="tagSuggestions"></div>
            </div>
        </div>
    </div>
    
    <script>
        // Media data embedded during generation
        const mediaData = ${JSON.stringify(mediaFiles, null, 2)};
        
        // Tags file path relative to HTML
        const TAGS_FILE_PATH = '${tagsFilePath}';
        
        // Global variables
        let filteredMedia = [...mediaData];
        let currentModalIndex = -1;
        let currentZoom = 100;
        let modalZoom = 1;
        let modalPanX = 0;
        let modalPanY = 0;
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let volumeTimeout = null;
        let tagEditorOpen = false;
        let autocompleteSelectedIndex = -1;
        let autocompleteMatches = [];
        
        // Check if media data is empty
        if (mediaData.length === 0) {
            document.getElementById('errorMessage').style.display = 'block';
            document.getElementById('errorMessage').innerHTML = 
                'No media files found. Please check that:<br>' +
                '1. The media folder path is correct<br>' +
                '2. The folder contains supported media files<br>' +
                '3. Supported formats: Images (jpg, jpeg, png, gif, webp, bmp, svg), Videos (mp4, webm, ogg, mov, avi, mkv, m4v)';
        }
        
        // Get all unique tags from all media
        function getAllTags() {
            return [...new Set(mediaData.flatMap(m => m.tags))].sort();
        }
        
        // Show notification
        function showNotification(message, isError = false) {
            const notification = document.createElement('div');
            notification.className = 'save-notification' + (isError ? ' error' : '');
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.classList.add('hiding');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
        
        // Save tags to JSON file
        async function saveTagsToFile() {
            try {
                // Create tags object mapping fileId to tags array
                const tagsData = {};
                mediaData.forEach(media => {
                    if (media.tags && media.tags.length > 0) {
                        tagsData[media.fileId] = media.tags;
                    }
                });
                
                // Convert to JSON string
                const jsonContent = JSON.stringify(tagsData, null, 2);
                
                // Create a blob and download link
                const blob = new Blob([jsonContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'media-tags.json';
                a.click();
                URL.revokeObjectURL(url);
                
                showNotification('✅ Tags exported! Save the downloaded file as: ' + TAGS_FILE_PATH);
                console.log('Tags saved:', tagsData);
                
            } catch (error) {
                console.error('Error saving tags:', error);
                showNotification('❌ Error saving tags: ' + error.message, true);
            }
        }
        
        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Initializing gallery with', mediaData.length, 'files');
            populateCategoryFilter();
            populateTagFilter();
            applyFiltersAndSort();
            
            // Event listeners
            const categoryWrapper = document.getElementById('categoryFilterWrapper');
            const categoryTrigger = document.getElementById('categoryFilterTrigger');
            const categoryOptions = document.getElementById('categoryFilterOptions');
            
            const tagWrapper = document.getElementById('tagFilterWrapper');
            const tagTrigger = document.getElementById('tagFilterTrigger');
            const tagOptions = document.getElementById('tagFilterOptions');
            
            document.getElementById('typeFilter').addEventListener('change', applyFiltersAndSort);
            document.getElementById('searchInput').addEventListener('input', applyFiltersAndSort);
            document.getElementById('sortOrder').addEventListener('change', applyFiltersAndSort);
            
            // Custom dropdown logic for categories
            categoryTrigger.addEventListener('click', () => {
                categoryWrapper.classList.toggle('open');
                tagWrapper.classList.remove('open');
            });
            
            // Custom dropdown logic for tags
            tagTrigger.addEventListener('click', () => {
                tagWrapper.classList.toggle('open');
                categoryWrapper.classList.remove('open');
            });
            
            window.addEventListener('click', (e) => {
                if (!categoryWrapper.contains(e.target)) {
                    categoryWrapper.classList.remove('open');
                }
                if (!tagWrapper.contains(e.target)) {
                    tagWrapper.classList.remove('open');
                }
            });
            
            categoryOptions.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    handleCategorySelection(e.target);
                    applyFiltersAndSort();
                }
            });
            
            tagOptions.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    handleTagSelection(e.target);
                    applyFiltersAndSort();
                }
            });

            // Tag input autocomplete and enter key
            const tagInput = document.getElementById('tagInput');
            const tagAutocomplete = document.getElementById('tagAutocomplete');
            
            tagInput.addEventListener('input', (e) => {
                handleTagAutocomplete(e.target.value);
            });
            
            tagInput.addEventListener('keydown', (e) => {
                const autocompleteVisible = tagAutocomplete.classList.contains('show');
                
                if (e.key === 'Enter') {
                    if (autocompleteVisible && autocompleteSelectedIndex >= 0 && autocompleteMatches.length > 0) {
                        e.preventDefault();
                        selectAutocompleteItem(autocompleteMatches[autocompleteSelectedIndex]);
                    } else {
                        addTag();
                    }
                } else if (e.key === 'ArrowDown' && autocompleteVisible) {
                    e.preventDefault();
                    autocompleteSelectedIndex = Math.min(autocompleteSelectedIndex + 1, autocompleteMatches.length - 1);
                    updateAutocompleteSelection();
                } else if (e.key === 'ArrowUp' && autocompleteVisible) {
                    e.preventDefault();
                    autocompleteSelectedIndex = Math.max(autocompleteSelectedIndex - 1, -1);
                    updateAutocompleteSelection();
                } else if (e.key === 'Escape' && autocompleteVisible) {
                    e.preventDefault();
                    hideAutocomplete();
                }
            });
            
            tagInput.addEventListener('blur', () => {
                // Delay hiding to allow click on autocomplete items
                setTimeout(() => hideAutocomplete(), 200);
            });
            
            // Click outside autocomplete to close
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.tag-input-wrapper')) {
                    hideAutocomplete();
                }
            });

            // Scroll wheel zoom for gallery
            document.addEventListener('wheel', (e) => {
                if (e.ctrlKey) {
                    e.preventDefault();
                    if (e.deltaY < 0) {
                        adjustZoom(1);
                    } else {
                        adjustZoom(-1);
                    }
                }
            });
            
            // Modal keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (document.getElementById('modal').classList.contains('active')) {
                    if (e.key === 'Escape') {
                        if (tagEditorOpen) {
                            toggleTagEditor();
                        } else {
                            closeModal();
                        }
                    } else if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.shiftKey && !tagEditorOpen) {
                        e.preventDefault();
                        navigateModal(-1);
                    } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.shiftKey && !tagEditorOpen) {
                        e.preventDefault();
                        navigateModal(1);
                    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault();
                        saveTagsToFile();
                    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        const video = document.getElementById('modalVideo');
                        if (video && !tagEditorOpen) {
                            e.preventDefault();
                            const volumeStep = 0.1;
                            if (e.key === 'ArrowUp') {
                                video.volume = Math.min(1, video.volume + volumeStep);
                            } else {
                                video.volume = Math.max(0, video.volume - volumeStep);
                            }
                            showVolumeIndicator(Math.round(video.volume * 100));
                        }
                    }
                }
            });
            
            // Modal background click to close
            document.getElementById('modal').addEventListener('click', (e) => {
                if (e.target.id === 'modal') {
                    closeModal();
                }
            });
        });
        
        // Show volume indicator
        function showVolumeIndicator(volume) {
            const indicator = document.getElementById('volumeIndicator');
            indicator.textContent = 'Volume: ' + volume + '%';
            indicator.classList.add('show');
            
            if (volumeTimeout) clearTimeout(volumeTimeout);
            volumeTimeout = setTimeout(() => {
                indicator.classList.remove('show');
            }, 1000);
        }
        
        // Populate category filter dropdown
        function populateCategoryFilter() {
            const categories = [...new Set(mediaData.map(m => m.category))].sort();
            const optionsContainer = document.getElementById('categoryFilterOptions');
            
            let optionsHTML = '<label><input type="checkbox" value="all" checked> All Categories</label>';
            
            categories.forEach(cat => {
                const catDisplay = cat === 'uncategorized' ? 'Uncategorized' : cat;
                optionsHTML += \`<label><input type="checkbox" value="\${cat}"> \${catDisplay}</label>\`;
            });
            
            optionsContainer.innerHTML = optionsHTML;
        }

        // Populate tag filter dropdown
        function populateTagFilter() {
            const allTags = getAllTags();
            const optionsContainer = document.getElementById('tagFilterOptions');
            
            let optionsHTML = '<label><input type="checkbox" value="all" checked> All Tags</label>';
            
            allTags.forEach(tag => {
                optionsHTML += \`<label><input type="checkbox" value="\${tag}"> \${tag}</label>\`;
            });
            
            optionsContainer.innerHTML = optionsHTML;
        }

        function handleCategorySelection(checkbox) {
            const optionsContainer = document.getElementById('categoryFilterOptions');
            const allCheckbox = optionsContainer.querySelector('input[value="all"]');
            const otherCheckboxes = Array.from(optionsContainer.querySelectorAll('input:not([value="all"])'));

            if (checkbox.value === 'all' && checkbox.checked) {
                otherCheckboxes.forEach(cb => cb.checked = false);
            } else if (checkbox.value !== 'all' && checkbox.checked) {
                allCheckbox.checked = false;
            }

            const anyChecked = otherCheckboxes.some(cb => cb.checked);
            if (!anyChecked) {
                allCheckbox.checked = true;
            }
            updateCategoryTriggerText();
        }

        function handleTagSelection(checkbox) {
            const optionsContainer = document.getElementById('tagFilterOptions');
            const allCheckbox = optionsContainer.querySelector('input[value="all"]');
            const otherCheckboxes = Array.from(optionsContainer.querySelectorAll('input:not([value="all"])'));

            if (checkbox.value === 'all' && checkbox.checked) {
                otherCheckboxes.forEach(cb => cb.checked = false);
            } else if (checkbox.value !== 'all' && checkbox.checked) {
                allCheckbox.checked = false;
            }

            const anyChecked = otherCheckboxes.some(cb => cb.checked);
            if (!anyChecked) {
                allCheckbox.checked = true;
            }
            updateTagTriggerText();
        }

        function updateCategoryTriggerText() {
            const trigger = document.getElementById('categoryFilterTrigger').querySelector('span');
            const checkboxes = Array.from(document.querySelectorAll('#categoryFilterOptions input[type="checkbox"]:checked'));
            const allIsChecked = checkboxes.some(cb => cb.value === 'all');

            if (allIsChecked || checkboxes.length === 0) {
                trigger.textContent = 'All Categories';
            } else if (checkboxes.length === 1) {
                trigger.textContent = checkboxes[0].parentElement.textContent.trim();
            } else {
                trigger.textContent = \`\${checkboxes.length} Categories\`;
            }
        }

        function updateTagTriggerText() {
            const trigger = document.getElementById('tagFilterTrigger').querySelector('span');
            const checkboxes = Array.from(document.querySelectorAll('#tagFilterOptions input[type="checkbox"]:checked'));
            const allIsChecked = checkboxes.some(cb => cb.value === 'all');

            if (allIsChecked || checkboxes.length === 0) {
                trigger.textContent = 'All Tags';
            } else if (checkboxes.length === 1) {
                trigger.textContent = checkboxes[0].parentElement.textContent.trim();
            } else {
                trigger.textContent = \`\${checkboxes.length} Tags\`;
            }
        }
        
        // Filter and sort media based on selections
        function applyFiltersAndSort() {
            const type = document.getElementById('typeFilter').value;
            const search = document.getElementById('searchInput').value.toLowerCase();
            const sortOrder = document.getElementById('sortOrder').value;
            
            // Get selected categories and tags
            const selectedCategories = Array.from(document.querySelectorAll('#categoryFilterOptions input[type="checkbox"]:checked')).map(cb => cb.value);
            const selectedTags = Array.from(document.querySelectorAll('#tagFilterOptions input[type="checkbox"]:checked')).map(cb => cb.value);
            
            // 1. Filter
            filteredMedia = mediaData.filter(media => {
                const typeMatch = type === 'all' || media.type === type;
                
                const categoryMatch = selectedCategories.includes('all') || 
                                      selectedCategories.includes(media.category);
                
                const tagMatch = selectedTags.includes('all') || 
                                 media.tags.some(tag => selectedTags.includes(tag));
                
                const searchMatch = !search || 
                                    media.category.toLowerCase().includes(search) ||
                                    media.name.toLowerCase().includes(search) ||
                                    media.tags.some(tag => tag.toLowerCase().includes(search));
                
                return typeMatch && categoryMatch && tagMatch && searchMatch;
            });
            
            // 2. Sort
            if (sortOrder === 'date_desc') {
                filteredMedia.sort((a, b) => new Date(b.modified) - new Date(a.modified));
            } else if (sortOrder === 'date_asc') {
                filteredMedia.sort((a, b) => new Date(a.modified) - new Date(b.modified));
            }
            
            // 3. Render
            renderGallery();
            updateStats();
        }
        
        // Adjust zoom level
        function adjustZoom(direction) {
            const step = 10;
            currentZoom = Math.max(50, Math.min(200, currentZoom + (direction * step)));
            const gridSize = 350 * (currentZoom / 100);
            
            document.querySelector('.gallery').style.setProperty('--grid-size', gridSize + 'px');
            document.getElementById('zoomLevel').textContent = currentZoom + '%';
        }
        
        // Render the gallery grid
        function renderGallery() {
            const gallery = document.getElementById('gallery');
            const noResults = document.getElementById('noResults');
            
            if (filteredMedia.length === 0) {
                gallery.style.display = 'none';
                noResults.style.display = 'block';
                return;
            }
            
            gallery.style.display = 'grid';
            noResults.style.display = 'none';
            
            gallery.innerHTML = filteredMedia.map((media, index) => {
                const mediaPath = media.path;
                const date = new Date(media.modified);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                
                const tagsHTML = media.tags.length > 0 ? 
                    \`<div class="media-tags">\${media.tags.map(tag => \`<span class="media-tag">\${tag}</span>\`).join('')}</div>\` : '';
                
                return \`
                <div class="media-item" onclick="openModal(\${index})">
                    <div class="media-preview">
                        <div class="media-type-badge \${media.type}">\${media.type}</div>
                        \${media.type === 'image' ? 
                            \`<img src="\${mediaPath}" alt="\${media.name}" loading="lazy" onerror="handleMediaError(this, '\${media.name}')">\` :
                            \`<video src="\${mediaPath}" muted preload="metadata" 
                                onmouseover="this.play()" 
                                onmouseout="this.pause(); this.currentTime=0;"
                                onerror="handleMediaError(this, '\${media.name}')"></video>
                            <div class="play-overlay"></div>\`
                        }
                    </div>
                    <div class="media-info">
                        \${media.category !== 'uncategorized' ? 
                            \`<span class="media-category">\${media.category}</span>\` : ''
                        }
                        <span class="media-meta" title="\${dateStr}">\${formatFileSize(media.size)} • \${dateStr}</span>
                        \${tagsHTML}
                    </div>
                </div>
                \`;
            }).join('');
        }
        
        // Handle media loading errors
        function handleMediaError(element, filename) {
            console.error('Failed to load media:', filename);
            element.style.display = 'none';
            const parent = element.closest('.media-preview');
            if (parent && !parent.querySelector('.error-text')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-text';
                errorDiv.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ff6b6b; text-align: center; padding: 1rem;';
                errorDiv.textContent = 'Failed to load';
                parent.appendChild(errorDiv);
            }
        }
        
        // Autocomplete Functions
        function handleTagAutocomplete(inputValue) {
            const input = inputValue.trim().toLowerCase();
            const autocomplete = document.getElementById('tagAutocomplete');
            
            if (!input) {
                hideAutocomplete();
                return;
            }
            
            // Get current media to exclude already added tags
            const media = filteredMedia[currentModalIndex];
            const currentTags = media ? media.tags : [];
            
            // Get all unique tags and filter
            const allTags = getAllTags();
            autocompleteMatches = allTags
                .filter(tag => 
                    tag.toLowerCase().includes(input) && 
                    !currentTags.includes(tag)
                )
                .sort((a, b) => {
                    // Prioritize tags that start with the input
                    const aStarts = a.toLowerCase().startsWith(input);
                    const bStarts = b.toLowerCase().startsWith(input);
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                    return a.localeCompare(b);
                })
                .slice(0, 10); // Limit to 10 suggestions
            
            if (autocompleteMatches.length === 0) {
                hideAutocomplete();
                return;
            }
            
            // Show autocomplete with matches
            autocomplete.innerHTML = autocompleteMatches.map((tag, index) => {
                const highlightedTag = highlightMatch(tag, input);
                return \`<div class="tag-autocomplete-item" data-index="\${index}" onclick="selectAutocompleteItem('\${tag}')">\${highlightedTag}</div>\`;
            }).join('');
            
            autocomplete.classList.add('show');
            autocompleteSelectedIndex = -1;
        }
        
        function highlightMatch(text, query) {
            const index = text.toLowerCase().indexOf(query.toLowerCase());
            if (index === -1) return text;
            
            const before = text.substring(0, index);
            const match = text.substring(index, index + query.length);
            const after = text.substring(index + query.length);
            
            return \`\${before}<mark>\${match}</mark>\${after}\`;
        }
        
        function updateAutocompleteSelection() {
            const items = document.querySelectorAll('.tag-autocomplete-item');
            items.forEach((item, index) => {
                if (index === autocompleteSelectedIndex) {
                    item.classList.add('selected');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('selected');
                }
            });
        }
        
        function selectAutocompleteItem(tag) {
            const input = document.getElementById('tagInput');
            input.value = tag;
            hideAutocomplete();
            addTag();
        }
        
        function hideAutocomplete() {
            const autocomplete = document.getElementById('tagAutocomplete');
            autocomplete.classList.remove('show');
            autocomplete.innerHTML = '';
            autocompleteSelectedIndex = -1;
            autocompleteMatches = [];
        }
        
        // Tag Editor Functions
        function toggleTagEditor() {
            tagEditorOpen = !tagEditorOpen;
            const editor = document.getElementById('tagEditor');
            editor.style.display = tagEditorOpen ? 'block' : 'none';
            
            if (tagEditorOpen) {
                renderCurrentTags();
                renderTagSuggestions();
                document.getElementById('tagInput').focus();
            } else {
                hideAutocomplete();
            }
        }

        function renderCurrentTags() {
            const container = document.getElementById('currentTags');
            const media = filteredMedia[currentModalIndex];
            
            if (!media.tags || media.tags.length === 0) {
                container.innerHTML = '<div style="color: #666; font-size: 0.75rem;">No tags yet. Add some above!</div>';
                return;
            }
            
            container.innerHTML = media.tags.map(tag => 
                \`<div class="current-tag">
                    <span>\${tag}</span>
                    <button class="current-tag-remove" onclick="removeTag('\${tag}')">&times;</button>
                </div>\`
            ).join('');
        }

        function renderTagSuggestions() {
            const container = document.getElementById('tagSuggestions');
            const media = filteredMedia[currentModalIndex];
            
            // Get tags used by other media but not this one
            const allTags = getAllTags();
            const suggestions = allTags.filter(tag => !media.tags.includes(tag));
            
            if (suggestions.length === 0) {
                container.innerHTML = '<div style="color: #666; font-size: 0.7rem;">No suggestions available</div>';
                return;
            }
            
            container.innerHTML = suggestions.slice(0, 10).map(tag => 
                \`<span class="tag-suggestion" onclick="addSuggestedTag('\${tag}')">\${tag}</span>\`
            ).join('');
        }

        function addTag() {
            const input = document.getElementById('tagInput');
            const tag = input.value.trim();
            
            if (!tag) return;
            
            const media = filteredMedia[currentModalIndex];
            const originalMedia = mediaData.find(m => m.fileId === media.fileId);
            
            if (media.tags.includes(tag)) {
                showNotification('⚠️ This tag already exists!', true);
                return;
            }
            
            media.tags.push(tag);
            originalMedia.tags.push(tag);
            input.value = '';
            
            renderCurrentTags();
            renderTagSuggestions();
            renderGallery();
            populateTagFilter();
            
            showNotification('✅ Tag added! Press Ctrl+S to save changes.');
            console.log('Tag added:', tag, 'to', media.fileId);
        }

        function addSuggestedTag(tag) {
            const media = filteredMedia[currentModalIndex];
            const originalMedia = mediaData.find(m => m.fileId === media.fileId);
            
            if (media.tags.includes(tag)) return;
            
            media.tags.push(tag);
            originalMedia.tags.push(tag);
            
            renderCurrentTags();
            renderTagSuggestions();
            renderGallery();
            
            showNotification('✅ Tag added! Press Ctrl+S to save changes.');
            console.log('Suggested tag added:', tag, 'to', media.fileId);
        }

        function removeTag(tag) {
            const media = filteredMedia[currentModalIndex];
            const originalMedia = mediaData.find(m => m.fileId === media.fileId);
            
            media.tags = media.tags.filter(t => t !== tag);
            originalMedia.tags = originalMedia.tags.filter(t => t !== tag);
            
            renderCurrentTags();
            renderTagSuggestions();
            renderGallery();
            populateTagFilter();
            
            showNotification('✅ Tag removed! Press Ctrl+S to save changes.');
            console.log('Tag removed:', tag, 'from', media.fileId);
        }
        
        // Open modal viewer
        function openModal(index) {
            currentModalIndex = index;
            modalZoom = 1;
            modalPanX = 0;
            modalPanY = 0;
            tagEditorOpen = false;
            const modal = document.getElementById('modal');
            const modalContent = document.getElementById('modalContent');
            const tagEditor = document.getElementById('tagEditor');
            tagEditor.style.display = 'none';
            
            const media = filteredMedia[index];
            const mediaPath = media.path;
            
            if (media.type === 'image') {
                modalContent.innerHTML = \`<img id="modalImage" src="\${mediaPath}" alt="\${media.name}" onerror="handleMediaError(this, '\${media.name}')">\`;
            } else {
                modalContent.innerHTML = \`<video id="modalVideo" src="\${mediaPath}" controls autoplay onerror="handleMediaError(this, '\${media.name}')"></video>\`;
            }
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Add event listeners after a short delay
            setTimeout(() => {
                const modalElement = document.getElementById('modalImage') || document.getElementById('modalVideo');
                if (modalElement) {
                    modal.addEventListener('wheel', handleModalZoom);
                    modalElement.addEventListener('mousedown', startDrag);
                    modalElement.addEventListener('mousemove', drag);
                    modalElement.addEventListener('mouseup', endDrag);
                    modalElement.addEventListener('mouseleave', endDrag);
                    updateModalTransform();
                }
            }, 100);
        }
        
        // Start dragging
        function startDrag(e) {
            if (modalZoom <= 1) return;
            
            isDragging = true;
            const modalElement = e.target;
            modalElement.classList.add('dragging');
            
            dragStartX = e.clientX - modalPanX;
            dragStartY = e.clientY - modalPanY;
            e.preventDefault();
        }
        
        // Drag to pan
        function drag(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            modalPanX = e.clientX - dragStartX;
            modalPanY = e.clientY - dragStartY;
            
            updateModalTransform();
        }
        
        // End dragging
        function endDrag(e) {
            if (!isDragging) return;
            
            isDragging = false;
            const modalElement = e.target;
            modalElement.classList.remove('dragging');
        }
        
        // Update modal transform
        function updateModalTransform() {
            const modalElement = document.getElementById('modalImage') || document.getElementById('modalVideo');
            if (!modalElement) return;
            
            modalElement.style.transform = \`scale(\${modalZoom}) translate(\${modalPanX / modalZoom}px, \${modalPanY / modalZoom}px)\`;
        }
        
        // Handle modal zoom with scroll wheel
        function handleModalZoom(e) {
            e.preventDefault();
            
            const modalElement = document.getElementById('modalImage') || document.getElementById('modalVideo');
            if (!modalElement) return;
            
            const rect = modalElement.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            const newZoom = Math.max(0.5, Math.min(5, modalZoom + delta));
            
            if (newZoom !== modalZoom) {
                const zoomRatio = newZoom / modalZoom;
                modalPanX = x + zoomRatio * (modalPanX - x);
                modalPanY = y + zoomRatio * (modalPanY - y);
                modalZoom = newZoom;
                
                updateModalTransform();
            }
        }
        
        // Close modal viewer
        function closeModal() {
            const modal = document.getElementById('modal');
            const modalContent = document.getElementById('modalContent');
            const tagEditor = document.getElementById('tagEditor');
            
            modal.removeEventListener('wheel', handleModalZoom);
            
            const modalElement = document.getElementById('modalImage') || document.getElementById('modalVideo');
            if (modalElement) {
                modalElement.removeEventListener('mousedown', startDrag);
                modalElement.removeEventListener('mousemove', drag);
                modalElement.removeEventListener('mouseup', endDrag);
                modalElement.removeEventListener('mouseleave', endDrag);
            }
            
            modal.classList.remove('active');
            modalContent.innerHTML = '';
            tagEditor.style.display = 'none';
            document.body.style.overflow = 'auto';
            currentModalIndex = -1;
            modalZoom = 1;
            modalPanX = 0;
            modalPanY = 0;
            isDragging = false;
            tagEditorOpen = false;
        }
        
        // Navigate between media in modal
        function navigateModal(direction) {
            if (currentModalIndex === -1) return;
            
            currentModalIndex += direction;
            
            if (currentModalIndex < 0) {
                currentModalIndex = filteredMedia.length - 1;
            } else if (currentModalIndex >= filteredMedia.length) {
                currentModalIndex = 0;
            }
            
            openModal(currentModalIndex);
        }
        
        // Format file size for display
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 10) / 10 + sizes[i];
        }
        
        // Update statistics display
        function updateStats() {
            const stats = document.getElementById('stats');
            const totalImages = filteredMedia.filter(m => m.type === 'image').length;
            const totalVideos = filteredMedia.filter(m => m.type === 'video').length;
            const categories = [...new Set(filteredMedia.map(m => m.category))];
            const tags = [...new Set(filteredMedia.flatMap(m => m.tags))];
            
            stats.innerHTML = \`
                Showing \${filteredMedia.length} items 
                (\${totalImages} images, \${totalVideos} videos) 
                in \${categories.length} categories
                with \${tags.length} unique tags
                <span style="margin-left: 1rem; color: #4ecdc4;">Press Ctrl+S to save tag changes</span>
            \`;
        }
    </script>
</body>
</html>`;
    
    return html;
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
console.log('MODAL VIEW:');
console.log('   • 🏷️ Edit Tags button: Open tag editor');
console.log('   • Scroll Wheel: Zoom in/out');
console.log('   • Click & Drag: Pan when zoomed');
console.log('   • Left/Right Arrows: Navigate between media');
console.log('   • Up/Down Arrows: Adjust video volume');
console.log('   • Ctrl+S (Cmd+S): Save/export tags to JSON file');
console.log('   • Escape: Close modal or tag editor');
console.log('');
console.log('TAG EDITOR:');
console.log('   • Type tag name and click Add or press Enter');
console.log('   • Click × to remove a tag');
console.log('   • Click suggestions to quickly add existing tags');
console.log('   • Changes are immediate in the UI');
console.log('   • Press Ctrl+S to download updated tags');
console.log('');
console.log('💡 Workflow:');
console.log('   1. Open gallery.html in your browser');
console.log('   2. Browse media and add tags using the UI');
console.log('   3. Press Ctrl+S to download the updated media-tags.json');
console.log('   4. Replace the old media-tags.json with the downloaded one');
console.log('   5. Re-run this script to regenerate with your new tags');
console.log(`\n📂 Your media files remain in: ${absoluteMediaPath}`);