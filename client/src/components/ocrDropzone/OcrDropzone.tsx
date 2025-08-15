// client/src/components/ocrDropzone/OcrDropzone.tsx

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { createWorker } from 'tesseract.js';
import { Image, Spinner, Form, Button, Modal } from 'react-bootstrap';
import { CloudArrowUp, ExclamationTriangleFill, PencilSquare } from 'react-bootstrap-icons';
import './ocrDropzone.css';

interface OcrDropzoneProps {
  onUpdate: (refNumber: string, file: File | null) => void;
  isInvalid?: boolean;
  errorText?: string;
}

type OcrStatus = 'idle' | 'processing' | 'success';

export const OcrDropzone: React.FC<OcrDropzoneProps> = ({ onUpdate, isInvalid = false, errorText  }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<OcrStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const lastProcessedFile = useRef<File | null>(null);

  const parseReferenceNumber = (fullText: string): string | null => {
    const gcashRegex = /Ref No\.\s*([\d\s]+)/;
    const match = fullText.match(gcashRegex);

    if (match && match[1]) {
      return match[1].replace(/\s/g, '');
    }
    return null; // Return null if no match is found
  };

  const processImage = useCallback(async (file: File) => {
    setStatus('processing');
    setProgress(0);
    setExtractedText('');
    lastProcessedFile.current = file;

    try {
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();
      const refNumber = parseReferenceNumber(text);

      if (refNumber) {
        setExtractedText(refNumber);
        onUpdate(refNumber, file);
        setStatus('success');
      } else {
        setShowErrorModal(true); 
        onUpdate('', file);
        setStatus('idle');
      }
    } catch (error) {
      console.error("OCR process failed:", error);
      setShowErrorModal(true); 
      onUpdate('', file);
      setStatus('idle');
    }
  }, [onUpdate]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      processImage(file);
    }
  }, [processImage]);

  const handleRetry = () => {
    setShowErrorModal(false);
    // Re-process the same file that just failed
    if (lastProcessedFile.current) {
      processImage(lastProcessedFile.current);
    }
  };

  const handleReset = () => {
      setImagePreview(null);
      setStatus('idle');
      setExtractedText('');
      onUpdate('', null); // <-- UPDATE: Send null for the file on reset
      lastProcessedFile.current = null;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.webp'] },
    multiple: false,
  });
  
  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setExtractedText(newValue);
    onUpdate(newValue, lastProcessedFile.current); 
  }

  return (
    <>
      <div className="ocr-dropzone-wrapper">
        {!imagePreview ? (
          // --- IDLE STATE ---
          <div {...getRootProps()} className={`dropzone-area idle ${isDragActive ? 'active' : ''}`}>
            <input {...getInputProps()} />
            <CloudArrowUp size={32} />
            <p className="mb-0 mt-2">
              <strong>Drop GCash receipt here</strong>
              <span className="d-block text-muted small">or click to browse</span>
            </p>
          </div>
        ) : (
          // --- PROCESSING, SUCCESS, OR ERROR STATE ---
          <div className="result-area">
            <Image src={imagePreview} rounded className="receipt-preview" />
      
            <div className="status-and-input">
              {status === 'processing' && (
                <div className="processing-status">
                  <Spinner size="sm" className="me-2" />
                  <span>Reading receipt... ({progress}%)</span>
                </div>
              )}
      
              <Form.Group>
                <Form.Label className="fw-bold">
                  <PencilSquare className="me-2"/>
                  GCash Reference Number
                </Form.Label>
                <Form.Control
                  type="text"
                  value={extractedText}
                  onChange={handleManualChange}
                  placeholder="Enter reference no. manually"
                  readOnly={status === 'processing'}
                  maxLength={13}
                  required
                  isInvalid={isInvalid}
                />
                <Form.Control.Feedback type="invalid">
                  {errorText}
                </Form.Control.Feedback>
              </Form.Group>
              <Button variant="link" size="sm" className="p-0 mt-2 text-decoration-none" onClick={handleReset}>
                  Upload a different receipt
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal show={showErrorModal} onHide={() => setShowErrorModal(false)} centered backdrop="static">
        <Modal.Header>
          <Modal.Title>
            <ExclamationTriangleFill className="me-2 text-warning" />
            Could Not Read Receipt
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>The system could not automatically find a Reference Number in the image provided.</p>
          <p className="mb-0">Please try one of the following:</p>
          <ul>
            <li>
              <strong>Re-upload a higher quality image</strong> of the receipt.
            </li>
            <li>
              <strong>Manually enter</strong> the reference number in the text box.
            </li>
          </ul>
        </Modal.Body>
        <Modal.Footer className="justify-content-between">
          <Button variant="outline-secondary" onClick={handleRetry}>
            Retry with Same Image
          </Button>
          <Button variant="primary" onClick={() => setShowErrorModal(false)}>
            OK, I'll Enter Manually
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};