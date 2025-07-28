import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col } from 'react-bootstrap';
import {
  PersonCircle,
  TelephoneFill,
  EnvelopeFill,
  GeoAltFill,
  PencilSquare,
  XCircle,
  Save,
} from 'react-bootstrap-icons';
import { Address, CustomerInfo, FormErrors } from '../../types';
import { ValidatedInput } from '../forms/ValidatedInput';
import { AddressSelector } from '../addressSelector/AddressSelector';
import { useAlert } from '../../contexts/AlertContext';

// --- REFACTORED PROPS ---
// The component is now simpler to use. It only needs the data and a save handler.
interface CustomerInfoCardProps {
  customer: CustomerInfo;
  canEdit: boolean; // Prop to determine if the edit button should show at all
  onSave: (updatedCustomer: CustomerInfo) => void; // A single function to call on save
}

const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  customer,
  canEdit,
  onSave,
}) => {
  // --- INTERNAL STATE MANAGEMENT ---
  // The component now manages its own edit mode and a "draft" of the customer data.
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftCustomer, setDraftCustomer] = useState<CustomerInfo | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const { addAlert } = useAlert();

  // When the parent's `customer` data changes (e.g., after a save),
  // ensure our draft state is also updated if we are in edit mode.
  useEffect(() => {
    if (isEditMode) {
      setDraftCustomer(JSON.parse(JSON.stringify(customer)));
    }
  }, [customer, isEditMode]);

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
    // Check if the main error object has keys (besides 'address') OR if the nested address object has keys.
    const hasMainErrors = Object.keys(newErrors).length > 1;
    const hasAddressErrors = Object.keys(newErrors.address).length > 0;
    
    return !hasMainErrors && !hasAddressErrors;
  };

  // --- INTERNAL HANDLERS ---
  const handleEditClick = () => {
    // When editing starts, create a deep copy of the customer prop to avoid bugs
    setDraftCustomer(JSON.parse(JSON.stringify(customer)));
    setIsEditMode(true);
  };

  const handleCancel = () => {
    // Simply discard the draft and switch back to view mode
    setDraftCustomer(null);
    setIsEditMode(false);
  };

  const handleSave = () => {
    // 4. Run validation before saving
    if (draftCustomer && validate()) {
      onSave(draftCustomer);
      setIsEditMode(false);
      setDraftCustomer(null);
      setErrors({});
    } else {
      addAlert("Please correct the validation errors.", "warning");
    }
  };

  // Handlers for updating the internal draft state
  const handleDraftChange = (field: keyof Omit<CustomerInfo, 'address'>, value: string) => {
    if (draftCustomer) {
      setDraftCustomer({ ...draftCustomer, [field]: value });
    }
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    if (draftCustomer) {
      setDraftCustomer({ ...draftCustomer, address: { ...draftCustomer.address, [field]: value } });
    }
  };
  
  // --- RENDER LOGIC ---
  return (
    <>
      {/* This div replaces the <Card.Header> */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Customer Information</h5>
        {canEdit && !isEditMode && (
          <Button variant="outline-secondary" size="sm" onClick={handleEditClick}>
            <PencilSquare className="me-1" /> Edit
          </Button>
        )}
      </div>

      {/* The content is no longer inside a <Card.Body> */}
      {isEditMode && draftCustomer ? (
        // --- EDIT MODE ---
        <Form>
          <ValidatedInput label="Name" name="name" value={draftCustomer.name} onChange={(e) => handleDraftChange('name', e.target.value)} error={errors.name} />
          <Row>
            <Col md={6}><ValidatedInput label="Contact" name="phoneNumber" value={draftCustomer.phoneNumber} onChange={(e) => handleDraftChange('phoneNumber', e.target.value)} error={errors.phoneNumber} /></Col>
            <Col md={6}><ValidatedInput label="Email" name="email" type="email" value={draftCustomer.email || ''} onChange={(e) => handleDraftChange('email', e.target.value)} error={errors.email} /></Col>
          </Row>
          <hr/>
          <Row className="g-3">
            <AddressSelector 
              value={draftCustomer.address} 
              onChange={handleAddressChange} 
              errors={errors.address || {}} // Pass down the nested address errors
              layout="vertical" 
            />
            <Col xs={12} md={6}>
              <ValidatedInput 
                label="Street, House No." 
                as="textarea" 
                rows={2} 
                value={draftCustomer.address.street} 
                onChange={(e) => handleAddressChange('street', e.target.value)} 
                isRequired 
                error={errors.address?.street} // Pass down the specific street error
              />
            </Col>
          </Row>
          
          <div className="d-flex justify-content-end mt-3 gap-2">
            <Button variant="secondary" onClick={handleCancel}><XCircle className="me-1" /> Cancel</Button>
            <Button variant="success" onClick={handleSave}><Save className="me-1" /> Save Changes</Button>
          </div>
        </Form>
      ) : (
        // --- VIEW MODE ---
        // Updated styling to match the screenshot
        <div>
          <p ><PersonCircle className="me-2 text-muted" /><strong>Name:</strong> {customer.name}</p>
          <p ><TelephoneFill className="me-2 text-muted" /><strong>Contact:</strong> {customer.phoneNumber}</p>
          <p ><EnvelopeFill className="me-2 text-muted" /><strong>Email:</strong> {customer.email || 'N/A'}</p>
          <div className="d-flex">
            <GeoAltFill className="me-2 text-muted flex-shrink-0" style={{ marginTop: '0.25rem' }}/>
            <div>
              <strong>Address:</strong>
              <div className="text-muted" style={{ lineHeight: '1.4' }}>
                {customer.address.street},<br/>
                {customer.address.barangay}, {customer.address.city},<br/>
                {customer.address.province}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerInfoCard;