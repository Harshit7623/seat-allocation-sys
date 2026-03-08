/**
 * Exam Invigilation Reporting System - Frontend Logic with Google Auth
 * Updated: March 3, 2026
 */

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    API_BASE_URL: 'http://localhost:8010/api',
    API_BASE_URLS: [
        'http://localhost:8010/api'
    ],
    MAX_IMAGE_SIZE_MB: 5,
    MAX_IMAGE_DIMENSION: 1920,
    IMAGE_QUALITY: 0.8,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
    THEME_STORAGE_KEY: 'preferredTheme',
    // Note: Replace with your actual Google Client ID
    GOOGLE_CLIENT_ID: '647849200108-2t4bc5a9q85ppoqhmh8t6rftk923ql9s.apps.googleusercontent.com'
};

function getApiBaseUrls() {
    const configured = Array.isArray(CONFIG.API_BASE_URLS) ? CONFIG.API_BASE_URLS : [];
    const urls = [CONFIG.API_BASE_URL, ...configured]
        .filter(Boolean)
        .map(url => url.trim());
    return [...new Set(urls)];
}

// ========================================
// STATE MANAGEMENT
// ========================================
let currentUser = null;
let userTimeSlot = null;
let lastSubmittedRecordId = null;
let isEditMode = false;
let existingImageUrls = '';

// ========================================
// DOM ELEMENTS
// ========================================
const elements = {
    loginSection: document.getElementById('loginSection'),
    appSection: document.getElementById('appSection'),
    userName: document.getElementById('userName'),
    userPhoto: document.getElementById('userPhoto'),
    signOutBtn: document.getElementById('signOutBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    form: document.getElementById('invigilationForm'),
    submitBtn: document.getElementById('submitBtn'),
    resetBtn: document.getElementById('resetBtn'),
    formTitle: document.getElementById('formTitle'),
    alertBox: document.getElementById('alertBox'),
    alertMessage: document.getElementById('alertMessage'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    loadingMessage: document.getElementById('loadingMessage'),
    successBox: document.getElementById('successBox'),
    successMessage: document.getElementById('successMessage'),
    editResponseBtn: document.getElementById('editResponseBtn'),
    submitNewResponseBtn: document.getElementById('submitNewResponseBtn'),
    examMeridiem: document.getElementById('examMeridiem'),
    examTimeSlotHint: document.getElementById('examTimeSlotHint'),
    attendanceImage: document.getElementById('attendanceImage'),
    fileNameDisplay: document.getElementById('fileNameDisplay'),
    imagePreview: document.getElementById('imagePreview'),
    existingImagePreview: document.getElementById('existingImagePreview'),
    userEmail: document.getElementById('userEmail'),
    recordId: document.getElementById('recordId')
};

// ========================================
// GOOGLE AUTHENTICATION
// ========================================

/**
 * Handle Google Sign-In response
 */
function handleCredentialResponse(response) {
    const credential = response.credential;
    const payload = parseJwt(credential);
    
    currentUser = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub
    };
    
    // Store user in localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Update UI
    showAppSection();
}

/**
 * Parse JWT token
 */
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

/**
 * Show app section after login
 */
function showAppSection() {
    elements.loginSection.classList.add('hidden');
    elements.appSection.classList.remove('hidden');
    elements.userName.textContent = currentUser.name;
    elements.userPhoto.src = currentUser.picture;
    elements.userEmail.value = currentUser.email;
}

/**
 * Sign out
 */
function signOut() {
    currentUser = null;
    userTimeSlot = null;
    lastSubmittedRecordId = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userTimeSlot');
    
    elements.appSection.classList.add('hidden');
    elements.loginSection.classList.remove('hidden');
    resetForm();
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    syncGoogleClientId();
    initializeTheme();

    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showAppSection();
    }
    
    initializeEventListeners();
    setMaxDateToToday();
});

/**
 * Keep Google Sign-In client ID in sync from JS config
 */
function syncGoogleClientId() {
    const gsiContainer = document.getElementById('g_id_onload');
    if (gsiContainer && CONFIG.GOOGLE_CLIENT_ID) {
        gsiContainer.setAttribute('data-client_id', CONFIG.GOOGLE_CLIENT_ID);
    }
}

/**
 * Initialize and apply saved UI theme
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem(CONFIG.THEME_STORAGE_KEY);
    applyTheme(savedTheme || 'light');
}

/**
 * Apply theme class and update toggle label
 */
function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-theme', isDark);

    if (elements.themeToggleBtn) {
        elements.themeToggleBtn.textContent = isDark ? '☀️ Light' : '🌙 Dark';
    }
}

/**
 * Toggle theme and persist preference
 */
function toggleTheme() {
    const nextTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
    localStorage.setItem(CONFIG.THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
}

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // Form submission
    elements.form.addEventListener('submit', handleFormSubmit);
    
    // Sign out button
    elements.signOutBtn.addEventListener('click', signOut);
    
    // Edit response button
    elements.editResponseBtn.addEventListener('click', loadLastSubmissionForEdit);

    // Submit new response button
    elements.submitNewResponseBtn.addEventListener('click', showNewResponseForm);

    // Theme toggle
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    
    // File input change
    elements.attendanceImage.addEventListener('change', handleFileSelect);

    // Exam time change (auto map to slot)
    document.getElementById('examTime').addEventListener('input', handleExamTimeInput);
    elements.examMeridiem.addEventListener('change', handleExamTimeInput);
    
    // Real-time validation
    const inputs = elements.form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input.id));
    });
}

/**
 * Set maximum date to today for date input
 */
function setMaxDateToToday() {
    const today = getTodayLocalDateString();
    document.getElementById('examDate').setAttribute('max', today);
}

/**
 * Convert backend date values to HTML date input format (YYYY-MM-DD)
 */
function toDateInputValue(value) {
    if (!value) {
        return '';
    }

    const normalized = String(value).trim();

    // Already in expected format
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return normalized;
    }

    const parsedDate = new Date(normalized);
    if (Number.isNaN(parsedDate.getTime())) {
        return '';
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD in local timezone
 */
function getTodayLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ========================================
// FORM VALIDATION
// ========================================

/**
 * Validate individual field
 */
function validateField(field) {
    const value = field.value.trim();
    const fieldId = field.id;
    const errorElement = document.getElementById(`${fieldId}Error`);
    
    if (!errorElement) return true;
    
    // Check if field is required
    if (field.hasAttribute('required') && !value) {
        showFieldError(fieldId, 'This field is required');
        return false;
    }
    
    // Specific validations
    switch (fieldId) {
        case 'examDate':
            return validateDate(value, fieldId);
        case 'examTime':
            return validateExamTime(value, fieldId);
        case 'blankCopiesReceived':
        case 'copiesUsed':
        case 'cancelledCopies':
        case 'copiesReturned':
        case 'studentsClass1':
        case 'studentsClass2':
        case 'studentsClass3':
            return validateNumber(value, fieldId);
        case 'attendanceImage':
            return validateFiles();
    }
    
    clearFieldError(fieldId);
    return true;
}

/**
 * Convert HH:mm to total minutes
 */
function toMinutes(timeValue) {
    if (!timeValue || !/^\d{2}:\d{2}$/.test(timeValue)) {
        return null;
    }

    const [hours, minutes] = timeValue.split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
        return null;
    }

    return (hours * 60) + minutes;
}

/**
 * Convert 12-hour time input + AM/PM selector to 24-hour HH:mm
 */
function getSelectedExamTime24h() {
    const rawTime = document.getElementById('examTime').value;
    const meridiem = elements.examMeridiem?.value || 'AM';

    if (!rawTime || !/^\d{2}:\d{2}$/.test(rawTime)) {
        return '';
    }

    let [hours, minutes] = rawTime.split(':').map(Number);

    // Enforce 12-hour style input when AM/PM selector is used
    if (hours < 1 || hours > 12) {
        return '';
    }

    if (meridiem === 'AM') {
        hours = (hours === 12) ? 0 : hours;
    } else {
        hours = (hours === 12) ? 12 : hours + 12;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Map exact time to exam time slot
 */
function mapTimeToSlot(timeValue) {
    const totalMinutes = toMinutes(timeValue);
    if (totalMinutes === null) {
        return null;
    }

    if (totalMinutes >= 9 * 60 && totalMinutes < 11 * 60) {
        return '9AM-11AM';
    }

    if (totalMinutes >= 11 * 60 && totalMinutes < 13 * 60) {
        return '11AM-1PM';
    }

    if (totalMinutes >= 13 * 60 && totalMinutes < 16 * 60) {
        return '1PM-4PM';
    }

    if (totalMinutes >= 16 * 60 && totalMinutes <= 18 * 60) {
        return '4PM-6PM';
    }

    return null;
}

/**
 * Update slot hint label
 */
function updateExamTimeSlotHint(slot) {
    if (!elements.examTimeSlotHint) {
        return;
    }

    elements.examTimeSlotHint.textContent = slot ? `Auto slot: ${slot}` : 'Auto slot: outside exam windows';
}

/**
 * Validate exact exam time
 */
function validateExamTime(value, fieldId) {
    // Always use AM/PM-converted time from current form state
    const effectiveTime = getSelectedExamTime24h();
    const slot = mapTimeToSlot(effectiveTime);
    updateExamTimeSlotHint(slot);

    if (!slot) {
        showFieldError(fieldId, 'Enter time in 12-hour format (01:00-12:59) and choose AM/PM within exam windows');
        return false;
    }

    clearFieldError(fieldId);
    return true;
}

/**
 * Handle exam time input events
 */
function handleExamTimeInput(event) {
    const effectiveTime = getSelectedExamTime24h();
    validateExamTime(effectiveTime, 'examTime');
}

/**
 * Validate date
 */
function validateDate(value, fieldId) {
    if (!value) return false;

    const today = getTodayLocalDateString();

    // Compare YYYY-MM-DD strings to avoid timezone/UTC conversion issues
    if (value > today) {
        showFieldError(fieldId, 'Date cannot be in the future');
        return false;
    }
    
    clearFieldError(fieldId);
    return true;
}

/**
 * Validate number
 */
function validateNumber(value, fieldId) {
    if (!value) return true; // Optional fields
    
    const num = parseInt(value);
    if (isNaN(num) || num < 0) {
        showFieldError(fieldId, 'Please enter a valid non-negative number');
        return false;
    }
    
    clearFieldError(fieldId);
    return true;
}

/**
 * Validate files
 */
function validateFiles() {
    const files = elements.attendanceImage.files;

    // In edit mode, allow submission without new uploads if existing images are already present
    if (isEditMode && (!files || files.length === 0) && existingImageUrls) {
        clearFieldError('attendanceImage');
        return true;
    }
    
    if (!files || files.length === 0) {
        showFieldError('attendanceImage', 'Please select at least one attendance sheet image');
        return false;
    }
    
    for (let file of files) {
        if (!file.type.startsWith('image/')) {
            showFieldError('attendanceImage', 'Only image files are allowed');
            return false;
        }
        
        if (file.size > CONFIG.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            showFieldError('attendanceImage', `File size must be less than ${CONFIG.MAX_IMAGE_SIZE_MB}MB`);
            return false;
        }
    }
    
    clearFieldError('attendanceImage');
    return true;
}

/**
 * Show field error
 */
function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(`${fieldId}Error`);
    const field = document.getElementById(fieldId);
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    if (field) {
        field.classList.add('error');
    }
}

/**
 * Clear field error
 */
function clearFieldError(fieldId) {
    const errorElement = document.getElementById(`${fieldId}Error`);
    const field = document.getElementById(fieldId);
    
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    
    if (field) {
        field.classList.remove('error');
    }
}

/**
 * Validate entire form
 */
function validateForm() {
    let isValid = true;
    
    // Required fields
    const requiredFields = [
        'examDate', 'examTime', 'facultyInvigilator1', 'facultyInvigilator2',
        'blankCopiesReceived', 'copiesUsed', 'cancelledCopies', 'copiesReturned',
        'roomNumber', 'class1', 'subjectClass1', 'studentsClass1'
    ];
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !validateField(field)) {
            isValid = false;
        }
    });
    
    // Validate files
    if (!validateFiles()) {
        isValid = false;
    }
    
    return isValid;
}

// ========================================
// FILE HANDLING
// ========================================

/**
 * Handle file selection
 */
async function handleFileSelect(event) {
    const files = event.target.files;
    
    if (!files || files.length === 0) {
        elements.fileNameDisplay.textContent = 'No file chosen';
        elements.imagePreview.innerHTML = '';
        elements.imagePreview.classList.add('hidden');

        if (isEditMode && existingImageUrls) {
            renderExistingImagePreview(existingImageUrls);
        }
        return;
    }

    // New file(s) selected: hide old-image preview since update will use new uploads
    elements.existingImagePreview.innerHTML = '';
    elements.existingImagePreview.classList.add('hidden');
    
    // Update file name display
    if (files.length === 1) {
        elements.fileNameDisplay.textContent = files[0].name;
    } else {
        elements.fileNameDisplay.textContent = `${files.length} files selected`;
    }
    
    // Show image previews
    elements.imagePreview.innerHTML = '';
    elements.imagePreview.classList.remove('hidden');
    
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            const preview = await createImagePreview(file);
            elements.imagePreview.appendChild(preview);
        }
    }
    
    validateFiles();
}

/**
 * Create image preview
 */
function createImagePreview(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'preview-item';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name;
            
            const name = document.createElement('span');
            name.textContent = file.name;
            name.className = 'preview-name';
            
            previewDiv.appendChild(img);
            previewDiv.appendChild(name);
            
            resolve(previewDiv);
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Render existing images fetched from sheet for edit mode
 */
function renderExistingImagePreview(imageUrlsString) {
    if (!elements.existingImagePreview) {
        return;
    }

    const urls = String(imageUrlsString || '')
        .split(',')
        .map(url => url.trim())
        .filter(Boolean);

    if (urls.length === 0) {
        elements.existingImagePreview.innerHTML = '';
        elements.existingImagePreview.classList.add('hidden');
        return;
    }

    const title = document.createElement('div');
    title.className = 'existing-image-title';
    title.textContent = 'Existing attendance images (kept if you do not upload new files):';

    const grid = document.createElement('div');
    grid.className = 'existing-image-grid';

    urls.forEach((url, index) => {
        const item = document.createElement('div');
        item.className = 'existing-image-item';

        const img = document.createElement('img');
        img.src = url;
        img.alt = `Existing attendance image ${index + 1}`;
        img.loading = 'lazy';

        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = `Open image ${index + 1}`;

        item.appendChild(img);
        item.appendChild(link);
        grid.appendChild(item);
    });

    elements.existingImagePreview.innerHTML = '';
    elements.existingImagePreview.appendChild(title);
    elements.existingImagePreview.appendChild(grid);
    elements.existingImagePreview.classList.remove('hidden');
}

/**
 * Compress image
 */
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate new dimensions
                if (width > CONFIG.MAX_IMAGE_DIMENSION || height > CONFIG.MAX_IMAGE_DIMENSION) {
                    if (width > height) {
                        height = (height / width) * CONFIG.MAX_IMAGE_DIMENSION;
                        width = CONFIG.MAX_IMAGE_DIMENSION;
                    } else {
                        width = (width / height) * CONFIG.MAX_IMAGE_DIMENSION;
                        height = CONFIG.MAX_IMAGE_DIMENSION;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(
                    (blob) => resolve(blob),
                    'image/jpeg',
                    CONFIG.IMAGE_QUALITY
                );
            };
            
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    });
}

// ========================================
// FORM SUBMISSION
// ========================================

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        showAlert('Please fix the errors in the form', 'error');
        return;
    }
    
    const isUpdating = Boolean(document.getElementById('recordId').value);
    const loadingMsg = isUpdating ? 'Updating report...' : 'Submitting report...';
    showLoading(true, loadingMsg);
    
    try {
        // Prepare form data
        const formData = new FormData();
        
        const normalizeText = (value, fallback = '') => {
            const normalized = String(value ?? '').trim();
            return normalized || fallback;
        };

        const normalizeNumber = (value, fallback = '0') => {
            const normalized = String(value ?? '').trim();
            if (!normalized) {
                return fallback;
            }

            const asNumber = Number(normalized);
            return Number.isFinite(asNumber) ? String(asNumber) : fallback;
        };

        const selectedTimeValue = getSelectedExamTime24h();
        const mappedTimeSlot = mapTimeToSlot(selectedTimeValue);
        if (!mappedTimeSlot) {
            showFieldError('examTime', 'Enter time in 12-hour format (01:00-12:59) and choose AM/PM within exam windows');
            throw new Error('Invalid exam time selected');
        }

        // Add all form fields
        formData.append('user_email', currentUser.email);
        formData.append('exam_date', normalizeText(document.getElementById('examDate').value));
        formData.append('exam_time', mappedTimeSlot);
        formData.append('faculty_invigilator1', normalizeText(document.getElementById('facultyInvigilator1').value));
        formData.append('faculty_invigilator2', normalizeText(document.getElementById('facultyInvigilator2').value));
        formData.append('faculty_invigilator3', normalizeText(document.getElementById('facultyInvigilator3').value));
        formData.append('blank_copies_received', normalizeNumber(document.getElementById('blankCopiesReceived').value));
        formData.append('copies_used', normalizeNumber(document.getElementById('copiesUsed').value));
        formData.append('cancelled_copies', normalizeNumber(document.getElementById('cancelledCopies').value));
        formData.append('copies_returned', normalizeNumber(document.getElementById('copiesReturned').value));
        formData.append('room_number', normalizeText(document.getElementById('roomNumber').value));
        
        // Class 1
        formData.append('class1', normalizeText(document.getElementById('class1').value));
        formData.append('subject_class1', normalizeText(document.getElementById('subjectClass1').value));
        formData.append('students_class1', normalizeNumber(document.getElementById('studentsClass1').value));
        
        // Class 2 (optional)
        formData.append('class2', normalizeText(document.getElementById('class2').value));
        formData.append('subject_class2', normalizeText(document.getElementById('subjectClass2').value));
        formData.append('students_class2', normalizeNumber(document.getElementById('studentsClass2').value));
        
        // Class 3 (optional)
        formData.append('class3', normalizeText(document.getElementById('class3').value));
        formData.append('subject_class3', normalizeText(document.getElementById('subjectClass3').value));
        formData.append('students_class3', normalizeNumber(document.getElementById('studentsClass3').value));
        
        // Remarks
        formData.append('remarks', normalizeText(document.getElementById('remarks').value));
        
        // Determine if edit mode
        const recordId = document.getElementById('recordId').value;
        if (recordId) {
            formData.append('record_id', recordId);
        }
        
        // Add images
        const files = elements.attendanceImage.files;
        for (let file of files) {
            const compressedBlob = await compressImage(file);
            formData.append('attendance_images', compressedBlob, file.name);
        }

        // Keep previous images when updating without uploading new files
        if (recordId && files.length === 0 && existingImageUrls) {
            formData.append('existing_image_urls', existingImageUrls);
        }
        
        // Submit to backend
        const endpoint = isUpdating ? '/update-report' : '/submit-report';
        const response = await submitToBackend(endpoint, formData);
        
        if (response.success) {
            lastSubmittedRecordId = response.data.record_id;
            showAlert(response.message, 'success');
            
            // Store the time slot for this user
            const timeSlot = mappedTimeSlot;
            localStorage.setItem('userTimeSlot', timeSlot);
            userTimeSlot = timeSlot;

            if (!isUpdating) {
                resetForm();
            }

            showPostSubmitActions(
                isUpdating
                    ? '✓ Report updated successfully!'
                    : '✓ Report submitted successfully!'
            );
        } else {
            showAlert(response.message || 'Failed to submit report', 'error');
        }
    } catch (error) {
        console.error('Form submission error:', error);
        const message = (error && error.message)
            ? error.message
            : 'An error occurred while submitting the form. Please try again.';
        showAlert(message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Submit to backend
 */
async function submitToBackend(endpoint, formData) {
    const urls = getApiBaseUrls();
    let lastError = null;
    
    for (const baseUrl of urls) {
        for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
            try {
                const response = await fetch(`${baseUrl}${endpoint}`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    return await response.json();
                }

                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorPayload = await response.json();
                    if (errorPayload?.message) {
                        errorMessage = errorPayload.message;
                    } else if (Array.isArray(errorPayload?.detail) && errorPayload.detail.length > 0) {
                        const detailText = errorPayload.detail
                            .map(item => {
                                const path = Array.isArray(item?.loc) ? item.loc.join('.') : 'field';
                                const message = item?.msg || 'Invalid value';
                                return `${path}: ${message}`;
                            })
                            .join('; ');
                        if (detailText) {
                            errorMessage = detailText;
                        }
                    }
                } catch {
                    // Ignore JSON parse failures and use default HTTP error message
                }

                // Backend responded but with an application error; don't fail over to other base URLs.
                throw new Error(errorMessage);
            } catch (error) {
                lastError = error;

                const isNetworkFailure = error instanceof TypeError;

                if (isNetworkFailure) {
                    console.warn(`Attempt ${attempt} failed for ${baseUrl}:`, error);
                }

                // If we got a backend response error, surface it immediately.
                if (!isNetworkFailure) {
                    throw error;
                }
                
                if (attempt < CONFIG.RETRY_ATTEMPTS) {
                    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY_MS));
                }
            }
        }
    }
    
    throw lastError || new Error('All API endpoints failed');
}

// ========================================
// EDIT FUNCTIONALITY
// ========================================

/**
 * Load last submission for edit
 */
async function loadLastSubmissionForEdit() {
    if (!lastSubmittedRecordId) {
        showAlert('No recent submission found to edit', 'error');
        return;
    }
    
    showLoading(true, 'Loading your submission...');
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/get-report?record_id=${lastSubmittedRecordId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            populateFormForEdit(data.data);
            elements.successBox.classList.add('hidden');
            elements.form.classList.remove('hidden');
            showAlert('You can now edit your submission', 'info');
        } else {
            showAlert('Failed to load report for editing', 'error');
        }
    } catch (error) {
        console.error('Failed to load report:', error);
        showAlert('An error occurred while loading the report', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Populate form with existing data
 */
function populateFormForEdit(data) {
    document.getElementById('examDate').value = toDateInputValue(data.exam_date);
    const slotDefaults = slotToDefaultTime(data.exam_time);
    document.getElementById('examTime').value = slotDefaults.time;
    if (elements.examMeridiem) {
        elements.examMeridiem.value = slotDefaults.meridiem;
    }
    updateExamTimeSlotHint(data.exam_time || null);
    document.getElementById('facultyInvigilator1').value = data.faculty_invigilator1 || '';
    document.getElementById('facultyInvigilator2').value = data.faculty_invigilator2 || '';
    document.getElementById('facultyInvigilator3').value = data.faculty_invigilator3 || '';
    document.getElementById('blankCopiesReceived').value = data.blank_copies_received || '';
    document.getElementById('copiesUsed').value = data.copies_used || '';
    document.getElementById('cancelledCopies').value = data.cancelled_copies || '0';
    document.getElementById('copiesReturned').value = data.copies_returned || '';
    document.getElementById('roomNumber').value = data.room_number || '';
    
    document.getElementById('class1').value = data.class1 || '';
    document.getElementById('subjectClass1').value = data.subject_class1 || '';
    document.getElementById('studentsClass1').value = data.students_class1 || '';
    
    document.getElementById('class2').value = data.class2 || '';
    document.getElementById('subjectClass2').value = data.subject_class2 || '';
    document.getElementById('studentsClass2').value = data.students_class2 || '';
    
    document.getElementById('class3').value = data.class3 || '';
    document.getElementById('subjectClass3').value = data.subject_class3 || '';
    document.getElementById('studentsClass3').value = data.students_class3 || '';
    
    document.getElementById('remarks').value = data.remarks || '';
    document.getElementById('recordId').value = data.record_id || '';
    if (Array.isArray(data.attendance_image_urls)) {
        existingImageUrls = data.attendance_image_urls.join(', ');
    } else if (typeof data.attendance_image_urls === 'string') {
        existingImageUrls = data.attendance_image_urls;
    } else if (typeof data.attendance_images === 'string') {
        // Backward compatibility for older payload key names
        existingImageUrls = data.attendance_images;
    } else {
        existingImageUrls = '';
    }

    renderExistingImagePreview(existingImageUrls);
    
    elements.formTitle.textContent = 'Edit Report';
    elements.submitBtn.textContent = 'Update Report';
    elements.attendanceImage.required = false;
    isEditMode = true;
}

/**
 * Show form for a brand new response
 */
function showNewResponseForm() {
    resetForm();
    elements.successBox.classList.add('hidden');
    elements.form.classList.remove('hidden');
    showAlert('You can submit a new response now', 'info');
}

// ========================================
// RESET FORM
// ========================================

/**
 * Reset form to initial state
 */
function resetForm() {
    elements.form.reset();
    isEditMode = false;
    
    elements.formTitle.textContent = 'Submit Exam Report';
    elements.submitBtn.textContent = 'Submit Report';
    
    elements.fileNameDisplay.textContent = 'No file chosen';
    elements.imagePreview.classList.add('hidden');
    elements.imagePreview.innerHTML = '';
    elements.existingImagePreview.classList.add('hidden');
    elements.existingImagePreview.innerHTML = '';
    elements.attendanceImage.required = true;
    if (elements.examMeridiem) {
        elements.examMeridiem.value = 'AM';
    }
    updateExamTimeSlotHint(null);
    
    elements.recordId.value = '';
    elements.successBox.classList.add('hidden');
    existingImageUrls = '';
    
    // Clear all error messages
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    
    const errorFields = document.querySelectorAll('.error');
    errorFields.forEach(field => {
        field.classList.remove('error');
    });
}

// ========================================
// UI HELPERS
// ========================================

/**
 * Show/hide loading spinner with optional custom message
 */
function showLoading(show, message = 'Processing...') {
    if (show) {
        if (elements.loadingMessage) {
            elements.loadingMessage.textContent = message;
        }
        elements.loadingSpinner.classList.remove('hidden');
    } else {
        elements.loadingSpinner.classList.add('hidden');
    }
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    elements.alertMessage.textContent = message;
    elements.alertBox.className = `alert alert-${type}`;
    elements.alertBox.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        closeAlert();
    }, 5000);
}

/**
 * Close alert
 */
function closeAlert() {
    elements.alertBox.classList.add('hidden');
}

/**
 * Show success box with edit button
 */
function showSuccessBox() {
    elements.successBox.classList.remove('hidden');
}

/**
 * Best-effort default exact-time for an existing slot during edit prefill
 */
function slotToDefaultTime(slot) {
    switch (slot) {
        case '9AM-11AM':
            return { time: '09:00', meridiem: 'AM' };
        case '11AM-1PM':
            return { time: '11:00', meridiem: 'AM' };
        case '1PM-4PM':
            return { time: '01:00', meridiem: 'PM' };
        case '4PM-6PM':
            return { time: '04:00', meridiem: 'PM' };
        default:
            return { time: '', meridiem: 'AM' };
    }
}

/**
 * Hide form and show post-submit action buttons
 */
function showPostSubmitActions(message) {
    if (elements.successMessage) {
        elements.successMessage.textContent = message || '✓ Report submitted successfully!';
    }

    elements.form.classList.add('hidden');
    showSuccessBox();
}

// ========================================
// NETWORK STATUS MONITORING
// ========================================

window.addEventListener('online', () => {
    showAlert('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showAlert('No internet connection. Please check your network.', 'error');
});

// Make functions available globally
window.handleCredentialResponse = handleCredentialResponse;
window.signOut = signOut;
window.closeAlert = closeAlert;
window.resetForm = resetForm;
