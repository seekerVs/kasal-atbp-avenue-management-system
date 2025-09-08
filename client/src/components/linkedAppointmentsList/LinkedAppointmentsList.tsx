import React from 'react';
import { Card, ListGroup, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Appointment, Reservation } from '../../types';
import { CalendarHeart, EyeFill } from 'react-bootstrap-icons';

interface LinkedAppointmentsListProps {
  appointments: Appointment[];
  reservation: Reservation;
}

export const LinkedAppointmentsList: React.FC<LinkedAppointmentsListProps> = ({ appointments, reservation }) => {
  const navigate = useNavigate();

  const getStatusBadgeVariant = (status: Appointment['status']) => {
    switch (status) {
      case 'Pending': return 'primary';
      case 'Confirmed': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const handleViewAppointment = (appointment: Appointment) => {
    navigate('/manage-appointments', { 
      state: { 
        searchTerm: appointment._id,
        activeTab: appointment.status 
      } 
    });
  };

  return (
    <Card className="shadow-sm mt-4">
      <Card.Header as="h5" className="d-flex align-items-center">
        <CalendarHeart className="me-2" />
        Linked Custom Tailoring Appointments
      </Card.Header>
      <ListGroup variant="flush">
        {appointments.map(apt => {
          
          // --- (3) REFACTORED DISPLAY LOGIC ---

          // Find the corresponding role from the main reservation data
          const fulfillment = reservation.packageReservations
            .flatMap(pkg => pkg.fulfillmentPreview)
            .find(f => f.linkedAppointmentId === apt._id);
          const roleName = fulfillment?.role || 'Custom Item';
          
          // Backwards-compatible note display
          // It checks for the new 'notes' field first, then falls back to parsing the old 'statusNote'.
          let displayNote = apt.notes || '';
          if (!displayNote && (apt as any).statusNote) {
            const noteParts = (apt as any).statusNote.split('Notes: ');
            if (noteParts.length > 1) {
              const note = noteParts[1].trim();
              if (note && note !== 'N/A') {
                displayNote = note;
              }
            }
          }

          // Backwards-compatible schedule display
          let scheduleDisplay = 'Not Set';
          if (apt.appointmentDate) {
            const datePart = format(new Date(apt.appointmentDate), 'MMM dd, yyyy');
            // If the new 'timeBlock' field exists, use it.
            if (apt.timeBlock) {
              const blockPart = apt.timeBlock.charAt(0).toUpperCase() + apt.timeBlock.slice(1);
              scheduleDisplay = `${datePart}, ${blockPart}`;
            } else {
              // Otherwise, fall back to formatting the time from the old date object.
              scheduleDisplay = format(new Date(apt.appointmentDate), 'MMM dd, yyyy, h:mm a');
            }
          }
          
          return (
            <ListGroup.Item key={apt._id}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="fw-bold mb-0">{roleName}</p>
                  
                  <p className="small text-muted mb-1">
                    <span>ID: {apt._id}</span>
                    <span className="mx-2">|</span>
                    <span>{scheduleDisplay}</span>
                  </p>

                  <Badge bg={getStatusBadgeVariant(apt.status)} pill>{apt.status}</Badge>

                  {displayNote && (
                    <p className="small fst-italic mt-2 mb-0">
                      <strong>Notes:</strong> "{displayNote}"
                    </p>
                  )}
                </div>
                
                <Button size="sm" variant="outline-primary" onClick={() => handleViewAppointment(apt)}>
                  <EyeFill className="me-1" /> View Details
                </Button>
              </div>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </Card>
  );
};