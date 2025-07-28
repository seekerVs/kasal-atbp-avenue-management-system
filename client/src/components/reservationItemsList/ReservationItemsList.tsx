import React from 'react';
import { Card, ListGroup, Badge } from 'react-bootstrap';
import { BoxSeam } from 'react-bootstrap-icons';
import { ItemReservation, PackageReservation } from '../../types'; // Correct types from your index
import { formatCurrency } from '../../utils/formatters';

interface ReservationItemsListProps {
  items: ItemReservation[];
  packages: PackageReservation[];
}

export const ReservationItemsList: React.FC<ReservationItemsListProps> = ({ items, packages }) => {
  return (
    <Card className="shadow-sm">
      <Card.Header as="h5">Reserved Items & Packages</Card.Header>
      <ListGroup variant="flush">
        {(!items || items.length === 0) && (!packages || packages.length === 0) && (
            <ListGroup.Item className="text-muted text-center">
                No items or packages were reserved.
            </ListGroup.Item>
        )}
        
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
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
};