import React, { useMemo } from 'react';
import { Card, Badge, Button, Row, Col, Image, Collapse } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { EyeFill } from 'react-bootstrap-icons';
import namer from 'color-namer';

import { Reservation, RentalOrder, RentalStatus } from '../../types';
import { formatCurrency } from '../../utils/formatters';

// --- (1) CREATE A NORMALIZED STRUCTURE FOR DISPLAY ---
interface NormalizedItem {
  key: string;
  imageUrl?: string;
  name: string;
  variation: string;
  price: number;
  quantity: number;
}

// --- (2) UPDATE THE PROPS INTERFACE ---
interface BookingCardProps {
  // It can accept either a Reservation or a RentalOrder
  booking: Reservation | RentalOrder;
  // This tells the component how to interpret the 'booking' object
  type: 'reservation' | 'rental';
  isExpanded: boolean;
  onToggleExpansion: (id: string) => void;
}

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';

// --- (3) CREATE THE GENERIC COMPONENT ---
export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  type,
  isExpanded,
  onToggleExpansion
}) => {
  const navigate = useNavigate();

  // --- (4) USE useMemo TO NORMALIZE DATA ---
  // This powerful hook processes the incoming prop once and provides a consistent
  // object for the rest of the component to use, regardless of the source type.
  const displayData = useMemo(() => {
    const isRental = type === 'rental';
    const rental = booking as RentalOrder;
    const reservation = booking as Reservation;

    let isPurchaseOnly = false;
    if (isRental) {
      const hasRentalItems = 
        (rental.singleRents?.length ?? 0) > 0 || 
        (rental.packageRents?.length ?? 0) > 0 || 
        rental.customTailoring?.some(item => item.tailoringType === 'Tailored for Rent-Back');
      const hasPurchaseItems = rental.customTailoring?.some(item => item.tailoringType === 'Tailored for Purchase');
      isPurchaseOnly = hasPurchaseItems && !hasRentalItems;
    }

    const getStatusBadgeVariant = (status: RentalStatus | Reservation['status']): BadgeVariant => {
      const variants: { [key in RentalStatus | Reservation['status']]?: BadgeVariant } = {
        Pending: 'primary',
        Confirmed: 'info',
        'To Pickup': 'info',
        'To Return': 'warning',
        Completed: 'success',
        Cancelled: 'danger',
      };
      return variants[status] || 'secondary';
    };
    
    const getMotifName = (hex?: string) => {
      if (!hex) return 'N/A';
      try {
        const names = namer(hex);
        return (names.ntc[0]?.name || 'Custom Color').replace(/\b\w/g, char => char.toUpperCase());
      } catch { return 'Custom Color'; }
    };
    
    const allItems: NormalizedItem[] = [];
    if (isRental) {
      allItems.push(...(rental.singleRents || []).map(item => ({
        key: item._id,
        imageUrl: item.imageUrl,
        name: item.name,
        variation: `${item.variation.color.name}, ${item.variation.size}`,
        price: item.price * item.quantity,
        quantity: item.quantity,
      })));
      allItems.push(...(rental.packageRents || []).map(pkg => ({
        key: pkg._id,
        imageUrl: pkg.imageUrl,
        name: pkg.name.split(',')[0],
        variation: `Motif: ${pkg.name.split(',')[1] || 'N/A'}`,
        price: pkg.price,
        quantity: pkg.quantity,
      })));
      allItems.push(...(rental.customTailoring || []).map(item => ({
        key: item._id,
        imageUrl: item.referenceImages?.[0],
        name: item.name,
        variation: `Custom (${item.outfitType})`,
        price: item.price * item.quantity,
        quantity: item.quantity,
      })));
    } else {
      allItems.push(...(reservation.itemReservations || []).map(item => ({
        key: item.reservationId,
        imageUrl: item.imageUrl,
        name: item.itemName,
        variation: `${item.variation.color.name}, ${item.variation.size}`,
        price: item.price * item.quantity,
        quantity: item.quantity,
      })));
      allItems.push(...(reservation.packageReservations || []).map(pkg => ({
        key: pkg.packageReservationId,
        imageUrl: pkg.imageUrl,
        name: pkg.packageName,
        variation: `Motif: ${getMotifName(pkg.motifHex)}`,
        price: pkg.price,
        quantity: 1,
      })));
    }
    
    return {
      id: booking._id,
      customer: isRental ? rental.customerInfo[0] : reservation.customerInfo,
      status: booking.status,
      createdAt: booking.createdAt,
      statusBadgeVariant: getStatusBadgeVariant(booking.status),
      allItems,
      grandTotal: isRental ? rental.financials.grandTotal : (reservation.financials.grandTotal || 0),
      deposit: isRental ? rental.financials.depositAmount : (reservation.financials.requiredDeposit || 0),
      mainDateLabel: isRental ? 'Rental Period' : 'Reservation Date',
      mainDateValue: isRental 
        ? `${format(new Date(rental.rentalStartDate), 'MMM dd, yyyy')} - ${format(new Date(rental.rentalEndDate), 'MMM dd, yyyy')}`
        : format(new Date(reservation.reserveDate), 'MMM dd, yyyy'),
      viewDetailsPath: isRental ? `/rentals/${booking._id}` : `/reservations/${booking._id}`,
      isPurchaseOnly: isPurchaseOnly,
    };
  }, [booking, type]);


  // --- (5) UPDATE THE JSX TO USE THE NORMALIZED displayData OBJECT ---
  const ITEMS_TO_SHOW_INITIALLY = 2;
  const hasMoreItems = displayData.allItems.length > ITEMS_TO_SHOW_INITIALLY;
  const displayedItems = displayData.allItems.slice(0, ITEMS_TO_SHOW_INITIALLY);
  const hiddenItems = displayData.allItems.slice(ITEMS_TO_SHOW_INITIALLY);
  const shouldShowDateSection = 
    type === 'reservation' || 
    (type === 'rental' && !displayData.isPurchaseOnly && !['Pending', 'To Pickup'].includes(displayData.status));

  return (
    <Card className="mb-2 shadow-sm">
      <Card.Header className="d-flex justify-content-between align-items-center bg-light">
        <div>
          <strong>ID: {displayData.id}</strong>
          <small className="text-muted ms-2">(Created: {format(new Date(displayData.createdAt), 'MMM dd, yyyy, h:mm a')})</small>
        </div>
        <Badge bg={displayData.statusBadgeVariant} pill>{displayData.status.toUpperCase()}</Badge>
      </Card.Header>
      <Card.Body className="px-4 py-2 lh-sm">
          <p className="mb-0"><span className='fw-medium'>Customer: </span>{displayData.customer.name}</p>
          <p className="mb-1 text-muted small">Contact: {displayData.customer.phoneNumber}</p>
          <hr className="my-2"/>

          {displayedItems.map((item) => (
            <Row key={item.key} className="align-items-center my-1">
              <Col xs="auto" className="me-3">
                <Image src={item.imageUrl || 'https://placehold.co/80x80/e9ecef/adb5bd?text=Item'} fluid rounded style={{ width: "80px", height: "80px", objectFit: "cover" }} />
              </Col>
              <Col className='lh-sm'>
                <p className="mb-0 fw-bold">{item.name}</p>
                <p className="mb-0 text-muted small fst-italic">{item.variation}</p>
                <p className="mb-1 text-muted small">Qty: {item.quantity}</p>
              </Col>
              <Col xs="auto" className="text-end">
                <p className="mb-0 fw-bold text-danger fs-5">₱{formatCurrency(item.price)}</p>
              </Col>
            </Row>
          ))}

          {hasMoreItems && (
            <>
              <Collapse in={isExpanded}>
                <div id={`booking-items-collapse-${displayData.id}`}>
                  {hiddenItems.map((item) => (
                    <Row key={item.key} className="align-items-center my-1">
                       <Col xs="auto" className="me-3 ">
                          <Image src={item.imageUrl || 'https://placehold.co/80x80/e9ecef/adb5bd?text=Item'} fluid rounded style={{ width: "80px", height: "80px", objectFit: "cover" }} />
                      </Col>
                      <Col className='lh-sm'>
                          <p className="mb-0 fw-bold">{item.name}</p>
                          <p className="mb-1 text-muted small fst-italic">{item.variation}</p>
                      </Col>
                      <Col xs="auto" className="text-end">
                          <p className="mb-0 fw-bold text-danger fs-5">₱{formatCurrency(item.price)}</p>
                      </Col>
                    </Row>
                  ))}
                </div>
              </Collapse>
              <Button variant="link" onClick={() => onToggleExpansion(displayData.id)} className="text-decoration-none p-0 mt-1">
                <span className='small'>{isExpanded
                  ? 'Show Less'
                  : `Show ${hiddenItems.length} more ${hiddenItems.length > 1 ? 'items' : 'item'}`}
                </span>
              </Button>
            </>
          )}

          <hr className="my-2"/>
          <Row className="align-items-center">
            <Col>
              <p className="mb-0 text-muted small">Total Amount</p>
              <p className="fw-bold fs-5 mb-0"><span className="text-danger">₱{formatCurrency(displayData.grandTotal)}</span></p>
              <p className="text-muted fst-italic mb-0" style={{ fontSize: '0.75rem' }}>(Includes ₱{formatCurrency(displayData.deposit)} deposit)</p>
              {shouldShowDateSection && (
                <p className="mb-1 text-muted small mt-2">{displayData.mainDateLabel}: {displayData.mainDateValue}</p>
              )}
            </Col>
            <Col className="d-flex justify-content-end align-items-center">
              <Button
                variant="outline-primary"
                onClick={() => navigate(displayData.viewDetailsPath)}
              >
                <EyeFill className="me-1" /> View Details
              </Button>
            </Col>
          </Row>
      </Card.Body>
    </Card>
  );
};