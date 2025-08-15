import React from 'react';
// --- 1. IMPORT Button ---
import { Card, ListGroup, Badge, Button, Col, Row } from 'react-bootstrap';
import { BoxSeam, EyeFill } from 'react-bootstrap-icons'; // <-- Add EyeFill
import { ItemReservation, PackageReservation } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { calculateItemDeposit, calculatePackageDeposit } from '../../utils/financials';
import namer from 'color-namer'; 

interface ReservationItemsListProps {
  items: ItemReservation[];
  packages: PackageReservation[];
  // --- 2. ADD THE NEW PROP ---
  onViewPackage: (pkg: PackageReservation) => void;
}

export const ReservationItemsList: React.FC<ReservationItemsListProps> = ({ items, packages, onViewPackage }) => {
  const getMotifName = (hex: string) => {
    try {
      const names = namer(hex);
      const name = names.ntc[0]?.name || 'Custom Color';
      return name.replace(/\b\w/g, char => char.toUpperCase());
    } catch {
      return 'Custom Color';
    }
  };

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
              <div className="text-start">
                <p className="fw-bold mb-0">{item.itemName}</p>
                <Badge bg="light" text="dark" className="d-block my-1" style={{ width: 'fit-content' }}>{(item.variation.color as any).name}, {item.variation.size} × {item.quantity}</Badge>
                <small className="text-muted">Deposit: {formatCurrency(calculateItemDeposit(item))}</small>
              </div>
              <p className="fw-bold mb-0">{formatCurrency(item.price * item.quantity)}</p>
            </div>
          </ListGroup.Item>
        ))}

        {packages.map(pkg => (
          <ListGroup.Item key={pkg.packageReservationId}>
            {/* --- 3. MODIFY THE JSX FOR PACKAGES --- */}
            <Row className="align-items-center">
              <Col>
                <p className="fw-bold mb-0"><BoxSeam size={14} className="me-2"/>{pkg.packageName}</p>
                {pkg.motifHex && <Badge bg="light" text="dark" className="d-block my-1" style={{ width: 'fit-content' }}>{getMotifName(pkg.motifHex)}</Badge>}
                <small className="text-muted">Deposit: {formatCurrency(calculatePackageDeposit())}</small>
              </Col>
              <Col xs="auto" className="text-end">
                <p className="fw-bold mb-2">{formatCurrency(pkg.price)}</p>
                {/* --- ADD THE "VIEW DETAILS" BUTTON --- */}
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={() => onViewPackage(pkg)}
                >
                  <EyeFill className="me-1" /> View Details
                </Button>
              </Col>
            </Row>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
};