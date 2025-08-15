import React from 'react';
import { Form, Row, Col, Alert, ListGroup } from 'react-bootstrap';
import { Reservation, Payment, FormErrors } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { OrderSummaryCard } from '../../orderSummaryCard/OrderSummaryCard';
import { calculateItemDeposit, calculatePackageDeposit } from '../../../utils/financials';
import { OcrDropzone } from '../../ocrDropzone/OcrDropzone';

// UPDATED: Define props based on Reservation
type ReservationState = Omit<Reservation, '_id' | 'createdAt' | 'updatedAt' | 'status'>;

interface StepPaymentProps {
  reservation: ReservationState;
  setReservation: React.Dispatch<React.SetStateAction<ReservationState>>;
  setReceiptFile: (file: File | null) => void; 
  subtotal: number;
  requiredDeposit: number;
  grandTotal: number;
  errors: FormErrors;
}

export const StepPayment: React.FC<StepPaymentProps> = ({ 
  reservation, setReservation, setReceiptFile, // <-- Destructure new prop
  subtotal, requiredDeposit, grandTotal, errors 
}) => {
  const paymentData = reservation.financials.payments?.[0];

  const handlePaymentTypeChange = (amount: number) => {
    const newPayment: Payment = {
      amount,
      date: new Date(),
      referenceNumber: paymentData?.referenceNumber || '',
    };
    setReservation(prev => ({ ...prev, financials: { ...prev.financials, payments: [newPayment] } }));
  };
  
  const handleOcrUpdate = (refNumber: string, file: File | null) => {
    if (!paymentData) return;

    // Update the parent's file state
    setReceiptFile(file);

    // Update the reservation's reference number state
    const updatedPayment = { ...paymentData, referenceNumber: refNumber };
    setReservation(prev => ({ ...prev, financials: { ...prev.financials, payments: [updatedPayment] } }));
  };

  return (
    <Row className="g-5">
      {/* --- LEFT COLUMN: PAYMENT DETAILS --- */}
      <Col md={7}>
        <h4 className="mb-3">Payment Details</h4>
        <p className="text-muted">
          To secure your reservation, a payment is required. You may choose to pay a 50% down payment now, or the full amount. Our staff will verify your payment before confirming the reservation.
        </p>

        <Form.Group className="mb-4">
          <Form.Label><h5>Payment Option</h5></Form.Label>
          <Form.Check 
            type="radio" 
            id="down-payment-radio" 
            label={<span>Pay 50% Down Payment: <strong>₱{formatCurrency(grandTotal * 0.5)}</strong></span>} 
            name="paymentOption" 
            checked={!!paymentData && paymentData.amount === grandTotal * 0.5} 
            onChange={() => handlePaymentTypeChange(grandTotal * 0.5)} 
          />
          <Form.Check 
            type="radio" 
            id="full-payment-radio" 
            label={<span>Pay in Full: <strong>₱{formatCurrency(grandTotal)}</strong></span>} 
            name="paymentOption" 
            checked={!!paymentData && paymentData.amount === grandTotal} 
            onChange={() => handlePaymentTypeChange(grandTotal)} 
          />
        </Form.Group>
        
        {paymentData && typeof paymentData.amount === 'number' && paymentData.amount > 0 && (
          <div className="mt-4">
            <OcrDropzone 
              onUpdate={handleOcrUpdate}
              isInvalid={!!errors.paymentReference}
              errorText={errors.paymentReference}
            />
          </div>
        )}
        
        <Alert variant="info" className="mt-3">
            <Alert.Heading as="h6">Payment Instructions</Alert.Heading>
            <ul className="small ps-3 mb-0">
                <li>
                    Please send your payment to the following GCash account:
                    <div className="fw-bold my-1">
                        Account Name: Juan Dela Cruz<br/>
                        Account Number: 0917-123-4567
                    </div>
                </li>
                <li>
                    Ensure the amount sent is the <strong>exact amount</strong> required for your selected payment option.
                </li>
                <li>
                    Take a <strong>clear, high-quality screenshot</strong> of the successful transaction receipt.
                </li>
                <li>
                    Drop the receipt screenshot in the box above. The system will attempt to read it automatically.
                </li>
            </ul>
        </Alert>
      </Col>

      {/* --- RIGHT COLUMN: ORDER SUMMARY --- */}
      <Col md={5}>
        <OrderSummaryCard
          title="Reservation Summary"
          items={[
            // --- NEW: Use flatMap to create a fully itemized list ---
            ...reservation.itemReservations.flatMap(item => ([
              { label: item.itemName, value: item.price * item.quantity },
              { label: `↳ Deposit`, value: calculateItemDeposit(item), isMuted: true }
            ])),

            ...reservation.packageReservations.flatMap(pkg => ([
              { label: pkg.packageName, value: pkg.price },
              { label: `↳ Deposit`, value: calculatePackageDeposit(), isMuted: true }
            ])),

            // The final totals remain separate for clarity
            { label: 'Subtotal', value: subtotal, isBold: true },
            { label: 'Total Deposit', value: requiredDeposit, isBold: true },
          ]}
          totalLabel="Grand Total"
          totalValue={grandTotal}
        />
      </Col>
    </Row>
  );
};