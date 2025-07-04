import React from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import {
  PersonCircle,
  TelephoneFill,
  EnvelopeFill,
  GeoAltFill,
  PencilSquare,
  XCircle,
  Save,
} from 'react-bootstrap-icons';
import { CustomerInfo } from '../../types';

// --- COMPONENT PROPS INTERFACE ---
interface CustomerInfoCardProps {
  customer: CustomerInfo;
  isEditMode: boolean;
  canEdit: boolean; // Prop to determine if the edit button should show
  onSetIsEditMode: (isEditing: boolean) => void;
  onCustomerInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSaveChanges: () => void;
  onCancelEdit: () => void;
}

// ===================================================================================
// --- THE REUSABLE COMPONENT ---
// ===================================================================================
const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  customer,
  isEditMode,
  canEdit,
  onSetIsEditMode,
  onCustomerInputChange,
  onSaveChanges,
  onCancelEdit,
}) => {
  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">
          <PersonCircle className="me-2" />
          Customer Information
        </h5>
        {canEdit && !isEditMode && (
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onSetIsEditMode(true)}
          >
            <PencilSquare className="me-1" /> Edit
          </Button>
        )}
      </div>

      {isEditMode ? (
        <Form>
          <Form.Group as={Row} className="mb-2 align-items-center">
            <Form.Label column sm="3">
              <strong>Name:</strong>
            </Form.Label>
            <Col sm="9">
              <Form.Control
                type="text"
                name="name"
                value={customer.name}
                onChange={onCustomerInputChange}
              />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-2 align-items-center">
            <Form.Label column sm="3">
              <strong>Contact:</strong>
            </Form.Label>
            <Col sm="9">
              <Form.Control
                type="text"
                name="phoneNumber"
                value={customer.phoneNumber}
                onChange={onCustomerInputChange}
              />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-2 align-items-center">
            <Form.Label column sm="3">
              <strong>Email:</strong>
            </Form.Label>
            <Col sm="9">
              <Form.Control
                type="email"
                name="email"
                value={customer.email}
                onChange={onCustomerInputChange}
              />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-2 align-items-center">
            <Form.Label column sm="3">
              <strong>Address:</strong>
            </Form.Label>
            <Col sm="9">
              <Form.Control
                as="textarea"
                rows={2}
                name="address"
                value={customer.address}
                onChange={onCustomerInputChange}
              />
            </Col>
          </Form.Group>
          <div className="d-flex justify-content-end mt-3">
            <Button variant="secondary" className="me-2" onClick={onCancelEdit}>
              <XCircle className="me-1" /> Cancel
            </Button>
            <Button variant="success" onClick={onSaveChanges}>
              <Save className="me-1" /> Save Changes
            </Button>
          </div>
        </Form>
      ) : (
        <>
          <p>
            <strong>Name:</strong> {customer.name}
          </p>
          <p>
            <TelephoneFill className="me-2" />
            <strong>Contact:</strong> {customer.phoneNumber}
          </p>
          <p>
            <EnvelopeFill className="me-2" />
            <strong>Email:</strong> {customer.email || 'N/A'}
          </p>
          <p>
            <GeoAltFill className="me-2" />
            <strong>Address:</strong> {customer.address}
          </p>
        </>
      )}
    </>
  );
};

export default CustomerInfoCard;