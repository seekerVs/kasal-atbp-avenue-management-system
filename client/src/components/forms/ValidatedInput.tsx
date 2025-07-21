import React from 'react';
import { Form, FormControlProps } from 'react-bootstrap';

interface ValidatedInputProps extends FormControlProps {
  label: string;
  error?: string;
  isRequired?: boolean;
  rows?: number;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({ label, error, isRequired, ...rest }) => {
  return (
    <Form.Group className="mb-3">
      <Form.Label>
        {label}
        {isRequired && <span className="text-danger">*</span>}
      </Form.Label>
      <Form.Control
        {...rest}
        isInvalid={!!error} // Apply the 'is-invalid' class if an error exists
      />
      {/* This component from React-Bootstrap neatly displays the error message */}
      <Form.Control.Feedback type="invalid">
        {error}
      </Form.Control.Feedback>
    </Form.Group>
  );
};