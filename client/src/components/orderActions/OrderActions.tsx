// client/src/components/rentalViewer/OrderActions.tsx

import React from 'react';
import { Row, Col, Card, Badge, Button, Form, InputGroup, Alert, Accordion, ListGroup } from 'react-bootstrap';
import {
  CalendarCheck,
  BoxSeam,
  CheckCircleFill,
  ArrowCounterclockwise,
  HourglassSplit,
  XCircleFill,
  CashCoin,
} from 'react-bootstrap-icons';
import { RentalStatus, Financials, RentalOrder } from '../../types'; // Import from centralized types


// ===================================================================
// --- NEW: DepositBreakdown Sub-Component ---
// ===================================================================
interface DepositBreakdownProps {
  rental: RentalOrder;
}

const DepositBreakdown: React.FC<DepositBreakdownProps> = ({ rental }) => {
  const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;

  return (
    // Use a flush accordion to remove borders and box-shadow
    <Accordion flush className="mt-1"> 
      <Accordion.Item eventKey="0">
        <Accordion.Header>
          <span className="small text-primary fst-italic text-decoration-underline">
            View deposit breakdown
          </span>
        </Accordion.Header>
        <Accordion.Body className="p-2 border-top">
          <ListGroup variant="flush">
            {rental.singleRents?.map((item, index) => {
              const deposit = item.price < 500 ? item.price : 500;
              return (
                <ListGroup.Item key={`single-${index}`} className="d-flex justify-content-between small text-muted p-1 border-0">
                  <span>{item.name.split(',')[0]} (x{item.quantity})</span>
                  <span className="fw-normal">{formatCurrency(deposit * item.quantity)}</span>
                </ListGroup.Item>
              );
            })}
            {rental.packageRents?.map((pkg, index) => (
              <ListGroup.Item key={`pkg-${index}`} className="d-flex justify-content-between small text-muted p-1 border-0">
                <span>{pkg.name.split(',')[0]} (x{pkg.quantity})</span>
                <span className="fw-normal">{formatCurrency(2000 * pkg.quantity)}</span>
              </ListGroup.Item>
            ))}
            {rental.customTailoring?.map((item, index) => {
              if (item.tailoringType === 'Tailored for Rent-Back') {
                return (
                  <ListGroup.Item key={`custom-${index}`} className="d-flex justify-content-between small text-muted p-1 border-0">
                    <span>{item.name} (x{item.quantity})</span>
                    <span className="fw-normal">{formatCurrency(item.price * item.quantity)}</span>
                  </ListGroup.Item>
                );
              }
              return null;
            })}
          </ListGroup>
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
};

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
  editableStartDate: string;
  onStartDateChange: (value: string) => void;
  editableEndDate: string;
  onEndDateChange: (value: string) => void;
  canEditDetails: boolean;
  paymentUiMode: 'Cash' | 'Gcash';
  onPaymentUiModeChange: (mode: 'Cash' | 'Gcash') => void;
  paymentAmount: string;
  onPaymentAmountChange: (value: string) => void;
  gcashRef: string;
  onGcashRefChange: (value: string) => void;
  onMarkAsPickedUp: () => void;
  editableDeposit: string;
  onDepositChange: (value: string) => void;
  requiredDepositInfo: {
    min: number;
    max: number | null;
    message: string;
  };
  onUpdateAndPay: (payload: { 
    status?: RentalStatus; 
    rentalStartDate?: string; 
    rentalEndDate?: string; 
    shopDiscount?: number;
    payment?: { amount: number; referenceNumber: string | null; }
  }) => void;
  onInitiateMoveToPickup: () => void;
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
  editableStartDate,
  onStartDateChange,
  editableEndDate,
  onEndDateChange,
  canEditDetails,
  paymentUiMode,
  onPaymentUiModeChange,
  paymentAmount,
  onPaymentAmountChange,
  gcashRef,
  onGcashRefChange,
  onUpdateAndPay,
  onMarkAsPickedUp,
  editableDeposit,
  onDepositChange,
  onInitiateMoveToPickup,
  requiredDepositInfo = { min: 0, max: null, message: '' },
}) => {

  const discountAmount = parseFloat(editableDiscount) || 0;
  const depositAmount = parseFloat(editableDeposit) || 0;
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

  const showPaymentForm = 
    (status === 'To Process' && !isPaid) || 
    (status === 'To Pickup' && !isFullyPaid);

  const getPaymentStatusBadge = (): { variant: string; text: string } => {
    if (isFullyPaid) return { variant: 'success', text: 'Fully Paid' };
    if (isPaid) return { variant: 'warning', text: 'Down Payment' };
    return { variant: 'danger', text: 'Not Paid' };
  };
  const paymentStatusInfo = getPaymentStatusBadge();

  const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newAmount = parseFloat(e.target.value);
    // Prevent negative numbers
    if (newAmount < 0) {
      newAmount = 0;
    }
    // Cap the amount at the remaining balance
    if (remainingBalance > 0 && newAmount > remainingBalance) {
      newAmount = remainingBalance;
    }
    // Update the state via the prop function, converting back to a string
    onPaymentAmountChange(String(newAmount));
  };

  // --- NEW: Handler for deposit input to enforce min/max if needed ---
  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Basic validation to prevent non-numeric input if desired, but for now just pass up
    onDepositChange(value);
  };

  if (!rental) return null; // Add a guard clause in case rental is null
  const totalItemCount = 
      (rental.singleRents?.reduce((sum, item) => sum + item.quantity, 0) || 0) +
      (rental.packageRents?.reduce((sum, item) => sum + item.quantity, 0) || 0) +
      (rental.customTailoring?.reduce((sum, item) => sum + item.quantity, 0) || 0);

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
          <span>₱{subtotal.toFixed(2)}</span>
        </div>
        <Form.Group as={Row} className="align-items-center mb-2">
          <Form.Label column sm={6} className="text-muted">Shop Discount</Form.Label>
          <Col sm={6}>
            <InputGroup>
              <InputGroup.Text>₱</InputGroup.Text>
              <Form.Control type="number" value={editableDiscount} onChange={(e) => onDiscountChange(e.target.value)} disabled={!canEditDetails} />
            </InputGroup>
          </Col>
        </Form.Group>

        {/* --- NEW: DEPOSIT INPUT SECTION --- */}
        <div className="mb-2"> {/* Use a simple div as the main wrapper */}
          {/* This row is ONLY for the label and the input field */}
          <Form.Group as={Row} className="align-items-center mb-2">
            <Form.Label column sm={6} className="text-muted">
                Security Deposit
            </Form.Label>
            <Col sm={6}>
              <InputGroup>
                <InputGroup.Text>₱</InputGroup.Text>
                <Form.Control 
                  type="number" 
                  value={editableDeposit} 
                  onChange={handleDepositChange} 
                  disabled={!canEditDetails}
                  min={requiredDepositInfo.min}
                  max={requiredDepositInfo.max ?? undefined}
                />
              </InputGroup>
            </Col>
          </Form.Group>

          {/* The Accordion and its message are now placed OUTSIDE the aligned row */}
          {/* We add a nested Row and Col to indent it correctly under the input field */}
          <Row>
            <Col sm={6}></Col> {/* This is an empty offset column */}
            <Col sm={6}>
              {totalItemCount > 1 && canEditDetails ? (
                <DepositBreakdown rental={rental} />
              ) : requiredDepositInfo.message && canEditDetails ? (
                <Form.Text className="text-muted">
                  {requiredDepositInfo.message}
                </Form.Text>
              ) : null}
            </Col>
          </Row>
        </div>
        
        <div className="d-flex justify-content-between align-items-baseline mb-3">
          <p className="mb-0 fs-5 fw-bold">Total Amount:</p>
          <p className="h4 fw-bold text-danger">₱{grandTotal.toFixed(2)}</p>
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
                    <span className="fw-bold">₱{financials.downPayment.amount.toFixed(2)}</span>
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
                    <span className="fw-bold">₱{financials.finalPayment.amount.toFixed(2)}</span>
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

              {/* --- Display Total Paid --- */}
              <div className="d-flex justify-content-between fw-bold mt-2">
                <span>Total Paid:</span>
                <span className="text-success">₱{totalPaid.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {status === 'To Pickup' && !isFullyPaid && (
          <Alert variant="warning" className="text-center mt-3">
            <div className="fw-bold">Remaining Balance</div>
            <div className="h4 mb-0">₱{remainingBalance.toFixed(2)}</div>
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
                  onChange={handlePaymentAmountChange} // Use the new handler
                  min="0" // Don't allow negative numbers
                  max={remainingBalance > 0 ? remainingBalance.toFixed(2) : "0"} // Set the max attribute
                  step="0.01" // Allow decimal inputs
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
          {status === 'To Process' && (<Button size="lg" onClick={onInitiateMoveToPickup } style={{ backgroundColor: '#8B0000', border: 'none', fontWeight: 'bold' }} disabled={!isPaid && parseFloat(paymentAmount) <= 0}>Move to Pickup</Button>)}
          {status === 'To Pickup' && ( <Button variant="info" size="lg" onClick={onMarkAsPickedUp}>Mark as Picked Up</Button> )}
          {status === 'To Return' && ( <Button variant="warning" size="lg" onClick={() => onUpdateAndPay({ status: 'Returned' })}>Mark as Returned</Button> )}
          {status === 'Returned' && ( <Alert variant="success" className="text-center">This rental has been completed.</Alert> )}
          {status === 'Cancelled' && ( <Alert variant="danger" className="text-center">This rental was cancelled.</Alert> )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default OrderActions;