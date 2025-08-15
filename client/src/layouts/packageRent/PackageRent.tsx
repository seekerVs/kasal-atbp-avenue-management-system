// src/pages/PackageRent.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  ListGroup,
  Spinner,
  Alert,
  Image as BsImage,
  Modal,
} from 'react-bootstrap';
import {
  BoxSeam,
  ExclamationTriangleFill,
  Palette,
  PencilSquare,
  PlusCircle
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
  ColorMotif
} from '../../types';
import { SingleItemSelectionModal, SelectedItemData } from '../../components/modals/singleItemSelectionModal/SingleItemSelectionModal';
import CreateEditCustomItemModal from '../../components/modals/createEditCustomItemModal/CreateEditCustomItemModal';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import namer from 'color-namer';

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

// ===================================================================================
// --- MAIN COMPONENT ---
// ===================================================================================
function PackageRent() {
  const navigate = useNavigate();
  const { addAlert } = useAlert();

  // State Management
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allRentals, setAllRentals] = useState<RentalOrder[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [selectedMotifId, setSelectedMotifId] = useState<string>('');
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
        const [packagesRes, inventoryRes, rentalsRes, refsRes] = await Promise.all([
          api.get('/packages'),
          api.get('/inventory'),
          api.get('/rentals'),
          api.get('/measurementrefs'),
        ]);
        setAllPackages(packagesRes.data || []);
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
  }, []);

  const selectedPackage = useMemo(() => allPackages.find(p => p._id === selectedPackageId), [selectedPackageId, allPackages]);

  const motifsWithNames = useMemo(() => {
    if (!selectedPackage) return [];

    return selectedPackage.colorMotifs.map((motif: ColorMotif) => {
      let generatedName = 'Custom Color';
      try {
        const names = namer(motif.motifHex);
        generatedName = names.ntc[0]?.name || 'Custom Color';
        generatedName = generatedName.replace(/\b\w/g, char => char.toUpperCase());
      } catch (e) {
        console.warn(`Could not name color for hex: ${motif.motifHex}`, e);
      }
      return {
        ...motif, // includes _id, motifHex, etc.
        displayName: generatedName, // add the new display property
      };
    });
  }, [selectedPackage]);

  
  const selectedMotif = useMemo(() => selectedPackage?.colorMotifs.find(m => m._id === selectedMotifId), [selectedPackage, selectedMotifId]);

  useEffect(() => {
    if (!selectedPackage) {
        setFulfillmentData([]);
        return;
    }
    
    const initialFulfillment = selectedPackage.inclusions.flatMap(inclusion => {
        return Array.from({ length: inclusion.wearerNum }, (_, i) => {
            const roleName = inclusion.wearerNum > 1 ? `${inclusion.name} ${i + 1}` : inclusion.name;
            return {
                role: roleName, wearerName: '',
                isCustom: !!inclusion.isCustom,
                assignedItem: {},
                sourceInclusionId: inclusion._id,
            } as PackageFulfillment; // Added type assertion for clarity
        });
    });

    if (selectedMotif) {
      const inventoryMap = new Map(allInventory.map(item => [item._id, item]));
      selectedMotif.assignments.forEach(assignment => {
        const targetFulfillmentSlots = initialFulfillment.filter(
          fulfill => fulfill.sourceInclusionId === assignment.inclusionId
        );
        
        // --- (2) THE FIX IS HERE: We now loop over `assignedItems` ---
        assignment.assignedItems.forEach((assignedItem, wearerIndex) => {
          // Check if assignedItem is not null and has an itemId
          if (assignedItem && assignedItem.itemId && targetFulfillmentSlots[wearerIndex]) {
            const itemDetails = inventoryMap.get(assignedItem.itemId);
            if (itemDetails) {
              // Find the specific variation image, or use the first one as a fallback.
              const variationDetails = itemDetails.variations.find(v => 
                v.color.hex === assignedItem.color.hex && v.size === assignedItem.size
              );

              targetFulfillmentSlots[wearerIndex].assignedItem = {
                itemId: assignedItem.itemId,
                name: itemDetails.name,
                // We can now pre-fill the variation string directly!
                variation: `${assignedItem.color.name}, ${assignedItem.size}`,
                imageUrl: variationDetails?.imageUrl || itemDetails.variations[0]?.imageUrl,
              };
            }
          }
        });
      });
    }

    setFulfillmentData(initialFulfillment);
  }, [selectedPackage, selectedMotif, allInventory]);

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
  
  const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPackageId(e.target.value);
    setSelectedMotifId('');
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
    if (selectedRental.status === 'To Process') {
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
      variation: `${variation.color}, ${variation.size}`,
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
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Available Packages</Form.Label>
                    <Form.Select value={selectedPackageId} onChange={handlePackageChange}>
                      <option value="">-- Choose a Package --</option>
                      {allPackages.map(pkg => (
                        <option key={pkg._id} value={pkg._id}>
                          {pkg.name} - ₱{pkg.price.toLocaleString()}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><Palette className="me-2" />Color Motif</Form.Label>
                    <Form.Select 
                      value={selectedMotifId} 
                      onChange={e => setSelectedMotifId(e.target.value)}
                      disabled={!selectedPackageId} // <-- KEY CHANGE: Disabled if no package ID
                    >
                      <option value="">
                        {selectedPackageId ? '-- Manual Assignment --' : '-- Select a Package First --'}
                      </option>
                      
                      {/* This part remains conditional to prevent errors */}
                      {motifsWithNames.map(motif => (
                        <option key={motif._id} value={motif._id}>
                          {motif.displayName}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
          <Card>
            <Card.Header as="h5">Fulfillment Details</Card.Header>
              <ListGroup variant="flush" style={{ height: '80vh', overflowY: 'auto' }}>
                {fulfillmentData.map((fulfill, index) => {
                  
                  // --- THIS IS THE FIX (Type-Safe Variable Declarations) ---
                  const assigned = fulfill.assignedItem || {};
                  const isCustomSlot = !!fulfill.isCustom;

                  let isInventoryItem = false;
                  let customItemHasData = false;
                  let variation = '';
                  let imageUrl = 'https://placehold.co/80x80/e9ecef/adb5bd?text=N/A';

                  // Type Guard for Inventory Item
                  if (assigned && 'itemId' in assigned) {
                      isInventoryItem = true;
                      variation = assigned.variation || '';
                      imageUrl = assigned.imageUrl || imageUrl;
                  }
                  // Type Guard for Custom Item
                  else if (assigned && 'outfitCategory' in assigned) {
                      customItemHasData = true;
                      // You could use a reference image if available
                      imageUrl = assigned.referenceImages?.[0] || 'https://placehold.co/80x80/6c757d/white?text=Custom';
                  }
                  // -------------------------------------------------------------

                  return (
                    <ListGroup.Item key={index}>
                      <Row className="align-items-center g-3">
                        <Col>
                          <strong>{fulfill.role}</strong>
                          <Form.Control size="sm" type="text" placeholder="Enter Wearer's Name" value={fulfill.wearerName || ''} onChange={e => handleWearerNameChange(index, e.target.value)} className="mt-1"/>
                        </Col>
                        <Col md="auto" className="text-center">
                          <BsImage src={imageUrl} rounded style={{width: 80, height: 80, objectFit: 'cover'}}/>
                        </Col>
                        <Col>
                          <div>{assigned.name || 'Not Assigned'}</div>
                          {isInventoryItem && <div className="text-muted small">{variation}</div>}
                          {customItemHasData && <div className="text-info small fst-italic">Custom Details Added</div>}
                          {isCustomSlot && !customItemHasData && <div className="text-info small fst-italic">Custom Tailoring Slot</div>}
                        </Col>
                        <Col md="auto" className="text-end">
                          {fulfill.isCustom ? (
                              // For a custom role, we call the handler that opens our new CreateEditCustomItemModal
                              <Button 
                                  variant={"outfitCategory" in fulfill.assignedItem ? "outline-success" : "outline-info"} 
                                  size="sm" 
                                  onClick={() => handleOpenCustomItemModal(index)}
                              >
                                  <PlusCircle className="me-1"/> 
                                  {/* The text changes if the item details have been filled out */}
                                  {"outfitCategory" in fulfill.assignedItem ? 'Edit Details' : 'Create Item'}
                              </Button>
                          ) : (
                              // For a standard role, we call the handler for the inventory assignment modal
                              <Button 
                                  variant="outline-primary" 
                                  size="sm" 
                                  onClick={() => handleOpenAssignmentModal(index)}
                              >
                                  <PencilSquare className="me-1"/> 
                                  {"itemId" in fulfill.assignedItem ? 'Change' : 'Assign'}
                              </Button>
                          )}
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
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
        <Modal.Body>This customer has a rental "To Process". Are you sure you want to create a separate new rental transaction?</Modal.Body>
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
