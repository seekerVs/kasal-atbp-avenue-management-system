import React, { useState, useEffect, useMemo, useRef } from "react";
import { Container, Row, Col, Form, Button, Card, Spinner, Modal, Alert } from 'react-bootstrap';
import { ClipboardCheck, ExclamationTriangleFill } from 'react-bootstrap-icons';
import { useNavigate } from "react-router-dom";

import CustomerDetailsCard from "../../components/CustomerDetailsCard";
import { MeasurementRef, CustomerInfo, RentalOrder, CustomTailoringItem, FormErrors } from '../../types';

import { MultiImageDropzoneRef } from "../../components/multiImageDropzone/MultiImageDropzone";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import { v4 as uuidv4 } from 'uuid';
import ConfirmationModal from "../../components/modals/confirmationModal/ConfirmationModal";
import { CustomItemForm } from "../../components/forms/customItemForm/CustomItemForm";

// --- INITIAL STATE & CONSTANTS ---
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

const initialTailoringData: CustomTailoringItem = {
  _id: '', // Add the missing _id property for new items
  name: '',
  price: 0,
  quantity: 1,
  notes: '',
  tailoringType: 'Tailored for Purchase',
  materials: [''],
  designSpecifications: '', 
  referenceImages: [],
  outfitCategory: '',
  outfitType: '',
  measurements: {},
};

// ===================================================================================
// --- MAIN RENT COMPONENT ---
// ===================================================================================
function CustomRent() {
  const navigate = useNavigate();
  const { addAlert } = useAlert();

  // --- State Management ---
  const [measurementRefs, setMeasurementRefs] = useState<MeasurementRef[]>([]);
  const [allRentals, setAllRentals] = useState<RentalOrder[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRefId, setSelectedRefId] = useState<string>('');
  
  const [tailoringData, setTailoringData] = useState(initialTailoringData);

  const [isNewCustomerMode, setIsNewCustomerMode] = useState(true);
  const [existingOpenRental, setExistingOpenRental] = useState<RentalOrder | null>(null);
  const [selectedRentalForDisplay, setSelectedRentalForDisplay] = useState<RentalOrder | null>(null);
  const [showZeroPriceModal, setShowZeroPriceModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<'create' | 'add' | null>(null);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropzoneRef = useRef<MultiImageDropzoneRef>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [customerDetails, setCustomerDetails] = useState<CustomerInfo>(initialCustomerDetails);
  
  // --- Data Fetching Effect ---
  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const [refsRes, rentalsRes] = await Promise.all([
                api.get('/measurementrefs'),
                api.get('/rentals'),
            ]);
            setMeasurementRefs(refsRes.data || []);
            setAllRentals(rentalsRes.data || []);
        } catch (err) { 
            addAlert("Failed to load initial data.", "danger");
        } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const uniqueCategories = useMemo(() => Array.from(new Set(measurementRefs.map(ref => ref.category))), [measurementRefs]);
  const filteredOutfits = useMemo(() => measurementRefs.filter(ref => ref.category === selectedCategory), [selectedCategory, measurementRefs]);
  const selectedRef = measurementRefs.find(ref => ref._id === selectedRefId);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTailoringData(prev => ({ ...prev, [name]: (name === 'price' || name === 'quantity') ? parseFloat(value) || 0 : value }));
  };
  
  const handleMeasurementChange = (field: string, value: string) => {
    setTailoringData(prev => ({ ...prev, measurements: { ...prev.measurements, [field]: value } }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => { 
    setSelectedCategory(e.target.value); 
    setSelectedRefId(''); 
    setTailoringData(prev => ({ ...prev, measurements: {} })); 
  };
  
  const handleRefChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRefId = e.target.value;
    setSelectedRefId(newRefId);
    const ref = measurementRefs.find(r => r._id === newRefId);
    if(ref) { 
        setTailoringData(prev => ({ 
            ...prev, 
            name: ref.outfitName,
            outfitCategory: ref.category,
            outfitType: ref.outfitName,
            measurements: {} // Clear previous measurements
        })); 
    }
  };

  const handleSelectCustomer = (selectedRental: RentalOrder) => {
    setCustomerDetails(selectedRental.customerInfo[0]); // This is the correct state to update
    setSelectedRentalForDisplay(selectedRental);
    setExistingOpenRental(selectedRental.status === 'Pending' ? selectedRental : null);
  };
  
  const handleDynamicListChange = (listType: 'materials', index: number, value: string) => {
    setTailoringData(prev => {
      const newList = [...prev[listType]];
      newList[index] = value;
      return { ...prev, [listType]: newList };
    });
  };

  const addDynamicListItem = (listType: 'materials') => {
    setTailoringData(prev => ({ ...prev, [listType]: [...prev[listType], ''] }));
  };

  const removeDynamicListItem = (listType: 'materials', index: number) => {
  setTailoringData(prev => {
    const newList = prev[listType].filter((_, i) => i !== index);
    return { ...prev, [listType]: newList };
  });
};

  const buildPayload = async () => {
    const uploadedUrls = await dropzoneRef.current?.uploadAll();
    return {
      customerInfo: [customerDetails],
      customTailoring: [{ 
          ...tailoringData, // The state is now the complete object
          _id: uuidv4(),
          referenceImages: uploadedUrls || [],
      }]
    };
  };

  const handleFormSubmission = (action: 'create' | 'add') => {
    const { hasErrors, warnings: newWarnings } = checkForIssues();

    if (hasErrors) {
      return; // Stop on hard validation errors
    }

    // Store the action for later use by the modals
    setPendingAction(action);

    // 1. Check for optional field warnings first.
    if (newWarnings.length > 0) {
      setWarnings(newWarnings);
      setShowWarningModal(true);
      return; // STOP execution. The warning modal will handle the next step.
    }

    // 2. If no warnings, check for zero price.
    if (tailoringData.price <= 0) {
      setShowZeroPriceModal(true);
      return; // STOP execution. The price modal will handle the next step.
    }

    // 3. If there were NO warnings AND the price is > 0, execute immediately.
    executeSubmission(action);
  };

  const validateCustomerDetails = (): boolean => {
    const newErrors: FormErrors = { address: {} };
    const customer = customerDetails; // Use the customerDetails state directly

    if (!customer.name.trim()) newErrors.name = 'Customer Name is required.';
    if (!/^09\d{9}$/.test(customer.phoneNumber)) newErrors.phoneNumber = 'Phone number must be a valid 11-digit number starting with 09.';
    if (!customer.address.province) newErrors.address.province = 'Province is required.';
    if (!customer.address.city) newErrors.address.city = 'City/Municipality is required.';
    if (!customer.address.barangay) newErrors.address.barangay = 'Barangay is required.';
    if (!customer.address.street.trim()) newErrors.address.street = 'Street, House No. is required.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 1 && Object.keys(newErrors.address).length === 0;
  };

  const checkForIssues = () => {  
    const errors = [];
    const warnings = [];

    // --- Hard Validations (Errors) ---
    if (!validateCustomerDetails()) {
      errors.push("Please fill in all required customer details (*).");
    }
    if (!selectedRefId || !selectedRef) { errors.push("Please select an Outfit Category and Type."); }

    // --- Soft Validations (Warnings) ---
    if (tailoringData.materials.every(m => m.trim() === '')) { 
        warnings.push("Materials"); 
    }
    if (!tailoringData.designSpecifications.trim()) { 
        warnings.push("Design Specifications"); 
    }
    const hasImages = (dropzoneRef.current?.getFiles() ?? []).length > 0;
    if (!hasImages) { 
        warnings.push("Reference Images"); 
    }

    let anyMeasurementMissing = false;
    if (selectedRef) { // Only check if an outfit type is selected
        for (const measurement of selectedRef.measurements) {
            const value = tailoringData.measurements[measurement];
            // A measurement is considered missing if it's not provided or is an empty string.
            if (value === undefined || value === null || String(value).trim() === '') {
                anyMeasurementMissing = true;
                break; // Found one, no need to check the rest for the warning.
            }
        }
    }
    if (anyMeasurementMissing) {
        warnings.push("Measurements");
    }
    // Display hard errors immediately
    if (errors.length > 0) {
        addAlert(errors.join(' '), 'danger');
    }

    return { hasErrors: errors.length > 0, warnings };
  };

  // We create a new helper function for the actual API call logic
  // to avoid duplicating it.
  const executeSubmission = async (action: 'create' | 'add') => {
      setIsSubmitting(true);
      try {
          const payload = await buildPayload();
          if (action === 'add' && existingOpenRental?._id) {
              await api.put(`/rentals/${existingOpenRental._id}/addItem`, payload);
              addAlert("Custom item added successfully! Redirecting...", "success");
              setTimeout(() => navigate(`/rentals/${existingOpenRental._id}`), 1500);
          } else {
              const response = await api.post('/rentals', payload);
              addAlert("Custom rental created successfully! Redirecting...", "success");
              setTimeout(() => navigate(`/rentals/${response.data._id}`), 1500);
          }
      } catch (err: any) {
          addAlert(err.response?.data?.message || "Failed to pending request.", 'danger');
      } finally {
          setIsSubmitting(false);
      }
  }

  if (loading) return <div className="text-center py-5"><Spinner /></div>;

  return (
    <Container fluid>
      <h2 className="mb-4">New Custom Tailoring</h2>
      <Row className="g-4">
        <Col lg={6} xl={7}>
            <Card>
                <Card.Header as="h5" className="d-flex align-items-center"><ClipboardCheck className="me-2"/>Outfit Details</Card.Header>
                <Card.Body>
                    {selectedRef ? (
                      <CustomItemForm
                          formData={tailoringData}
                          measurementRefs={measurementRefs}
                          selectedCategory={selectedCategory}
                          selectedRefId={selectedRefId}
                          errors={{}} // We will wire up a proper error state later if needed
                          isCreateMode={true}
                          onInputChange={handleInputChange}
                          onCategoryChange={handleCategoryChange}
                          onRefChange={handleRefChange}
                          onMeasurementChange={handleMeasurementChange}
                          onDynamicListChange={handleDynamicListChange}
                          onAddDynamicListItem={addDynamicListItem}
                          onRemoveDynamicListItem={removeDynamicListItem}
                          dropzoneRef={dropzoneRef}
                      />
                  ) : (
                      // This is the initial state before an outfit type is chosen
                      <Row>
                          <Col md={6}>
                              <Form.Group className="mb-3">
                                  <Form.Label>Outfit Category <span className="text-danger">*</span></Form.Label>
                                  <Form.Select value={selectedCategory} onChange={handleCategoryChange} required>
                                      <option value="">-- Select a Category --</option>
                                      {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                  </Form.Select>
                              </Form.Group>
                          </Col>
                          <Col md={6}>
                              <Form.Group className="mb-3">
                                  <Form.Label>Outfit Type <span className="text-danger">*</span></Form.Label>
                                  <Form.Select value={selectedRefId} onChange={handleRefChange} disabled={!selectedCategory} required>
                                      <option value="">-- Select an Outfit Type --</option>
                                      {filteredOutfits.map(ref => <option key={ref._id} value={ref._id}>{ref.outfitName}</option>)}
                                  </Form.Select>
                              </Form.Group>
                          </Col>
                          {/* Optional: Add a placeholder message */}
                          {!selectedCategory && (
                              <Col xs={12}>
                                  <Alert variant="info" className="text-center">
                                      Please select an Outfit Category and Type to begin entering details.
                                  </Alert>
                              </Col>
                          )}
                      </Row>
                  )}
                </Card.Body>
            </Card>
        </Col>
        
        <Col lg={6} xl={5}>
          <CustomerDetailsCard 
            customerDetails={customerDetails}
            setCustomerDetails={setCustomerDetails}
            isNewCustomerMode={isNewCustomerMode}
            onSetIsNewCustomerMode={setIsNewCustomerMode}
            allRentals={allRentals}
            onSelectExisting={handleSelectCustomer}
            onSubmit={handleFormSubmission}
            isSubmitting={isSubmitting}
            canSubmit={!!selectedRefId}
            existingOpenRental={existingOpenRental}
            selectedRentalForDisplay={selectedRentalForDisplay}
            errors={errors}
          />
        </Col>
      </Row>

      <Modal show={showZeroPriceModal} onHide={() => setShowZeroPriceModal(false)} centered>
        <Modal.Header closeButton><Modal.Title><ExclamationTriangleFill className="me-2 text-warning" />Confirm Price</Modal.Title></Modal.Header>
        <Modal.Body>The price for this item is set to ₱0.00. Are you sure you want to proceed with this price?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowZeroPriceModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => { 
            setShowZeroPriceModal(false); 
            if (pendingAction) {
              // Call the new helper function with the stored action string
              executeSubmission(pendingAction); 
            }
          }}>
            Yes, Proceed
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmationModal
        show={showWarningModal}
        onHide={() => setShowWarningModal(false)}
        onConfirm={() => {
            setShowWarningModal(false); // Hide the current modal.
            if (!pendingAction) return;
            // The user has approved the warnings, now check for zero price.
            if (tailoringData.price <= 0) {
                setShowZeroPriceModal(true); // Show the next modal in the sequence.
            } else {
                executeSubmission(pendingAction); // No more checks needed, execute.
            }
        }}
        title="Missing Optional Details"
        warnings={warnings}
      />

    </Container>
  );
}

export default CustomRent;
