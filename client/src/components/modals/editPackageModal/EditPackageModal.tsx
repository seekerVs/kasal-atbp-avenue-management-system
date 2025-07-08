import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Row, Col, ListGroup, Badge, Dropdown, ButtonGroup } from 'react-bootstrap'; // <-- NEW: Import Dropdown, ButtonGroup
import { RentedPackage, PackageFulfillment, InventoryItem, FulfillmentItem, CustomTailoringItem, MeasurementRef, Package } from '../../../types';
import AssignmentSubModal from '../assignmentSubModal/AssignmentSubModal';
import CreateEditCustomItemModal from '../createEditCustomItemModal/CreateEditCustomItemModal'; 
import { PencilSquare, PlusCircle } from 'react-bootstrap-icons';
import api from '../../../services/api';

interface EditPackageModalProps {
  show: boolean;
  onHide: () => void;
  pkg: RentedPackage;             // Use the new RentedPackage type
  inventory: InventoryItem[];       // Use the correct InventoryItem type
  onSave: (pkgName: string, updatedFulfillment: PackageFulfillment[]) => void;
  allPackages: Package[];           // Use the global Package type for the templates
  customItems: CustomTailoringItem[];
}

const EditPackageModal: React.FC<EditPackageModalProps> = ({ show, onHide, pkg, inventory, onSave, allPackages, customItems }) => {
  const [fulfillment, setFulfillment] = useState<PackageFulfillment[]>([]);
  // State for the inventory assignment sub-modal
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [invAssignmentIndex, setInvAssignmentIndex] = useState<number | null>(null);
  
  // --- NEW STATE for the custom item creation/edit flow ---
  const [measurementRefs, setMeasurementRefs] = useState<MeasurementRef[]>([]);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemContext, setCustomItemContext] = useState<{ index: number; item: CustomTailoringItem | null; itemName: string } | null>(null);
  

  useEffect(() => {
    const fetchMeasurementRefs = async () => {
      try {
        const res = await api.get('/measurementrefs');
        setMeasurementRefs(res.data || []);
      } catch (err) {
        console.error("Failed to fetch measurement refs", err);
      }
    };

    if (show) {
      fetchMeasurementRefs();
    }
  }, [show]);

  useEffect(() => {
    if (pkg && customItems) {
      const customItemMap = new Map(customItems.map(item => [item.name, item]));
      const enrichedFulfillment = (pkg.packageFulfillment || []).map(fulfillItem => {
        const assigned = fulfillItem.assignedItem;

        if (fulfillItem.isCustom && assigned && !('itemId' in assigned)) {
          const fullCustomData = customItemMap.get(assigned.name || '');
          
          if (fullCustomData) {
            return {
              ...fulfillItem,
              assignedItem: fullCustomData,
            };
          }
        }
        
        return fulfillItem;
      });

      setFulfillment(enrichedFulfillment);
    }
  }, [pkg, customItems]);

  const handleWearerNameChange = (index: number, name: string) => {
    const updatedFulfillment = [...fulfillment];
    if (!updatedFulfillment[index]) return;
    updatedFulfillment[index].wearerName = name;
    setFulfillment(updatedFulfillment);
  };

  const packageTemplate = useMemo(() => {
        if (!allPackages || !pkg) return null;
        // The pkg.name from the rental is like "Package Name,Motif Name"
        const basePackageName = pkg.name.split(',')[0];
        return allPackages.find(p => p.name === basePackageName);
    }, [allPackages, pkg]);

  const handleOpenInventoryAssignment = (index: number) => {
    setInvAssignmentIndex(index);
    setShowAssignmentModal(true);
  };

  const handleAssignFromInventory = (data: { itemId: string; name: string; variation: string; imageUrl: string }) => {
    if (invAssignmentIndex  === null) return;
    
    const updatedFulfillment = [...fulfillment];
    if (!updatedFulfillment[invAssignmentIndex ]) return;
    
    const newAssignedItem: FulfillmentItem = {
      itemId: data.itemId,
      name: data.name,
      variation: data.variation,
      imageUrl: data.imageUrl,
    };

    updatedFulfillment[invAssignmentIndex ].assignedItem = newAssignedItem;
    setFulfillment(updatedFulfillment);
    setShowAssignmentModal(false);
  };

    // --- NEW HANDLERS for the custom item flow ---
  const handleOpenCustomItemModal = (index: number) => {
    const fulfillItem = fulfillment[index];
    const assigned = fulfillItem.assignedItem;
    
    // Check if there's already custom data attached. If so, it's an "edit".
    const existingData = (assigned && 'outfitCategory' in assigned) ? assigned : null;
    const itemName = `${pkg.name.split(',')[0]}: ${fulfillItem.role}`;
    
    setCustomItemContext({ index, item: existingData, itemName });
    setShowCustomItemModal(true);
  };

  const handleSaveCustomItem = (updatedItem: CustomTailoringItem) => {
    if (customItemContext === null) return;
    const { index } = customItemContext;

    const newFulfillmentData = [...fulfillment];
    // Place the entire gathered custom item object into the assignedItem slot
    newFulfillmentData[index].assignedItem = updatedItem;
    setFulfillment(newFulfillmentData);
    
  };


  const handleSaveChanges = () => {
    onSave(pkg.name, fulfillment);
    onHide();
  };

  if (!pkg) return null;
  
  const itemToPreselect = invAssignmentIndex !== null ? fulfillment[invAssignmentIndex]?.assignedItem : null;
  
  // --- THIS IS THE FIX ---
  // // Prepare props for the modal in a type-safe way.
    let preselectedItemIdForModal: string | undefined = undefined;
    let preselectedVariationForModal: string | undefined = undefined;

    // Use a type guard to check if the preselected item is an inventory item.
    if (itemToPreselect && 'itemId' in itemToPreselect) {
        // Inside this block, TypeScript knows itemToPreselect is a FulfillmentItem.
        preselectedItemIdForModal = itemToPreselect.itemId;
        preselectedVariationForModal = itemToPreselect.variation;
    }
    // ----------------------------------------------------

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Edit Package Fulfillment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h4>{pkg.name.split(',')[0]}</h4>
          <p className="text-muted">Edit wearer names and assign items for each role in this package.</p>
          <ListGroup>
            {fulfillment.map((fulfillItem, index) => {

                // Find the original definition for this role in the package template.
                const roleInTemplate = packageTemplate?.colorMotifs
                    .flatMap(m => m.assignments) // Get all assignments from all motifs
                    .find(a => a.role === fulfillItem.role);

                // The source of truth is now the template, not the rental data.
                const isDesignatedAsCustom = roleInTemplate?.isCustom === true;

                // 1. Define clear, robust flags for each possible state.
                const assignedItem = fulfillItem.assignedItem;
                const isCustomSlot = fulfillItem.isCustom === true; // Check the role's designated type
                const hasWearerName = !!fulfillItem.wearerName?.trim();

                // An inventory item is fully assigned if it has an ID and a selected variation.
                const hasInventoryItem = assignedItem && 'itemId' in assignedItem && !!(assignedItem as any).variation;

                // A custom slot has its data gathered if the modal has been filled out.
                const hasCustomData = isDesignatedAsCustom && fulfillItem.assignedItem && 'outfitCategory' in fulfillItem.assignedItem;


                // 2. A helper function to determine the precise status based on the flags.
                const getStatus = (): { text: string; variant: 'success' | 'info' | 'warning' | 'danger' } => {
                    // Case 1: A standard inventory item is assigned.
                    if (hasInventoryItem) {
                        return hasWearerName 
                            ? { text: 'Complete', variant: 'success' } 
                            : { text: 'No Wearer Name', variant: 'warning' };
                    }

                    // Case 2: This role is designated as a custom slot.
                    if (isCustomSlot) {
                        if (hasCustomData) {
                            // The custom item details have been filled out.
                            return hasWearerName
                                ? { text: 'Details Saved', variant: 'success' }
                                : { text: 'No Wearer Name', variant: 'warning' };
                        } else {
                            // It's a custom slot, but needs details from the modal.
                            return { text: 'No Custom Details', variant: 'info' };
                        }
                    }
                    
                    // Default Case: It's a standard inventory slot with nothing assigned.
                    return { text: 'No Assignment', variant: 'danger' };
                };

                // 3. Get the final text and color for the badge.
                const { text: statusText, variant: statusVariant } = getStatus();

                return (
                    <ListGroup.Item key={index} className="py-3">
                        <Row className="align-items-center">
                            <Col>
                                <Form.Label htmlFor={`wearer-name-${index}`} className="fw-bold">{fulfillItem.role}</Form.Label>
                                <Form.Control
                                    id={`wearer-name-${index}`}
                                    type="text"
                                    placeholder="Enter wearer's name"
                                    value={fulfillItem.wearerName || ''}
                                    onChange={(e) => handleWearerNameChange(index, e.target.value)}
                                />
                            </Col>
                            <Col md={5}>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <Form.Label className="small text-muted mb-0">Assigned Item</Form.Label>
                                    <Badge bg={statusVariant} pill>{statusText}</Badge>
                                </div>

                                {/* This JSX can now safely use the boolean flags */}
                                {hasInventoryItem && assignedItem ? (
                                    <div>
                                        <p className="mb-0 fw-bold">{assignedItem.name}</p>
                                        <p className="small text-muted mb-0">{(assignedItem as any).variation}</p>
                                    </div>
                                ) : hasCustomData  && assignedItem ? (
                                    <div>
                                        <p className="mb-0 fw-bold">{assignedItem.name}</p>
                                        <p className="small text-primary mb-0 fst-italic">To be custom-made</p>
                                    </div>
                                ) : (
                                    <div className="text-muted fst-italic pt-2">No item assigned</div>
                                )}
                            </Col>
                            <Col md="auto" className="text-end">
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    // --- REPLACE THE ONCLICK HANDLER WITH THIS ---
                                    onClick={() => {
                                        // This is the smart logic.
                                        // It checks the designated type of the role.
                                        if (isDesignatedAsCustom) {
                                            // If it's a custom role, open the custom item modal.
                                            handleOpenCustomItemModal(index);
                                        } else {
                                            // Otherwise, open the standard inventory assignment modal.
                                            handleOpenInventoryAssignment(index);
                                        }
                                    }}
                                >
                                    <PencilSquare className="me-1" />
                                    {/* This logic for the button text can remain */}
                                    {(hasInventoryItem || hasCustomData) ? 'Change' : 'Assign'}
                                </Button>
                            </Col>
                        </Row>
                    </ListGroup.Item>
                );
            })}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveChanges}>Save Changes</Button>
        </Modal.Footer>
      </Modal>

      {showCustomItemModal && customItemContext && (
            <CreateEditCustomItemModal
                show={showCustomItemModal}
                onHide={() => {
                    setShowCustomItemModal(false);
                    setCustomItemContext(null); // Reset context when modal hides
                }}
                item={customItemContext.item}
                itemName={customItemContext.itemName}
                measurementRefs={measurementRefs}
                onSave={handleSaveCustomItem}
            />
        )}

      <AssignmentSubModal
        show={showAssignmentModal}
        onHide={() => setShowAssignmentModal(false)}
        inventory={inventory}
        onAssign={handleAssignFromInventory}
        preselectedItemId={preselectedItemIdForModal}
        preselectedVariation={preselectedVariationForModal}
      />
    </>
  );
};

export default EditPackageModal;