import React from 'react';
import { ListGroup, Button, Badge } from 'react-bootstrap';
import { BoxSeam, Scissors, Trash, XCircleFill } from 'react-bootstrap-icons';
import { Appointment, ItemReservation, PackageReservation } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ReservationListProps {
  itemReservations: ItemReservation[];
  packageReservations: PackageReservation[];
  appointments: Appointment[];
  onRemoveItem: (id: string) => void;
  onRemovePackage: (id: string) => void;
  onRemoveAppointment: (id: string) => void;
}

export const ReservationList: React.FC<ReservationListProps> = ({ itemReservations, packageReservations, appointments, onRemoveItem, onRemovePackage, onRemoveAppointment }) => {
  const hasReservations = itemReservations.length > 0 || packageReservations.length > 0 || appointments.length > 0;

  return (
    <div>
      <h6 className="mt-4 text-muted">Current Selections</h6>
      <hr className="mt-1" />
      {hasReservations ? (
        <ListGroup variant="flush">
          {itemReservations.map(item => (
            <ListGroup.Item key={item.reservationId} className="d-flex justify-content-between align-items-center ps-0">
              <div>
                <p className="fw-bold mb-0">{item.itemName}</p>
                <small className="text-muted">{item.variation.color}, {item.variation.size} × {item.quantity}</small>
              </div>
              <div className="text-end">
                  <span className="fw-bold me-3">{formatCurrency(item.price * item.quantity)}</span>
                  <Button variant="link" className="text-danger p-0" onClick={() => onRemoveItem(item.reservationId)}>
                      <XCircleFill size={18}/>
                  </Button>
              </div>
            </ListGroup.Item>
          ))}
          {packageReservations.map(pkg => (
            <ListGroup.Item key={pkg.packageReservationId} className="d-flex justify-content-between align-items-center ps-0">
              <div>
                <p className="fw-bold mb-0"><BoxSeam size={14} className="me-2"/>{pkg.packageName}</p>
                {pkg.motifName && <Badge bg="light" text="dark">{pkg.motifName}</Badge>}
              </div>
              <div className="text-end">
                  <span className="fw-bold me-3">{formatCurrency(pkg.price)}</span>
                  <Button variant="link" className="text-danger p-0" onClick={() => onRemovePackage(pkg.packageReservationId)}>
                      <XCircleFill size={18}/>
                  </Button>
              </div>
            </ListGroup.Item>
          ))}
          {appointments.map(apt => (
            <ListGroup.Item key={apt.appointmentId} className="d-flex justify-content-between align-items-center ps-0">
              <div>
                <p className="fw-bold mb-0 text-info"><Scissors size={14} className="me-2"/>Custom Appointment</p>
                <small className="text-muted">For: {apt.appointmentFor.role}</small>
              </div>
              <div className="text-end">
                  <span className="fw-bold me-3 fst-italic text-muted">Price TBD</span>
                  <Button variant="link" className="text-danger p-0" onClick={() => onRemoveAppointment(apt.appointmentId)}>
                      <XCircleFill size={18}/>
                  </Button>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      ) : (
        <p className="text-center text-muted mt-3">Your selections will appear here.</p>
      )}
    </div>
  );
};