// client/src/layouts/packageItems/packageForm/PackageDetailsForm.tsx

import React from 'react';
import { Row, Col, Form, InputGroup, Spinner } from 'react-bootstrap';

interface PackageDetailsFormProps {
  formData: { name: string; description?: string; };
  priceInput: string;
  errors: any;
  nameError: string | null;
  isCheckingName: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handlePriceInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePriceBlur: () => void;
}

export const PackageDetailsForm: React.FC<PackageDetailsFormProps> = ({
  formData, priceInput, errors, nameError, isCheckingName,
  handleInputChange, handlePriceInputChange, handlePriceBlur,
}) => {
  return (
    <>
      <Row>
        <Col md={8}>
          <Form.Group className="mb-3">
            <Form.Label>Package Name<span className="text-danger">*</span></Form.Label>
            <InputGroup hasValidation>
              <Form.Control name="name" value={formData.name} onChange={handleInputChange} isInvalid={!!errors.name || !!nameError} />
              {isCheckingName && <InputGroup.Text><Spinner size="sm" /></InputGroup.Text>}
              <Form.Control.Feedback type="invalid">{errors.name || nameError}</Form.Control.Feedback>
            </InputGroup>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Price<span className="text-danger">*</span></Form.Label>
            <InputGroup>
              <InputGroup.Text>₱</InputGroup.Text>
              <Form.Control type="text" inputMode="decimal" name="price" value={priceInput} onChange={handlePriceInputChange} onBlur={handlePriceBlur} isInvalid={!!errors.price} />
              <Form.Control.Feedback type="invalid">{errors.price}</Form.Control.Feedback>
            </InputGroup>
          </Form.Group>
        </Col>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label>Description<span className="text-danger">*</span></Form.Label>
        <Form.Control as="textarea" rows={2} name="description" value={formData.description || ''} onChange={handleInputChange} isInvalid={!!errors.description} />
        <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
      </Form.Group>
    </>
  );
};