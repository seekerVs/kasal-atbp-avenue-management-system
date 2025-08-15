// client/src/layouts/packageItems/packageForm/PackageImagesForm.tsx

import React from 'react';
import { Row, Col, Form, Button } from 'react-bootstrap';
import { PlusCircleFill } from 'react-bootstrap-icons';
import { ImageDropzone } from '../../../components/imageDropzone/ImageDropzone';

interface PackageImagesFormProps {
  imageUrls: (string | File | null)[];
  onImageSelect: (index: number, file: File | null) => void;
  onAddSlot: () => void;
}

export const PackageImagesForm: React.FC<PackageImagesFormProps> = ({
  imageUrls,
  onImageSelect,
  onAddSlot,
}) => {
  return (
    <Form.Group className="mb-3">
      <Form.Label>Package Images (Max 3)</Form.Label>
      <div className="p-3 border rounded">
        <Row className="g-3">
          {imageUrls.map((image, index) => (
            <Col key={index} md={6} lg={4}>
              <ImageDropzone
                label={`Image Slot #${index + 1}`}
                currentImage={image}
                onFileSelect={(file) => onImageSelect(index, file)}
              />
            </Col>
          ))}
          {imageUrls.length < 3 && (
            <Col md={6} lg={4} className="d-flex align-items-center justify-content-center">
              <Button
                variant="outline-secondary"
                className="w-100 h-100"
                style={{ minHeight: '100px', borderStyle: 'dashed' }}
                onClick={onAddSlot}
              >
                <PlusCircleFill size={24} />
                <span className="d-block">Add Image</span>
              </Button>
            </Col>
          )}
        </Row>
      </div>
    </Form.Group>
  );
};