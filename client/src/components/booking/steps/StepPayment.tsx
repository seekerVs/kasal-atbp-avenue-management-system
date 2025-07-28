// client/src/components/booking/steps/StepPayment.tsx

import React from 'react';
import { Form, Row, Col, Alert } from 'react-bootstrap';
import { Reservation, Payment } from '../../../types'; // UPDATED: Use Reservation type
import { ValidatedInput } from '../../forms/ValidatedInput';
import { formatCurrency } from '../../../utils/formatters';

// UPDATED: Define props based on Reservation
type ReservationState = Omit<Reservation, '_id' | 'createdAt' | 'updatedAt' | 'status'>;

interface StepPaymentProps {
  reservation: ReservationState;
  setReservation: React.Dispatch<React.SetStateAction<ReservationState>>;
  subtotal: number;
}

export const StepPayment: React.FC<StepPaymentProps> = ({ reservation, setReservation, subtotal }) => {
  const downPaymentAmount = subtotal * 0.5;
  const fullPaymentAmount = subtotal;
  const paymentData = reservation.financials.payments?.[0];

  const handlePaymentTypeChange = (amount: number) => {
    const newPayment: Payment = {
      amount,
      date: new Date(),
      method: paymentData?.method || 'GCash',
      referenceNumber: paymentData?.referenceNumber || '',
    };
    setReservation(prev => ({ ...prev, financials: { ...prev.financials, payments: [newPayment] } }));
  };
  
  const handlePaymentDetailChange = (field: 'method' | 'referenceNumber', value: string) => {
    if (!paymentData) return;
    const updatedPayment = { ...paymentData, [field]: value };
    setReservation(prev => ({ ...prev, financials: { ...prev.financials, payments: [updatedPayment] } }));
  };

  return (
    <div>
      <h4 className="mb-3">Payment</h4>
      <p className="text-muted">
        To secure your reservation, a payment is required. You may choose to pay a 50% down payment now, or the full amount.
      </p>
      <Alert variant="success">
        <Row className="align-items-center">
          <Col><strong className="h5">Reservation Subtotal:</strong></Col>
          <Col className="text-end"><strong className="h5">{formatCurrency(subtotal)}</strong></Col>
        </Row>
      </Alert>
      <Form.Group className="mb-3">
        <Form.Label><h5>Payment Option</h5></Form.Label>
        <Form.Check type="radio" id="down-payment-radio" label={<span>Pay 50% Down Payment: <strong>{formatCurrency(downPaymentAmount)}</strong></span>} name="paymentOption" checked={!!paymentData && paymentData.amount === downPaymentAmount} onChange={() => handlePaymentTypeChange(downPaymentAmount)} />
        <Form.Check type="radio" id="full-payment-radio" label={<span>Pay in Full: <strong>{formatCurrency(fullPaymentAmount)}</strong></span>} name="paymentOption" checked={!!paymentData && paymentData.amount === fullPaymentAmount} onChange={() => handlePaymentTypeChange(fullPaymentAmount)} />
      </Form.Group>
      {paymentData && typeof paymentData.amount === 'number' && paymentData.amount > 0 && (
        <Row>
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Payment Method</Form.Label>
              <Form.Select value={paymentData.method} onChange={e => handlePaymentDetailChange('method', e.target.value as 'GCash' | 'Bank Transfer')}>
                <option value="GCash">GCash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <ValidatedInput label="Reference Number" value={paymentData.referenceNumber || ''} onChange={e => handlePaymentDetailChange('referenceNumber', e.target.value.toUpperCase())} placeholder="Enter the transaction ref #" isRequired />
          </Col>
        </Row>
      )}
    </div>
  );
};