import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { CustomerInfo, Address, FormErrors } from '../../../types';
import { ValidatedInput } from '../../forms/ValidatedInput';
import { AddressSelector } from '../../addressSelector/AddressSelector';
import { useAlert } from '../../../contexts/AlertContext';

interface EditCustomerInfoModalProps {
  show: boolean;
  onHide: () => void;
  customer: CustomerInfo | null;
  onSave: (updatedCustomer: CustomerInfo) => void;
}

export const EditCustomerInfoModal: React.FC<EditCustomerInfoModalProps> = ({
  show,
  onHide,
  customer,
  onSave,
}) => {
  const { addAlert } = useAlert();
  // We use a local "draft" state to manage changes without affecting the parent until "Save" is clicked.
  const [draftCustomer, setDraftCustomer] = useState<CustomerInfo | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  // When the modal is shown or the customer prop changes, reset the draft state.
  useEffect(() => {
    if (customer) {
      // Create a deep copy to prevent mutating the original object.
      setDraftCustomer(JSON.parse(JSON.stringify(customer)));
    }
  }, [customer, show]);

  const validate = (): boolean => {
    if (!draftCustomer) return false;
    
    const newErrors: FormErrors = { address: {} };
    if (!draftCustomer.name.trim()) newErrors.name = 'Customer Name is required.';
    if (!/^09\d{9}$/.test(draftCustomer.phoneNumber)) newErrors.phoneNumber = 'Phone number must be a valid 11-digit number starting with 09.';
    if (!draftCustomer.address.province) newErrors.address.province = 'Province is required.';
    if (!draftCustomer.address.city) newErrors.address.city = 'City/Municipality is required.';
    if (!draftCustomer.address.barangay) newErrors.address.barangay = 'Barangay is required.';
    if (!draftCustomer.address.street.trim()) newErrors.address.street = 'Street is required.';
    
    setErrors(newErrors);
    const hasMainErrors = Object.keys(newErrors).length > 1;
    const hasAddressErrors = Object.keys(newErrors.address).length > 0;
    
    return !hasMainErrors && !hasAddressErrors;
  };

  const handleSave = () => {
    if (draftCustomer && validate()) {
      onSave(draftCustomer);
      onHide(); // The parent component will handle the API call
    } else {
      addAlert("Please correct the validation errors before saving.", "warning");
    }
  };

  // Handlers for updating the local draft state
  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!draftCustomer) return;
    const { name, value } = e.target;
    setDraftCustomer({ ...draftCustomer, [name]: value });
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    if (draftCustomer) {
      setDraftCustomer({ ...draftCustomer, address: { ...draftCustomer.address, [field]: value } });
    }
  };

  // Guard clause in case the draftCustomer state is not yet ready
  if (!draftCustomer) {
    return null;
  }

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Edit Customer Information</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <ValidatedInput
            label="Name" name="name"
            value={draftCustomer.name}
            onChange={handleDraftChange}
            error={errors.name}
            isRequired
          />
          <Row>
            <Col md={6}>
              <ValidatedInput
                label="Contact Number" name="phoneNumber"
                value={draftCustomer.phoneNumber}
                onChange={handleDraftChange}
                error={errors.phoneNumber}
                isRequired
              />
            </Col>
            <Col md={6}>
              <ValidatedInput
                label="Email Address" name="email" type="email"
                value={draftCustomer.email || ''}
                onChange={handleDraftChange}
                error={errors.email}
              />
            </Col>
          </Row>

          <hr />
          <Row className="g-3">
            <AddressSelector 
              value={draftCustomer.address} 
              onChange={handleAddressChange} 
              errors={errors.address || {}}
              layout="vertical"
            />
            <Col xs={12} md={6}>
              <ValidatedInput 
                label="Street, House No."
                as="textarea" rows={2} 
                value={draftCustomer.address.street} 
                onChange={(e) => handleAddressChange('street', e.target.value)} 
                isRequired 
                error={errors.address?.street}
              />
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save Changes</Button>
      </Modal.Footer>
    </Modal>
  );
};