# Media Gallery - Live Tagging Version

## Quick Start

### First Time Setup

1. **Run the generator:**
   ```bash
   node media-gallery-with-live-tagging.js
   ```

2. **Open the gallery:**
   - Open `gallery.html` in your browser
   - Browse your media collection

### Adding Tags (Browser UI)

1. **Click any media** to open the modal viewer
2. **Click "🏷️ Edit Tags"** button (bottom-right)
3. **Add tags:**
   - Type a tag name and press Enter (or click Add)
   - Click suggested tags to add them quickly
4. **Remove tags:**
   - Click the × button next to any tag
5. **Save your changes:**
   - Press **Ctrl+S** (Windows/Linux) or **Cmd+S** (Mac)
   - Browser will download `media-tags.json`

### Saving Tags Permanently

1. **After pressing Ctrl+S**, you'll get a download
2. **Save the file** as `media-tags.json` in your project folder
3. **Replace** the existing `media-tags.json` (if any)
4. **Re-run** the generator:
   ```bash
   node media-gallery-with-live-tagging.js
   ```
5. **Refresh** your browser to see the updated gallery

## Complete Workflow Example

```bash
# 1. Generate initial gallery
node media-gallery-with-live-tagging.js

# 2. Open gallery.html in browser
# 3. Add tags through the UI
# 4. Press Ctrl+S to download tags
# 5. Save downloaded file as media-tags.json
# 6. Regenerate gallery
node media-gallery-with-live-tagging.js

# 7. Refresh browser - tags are now permanent!
```

## Key Features

### ✅ Immediate Visual Feedback
- Tags appear instantly when you add them
- Gallery updates in real-time
- Tag filters update automatically

### ✅ Easy Tag Management
- Add tags with Enter key or Add button
- Remove tags with × button
- Click suggestions for quick tagging
- See all current tags at a glance

### ✅ Simple Persistence
- Ctrl+S downloads your tags as JSON
- Replace the file and regenerate
- No database needed!

## Keyboard Shortcuts

**While Viewing Media (Modal Open):**
- `Ctrl+S` / `Cmd+S` - Save tags to file
- `←` / `→` - Navigate between media
- `↑` / `↓` - Adjust video volume
- `Escape` - Close modal or tag editor
- `Scroll Wheel` - Zoom in/out

**While in Gallery:**
- `Ctrl+Scroll` - Zoom thumbnails

## Tips & Best Practices

### 🎯 Tagging Strategy
1. **Start broad** - Use general categories first
2. **Be consistent** - Stick to lowercase (e.g., "landscape" not "Landscape")
3. **Use multiple tags** - Combine descriptive tags (e.g., "vacation", "beach", "2024")
4. **Leverage suggestions** - Reuse existing tags for consistency

### 💡 Workflow Tips
1. **Tag in batches** - Open gallery, tag related media together
2. **Save frequently** - Press Ctrl+S after tagging several files
3. **Keep backups** - Save your media-tags.json somewhere safe
4. **Regenerate often** - Re-run the script to see updates

### 🔍 Filtering
- **Combine filters** - Use categories + tags together
- **Search everything** - Search box looks in names, categories, AND tags
- **Multi-select** - Choose multiple tags/categories at once

## Troubleshooting

### Tags disappear after refresh
**Problem:** Tags vanish when you reload the page  
**Solution:** You need to download the JSON (Ctrl+S), save it as `media-tags.json`, and re-run the generator script

### Can't download tags
**Problem:** Ctrl+S doesn't trigger download  
**Solution:** Make sure the modal is open when you press Ctrl+S

### Downloaded file has wrong name
**Problem:** Browser saves as "media-tags (1).json"  
**Solution:** Rename it to exactly `media-tags.json` before regenerating

### Tags don't appear in new gallery
**Problem:** Regenerated but tags missing  
**Solution:** 
1. Check that `media-tags.json` is in the same folder as the script
2. Verify the JSON file isn't empty or corrupted
3. Check the console output when running the script

## File Structure

```
your-project/
├── media-gallery-with-live-tagging.js  # Generator script
├── media-tags.json                      # Your tags database
├── gallery.html                         # Generated gallery (open this)
└── media LTS/                        # Your media folder
    └── ...your media files...
```

## Why This Approach?

### Advantages ✅
- **No server needed** - Pure client-side JavaScript
- **Simple workflow** - Just download and replace
- **Portable** - JSON file works anywhere
- **Fast editing** - Immediate UI feedback
- **No database** - Plain text JSON file

### Limitations ⚠️
- Manual save step required (Ctrl+S + replace file)
- Need to regenerate HTML after saving
- Not suitable for collaborative multi-user editing

### Perfect For 👍
- Personal media libraries
- Local photo/video collections
- Organizing project assets
- Portfolio management
- Quick media categorization

## Next Steps

1. **Get comfortable** with the tag editor UI
2. **Develop your tagging vocabulary** (consistent tag names)
3. **Create tag categories** (e.g., all project tags, all event tags)
4. **Build up your collection** - the more tags, the better filtering works!
5. **Consider automation** - If you have thousands of files, consider batch tagging tools

## Advanced: Batch Tag Editing

Want to add the same tag to multiple files at once?

1. Use a text editor to open `media-tags.json`
2. Add tags manually to multiple file paths
3. Save and regenerate

**Example:**
```json
{
  "photos/vacation1.jpg": ["vacation", "2024", "beach"],
  "photos/vacation2.jpg": ["vacation", "2024", "beach"],
  "photos/vacation3.jpg": ["vacation", "2024", "beach"]
}
```

## Support

For issues or questions, check:
- Console log when running the script
- Browser developer console (F12) for errors
- Verify file paths match between JSON and actual files
