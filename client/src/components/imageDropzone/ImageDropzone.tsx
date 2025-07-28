import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Image, Form, Button } from 'react-bootstrap';
import { CloudUpload, Trash } from 'react-bootstrap-icons';
import './ImageDropzone.css';

interface ImageDropzoneProps {
  // Can be a string (existing URL) or a File object (staged file)
  currentImage: string | File | null | undefined; 
  onFileSelect: (file: File | null) => void;
  label: string;
}

export function ImageDropzone({ currentImage, onFileSelect, label }: ImageDropzoneProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    if (currentImage instanceof File) {
      // If we have a File object, create a temporary local URL for preview
      objectUrl = URL.createObjectURL(currentImage);
      setPreviewUrl(objectUrl);
    } else if (typeof currentImage === 'string') {
      // If we have a string, it's an existing URL
      setPreviewUrl(currentImage);
    } else {
      setPreviewUrl(null);
    }

    // Cleanup function: revoke the object URL to avoid memory leaks
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [currentImage]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // If a file is selected, pass it up to the parent component
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const handleRemove = () => {
    // Notify the parent to clear the file
    onFileSelect(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.webp'] },
    multiple: false, // <-- This enforces a single file upload
  });

  return (
    <Form.Group className="mb-3">
      <Form.Label>{label}<span className="text-danger">*</span></Form.Label>
      
      {previewUrl ? (
        // If an image exists, show the preview and remove button
        <div className="mt-2 d-flex align-items-center">
          <Image src={previewUrl} thumbnail width={80} height={80} style={{ objectFit: 'cover' }} />
          <Button variant="outline-danger" size="sm" className="ms-3" onClick={handleRemove}>
            <Trash className="me-1" /> Remove
          </Button>
        </div>
      ) : (
        // If no image, show the dropzone
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
          <input {...getInputProps()} />
          <div className="dropzone-content">
            <CloudUpload />
            <span className="ms-2">
              {isDragActive ? 'Drop the image here' : 'Drag & drop a single image, or click'}
            </span>
          </div>
        </div>
      )}
    </Form.Group>
  );
}