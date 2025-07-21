import React from 'react';
import { Card, ListGroup, Badge } from 'react-bootstrap';
import { BoxSeam } from 'react-bootstrap-icons';
import { ItemReservation, PackageReservation } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface BookingReservationsListProps {
  items: ItemReservation[];
  packages: PackageReservation[];
}

export const BookingReservationsList: React.FC<BookingReservationsListProps> = ({ items, packages }) => {
  return (
    <Card className="shadow-sm">
      <Card.Header as="h5">Reserved Items & Packages</Card.Header>
      <ListGroup variant="flush">
        {items.map(item => (
          <ListGroup.Item key={item.reservationId}>
            <div className="d-flex justify-content-between">
              <div>
                <p className="fw-bold mb-0">{item.itemName}</p>
                <small className="text-muted">{item.variation.color}, {item.variation.size} × {item.quantity}</small>
              </div>
              <p className="fw-bold mb-0">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          </ListGroup.Item>
        ))}
        {packages.map(pkg => (
          <ListGroup.Item key={pkg.packageReservationId}>
            <div className="d-flex justify-content-between">
                <div>
                    <p className="fw-bold mb-0"><BoxSeam size={14} className="me-2"/>{pkg.packageName}</p>
                    {pkg.motifName && <Badge bg="light" text="dark">{pkg.motifName}</Badge>}
                </div>
                <p className="fw-bold mb-0">{formatCurrency(pkg.price)}</p>
            </div>
            {pkg.fulfillmentPreview.some(f => f.isCustom) && (
              <p className="small text-info fst-italic mt-1 mb-0">Note: This package includes custom tailoring appointments.</p>
            )}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
};