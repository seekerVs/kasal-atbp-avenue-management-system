import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { RentedPackage, PackageFulfillment, InventoryItem, CustomTailoringItem, MeasurementRef, Package, NormalizedFulfillmentItem } from '../../../types';
import CreateEditCustomItemModal from '../createEditCustomItemModal/CreateEditCustomItemModal'; 
import { SingleItemSelectionModal, SelectedItemData } from '../singleItemSelectionModal/SingleItemSelectionModal';
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
    if (pkg) {
      // Just set the raw fulfillment data directly from the prop.
      // The child form will now handle all the enrichment.
      setFulfillment(pkg.packageFulfillment || []);
      initialFulfillmentRef.current = JSON.parse(JSON.stringify(pkg.packageFulfillment || []));
    }
  }, [pkg]);

  const normalizedDataForForm = useMemo((): NormalizedFulfillmentItem[] => {
    return fulfillment.map(fulfill => {
      const assigned = fulfill.assignedItem || {};
      return {
        role: fulfill.role,
        wearerName: fulfill.wearerName,
        isCustom: fulfill.isCustom ?? false, // Default to false if undefined
        assignedItem: {
          itemId: 'itemId' in assigned ? assigned.itemId : undefined,
          name: 'name' in assigned ? assigned.name : undefined,
          variation: 'variation' in assigned ? assigned.variation : undefined,
          imageUrl: 'imageUrl' in assigned ? assigned.imageUrl : undefined,
          outfitCategory: 'outfitCategory' in assigned ? (assigned as any).outfitCategory : undefined,
          referenceImages: 'referenceImages' in assigned ? (assigned as any).referenceImages : undefined
        }
      };
    });
  }, [fulfillment]);

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

            const response = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return {
                placeholder: stagedFile.placeholder,
                url: response.data.url,
            };
        });

        const uploadedMappings = await Promise.all(uploadPromises);
        const urlMap = new Map(uploadedMappings.map(u => [u.placeholder, u.url]));

        const updatedCustomItems: CustomTailoringItem[] = [];
        const finalFulfillment = [...fulfillment]; // Create a mutable copy

        finalFulfillment.forEach((fulfillItem, index) => {
            const assigned = fulfillItem.assignedItem;
            if (fulfillItem.isCustom && assigned && 'outfitCategory' in assigned) {
                const finalImages = (assigned.referenceImages || []).map(ref => 
                    urlMap.get(ref) || ref
                ).filter(url => url && !url.startsWith('placeholder_'));
                
                const finalCustomItem = {
                    ...(assigned as CustomTailoringItem),
                    referenceImages: finalImages,
                };
                
                updatedCustomItems.push(finalCustomItem);

                finalFulfillment[index] = {
                    ...fulfillItem,
                    assignedItem: { itemId: finalCustomItem._id }
                };
            }
        });

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

    if (assigned && 'outfitCategory' in assigned) {
        setCustomItemIdsToDelete(prev => [...prev, assigned._id]);
    }
    
    updatedFulfillment[index].assignedItem = {};
    setFulfillment(updatedFulfillment);
  };

  if (!pkg) return null;
  
  const itemToPreselect = invAssignmentIndex !== null ? fulfillment[invAssignmentIndex]?.assignedItem : null;

    let preselectedItemIdForModal: string | undefined = undefined;
    let preselectedVariationForModal: string | undefined = undefined;

    if (itemToPreselect && 'itemId' in itemToPreselect) {
        preselectedItemIdForModal = itemToPreselect.itemId;
        preselectedVariationForModal = itemToPreselect.variation;
    }

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
              mode="rental"
              fulfillmentData={normalizedDataForForm}
              onWearerNameChange={handleWearerNameChange}
              onOpenAssignmentModal={handleOpenInventoryAssignment}
              onOpenCustomItemModal={handleOpenCustomItemModal}
              onClearAssignment={handleClearAssignment}
              errors={[]}
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