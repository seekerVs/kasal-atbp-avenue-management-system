// client/src/components/imageDropzone/ImageDropzone.tsx

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Spinner, Image, Form } from 'react-bootstrap';
import { CloudUpload, CheckCircleFill, XCircleFill } from 'react-bootstrap-icons';
import { uploadFile } from '../../services/api'; // Import our upload service
import './ImageDropzone.css'; // We'll create this CSS file next

interface ImageDropzoneProps {
  currentImageUrl: string;
  onUploadSuccess: (newImageUrl: string) => void;
  label: string;
}

export function ImageDropzone({ currentImageUrl, onUploadSuccess, label }: ImageDropzoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const newImageUrl = await uploadFile(file);
      onUploadSuccess(newImageUrl); // Notify the parent component of the new URL
    } catch (err) {
      console.error("Upload failed in dropzone:", err);
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.webp'] },
    multiple: false,
  });

  return (
    <Form.Group className="mb-3">
      <Form.Label>{label}</Form.Label>
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="dropzone-content">
            <Spinner animation="border" size="sm" />
            <span className="ms-2">Uploading...</span>
          </div>
        ) : error ? (
          <div className="dropzone-content error">
            <XCircleFill />
            <span className="ms-2">{error}</span>
          </div>
        ) : (
          <div className="dropzone-content">
            <CloudUpload />
            <span className="ms-2">
              {isDragActive ? 'Drop the image here!' : 'Drag & drop image, or click to select'}
            </span>
          </div>
        )}
      </div>
      {currentImageUrl && (
        <div className="mt-2 d-flex align-items-center">
            <Image src={currentImageUrl} thumbnail width={80} height={80} style={{ objectFit: 'cover' }} />
            <small className="ms-3 text-muted text-truncate">Current Image: {currentImageUrl}</small>
        </div>
      )}
    </Form.Group>
  );
}