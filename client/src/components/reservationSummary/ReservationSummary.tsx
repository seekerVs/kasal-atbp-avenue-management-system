import React from 'react';
import { Row, Col, Image, Table, Card } from 'react-bootstrap';
import { format } from 'date-fns';
import { Reservation, ShopSettings } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { calculateItemDeposit, calculatePackageDeposit } from '../../utils/financials';
import { Logo } from '../../assets/images';
import namer from 'color-namer';
import '../rentalSummary/rentalSummary.css'; // We can reuse the same CSS

interface ReservationSummaryProps {
  reservation: Reservation | null;
  shopSettings: ShopSettings | null;
}

export const ReservationSummary = React.forwardRef<HTMLDivElement, ReservationSummaryProps>(({ reservation, shopSettings }, ref) => {
  
  if (!reservation) {
    return null;
  }

  const linkedAppointmentInfo = (() => {
    if (!reservation.packageReservations || reservation.packageReservations.length === 0) {
      return null;
    }

    const customFulfillments = reservation.packageReservations
      .flatMap(pkg => pkg.fulfillmentPreview)
      .filter(f => f.isCustom && f.linkedAppointmentId);

    if (customFulfillments.length === 0) {
      return null;
    }
    
    // Assume all custom items in a single reservation are linked to the same appointment
    const firstAppointmentId = customFulfillments[0].linkedAppointmentId;
    const customRoles = customFulfillments.map(f => f.role);

    return {
      appointmentId: firstAppointmentId,
      roles: customRoles,
    };
  })();

  const getMotifName = (hex?: string) => {
    if (!hex) return 'N/A';
    try {
      const names = namer(hex);
      return (names.ntc[0]?.name || 'Custom Color').replace(/\b\w/g, char => char.toUpperCase());
    } catch { return 'Custom Color'; }
  };

  const allItems = [
    ...(reservation.itemReservations || []).map(item => ({
      ...item,
      key: item.reservationId,
      name: item.itemName,
      details: `${item.variation.color.name}, ${item.variation.size}`,
      deposit: calculateItemDeposit(item),
    })),
    ...(reservation.packageReservations || []).map(pkg => ({
      ...pkg,
      key: pkg.packageReservationId,
      name: pkg.packageName,
      details: `Motif: ${getMotifName(pkg.motifHex)}`,
      quantity: 1,
      deposit: calculatePackageDeposit(),
    })),
  ];

  const { customerInfo, financials } = reservation;

  return (
    <div ref={ref} className="rental-summary-container p-4">
      {/* --- 1. HEADER --- */}
      <Row className="align-items-center mb-4">
        <Col xs={6}>
          <Image src={Logo} style={{ width: '150px' }} />
          <p className="small text-muted mt-2 mb-0">
            {shopSettings?.shopAddress || 'Address not available'}<br />
            {shopSettings?.shopEmail || 'Email not available'} | {shopSettings?.shopContactNumber || 'Contact not available'}
          </p>
        </Col>
        <Col xs={6} className="text-end">
          <h2 className="mb-1">Reservation Summary</h2>
          <p className="mb-0"><strong>Reservation ID:</strong> {reservation._id}</p>
          <p className="mb-0"><strong>Date Issued:</strong> {format(new Date(), 'MMM dd, yyyy')}</p>
        </Col>
      </Row>

      {/* --- 2. CUSTOMER & RESERVATION INFO --- */}
      <Row className="mb-4">
        <Col xs={6}>
          <h6 className="summary-section-title">CUSTOMER INFORMATION</h6>
          <p className="mb-0"><strong>Name:</strong> {customerInfo.name}</p>
          <p className="mb-0"><strong>Contact:</strong> {customerInfo.phoneNumber}</p>
          <p className="mb-0"><strong>Address:</strong> {`${customerInfo.address.street}, ${customerInfo.address.barangay}, ${customerInfo.address.city}`}</p>
        </Col>
        <Col xs={6}>
          <h6 className="summary-section-title">RESERVATION DETAILS</h6>
          <p className="mb-0"><strong>Status:</strong> {reservation.status}</p>
          <p className="mb-0"><strong>Reservation Date:</strong> {format(new Date(reservation.reserveDate), 'MMM dd, yyyy')}</p>
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
            <th className="text-end">Deposit</th>
            <th className="text-end">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {allItems.map((item, index) => (
            <tr key={item.key || index}>
              <td>{index + 1}</td>
              <td>{item.name}</td>
              <td>{item.details}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-end">{formatCurrency(item.price)}</td>
              <td className="text-end">{formatCurrency(item.deposit)}</td>
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
                <td>Security Deposit:</td>
                <td className="text-end">{formatCurrency(financials.requiredDeposit || 0)}</td>
              </tr>
              <tr className="grand-total-row">
                <td className="fw-bold fs-5">GRAND TOTAL:</td>
                <td className="text-end fw-bold fs-5">₱{formatCurrency(financials.grandTotal || 0)}</td>
              </tr>
              <tr>
                <td>Amount Paid:</td>
                <td className="text-end">{formatCurrency(financials.payments?.[0]?.amount || 0)}</td>
              </tr>
              <tr className="fw-bold">
                <td className={(financials.remainingBalance || 0) > 0 ? 'text-danger' : ''}>Balance Due:</td>
                <td className={`text-end ${(financials.remainingBalance || 0) > 0 ? 'text-danger' : ''}`}>
                  {formatCurrency(financials.remainingBalance || 0)}
                </td>
              </tr>
            </tbody>
          </Table>
        </Col>
      </Row>

      {linkedAppointmentInfo && reservation.packageAppointmentDate && (
        <>
          <h6 className="summary-section-title mt-4">Linked Appointment Details</h6>
          <Card body className="bg-light border-dashed">
            <p className="small text-muted mb-2">
              Appointment ID: <strong>{linkedAppointmentInfo.appointmentId}</strong>
            </p>
            <p className="mb-1">
              A fitting appointment for your custom items has been requested for:
            </p>
            <p className="fw-bold h5 text-primary">
              {format(new Date(reservation.packageAppointmentDate), 'EEEE, MMMM dd, yyyy')}
              {reservation.packageAppointmentBlock && 
                `, ${reservation.packageAppointmentBlock.charAt(0).toUpperCase() + reservation.packageAppointmentBlock.slice(1)}`
              }
            </p>
            <p className="small text-muted mb-2">
              Our staff will contact you to confirm this schedule. This appointment is for:
            </p>
            <ul className="small ps-4 mb-0">
              {linkedAppointmentInfo.roles.map((role, index) => (
                <li key={index}>{role}</li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {/* --- 5. FOOTER --- */}
      <div className="summary-footer mt-5 text-center">
        <p className="fw-bold">Thank you for your reservation request!</p>
        <p className="small text-muted">Please note this is a request and is pending confirmation from our staff. Terms and conditions apply.</p>
      </div>
    </div>
  );
});