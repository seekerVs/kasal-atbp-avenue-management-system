import React from 'react';
import { Card, ListGroup, Button, Badge } from 'react-bootstrap';
import { format } from 'date-fns';
import { Appointment } from '../../types';

interface BookingAppointmentsListProps {
  appointments: Appointment[];
  onProcessAppointment: (appointment: Appointment) => void;
  onAddToRental: (appointment: Appointment) => void;
}

export const BookingAppointmentsList: React.FC<BookingAppointmentsListProps> = ({ appointments, onProcessAppointment, onAddToRental }) => {
  return (
    <Card className="shadow-sm mt-4">
      <Card.Header as="h5">Custom Tailoring Appointments</Card.Header>
      <ListGroup variant="flush">
        {appointments.map(apt => (
          <ListGroup.Item key={apt.appointmentId}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="fw-bold mb-0">Appointment for: {apt.appointmentFor.role}</p>
                <Badge bg={apt.status === 'Completed' ? 'success' : 'secondary'} pill>{apt.status}</Badge>
                {apt.appointmentDate && <span className="ms-2 text-muted small">on {format(new Date(apt.appointmentDate), 'MMM dd, yyyy')}</span>}
              </div>
              <div className="d-flex gap-2">
                {apt.status === 'Pending' && (
                  <Button size="sm" variant="outline-primary" onClick={() => onProcessAppointment(apt)}>
                    Schedule / Process
                  </Button>
                )}
                {apt.status === 'Completed' && (
                  <Button size="sm" variant="success" onClick={() => onAddToRental(apt)}>
                    Add to Rental
                  </Button>
                )}
              </div>
            </div>
            {apt.processedItemData && (
                <p className="small text-muted fst-italic mt-1 mb-0">
                    Processed as: "{apt.processedItemData.name}"
                </p>
            )}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
};