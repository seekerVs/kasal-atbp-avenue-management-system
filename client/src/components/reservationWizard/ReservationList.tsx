import React from 'react';
import { ListGroup, Button, Badge, Image } from 'react-bootstrap';
import { PencilSquare, XCircleFill } from 'react-bootstrap-icons';
import { ItemReservation, PackageReservation } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import namer from 'color-namer'; 

interface ReservationListProps {
  itemReservations: ItemReservation[];
  packageReservations: PackageReservation[];
  onRemoveItem: (id: string) => void;
  onEditItem: (id: string) => void;
  onRemovePackage: (id: string) => void;
  onEditPackage: (id: string) => void;
}

export const ReservationList: React.FC<ReservationListProps> = ({ itemReservations, packageReservations, onRemoveItem, onEditItem, onRemovePackage, onEditPackage }) => {
  const hasReservations = itemReservations.length > 0 || packageReservations.length > 0;

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
    <div>
      <h6 className="text-muted">Current Selections</h6>
      <hr className="mt-1" />
      {hasReservations ? (
        <ListGroup variant="flush">
          {itemReservations.map(item => (
            <ListGroup.Item key={item.reservationId} className="ps-0">
              <div className="d-flex align-items-center">
                {/* Image Column */}
                <Image 
                  src={item.imageUrl || 'https://placehold.co/60x60/e9ecef/adb5bd?text=N/A'} 
                  rounded 
                  style={{ width: '60px', height: '60px', objectFit: 'cover', marginRight: '1rem' }} 
                />
                {/* Details Column */}
                <div className="flex-grow-1">
                  <p className="fw-bold mb-0">{item.itemName}</p>
                  <div className="mb-1">
                    <Badge bg="light" text="dark" className="me-2">
                      {item.variation.color.name}, {item.variation.size}
                    </Badge>
                    <small className="text-muted">× {item.quantity}</small>
                  </div>
                  <p className="fw-bold mb-0">₱{formatCurrency(item.price * item.quantity)}</p>
                </div>
                {/* Actions Column */}
                <div className="text-end ms-2 align-self-center">
                  <Button variant="link" className="text-primary p-0 me-2" onClick={() => onEditItem(item.reservationId)}>
                    <PencilSquare size={18}/>
                  </Button>
                  <Button variant="link" className="text-danger p-0" onClick={() => onRemoveItem(item.reservationId)}>
                    <XCircleFill size={18}/>
                  </Button>
                </div>
              </div>
            </ListGroup.Item>
          ))}
          {packageReservations.map(pkg => (
            <ListGroup.Item key={pkg.packageReservationId} className="ps-0">
              <div className="d-flex align-items-center">
                {/* Image Column */}
                <Image 
                  src={pkg.imageUrl || 'https://placehold.co/60x60/e9ecef/adb5bd?text=N/A'} 
                  rounded 
                  style={{ width: '60px', height: '60px', objectFit: 'cover', marginRight: '1rem' }} 
                />
                {/* Details Column */}
                <div className="flex-grow-1">
                  <p className="fw-bold mb-0">{pkg.packageName}</p>
                  <div className="mb-1">
                    {pkg.motifHex && <Badge bg="light" text="dark">{getMotifName(pkg.motifHex)}</Badge>}
                  </div>
                  <p className="fw-bold mb-0">₱{formatCurrency(pkg.price)}</p>
                </div>
                {/* Actions Column */}
                <div className="text-end ms-2 align-self-center">
                  <Button variant="link" className="text-primary p-0 me-2" onClick={() => onEditPackage(pkg.packageReservationId)}>
                    <PencilSquare size={18}/>
                  </Button>
                  <Button variant="link" className="text-danger p-0" onClick={() => onRemovePackage(pkg.packageReservationId)}>
                    <XCircleFill size={18}/>
                  </Button>
                </div>
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