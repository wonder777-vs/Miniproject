// config.js
// Determine API URL based on environment
const getApiUrl = () => {
    // If we're in development (localhost)
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    
    // For production, use the same domain but with /api prefix
    return window.location.origin;
};

// Export the API URL
window.API_CONFIG = {
    BASE_URL: getApiUrl(),
    // Add any other config you need
};

// Helper function for API calls
window.handleApiCall = async function(url, options = {}) {
    try {
        const response = await fetch(`${window.API_CONFIG.BASE_URL}${url}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            mode: 'cors',
            credentials: 'include',
            ...options
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        // Show notification if available
        if (window.showNotification) {
            window.showNotification(error.message || 'Network error. Please try again.', 'error');
        }
        throw error;
    }
};