// src/pages/PackageRent.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Spinner,
  Alert,
  Image as BsImage,
  Modal,
} from 'react-bootstrap';
import {
  BoxSeam,
  ExclamationTriangleFill,
  Palette,
} from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import CustomerDetailsCard from '../../components/CustomerDetailsCard';
import { v4 as uuidv4 } from 'uuid';

import {
  Package,
  InventoryItem,
  CustomerInfo,
  RentalOrder,
  PackageFulfillment,
  MeasurementRef,
  CustomTailoringItem,
  FormErrors,
  NormalizedFulfillmentItem
} from '../../types';
import { SingleItemSelectionModal, SelectedItemData } from '../../components/modals/singleItemSelectionModal/SingleItemSelectionModal';
import CreateEditCustomItemModal from '../../components/modals/createEditCustomItemModal/CreateEditCustomItemModal';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import namer from 'color-namer';
import { PackageFulfillmentForm } from '../../components/forms/packageFulfillmentForm/PackageFulfillmentForm';
import { PackageSelectionData, PackageSelectionModal } from '../../components/modals/packageSelectionModal/PackageSelectionModal';

const initialCustomerDetails: CustomerInfo = { 
  name: '', 
  phoneNumber: '', 
  email: '', 
  address: {
    province: 'Camarines Norte',
    city: '',
    barangay: '',
    street: ''
  } 
};

function PackageRent() {
  const navigate = useNavigate();
  const { addAlert } = useAlert();

  // State Management
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedMotifId, setSelectedMotifId] = useState<string>('');
  const [showPackageSelectionModal, setShowPackageSelectionModal] = useState(false);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allRentals, setAllRentals] = useState<RentalOrder[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [measurementRefs, setMeasurementRefs] = useState<MeasurementRef[]>([]);
  const [fulfillmentData, setFulfillmentData] = useState<PackageFulfillment[]>([]);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemContext, setCustomItemContext] = useState<{ 
    index: number; 
    item: CustomTailoringItem | null;
    itemName: string; // <-- ADD THIS LINE
  } | null>(null);

  const [customerDetails, setCustomerDetails] = useState<CustomerInfo>(initialCustomerDetails);
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(true);
  
  const [existingOpenRental, setExistingOpenRental] = useState<RentalOrder | null>(null);
  const [selectedRentalForDisplay, setSelectedRentalForDisplay] = useState<RentalOrder | null>(null);
  
  // UI & Modal State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // <-- RESTORED
  const [modalData, setModalData] = useState({ rentalId: '', itemName: '' }); // <-- RESTORED
  const [assignmentContext, setAssignmentContext] = useState<{ fulfillmentIndex: number } | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showIncompleteFulfillmentModal, setShowIncompleteFulfillmentModal] = useState(false);
  const [incompleteAction, setIncompleteAction] = useState<'create' | 'add' | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMotif = useMemo(() => {
    if (!selectedPackage || !selectedMotifId) return null;
    return selectedPackage.colorMotifs.find(m => m._id === selectedMotifId);
  }, [selectedPackage, selectedMotifId]);
  
  useEffect(() => {
    const pendingItemJSON = sessionStorage.getItem('pendingCustomItem');

    if (pendingItemJSON) {
        try {
            const { item, index } = JSON.parse(pendingItemJSON);

            // Update the fulfillment data state
            setFulfillmentData(prev => {
                const updated = [...prev];
                if (updated[index]) {
                    // We received a full CustomTailoringItem object
                    updated[index].assignedItem = item;
                }
                return updated;
            });

        } catch (e) {
            console.error("Failed to parse pending custom item from sessionStorage", e);
        } finally {
            // IMPORTANT: Clear the item from storage to prevent re-processing
            sessionStorage.removeItem('pendingCustomItem');
        }
    }
  }, []);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inventoryRes, rentalsRes, refsRes] = await Promise.all([
          api.get('/inventory?limit=1000'),
          api.get('/rentals'),
          api.get('/measurementrefs'),
        ]);
        setAllInventory(inventoryRes.data.items || []);
        setAllRentals(rentalsRes.data || []);
        setMeasurementRefs(refsRes.data || []);
      } catch (err) {
        console
        addAlert("Failed to load initial data.","danger")
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [addAlert]);

  useEffect(() => {
    // If no package is selected, reset the form and exit.
    if (!selectedPackage) {
      setFulfillmentData([]);
      return;
    }
    const newFulfillmentStructure: PackageFulfillment[] = selectedPackage.inclusions.flatMap(inclusion => {
        return Array.from({ length: inclusion.wearerNum }, (_, i) => {
            const roleName = inclusion.wearerNum > 1 ? `${inclusion.name} ${i + 1}` : inclusion.name;
            return {
                role: roleName,
                wearerName: '',
                isCustom: !!inclusion.isCustom,
                assignedItem: {},
                sourceInclusionId: inclusion._id,
            };
        });
    });

    if (selectedMotif) {
      const inventoryMapForPrefill = new Map(allInventory.map(item => [item._id.toString(), item]));
      selectedMotif.assignments.forEach(assignment => {
        const sourceInclusion = selectedPackage.inclusions.find(inc => String(inc._id) === String(assignment.inclusionId));
        if (!sourceInclusion) {
          return;
        }

        const targetSlots = newFulfillmentStructure
            .map((fulfill, index) => ({ ...fulfill, originalIndex: index }))
            .filter(fulfill => fulfill.role.startsWith(sourceInclusion.name));

        assignment.assignedItems.forEach((assignedItem, wearerIndex) => {
            if (assignedItem && targetSlots[wearerIndex]) {
                const originalFulfillmentIndex = targetSlots[wearerIndex].originalIndex;
                const itemDetails = inventoryMapForPrefill.get(assignedItem.itemId);

                if (itemDetails) {
                    const variationDetails = itemDetails.variations.find(v => 
                        v.color.hex === assignedItem.color.hex && v.size === assignedItem.size
                    );

                    newFulfillmentStructure[originalFulfillmentIndex].assignedItem = {
                        itemId: assignedItem.itemId,
                        name: itemDetails.name,
                        variation: `${assignedItem.color.name}, ${assignedItem.size}`,
                        imageUrl: variationDetails?.imageUrl || itemDetails.variations[0]?.imageUrl,
                    };
                }
            }
        });
      });
    }

    setFulfillmentData(newFulfillmentStructure);
  }, [selectedPackage, selectedMotif, allInventory]);


  const normalizedDataForForm = useMemo((): NormalizedFulfillmentItem[] => {
    return fulfillmentData.map(fulfill => {
      const assigned = fulfill.assignedItem || {};
      return {
        role: fulfill.role,
        wearerName: fulfill.wearerName,
        isCustom: fulfill.isCustom ?? false,
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
  }, [fulfillmentData]);

  const handlePackageSelect = (selection: PackageSelectionData) => {
    setSelectedPackage(selection.pkg);
    setSelectedMotifId(selection.motifId);
    setShowPackageSelectionModal(false); // Close the modal on selection
  };

  const getMotifName = (motifHex: string) => {
    if (!motifHex) return 'N/A';
    try {
        const names = namer(motifHex);
        return names.ntc[0]?.name.replace(/\b\w/g, char => char.toUpperCase()) || 'Custom Color';
    } catch { return 'Custom Color'; }
  };

  const validateCustomerDetails = (): boolean => {
    const newErrors: FormErrors = { address: {} };
    if (!customerDetails.name.trim()) newErrors.name = 'Customer Name is required.';
    if (!/^09\d{9}$/.test(customerDetails.phoneNumber)) newErrors.phoneNumber = 'Phone number must be a valid 11-digit number starting with 09.';
    if (!customerDetails.address.province) newErrors.address.province = 'Province is required.';
    if (!customerDetails.address.city) newErrors.address.city = 'City/Municipality is required.';
    if (!customerDetails.address.barangay) newErrors.address.barangay = 'Barangay is required.';
    if (!customerDetails.address.street.trim()) newErrors.address.street = 'Street, House No. is required.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 1 && Object.keys(newErrors.address).length === 0;
  };


  const handleOpenCustomItemModal = (index: number) => {
    const fulfillItem = fulfillmentData[index];
    const assigned = fulfillItem.assignedItem;

    let itemForModal: CustomTailoringItem | null = null;
    if (fulfillItem.isCustom) {
        
        if (assigned && 'outfitCategory' in assigned) {
            
            itemForModal = assigned as CustomTailoringItem;
        }
    }

    const itemName = `${selectedPackage?.name.split(',')[0]}: ${fulfillItem.role}`;
    
    setCustomItemContext({ 
        index: index, 
        item: itemForModal,
        itemName: itemName 
    });
    
    setShowCustomItemModal(true);
  };

  const handleSaveCustomItem = (updatedItem: CustomTailoringItem) => {
    if (customItemContext === null) return;
    const { index } = customItemContext;

    const newFulfillmentData = [...fulfillmentData];
    newFulfillmentData[index].assignedItem = updatedItem;
    setFulfillmentData(newFulfillmentData);
    
    setShowCustomItemModal(false);
    setCustomItemContext(null);
  };

  const handleSelectCustomer = (selectedRental: RentalOrder) => {
    const customer = selectedRental.customerInfo[0];
    setCustomerDetails(customer);
    setSelectedRentalForDisplay(selectedRental);
    if (selectedRental.status === 'Pending') {
      setExistingOpenRental(selectedRental);
    } else {
      setExistingOpenRental(null);
    }
  };

  const proceedWithAction = (action: 'create' | 'add') => {
    setIsSubmitting(true);
    if (action === 'create') {
      if (!isNewCustomerMode && existingOpenRental) {
        setShowReminderModal(true);
        setIsSubmitting(false); // Stop submission until user confirms
      } else {
        createNewRental();
      }
    } else if (action === 'add') {
      handleAddItemToExistingRental();
    }
  };

  
  const validateAndProceed = (action: 'create' | 'add') => {
    if (!selectedPackageId) {
        addAlert("Please select a package.", 'danger');
        return;
    }
    if (!validateCustomerDetails()) {
        addAlert("Please fill all required customer fields (*).", 'warning');
        return;
    }

    const isFulfillmentIncomplete = fulfillmentData.some(fulfill => {
        const assigned = fulfill.assignedItem;

        if (assigned && 'outfitCategory' in assigned) {
            return false;
        }
        
        // A custom slot is considered "complete" for this check even if details aren't filled yet.
        if (fulfill.isCustom) {
            return false;
        }

        if (!assigned || !assigned.itemId || !assigned.variation) {
            return true;
        }

        return false;
    });

    if (isFulfillmentIncomplete) {
        setIncompleteAction(action);
        setShowIncompleteFulfillmentModal(true);
    } else {
        proceedWithAction(action);
    }
  };

  const buildRentalPayload = () => {
    if (!selectedPackage) return null;

    const { finalPackageFulfillment, customItemsForRental } = buildFinalPayload();
    const selectedMotifObject = selectedPackage.colorMotifs.find(m => m._id === selectedMotifId);

    return {
      customerInfo: [customerDetails],
      packageRents: [{
         _id: `pkg_${uuidv4()}`,
        packageId: selectedPackage._id, // <-- THE CRUCIAL FIX: Send the ID
        motifHex: selectedMotifObject?.motifHex, // <-- Send the HEX
        price: selectedPackage.price,
        quantity: 1,
        imageUrl: selectedPackage.imageUrls[0] || '',
        packageFulfillment: finalPackageFulfillment
      }],
      customTailoring: customItemsForRental
    };
  };

  const createNewRental = async () => {
    setShowReminderModal(false);
    if (!selectedPackage) return;
    setIsSubmitting(true);

    try {
      // 2. Construct the final API payload
      const rentalPayload = buildRentalPayload();
    if (!rentalPayload) {
        addAlert("No package selected.", "danger");
        setIsSubmitting(false);
        return;
    }

      const response = await api.post('/rentals', rentalPayload);
      addAlert("New rental created successfully! Redirecting...", 'success'); // Using global notification
      setTimeout(() => navigate(`/rentals/${response.data._id}`), 1500);
    } catch (apiError: any) {
      addAlert(apiError.response?.data?.message || "Failed to create package rental.", 'danger');
      console.error("API Error:", apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildFinalPayload = () => {
    // This array will hold the full CustomTailoringItem objects for the top-level DB array.
    const customItemsForRental: CustomTailoringItem[] = [];

    // This array will hold the fulfillment data with correct references.
    const finalPackageFulfillment = fulfillmentData.map(fulfill => {
        // Handle custom items
        if (fulfill.isCustom) {
            const assigned = fulfill.assignedItem;
            // Check if it's a fully-formed custom item from the modal
            if (assigned && 'outfitCategory' in assigned) {

              if (!(assigned as CustomTailoringItem)._id) {
                (assigned as CustomTailoringItem)._id = uuidv4();
              }

              customItemsForRental.push(assigned as CustomTailoringItem);

              return {
                  role: fulfill.role,
                  wearerName: fulfill.wearerName,
                  assignedItem: {
                      itemId: (assigned as CustomTailoringItem)._id,
                  },
                  isCustom: true
              };
            }
            // If it's a custom slot but no details were added, return a placeholder
            return {
                role: fulfill.role,
                wearerName: fulfill.wearerName,
                assignedItem: { name: `${selectedPackage?.name.split(',')[0]}: ${fulfill.role}` }, // Placeholder name is fine here as it will be replaced.
                isCustom: true
            };
        } else {
            // Handle standard inventory items (no changes needed)
            return fulfill;
        }
    });

    return {
        finalPackageFulfillment,
        customItemsForRental
    };
  };

  const handleAddItemToExistingRental = async () => {
    if (!existingOpenRental) { 
        addAlert("No existing rental found.", 'danger'); 
        return; 
    }
    setIsSubmitting(true);

    try {
      // 2. Construct the final API payload for adding items
      const payload = buildRentalPayload();
    if (!payload) {
        addAlert("No package selected.", "danger");
        setIsSubmitting(false);
        return;
    }

      await api.put(`/rentals/${existingOpenRental._id}/addItem`, payload);
      
      // Reset form and show success
       setModalData({ rentalId: existingOpenRental._id, itemName: selectedPackage!.name });
      setShowSuccessModal(true);
      setSelectedPackageId('');
      setSelectedMotifId('');
      setFulfillmentData([]);
    } catch (apiError: any) {
      addAlert(apiError.response?.data?.message || "Failed to add item to rental.", 'danger');
      console.error("API Error:", apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAssignmentModal = (fulfillmentIndex: number) => { setAssignmentContext({ fulfillmentIndex }); setShowAssignmentModal(true); };
  
  const handleSaveAssignment = (selection: SelectedItemData) => {
    if (assignmentContext === null) return;
    const { fulfillmentIndex } = assignmentContext;
    const newFulfillmentData = [...fulfillmentData];
    const { product, variation } = selection;

    newFulfillmentData[fulfillmentIndex].assignedItem = {
      itemId: product._id,
      name: product.name,
      // FIX IS HERE: Was `variation.color`, should be `variation.color.name`
      variation: `${variation.color.name}, ${variation.size}`, 
      imageUrl: variation.imageUrl
    };

    setFulfillmentData(newFulfillmentData);
    setShowAssignmentModal(false);
  };
  
  const handleWearerNameChange = (index: number, name: string) => {
    const newFulfillmentData = [...fulfillmentData];
    newFulfillmentData[index].wearerName = name;
    setFulfillmentData(newFulfillmentData);
  };

  const preselectedAssignment = useMemo(() => {
    if (assignmentContext === null) {
        return { itemId: undefined, variation: undefined };
    }
    const assigned = fulfillmentData[assignmentContext.fulfillmentIndex]?.assignedItem;

    // Use a type guard to safely access properties
    if (assigned && 'itemId' in assigned) {
        return {
            itemId: assigned.itemId,
            variation: assigned.variation
        };
    }
    
    // If it's a custom item or not assigned, return undefined
    return { itemId: undefined, variation: undefined };
  }, [assignmentContext, fulfillmentData]);

  const handleClearAssignment = (index: number) => {
    setFulfillmentData(prev => {
      const updated = [...prev];
      if (updated[index]) {
        // Clear the assignment by setting it to an empty object
        updated[index].assignedItem = {}; 
      }
      return updated;
    });
    addAlert('Assignment cleared.', 'info');
  };

  return (
    <Container fluid>
      <h2 className="mb-4">Create Package Rental</h2>
      {loading ? ( <div className="text-center py-5"><Spinner /></div> ) : (
      <Row className="g-4">
        {/* --- LEFT COLUMN --- */}
        <Col lg={6} xl={7}>
          <Card className="mb-4">
            <Card.Header as="h5"><BoxSeam className="me-2" />Select Package</Card.Header>
            <Card.Body>
              {selectedPackage ? (
                // --- DISPLAY VIEW (when a package is selected) ---
                <div>
                  <Row className="g-3">
                    <Col xs="auto">
                      <BsImage 
                        src={selectedPackage.imageUrls[0] || 'https://placehold.co/120x150'} 
                        style={{ width: '120px', height: '150px', objectFit: 'cover', borderRadius: '0.375rem' }} 
                      />
                    </Col>
                    <Col>
                      <h5 className="mb-1">{selectedPackage.name}</h5>
                      <p className="text-danger fw-bold fs-5 mb-2">₱{selectedPackage.price.toLocaleString()}</p>
                      <div className="d-flex align-items-center">
                        <Palette className="me-2 text-muted" />
                        <span>Motif: <strong>{getMotifName(selectedMotif?.motifHex || '')}</strong></span>
                      </div>
                    </Col>
                  </Row>
                  <div className="d-grid mt-3">
                    <Button variant="outline-secondary" onClick={() => setShowPackageSelectionModal(true)}>
                      Change Package or Motif...
                    </Button>
                  </div>
                </div>
              ) : (
                // --- PROMPT VIEW (when no package is selected) ---
                <div className="text-center p-4">
                  <p className="text-muted fs-5">No package has been selected.</p>
                  <Button variant="primary" onClick={() => setShowPackageSelectionModal(true)}>
                    Select a Package
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
          <Card>
            <Card.Header as="h5">Fulfillment Details</Card.Header>
            <Card.Body className="p-0">
              {fulfillmentData.length > 0 ? (
                <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    <PackageFulfillmentForm
                      mode="rental"
                      fulfillmentData={normalizedDataForForm}
                      onWearerNameChange={handleWearerNameChange}
                      onOpenAssignmentModal={handleOpenAssignmentModal}
                      onOpenCustomItemModal={handleOpenCustomItemModal}
                      onClearAssignment={handleClearAssignment}
                      errors={[]} // Pass errors if you add validation here later
                    />
                </div>
              ) : (
                <div className="text-center p-5 text-muted">
                  <p>Select a package and motif to see fulfillment details here.</p>
                </div>
              )}
              {/* --- MODIFICATION END --- */}
            </Card.Body>
          </Card>
        </Col>

        {/* --- RIGHT COLUMN --- */}
        <Col lg={6} xl={5}>
            <CustomerDetailsCard
                customerDetails={customerDetails}
                setCustomerDetails={setCustomerDetails}
                isNewCustomerMode={isNewCustomerMode}
                onSetIsNewCustomerMode={setIsNewCustomerMode}
                allRentals={allRentals}
                onSelectExisting={handleSelectCustomer}
                onSubmit={validateAndProceed}
                isSubmitting={isSubmitting}
                canSubmit={!!selectedPackageId && !!customerDetails.name}
                existingOpenRental={existingOpenRental}
                selectedRentalForDisplay={selectedRentalForDisplay}
                errors={errors} 
            />
        </Col>
      </Row>
      )}

      <PackageSelectionModal
        show={showPackageSelectionModal}
        onHide={() => setShowPackageSelectionModal(false)}
        onSelect={handlePackageSelect}
      />

      {showCustomItemModal && customItemContext && (
        <CreateEditCustomItemModal
          show={showCustomItemModal}
          onHide={() => setShowCustomItemModal(false)}
          item={customItemContext.item}
          itemName={customItemContext.itemName}
          measurementRefs={measurementRefs}
          onSave={handleSaveCustomItem}
          isForPackage={true}
        />
      )}

      {assignmentContext !== null && 
        <SingleItemSelectionModal
          show={showAssignmentModal}
          onHide={() => setShowAssignmentModal(false)}
          mode="assignment"
          onSelect={handleSaveAssignment}
          addAlert={addAlert}
          preselectedItemId={preselectedAssignment.itemId}
          preselectedVariation={preselectedAssignment.variation}
        />
      }

      <Modal show={showReminderModal} onHide={() => setShowReminderModal(false)} centered>
        <Modal.Header closeButton><Modal.Title><ExclamationTriangleFill className="me-2 text-warning" />Customer Has Open Rental</Modal.Title></Modal.Header>
        <Modal.Body>This customer has a rental "Pending". Are you sure you want to create a separate new rental transaction?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReminderModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={createNewRental}>Yes, Create New Rental</Button>
        </Modal.Footer>
      </Modal>

      {/* --- RESTORED SUCCESS MODAL --- */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Package Added Successfully</Modal.Title></Modal.Header>
        <Modal.Body><Alert variant="success" className="mb-0">Successfully added <strong>{modalData.itemName}</strong> to rental ID: <strong>{modalData.rentalId}</strong>.</Alert></Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSuccessModal(false)}>OK</Button>
            <Button variant="primary" onClick={() => navigate(`/rentals/${modalData.rentalId}`)}>View Rental</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showIncompleteFulfillmentModal} onHide={() => setShowIncompleteFulfillmentModal(false)} centered>
        <Modal.Header closeButton>
            <Modal.Title><ExclamationTriangleFill className="me-2 text-warning" />Incomplete Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>Some roles have not been assigned an item and variation. Are you sure you want to proceed?</Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowIncompleteFulfillmentModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => {
                setShowIncompleteFulfillmentModal(false);
                if (incompleteAction) proceedWithAction(incompleteAction);
            }}>
                Proceed Anyway
            </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default PackageRent;
