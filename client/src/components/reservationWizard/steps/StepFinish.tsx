// client/src/components/reservationWizard/steps/StepFinish.tsx

import React, { useRef, useState } from 'react';
import { Button, ListGroup, Badge, Card, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { BoxSeam, CalendarEvent, CheckCircleFill, Download } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { Reservation } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { format } from 'date-fns';
import namer from 'color-namer';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { calculateItemDeposit, calculatePackageDeposit } from '../../../utils/financials';
import { CustomerInfoDisplay } from '../../customerInfoDisplay/CustomerInfoDisplay';

interface StepFinishProps {
  reservation: Reservation | null;
}

export const StepFinish: React.FC<StepFinishProps> = ({ reservation }) => {
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!reservation) {
    return (
      <div className="text-center">
        <p className="text-muted">Loading reservation details...</p>
      </div>
    );
  }

  // Calculate financials for display
  const subtotal = (reservation.itemReservations.reduce((sum, item) => sum + item.price * item.quantity, 0)) + 
                   (reservation.packageReservations.reduce((sum, pkg) => sum + pkg.price, 0));
  const deposit = reservation.financials.requiredDeposit || 0;
  const grandTotal = subtotal + deposit;
  const amountPaid = reservation.financials.payments?.[0]?.amount || 0;
  const remainingBalance = grandTotal - amountPaid;

  const getMotifName = (hex?: string) => {
    if (!hex) return 'N/A';
    try {
      const names = namer(hex);
      const name = names.ntc[0]?.name || 'Custom Color';
      return name.replace(/\b\w/g, char => char.toUpperCase());
    } catch { return 'Custom Color'; }
  };

    const handleDownloadPdf = () => {
    const input = receiptRef.current;
    if (!input) return;

    setIsDownloading(true);

    html2canvas(input, { scale: 2 }) // Use scale for better resolution
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        
        // A4 page dimensions in mm: 210 x 297
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const canvasAspectRatio = canvasWidth / canvasHeight;
        
        // Use page width minus margins
        const contentWidth = pdfWidth - 20; // 10mm margin on each side
        let contentHeight = contentWidth / canvasAspectRatio;

        // If the content is taller than the page, it will be scaled down.
        // For very long receipts, more advanced multi-page logic would be needed.
        if (contentHeight > pdfHeight - 20) {
            contentHeight = pdfHeight - 20;
        }

        const x = 10; // 10mm margin from left
        const y = 10; // 10mm margin from top
        
        pdf.addImage(imgData, 'PNG', x, y, contentWidth, contentHeight);
        pdf.save(`reservation-receipt-${reservation?._id}.pdf`);
        
        setIsDownloading(false);
      })
      .catch(() => {
        alert('Could not generate PDF. Please try again.');
        setIsDownloading(false);
      });
  };

  const appointmentId = reservation.packageReservations
    .flatMap(pkg => pkg.fulfillmentPreview)
    .find(fulfill => fulfill.isCustom && fulfill.linkedAppointmentId)?.linkedAppointmentId;

  
  return (
    <div>
        <div ref={receiptRef} className="p-3 px-lg-5">
            <div className="text-center">
                <CheckCircleFill className="text-success mb-2" size={50} />
                <h3 className="mb-2">Reservation Request Submitted!</h3>
                <p className="text-muted mb-4 lh-1 fw-light">
                    Congratulations! Your reservation request was processed successfully. Here are your reservation details.
                    <br/>
                    Make sure to take a screenshot or click the "Download as PDF" button for your records.
                </p>
                <div className="d-inline-block p-3 rounded mb-2">
                  <p className="text-muted small mb-0" style={{ letterSpacing: '1px' }}>RESERVATION ID</p>
                  <p className="h4 fw-bold text-danger mb-0">{reservation._id}</p>
                </div>
                
                <div className="summary-container text-start py-2 border-bottom">
                  <Row className="g-4">
                    {/* Left Column: Customer Details */}
                    <Col md={6} className="pe-md-4 border-end-md">
                      <CustomerInfoDisplay customer={reservation.customerInfo} />
                    </Col>

                    {/* Right Column: Reservation Date */}
                    <Col md={6} className="ps-md-4">
                      <h5 className="mb-2 text-center fw-bold">Reservation Details</h5>
                      <hr className='my-2 mx-3' />
                      <div className="rounded mb-3">
                        <p className="mb-0 fw-medium"><CalendarEvent className="me-2"/>Reservation Date:</p>
                        <p className="mb-0">{reservation.reserveDate && format(new Date(reservation.reserveDate), 'EEEE, MMMM dd, yyyy')}</p>
                      </div>
                    </Col>
                  </Row>
                </div>
            </div>
            <div className="text-start mt-4">
            <h5>Reserved Items</h5>
            <ListGroup variant="flush">
                {reservation.itemReservations.map(item => (
                    <ListGroup.Item key={item.reservationId} className="px-0 lh-sm">
                      {/* Row 1: Item Name and Price */}
                      <div className="d-flex justify-content-between">
                        <p className="mb-0">{item.itemName}</p>
                        <p className="mb-0">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                      
                      {/* Row 2: Variation Details (xQuantity is already in here) */}
                      <p className="text-muted small mb-0 fw-light">
                        Variation: {item.variation.color.name}, {item.variation.size} (x{item.quantity})
                      </p>
                      
                      {/* Row 3: Deposit Label and Value */}
                      <div className="d-flex justify-content-between text-muted small">
                        <p className="mb-0">Deposit:</p>
                        <p className="mb-0">
                          {formatCurrency(calculateItemDeposit(item))}
                        </p>
                      </div>
                    </ListGroup.Item>
                ))}
        
                {reservation.packageReservations.map(pkg => (
                    <ListGroup.Item key={pkg.packageReservationId} className="px-0">
                      {/* Row 1: Package Name and Price */}
                      <div className="d-flex justify-content-between">
                        <p className="mb-0"><BoxSeam size={14} className="me-2"/>{pkg.packageName}</p>
                        <p className="mb-0">{formatCurrency(pkg.price)}</p>
                      </div>
                      
                      {/* Row 2: Variation Details (x1) */}
                      <p className="text-muted small mb-0">
                        Variation: {getMotifName(pkg.motifHex)} (x1)
                      </p>
                      
                      {/* Row 3: Deposit Label and Value */}
                      <div className="d-flex justify-content-between mt-1">
                        <p className="text-muted small mb-0">Deposit:</p>
                        <p className="text-muted small mb-0">
                          {formatCurrency(calculatePackageDeposit())}
                        </p>
                      </div>
                    </ListGroup.Item>
                ))}
                <hr className="my-3" />

                <ListGroup.Item className="d-flex justify-content-between p-0 border-0">
                    <span className="fw-bold">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between p-0 border-0">
                    <span className="fw-bold">Refundable Security Deposit</span>
                    <span>{formatCurrency(deposit)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between p-0 border-0 h5 mb-0">
                    <span className="fw-bold">Grand Total</span>
                    <span className="fw-bold">{formatCurrency(grandTotal)}</span>
                </ListGroup.Item>

                <hr className="my-2" />
                
                <ListGroup.Item className="d-flex justify-content-between p-0 border-0 text-success">
                    <span className="fw-bold">Amount Paid</span>
                    <span className="fw-bold">{formatCurrency(amountPaid)}</span>
                </ListGroup.Item>

                {reservation.financials.payments?.[0]?.referenceNumber && (
                    <ListGroup.Item className="d-flex justify-content-between px-0 border-0 pt-0">
                    <span className="text-muted small">
                        Ref. No:
                    </span>
                    <span className="text-muted small">
                        {reservation.financials.payments[0].referenceNumber}
                    </span>
                    </ListGroup.Item>
                )}
                
                {remainingBalance > 0 && (
                    <ListGroup.Item className="d-flex justify-content-between p-0 border-0 text-danger">
                        <span className="fw-bold">Remaining Balance</span>
                        <span className="fw-bold">{formatCurrency(remainingBalance)}</span>
                    </ListGroup.Item>
                )}
            </ListGroup>
            </div>
            {reservation.packageAppointmentDate && appointmentId && (
                <div className="text-start mt-4">
                <hr />
                <h5>Appointment Details</h5>
                <Card body className="bg-light border-dashed">
                    {/* --- NEW: Display the Appointment ID --- */}
                    <p className="small text-muted mb-2">
                    Appointment ID: <strong>{appointmentId}</strong>
                    </p>
        
                    <p className="mb-1">
                    A fitting appointment for your custom items has been requested for:
                    </p>
                    <p className="fw-bold h5 text-primary">
                    {format(new Date(reservation.packageAppointmentDate), 'EEEE, MMMM dd, yyyy')} at {format(new Date(reservation.packageAppointmentDate), 'h:mm a')}
                    </p>
                    <p className="small text-muted mb-2">
                    Our staff will contact you to confirm this schedule.
                    </p>
                    <p className="small mb-1">This appointment is for:</p>
                    <ul className="small ps-4 mb-0">
                    {reservation.packageReservations
                        .flatMap(pkg => pkg.fulfillmentPreview)
                        .filter(fulfill => fulfill.isCustom)
                        .map((fulfill, index) => (
                        <li key={index}>{fulfill.role}</li>
                        ))}
                    </ul>
                </Card>
                </div>
            )}
            <div className="text-center mt-4 small fst-italic text-muted mb-0">
                {remainingBalance > 0 && (
                    <p className='mb-0 lh-1'>The remaining balance is due upon pickup of the items.</p> 
                )}
                <p>For more information, please visit our FAQs or contact us directly.</p>
            </div>
        </div>
    
        <div className="d-flex justify-content-center gap-2 mt-2">
            <Button variant="primary" onClick={() => navigate('/products')}>Browse More Outfits</Button>
            <Button variant="success" onClick={handleDownloadPdf} disabled={isDownloading}>
            {isDownloading ? (
                <Spinner as="span" size="sm" className="me-2" />
            ) : (
                <Download className="me-2"/>
            )}
            Download as PDF
            </Button>
        </div>
    </div>
  );
};