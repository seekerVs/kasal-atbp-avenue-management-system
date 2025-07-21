import React from 'react';
import { Card, Dropdown, Spinner, Badge } from 'react-bootstrap';
import { PersonFill, CalendarEvent, GeoAltFill } from 'react-bootstrap-icons';
import { format } from 'date-fns';
import { Booking } from '../../types';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';

interface BookingInfoCardProps {
  booking: Booking;
  onStatusChange: (status: 'Confirmed' | 'Cancelled') => void;
  isSaving: boolean;
}

export const BookingInfoCard: React.FC<BookingInfoCardProps> = ({ booking, onStatusChange, isSaving }) => {
  
  const getStatusBadgeVariant = (status: Booking['status']): BadgeVariant => {
    switch (status) {
      case 'Pending': return 'primary';
      case 'Confirmed': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
        <span>Booking Details</span>
        <Badge bg={getStatusBadgeVariant(booking.status)} pill>{booking.status}</Badge>
      </Card.Header>
      <Card.Body>
        <p className="mb-1"><PersonFill className="me-2 text-muted"/><strong>Customer:</strong> {booking.customerInfo.name}</p>
        <p className="mb-1"><span className="text-muted small"><strong>Contact:</strong> {booking.customerInfo.phoneNumber} | {booking.customerInfo.email || 'N/A'}</span></p>
        <p className="mb-3"><GeoAltFill className="me-2 text-muted"/>
          <span className="text-muted small"><strong>Address:</strong> {`${booking.customerInfo.address.street}, ${booking.customerInfo.address.barangay}, ${booking.customerInfo.address.city}`}</span>
        </p>

        <hr />
        <p className="mb-1"><CalendarEvent className="me-2 text-muted"/><strong>Event Date:</strong> {format(new Date(booking.eventDate), 'MMMM dd, yyyy')}</p>
        <p className="mb-0"><span className="text-muted small"><strong>Rental Period:</strong> {format(new Date(booking.rentalStartDate), 'MMM dd')} - {format(new Date(booking.rentalEndDate), 'MMM dd, yyyy')}</span></p>

        {booking.status === 'Pending' && (
          <div className="d-grid mt-4">
            <Dropdown>
              <Dropdown.Toggle variant="primary" disabled={isSaving}>
                {isSaving ? <Spinner as="span" size="sm"/> : 'Update Status'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => onStatusChange('Confirmed')}>Mark as Confirmed</Dropdown.Item>
                <Dropdown.Item onClick={() => onStatusChange('Cancelled')} className="text-danger">Cancel Booking</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};