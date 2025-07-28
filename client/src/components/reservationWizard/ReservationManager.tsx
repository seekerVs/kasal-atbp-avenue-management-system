// client/src/components/reservationWizard/ReservationManager.tsx

import React, { useState } from 'react';
import { Button, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { PatchCheckFill, BoxSeam, Scissors } from 'react-bootstrap-icons';
import { Reservation, FormErrors, PackageReservation, ItemReservation } from '../../types';
import { ReservationList } from '../booking/ReservationList'; // We can reuse this component
import { PackageSelectionData, PackageSelectionModal } from '../modals/packageSelectionModal/PackageSelectionModal';
import { SelectedItemData, SingleItemSelectionModal } from '../modals/singleItemSelectionModal/SingleItemSelectionModal';
import { useAlert } from '../../contexts/AlertContext';

type ReservationState = Omit<Reservation, '_id' | 'createdAt' | 'updatedAt' | 'status'>;

interface ReservationManagerProps {
  reservation: ReservationState;
  setReservation: React.Dispatch<React.SetStateAction<ReservationState>>;
  errors: FormErrors;
}

export const ReservationManager: React.FC<ReservationManagerProps> = ({ reservation, setReservation, errors }) => {
  const { addAlert } = useAlert();
  const [showPackageModal, setShowPackageModal] = useState(false);
  // We can add a state for the single item modal here as well for consistency
  const [showItemModal, setShowItemModal] = useState(false); 

  const handleRemoveItem = (idToRemove: string) => {
    setReservation(prev => ({
      ...prev,
      itemReservations: prev.itemReservations.filter(i => i.reservationId !== idToRemove),
    }));
  };

  const handleRemovePackage = (idToRemove: string) => {
    setReservation(prev => ({
      ...prev,
      packageReservations: prev.packageReservations.filter(p => p.packageReservationId !== idToRemove),
    }));
  };

  const handleAddPackage = (selection: PackageSelectionData) => {
    const { pkg, motif } = selection;
    const newPackageReservation: PackageReservation = {
      packageReservationId: `pkg_${Date.now()}`,
      packageId: pkg._id,
      packageName: pkg.name,
      price: pkg.price,
      motifName: motif,
      // Create the fulfillment preview based on the new inclusion structure
      fulfillmentPreview: pkg.inclusions.flatMap(inc => 
        Array.from({ length: inc.wearerNum }, (_, i) => ({
          role: inc.wearerNum > 1 ? `${inc.name} ${i + 1}` : inc.name,
          isCustom: !!inc.isCustom
        }))
      )
    };
    setReservation(prev => ({ ...prev, packageReservations: [...prev.packageReservations, newPackageReservation] }));
  };

  const handleAddItem = (selection: SelectedItemData) => {
    const { product, variation, quantity } = selection;
    const newItemReservation: ItemReservation = {
      reservationId: `item_${Date.now()}`,
      itemId: product._id,
      itemName: product.name,
      variation: {
        color: variation.color,
        size: variation.size,
      },
      quantity: quantity,
      price: product.price,
    };
    setReservation(prev => ({ ...prev, itemReservations: [...prev.itemReservations, newItemReservation] }));
  };
  
  return (
    <>
      {errors.reservations && <Alert variant="warning" className="small py-2">{errors.reservations}</Alert>}
      <Row className="g-4">
        <Col lg={4}>
          <h6 className="text-muted">ADD TO YOUR RESERVATION</h6>
          <hr className="mt-1 mb-3" />
          <div className="d-grid gap-3">
            <Button variant="danger" size="sm" onClick={() => setShowItemModal(true)}>
              <PatchCheckFill size={20} className="me-2" />
              Reserve Outfit
            </Button>
            <Button variant="outline-danger" size="sm" onClick={() => setShowPackageModal(true)}>
              <BoxSeam size={20} className="me-2" />
              Reserve Package
            </Button>
          </div>
        </Col>
        <Col lg={8}>
          <ReservationList
            itemReservations={reservation.itemReservations}
            packageReservations={reservation.packageReservations}
            appointments={[]} // Appointments are separate now, so pass an empty array
            onRemoveItem={handleRemoveItem}
            onRemovePackage={handleRemovePackage}
            onRemoveAppointment={() => {}} // No-op
          />
        </Col>
      </Row>
      <PackageSelectionModal
        show={showPackageModal}
        onHide={() => setShowPackageModal(false)}
        onSelect={handleAddPackage}
      />

      <SingleItemSelectionModal 
        show={showItemModal}
        onHide={() => setShowItemModal(false)}
        onSelect={handleAddItem}
        addAlert={addAlert}
        mode="rental"
      />
    </>
  );
};