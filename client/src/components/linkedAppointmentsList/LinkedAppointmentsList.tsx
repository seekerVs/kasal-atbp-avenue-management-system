import React from 'react';
import { Card, ListGroup, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Appointment } from '../../types';
import { CalendarHeart, EyeFill } from 'react-bootstrap-icons';

// Define the props for our new component
interface LinkedAppointmentsListProps {
  appointments: Appointment[];
}

export const LinkedAppointmentsList: React.FC<LinkedAppointmentsListProps> = ({ appointments }) => {
  const navigate = useNavigate();

  // Helper to get a Bootstrap badge color based on appointment status
  const getStatusBadgeVariant = (status: Appointment['status']) => {
    switch (status) {
      case 'Pending': return 'primary';
      case 'Confirmed': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <Card className="shadow-sm mt-4">
      <Card.Header as="h5" className="d-flex align-items-center">
        <CalendarHeart className="me-2" />
        Linked Custom Tailoring Appointments
      </Card.Header>
      <ListGroup variant="flush">
        {appointments.map(apt => (
          <ListGroup.Item key={apt._id}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                {/* We can parse the role from the statusNote we created on the backend */}
                <p className="fw-bold mb-0">{apt.statusNote?.split('for custom item: ')[1]?.split(' from Reservation')[0] || 'Custom Item'}</p>
                <Badge bg={getStatusBadgeVariant(apt.status)} pill>{apt.status}</Badge>
                {apt.appointmentDate && <span className="ms-2 text-muted small">on {format(new Date(apt.appointmentDate), 'MMM dd, yyyy')}</span>}
              </div>
              <Button size="sm" variant="outline-primary" onClick={() => navigate(`/appointments/${apt._id}`)}>
                <EyeFill className="me-1" /> View Appointment
              </Button>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
};