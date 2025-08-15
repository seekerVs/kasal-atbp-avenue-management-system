import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, Button, Form, Row, Col, ListGroup, Badge, Alert } from 'react-bootstrap';
import { RentedPackage, PackageFulfillment, InventoryItem, FulfillmentItem, CustomTailoringItem, MeasurementRef, Package } from '../../../types';
import CreateEditCustomItemModal from '../createEditCustomItemModal/CreateEditCustomItemModal'; 
import { SingleItemSelectionModal, SelectedItemData } from '../singleItemSelectionModal/SingleItemSelectionModal';
import { ExclamationTriangleFill, PencilSquare, PlusCircle, Trash } from 'react-bootstrap-icons';
import api from '../../../services/api';
import { PackageFulfillmentForm } from '../../forms/packageFulfillmentForm/PackageFulfillmentForm';

interface StagedFile {
  file: File;
  placeholder: string; // e.g., "placeholder_image.png"
}

interface EditPackageModalProps {
  show: boolean;
  onHide: () => void;
  pkg: RentedPackage;
  inventory: InventoryItem[];
  onSave: (updatedFulfillment: PackageFulfillment[], updatedCustomItems: CustomTailoringItem[], customItemIdsToDelete: string[], imageUrlsToDelete: string[]) => void;
  allPackages: Package[];
  customItems: CustomTailoringItem[];
}

const EditPackageModal: React.FC<EditPackageModalProps> = ({ show, onHide, pkg, inventory, onSave, allPackages, customItems }) => {
  const [fulfillment, setFulfillment] = useState<PackageFulfillment[]>([]);
  // State for the inventory assignment sub-modal
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [invAssignmentIndex, setInvAssignmentIndex] = useState<number | null>(null);
  const [customItemIdsToDelete, setCustomItemIdsToDelete] = useState<string[]>([]);
  
  // --- NEW STATE for the custom item creation/edit flow ---
  const [measurementRefs, setMeasurementRefs] = useState<MeasurementRef[]>([]);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemContext, setCustomItemContext] = useState<{ index: number; item: CustomTailoringItem | null; itemName: string } | null>(null);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isSaving, setIsSaving] = useState(false); 
  
  const initialFulfillmentRef = useRef<PackageFulfillment[]>([]);

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
      initialFulfillmentRef.current = JSON.parse(JSON.stringify(enrichedFulfillment));
    }
  }, [pkg, customItems, inventory]); // IMPORTANT: Add inventory to the dependency array

  const handleWearerNameChange = (index: number, name: string) => {
    const updatedFulfillment = [...fulfillment];
    if (!updatedFulfillment[index]) return;
    updatedFulfillment[index].wearerName = name;
    setFulfillment(updatedFulfillment);
  };

  const handleOpenInventoryAssignment = (index: number) => {
    setInvAssignmentIndex(index);
    setShowAssignmentModal(true);
  };

  const handleAssignFromInventory = (selection: SelectedItemData) => {
    if (invAssignmentIndex === null) return;
    
    const { product, variation } = selection;
    const updatedFulfillment = [...fulfillment];
    if (!updatedFulfillment[invAssignmentIndex]) return;
    
    updatedFulfillment[invAssignmentIndex].assignedItem = {
      itemId: product._id,
      name: product.name,
      variation: `${variation.color}, ${variation.size}`,
      imageUrl: variation.imageUrl,
    };

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

  const handleSaveCustomItem = (stagedItem: CustomTailoringItem, pendingFiles?: File[]) => {
    if (customItemContext === null) return;
    const { index } = customItemContext;

    const newFulfillmentData = [...fulfillment];
    newFulfillmentData[index].assignedItem = stagedItem;
    setFulfillment(newFulfillmentData);
    
    if (pendingFiles && pendingFiles.length > 0) {
        const newStagedFiles: StagedFile[] = pendingFiles.map(file => ({
            file: file,
            placeholder: `placeholder_${file.name}`,
        }));
        setStagedFiles(prev => [...prev, ...newStagedFiles]);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
        // --- UPLOAD STAGED FILES ---
        const uploadPromises = stagedFiles.map(async (stagedFile) => {
            // This is the correct way to upload a single file
            const formData = new FormData();
            formData.append('file', stagedFile.file);

            // Use the api instance we already have for authenticated requests
            const response = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return {
                placeholder: stagedFile.placeholder,
                url: response.data.url, // Get the URL from the response
            };
        });

        const uploadedMappings = await Promise.all(uploadPromises);
        const urlMap = new Map(uploadedMappings.map(u => [u.placeholder, u.url]));
        
        // --- PREPARE FINAL PAYLOAD ---
        const updatedCustomItems: CustomTailoringItem[] = [];
        const finalFulfillment = [...fulfillment]; // Create a mutable copy

        finalFulfillment.forEach((fulfillItem, index) => {
            const assigned = fulfillItem.assignedItem;
            if (fulfillItem.isCustom && assigned && 'outfitCategory' in assigned) {
                // Replace placeholders with real URLs
                const finalImages = (assigned.referenceImages || []).map(ref => 
                    urlMap.get(ref) || ref
                ).filter(url => url && !url.startsWith('placeholder_')); // Also filter out any leftover placeholders
                
                const finalCustomItem = {
                    ...(assigned as CustomTailoringItem),
                    referenceImages: finalImages,
                };
                
                updatedCustomItems.push(finalCustomItem);

                // Update the fulfillment reference to use the final object ID
                // Ensure assignedItem is updated to be the simple reference object
                finalFulfillment[index] = {
                    ...fulfillItem,
                    assignedItem: { itemId: finalCustomItem._id }
                };
            }
        });

        // --- NEW DELETION LOGIC ---
        // A. Get all initial custom image URLs
        const initialImageUrls = new Set(
            initialFulfillmentRef.current.flatMap(fulfill => {
                const assigned = fulfill.assignedItem;
                if (fulfill.isCustom && assigned && 'outfitCategory' in assigned) {
                    return assigned.referenceImages || [];
                }
                return [];
            })
        );

        // B. Get all final custom image URLs
        const finalImageUrls = new Set(
            updatedCustomItems.flatMap(item => item.referenceImages || [])
        );

        // C. Find the difference: URLs that were in the initial set but not in the final set
        const imageUrlsToDelete: string[] = [];
        initialImageUrls.forEach(url => {
            if (!finalImageUrls.has(url)) {
                imageUrlsToDelete.push(url);
            }
        });
        // --- END OF NEW DELETION LOGIC ---

        // D. Call the parent's onSave with all four pieces of data.
        onSave(finalFulfillment, updatedCustomItems, customItemIdsToDelete, imageUrlsToDelete);

        onHide();

    } catch (error) {
        console.error("Save process failed in EditPackageModal:", error);
        alert("Failed to save changes. An error occurred during file upload.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleClearAssignment = (index: number) => {
    const updatedFulfillment = [...fulfillment];
    const fulfillItem = updatedFulfillment[index];
    if (!fulfillItem) return;

    const assigned = fulfillItem.assignedItem;

    // If it's a custom item, add its ID to our "to-delete" list.
    if (assigned && 'outfitCategory' in assigned) {
        setCustomItemIdsToDelete(prev => [...prev, assigned._id]);
    }
    
    // For ALL items (custom or inventory), just clear the assignment in the local state.
    // This makes the UI update instantly without a permanent DB change.
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
            <PackageFulfillmentForm
              fulfillmentData={fulfillment}
              onWearerNameChange={handleWearerNameChange}
              onOpenAssignmentModal={handleOpenInventoryAssignment}
              onOpenCustomItemModal={handleOpenCustomItemModal}
              onClearAssignment={handleClearAssignment}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
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
                isForPackage={true}
            />
        )}

      <SingleItemSelectionModal
        show={showAssignmentModal}
        onHide={() => setShowAssignmentModal(false)}
        mode="assignment"
        onSelect={handleAssignFromInventory}
        addAlert={() => {}} // Can pass a no-op or the real alert function
        preselectedItemId={preselectedItemIdForModal}
        preselectedVariation={preselectedVariationForModal}
      />

    </>
  );
};

export default EditPackageModal;