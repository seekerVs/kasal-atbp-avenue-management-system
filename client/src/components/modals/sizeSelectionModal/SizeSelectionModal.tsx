// client/src/components/modals/sizeSelectionModal/SizeSelectionModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { InventoryItem, ItemVariation } from '../../../types';
import { DetailView } from '../singleItemSelectionModal/DetailView'; // Reusing the DetailView

interface SizeSelectionModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (selectedVariation: ItemVariation) => void;
  item: InventoryItem;
  // The color is fixed, so we pass the full color object to pre-select it
  initialColor: {
    name: string;
    hex: string;
  };
}

export const SizeSelectionModal: React.FC<SizeSelectionModalProps> = ({
  show,
  onHide,
  onSave,
  item,
  initialColor
}) => {
  // This modal manages its own 'selectedVariation' state
  const [selectedVariation, setSelectedVariation] = useState<ItemVariation | null>(null);

  // When the modal opens or the item changes, set the initial selected variation
  useEffect(() => {
    if (show && item && initialColor) {
      // Find the first available variation that matches the pre-selected color
      const firstAvailable = item.variations.find(
        v => v.color.hex === initialColor.hex && v.quantity > 0
      );
      setSelectedVariation(firstAvailable || null);
    }
  }, [show, item, initialColor]);

  const handleSave = () => {
    if (selectedVariation) {
      onSave(selectedVariation);
      onHide();
    }
  };

  // The sizes to display are all variations that match the initial, fixed color
  const availableSizesForDisplay = item.variations.filter(
    v => v.color.hex === initialColor.hex
  );

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Change Size for: {item.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{maxHeight:"75vh", overflowY:'auto'}}>
        <DetailView
          item={item}
          // --- Configure DetailView for "size-only" mode ---
          mode="size-only" 
          selectedVariation={selectedVariation}
          onVariationChange={setSelectedVariation}
          // Quantity is not used in this mode, so we pass dummy values/handlers
          quantity={1}
          onQuantityChange={() => {}} 
          // All colors will be disabled since the initial color is fixed
          isColorSelectionDisabled={() => true} 
          availableSizesForDisplay={availableSizesForDisplay}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!selectedVariation}>
          Confirm Size
        </Button>
      </Modal.Footer>
    </Modal>
  );
};