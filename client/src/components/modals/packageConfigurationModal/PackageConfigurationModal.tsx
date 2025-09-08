import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';

import { 
  Package, 
  FulfillmentPreview, 
  UnavailabilityRecord,
  InventoryItem,
  ItemVariation,
  NormalizedFulfillmentItem
} from '../../../types';
import api from '../../../services/api';
import { FulfillmentError, PackageFulfillmentForm } from '../../forms/packageFulfillmentForm/PackageFulfillmentForm';
import { SizeSelectionModal } from '../sizeSelectionModal/SizeSelectionModal';
import { useAlert } from '../../../contexts/AlertContext';
import { format } from 'date-fns';

export interface PackageConfigurationData {
  packageReservation: FulfillmentPreview[];
  packageAppointment?: {
    date: Date | null;
    block: BlockType;
  };
}

interface PackageConfigurationModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: PackageConfigurationData) => void;
  pkg: Package | null;
  motifId: string;
  initialFulfillmentData?: FulfillmentPreview[];
}

type BlockType = 'morning' | 'afternoon' | '';

export const PackageConfigurationModal: React.FC<PackageConfigurationModalProps> = ({ show, onHide, onSave, pkg, motifId, initialFulfillmentData  }) => {
  const [fulfillmentData, setFulfillmentData] = useState<FulfillmentPreview[]>([]);
  const [appointment, setAppointment] = useState<{ date: Date | null; block: BlockType }>({ date: null, block: '' });
  const [selectedBlock, setSelectedBlock] = useState<BlockType>('');
  const {addAlert} = useAlert()
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSizeSelectionModal, setShowSizeSelectionModal] = useState(false);
  const [assignmentContext, setAssignmentContext] = useState<number | null>(null);
  const [itemForSizeChange, setItemForSizeChange] = useState<InventoryItem | null>(null);
  const [errors, setErrors] = useState<FulfillmentError[]>([]);
  
  const inventoryMap = useMemo(() => 
    new Map(allInventory.map(item => [item._id, item])), 
    [allInventory]
  );

  const normalizedDataForForm = useMemo((): NormalizedFulfillmentItem[] => {
    return fulfillmentData.map(fulfill => {
      let assignedItemDetails: NormalizedFulfillmentItem['assignedItem'] = {};
      if (typeof fulfill.assignedItemId === 'string' && inventoryMap.has(fulfill.assignedItemId)) {
        const item = inventoryMap.get(fulfill.assignedItemId)!;
        const variationDetails = item.variations.find(v => fulfill.variation?.includes(v.color.name) && fulfill.variation?.includes(v.size));
        assignedItemDetails = {
          itemId: item._id,
          name: item.name,
          variation: fulfill.variation,
          imageUrl: variationDetails?.imageUrl
        };
      }
      return {
        role: fulfill.role,
        wearerName: fulfill.wearerName,
        isCustom: fulfill.isCustom,
        notes: fulfill.notes,
        assignedItem: assignedItemDetails
      };
    });
  }, [fulfillmentData, inventoryMap]);

  useEffect(() => {
    if (show && pkg) {
      setLoading(true);
      setErrors([]);
      setSelectedBlock('');
      setAppointment({ date: null, block: '' });
      Promise.all([
        api.get('/unavailability'),
        api.get('/inventory?limit=1000')
      ]).then(([unavailableRes, inventoryRes]) => {
        setUnavailableDates(unavailableRes.data.map((rec: UnavailabilityRecord) => new Date(rec.date)));
        setAllInventory(inventoryRes.data.items || []);

        if (initialFulfillmentData) {
          setFulfillmentData(initialFulfillmentData);
        } else {
          let defaultFulfillment: FulfillmentPreview[] = pkg.inclusions.flatMap(inclusion =>
            Array.from({ length: inclusion.wearerNum }, (_, i) => ({
              role: inclusion.wearerNum > 1 ? `${inclusion.name} ${i + 1}` : inclusion.name,
              isCustom: !!inclusion.isCustom,
              wearerName: ''
            }))
          );
          const selectedMotif = pkg.colorMotifs.find(m => m._id === motifId);
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
  }, [show, pkg, motifId, initialFulfillmentData]);
  
  const validate = (): boolean => {
    const newErrors: FulfillmentError[] = [];
    const hasCustomItems = fulfillmentData.some(f => f.isCustom);
    fulfillmentData.forEach((fulfill, index) => {
      if (!fulfill.wearerName || fulfill.wearerName.trim() === '') {
        newErrors.push({ index, field: 'wearerName', message: 'Wearer name is required.' });
      }
    });
    if (hasCustomItems && !appointment.date) {
      addAlert('An appointment date is required for packages with custom items.', 'danger');
    } else if (hasCustomItems && !appointment.block) {
      addAlert('Please select a Morning or Afternoon block for the appointment.', 'danger');
    }
    fulfillmentData.forEach((fulfill, index) => {
      if (fulfill.isCustom && (!fulfill.notes || fulfill.notes.trim() === '')) {
        newErrors.push({ index, field: 'notes', message: 'Notes are required for custom items.' });
      }
    });
    setErrors(newErrors);
    const hasFieldErrors = newErrors.length > 0;
    const hasDateError = hasCustomItems && (!appointment.date || !appointment.block);
    return !hasFieldErrors && !hasDateError;
  };
  
  const handleWearerNameChange = (index: number, name: string) => {
    setFulfillmentData(prev => prev.map((item, i) => i === index ? { ...item, wearerName: name } : item));
    if (name.trim() !== '') {
      setErrors(prevErrors => prevErrors.filter(e => !(e.index === index && e.field === 'wearerName')));
    }
  };
  
  const handleOpenAssignmentModal = (index: number) => {
    const fulfillmentItem = fulfillmentData[index];
    if (!fulfillmentItem || typeof fulfillmentItem.assignedItemId !== 'string') return;

    const inventoryItem = inventoryMap.get(fulfillmentItem.assignedItemId);
    if (inventoryItem) {
      setItemForSizeChange(inventoryItem);
      setAssignmentContext(index);
      setShowSizeSelectionModal(true);
    } else {
      console.error("Could not find item in inventory map for size change:", fulfillmentItem.assignedItemId);
    }
  };

  const handleSaveSizeSelection = (newVariation: ItemVariation) => {
    if (assignmentContext === null) return;
    setFulfillmentData(prev => {
        return prev.map((item, index) => {
            if (index === assignmentContext) {
                return { ...item, variation: `${newVariation.color.name}, ${newVariation.size}` };
            }
            return item;
        });
    });
    setShowSizeSelectionModal(false);
    setAssignmentContext(null);
    setItemForSizeChange(null);
  };

  const handleAppointmentDateChange = (date: Date | null, block: BlockType) => {
    setAppointment({ date, block });
  };
  
  const handleCustomItemNoteChange = (index: number, note: string) => {
    setFulfillmentData(prev => prev.map((item, i) => i === index ? { ...item, notes: note } : item));
    if (note.trim() !== '') {
      setErrors(prevErrors => prevErrors.filter(e => !(e.index === index && e.field === 'notes')));
    }
  };

  const handleFinalSave = () => {
    if (!validate()) { return; }
    if (!pkg) return;
    onSave({ 
      packageReservation: fulfillmentData, 
      packageAppointment: appointment 
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
        <Modal.Body style={{maxHeight:'75vh', overflowY:'auto'}}>
          {loading ? (
            <div className="text-center"><Spinner /></div>
          ) : (
            // === MODIFICATION START: Pass the 'mode' prop ===
            <PackageFulfillmentForm
              mode="reservation"
              fulfillmentData={normalizedDataForForm}
              appointmentDate={appointment.date}
              selectedBlock={appointment.block}
              unavailableDates={unavailableDates}
              onWearerNameChange={handleWearerNameChange}
              onOpenSizeSelectionModal={handleOpenAssignmentModal}
              onAppointmentDateChange={handleAppointmentDateChange}
              onCustomItemNoteChange={handleCustomItemNoteChange}
              errors={errors} 
            />
            // === MODIFICATION END ===
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" onClick={handleFinalSave}>Add to Reservation</Button>
        </Modal.Footer>
      </Modal>

      {showSizeSelectionModal && itemForSizeChange && assignmentContext !== null && (() => {
        // 1. Get the specific fulfillment item the user is editing.
        const fulfillmentItem = fulfillmentData[assignmentContext];
        if (!fulfillmentItem) return null;

        // 2. Extract the color name from the 'variation' string (e.g., "Red, M").
        const colorName = fulfillmentItem.variation?.split(',')[0].trim() || '';

        // 3. Find the corresponding variation in the full item data to get the hex code.
        const variationDetails = itemForSizeChange.variations.find(v => v.color.name === colorName);
        const colorHex = variationDetails?.color.hex || '#000000';

        // 4. Pass the derived name and hex to the modal.
        return (
          <SizeSelectionModal
            show={showSizeSelectionModal}
            onHide={() => setShowSizeSelectionModal(false)}
            onSave={handleSaveSizeSelection}
            item={itemForSizeChange}
            initialColor={{
              name: colorName,
              hex: colorHex,
            }}
          />
        );
      })()}
    </>
  );
};