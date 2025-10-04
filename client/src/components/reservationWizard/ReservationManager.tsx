// client/src/components/reservationWizard/ReservationManager.tsx

import React, { useEffect, useState } from 'react';
import { Button, Row, Col } from 'react-bootstrap';
import { PatchCheckFill, BoxSeam } from 'react-bootstrap-icons';
import { ItemReservation, Package, Reservation, FulfillmentPreview } from '../../types';
import { ReservationList } from './ReservationList'; // We can reuse this component
import { PackageSelectionData, PackageSelectionModal } from '../modals/packageSelectionModal/PackageSelectionModal';
import { SelectedItemData, SingleItemSelectionModal } from '../modals/singleItemSelectionModal/SingleItemSelectionModal';
import { PackageConfigurationData, PackageConfigurationModal } from '../modals/packageConfigurationModal/PackageConfigurationModal';
import api from '../../services/api';

type ReservationState = Omit<Reservation, '_id' | 'createdAt' | 'updatedAt' | 'status'>;

interface ReservationManagerProps {
  reservation: ReservationState;
  setReservation: React.Dispatch<React.SetStateAction<ReservationState>>;
  addAlert: (message: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  onSavePackageConfig: (config: PackageConfigurationData, pkg: Package, motifId: string, editingId: string | null) => void;
}

export const ReservationManager: React.FC<ReservationManagerProps> = ({ reservation, setReservation, addAlert, onSavePackageConfig }) => {
  const [showPackageModal, setShowPackageModal] = useState(false);
  // We can add a state for the single item modal here as well for consistency
  const [showItemModal, setShowItemModal] = useState(false); 
  const [allPackages, setAllPackages] = useState<Package[]>([]);  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [packageToConfigure, setPackageToConfigure] = useState<Package | null>(null);
  const [motifToConfigure, setMotifToConfigure] = useState<string>('');
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemToEdit, setItemToEdit] = useState<ItemReservation | null>(null);
  const [fulfillmentToEdit, setFulfillmentToEdit] = useState<FulfillmentPreview[] | undefined>(undefined);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await api.get('/packages');
        setAllPackages(res.data || []);
      } catch (err) {
        console.error("Failed to fetch package templates", err);
        addAlert('Could not load package data for editing.', 'danger');
      }
    };
    fetchPackages();
  }, [addAlert]);

  const handleOpenPackageEditor = (packageReservationId: string) => {
    // 1. Find the specific package reservation instance from the current state
    const packageToEdit = reservation.packageReservations.find(
      p => p.packageReservationId === packageReservationId
    );

    if (!packageToEdit) {
      console.error("Could not find package to edit in the current reservation.");
      return;
    }

    // 2. Find the original package template from allPackages
    const packageTemplate = allPackages.find(p => p._id === packageToEdit.packageId);

    if (!packageTemplate) {
      console.error("Could not find the original package template.");
      addAlert('Error: The original package template could not be found.', 'danger');
      return;
    }

    // 3. Set the state needed to open the configuration modal in "edit" mode
    setEditingPackageId(packageReservationId); // <-- Set the ID for edit mode
    setPackageToConfigure(packageTemplate);    // <-- The template to configure
    setMotifToConfigure(packageToEdit.motifHex || ''); // <-- The selected motif
    setFulfillmentToEdit(packageToEdit.fulfillmentPreview);
    
    // 4. Open the modal
    setShowConfigModal(true);
  };

  const handleOpenItemEditor = (reservationId: string) => {
    // 1. Find the item to edit from the main reservation state
    const item = reservation.itemReservations.find(
      i => i.reservationId === reservationId
    );

    if (item) {
      // 2. Set the context for both editing and pre-selection
      setEditingItemId(reservationId);
      setItemToEdit(item);
      
      // 3. Open the modal
      setShowItemModal(true);
    } else {
      console.error("Could not find item to edit in the current reservation.");
    }
  };

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
    // 1. Find the motif object using the new motifId
    const selectedMotif = selection.pkg.colorMotifs.find(m => m._id === selection.motifId);
    
    if (!selectedMotif) {
        addAlert("Selected motif could not be found.", "danger");
        return;
    }

    // 2. Store the data needed for the configuration modal
    setPackageToConfigure(selection.pkg);
    setMotifToConfigure(selectedMotif._id || ''); // <-- Pass the motif ID
    
    // 3. Close the first modal and open the second
    setShowPackageModal(false);
    setShowConfigModal(true);
  };

  const handleSaveConfiguration = (config: PackageConfigurationData) => {
    if (!packageToConfigure) return;
    onSavePackageConfig(config, packageToConfigure, motifToConfigure, editingPackageId);
    
    // Clean up local state
    setShowConfigModal(false);
    setPackageToConfigure(null);
    setMotifToConfigure('');
    setEditingPackageId(null);
    setFulfillmentToEdit(undefined);
  };

  const handleAddItem = (selection: SelectedItemData) => {
    const { product, variation, quantity } = selection;

    setReservation(prev => {
      const updatedItems = [...prev.itemReservations];

      if (editingItemId) {
        // --- EDIT MODE (This was already correct, but let's review) ---
        const indexToUpdate = updatedItems.findIndex(
          item => item.reservationId === editingItemId
        );

        if (indexToUpdate > -1) {
          // Create a new object for the updated item
          const updatedItem = {
            ...updatedItems[indexToUpdate], // Copy existing properties
            itemId: product._id, // Update with new data
            itemName: product.name,
            variation: {
              color: variation.color,
              size: variation.size,
            },
            quantity: quantity,
            price: product.price,
            imageUrl: variation.imageUrls[0],
          };
          // Replace the old object with the new one
          updatedItems[indexToUpdate] = updatedItem;
        }
      } else {
        // --- CREATE MODE ---
        const existingItemIndex = updatedItems.findIndex(
          item => item.itemId === product._id && 
                  item.variation.color.hex === variation.color.hex &&
                  item.variation.size === variation.size
        );

        if (existingItemIndex > -1) {
          // 1. Create a new object by copying the existing item's properties.
          const updatedItem = {
            ...updatedItems[existingItemIndex],
            // 2. Calculate the new quantity based on the old one.
            quantity: updatedItems[existingItemIndex].quantity + quantity,
          };
          // 3. Replace the old object in the array with our new, updated one.
          updatedItems[existingItemIndex] = updatedItem;

        } else {
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
            imageUrl: variation.imageUrls[0],
          };
          updatedItems.push(newItemReservation);
        }
      }

      return { ...prev, itemReservations: updatedItems };
    });

    setShowItemModal(false);
    setEditingItemId(null);
    setItemToEdit(null);
  };
  
  return (
    <>
      <Row className="g-4">
        <Col lg={4}>
          <h6 className="text-muted">ADD TO YOUR RESERVATION</h6>
          <hr className="mt-1 mb-3" />
          <div className="d-grid gap-3">
            <Button variant="outline-primary" size="sm" onClick={() => setShowItemModal(true)}>
              <PatchCheckFill size={20} className="me-2" />
              Reserve Outfit
            </Button>
            <Button variant="outline-primary" size="sm" onClick={() => setShowPackageModal(true)}>
              <BoxSeam size={20} className="me-2" />
              Reserve Package
            </Button>
          </div>
        </Col>
        <Col lg={8}>
          <ReservationList
            itemReservations={reservation.itemReservations}
            packageReservations={reservation.packageReservations}
            onRemoveItem={handleRemoveItem}
            onEditItem={handleOpenItemEditor} 
            onEditPackage={handleOpenPackageEditor}
            onRemovePackage={handleRemovePackage}
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
        onHide={() => {
          setShowItemModal(false);
          setEditingItemId(null);
          setItemToEdit(null);
        }}
        onSelect={handleAddItem}
        addAlert={addAlert}
        mode="rental"
        preselectedItemId={itemToEdit?.itemId}
        preselectedVariation={`${itemToEdit?.variation.color.name}, ${itemToEdit?.variation.size}`}
      />

      <PackageConfigurationModal
        show={showConfigModal}
        onHide={() => setShowConfigModal(false)}
        onSave={handleSaveConfiguration}
        pkg={packageToConfigure}
        motifId={motifToConfigure}
        initialFulfillmentData={fulfillmentToEdit}
      />
    </>
  );
};