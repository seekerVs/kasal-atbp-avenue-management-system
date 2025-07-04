import React, { useState, useMemo } from 'react';
import { Card, Button, Form, ListGroup, Spinner, Alert } from 'react-bootstrap';
import { PersonFill, TelephoneFill, GeoAltFill, Envelope, PeopleFill, PlusCircle, CreditCard } from 'react-bootstrap-icons';

// --- NEW: Import the official types ---
import { CustomerInfo, RentalOrder } from '../types';


// --- Component Props Interface (Now uses imported types) ---
interface CustomerDetailsCardProps {
  customerDetails: CustomerInfo; // Use CustomerInfo
  onCustomerDetailChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isNewCustomerMode: boolean;
  onSetIsNewCustomerMode: React.Dispatch<React.SetStateAction<boolean>>;
  allRentals: RentalOrder[];
  onSelectExisting: (rental: RentalOrder) => void;
  onSubmit: (action: 'create' | 'add') => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  existingOpenRental: RentalOrder | null;
  selectedRentalForDisplay: RentalOrder | null;
}

// --- The Reusable Component ---
function CustomerDetailsCard({
  customerDetails,
  onCustomerDetailChange,
  isNewCustomerMode,
  onSetIsNewCustomerMode,
  allRentals,
  onSelectExisting,
  onSubmit,
  isSubmitting,
  canSubmit,
  existingOpenRental,
  selectedRentalForDisplay
}: CustomerDetailsCardProps) {

  const [searchTerm, setSearchTerm] = useState('');

  const filteredRentals = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    // Use optional chaining for safety, although customerInfo should always exist
    return allRentals.filter(r =>
      r.customerInfo[0]?.name.toLowerCase().includes(term) ||
      r.customerInfo[0]?.phoneNumber.includes(term) ||
      r._id.toLowerCase().includes(term)
    );
  }, [searchTerm, allRentals]);

  return (
    <Card>
      <Card.Header as="h5" className="d-flex align-items-center justify-content-between">
        <div><PersonFill className="me-2" />Customer Details</div>
        <Button variant="outline-secondary" size="sm" onClick={() => onSetIsNewCustomerMode(!isNewCustomerMode)}>
          {isNewCustomerMode ? 'Select Existing' : 'Enter New'}
        </Button>
      </Card.Header>
      <Card.Body className="d-flex flex-column">
        <div className="flex-grow-1">
          {isNewCustomerMode ? (
            <Form>
              <Form.Group className="mb-3" controlId="formCustomerName">
                <Form.Label>Customer Name <span className="text-danger">*</span></Form.Label>
                <Form.Control name="name" type="text" value={customerDetails.name} onChange={onCustomerDetailChange} placeholder="Enter full name" />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formCustomerPhone">
                <Form.Label><TelephoneFill className="me-1" />Contact Number <span className="text-danger">*</span></Form.Label>
                <Form.Control name="phoneNumber" type="text" value={customerDetails.phoneNumber} onChange={onCustomerDetailChange} placeholder="Enter contact #" />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formCustomerAddress">
                <Form.Label><GeoAltFill className="me-1" />Address <span className="text-danger">*</span></Form.Label>
                <Form.Control name="address" as="textarea" rows={2} value={customerDetails.address} onChange={onCustomerDetailChange} placeholder="Enter full address" />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formCustomerEmail">
                <Form.Label><Envelope className="me-1" />Email (Optional)</Form.Label>
                <Form.Control name="email" type="email" value={customerDetails.email} onChange={onCustomerDetailChange} placeholder="Enter email" />
              </Form.Group>
            </Form>
          ) : (
            <>
              <Form.Group className="mb-3">
                <Form.Label><PeopleFill className="me-2" />Search Existing Rental</Form.Label>
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
                  )) : <ListGroup.Item disabled>No rentals found.</ListGroup.Item>}
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
          
          {/* We use a single conditional check to decide which set of buttons to show */}
          {(existingOpenRental && !isNewCustomerMode) ? (

            // --- UI STATE 1: Shows when an existing customer WITH an open rental is selected ---
            <>
              <Alert variant="info" className="text-center mb-2">
                This customer has a rental "To Process".
              </Alert>

              {/* Button A: The primary action to ADD to the existing rental */}
              <Button variant="info" size="lg" onClick={() => onSubmit('add')} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? <Spinner as="span" size="sm" /> : <PlusCircle className="me-2" />}
                Add to Existing Rental
              </Button>
              
              {/* Button B: The secondary action to CREATE a new rental instead */}
              <Button variant="danger" size="lg" onClick={() => onSubmit('create')} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? <Spinner as="span" size="sm" /> : <CreditCard className="me-2" />}
                Finalize as New Rental
              </Button>
            </>

          ) : (

            // --- UI STATE 2: Shows for ALL other cases (new customer, or existing customer without an open rental) ---
            <Button variant="danger" size="lg" onClick={() => onSubmit('create')} disabled={!canSubmit || isSubmitting}>
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