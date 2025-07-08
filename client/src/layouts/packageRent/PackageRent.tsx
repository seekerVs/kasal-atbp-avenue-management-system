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
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import CustomerDetailsCard from '../../components/CustomerDetailsCard';

import {
  Package,
  InventoryItem,
  CustomerInfo,
  RentalOrder,
  PackageFulfillment,
  MeasurementRef,
  CustomTailoringItem
} from '../../types';
import AssignmentSubModal from '../../components/modals/assignmentSubModal/AssignmentSubModal';
import CreateEditCustomItemModal from '../../components/modals/createEditCustomItemModal/CreateEditCustomItemModal';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../services/api';

const initialCustomerDetails: CustomerInfo = { name: '', phoneNumber: '', email: '', address: '' };

// ===================================================================================
// --- MAIN COMPONENT ---
// ===================================================================================
function PackageRent() {
  const navigate = useNavigate();
  const { addNotification } = useNotification(); 

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
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inventoryMap = useMemo(() => {
    return allInventory.reduce((map, item) => {
      map[item._id] = item;
      return map;
    }, {} as Record<string, InventoryItem>);
  }, [allInventory]);
  
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
        setAllInventory(inventoryRes.data || []);
        setAllRentals(rentalsRes.data || []);
        setMeasurementRefs(refsRes.data || []);
      } catch (err) {
        console
        addNotification("Failed to load initial data.","danger")
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const selectedPackage = useMemo(() => allPackages.find(p => p._id === selectedPackageId), [selectedPackageId, allPackages]);
  const selectedMotif = useMemo(() => selectedPackage?.colorMotifs.find(m => m._id === selectedMotifId), [selectedPackage, selectedMotifId]);

  // In PackageRent.tsx...

useEffect(() => {
    if (!selectedPackage) {
        setFulfillmentData([]);
        return;
    }
    
    let initialFulfillment: PackageFulfillment[] = [];

    // --- Path 1: A pre-defined Color Motif is selected ---
    if (selectedMotif) {
        initialFulfillment = selectedMotif.assignments.map(assignment => {
            // Check the template from the database package definition
            if (assignment.isCustom) {
                // If the template marks it as custom, create a state object with isCustom: true
                return {
                    role: assignment.role,
                    wearerName: '',
                    assignedItem: { name: `${selectedPackage.name.split(',')[0]}: ${assignment.role}` },
                    isCustom: true // Set the flag to true
                };
            } else {
                // This is a standard inventory role defined in the motif
                return {
                    role: assignment.role,
                    wearerName: '',
                    assignedItem: assignment.itemId 
                        ? { itemId: assignment.itemId, name: inventoryMap[assignment.itemId]?.name || 'Unknown Item' } 
                        : {},
                    isCustom: false // Explicitly set the flag to false
                };
            }
        });
    } 
    // --- Path 2: No motif selected (Manual Assignment) ---
    else {
        // We assume that roles generated from the generic 'inclusions' list are NEVER custom.
        initialFulfillment = selectedPackage.inclusions.flatMap(inclusion => {
            const match = inclusion.match(/^(\d+)\s+(.*)$/);
            if (match) {
                const quantity = parseInt(match[1], 10);
                const roleBase = match[2];
                // For roles like "2 Bridesmaids", create multiple objects
                return Array.from({ length: quantity }, (_, i) => ({ 
                    role: `${roleBase} ${i + 1}`, 
                    wearerName: '', 
                    assignedItem: {},
                    isCustom: false // CRITICAL: Explicitly set the flag to false
                }));
            }
            // For roles like "1 Gown", create a single object
            return { 
                role: inclusion, 
                wearerName: '', 
                assignedItem: {}, 
                isCustom: false // CRITICAL: Explicitly set the flag to false
            };
        });
    }

    setFulfillmentData(initialFulfillment);
  }, [selectedPackage, selectedMotif, inventoryMap]);


  const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPackageId(e.target.value);
    setSelectedMotifId('');
  };

  const handleCustomerDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomerDetails(prev => ({ ...prev, [name]: value }));
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
        addNotification("Please select a package.", 'danger');
        console.error("No package selected.");
        return;
    }
    if (!customerDetails.name.trim() || !customerDetails.phoneNumber.trim()) {
        addNotification("Customer Name and Phone Number are required.", 'danger');
        console.error("Customer details are incomplete.");
        return;
    }

    // --- REVISED VALIDATION LOGIC ---
    const isFulfillmentIncomplete = fulfillmentData.some(fulfill => {
        const assigned = fulfill.assignedItem;

        if (assigned && 'outfitCategory' in assigned) {
            return false;
        }

        if (!assigned || !assigned.itemId || !assigned.variation) {
            return true; // This role IS incomplete.
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

  const createNewRental = async () => {
    setShowReminderModal(false);
    if (!selectedPackage) return;
    setIsSubmitting(true);

    // 1. Get the processed data
    const { finalPackageFulfillment, customItemsForRental } = buildFinalPayload();

    try {
      // 2. Construct the final API payload
      const rentalPayload = { 
        customerInfo: [customerDetails],
        packageRents: [{ // The payload is now structured exactly like the DB
            name: `${selectedPackage.name},${selectedMotif?.motifName || 'Manual'}`,
            price: selectedPackage.price,
            quantity: 1, // Assuming quantity of 1 for packages for now
            imageUrl: selectedPackage.imageUrl,
            packageFulfillment: finalPackageFulfillment
        }],
        customTailoring: customItemsForRental
      };

      const response = await api.post('/rentals', rentalPayload);
      addNotification("New rental created successfully! Redirecting...", 'success'); // Using global notification
      console.log("RESPONSE FROM /rentals:", response.data);
      setTimeout(() => navigate(`/rentals/${response.data._id}`), 1500);
    } catch (apiError: any) {
      addNotification(apiError.response?.data?.message || "Failed to create package rental.", 'danger');
      console.error("API Error:", apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildFinalPayload = () => {
    // This array will hold the full CustomTailoringItem objects for the top-level DB array.
    const customItemsForRental: CustomTailoringItem[] = [];
    const finalPackageFulfillment = fulfillmentData.map(fulfill => {
        if (fulfill.isCustom) {
            const assigned = fulfill.assignedItem;
            if (assigned && 'outfitCategory' in assigned) {
                customItemsForRental.push(assigned as CustomTailoringItem);
            }
            return {
                role: fulfill.role,
                wearerName: fulfill.wearerName,
                assignedItem: {
                    name: assigned?.name || `${selectedPackage?.name.split(',')[0]}: ${fulfill.role}`
                },
                isCustom: true // CRITICAL: Persist this flag to the database.
            };

        } else {
            return fulfill;
        }
    });
    return {
        finalPackageFulfillment,
        customItemsForRental
    };
  };

  const handleAddItemToExistingRental = async () => {
    if (!existingOpenRental || !selectedPackage) { 
        addNotification("No package selected or no existing rental found.", 'danger'); 
        console.error("No package selected or no existing rental found.");
        return; 
    }
    setIsSubmitting(true);

    // 1. Get the processed data
    const { finalPackageFulfillment, customItemsForRental } = buildFinalPayload();

    try {
      // 2. Construct the final API payload for adding items
      const payload = { 
        packageRents: [{
            name: `${selectedPackage.name},${selectedMotif?.motifName || 'Manual'}`,
            price: selectedPackage.price,
            quantity: 1,
            imageUrl: selectedPackage.imageUrl,
            packageFulfillment: finalPackageFulfillment
        }],
        customTailoring: customItemsForRental
      };
      console.log("hiii")
      console.log("SENDING THIS PAYLOAD TO /addItem:", JSON.stringify(payload, null, 2));

      await api.put(`/rentals/${existingOpenRental._id}/addItem`, payload);
      
      // Reset form and show success
      setModalData({ rentalId: existingOpenRental._id, itemName: selectedPackage.name });
      setShowSuccessModal(true);
      setSelectedPackageId('');
      setSelectedMotifId('');
      setFulfillmentData([]);
    } catch (apiError: any) {
      addNotification(apiError.response?.data?.message || "Failed to add item to rental.", 'danger');
      console.error("API Error:", apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAssignmentModal = (fulfillmentIndex: number) => { setAssignmentContext({ fulfillmentIndex }); setShowAssignmentModal(true); };
  
  const handleSaveAssignment = (data: { itemId: string; name: string; variation: string; imageUrl: string }) => {
    if (assignmentContext === null) return;
    const { fulfillmentIndex } = assignmentContext;
    const newFulfillmentData = [...fulfillmentData];

    // The data object from the modal now contains everything we need.
    newFulfillmentData[fulfillmentIndex].assignedItem = {
      itemId: data.itemId,
      name: data.name,
      variation: data.variation,
      imageUrl: data.imageUrl
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
        <Col lg={7} xl={8}>
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
                      {selectedPackage?.colorMotifs.map(motif => (
                        <option key={motif._id} value={motif._id}>
                          {motif.motifName}
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
              <ListGroup variant="flush" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
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
        <Col lg={5} xl={4}>
            <CustomerDetailsCard
                customerDetails={customerDetails}
                onCustomerDetailChange={handleCustomerDetailChange}
                isNewCustomerMode={isNewCustomerMode}
                onSetIsNewCustomerMode={setIsNewCustomerMode}
                allRentals={allRentals}
                onSelectExisting={handleSelectCustomer}
                onSubmit={validateAndProceed}
                isSubmitting={isSubmitting}
                canSubmit={!!selectedPackageId && !!customerDetails.name}
                existingOpenRental={existingOpenRental}
                selectedRentalForDisplay={selectedRentalForDisplay}
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
        />
      )}

      {assignmentContext !== null && 
        <AssignmentSubModal // <-- Change name if you haven't already
            show={showAssignmentModal}
            onHide={() => setShowAssignmentModal(false)}
            onAssign={handleSaveAssignment}
            inventory={allInventory}
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