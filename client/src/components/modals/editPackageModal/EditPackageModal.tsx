import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Row, Col, ListGroup, Badge } from 'react-bootstrap';
import { RentedPackage, PackageFulfillment, InventoryItem, FulfillmentItem, CustomTailoringItem, MeasurementRef, Package } from '../../../types';
import AssignmentSubModal from '../assignmentSubModal/AssignmentSubModal';
import CreateEditCustomItemModal from '../createEditCustomItemModal/CreateEditCustomItemModal'; 
import { PencilSquare, PlusCircle, Trash } from 'react-bootstrap-icons';
import api from '../../../services/api';

interface EditPackageModalProps {
  show: boolean;
  onHide: () => void;
  pkg: RentedPackage;             // Use the new RentedPackage type
  inventory: InventoryItem[];       // Use the correct InventoryItem type
  onSave: (updatedFulfillment: PackageFulfillment[], updatedCustomItems: CustomTailoringItem[]) => void;
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

    fetchMeasurementRefs();
  }, []);

  useEffect(() => {
    // This effect runs when the modal is shown or the props change.
    if (pkg && customItems && inventory) {
      // 1. Create a Map for efficient lookups of custom items.
      const customItemMap = new Map(customItems.map(item => [item._id, item]));
      // 2. Create a Map for efficient lookups of inventory items.
      const inventoryMap = new Map(inventory.map(item => [item._id, item]));

      // 3. Enrich the fulfillment data so the state has all the info it needs for rendering.
      const enrichedFulfillment = (pkg.packageFulfillment || []).map(fulfillItem => {
        const assigned = fulfillItem.assignedItem;

        // If there's no assignment with an ID, just return the item as is.
        if (!assigned || !('itemId' in assigned) || !assigned.itemId) {
          return fulfillItem;
        }

        // Case A: Handle custom items.
        if (fulfillItem.isCustom) {
          const fullCustomData = customItemMap.get(assigned.itemId);
          if (fullCustomData) {
            return { ...fulfillItem, assignedItem: fullCustomData };
          }
        } 
        // Case B: Handle standard inventory items.
        else {
          const fullInventoryData = inventoryMap.get(assigned.itemId);
          if (fullInventoryData) {
            // Find the specific variation image, or use the first one as a fallback.
            const variationDetails = fullInventoryData.variations.find(v => `${v.color}, ${v.size}` === assigned.variation);
            
            return {
              ...fulfillItem,
              assignedItem: {
                ...assigned, // Keep existing itemId and variation
                name: fullInventoryData.name, // Add the missing name
                imageUrl: variationDetails?.imageUrl || fullInventoryData.variations[0]?.imageUrl, // Add the missing image
              },
            };
          }
        }
        
        // Fallback for any other case (e.g., item not found).
        return fulfillItem;
      });

      // 4. Set the component's state with this fully enriched data.
      setFulfillment(enrichedFulfillment);
    }
  }, [pkg, customItems, inventory]); // IMPORTANT: Add inventory to the dependency array

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
    // 1. GATHER ALL MODIFIED CUSTOM ITEMS
    // Create an array to hold the full data of any custom items that were edited.
    const updatedCustomItems: CustomTailoringItem[] = [];
    
    // Iterate through the modal's current fulfillment state.
    fulfillment.forEach(fulfillItem => {
        const assigned = fulfillItem.assignedItem;
        
        // Find any role that is custom AND has a full CustomTailoringItem object attached.
        // This object would have been placed here by the CreateEditCustomItemModal's onSave handler.
        if (fulfillItem.isCustom && assigned && 'outfitCategory' in assigned) {
            // Add the full custom item object to our list.
            updatedCustomItems.push(assigned as CustomTailoringItem);
        }
    });

    // 2. "CLEAN" THE FULFILLMENT DATA FOR THE DATABASE
    // Create the database-ready fulfillment array that uses ID references.
    const cleanedFulfillment = fulfillment.map(fulfillItem => {
        const assigned = fulfillItem.assignedItem;

        // Find the same custom items we identified above.
        if (fulfillItem.isCustom && assigned && 'outfitCategory' in assigned) {
            // Transform the enriched object back into a simple ID reference.
            return {
                ...fulfillItem,
                assignedItem: {
                    itemId: (assigned as CustomTailoringItem)._id 
                }
            };
        }
        
        // If it's a standard inventory item or an unassigned role, its structure is already correct.
        return fulfillItem;
    });

    // 3. SEND BOTH PIECES OF DATA TO THE PARENT COMPONENT
    // The onSave prop now expects two arguments as per our updated interface.
    onSave(cleanedFulfillment, updatedCustomItems);
    
    // Close the modal.
    onHide();
  };

  const handleClearAssignment = (index: number) => {
    const updatedFulfillment = [...fulfillment];
    if (!updatedFulfillment[index]) return;

    // Reset the assignedItem to an empty object
    updatedFulfillment[index].assignedItem = {};
    setFulfillment(updatedFulfillment);
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
          <div style={{ maxHeight: '55vh', overflowY: 'auto' }} className="pe-2">
            <ListGroup className="list-group-flush">
              {fulfillment.map((fulfillItem, index) => {
                  // Find the original definition for this role in the package template.
                  const roleInTemplate = packageTemplate?.colorMotifs
                      .flatMap(m => m.assignments) // Get all assignments from all motifs
                      .find(a => a.role === fulfillItem.role);
                  // The source of truth is now the template, not the rental data.
                  const isDesignatedAsCustom = roleInTemplate?.isCustom === true;
                  // 1. --- THIS IS THE FIX: More granular flags ---
                  const assignedItem = fulfillItem.assignedItem;
                  const isCustomSlot = fulfillItem.isCustom === true;
                  const hasWearerName = !!fulfillItem.wearerName?.trim();
                  // Flag 1: Is an inventory item linked AT ALL (even without variation)?
                  const isLinkedToItem = assignedItem && 'itemId' in assignedItem && !!assignedItem.itemId;
                  // Flag 2: Is the inventory item fully assigned WITH a variation?
                  const isFullyAssigned = isLinkedToItem && !!(assignedItem as any).variation;
                  // Flag 3: Does a custom slot have its data filled out?
                  const hasCustomData = isDesignatedAsCustom && assignedItem && 'outfitCategory' in assignedItem;
                  // 2. A helper function to determine the precise status based on the flags.
                  const getStatus = (): { text: string; variant: 'success' | 'info' | 'warning' | 'danger' } => {
                    // Case 1: It's an inventory item slot.
                    if (!isCustomSlot) {
                      if (isFullyAssigned) {
                        return hasWearerName ? { text: 'Complete', variant: 'success' } : { text: 'No Wearer Name', variant: 'warning' };
                      }
                      if (isLinkedToItem) {
                        return { text: 'Needs Variation', variant: 'info' };
                      }
                      return { text: 'No Assignment', variant: 'danger' };
                    }
            
                    // Case 2: It's a custom item slot.
                    if (isCustomSlot) {
                      if (hasCustomData) {
                        return hasWearerName ? { text: 'Complete', variant: 'success' } : { text: 'No Wearer Name', variant: 'warning' };
                      }
                      return { text: 'No Custom Details', variant: 'info' };
                    }
            
                    // Fallback
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
                                  {isLinkedToItem && !isCustomSlot && assignedItem ? (
                                      <div>
                                          <p className="mb-0 fw-bold">{assignedItem.name}</p>
                                          <p className="small text-muted mb-0">{(assignedItem as any).variation || <i>No variation selected</i>}</p>
                                      </div>
                                  ) : hasCustomData && assignedItem ? (
                                      <div>
                                          <p className="mb-0 fw-bold">{assignedItem.name}</p>
                                          <p className="small text-primary mb-0 fst-italic">To be custom-made</p>
                                      </div>
                                  ) : (
                                      <div className="text-muted fst-italic pt-2">No item assigned</div>
                                  )}
                              </Col>
                              <Col md="auto" className="text-end d-flex gap-2">
                                {/* This button appears only if an item is assigned */}
                                {isLinkedToItem && (
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleClearAssignment(index)}
                                    >
                                        <Trash />
                                    </Button>
                                )}

                                {/* The main assign/change button remains */}
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => {
                                        if (isDesignatedAsCustom) {
                                            handleOpenCustomItemModal(index);
                                        } else {
                                            handleOpenInventoryAssignment(index);
                                        }
                                    }}
                                >
                                    <PencilSquare className="me-1" />
                                    {(isLinkedToItem || hasCustomData) ? 'Change' : 'Assign'}
                                </Button>
                            </Col>
                          </Row>
                      </ListGroup.Item>
                  );
              })}
            </ListGroup>
          </div>
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