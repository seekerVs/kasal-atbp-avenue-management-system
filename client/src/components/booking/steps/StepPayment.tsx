import React from 'react';
import { Form, Row, Col, Alert } from 'react-bootstrap';
import { CashCoin } from 'react-bootstrap-icons';
import { Booking, Payment } from '../../../types';
import { ValidatedInput } from '../../forms/ValidatedInput';
import { formatCurrency } from '../../../utils/formatters';

type BookingState = Omit<Booking, '_id' | 'createdAt' | 'updatedAt' | 'status'>;

interface StepPaymentProps {
  booking: BookingState;
  setBooking: React.Dispatch<React.SetStateAction<BookingState>>;
  subtotal: number;
}

export const StepPayment: React.FC<StepPaymentProps> = ({ booking, setBooking, subtotal }) => {
  const downPaymentAmount = subtotal * 0.5;
  const fullPaymentAmount = subtotal;

  // --- REVISED DEFINITION ---
  // This is now simpler and safer. It's either the payment object or undefined.
  const paymentData = booking.financials.payments?.[0];

  const handlePaymentTypeChange = (amount: number) => {
    const newPayment: Payment = {
      amount,
      date: new Date(),
      // Use existing values if they exist, otherwise default
      method: paymentData?.method || 'GCash',
      referenceNumber: paymentData?.referenceNumber || '',
    };
    setBooking(prev => ({ ...prev, financials: { ...prev.financials, payments: [newPayment] } }));
  };
  
  const handlePaymentDetailChange = (field: 'method' | 'referenceNumber', value: string) => {
    if (!paymentData) return; // Guard clause
    const updatedPayment = { ...paymentData, [field]: value };
    setBooking(prev => ({ ...prev, financials: { ...prev.financials, payments: [updatedPayment] } }));
  };

  return (
    <div>
      <h4 className="mb-3">Payment</h4>
      <p className="text-muted">
        To secure your booking, a payment is required. You may choose to pay a 50% down payment now, or the full amount.
      </p>
      <Alert variant="success">
        <Row className="align-items-center">
            <Col><strong className="h5">Booking Subtotal:</strong></Col>
            <Col className="text-end"><strong className="h5">{formatCurrency(subtotal)}</strong></Col>
        </Row>
      </Alert>
      
      <Form.Group className="mb-3">
        <Form.Label><h5>Payment Option</h5></Form.Label>
        <Form.Check
            type="radio"
            id="down-payment-radio"
            label={
                <span>Pay 50% Down Payment: <strong>{formatCurrency(downPaymentAmount)}</strong></span>
            }
            name="paymentOption"
            // --- REVISED CHECK ---
            checked={!!paymentData && paymentData.amount === downPaymentAmount}
            onChange={() => handlePaymentTypeChange(downPaymentAmount)}
        />
        <Form.Check
            type="radio"
            id="full-payment-radio"
            label={
                <span>Pay in Full: <strong>{formatCurrency(fullPaymentAmount)}</strong></span>
            }
            name="paymentOption"
            // --- REVISED CHECK ---
            checked={!!paymentData && paymentData.amount === fullPaymentAmount}
            onChange={() => handlePaymentTypeChange(fullPaymentAmount)}
        />
      </Form.Group>

      {/* --- REVISED CONDITIONAL RENDER --- */}
      {/* This is now safer. It checks for the existence of paymentData and that amount is a number > 0. */}
      {paymentData && typeof paymentData.amount === 'number' && paymentData.amount > 0 && (
          <Row>
              <Col md={6}>
                  <Form.Group className="mb-3">
                      <Form.Label>Payment Method</Form.Label>
                      <Form.Select value={paymentData.method} onChange={e => handlePaymentDetailChange('method', e.target.value)}>
                          <option value="GCash">GCash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                      </Form.Select>
                  </Form.Group>
              </Col>
              <Col md={6}>
                  <ValidatedInput
                      label="Reference Number"
                      value={paymentData.referenceNumber || ''}
                      onChange={e => handlePaymentDetailChange('referenceNumber', e.target.value.toUpperCase())}
                      placeholder="Enter the transaction ref #"
                      isRequired
                  />
              </Col>
          </Row>
      )}
    </div>
  );
};