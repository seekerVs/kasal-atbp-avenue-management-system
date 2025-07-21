// client/src/components/rentalViewer/OrderActions.tsx

import React, { useState } from 'react';
import { Row, Col, Card, Badge, Button, Form, InputGroup, Alert, Accordion, ListGroup } from 'react-bootstrap';
import {
  CalendarCheck,
  BoxSeam,
  CheckCircleFill,
  ArrowCounterclockwise,
  HourglassSplit,
  XCircleFill,
  CashCoin,
  CashStack,
} from 'react-bootstrap-icons';
import { RentalStatus, Financials, RentalOrder, CustomTailoringItem } from '../../types'; // Import from centralized types
import { formatCurrency } from '../../utils/formatters';
import { useAlert } from '../../contexts/AlertContext';
import './orderActions.css'

// --- HELPER FUNCTIONS ---
const getStatusIcon = (status: RentalStatus) => {
    switch (status) {
        case 'To Process': return <HourglassSplit size={20} className="me-2" />;
        case 'To Pickup': return <BoxSeam size={20} className="me-2" />;
        case 'To Return': return <ArrowCounterclockwise size={20} className="me-2" />;
        case 'Returned': case 'Completed': return <CheckCircleFill size={20} className="me-2" />;
        case 'Cancelled': return <XCircleFill size={20} className="me-2" />;
        default: return null;
    }
};

// --- COMPONENT PROPS INTERFACE ---
interface OrderActionsProps {
  rental: RentalOrder | null;
  status: RentalStatus;
  financials: Financials;
  subtotal: number;
  editableDiscount: string;
  onDiscountChange: (value: string) => void;
  onDiscountBlur: () => void; 
  editableStartDate: string;
  onStartDateChange: (value: string) => void;
  editableEndDate: string;
  onEndDateChange: (value: string) => void;
  canEditDetails: boolean;
  paymentUiMode: 'Cash' | 'Gcash';
  onPaymentUiModeChange: (mode: 'Cash' | 'Gcash') => void;
  paymentAmount: string;
  onPaymentAmountChange: (value: string) => void;
  onPaymentAmountBlur: () => void;
  gcashRef: string;
  onGcashRefChange: (value: string) => void;
  editableDeposit: string;
  onDepositChange: (value: string) => void;
  onDepositBlur: () => void;
  onReimburseDeposit: (amount: number) => void;
  reimburseAmount: string;
  onReimburseAmountChange: (value: string) => void;
  onInitiateReturn: (rentBackItems: CustomTailoringItem[]) => void;
  onInitiatePickup: () => void;
  onInitiateMarkAsPickedUp: () => void;
}

// ===================================================================================
// --- THE REUSABLE COMPONENT ---
// ===================================================================================
const OrderActions: React.FC<OrderActionsProps> = ({
  rental,
  status,
  financials,
  subtotal,
  editableDiscount,
  onDiscountChange,
  onDiscountBlur,
  editableStartDate,
  onStartDateChange,
  editableEndDate,
  onEndDateChange,
  canEditDetails,
  paymentUiMode,
  onPaymentUiModeChange,
  paymentAmount,
  onPaymentAmountChange,
  onPaymentAmountBlur,
  gcashRef,
  onGcashRefChange,
  editableDeposit,
  onDepositChange,
  onDepositBlur,
  reimburseAmount, // <-- Destructure
  onReimburseAmountChange, // <-- Destructure
  onInitiateReturn,
  onInitiateMarkAsPickedUp,
  onInitiatePickup,
}) => {
  const { addAlert } = useAlert();
  const discountAmount = parseFloat(editableDiscount) || 0;
  const depositAmount = parseFloat(editableDeposit) || 0;
  const isStandardDeposit = parseFloat(editableDeposit) === (financials.requiredDeposit || 0);
  
  const itemsTotal = subtotal - discountAmount;

  const grandTotal = itemsTotal + depositAmount;
  
  const totalPaid = (financials.downPayment?.amount || 0) + (financials.finalPayment?.amount || 0);
  const remainingBalance = grandTotal - totalPaid;
  
  const isPaid = totalPaid > 0;
  // "Fully Paid" is now correctly checked against the Grand Total
  const isFullyPaid = isPaid && totalPaid >= grandTotal;

  const handleGcashRefInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.toUpperCase();
    const alphanumericValue = rawValue.replace(/[^A-Z0-9]/g, '');
    onGcashRefChange(alphanumericValue);
  };

  const handleUseRecommendedDeposit = () => {
    // This handler resets the editableDeposit state to the system-calculated value.
    onDepositChange(String(financials.requiredDeposit || 0));
  };

  const showPaymentForm = 
    (status === 'To Process' && !isPaid) || 
    (status === 'To Pickup' && !isFullyPaid);

  const shouldDisableButton = 
    // Disable if it's the first payment ('To Process' status) AND payment details are invalid.
    (status === 'To Process' && (
      (parseFloat(paymentAmount) <= 0) ||
      (paymentUiMode === 'Gcash' && gcashRef.trim() === '')
    )) ||
    // Disable if it's the final payment ('To Pickup') AND payment details are invalid.
    (status === 'To Pickup' && !isFullyPaid && (
      (parseFloat(paymentAmount) <= 0) ||
      (paymentUiMode === 'Gcash' && gcashRef.trim() === '')
  ));

  const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow the input to be temporarily empty while typing
    if (value.trim() === '') {
      onPaymentAmountChange('');
      return;
    }

    const newAmount = parseFloat(value);

    // Rule 1: Prevent negative numbers
    if (newAmount < 0) {
      onPaymentAmountChange('0');
      return;
    }

    // Rule 2: Cap the amount at the total amount due.
    // The max payment is either the remaining balance or, if it's a new rental, the grand total.
    const maxPayment = remainingBalance > 0 ? remainingBalance : grandTotal;
    if (newAmount > maxPayment) {
      onPaymentAmountChange(String(maxPayment));
      return;
    }
    
    // If validation passes, update state with the user's input
    onPaymentAmountChange(value);
  };

  const getPaymentStatusBadge = (): { variant: string; text: string } => {
    if (isFullyPaid) return { variant: 'success', text: 'Fully Paid' };
    if (isPaid) return { variant: 'warning', text: 'Down Payment' };
    return { variant: 'danger', text: 'Not Paid' };
  };
  const paymentStatusInfo = getPaymentStatusBadge();

  if (!rental) return null; // Add a guard clause in case rental is null

  const hasDepositBreakdown = 
    (rental.singleRents && rental.singleRents.length > 0) ||
    (rental.packageRents && rental.packageRents.length > 0) ||
    (rental.customTailoring && rental.customTailoring.some(item => item.tailoringType === 'Tailored for Rent-Back'));

  return (
    <Card className="shadow-sm">
      <Card.Header as="h5">Order Status & Actions</Card.Header>
      <Card.Body className="p-4">
        <div className="text-center mb-4">
          <Button variant="dark" className="p-3 fs-6 w-100 d-flex align-items-center justify-content-center" style={{ cursor: 'default' }} disabled>
            {getStatusIcon(status)}
            {status.toUpperCase()}
          </Button>
        </div>
        <div className="mb-3">
          <p className="mb-2 fw-bold"><CalendarCheck className="me-2" />Rental Period</p>
          <Row className="g-2"> {/* g-2 adds a small gap between columns */}
            <Col md={6}> {/* Takes 50% width on medium screens and up */}
              <Form.Label className="small text-muted">Start Date</Form.Label>
              <Form.Control 
                type="date" 
                value={editableStartDate} 
                onChange={e => onStartDateChange(e.target.value)} 
                disabled={!canEditDetails} 
              />
            </Col>
            <Col md={6}> {/* Takes 50% width on medium screens and up */}
              <Form.Label className="small text-muted">End Date</Form.Label>
              <Form.Control 
                type="date" 
                value={editableEndDate} 
                onChange={e => onEndDateChange(e.target.value)} 
                disabled={!canEditDetails} 
              />
            </Col>
          </Row>
        </div>
        <hr />
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="text-muted">Subtotal</span>
          <span>₱{formatCurrency(financials.subtotal || 0)}</span>
        </div>
        <Form.Group as={Row} className="align-items-center mb-2">
          <Form.Label column sm={6} className="text-muted">Shop Discount</Form.Label>
          <Col sm={6}>
            <InputGroup>
              <InputGroup.Text>₱</InputGroup.Text>
              <Form.Control type="number" value={editableDiscount} onChange={(e) => onDiscountChange(e.target.value)} onBlur={onDiscountBlur} disabled={!canEditDetails} min="0" style={{ textAlign: 'right' }} />
            </InputGroup>
          </Col>
        </Form.Group>

        {/* --- NEW: DEPOSIT INPUT SECTION --- */}
        <div className="mb-2"> {/* Use a simple div as the main wrapper */}
          <Form.Group as={Row} className="align-items-center ">
          <Form.Label column sm={6} className="text-muted mb-0 pb-0">Security Deposit</Form.Label>
          <Col sm={6}>
            <InputGroup>
              <InputGroup.Text>₱</InputGroup.Text>
              <Form.Control 
                type="number" 
                value={editableDeposit} 
                onBlur={onDepositBlur}
                onChange={(e) => onDepositChange(e.target.value)} 
                disabled={!canEditDetails}
                min="0"
                style={{ textAlign: 'right' }} 
              />
            </InputGroup>
          </Col>
        </Form.Group>

        {/* Conditionally Rendered Deposit Breakdown */}
        {isStandardDeposit && canEditDetails && hasDepositBreakdown && (
          <Row >
            <Col > {/* Indent the accordion */}
              <Accordion flush className="mt-0 mb-2 w-100 ">
                <Accordion.Item eventKey="0">
                  <Accordion.Header as="div">
                    <span className="small text-primary fst-italic text-end" style={{cursor: 'pointer'}}>
                      View deposit breakdown
                    </span>
                  </Accordion.Header>
                  <Accordion.Body className="p-2 border-top">
                    <ListGroup variant="flush">
                      {/* --- THIS IS THE NEW LOGIC --- */}
                      {/* We calculate the breakdown on the fly from the rental's item arrays. */}

                      {/* Breakdown for Single Rent Items */}
                      {rental.singleRents?.map((item, index) => (
                        <ListGroup.Item key={`single-dep-${index}`} className="d-flex justify-content-between small text-muted p-1 border-0">
                          <span>{item.name.split(',')[0]} (x{item.quantity})</span>
                          <span className="fw-normal">{formatCurrency((item.price < 500 ? item.price : 500) * item.quantity)}</span>
                        </ListGroup.Item>
                      ))}

                      {/* Breakdown for Package Rent Items */}
                      {rental.packageRents?.map((pkg, index) => (
                        <ListGroup.Item key={`pkg-dep-${index}`} className="d-flex justify-content-between small text-muted p-1 border-0">
                          <span>{pkg.name.split(',')[0]} (x{pkg.quantity})</span>
                          <span className="fw-normal">{formatCurrency(2000 * pkg.quantity)}</span>
                        </ListGroup.Item>
                      ))}

                      {/* Breakdown for Custom Tailoring Items (Rent-Back only) */}
                      {rental.customTailoring?.filter(item => item.tailoringType === 'Tailored for Rent-Back').map((item, index) => (
                        <ListGroup.Item key={`custom-dep-${index}`} className="d-flex justify-content-between small text-muted p-1 border-0">
                          <span>{item.name} (x{item.quantity})</span>
                          <span className="fw-normal">{formatCurrency(item.price * item.quantity)}</span>
                        </ListGroup.Item>
                      ))}

                    </ListGroup>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </Col>
          </Row>
        )}

        {!isStandardDeposit && canEditDetails && (
          <Row>
            <Col className="mt-0 mb-2 w-100 text-end">
              <Button
                variant="link"
                size="sm"
                className="p-0 text-decoration-underline"
                onClick={handleUseRecommendedDeposit}
              >
                Use recommended deposit
              </Button>
            </Col>
          </Row>
        )}
        </div>
        
        <div className="d-flex justify-content-between align-items-baseline mb-3">
          <p className="mb-0 fs-5 fw-bold">Total Amount:</p>
          <p className="h4 fw-bold text-danger">₱{formatCurrency(grandTotal)}</p>
        </div>
        <hr />
        
        {isPaid && (
          <div className="mb-3">
            <p className="mb-2 fw-bold d-flex justify-content-between align-items-center">
              <span><CashCoin className="me-2 text-muted"/>Payment Details</span>
              <Badge bg={paymentStatusInfo.variant} pill>{paymentStatusInfo.text}</Badge>
            </p>
            <div className="border-top pt-2">
              
              {/* --- Display Down Payment --- */}
              {financials.downPayment && (
                <div className="mb-2 pb-1 border-bottom">
                  <div className="d-flex justify-content-between small">
                    <span className="text-muted">Down Payment ({financials.downPayment.referenceNumber ? 'GCash' : 'Cash'}):</span>
                    <span className="fw-bold">₱{formatCurrency(financials.downPayment.amount)}</span>
                  </div>
                  {/* --- NEW: Conditionally display reference number --- */}
                  {financials.downPayment.referenceNumber && (
                    <div className="d-flex justify-content-between small text-muted fst-italic">
                        <span>Ref #:</span>
                        <span>{financials.downPayment.referenceNumber}</span>
                    </div>
                  )}
                </div>
              )}

              {/* --- Display Final Payment --- */}
              {financials.finalPayment && (
                <div className="mb-2 pb-1 border-bottom">
                   <div className="d-flex justify-content-between small">
                    <span className="text-muted">Final Payment ({financials.finalPayment.referenceNumber ? 'GCash' : 'Cash'}):</span>
                    <span className="fw-bold">₱{formatCurrency(financials.finalPayment.amount)}</span>
                  </div>
                   {/* --- NEW: Conditionally display reference number --- */}
                   {financials.finalPayment.referenceNumber && (
                    <div className="d-flex justify-content-between small text-muted fst-italic">
                        <span>Ref #:</span>
                        <span>{financials.finalPayment.referenceNumber}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'To Pickup' && !isFullyPaid && (
          <Alert variant="warning" className="text-center mt-3">
            <div className="fw-bold">Remaining Balance</div>
            <div className="h4 mb-0">₱{formatCurrency(remainingBalance)}</div>
          </Alert>
        )}

        {showPaymentForm && (
          <>
            {status === 'To Pickup' && !isFullyPaid && (
                <Alert variant='info' className='p-2 text-center small'>Awaiting final payment to complete pickup.</Alert>
            )}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Payment Method</Form.Label>
              <div className="d-flex">
                <Button variant={paymentUiMode === 'Cash' ? 'success' : 'outline-success'} className="flex-fill me-1" onClick={() => onPaymentUiModeChange('Cash')}>Cash</Button>
                <Button variant={paymentUiMode === 'Gcash' ? 'success' : 'outline-success'} className="flex-fill ms-1" onClick={() => onPaymentUiModeChange('Gcash')}>Gcash</Button>
              </div>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="small text-muted">Payment Amount</Form.Label>
              <InputGroup>
                <InputGroup.Text>₱</InputGroup.Text>
                <Form.Control 
                  type="number" 
                  value={paymentAmount} 
                  onChange={handlePaymentAmountChange}
                  onBlur={onPaymentAmountBlur}
                  min="0" // Don't allow negative numbers
                  max={remainingBalance > 0 ? remainingBalance.toFixed(2) : "0"} // Set the max attribute
                  style={{ textAlign: 'right' }} 
                />
              </InputGroup>
            </Form.Group>
            {paymentUiMode === 'Gcash' && (
              <Form.Group className="mb-3">
                <Form.Label className="small text-muted">GCash Reference #</Form.Label>
                <Form.Control 
                  type="text" 
                  placeholder="Enter reference no." 
                  value={gcashRef} 
                  onChange={handleGcashRefInputChange} // Use the new handler
                  maxLength={13} // Enforce max length
                  pattern="[A-Z0-9]{13}" // HTML5 validation pattern
                  title="Must be 13 alphanumeric characters." // Tooltip on validation failure
                  required // Make it required if GCash is the selected method
                />
              </Form.Group>
            )}
          </>
        )}
        
        <div className="d-grid gap-2 mt-4">
          {status === 'To Process' && (<Button size="lg" onClick={onInitiatePickup} style={{ backgroundColor: '#8B0000', border: 'none', fontWeight: 'bold' }} disabled={shouldDisableButton}>Move to Pickup</Button>)}
          {status === 'To Pickup' && (
            <Button
              variant="info"
              size="lg"
              onClick={() => {
                // --- THIS IS THE NEW VALIDATION LOGIC ---
                const finalPaymentInput = parseFloat(paymentAmount) || 0;
                // Use the server-calculated remaining balance with a fallback to 0.
                const remainingBalance = financials.remainingBalance ?? 0; // <-- THE FIX

                if (remainingBalance > finalPaymentInput) {
                  addAlert(
                    `Payment is insufficient. Remaining balance of ₱${formatCurrency(remainingBalance)} must be paid.`,
                    'danger'
                  );
                  return; // Stop the process
                }         
                // If validation passes, call the original handler from the parent.
                onInitiateMarkAsPickedUp();
              }}
              disabled={shouldDisableButton}
            >
              Mark as Picked Up
            </Button>
          )}
          {status === 'To Return' && (
            <>
              <Form.Group className="mb-2">
                  <Form.Label className="small text-muted">Amount to Reimburse</Form.Label>
                  <InputGroup>
                      <InputGroup.Text>₱</InputGroup.Text>
                      <Form.Control
                          type="number"
                          value={reimburseAmount}
                          onChange={(e) => onReimburseAmountChange(e.target.value)}
                          min="0"
                          max={financials.depositAmount}
                          style={{ textAlign: 'right' }}
                      />
                  </InputGroup>
              </Form.Group>
              <Button variant="warning" size="lg" onClick={() => onInitiateReturn(rental.customTailoring)}>
                  <ArrowCounterclockwise className="me-2" />
                  Mark as Returned
              </Button>
            </>
          )}

          {status === 'Returned' && (
            <Alert variant="success" className="text-center">
                <p className="fw-bold mb-1">Return Processed</p>
                <p className="small mb-0">Reimbursed Amount: ₱{formatCurrency(financials.depositReimbursed)}</p>
            </Alert>
          )}

          {status === 'Completed' && ( // <-- NEW: Final state display
              <Alert variant="success" className="text-center">
                  <CheckCircleFill className="me-2"/>
                  This rental has been completed.
              </Alert>
          )}
          {status === 'Returned' && ( <Alert variant="success" className="text-center">This rental has been completed.</Alert> )}
          {status === 'Cancelled' && ( <Alert variant="danger" className="text-center">This rental was cancelled.</Alert> )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default OrderActions;