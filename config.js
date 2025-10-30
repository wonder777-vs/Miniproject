// API Configuration
const CONFIG = {
    // Use the deployed URL when in production, localhost for development
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000'
        : 'https://miniproject-1-fcw7.onrender.com', // Replace with your actual Render URL
};

// Helper function for API calls
async function handleApiCall(endpoint, options = {}) {
    try {
        const url = `${CONFIG.API_URL}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}