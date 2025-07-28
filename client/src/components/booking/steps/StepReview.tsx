// client/src/components/booking/steps/StepReview.tsx

import React, { useMemo } from 'react';
import { Row, Col, ListGroup, Badge, Alert } from 'react-bootstrap';
import { format } from 'date-fns';
import { BoxSeam, Scissors } from 'react-bootstrap-icons';
import { Reservation } from '../../../types'; // UPDATED: Use Reservation type
import { formatCurrency } from '../../../utils/formatters';

// UPDATED: Use Reservation type for props
interface StepReviewProps {
  reservation: Omit<Reservation, '_id' | 'createdAt' | 'updatedAt' | 'status'>;
}

export const StepReview: React.FC<StepReviewProps> = ({ reservation }) => {
  const { customerInfo, eventDate, reserveStartDate, reserveEndDate, itemReservations, packageReservations, financials } = reservation;
  
  const subtotal = 
    itemReservations.reduce((sum, item) => sum + (item.price * item.quantity), 0) +
    packageReservations.reduce((sum, pkg) => sum + pkg.price, 0);

  const payment = financials.payments?.[0];

  const hasCustomItems = useMemo(() => {
    if (!packageReservations || packageReservations.length === 0) {
      return false;
    }
    return packageReservations.some(pkg => 
      pkg.fulfillmentPreview.some(fulfillment => fulfillment.isCustom)
    );
  }, [packageReservations]);

  return (
    <div>
      <h4 className="mb-3">Review Your Reservation</h4>
      <p className="text-muted">Please review all the details below before submitting your request.</p>

      {hasCustomItems && (
        <Alert variant="info">
          <Alert.Heading as="h6">Custom Tailoring Included</Alert.Heading>
          <p className="mb-0 small">
            This reservation includes custom-made items. A separate appointment request will be automatically created for each custom role. Our staff will contact you to confirm fitting schedules.
          </p>
        </Alert>
      )}
      <hr />
      <Row>
        <Col md={6}>
          <h5>Customer Information</h5>
          <p className="mb-1"><strong>Name:</strong> {customerInfo.name}</p>
          <p className="mb-1"><strong>Phone:</strong> {customerInfo.phoneNumber}</p>
          <p className="mb-1"><strong>Email:</strong> {customerInfo.email || 'N/A'}</p>
          <p className="mb-1"><strong>Address:</strong> {`${customerInfo.address.street}, ${customerInfo.address.barangay}, ${customerInfo.address.city}, ${customerInfo.address.province}`}</p>
        </Col>
        <Col md={6}>
          <h5>Event Details</h5>
          <p className="mb-1"><strong>Event Date:</strong> {format(new Date(eventDate), 'MMMM dd, yyyy')}</p>
          <p className="mb-1"><strong>Rental Period:</strong> {format(new Date(reserveStartDate), 'MMM dd')} to {format(new Date(reserveEndDate), 'MMM dd, yyyy')}</p>
        </Col>
      </Row>
      <hr />
      <h5>Selections</h5>
      <ListGroup variant="flush">
        {itemReservations.map(item => (
            <ListGroup.Item key={item.reservationId} className="d-flex justify-content-between align-items-center ps-0">
              <div><p className="fw-bold mb-0">{item.itemName}</p><small className="text-muted">{item.variation.color}, {item.variation.size} × {item.quantity}</small></div>
              <span className="fw-bold">{formatCurrency(item.price * item.quantity)}</span>
            </ListGroup.Item>
        ))}
        {packageReservations.map(pkg => (
            <ListGroup.Item key={pkg.packageReservationId} className="d-flex justify-content-between align-items-center ps-0">
              <div><p className="fw-bold mb-0"><BoxSeam size={14} className="me-2"/>{pkg.packageName}</p>{pkg.motifName && <Badge bg="light" text="dark">{pkg.motifName}</Badge>}</div>
              <span className="fw-bold">{formatCurrency(pkg.price)}</span>
            </ListGroup.Item>
        ))}
      </ListGroup>
      <div className="text-end mt-2"><h5 className="mb-0">Subtotal: {formatCurrency(subtotal)}</h5></div>
      <hr />
      <h5>Payment Details</h5>
      {payment ? (
        <>
            <Row><Col>Amount to be Paid:</Col><Col className="text-end fw-bold">{formatCurrency(payment.amount)}</Col></Row>
            <Row><Col>Method:</Col><Col className="text-end">{payment.method}</Col></Row>
            <Row><Col>Reference Number:</Col><Col className="text-end">{payment.referenceNumber}</Col></Row>
        </>
      ) : (<p className="text-muted">No payment details provided.</p>)}
      <div className="text-end mt-3 bg-light p-3 rounded"><h4 className="mb-0">Total Due Today: {formatCurrency(payment?.amount || 0)}</h4></div>
    </div>
  );
};