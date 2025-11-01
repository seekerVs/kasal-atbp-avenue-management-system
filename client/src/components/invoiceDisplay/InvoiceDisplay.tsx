// client/src/components/invoiceDisplay/InvoiceDisplay.tsx

import React from 'react';
import { format } from 'date-fns';
import { RentalOrder, ShopSettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import './InvoiceDisplay.css';

interface InvoiceDisplayProps {
  rental: RentalOrder | null;
  shopSettings: ShopSettings | null;
}

export const InvoiceDisplay = React.forwardRef<HTMLDivElement, InvoiceDisplayProps>(({ rental, shopSettings }, ref) => {
  
  if (!rental || !shopSettings) {
    return <div ref={ref}>Loading invoice data...</div>;
  }

  const allItems = [
    ...(rental.singleRents || []),
    ...(rental.packageRents || []),
    ...(rental.customTailoring || [])
  ];

  const { customerInfo, financials } = rental;

  // Create enough empty rows to fill the table (e.g., up to 10 rows total)
  const emptyRows = Array.from({ length: Math.max(0, 8 - allItems.length) });

  return (
    <div ref={ref} className="invoice-wrapper">
      <header className="invoice-header">
        <h1>{shopSettings.ownerName || 'MARIA ANJANETTE A. DE MESA'}</h1>
        <p>{shopSettings.shopAddress || 'Gov. Panotes Ave. Brgy. VII Daet, Camarines Norte'}</p>
        <p>Non-VAT Reg. TIN: {shopSettings.ownerTIN || '920-896-071-00000'}</p>
        <p>KASAL ATBP AVENUE</p>
      </header>

      <section className="invoice-title-section">
        <h2 className="invoice-title">SALES INVOICE</h2>
        <div className="invoice-number">Nº <span>{rental._id.replace('KSL_', '')}</span></div>
      </section>
      
      <section className="info-grid">
        <div className="info-field"><span className="info-field-label">Sold to:</span><span className="info-field-value">{customerInfo[0].name}</span></div>
        <div className="info-field"><span className="info-field-label">Date:</span><span className="info-field-value">{format(new Date(), 'MMMM dd, yyyy')}</span></div>
        <div className="info-field"><span className="info-field-label">Address:</span><span className="info-field-value">{`${customerInfo[0].address.city}, ${customerInfo[0].address.province}`}</span></div>
        <div className="info-field"><span className="info-field-label">Terms:</span><span className="info-field-value">{shopSettings.paymentTerms || 'Cash'}</span></div>
        <div className="info-field"><span className="info-field-label">Bus. Style:</span><span className="info-field-value">{shopSettings.businessStyle || 'Service'}</span></div>
      </section>

      <table className="invoice-table">
        <thead>
          <tr>
            <th className="col-qty">QTY</th>
            <th className="col-unit">UNIT</th>
            <th className="col-articles">ARTICLES</th>
            <th className="col-up">U.P.</th>
            <th className="col-amount">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {allItems.map((item, index) => (
            <tr key={index}>
              <td style={{textAlign: 'center'}}>{item.quantity}</td>
              <td style={{textAlign: 'center'}}>pc</td>
              <td>{item.name.split(',')[0]}</td>
              <td style={{textAlign: 'right'}}>{formatCurrency(item.price)}</td>
              <td style={{textAlign: 'right'}}>{formatCurrency(item.price * item.quantity)}</td>
            </tr>
          ))}
          {emptyRows.map((_, index) => (
            <tr key={`empty-${index}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
          ))}
        </tbody>
      </table>
      
      <footer className="invoice-footer">
        <div className="footer-left">
            <p>NO CANCELATION, CHANGE ITEM ONLY</p>
            <div className="auth-signature">AUTHORIZED REPRESENTATIVE</div>
        </div>
        <div className="footer-right fs-6 lh-1">
            <div className="summary-row">
                <span>Subtotal:</span>
                <span className="summary-row-value">{formatCurrency(financials.subtotal)}</span>
            </div>
            <div className="summary-row">
                <span>Discount:</span>
                <span className="summary-row-value" style={{ color: '#28a745' }}>
                    -{formatCurrency(financials.shopDiscount)}
                </span>
            </div>
            <div className="summary-row" style={{ fontWeight: 'bold' }}>
                <span>Item Total:</span>
                <span className="summary-row-value">{formatCurrency(financials.itemsTotal)}</span>
            </div>
            <div className="summary-row">
                <span>Security Deposit:</span>
                <span className="summary-row-value">{formatCurrency(financials.depositAmount)}</span>
            </div>
            <div className="summary-row" style={{ fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '4px' }}>
                <span>GRAND TOTAL:</span>
                <span className="summary-row-value">₱{formatCurrency(financials.grandTotal)}</span>
            </div>
            <div className="summary-row" style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                <span>Amount Paid:</span>
                <span className="summary-row-value">{formatCurrency(financials.totalPaid)}</span>
            </div>
            <div className="summary-row" style={{ fontWeight: 'bold' }}>
                <span>Balance Due:</span>
                <span className="summary-row-value">{formatCurrency(financials.remainingBalance)}</span>
            </div>
        </div>
      </footer>

      <div className="bir-footer">
        <p>"THIS DOCUMENT IS NOT VALID FOR CLAIMING INPUT TAXES"</p>
        <p>Accreditation No. {shopSettings.accreditationNumber || '064MP20240000000003'}<br />
        Date Issued: {shopSettings.accreditationDate ? format(new Date(shopSettings.accreditationDate), 'MMMM dd, yyyy') : 'January 30, 2024'}
        </p>
      </div>
    </div>
  );
});