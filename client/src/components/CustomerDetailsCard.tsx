import React, { useState, useMemo } from 'react';
import { Card, Button, Form, ListGroup, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { PersonFill, TelephoneFill, Envelope, PeopleFill, PlusCircle, CreditCard } from 'react-bootstrap-icons';

import { CustomerInfo, RentalOrder, Address, FormErrors } from '../types';
import { ValidatedInput } from './forms/ValidatedInput'; // Assuming this path is correct
import { AddressSelector } from './addressSelector/AddressSelector'; // Assuming this path is correct

// --- UPDATED: Simplified Component Props ---
interface CustomerDetailsCardProps {
  customerDetails: CustomerInfo;
  setCustomerDetails: React.Dispatch<React.SetStateAction<CustomerInfo>>;
  isNewCustomerMode: boolean;
  onSetIsNewCustomerMode: React.Dispatch<React.SetStateAction<boolean>>;
  allRentals: RentalOrder[];
  onSelectExisting: (rental: RentalOrder) => void;
  onSubmit: (action: 'create' | 'add') => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  existingOpenRental: RentalOrder | null;
  selectedRentalForDisplay: RentalOrder | null;
  errors: FormErrors;
}

function CustomerDetailsCard({
  customerDetails,
  setCustomerDetails,
  isNewCustomerMode,
  onSetIsNewCustomerMode,
  allRentals,
  onSelectExisting,
  onSubmit,
  isSubmitting,
  canSubmit,
  existingOpenRental,
  selectedRentalForDisplay,
  errors = {}
}: CustomerDetailsCardProps) {

  const [searchTerm, setSearchTerm] = useState('');

  const handleCustomerChange = (field: keyof Omit<CustomerInfo, 'address'>, value: string) => {
    setCustomerDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    setCustomerDetails(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const filteredRentals = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return allRentals.filter(r =>
      r.customerInfo[0]?.name.toLowerCase().includes(term) ||
      r.customerInfo[0]?.phoneNumber.includes(term) ||
      r._id.toLowerCase().includes(term)
    );
  }, [searchTerm, allRentals]);

  return (
    <Card className="shadow-sm">
      <Card.Header as="h5" className="d-flex align-items-center justify-content-between">
        <div><PersonFill className="me-2" />Customer Details</div>
        <Button variant="outline-secondary" size="sm" onClick={() => onSetIsNewCustomerMode(!isNewCustomerMode)}>
          {isNewCustomerMode ? 'Select Existing' : 'Enter New'}
        </Button>
      </Card.Header>
      <Card.Body className="d-flex flex-column">
        <div className="flex-grow-1">
          {isNewCustomerMode ? (
            // --- REFACTORED: Using reusable components ---
            <Form>
              <ValidatedInput
                label="Customer Name" isRequired
                name="name" value={customerDetails.name}
                onChange={(e) => handleCustomerChange('name', e.target.value)}
                error={errors.name}
              />
              <Row>
                <Col md={6}>
                  <ValidatedInput
                    label="Contact Number" isRequired
                    name="phoneNumber" type="tel" maxLength={11}
                    value={customerDetails.phoneNumber}
                    onChange={(e) => handleCustomerChange('phoneNumber', e.target.value)}
                    error={errors.phoneNumber}
                  />
                </Col>
                <Col md={6}>
                  <ValidatedInput
                    label="Email"
                    name="email" type="email"
                    value={customerDetails.email || ''}
                    onChange={(e) => handleCustomerChange('email', e.target.value)}
                    error={errors.email}
                  />
                </Col>
              </Row>
              <hr />
              <Row className="g-3">
                {/* 2. The AddressSelector will now render its 3 half-width columns here */}
                <AddressSelector
                  value={customerDetails.address}
                  onChange={handleAddressChange}
                  errors={errors.address || {}}
                  layout="vertical"
                />

                {/* 3. The Street input becomes the 4th column in the grid */}
                <Col xs={12} md={6} className="mb-3">
                    <ValidatedInput
                        label="Street" isRequired
                        name="street" as="textarea" rows={2}
                        value={customerDetails.address.street}
                        onChange={(e) => handleAddressChange('street', e.target.value)}
                        error={errors.address?.street}
                    />
                </Col>
              </Row>
            </Form>
          ) : (
            <>
              <Form.Group className="mb-3">
                <Form.Label><PeopleFill className="me-2" />Search Existing Customer/Rental</Form.Label>
                <Form.Control type="text" placeholder="Type name, phone, or rental ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </Form.Group>
              {searchTerm && (
                <ListGroup className="mb-3" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {filteredRentals.length > 0 ? filteredRentals.map(r => (
                    <ListGroup.Item action key={r._id} onClick={() => { onSelectExisting(r); setSearchTerm(''); }}>
                      <div className="d-flex justify-content-between">
                        <span className="fw-bold">{r.customerInfo[0].name}</span>
                        <small className="text-muted">ID: {r._id}</small>
                      </div>
                      <div className="text-muted small">{r.customerInfo[0].phoneNumber}</div>
                    </ListGroup.Item>
                  )) : <ListGroup.Item disabled>No results found.</ListGroup.Item>}
                </ListGroup>
              )}
              {selectedRentalForDisplay && !searchTerm && (
                <Card body className="mb-3 bg-light">
                  <div className="d-flex justify-content-between">
                    <span className="fw-bold">{selectedRentalForDisplay.customerInfo[0].name}</span>
                    <small className="text-muted">Rental ID: {selectedRentalForDisplay._id}</small>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted small">{selectedRentalForDisplay.customerInfo[0].phoneNumber}</span>
                    <small className="text-muted">Created: {new Date(selectedRentalForDisplay.createdAt).toLocaleDateString()}</small>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
        <div className="d-grid gap-2 mt-auto">
          {(existingOpenRental && !isNewCustomerMode) ? (
            <>
              <Alert variant="info" className="text-center mb-2 small py-2">This customer has a rental "To Process".</Alert>
              <Button variant="info" size="lg" onClick={() => onSubmit('add')} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? <Spinner as="span" size="sm" /> : <PlusCircle className="me-2" />}
                Add to Existing Rental
              </Button>
              <Button size="lg" onClick={() => onSubmit('create')} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? <Spinner as="span" size="sm" /> : <CreditCard className="me-2" />}
                Finalize as New Rental
              </Button>
            </>
          ) : (
            <Button size="lg" onClick={() => onSubmit('create')} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? <Spinner as="span" size="sm" /> : <CreditCard className="me-2" />}
              Finalize as New Rental
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}

export default CustomerDetailsCard;