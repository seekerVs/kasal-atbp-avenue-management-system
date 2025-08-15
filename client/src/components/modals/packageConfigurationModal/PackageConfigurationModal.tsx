// client/src/components/modals/packageConfigurationModal/PackageConfigurationModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';

import { 
  Package, 
  FulfillmentPreview, 
  UnavailabilityRecord,
  InventoryItem,
  ItemVariation
} from '../../../types';
import api from '../../../services/api';
import { FulfillmentError, PackageFulfillmentForm } from '../../forms/packageFulfillmentForm/PackageFulfillmentForm';
import { SizeSelectionModal } from '../sizeSelectionModal/SizeSelectionModal';
import { useAlert } from '../../../contexts/AlertContext';

// This is the complete data object the modal will return on success
export interface PackageConfigurationData {
  packageReservation: FulfillmentPreview[]; // Pass the full preview
  packageAppointmentDate?: Date | null; // Pass the selected date
}

interface PackageConfigurationModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: PackageConfigurationData) => void;
  pkg: Package | null; // The selected package to configure
  motifHex: string;
  initialFulfillmentData?: FulfillmentPreview[];
}

export const PackageConfigurationModal: React.FC<PackageConfigurationModalProps> = ({ show, onHide, onSave, pkg, motifHex, initialFulfillmentData  }) => {
    // Main State
  const [fulfillmentData, setFulfillmentData] = useState<FulfillmentPreview[]>([]);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const {addAlert} = useAlert()

  // Data & Helper State
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Chained Modals State
  const [showSizeSelectionModal, setShowSizeSelectionModal] = useState(false);
  const [assignmentContext, setAssignmentContext] = useState<number | null>(null);
  const [itemForSizeChange, setItemForSizeChange] = useState<InventoryItem | null>(null);
  const [errors, setErrors] = useState<FulfillmentError[]>([]);
  

  const inventoryMap = useMemo(() => 
    new Map(allInventory.map(item => [item._id, item])), 
    [allInventory]
  );

  const enrichedFulfillmentData = useMemo(() => {
    return fulfillmentData.map(fulfill => {
      if (fulfill.assignedItemId && inventoryMap.has(fulfill.assignedItemId)) {
        const itemDetails = inventoryMap.get(fulfill.assignedItemId)!;
        const [colorName, size] = fulfill.variation?.split(', ') || [];

        const variationDetails = itemDetails.variations.find(
          v => v.color.name === colorName && v.size === size
        );

        // Return a new object shaped like PackageFulfillment for the form component
        return {
          ...fulfill,
          assignedItem: {
            itemId: itemDetails._id,
            name: itemDetails.name,
            variation: fulfill.variation,
            imageUrl: variationDetails?.imageUrl || itemDetails.variations[0]?.imageUrl,
          }
        };
      }
      // If not assigned or item not found, return it as is
      return fulfill;
    });
  }, [fulfillmentData, inventoryMap]);

  useEffect(() => {
    if (show && pkg) {
      setLoading(true);
      setErrors([]);

      Promise.all([
        api.get('/unavailability'),
        api.get('/inventory?limit=1000')
      ]).then(([unavailableRes, inventoryRes]) => {
        setUnavailableDates(unavailableRes.data.map((rec: UnavailabilityRecord) => new Date(rec.date)));
        setAllInventory(inventoryRes.data.items || []);

        // --- THIS IS THE NEW CONDITIONAL LOGIC ---
        if (initialFulfillmentData) {
          // EDIT MODE: Use the data passed in from the parent
          setFulfillmentData(initialFulfillmentData);
        } else {
          let defaultFulfillment: FulfillmentPreview[] = pkg.inclusions.flatMap(inclusion =>
            Array.from({ length: inclusion.wearerNum }, (_, i) => ({
              role: inclusion.wearerNum > 1 ? `${inclusion.name} ${i + 1}` : inclusion.name,
              isCustom: !!inclusion.isCustom,
              wearerName: ''
            }))
          );

          const selectedMotif = pkg.colorMotifs.find(m => m.motifHex === motifHex);

          if (selectedMotif) {
              selectedMotif.assignments.forEach(assignment => {
                  const targetSlots = defaultFulfillment.map((f, i) => ({...f, originalIndex: i}))
                                        .filter(f => f.role.startsWith(pkg.inclusions.find(inc => inc._id === assignment.inclusionId)?.name || ''));

                  assignment.assignedItems.forEach((assignedItem, wearerIndex) => {
                      if (assignedItem && targetSlots[wearerIndex]) {
                          const originalFulfillmentIndex = targetSlots[wearerIndex].originalIndex;
                          defaultFulfillment[originalFulfillmentIndex] = {
                              ...defaultFulfillment[originalFulfillmentIndex],
                              assignedItemId: assignedItem.itemId,
                              variation: `${assignedItem.color.name}, ${assignedItem.size}`
                          };
                      }
                  });
              });
          }
          setFulfillmentData(defaultFulfillment);
        }

      }).catch(err => {
        console.error("Failed to fetch data for configuration modal", err);
      }).finally(() => {
        setLoading(false);
      });
    } else {
      setFulfillmentData([]);
    }
  }, [show, pkg, motifHex, initialFulfillmentData]);
  
  const validate = (): boolean => {
    const newErrors: FulfillmentError[] = [];
    const hasCustomItems = fulfillmentData.some(f => f.isCustom);

    // Rule A: Check Wearer Names for all items
    fulfillmentData.forEach((fulfill, index) => {
      if (!fulfill.wearerName || fulfill.wearerName.trim() === '') {
        newErrors.push({
          index: index,
          field: 'wearerName',
          message: 'Wearer name is required.'
        });
      }
    });
    
    // Rule B: Check for Appointment Date if there are custom items
    if (hasCustomItems && !appointmentDate) {
      // For top-level errors like this, we'll use an alert.
      // The function still returns false to stop the submission.
      addAlert('An appointment date is required for packages with custom items.', 'danger');
    }

    // Rule C: Check for Notes on custom items
    fulfillmentData.forEach((fulfill, index) => {
      if (fulfill.isCustom && (!fulfill.notes || fulfill.notes.trim() === '')) {
        newErrors.push({
          index: index,
          field: 'notes',
          message: 'Notes are required for custom items.'
        });
      }
    });

    setErrors(newErrors);

    // The form is valid if the newErrors array is empty AND the appointment date is set correctly.
    const hasFieldErrors = newErrors.length > 0;
    const hasDateError = hasCustomItems && !appointmentDate;

    return !hasFieldErrors && !hasDateError;
  };
  
  const handleWearerNameChange = (index: number, name: string) => {
    setFulfillmentData(prev => prev.map((item, i) => i === index ? { ...item, wearerName: name } : item));
    
    // Real-time validation: If the user types a name, remove the error for that field.
    if (name.trim() !== '') {
      setErrors(prevErrors => prevErrors.filter(e => !(e.index === index && e.field === 'wearerName')));
    }
  };
  
  const handleOpenAssignmentModal = (index: number) => {
    const fulfillmentItem = fulfillmentData[index];
    if (!fulfillmentItem || !fulfillmentItem.assignedItemId) return;

    // Use the inventoryMap we created to find the full item details
    const inventoryItem = inventoryMap.get(fulfillmentItem.assignedItemId);
    if (inventoryItem) {
      setItemForSizeChange(inventoryItem); // Set the item for the modal
      setAssignmentContext(index);          // Keep track of which role we're editing
      setShowSizeSelectionModal(true);      // Open the new modal
    } else {
      console.error("Could not find item in inventory map for size change:", fulfillmentItem.assignedItemId);
    }
  };

  const handleSaveSizeSelection = (newVariation: ItemVariation) => {
    if (assignmentContext === null) return;

    setFulfillmentData(prev => {
        return prev.map((item, index) => {
            if (index === assignmentContext) {
                return {
                    ...item,
                    // Update the variation string with the new color name and size
                    variation: `${newVariation.color.name}, ${newVariation.size}`
                };
            }
            return item;
        });
    });

    // Close the modal and reset context
    setShowSizeSelectionModal(false);
    setAssignmentContext(null);
    setItemForSizeChange(null);
  };

  const handleAppointmentDateChange = (date: Date | null) => {
    setAppointmentDate(date);
  };
  
  const handleCustomItemNoteChange = (index: number, note: string) => {
    setFulfillmentData(prev => prev.map((item, i) => i === index ? { ...item, notes: note } : item));

    // Real-time validation for notes (only if you made them mandatory)
    if (note.trim() !== '') {
      setErrors(prevErrors => prevErrors.filter(e => !(e.index === index && e.field === 'notes')));
    }
  };

  // --- Main Action Button Logic ---
  const handleFinalSave = () => {
    // The first and only action is to run validation.
    // If it fails, the function stops here.
    if (!validate()) {
      return;
    }
    
    // If validation passes, proceed with the save logic.
    if (!pkg) return; // This check is for type safety.

    onSave({
      packageReservation: fulfillmentData,
      packageAppointmentDate: appointmentDate,
    });
    onHide();
  };
  
  if (!pkg) return null;

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Configure Package: {pkg.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <div className="text-center"><Spinner /></div>
          ) : (
            <PackageFulfillmentForm
              fulfillmentData={enrichedFulfillmentData}
              appointmentDate={appointmentDate}
              unavailableDates={unavailableDates}
              onWearerNameChange={handleWearerNameChange}
              onOpenSizeSelectionModal={handleOpenAssignmentModal}
              onAppointmentDateChange={handleAppointmentDateChange}
              onCustomItemNoteChange={handleCustomItemNoteChange}
              errors={errors} 
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleFinalSave}>
            Add to Reservation
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Chained Size Selection Modal */}
      {showSizeSelectionModal && itemForSizeChange && assignmentContext !== null && (
        <SizeSelectionModal
          show={showSizeSelectionModal}
          onHide={() => setShowSizeSelectionModal(false)}
          onSave={handleSaveSizeSelection}
          item={itemForSizeChange}
          // We parse the initial color from the existing variation string to pass it to the modal
          initialColor={{
            name: (enrichedFulfillmentData[assignmentContext] as any).assignedItem?.variation?.split(',')[0].trim() || '',
            hex: itemForSizeChange.variations.find(v => v.color.name === (enrichedFulfillmentData[assignmentContext] as any).assignedItem?.variation?.split(',')[0].trim())?.color.hex || '#000000'
          }}
        />
      )}
    </>
  );
};