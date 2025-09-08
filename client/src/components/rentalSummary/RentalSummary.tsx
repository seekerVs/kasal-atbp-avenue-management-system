import React from 'react';
import { Row, Col, Image, Table } from 'react-bootstrap';
import { format } from 'date-fns';
import { RentalOrder } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Logo } from '../../assets/images'; // Assuming your logo is exported from here
import './rentalSummary.css';

interface RentalSummaryProps {
  rental: RentalOrder | null;
}

// A ref is passed to this component so we can capture it for the PDF.
// We use React.forwardRef to allow this.
export const RentalSummary = React.forwardRef<HTMLDivElement, RentalSummaryProps>(({ rental }, ref) => {
  
  if (!rental) {
    return null; // Don't render anything if there's no rental data
  }

  // --- Helper function to determine the document title ---
  const getDocumentTitle = (status: RentalOrder['status']): string => {
    switch (status) {
      case 'Pending':
      case 'To Pickup':
        return 'Rental Agreement & Invoice';
      case 'To Return':
        return 'Pickup Receipt & Return Slip';
      case 'Completed':
        return 'Final Rental Receipt';
      case 'Cancelled':
        return 'Cancelled Rental Record';
      default:
        return 'Rental Summary';
    }
  };

  const allItems = [
    ...(rental.singleRents || []),
    ...(rental.packageRents || []),
    ...(rental.customTailoring || [])
  ];

  const { customerInfo, financials } = rental;

  return (
    // The ref from the parent component is attached here.
    <div ref={ref} className="rental-summary-container p-4">
      {/* --- 1. HEADER --- */}
      <Row className="align-items-center mb-4">
        <Col xs={6}>
          <Image src={Logo} style={{ width: '150px' }} />
          <p className="small text-muted mt-2 mb-0">
            Gov. Panotes Avenue, Daet, Philippines<br />
            maandemesa9@gmail.com | 0907 957 9999
          </p>
        </Col>
        <Col xs={6} className="text-end">
          <h2 className="mb-1">{getDocumentTitle(rental.status)}</h2>
          <p className="mb-0"><strong>Rental ID:</strong> {rental._id}</p>
          <p className="mb-0"><strong>Date Issued:</strong> {format(new Date(), 'MMM dd, yyyy')}</p>
        </Col>
      </Row>

      {/* --- 2. CUSTOMER & RENTAL INFO --- */}
      <Row className="mb-4">
        <Col xs={6}>
          <h6 className="summary-section-title">CUSTOMER INFORMATION</h6>
          <p className="mb-0"><strong>Name:</strong> {customerInfo[0].name}</p>
          <p className="mb-0"><strong>Contact:</strong> {customerInfo[0].phoneNumber}</p>
          <p className="mb-0"><strong>Address:</strong> {`${customerInfo[0].address.street}, ${customerInfo[0].address.barangay}, ${customerInfo[0].address.city}`}</p>
        </Col>
        <Col xs={6}>
          <h6 className="summary-section-title">RENTAL DETAILS</h6>
          <p className="mb-0"><strong>Status:</strong> {rental.status}</p>
          {['To Return', 'Completed'].includes(rental.status) ? (
            <>
              <p className="mb-0"><strong>Pickup Date:</strong> {format(new Date(rental.rentalStartDate), 'MMM dd, yyyy')}</p>
              <p className="mb-0"><strong>Return Due Date:</strong> {format(new Date(rental.rentalEndDate), 'MMM dd, yyyy')}</p>
            </>
          ) : (
            <p className="mb-0"><strong>Rental Period:</strong> 4 Days (Starts upon pickup)</p>
          )}
        </Col>
      </Row>

      {/* --- 3. ITEMIZED LIST --- */}
      <h6 className="summary-section-title">ITEMIZED LIST</h6>
      <Table bordered size="sm">
        <thead>
          <tr>
            <th>#</th>
            <th>Item / Package</th>
            <th>Details</th>
            <th className="text-center">Qty</th>
            <th className="text-end">Price</th>
            <th className="text-end">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {allItems.map((item, index) => (
            <tr key={item._id || index}>
              <td>{index + 1}</td>
              <td>{item.name.split(',')[0]}</td>
              <td>
                {'variation' in item 
                  ? `${item.variation.color.name}, ${item.variation.size}`
                  : item.name.split(',')[1] || 'Package'
                }
              </td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-end">{formatCurrency(item.price)}</td>
              <td className="text-end">{formatCurrency(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* --- 4. FINANCIAL SUMMARY --- */}
      <Row className="justify-content-end mt-3">
        <Col md={5}>
          <Table borderless size="sm" className="financial-summary-table">
            <tbody>
              <tr>
                <td>Subtotal:</td>
                <td className="text-end">{formatCurrency(financials.subtotal || 0)}</td>
              </tr>
              <tr>
                <td>Discount:</td>
                <td className="text-end text-success">-{formatCurrency(financials.shopDiscount)}</td>
              </tr>
              <tr className="fw-bold">
                <td>Item Total:</td>
                <td className="text-end">{formatCurrency(financials.itemsTotal || 0)}</td>
              </tr>
              <tr>
                <td>Security Deposit:</td>
                <td className="text-end">{formatCurrency(financials.depositAmount)}</td>
              </tr>
              <tr className="grand-total-row">
                <td className="fw-bold fs-5">GRAND TOTAL:</td>
                <td className="text-end fw-bold fs-5">₱{formatCurrency(financials.grandTotal || 0)}</td>
              </tr>
              <tr>
                <td>Amount Paid:</td>
                <td className="text-end">{formatCurrency(financials.totalPaid || 0)}</td>
              </tr>
              <tr className="fw-bold">
                {/* Provide a fallback of 0 for the comparison */}
                <td className={(financials.remainingBalance || 0) > 0 ? 'text-danger' : ''}>Balance Due:</td>
                <td className={`text-end ${(financials.remainingBalance || 0) > 0 ? 'text-danger' : ''}`}>
                  {/* The formatCurrency function already handles a null/undefined value correctly */}
                  {formatCurrency(financials.remainingBalance)}
                </td>
              </tr>
              {/* --- Conditional Return Section --- */}
              {rental.status === 'Completed' && (
                <tr className="fw-bold text-success">
                  <td>Deposit Reimbursed:</td>
                  <td className="text-end">{formatCurrency(financials.depositReimbursed || 0)}</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Col>
      </Row>

      {/* --- 5. FOOTER --- */}
      <div className="summary-footer mt-5 text-center">
        <p className="fw-bold">Thank you for choosing Kasal atbp. Avenue!</p>
        <p className="small text-muted">Please present this document upon pickup and return of items. Terms and conditions apply.</p>
      </div>
    </div>
  );
});