import React from 'react';
import { Row, Col, Image, Table, Card } from 'react-bootstrap';
import { format } from 'date-fns';
import { Appointment } from '../../types';
import { Logo } from '../../assets/images';
// We can reuse the same CSS file for a consistent look and feel
import '../rentalSummary/rentalSummary.css'; 

interface AppointmentSummaryProps {
  appointment: Appointment | null;
}

export const AppointmentSummary = React.forwardRef<HTMLDivElement, AppointmentSummaryProps>(({ appointment }, ref) => {
  
  if (!appointment) {
    return null;
  }

  const { customerInfo, status, appointmentDate, timeBlock, notes } = appointment;

  return (
    <div ref={ref} className="rental-summary-container p-4">
      {/* --- 1. HEADER --- */}
      <Row className="align-items-center mb-4">
        <Col xs={6}>
          <Image src={Logo} style={{ width: '150px' }} />
          <p className="small text-muted mt-2 mb-0">
            123 Rizal Avenue, Daet, Camarines Norte<br />
            contact@kasalavenue.com | 0917-123-4567
          </p>
        </Col>
        <Col xs={6} className="text-end">
          <h2 className="mb-1">Appointment Confirmation</h2>
          <p className="mb-0"><strong>Appointment ID:</strong> {appointment._id}</p>
          <p className="mb-0"><strong>Date Issued:</strong> {format(new Date(), 'MMM dd, yyyy')}</p>
        </Col>
      </Row>

      {/* --- 2. CUSTOMER & APPOINTMENT INFO --- */}
      <Row className="mb-4">
        <Col xs={6}>
          <h6 className="summary-section-title">CUSTOMER INFORMATION</h6>
          <p className="mb-0"><strong>Name:</strong> {customerInfo.name}</p>
          <p className="mb-0"><strong>Contact:</strong> {customerInfo.phoneNumber}</p>
          <p className="mb-0"><strong>Address:</strong> {`${customerInfo.address.street}, ${customerInfo.address.barangay}, ${customerInfo.address.city}`}</p>
        </Col>
        <Col xs={6}>
          <h6 className="summary-section-title">APPOINTMENT DETAILS</h6>
          <p className="mb-0"><strong>Status:</strong> {status}</p>
          <p className="mb-0">
            <strong>Requested Schedule:</strong> 
            {appointmentDate && timeBlock
              ? ` ${format(new Date(appointmentDate), 'MMM dd, yyyy')}, ${timeBlock.charAt(0).toUpperCase() + timeBlock.slice(1)}`
              : ' Not Set'
            }
          </p>
        </Col>
      </Row>

      {/* --- 3. NOTES SECTION (replaces itemized list) --- */}
      {notes && (
        <>
          <h6 className="summary-section-title">NOTES / INITIAL IDEAS</h6>
            <p className="fst-italic mb-0">"{notes}"</p>

        </>
      )}

      {/* Financials and Itemized List are removed as they are not applicable */}

      {/* --- 4. FOOTER --- */}
      <div className="summary-footer mt-5 text-center">
        <p className="fw-bold">Thank you for your appointment request!</p>
        <p className="small text-muted">Our staff will contact you shortly to confirm your schedule. Please have your Appointment ID ready for any inquiries.</p>
      </div>
    </div>
  );
});