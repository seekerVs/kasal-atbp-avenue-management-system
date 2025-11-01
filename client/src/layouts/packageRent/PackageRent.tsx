// src/pages/PackageRent.tsx

import { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Spinner,
  Image as BsImage,
  Modal,
  Form,
} from 'react-bootstrap';
import {
  BoxSeam,
  CalendarEvent,
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
import api, { uploadFile } from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import namer from 'color-namer';
import { PackageFulfillmentForm } from '../../components/forms/packageFulfillmentForm/PackageFulfillmentForm';
import { PackageSelectionData, PackageSelectionModal } from '../../components/modals/packageSelectionModal/PackageSelectionModal';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import { AvailabilityConflictModal } from '../../components/modals/availabilityConflictModal/AvailabilityConflictModal';

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
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedMotifId, setSelectedMotifId] = useState<string>('');
  const [showPackageSelectionModal, setShowPackageSelectionModal] = useState(false);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allRentals, setAllRentals] = useState<RentalOrder[]>([]);
  const [measurementRefs, setMeasurementRefs] = useState<MeasurementRef[]>([]);
  const [fulfillmentData, setFulfillmentData] = useState<PackageFulfillment[]>([]);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemContext, setCustomItemContext] = useState<{ 
    index: number; 
    item: CustomTailoringItem | null;
    itemName: string; // <-- ADD THIS LINE
  } | null>(null);

  const [customerDetails, setCustomerDetails] = useState<CustomerInfo>(initialCustomerDetails);
  const [selectedRentalForDisplay, setSelectedRentalForDisplay] = useState<RentalOrder | null>(null);
  
  // UI & Modal State
  const [assignmentContext, setAssignmentContext] = useState<{ 
    fulfillmentIndex: number;
    itemToEdit?: InventoryItem;
  } | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showIncompleteFulfillmentModal, setShowIncompleteFulfillmentModal] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDateChangeWarning, setShowDateChangeWarning] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<Date | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<Map<string, File[]>>(new Map());
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingItems, setConflictingItems] = useState([]);

  const selectedMotif = useMemo(() => {
    if (!selectedPackage || !selectedMotifId) return null;
    return selectedPackage.colorMotifs.find(m => m._id === selectedMotifId);
  }, [selectedPackage, selectedMotifId]);

  const isCustomerInfoValid = useMemo(() => {
    return customerDetails.name.trim() !== '' && /^09\d{9}$/.test(customerDetails.phoneNumber);
  }, [customerDetails]);
  
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
        const [inventoryRes, rentalsRes, refsRes, unavailableRes] = await Promise.all([
          api.get('/inventory?limit=1000'),
          api.get('/rentals'),
          api.get('/measurementrefs'),
          api.get('/unavailability')
        ]);
        setAllInventory(inventoryRes.data.items || []);
        setAllRentals(rentalsRes.data || []);
        setMeasurementRefs(refsRes.data || []);
        setUnavailableDates(unavailableRes.data.map((rec: { date: string }) => new Date(rec.date)));
      } catch (err) {
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
                        imageUrl: variationDetails?.imageUrls[0] || itemDetails.variations[0]?.imageUrls[0],
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
      
      // --- THIS IS THE CORRECTED LOGIC ---
      let finalAssignedItem: NormalizedFulfillmentItem['assignedItem'] = {};

      if ('outfitCategory' in assigned) {
        // This is a CustomTailoringItem. We know `assigned` has the correct shape.
        finalAssignedItem = {
          ...assigned, // Spread all properties from the custom item
          imageUrl: assigned.referenceImages?.[0], // Directly set the imageUrl for display
        };
      } else if ('itemId' in assigned) {
        // This is a standard inventory item.
        finalAssignedItem = assigned;
      }
      
      return {
        role: fulfill.role,
        wearerName: fulfill.wearerName,
        isCustom: fulfill.isCustom ?? false,
        assignedItem: finalAssignedItem,
      };
      // --- END OF CORRECTED LOGIC ---
    });
  }, [fulfillmentData]);

  const handlePackageSelect = (selection: PackageSelectionData) => {
    setSelectedPackage(selection.pkg);
    const firstMotifId = selection.pkg.colorMotifs?.[0]?._id;
    setSelectedMotifId(selection.motifId || firstMotifId || '');
    setShowPackageSelectionModal(false);
  };

  const isSelectableDate = (date: Date): boolean => {
    const day = date.getDay();
    if (day === 0) { // Disable Sundays
      return false;
    }
    const isUnavailable = unavailableDates.some(
      (unavailableDate) => new Date(unavailableDate).toDateString() === date.toDateString()
    );
    return !isUnavailable;
  };

  const handleDateChangeRequest = (newDate: Date | null) => {
    if (!newDate) {
      setPendingDateChange(null);
      setShowDateChangeWarning(true);
      return;
    }
    
    const hasItems = !!selectedPackage; // Check if a package is selected
    const currentDateString = targetDate ? format(targetDate, 'yyyy-MM-dd') : '';
    const newDateString = format(newDate, 'yyyy-MM-dd');

    if (newDateString !== currentDateString && hasItems) {
      setPendingDateChange(newDate);
      setShowDateChangeWarning(true);
    } else {
      setTargetDate(newDate);
    }
  };

  const handleConfirmDateChange = () => {
    setTargetDate(pendingDateChange);
    // Reset the package and fulfillment data
    setSelectedPackage(null);
    setSelectedMotifId('');
    setFulfillmentData([]);
    
    setShowDateChangeWarning(false);
    setPendingDateChange(null);
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

  const handleSaveCustomItem = (updatedItem: CustomTailoringItem, pendingFiles?: File[]) => {
    if (customItemContext === null) return;
    const { index } = customItemContext;

    if (!updatedItem._id) {
      updatedItem._id = uuidv4();
    }
    const customItemId = updatedItem._id;

    if (pendingFiles && pendingFiles.length > 0) {
      setStagedFiles(prev => {
        const newMap = new Map(prev);
        newMap.set(customItemId, pendingFiles);
        return newMap;
      });
    }

    const newFulfillmentData = [...fulfillmentData];
    newFulfillmentData[index].assignedItem = updatedItem;
    setFulfillmentData(newFulfillmentData);

    setShowCustomItemModal(false);
    setCustomItemContext(null);
  };

  const handleSelectCustomer = (selectedRental: RentalOrder) => {
    setCustomerDetails(selectedRental.customerInfo[0]);
    setSelectedRentalForDisplay(selectedRental);
  };

  const proceedWithAction = () => {
    setIsSubmitting(true);
    createNewRental();
  };

  
  const validateAndProceed = () => {
    if (!selectedPackage) {
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
        setShowIncompleteFulfillmentModal(true);
    } else {
        proceedWithAction();
    }
  };

  const buildRentalPayload = async () => {
    if (!selectedPackage || !targetDate) return null; // Add date check

    const { finalPackageFulfillment, customItemsForRental } = await buildFinalPayload(); 
    const selectedMotifObject = selectedPackage.colorMotifs.find(m => m._id === selectedMotifId);
    
    const startDate = targetDate;
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 3);

    return {
      customerInfo: [customerDetails],
      packageRents: [{
          _id: `pkg_${uuidv4()}`,
          packageId: selectedPackage._id,
          motifHex: selectedMotifObject?.motifHex,
          price: selectedPackage.price,
          quantity: 1,
          imageUrl: selectedPackage.imageUrls[0] || '',
          packageFulfillment: finalPackageFulfillment
      }],
      customTailoring: customItemsForRental,
      // --- ADD THESE NEW DATE FIELDS ---
      rentalStartDate: format(startDate, 'yyyy-MM-dd'),
      rentalEndDate: format(endDate, 'yyyy-MM-dd'),
    };
  };

  const createNewRental = async () => {
    if (!selectedPackage) return;
    setIsSubmitting(true);

    try {
      // Add 'await' here because buildFinalPayload is now async
      const rentalPayload = await buildRentalPayload();
      if (!rentalPayload) {
          addAlert("No package selected.", "danger");
          setIsSubmitting(false);
          return;
      }

      const response = await api.post('/rentals', rentalPayload);
      addAlert("New rental created successfully! Redirecting...", 'success');
      setTimeout(() => navigate(`/rentals/${response.data._id}`), 1500);
    } catch (err: any) {
      if (err.response && err.response.status === 409) {
        setConflictingItems(err.response.data.conflictingItems || []);
        setShowConflictModal(true);
        addAlert('Some package items are no longer available. Please review fulfillment.', 'danger');
      } else {
        addAlert(err.response?.data?.message || "Failed to create package rental.", 'danger');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildFinalPayload = async () => {
    // --- 1. UPLOAD STAGED FILES AND CREATE A URL MAP ---
    const uploadedUrlMap = new Map<string, string[]>();
    
    if (stagedFiles.size > 0) {
      addAlert('Uploading reference images...', 'info');

      // Create an array of upload promises
      const uploadPromises = Array.from(stagedFiles.entries()).map(async ([customItemId, files]) => {
        const fileUploadPromises = files.map(file => uploadFile(file));
        const urls = await Promise.all(fileUploadPromises);
        uploadedUrlMap.set(customItemId, urls);
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
    }

    // --- 2. PREPARE THE FINAL PAYLOAD ---
    const customItemsForRental: CustomTailoringItem[] = [];
    
    const finalPackageFulfillment = fulfillmentData.map(fulfill => {
      if (fulfill.isCustom) {
        const assigned = fulfill.assignedItem;

        if (assigned && 'outfitCategory' in assigned) {
          const customItem = assigned as CustomTailoringItem;
          const customItemId = customItem._id;
          
          // Get the newly uploaded URLs for this specific item from our map
          const newImageUrls = uploadedUrlMap.get(customItemId);
          
          // Get existing URLs that were not replaced
          const existingImageUrls = customItem.referenceImages.filter(img => typeof img === 'string' && !img.startsWith('placeholder_'));
          
          // Combine them to create the final list of image URLs
          const finalImages = newImageUrls ? [...existingImageUrls, ...newImageUrls] : existingImageUrls;

          const finalCustomItem: CustomTailoringItem = {
            ...customItem,
            referenceImages: finalImages, // Replace placeholders with real URLs
          };
          
          customItemsForRental.push(finalCustomItem);

          return {
            role: fulfill.role,
            wearerName: fulfill.wearerName,
            assignedItem: { itemId: customItemId },
            isCustom: true,
          };
        }
        // Handle empty custom slots
        return {
          role: fulfill.role,
          wearerName: fulfill.wearerName,
          assignedItem: { name: `${selectedPackage?.name.split(',')[0]}: ${fulfill.role}` },
          isCustom: true,
        };
      }
      // Return standard items as-is
      return fulfill;
    });

    return {
      finalPackageFulfillment,
      customItemsForRental,
    };
  };

  const handleOpenAssignmentModal = (fulfillmentIndex: number) => {
    const fulfillItem = fulfillmentData[fulfillmentIndex];
    const assigned = fulfillItem.assignedItem as { itemId?: string };

    if (assigned && assigned.itemId) {
      const itemToEdit = allInventory.find(item => item._id === assigned.itemId);
      if (itemToEdit) {
        setAssignmentContext({ fulfillmentIndex, itemToEdit });
      } else {
        setAssignmentContext({ fulfillmentIndex });
      }
    } else {
      setAssignmentContext({ fulfillmentIndex });
    }
    
    setShowAssignmentModal(true);
  };
  
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
      imageUrl: variation.imageUrls[0] || ''
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
        {/* --- LEFT COLUMN: DATE, PACKAGE, & FULFILLMENT --- */}
        <Col lg={6} xl={7}>
          {/* Step 2: Select Rental Date */}
          <Card className="mb-4">
            <Card.Header as="h5">
              <CalendarEvent className="me-2" />Select Rental Start Date
            </Card.Header>
            <Card.Body>
              <Form.Group>
                <Form.Label>The 4-day rental period will begin on this date.</Form.Label>
                <DatePicker
                  selected={targetDate}
                  onChange={handleDateChangeRequest}
                  minDate={new Date()}
                  className="form-control"
                  placeholderText={!isCustomerInfoValid ? "Select customer details first..." : "Click to select a date..."}
                  isClearable
                  dateFormat="MMMM d, yyyy"
                  wrapperClassName="w-100"
                  disabled={!isCustomerInfoValid}
                  filterDate={isSelectableDate}
                />
              </Form.Group>
            </Card.Body>
          </Card>

          {/* Step 3 & 4: Select Package and Fulfillment */}
          <Card>
              <Card.Header as="h5"><BoxSeam className="me-2" />Select Package &amp; Fulfillment</Card.Header>
              <Card.Body>
                {selectedPackage ? (
                  <div>
                    <Row className="g-3 align-items-center">
                      <Col xs="auto">
                        <BsImage 
                          src={selectedPackage.imageUrls[0] || 'https://placehold.co/120x150'} 
                          style={{ width: '120px', height: '150px', objectFit: 'cover', borderRadius: '0.375rem' }} 
                        />
                      </Col>
                      <Col>
                        <h5 className="mb-1">{selectedPackage.name}</h5>
                        <p className="text-danger fw-bold fs-5 mb-2">₱{selectedPackage.price.toLocaleString()}</p>
                        <Form.Group>
                          <Form.Label className="small fw-bold"><Palette className="me-2"/>Motif</Form.Label>
                          <Form.Select size="sm" value={selectedMotifId} onChange={e => setSelectedMotifId(e.target.value)}>
                            {selectedPackage.colorMotifs.map(motif => (
                              <option key={motif._id} value={motif._id}>
                                {getMotifName(motif.motifHex)}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <div className="d-grid mt-3">
                      <Button variant="outline-secondary" onClick={() => setShowPackageSelectionModal(true)}>
                        Change Package...
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <p className="text-muted fs-5">No package has been selected.</p>
                    <Button variant="primary" onClick={() => setShowPackageSelectionModal(true)} disabled={!targetDate}>
                      Select a Package
                    </Button>
                  </div>
                )}
              </Card.Body>
              {fulfillmentData.length > 0 && (
                  <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                      <PackageFulfillmentForm
                        mode="rental"
                        fulfillmentData={normalizedDataForForm}
                        onWearerNameChange={handleWearerNameChange}
                        onOpenAssignmentModal={handleOpenAssignmentModal}
                        onOpenCustomItemModal={handleOpenCustomItemModal}
                        onClearAssignment={handleClearAssignment}
                        errors={[]}
                      />
                  </div>
              )}
            </Card>
        </Col>

        {/* --- RIGHT COLUMN: CUSTOMER DETAILS --- */}
        <Col lg={6} xl={5}>
          <CustomerDetailsCard
              customerDetails={customerDetails}
              setCustomerDetails={setCustomerDetails}
              allRentals={allRentals}
              onSelectExisting={handleSelectCustomer}
              onSubmit={validateAndProceed}
              isSubmitting={isSubmitting}
              canSubmit={isCustomerInfoValid && !!targetDate && !!selectedPackage}
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
        targetDate={targetDate}
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
          uploadMode="deferred"
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
          initialSelectedItem={assignmentContext.itemToEdit}
        />
      }

      <AvailabilityConflictModal
        show={showConflictModal}
        onHide={() => setShowConflictModal(false)}
        conflictingItems={conflictingItems}
      />

      <Modal show={showIncompleteFulfillmentModal} onHide={() => setShowIncompleteFulfillmentModal(false)} centered>
        <Modal.Header closeButton>
            <Modal.Title><ExclamationTriangleFill className="me-2 text-warning" />Incomplete Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>Some roles have not been assigned an item and variation. Are you sure you want to proceed?</Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowIncompleteFulfillmentModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => {
                setShowIncompleteFulfillmentModal(false);
                proceedWithAction(); // Call the simplified function directly
            }}>
                Proceed Anyway
            </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDateChangeWarning} onHide={() => setShowDateChangeWarning(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <ExclamationTriangleFill className="me-2 text-warning" />
            Change Rental Date?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Changing the rental date will clear your currently selected package and all fulfillment details. This is to ensure package availability can be re-verified for the new date.</p>
          <p className="mb-0">Are you sure you want to proceed?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDateChangeWarning(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleConfirmDateChange}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default PackageRent;
