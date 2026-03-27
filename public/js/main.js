const mediaData = window.GALLERY_DATA;
const TAGS_FILE_PATH = window.TAGS_FILE_PATH;
        // Global variables
        let filteredMedia = [...mediaData];
        let currentModalIndex = -1;
        let currentZoom = 100;
        let volumeTimeout = null;
        let tagEditorOpen = false;
        let autocompleteSelectedIndex = -1;
        let autocompleteMatches = [];
        
        // Single View State
        let modalZoom = 1;
        let modalPanX = 0;
        let modalPanY = 0;
        let currentRotation = 0;
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;

        // Moodboard (Multi-View) State
        let multiViewMode = false;
        let multiViewSlots = []; // Array of { index, rotation, x, y, zoom, zIndex }
        let activeMultiIndex = -1; // Tracks which moodboard item is currently selected
        let maxZIndex = 1000;
        let dragSlotIndex = -1;
        let mbDragStartX = 0;
        let mbDragStartY = 0;
        
        if (mediaData.length === 0) {
            document.getElementById('errorMessage').style.display = 'block';
            document.getElementById('errorMessage').innerHTML = 
                'No media files found. Please check that:<br>' +
                '1. The media folder path is correct<br>' +
                '2. The folder contains supported media files<br>' +
                '3. Supported formats: Images (jpg, jpeg, png, gif, webp, bmp, svg), Videos (mp4, webm, ogg, mov, avi, mkv, m4v)';
        }
        
        function getAllTags() {
            return [...new Set(mediaData.flatMap(m => m.tags))].sort();
        }
        
  function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.className = 'save-notification' + (isError ? ' error' : '');
    
    // Create a span for the text
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    
    // Create the close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'notification-close-btn';
    
    // Put them inside the notification
    notification.appendChild(textSpan);
    notification.appendChild(closeBtn);
    
    document.body.appendChild(notification);
    
    // Set the auto-hide timer, but save its ID so we can cancel it
    const timeoutId = setTimeout(() => {
        // Only try to remove it if it still exists
        if (document.body.contains(notification)) {
            notification.classList.add('hiding');
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);

    // Manual close button click event
    closeBtn.addEventListener('click', () => {
        clearTimeout(timeoutId); // Cancel the 3-second auto-hide
        notification.classList.add('hiding'); // Trigger slide out animation
        setTimeout(() => notification.remove(), 300); // Destroy after animation
    });
}
        async function saveTagsToFile() {
            try {
                const tagsData = {};
                mediaData.forEach(media => {
                    if (media.tags && media.tags.length > 0) {
                        tagsData[media.fileId] = [...new Set(media.tags)];
                    }
                });
                
                const response = await fetch('/save-tags', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tagsData)
                });

                if (!response.ok) throw new Error('Server returned ' + response.status);
                showNotification('✅ Saved!');
                
            } catch (error) {
                console.error('Error saving tags:', error);
                showNotification('❌ Save failed. Is the server running?', true);
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            populateCategoryFilter();
            populateTagFilter();
            applyFiltersAndSort();
            
            // Event listeners for filters
            document.getElementById('typeFilter').addEventListener('change', applyFiltersAndSort);
            document.getElementById('searchInput').addEventListener('input', applyFiltersAndSort);
            document.getElementById('sortOrder').addEventListener('change', applyFiltersAndSort);
            
            const categoryWrapper = document.getElementById('categoryFilterWrapper');
            const categoryTrigger = document.getElementById('categoryFilterTrigger');
            const categoryOptions = document.getElementById('categoryFilterOptions');
            const tagWrapper = document.getElementById('tagFilterWrapper');
            const tagTrigger = document.getElementById('tagFilterTrigger');
            const tagOptions = document.getElementById('tagFilterOptions');
            
            categoryTrigger.addEventListener('click', () => {
                categoryWrapper.classList.toggle('open');
                tagWrapper.classList.remove('open');
            });
            tagTrigger.addEventListener('click', () => {
                tagWrapper.classList.toggle('open');
                categoryWrapper.classList.remove('open');
            });
            
            window.addEventListener('click', (e) => {
                if (!categoryWrapper.contains(e.target)) categoryWrapper.classList.remove('open');
                if (!tagWrapper.contains(e.target)) tagWrapper.classList.remove('open');
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

            // Autocomplete Listeners
            const tagInput = document.getElementById('tagInput');
            const tagAutocomplete = document.getElementById('tagAutocomplete');
            
            tagInput.addEventListener('input', (e) => handleTagAutocomplete(e.target.value));
            
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
            
            tagInput.addEventListener('blur', () => setTimeout(() => hideAutocomplete(), 200));
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.tag-input-wrapper')) hideAutocomplete();
            });

            // Global scrolling
            document.addEventListener('wheel', (e) => {
                if (e.ctrlKey && !document.getElementById('modal').classList.contains('active')) {
                    e.preventDefault();
                    adjustZoom(e.deltaY < 0 ? 1 : -1);
                }
            }, { passive: false });
            
            // Modal keyboard nav
            document.addEventListener('keydown', (e) => {
                if (document.getElementById('modal').classList.contains('active')) {
                    if (e.key === 'Escape') {
                        if (tagEditorOpen) toggleTagEditor();
                        else closeModal();
                    } else if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.shiftKey && !tagEditorOpen && !multiViewMode) {
                        e.preventDefault(); navigateModal(-1);
                    } else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.shiftKey && !tagEditorOpen && !multiViewMode) {
                        e.preventDefault(); navigateModal(1);
                    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                        e.preventDefault(); saveTagsToFile();
                    } else if (e.key === 'r' || e.key === 'R') {
                        if (!tagEditorOpen) { e.preventDefault(); rotateMedia(90); }
                    } else if (e.key === 'c' || e.key === 'C') {
                        if (!tagEditorOpen) { e.preventDefault(); toggleMultiView(); }
                    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        const video = document.getElementById('modalVideo');
                        if (video && !tagEditorOpen && !multiViewMode) {
                            e.preventDefault();
                            video.volume = Math.max(0, Math.min(1, video.volume + (e.key === 'ArrowUp' ? 0.1 : -0.1)));
                            showVolumeIndicator(Math.round(video.volume * 100));
                        }
                    }
                }
            });
            
            // Background Click handlers
            document.getElementById('modal').addEventListener('click', (e) => {
                // If clicking the modal background
                if (e.target.id === 'modal' || e.target.id === 'modalContent') {
                    if (multiViewMode) {
                        // Deselect active moodboard item
                        document.querySelectorAll('.moodboard-item').forEach(el => el.classList.remove('active'));
                        activeMultiIndex = -1;
                    } else {
                        closeModal();
                    }
                }
            });

            // Global Drag Handlers for Moodboard
            document.addEventListener('mousemove', (e) => {
                if (multiViewMode && dragSlotIndex !== -1) {
                    e.preventDefault();
                    const slot = multiViewSlots[dragSlotIndex];
                    const dx = e.clientX - mbDragStartX;
                    const dy = e.clientY - mbDragStartY;
                    
                    slot.x += dx;
                    slot.y += dy;
                    
                    mbDragStartX = e.clientX;
                    mbDragStartY = e.clientY;
                    
                    updateSlotTransform(dragSlotIndex);
                }
            }, { passive: false });

            document.addEventListener('mouseup', () => {
                if (dragSlotIndex !== -1) {
                    const el = document.getElementById('slot-' + dragSlotIndex);
                    if (el) el.classList.remove('dragging');
                    dragSlotIndex = -1;
                }
            });
        });
        
        function showVolumeIndicator(volume) {
            const indicator = document.getElementById('volumeIndicator');
            indicator.textContent = 'Volume: ' + volume + '%';
            indicator.classList.add('show');
            if (volumeTimeout) clearTimeout(volumeTimeout);
            volumeTimeout = setTimeout(() => indicator.classList.remove('show'), 1000);
        }
        
        // --- Filter logic (unchanged) ---
        function populateCategoryFilter() {
            const categories = [...new Set(mediaData.map(m => m.category))].sort();
            const optionsContainer = document.getElementById('categoryFilterOptions');
            let optionsHTML = '<label><input type="checkbox" value="all" checked> All Categories</label>';
            categories.forEach(cat => {
                const catDisplay = cat === 'uncategorized' ? 'Uncategorized' : cat;
                optionsHTML += '<label><input type="checkbox" value="' + cat + '"> ' + catDisplay + '</label>';
            });
            optionsContainer.innerHTML = optionsHTML;
        }

        function populateTagFilter() {
            const allTags = getAllTags();
            const optionsContainer = document.getElementById('tagFilterOptions');
            let optionsHTML = '<label><input type="checkbox" value="all" checked> All Tags</label>';
            allTags.forEach(tag => {
                optionsHTML += '<label><input type="checkbox" value="' + tag + '"> ' + tag + '</label>';
            });
            optionsContainer.innerHTML = optionsHTML;
        }

        function handleCategorySelection(checkbox) {
            const container = document.getElementById('categoryFilterOptions');
            const allCb = container.querySelector('input[value="all"]');
            const otherCb = Array.from(container.querySelectorAll('input:not([value="all"])'));

            if (checkbox.value === 'all' && checkbox.checked) otherCb.forEach(cb => cb.checked = false);
            else if (checkbox.value !== 'all' && checkbox.checked) allCb.checked = false;

            if (!otherCb.some(cb => cb.checked)) allCb.checked = true;
            updateCategoryTriggerText();
        }

        function handleTagSelection(checkbox) {
            const container = document.getElementById('tagFilterOptions');
            const allCb = container.querySelector('input[value="all"]');
            const otherCb = Array.from(container.querySelectorAll('input:not([value="all"])'));

            if (checkbox.value === 'all' && checkbox.checked) otherCb.forEach(cb => cb.checked = false);
            else if (checkbox.value !== 'all' && checkbox.checked) allCb.checked = false;

            if (!otherCb.some(cb => cb.checked)) allCb.checked = true;
            updateTagTriggerText();
        }

        function updateCategoryTriggerText() {
            const trigger = document.getElementById('categoryFilterTrigger').querySelector('span');
            const checkboxes = Array.from(document.querySelectorAll('#categoryFilterOptions input[type="checkbox"]:checked'));
            if (checkboxes.some(cb => cb.value === 'all') || checkboxes.length === 0) trigger.textContent = 'All Categories';
            else if (checkboxes.length === 1) trigger.textContent = checkboxes[0].parentElement.textContent.trim();
            else trigger.textContent = checkboxes.length + ' Categories';
        }

        function updateTagTriggerText() {
            const trigger = document.getElementById('tagFilterTrigger').querySelector('span');
            const checkboxes = Array.from(document.querySelectorAll('#tagFilterOptions input[type="checkbox"]:checked'));
            if (checkboxes.some(cb => cb.value === 'all') || checkboxes.length === 0) trigger.textContent = 'All Tags';
            else if (checkboxes.length === 1) trigger.textContent = checkboxes[0].parentElement.textContent.trim();
            else trigger.textContent = checkboxes.length + ' Tags';
        }
        
        function applyFiltersAndSort() {
            const type = document.getElementById('typeFilter').value;
            const search = document.getElementById('searchInput').value.toLowerCase();
            const sortOrder = document.getElementById('sortOrder').value;
            
            const selectedCategories = Array.from(document.querySelectorAll('#categoryFilterOptions input[type="checkbox"]:checked')).map(cb => cb.value);
            const selectedTags = Array.from(document.querySelectorAll('#tagFilterOptions input[type="checkbox"]:checked')).map(cb => cb.value);
            
            filteredMedia = mediaData.filter(media => {
                const typeMatch = type === 'all' || media.type === type;
                const categoryMatch = selectedCategories.includes('all') || selectedCategories.includes(media.category);
                const tagMatch = selectedTags.includes('all') || media.tags.some(tag => selectedTags.includes(tag));
                const searchMatch = !search || 
                                    media.category.toLowerCase().includes(search) ||
                                    media.name.toLowerCase().includes(search) ||
                                    media.tags.some(tag => tag.toLowerCase().includes(search));
                return typeMatch && categoryMatch && tagMatch && searchMatch;
            });
            
            if (sortOrder === 'date_desc') filteredMedia.sort((a, b) => new Date(b.modified) - new Date(a.modified));
            else if (sortOrder === 'date_asc') filteredMedia.sort((a, b) => new Date(a.modified) - new Date(b.modified));
            
            renderGallery();
            updateStats();
        }
        
        function adjustZoom(direction) {
            const step = 10;
            currentZoom = Math.max(50, Math.min(200, currentZoom + (direction * step)));
            document.querySelector('.gallery').style.setProperty('--grid-size', (350 * (currentZoom / 100)) + 'px');
            document.getElementById('zoomLevel').textContent = currentZoom + '%';
        }
        
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
                const dateStr = new Date(media.modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const tagsHTML = media.tags.length > 0 ? '<div class="media-tags">' + media.tags.map(tag => '<span class="media-tag">' + tag + '</span>').join('') + '</div>' : '';
                
                let mediaContent = '';
                if (media.type === 'image') {
                    // Changed src to data-src and added lazy-media class
                    mediaContent = '<img data-src="' + media.path + '" alt="' + media.name + '" class="lazy-media" draggable="false" onerror="handleMediaError(this)">';
                } else {
                    // Changed src to data-src, removed preload, and added lazy-media class
                    mediaContent = '<video data-src="' + media.path + '" class="lazy-media" muted onmouseover="this.play()" onmouseout="this.pause(); this.currentTime=0;" onerror="handleMediaError(this)"></video><div class="play-overlay"></div>';
                }

                let categoryHTML = media.category !== 'uncategorized' ? '<span class="media-category">' + media.category + '</span>' : '';

                return '<div class="media-item" onclick="openModal(' + index + ')">' +
                    '<div class="media-preview">' +
                        '<div class="media-type-badge ' + media.type + '">' + media.type + '</div>' +
                        mediaContent +
                    '</div>' +
                    '<div class="media-info">' +
                        categoryHTML +
                        '<span class="media-meta" title="' + dateStr + '">' + formatFileSize(media.size) + ' • ' + dateStr + '</span>' +
                        tagsHTML +
                    '</div>' +
                '</div>';
            }).join('');

            // Call the radar to start watching the new elements!
            initLazyLoading();
        }

        let mediaObserver; // Global variable to store our radar

        function initLazyLoading() {
            // Clean up the old radar if we are filtering/re-rendering the gallery
            if (mediaObserver) {
                mediaObserver.disconnect();
            }

            const lazyElements = document.querySelectorAll('.lazy-media');
            
            // Make sure the browser supports IntersectionObserver
            if ('IntersectionObserver' in window) {
                mediaObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        // If the item has scrolled into the "radar" zone
                        if (entry.isIntersecting) {
                            const element = entry.target;
                            const actualSrc = element.getAttribute('data-src');
                            
                            // Trigger the fade-in once the actual file has downloaded enough to display
                            if (element.tagName.toLowerCase() === 'img') {
                                element.onload = () => element.classList.add('loaded');
                                element.src = actualSrc;
                            } else {
                                element.onloadeddata = () => element.classList.add('loaded');
                                element.preload = "metadata"; // Tell the browser it's allowed to load it now
                                element.src = actualSrc;
                            }
                            
                            // Stop watching this element since it's already loaded
                            observer.unobserve(element);
                        }
                    });
                }, {
                    // Start loading 300px BEFORE the element actually enters the screen
                    // This makes it so the user rarely even sees the fade-in happen!
                    rootMargin: '0px 0px 300px 0px' 
                });

                // Attach the radar to all our media items
                lazyElements.forEach(el => mediaObserver.observe(el));
            } else {
                // Fallback for very old browsers: just load everything instantly
                lazyElements.forEach(el => {
                    el.src = el.getAttribute('data-src');
                    el.classList.add('loaded');
                });
            }
        }
        function handleMediaError(element) {
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
        
        // --- Tag Autocomplete / Editing (Unchanged) ---
        function handleTagAutocomplete(inputValue) {
            const input = inputValue.trim().toLowerCase();
            const autocomplete = document.getElementById('tagAutocomplete');
            
            if (!input) { hideAutocomplete(); return; }
            
            const media = filteredMedia[currentModalIndex];
            const currentTags = media ? media.tags : [];
            const allTags = getAllTags();
            
            autocompleteMatches = allTags
                .filter(tag => tag.toLowerCase().includes(input) && !currentTags.includes(tag))
                .sort((a, b) => {
                    const aStarts = a.toLowerCase().startsWith(input);
                    const bStarts = b.toLowerCase().startsWith(input);
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                    return a.localeCompare(b);
                }).slice(0, 10);
            
            if (autocompleteMatches.length === 0) { hideAutocomplete(); return; }
            
            autocomplete.innerHTML = autocompleteMatches.map((tag, index) => {
                const highlightedTag = tag.toLowerCase().indexOf(input) !== -1 ? tag.substring(0, tag.toLowerCase().indexOf(input)) + '<mark>' + tag.substring(tag.toLowerCase().indexOf(input), tag.toLowerCase().indexOf(input) + input.length) + '</mark>' + tag.substring(tag.toLowerCase().indexOf(input) + input.length) : tag;
                return '<div class="tag-autocomplete-item" data-index="' + index + '" onclick="selectAutocompleteItem(\'' + tag + '\')">' + highlightedTag + '</div>';
            }).join('');
            
            autocomplete.classList.add('show');
            autocompleteSelectedIndex = -1;
        }

        function updateAutocompleteSelection() {
            const items = document.querySelectorAll('.tag-autocomplete-item');
            items.forEach((item, index) => {
                if (index === autocompleteSelectedIndex) {
                    item.classList.add('selected');
                    item.scrollIntoView({ block: 'nearest' });
                } else item.classList.remove('selected');
            });
        }
        
        function selectAutocompleteItem(tag) {
            document.getElementById('tagInput').value = tag;
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
            
            if (!media || !media.tags || media.tags.length === 0) {
                container.innerHTML = '<div style="color: #666; font-size: 0.75rem;">No tags yet. Add some above!</div>';
                return;
            }
            container.innerHTML = media.tags.map(tag => 
                '<div class="current-tag"><span>' + tag + '</span><button class="current-tag-remove" onclick="removeTag(\'' + tag + '\')">&times;</button></div>'
            ).join('');
        }

        function renderTagSuggestions() {
            const container = document.getElementById('tagSuggestions');
            const media = filteredMedia[currentModalIndex];
            if (!media) return;

            const allTags = getAllTags();
            const suggestions = allTags.filter(tag => !media.tags.includes(tag));
            
            if (suggestions.length === 0) {
                container.innerHTML = '<div style="color: #666; font-size: 0.7rem;">No suggestions available</div>';
                return;
            }
            container.innerHTML = suggestions.slice(0, 10).map(tag => 
                '<span class="tag-suggestion" onclick="addSuggestedTag(\'' + tag + '\')">' + tag + '</span>'
            ).join('');
        }

        function addTag() {
            const input = document.getElementById('tagInput');
            const tag = input.value.trim();
            if (!tag) return;
            const media = filteredMedia[currentModalIndex];
            if (!media) return;

            if (media.tags.includes(tag)) {
                showNotification('⚠️ This tag already exists!', true);
                return;
            }
            
            media.tags.push(tag);
            media.tags = [...new Set(media.tags)];
            input.value = '';
            
            renderCurrentTags();
            renderTagSuggestions();
            renderGallery();
            populateTagFilter();
            showNotification('✅ Tag added!');
            saveTagsToFile();
        }
        
        function addSuggestedTag(tag) {
            const media = filteredMedia[currentModalIndex];
            if (!media || media.tags.includes(tag)) return;
            media.tags.push(tag);
            media.tags = [...new Set(media.tags)];
            
            renderCurrentTags();
            renderTagSuggestions();
            renderGallery();
            showNotification('✅ Tag added!');
            saveTagsToFile();
        }

        function removeTag(tag) {
            const media = filteredMedia[currentModalIndex];
            if (!media) return;
            media.tags = [...new Set(media.tags.filter(t => t !== tag))];
            
            renderCurrentTags();
            renderTagSuggestions();
            renderGallery();
            populateTagFilter();
            showNotification('✅ Tag removed!');
            saveTagsToFile();
        }

        // --- Rotation & Moodboard Magic ---

        function rotateMedia(degrees) {
            if (multiViewMode) {
                // If a specific moodboard item is clicked/active, rotate only that one
                if (activeMultiIndex !== -1 && multiViewSlots[activeMultiIndex]) {
                    multiViewSlots[activeMultiIndex].rotation += degrees;
                    updateSlotTransform(activeMultiIndex);
                } else if (multiViewSlots.length > 0) {
                    // Otherwise, grab the last added item as default to rotate
                    const lastIndex = multiViewSlots.length - 1;
                    multiViewSlots[lastIndex].rotation += degrees;
                    updateSlotTransform(lastIndex);
                }
            } else {
                // Single view mode
                currentRotation = (currentRotation + degrees) % 360;
                updateSingleModalTransform();
            }
        }
        
        function resetRotation() {
            if (multiViewMode) {
                if (activeMultiIndex !== -1 && multiViewSlots[activeMultiIndex]) {
                    multiViewSlots[activeMultiIndex].rotation = 0;
                    updateSlotTransform(activeMultiIndex);
                } else {
                    multiViewSlots.forEach((slot, index) => {
                        slot.rotation = 0;
                        updateSlotTransform(index);
                    });
                }
            } else {
                currentRotation = 0;
                updateSingleModalTransform();
            }
        }

        // Add to Moodboard
        function toggleMultiView() {
            if (currentModalIndex === -1) return;
            
            const existingSlot = multiViewSlots.findIndex(s => s.index === currentModalIndex);
            if (existingSlot !== -1) {
                showNotification('⚠️ This media is already on the moodboard', true);
                return;
            }
            
            // Give it a slightly random starting position so multiple images don't perfectly overlap
            const randomX = Math.floor((Math.random() - 0.5) * 100);
            const randomY = Math.floor((Math.random() - 0.5) * 100);

            multiViewSlots.push({ 
                index: currentModalIndex, 
                rotation: currentRotation, // retain any rotation they applied in single-view
                x: randomX, 
                y: randomY, 
                zoom: 1, 
                zIndex: ++maxZIndex 
            });
            
            activeMultiIndex = multiViewSlots.length - 1;
            
            if (!multiViewMode) multiViewMode = true;
            
            renderMultiView();
            updateMultiViewControls();
            showNotification('✅ Added to moodboard');
        }
        
        function clearMultiView() {
            multiViewSlots = [];
            multiViewMode = false;
            activeMultiIndex = -1;
            if (currentModalIndex !== -1) openModal(currentModalIndex);
            showNotification('✅ Moodboard cleared');
        }
        
        function removeFromMultiView(slotIndex) {
            multiViewSlots.splice(slotIndex, 1);
            if (activeMultiIndex === slotIndex) activeMultiIndex = -1;
            
            if (multiViewSlots.length === 0) {
                clearMultiView();
            } else {
                renderMultiView();
                updateMultiViewControls();
            }
        }
        
        // Render the Absolute Positioned Moodboard
        function renderMultiView() {
            const modalContent = document.getElementById('modalContent');
            modalContent.className = 'modal-content multi-view';
            
            modalContent.innerHTML = multiViewSlots.map((slot, i) => {
                const media = filteredMedia[slot.index];
                const isActive = activeMultiIndex === i ? 'active' : '';
                
                let mediaElement = media.type === 'image' 
                    ? '<img src="' + media.path + '" alt="' + media.name + '" draggable="false">' 
                    : '<video src="' + media.path + '" controls loop muted autoplay></video>';
                
                // Construct the absolute positioned div container
                return '<div class="media-slot moodboard-item ' + isActive + '" id="slot-' + i + '" ' +
                            'style="z-index: ' + slot.zIndex + '; transform: translate(calc(-50% + ' + slot.x + 'px), calc(-50% + ' + slot.y + 'px)) scale(' + slot.zoom + ') rotate(' + slot.rotation + 'deg)" ' +
                            'onmousedown="startMoodboardDrag(event, ' + i + ')" ' +
                            'onwheel="handleMoodboardZoom(event, ' + i + ')">' +
                            '<div class="slot-label">' + media.name + '</div>' +
                            '<button class="slot-close" onclick="event.stopPropagation(); removeFromMultiView(' + i + ')">&times;</button>' +
                            mediaElement +
                       '</div>';
            }).join('');
            
            // Hide single-view arrows and tags while in moodboard
            document.querySelector('.modal-prev').style.display = 'none';
            document.querySelector('.modal-next').style.display = 'none';
            document.querySelector('.edit-tags-btn').style.display = 'none';
        }
        
        function updateMultiViewControls() {
            const toggleBtn = document.getElementById('multiViewToggle');
            const clearBtn = document.getElementById('clearMultiView');
            
            if (multiViewMode && multiViewSlots.length > 0) {
                toggleBtn.textContent = '+ Add to Moodboard (' + multiViewSlots.length + ')';
                clearBtn.style.display = 'inline-block';
            } else {
                toggleBtn.textContent = '+ Add to Moodboard';
                clearBtn.style.display = 'none';
            }
        }

        // Moodboard Drag & Zoom Handlers
        function startMoodboardDrag(e, index) {
            // Prevent dragging if they clicked the close button or the native video controls
            if (e.target.classList.contains('slot-close')) return;
            if (e.target.tagName.toLowerCase() === 'video' && e.offsetY > e.target.clientHeight - 40) return;

            dragSlotIndex = index;
            activeMultiIndex = index;
            multiViewSlots[index].zIndex = ++maxZIndex;
            
            mbDragStartX = e.clientX;
            mbDragStartY = e.clientY;
            
            // Update classes for visual "pop"
            document.querySelectorAll('.moodboard-item').forEach(el => el.classList.remove('active'));
            const el = document.getElementById('slot-' + index);
            el.classList.add('active');
            el.classList.add('dragging');
            el.style.zIndex = multiViewSlots[index].zIndex;
            
            // We do NOT prevent default on videos so controls still work, but do on images to stop ghost dragging
            if (e.target.tagName.toLowerCase() !== 'video') {
                e.preventDefault();
            }
        }

        function handleMoodboardZoom(e, index) {
            e.preventDefault();
            activeMultiIndex = index;
            multiViewSlots[index].zIndex = ++maxZIndex;
            
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            const slot = multiViewSlots[index];
            slot.zoom = Math.max(0.2, Math.min(5, slot.zoom + delta)); // Min 20%, Max 500%
            
            // Make active
            document.querySelectorAll('.moodboard-item').forEach(el => el.classList.remove('active'));
            document.getElementById('slot-' + index).classList.add('active');
            
            updateSlotTransform(index);
        }

        function updateSlotTransform(index) {
            const slot = multiViewSlots[index];
            const el = document.getElementById('slot-' + index);
            if (el) {
                el.style.transform = 'translate(calc(-50% + ' + slot.x + 'px), calc(-50% + ' + slot.y + 'px)) scale(' + slot.zoom + ') rotate(' + slot.rotation + 'deg)';
                el.style.zIndex = slot.zIndex;
            }
        }

        // --- Single View Functions ---
        function openModal(index) {
            currentModalIndex = index;
            modalZoom = 1;
            modalPanX = 0;
            modalPanY = 0;
            currentRotation = 0;
            tagEditorOpen = false;
            
            const modal = document.getElementById('modal');
            const modalContent = document.getElementById('modalContent');
            const tagEditor = document.getElementById('tagEditor');
            tagEditor.style.display = 'none';
            
            document.querySelector('.modal-prev').style.display = multiViewMode ? 'none' : 'block';
            document.querySelector('.modal-next').style.display = multiViewMode ? 'none' : 'block';
            document.querySelector('.edit-tags-btn').style.display = multiViewMode ? 'none' : 'block';
            
            if (multiViewMode) {
                renderMultiView();
            } else {
                modalContent.className = 'modal-content';
                const media = filteredMedia[index];
                
                if (media.type === 'image') {
                    modalContent.innerHTML = '<img id="modalImage" src="' + media.path + '" alt="' + media.name + '" onerror="handleMediaError(this)" draggable="false">';
                } else {
                    modalContent.innerHTML = '<video id="modalVideo" src="' + media.path + '" controls autoplay onerror="handleMediaError(this)"></video>';
                }
                
                setTimeout(() => {
                    const modalElement = document.getElementById('modalImage') || document.getElementById('modalVideo');
                    if (modalElement) {
                        modal.addEventListener('wheel', handleSingleModalZoom, { passive: false });
                        modalElement.addEventListener('mousedown', startSingleDrag);
                        updateSingleModalTransform();
                    }
                }, 100);
            }
            
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            updateMultiViewControls();
        }
        
        function startSingleDrag(e) {
            if (modalZoom <= 1) return;
            if (e.target.tagName.toLowerCase() === 'video' && e.offsetY > e.target.clientHeight - 40) return;

            isDragging = true;
            e.target.classList.add('dragging');
            dragStartX = e.clientX - modalPanX;
            dragStartY = e.clientY - modalPanY;
            e.preventDefault();
        }
        
        document.addEventListener('mousemove', (e) => {
            if (!multiViewMode && isDragging) {
                e.preventDefault();
                modalPanX = e.clientX - dragStartX;
                modalPanY = e.clientY - dragStartY;
                updateSingleModalTransform();
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (!multiViewMode && isDragging) {
                isDragging = false;
                const modalElement = document.getElementById('modalImage') || document.getElementById('modalVideo');
                if (modalElement) modalElement.classList.remove('dragging');
            }
        });
        
        function updateSingleModalTransform() {
            const modalElement = document.getElementById('modalImage') || document.getElementById('modalVideo');
            if (modalElement) {
                modalElement.style.transform = 'scale(' + modalZoom + ') translate(' + (modalPanX / modalZoom) + 'px, ' + (modalPanY / modalZoom) + 'px) rotate(' + currentRotation + 'deg)';
            }
        }
        
        function handleSingleModalZoom(e) {
            if (multiViewMode || e.target.id !== 'modalImage' && e.target.id !== 'modalVideo') return;
            e.preventDefault();
            
            const modalElement = e.target;
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
                updateSingleModalTransform();
            }
        }
        
        function closeModal() {
            const modal = document.getElementById('modal');
            const modalContent = document.getElementById('modalContent');
            modal.removeEventListener('wheel', handleSingleModalZoom);
            
            modal.classList.remove('active');
            modalContent.innerHTML = '';
            modalContent.className = 'modal-content';
            document.getElementById('tagEditor').style.display = 'none';
            document.body.style.overflow = 'auto';
            
            currentModalIndex = -1;
            modalZoom = 1;
            modalPanX = 0;
            modalPanY = 0;
            currentRotation = 0;
            isDragging = false;
            tagEditorOpen = false;
        }
        
        function navigateModal(direction) {
            if (currentModalIndex === -1) return;
            currentModalIndex += direction;
            if (currentModalIndex < 0) currentModalIndex = filteredMedia.length - 1;
            else if (currentModalIndex >= filteredMedia.length) currentModalIndex = 0;
            openModal(currentModalIndex);
        }
        
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 10) / 10 + sizes[i];
        }
        
        function updateStats() {
            const stats = document.getElementById('stats');
            const totalImages = filteredMedia.filter(m => m.type === 'image').length;
            const totalVideos = filteredMedia.filter(m => m.type === 'video').length;
            const categories = [...new Set(filteredMedia.map(m => m.category))];
            const tags = [...new Set(filteredMedia.flatMap(m => m.tags))];
            
            stats.innerHTML = 
                'Showing ' + filteredMedia.length + ' items ' +
                '(' + totalImages + ' images, ' + totalVideos + ' videos) ' +
                'in ' + categories.length + ' categories ' +
                'with ' + tags.length + ' unique tags' +
                '<span style="margin-left: 1rem; color: #4ecdc4;">' +
                    'Press Ctrl+S to save | R to rotate | C to add to moodboard' +
                '</span>';
        }