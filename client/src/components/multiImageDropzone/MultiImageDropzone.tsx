import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { ProgressBar, Image, Modal } from 'react-bootstrap';
import { 
  CloudArrowUp, 
  X, 
  XCircle, 
  CheckCircleFill, 
  ArrowClockwise
} from 'react-bootstrap-icons';
import './multiImageDropzone.css';
import api from '../../services/api'; // Import the raw axios instance

// --- TYPE DEFINITIONS ---
type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

interface UploadFileState {
  id: string; // A unique ID for React keys
  file?: File; // The browser File object for new uploads
  status: UploadStatus;
  progress: number;
  url?: string; // The final URL after upload (for existing images)
  error?: string;
}

// Props for the component
interface MultiImageDropzoneProps {
  existingImageUrls: (string | File)[]; 
  maxFiles?: number;
}

// --- NEW: Define the functions that the parent can call via the ref ---
export interface MultiImageDropzoneRef {
  uploadAll: () => Promise<string[]>;
  getFiles: () => (File | string)[];
}

interface FileItemPreviewProps {
  fileState: UploadFileState;
  onRemove: (id: string) => void;
  onRetry: (file: UploadFileState) => void;
  onView: (file: File | string) => void;
}

const FileItemPreview: React.FC<FileItemPreviewProps> = ({ fileState, onRemove, onRetry, onView }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const imageSource = fileState.file || fileState.url;

  // This effect handles creating and cleaning up temporary blob URLs
  useEffect(() => {
    let objectUrl: string | null = null;
    
    if (imageSource instanceof File) {
      // Create a temporary local URL for the staged File object
      objectUrl = URL.createObjectURL(imageSource);
      setPreviewUrl(objectUrl);
    } else if (typeof imageSource === 'string') {
      // If it's a string, it's an existing URL
      setPreviewUrl(imageSource);
    } else {
      setPreviewUrl(null);
    }

    // Cleanup function: revoke the object URL to avoid memory leaks
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageSource]); // Re-run when the file source changes

  const handleViewClick = () => {
    if (imageSource) {
      onView(imageSource);
    }
  };

  return (
    <div className="file-item">
      {/* --- THIS IS THE CHANGE: Use Image instead of an icon --- */}
      <Image src={previewUrl || undefined} className="file-item-preview" onClick={handleViewClick} />

      <div className="file-details">
        <div className="file-name" title={fileState.file?.name || fileState.url}>
          {fileState.file?.name || fileState.url?.split('/').pop()}
        </div>
        
        {/* All the status display logic remains the same */}
        {fileState.status === 'pending' && <div className="file-status text-muted">Pending Upload</div>}
        {fileState.status === 'uploading' && (
          <div className="progress-wrapper">
            <ProgressBar now={fileState.progress} style={{height: '6px'}} animated/>
            <span className="progress-percentage">{fileState.progress}%</span>
          </div>
        )}
        {fileState.status === 'success' && (
          <div className="file-status text-success"><CheckCircleFill /><span>Complete</span></div>
        )}
        {fileState.status === 'error' && (
          <div className="file-status text-danger"><XCircle /><span>{fileState.error}</span></div>
        )}
      </div>

      <div className="file-actions">
        {fileState.status === 'error' && (
            <button type="button" onClick={() => onRetry(fileState)} className="remove-btn me-2" title="Retry upload">
                <ArrowClockwise size={18}/>
            </button>
        )}
        <button type="button" onClick={() => onRemove(fileState.id)} className="remove-btn" title="Remove file">
          <X size={22}/>
        </button>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT (Wrapped in forwardRef) ---
export const MultiImageDropzone = forwardRef<MultiImageDropzoneRef, MultiImageDropzoneProps>(
  ({ existingImageUrls, maxFiles = 10 }, ref) => {
    const [files, setFiles] = useState<UploadFileState[]>([]);
    const [imageInView, setImageInView] = useState<File | string | null>(null);
    const [imageInViewUrl, setImageInViewUrl] = useState<string | null>(null);

    useEffect(() => {
      const initialFiles = (existingImageUrls || []).map((fileOrUrl, index) => {
        if (typeof fileOrUrl === 'string') {
          return {
            id: `existing-${index}-${Date.now()}`,
            status: 'success' as UploadStatus,
            progress: 100,
            url: fileOrUrl,
          };
        } else {
          return {
            id: `${fileOrUrl.name}-${Date.now()}`,
            file: fileOrUrl,
            status: 'pending' as UploadStatus,
            progress: 0,
          };
        }
      });
      setFiles(initialFiles);
    }, [existingImageUrls]);

    useEffect(() => {
      if (imageInView instanceof File) {
        const objectUrl = URL.createObjectURL(imageInView);
        setImageInViewUrl(objectUrl);
        // Cleanup function for when the modal closes or the image changes
        return () => URL.revokeObjectURL(objectUrl);
      } else if (typeof imageInView === 'string') {
        setImageInViewUrl(imageInView);
      } else {
        setImageInViewUrl(null);
      }
    }, [imageInView]);

    // --- NEW: Expose the uploadAll function to the parent ---
    useImperativeHandle(ref, () => ({
      // This is the main function the parent will call
      uploadAll: async (): Promise<string[]> => {
        const filesToUpload = files.filter(f => f.status === 'pending' && f.file);
        const existingUrls = files.filter(f => f.status === 'success' && f.url).map(f => f.url!);
        
        const uploadPromises = filesToUpload.map(f => handleUpload(f));
        
        try {
          const uploadedUrls = await Promise.all(uploadPromises);
          // Return the combined list of old and newly uploaded URLs
          return [...existingUrls, ...uploadedUrls];
        } catch (error) {
          console.error("One or more uploads failed.", error);
          // If any upload fails, we reject the promise so the parent form doesn't submit.
          throw new Error("Failed to upload all images.");
        }
      },
      // Helper function for the parent to see what's in the queue
      getFiles: () => {
        return files.map(f => f.file || f.url!);
      }
    }));


    const onDrop = useCallback((acceptedFiles: File[]) => {
      if (files.length + acceptedFiles.length > maxFiles) {
        alert(`You can only upload a maximum of ${maxFiles} files.`);
        return;
      }
        
      const newFiles: UploadFileState[] = acceptedFiles.map((file) => ({
        id: `${file.name}-${Date.now()}`,
        file: file,
        status: 'pending', // Status is now 'pending', not 'uploading'
        progress: 0,
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }, [files, maxFiles]);

    const handleUpload = async (fileToUpload: UploadFileState): Promise<string> => {
      if (!fileToUpload.file) return Promise.reject("No file object present.");

      setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'uploading' } : f));
      
      try {
        const formData = new FormData();
        formData.append('file', fileToUpload.file);

        // We use the raw axios instance to get access to onUploadProgress
        const response = await api.post('/upload', formData, {
          onUploadProgress: (progressEvent: any) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, progress: percentCompleted } : f));
          },
        });

        const newUrl = response.data.url;
        setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'success', url: newUrl, progress: 100 } : f));
        return newUrl; // Resolve the promise with the URL
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === fileToUpload.id ? { ...f, status: 'error', error: 'Upload failed' } : f));
        throw err; // Reject the promise to fail the Promise.all
      }
    };
    
    const handleRemoveFile = (id: string) => {
      // This function now ONLY removes the file from the local component state.
      // It makes no API calls.
      setFiles(prev => prev.filter(f => f.id !== id));
    };  

    const handleRetry = (fileToRetry: UploadFileState) => {
        if (fileToRetry.status === 'error') {
            handleUpload(fileToRetry);
        }
    };
    
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, multiple: true });

    return (
        <div>
          <div {...getRootProps()} className={`multi-dropzone ${isDragActive ? 'active' : ''}`}>
            <input {...getInputProps()} />
            <CloudArrowUp size={32} className="mb-2 text-muted" />
            <p className="mb-0">Drag & drop images here, or click to browse.</p>
            <small className="text-muted">{files.length} of {maxFiles} files</small>
          </div>
    
          <div className="file-list">
            {files.map(f => (
              <FileItemPreview
                key={f.id}
                fileState={f}
                onRemove={handleRemoveFile}
                onRetry={handleRetry}
                onView={(fileOrUrl) => setImageInView(fileOrUrl)}
              />
            ))}
          </div>
          <Modal show={!!imageInView} onHide={() => setImageInView(null)} centered size="lg">
            <Modal.Body className='p-0 m-auto'>
              {imageInViewUrl && <Image src={imageInViewUrl} fluid />}
            </Modal.Body>
          </Modal>
        </div>
      );
  }
);