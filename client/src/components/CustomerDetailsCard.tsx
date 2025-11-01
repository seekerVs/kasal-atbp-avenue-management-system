import React, { useState, useMemo } from 'react';
import { Card, Button, Form, ListGroup, Spinner, Row, Col } from 'react-bootstrap';
import { PersonFill, PeopleFill, CreditCard } from 'react-bootstrap-icons';

import { CustomerInfo, RentalOrder, Address, FormErrors } from '../types';
import { ValidatedInput } from './forms/ValidatedInput'; // Assuming this path is correct
import { AddressSelector } from './addressSelector/AddressSelector'; // Assuming this path is correct

// --- UPDATED: Simplified Component Props ---
interface CustomerDetailsCardProps {
  customerDetails: CustomerInfo;
  setCustomerDetails: React.Dispatch<React.SetStateAction<CustomerInfo>>;
  allRentals: RentalOrder[];
  onSelectExisting: (rental: RentalOrder) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  errors: FormErrors;
}

function CustomerDetailsCard({
  customerDetails,
  setCustomerDetails,
  allRentals,
  onSelectExisting,
  onSubmit,
  isSubmitting,
  canSubmit,
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
    // Create a map to store unique customers by phone number to avoid duplicates in the list
    const uniqueCustomers = new Map<string, RentalOrder>();
    allRentals.forEach(r => {
      const customer = r.customerInfo[0];
      if (customer && !uniqueCustomers.has(customer.phoneNumber)) {
        if (customer.name.toLowerCase().includes(term) || customer.phoneNumber.includes(term)) {
          uniqueCustomers.set(customer.phoneNumber, r);
        }
      }
    });
    return Array.from(uniqueCustomers.values());
  }, [searchTerm, allRentals]);

  return (
    <Card className="shadow-sm lh-1">
      <Card.Header as="h5" className="d-flex align-items-center justify-content-between">
        <div><PersonFill className="me-2" />Customer Details</div>
        {/* The mode-switching button is now gone */}
      </Card.Header>
      <Card.Body className="d-flex flex-column">
        <div className="flex-grow-1">
          {/* --- NEW SEARCH SECTION --- */}
          <Form.Group className="mb-2 position-relative">
            <Form.Label><PeopleFill className="me-2" />Search Customer</Form.Label>
            <Form.Control 
              type="text" 
              placeholder="Type name or phone number..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              autoComplete="off"
            />
            {searchTerm && (
              <ListGroup className="position-absolute w-100" style={{ zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                {filteredRentals.length > 0 ? filteredRentals.map(r => (
                  <ListGroup.Item action key={r._id} onClick={() => { onSelectExisting(r); setSearchTerm(''); }}>
                    <div className="d-flex justify-content-between">
                      <span className="fw-bold">{r.customerInfo[0].name}</span>
                      <small className="text-muted">{r.customerInfo[0].phoneNumber}</small>
                    </div>
                  </ListGroup.Item>
                )) : <ListGroup.Item disabled>No customers found.</ListGroup.Item>}
              </ListGroup>
            )}
          </Form.Group>

          <hr />
          
          {/* --- ALWAYS VISIBLE INPUT FIELDS --- */}
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
                  label="Email" isRequired
                  name="email" type="email"
                  value={customerDetails.email || ''}
                  onChange={(e) => handleCustomerChange('email', e.target.value)}
                  error={errors.email}
                />
              </Col>
            </Row>
            <hr />
            <Row className="g-3">
              <AddressSelector
                value={customerDetails.address}
                onChange={handleAddressChange}
                errors={errors.address || {}}
                layout="vertical"
              />
              <Col xs={12} md={6} className="mb-2">
                  <ValidatedInput
                      label="Street, House No." isRequired
                      name="street" as="textarea" rows={2}
                      value={customerDetails.address.street}
                      onChange={(e) => handleAddressChange('street', e.target.value)}
                      error={errors.address?.street}
                  />
              </Col>
            </Row>
          </Form>
        </div>
        
        {/* --- The Footer remains the same --- */}
        <div className="d-grid gap-2 mt-auto">
          <Button size="lg" onClick={onSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? <Spinner as="span" size="sm" /> : <CreditCard className="me-2" />}
            Finalize as New Rental
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

export default CustomerDetailsCard;