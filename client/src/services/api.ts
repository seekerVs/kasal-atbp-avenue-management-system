import axios from 'axios';

// 1. Access the environment variable using `import.meta.env`
const API_BASE_URL = import.meta.env.VITE_API_URL;

// 2. (Optional but Recommended) Add a check to ensure the variable is set
if (!API_BASE_URL) {
  throw new Error("VITE_API_URL is not defined. Please check your .env file.");
}

// 3. Create a pre-configured instance of axios
const api = axios.create({
  baseURL: API_BASE_URL,
});

// 4. (Optional but Recommended) Add an interceptor to attach your auth token
// This automatically adds the token to every request if it exists.
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// 5. (Highly Recommended) Add a response interceptor for global error handling
// This will automatically log the user out if the server returns a 401 Unauthorized error.
api.interceptors.response.use(
  // If the response is successful (status 2xx), just return it
  (response) => response,
  
  // If the response has an error
  (error) => {
    // Check if the error is due to an expired or invalid token (status 401)
    if (error.response && error.response.status === 401) {
      // 1. Remove the invalid token from local storage
      localStorage.removeItem('authToken');
      
      // 2. Redirect the user to the sign-in page.
      // We use window.location.replace to do a full page reload, which
      // is the cleanest way to reset all application state.
      if (window.location.pathname !== '/signIn') {
        window.location.replace('/signIn');
      }
      
      // You could also show an alert here if you have a non-hook way to do so.
      // For example: alert('Your session has expired. Please log in again.');
    }
    
    // For all other errors, just pass them along to be handled by the component that made the call.
    return Promise.reject(error);
  }
);

/**
 * Uploads a file to the backend server.
 * @param file The File object to upload.
 * @returns The URL of the uploaded file from Vercel Blob.
 */
export async function uploadFile(file: File): Promise<string> {
  // Create a FormData object to send the file
  const formData = new FormData();
  formData.append('file', file); // The key 'file' must match what multer expects

  try {
    const response = await api.post('/upload', formData, {
      // This header is crucial for file uploads
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // The backend returns the full blob object; we just need the URL.
    return response.data.url;
  } catch (error) {
    console.error('File upload failed:', error);
    // Re-throw the error so the calling component can handle it
    throw error;
  }
}


// 5. Export the configured instance as the default
export default api;