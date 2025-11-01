// client/src/components/rentalViewer/OrderActions.tsx

import React, { useMemo } from 'react';
import { Row, Col, Card, Badge, Button, Form, InputGroup, Alert, Accordion, ListGroup, Spinner, ToggleButtonGroup, ToggleButton } from 'react-bootstrap';
import {
  CalendarCheck,
  BoxSeam,
  CheckCircleFill,
  ArrowCounterclockwise,
  HourglassSplit,
  XCircleFill,
  CashCoin,
  Image as ImageIcon,
  ArrowRightCircleFill,
  Envelope,
  PencilSquare
} from 'react-bootstrap-icons';
import { RentalStatus, Financials, RentalOrder, CustomTailoringItem, PaymentDetail } from '../../types'; // Import from centralized types
import { formatCurrency } from '../../utils/formatters';
import { useAlert } from '../../contexts/AlertContext';
import './orderActions.css'
import { format } from 'date-fns';
import { OcrDropzone } from '../ocrDropzone/OcrDropzone';

// --- HELPER FUNCTIONS ---
const getStatusIcon = (status: RentalStatus) => {
    switch (status) {
        case 'Pending': return <HourglassSplit size={20} className="me-2" />;
        case 'To Pickup': return <BoxSeam size={20} className="me-2" />;
        case 'To Return': return <ArrowCounterclockwise size={20} className="me-2" />;
        case 'Completed': return <CheckCircleFill size={20} className="me-2" />;
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
  editableEndDate: string;
  canEditDetails: boolean;
  paymentUiMode: 'Cash' | 'Gcash';
  onPaymentUiModeChange: (mode: 'Cash' | 'Gcash') => void;
  paymentAmount: string;
  onPaymentAmountChange: (value: string) => void;
  onPaymentAmountBlur: () => void;
  gcashRef: string;
  onGcashRefChange: (value: string) => void;
  onReceiptFileChange: (file: File | null) => void;
  editableDeposit: string;
  onDepositChange: (value: string) => void;
  onDepositBlur: () => void;
  onInitiateReturn: (rentBackItems: CustomTailoringItem[]) => void;
  onInitiatePickup: () => void;
  onInitiateMarkAsPickedUp: () => void;
  onInitiateCancel: () => void;
  onInitiateSendReminder: () => void;
  isSendingReminder: boolean;
  returnReminderSent: boolean;
  onInitiateReschedule: () => void;
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
  editableEndDate,
  canEditDetails,
  paymentUiMode,
  onPaymentUiModeChange,
  paymentAmount,
  onPaymentAmountChange,
  onPaymentAmountBlur,
  gcashRef,
  onGcashRefChange,
  onReceiptFileChange,
  editableDeposit,
  onDepositChange,
  onDepositBlur,
  onInitiateReturn,
  onInitiateMarkAsPickedUp,
  onInitiatePickup,
  onInitiateCancel,
  onInitiateSendReminder,
  isSendingReminder,
  returnReminderSent,
  onInitiateReschedule,
}) => {
  const { addAlert } = useAlert();
  const { hasReturnableItems, isPurchaseOnly } = useMemo(() => {
    if (!rental) {
      return { hasReturnableItems: false,isPurchaseOnly: false };
    }
    
    // Check if there are any items that are for rent (physically returnable)
    const hasStandardRentals = (rental.singleRents?.length ?? 0) > 0 || (rental.packageRents?.length ?? 0) > 0;
    const hasCustomRentBacks = rental.customTailoring?.some(item => item.tailoringType === 'Tailored for Rent-Back');
    const hasReturnableItems = hasStandardRentals || hasCustomRentBacks;

    // Check if there are any items that are for purchase
    const hasPurchaseItems = rental.customTailoring?.some(item => item.tailoringType === 'Tailored for Purchase');

    // Determine if the order is exclusively for purchase
    const isPurchaseOnly = hasPurchaseItems && !hasReturnableItems;

    // The 'hasRentalItems' variable from your original file is exactly what we need.
    // I've renamed it to 'hasReturnableItems' for maximum clarity in this context.
    return { hasReturnableItems, hasPurchaseItems, isPurchaseOnly };
  }, [rental]);
  
  const discountAmount = parseFloat(editableDiscount) || 0;
  const depositAmount = isPurchaseOnly ? 0 : parseFloat(editableDeposit) || 0;
  const isStandardDeposit = parseFloat(editableDeposit) === (financials.requiredDeposit || 0);
  
  const itemsTotal = subtotal - discountAmount;

  const grandTotal = itemsTotal + depositAmount;
  
  const totalPaid = (financials.payments || []).reduce((acc, p) => acc + p.amount, 0);
  const remainingBalance = grandTotal - totalPaid;
  
  const isPaid = totalPaid > 0;
  const isFullyPaid = isPaid && totalPaid >= grandTotal;
  const canBeCancelled = status === 'Pending' || status === 'To Pickup';

  const handleOcrUpdate = (refNumber: string, file: File | null) => {
    onGcashRefChange(refNumber);
    onReceiptFileChange(file);
  };

  const handleUseRecommendedDeposit = () => {
    // This handler resets the editableDeposit state to the system-calculated value.
    onDepositChange(String(financials.requiredDeposit || 0));
  };

  const showPaymentForm = 
  (status === 'Pending' || status === 'To Pickup') && !isFullyPaid;

  const shouldDisableButton = useMemo(() => {
    if (isPaid) {
      return false;
    }

    const isPaymentInputInvalid = 
      (parseFloat(paymentAmount) <= 0) ||
      (paymentUiMode === 'Gcash' && gcashRef.trim() === '');
      
    // The button is disabled only if the rental is unpaid AND the new payment input is invalid.
    return !isPaid && isPaymentInputInvalid;
    
  }, [isPaid, paymentAmount, paymentUiMode, gcashRef]);

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
      <Card.Body className="p-3 lh-sm">
        <div className="text-center mb-3">
          <Button variant="dark" className="p-2 fs-6 w-100 d-flex align-items-center justify-content-center" style={{ cursor: 'default' }} disabled>
            {getStatusIcon(status)}
            {status.toUpperCase()}
          </Button>
        </div>
        {!isPurchaseOnly && (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <p className="mb-0 fw-medium"><CalendarCheck className="me-2" />Rental Period</p>
              {status === 'Pending' && (
                <Button variant="outline-secondary" size="sm" onClick={onInitiateReschedule}>
                  <PencilSquare className="me-1"/> Edit Date
                </Button>
              )}
            </div>
            
            {hasReturnableItems && !isPurchaseOnly && (
              <Alert variant="light" className="small py-2 text-center border">
                Note: The rental period only applies to rent-back and standard rental items.
              </Alert>
            )}

            {/* --- NEW DISPLAY LOGIC --- */}
            <div className="px-1">
              <div className="d-flex justify-content-between">
                <span className="text-muted">Start Date:</span>
                <span>
                  {editableStartDate ? format(new Date(editableStartDate), 'MMMM dd, yyyy') : 'Not Set'}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">End Date:</span>
                <span>
                  {editableEndDate ? format(new Date(editableEndDate), 'MMMM dd, yyyy') : 'Not Set'}
                </span>
              </div>
            </div>
          </div>
        )}
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

        {!isPurchaseOnly && (
          <div className="mb-2">
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

          {isStandardDeposit && canEditDetails && hasDepositBreakdown && (
            <Row >
              <Col >
                <Accordion flush className="m-2 p-0 w-100 ">
                  <Accordion.Item eventKey="0">
                    <Accordion.Header as="div">
                      <span className="small text-primary fst-italic text-end" style={{cursor: 'pointer'}}>
                        View deposit breakdown
                      </span>
                    </Accordion.Header>
                    <Accordion.Body className="p-2 border-top">
                      <ListGroup variant="flush">
                        {rental.singleRents?.map((item, index) => (
                          <ListGroup.Item key={`single-dep-${index}`} className="d-flex justify-content-between small text-muted p-1 border-0">
                            <span>{item.name.split(',')[0]} (x{item.quantity})</span>
                            <span className="fw-normal">{formatCurrency((item.price < 500 ? item.price : 500) * item.quantity)}</span>
                          </ListGroup.Item>
                        ))}
                        {rental.packageRents?.map((pkg, index) => (
                          <ListGroup.Item key={`pkg-dep-${index}`} className="d-flex justify-content-between small text-muted p-1 border-0">
                            <span>{pkg.name.split(',')[0]} (x{pkg.quantity})</span>
                            <span className="fw-normal">{formatCurrency(2000 * pkg.quantity)}</span>
                          </ListGroup.Item>
                        ))}
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
                <Button variant="link" size="sm" className="p-0 text-decoration-underline" onClick={handleUseRecommendedDeposit}>
                  Use recommended deposit
                </Button>
              </Col>
            </Row>
          )}
          </div>
        )}
        
        <div className="d-flex justify-content-between align-items-baseline mb-3">
          <p className="mb-0 fw-medium">Total Amount:</p>
          <p className="h4 fw-semibold text-danger">₱{formatCurrency(grandTotal)}</p>
        </div>
        <hr />
        
        {isPaid && (
          <div className="mb-3">
            <p className="mb-2 fw-bold d-flex justify-content-between align-items-center">
              <span><CashCoin className="me-2 text-muted"/>Payment History</span>
              <Badge bg={paymentStatusInfo.variant} pill>{paymentStatusInfo.text}</Badge>
            </p>
            <div className="border-top pt-2">
              {(financials.payments || []).map((payment: PaymentDetail, index: number) => (
                <div key={index} className="mb-2 pb-1 border-bottom">
                  <div className="d-flex justify-content-between small">
                    <span className="text-muted">
                      Payment #{index + 1} ({payment.referenceNumber ? 'GCash' : 'Cash'})
                      {payment.date && ` on ${format(new Date(payment.date), 'MM/dd/yyyy, h:mm a')}`}
                    </span>
                    <span className="fw-bold">₱{formatCurrency(payment.amount)}</span>
                  </div>
                  {payment.referenceNumber && (
                    <div className="d-flex justify-content-between small text-muted fst-italic">
                        <span>Ref #:</span>
                        <span>{payment.referenceNumber}</span>
                    </div>
                  )}
                  {payment.receiptImageUrl && (
                    <div className="d-flex justify-content-between small mt-1">
                      <span className="text-muted">
                        <ImageIcon className="me-1"/> Proof of Payment:
                      </span>
                      <a href={payment.receiptImageUrl} target="_blank" rel="noopener noreferrer">
                        View Receipt
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {status === 'To Pickup' && !isFullyPaid && (
          <Alert variant="warning" className="text-center mt-3 p-2">
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
              <Form.Label className="fw-medium">Payment Method</Form.Label>
              <ToggleButtonGroup
                type="radio"
                name="paymentOptions"
                value={paymentUiMode}
                onChange={onPaymentUiModeChange} // The handler is passed directly
                className="d-flex" // Use flexbox to make buttons fill the width
              >
                <ToggleButton
                  id="tbg-radio-1"
                  value="Cash"
                  variant={paymentUiMode === 'Cash' ? 'success' : 'outline-success'}
                  className="flex-fill payment-toggle-btn" // <-- ADDED CLASS
                >
                  Cash
                </ToggleButton>
                <ToggleButton
                  id="tbg-radio-2"
                  value="Gcash"
                  variant={paymentUiMode === 'Gcash' ? 'success' : 'outline-success'}
                  className="flex-fill payment-toggle-btn" // <-- ADDED CLASS
                >
                  Gcash
                </ToggleButton>
              </ToggleButtonGroup>
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
                <OcrDropzone onUpdate={handleOcrUpdate} />
              </Form.Group>
            )}
          </>
        )}
        
        <div className="d-grid gap-2 mt-4">
          {status === 'Pending' && (
            <Button 
              variant="primary" 
              onClick={onInitiatePickup} 
              disabled={shouldDisableButton}
            >
              <ArrowRightCircleFill className="me-2"/>
              Move to Pickup
            </Button>
          )}

          {status === 'To Pickup' && (
            <Button
              variant="primary"
              onClick={() => {
                const finalPaymentInput = parseFloat(paymentAmount) || 0;
                const remainingBalance = financials.remainingBalance ?? 0;
                if (remainingBalance > finalPaymentInput) {
                  addAlert(
                    `Payment is insufficient. Remaining balance of ₱${formatCurrency(remainingBalance)} must be paid.`,
                    'danger'
                  );
                  return;
                }         
                onInitiateMarkAsPickedUp();
              }}
              disabled={shouldDisableButton}
            >
              <ArrowRightCircleFill className="me-2"/>
              Mark as Picked Up
            </Button>
          )}

          {status === 'To Return' && hasReturnableItems && (
            <Button variant="success" onClick={() => onInitiateReturn(rental.customTailoring)}>
                <ArrowCounterclockwise className="me-2" />
                Mark as Returned
            </Button>
          )}

          {status === 'To Return' && hasReturnableItems && (
            returnReminderSent ? (
              <Alert variant="light" className="text-center small py-2 mt-2 border text-success">
                <CheckCircleFill className="me-2" />
                Return reminder email has been sent.
              </Alert>
            ) : (
              <Button   
                variant="outline-info" 
                onClick={onInitiateSendReminder} 
                disabled={isSendingReminder}
              >
                {isSendingReminder ? <Spinner as="span" size="sm" className="me-2"/> : <Envelope className="me-2" />}
                {isSendingReminder ? 'Sending...' : 'Send Return Reminder'}
              </Button>
            )
          )}

          {status === 'Completed' && (
              <Alert variant="success" className="text-center">
                  <CheckCircleFill className="me-2"/>
                  This order has been completed.
                  {!isPurchaseOnly && (
                      <p className="small mb-0 mt-1">
                          Reimbursed Amount: ₱{formatCurrency(financials.depositReimbursed)}
                      </p>
                  )}
              </Alert>
          )}

          {status === 'Cancelled' && ( 
            <Alert variant="danger" className="text-center">This order was cancelled.</Alert> 
          )}

          {/* Secondary Action: Cancel Button */}
          {canBeCancelled && (
            <Button variant="outline-danger" onClick={onInitiateCancel}>
              <XCircleFill className="me-2" />
              Cancel Order
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default OrderActions;