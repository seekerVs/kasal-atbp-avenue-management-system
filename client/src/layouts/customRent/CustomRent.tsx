import React, { useState, useEffect, useRef, useMemo } from "react";
import { Container, Row, Col, Button, Card, Spinner, Modal, Form } from 'react-bootstrap';
import { CalendarEvent, ClipboardCheck, ExclamationTriangleFill } from 'react-bootstrap-icons';
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

import CustomerDetailsCard from "../../components/CustomerDetailsCard";
import { MeasurementRef, CustomerInfo, RentalOrder, CustomTailoringItem, FormErrors } from '../../types';

import { MultiImageDropzoneRef } from "../../components/multiImageDropzone/MultiImageDropzone";
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import { v4 as uuidv4 } from 'uuid';
import ConfirmationModal from "../../components/modals/confirmationModal/ConfirmationModal";
import { CustomItemForm } from "../../components/forms/customItemForm/CustomItemForm";
import { useSensorData } from "../../hooks/useSensorData";
import DatePicker from "react-datepicker";

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
  fittingDate: '',
  completionDate: '',
};

// ===================================================================================
// --- MAIN RENT COMPONENT ---
// ===================================================================================
function CustomRent() {
  const navigate = useNavigate();
  const { addAlert } = useAlert();

  // --- State Management ---
  const { sensorData, isLoading, error: sensorError } = useSensorData(true);
  const [measurementRefs, setMeasurementRefs] = useState<MeasurementRef[]>([]);
  const [allRentals, setAllRentals] = useState<RentalOrder[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRefId, setSelectedRefId] = useState<string>('');
  
  const [tailoringData, setTailoringData] = useState(initialTailoringData);
  const [priceInput, setPriceInput] = useState('0');

  const [showZeroPriceModal, setShowZeroPriceModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropzoneRef = useRef<MultiImageDropzoneRef>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [customerDetails, setCustomerDetails] = useState<CustomerInfo>(initialCustomerDetails);
  const [activeMeasurementField, setActiveMeasurementField] = useState<string | null>(null);
  const [lastInsertedTimestamp, setLastInsertedTimestamp] = useState<string | null>(null)
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDateChangeWarning, setShowDateChangeWarning] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<Date | null>(null);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);

  const isCustomerInfoValid = useMemo(() => {
    return customerDetails.name.trim() !== '' && /^09\d{9}$/.test(customerDetails.phoneNumber);
  }, [customerDetails]);
  
  // --- Data Fetching Effect ---
  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            const [refsRes, rentalsRes, unavailableRes] = await Promise.all([
                api.get('/measurementrefs'),
                api.get('/rentals'),
                api.get('/unavailability') // <-- ADDED
            ]);
            setMeasurementRefs(refsRes.data || []);
            setAllRentals(rentalsRes.data || []);
            setUnavailableDates(unavailableRes.data.map((rec: { date: string }) => new Date(rec.date))); // <-- ADDED
        } catch (err) { 
            addAlert("Failed to load initial data.", "danger");
        } finally { setLoading(false); }
    };
    fetchData();
  }, [addAlert]);

  const handleInsertMeasurement = (field: string) => {
    if (sensorData && typeof sensorData.centimeters === 'number') {
      handleMeasurementChange(field, sensorData.centimeters.toFixed(2));
    } else {
      addAlert("No measurement data received from the device.", "warning");
    }
  };

  const selectedRef = measurementRefs.find(ref => ref._id === selectedRefId);

  useEffect(() => {
    const handleSensorCommand = (event: CustomEvent) => {
      if (event.detail.action === 'focusNext' && selectedRef) {
        const measurementFields = selectedRef.measurements;
        const currentActiveIndex = activeMeasurementField 
        ? measurementFields.findIndex(m => m.label === activeMeasurementField) 
        : -1;
        const nextIndex = (currentActiveIndex + 1) % measurementFields.length;
        const nextField = measurementFields[nextIndex].label;
        
        const inputElement = document.getElementById(`measurement-${nextField}`);
        inputElement?.focus();
      }
    };
    
    window.addEventListener('sensorCommand', handleSensorCommand as EventListener);
    return () => {
      window.removeEventListener('sensorCommand', handleSensorCommand as EventListener);
    };
  }, [activeMeasurementField, selectedRef]);

  useEffect(() => {
    // Check for new, valid, and un-inserted measurement data while a field is active
    if (sensorData && 
        activeMeasurementField && 
        sensorData.sensorType === 'LengthMeasurement' && 
        typeof sensorData.centimeters === 'number' &&
        sensorData.updatedAt !== lastInsertedTimestamp) {
        
      // Use the existing handler to update the form state
      handleMeasurementChange(activeMeasurementField, sensorData.centimeters.toFixed(2));
      
      // Remember the timestamp to prevent re-insertion
      setLastInsertedTimestamp(sensorData.updatedAt);
    }
  }, [sensorData, activeMeasurementField, lastInsertedTimestamp]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'price') {
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setPriceInput(value);
      }
    } else {
      setTailoringData(prev => ({
        ...prev,
        [name]: name === 'quantity' ? parseInt(value, 10) || 1 : value
      }));
    }
  };

  const handlePriceBlur = () => {
    const numericValue = parseFloat(priceInput) || 0;
    setTailoringData(prev => ({ ...prev, price: numericValue }));
    setPriceInput(String(numericValue));
  };

  const handleDateChange = (field: 'fittingDate' | 'completionDate', date: Date | null) => {
    setTailoringData(prev => ({
      ...prev,
      [field]: date ? format(date, 'yyyy-MM-dd') : '' // Store as string
    }));
  };
  
  const handleMeasurementChange = (field: string, value: string) => {
    setTailoringData(prev => ({ ...prev, measurements: { ...prev.measurements, [field]: value } }));
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
      // If the date is being cleared, just update the state.
      setTargetDate(null);
      return;
    }

    const hasItems = !!selectedRefId;
    const currentDateString = targetDate ? format(targetDate, 'yyyy-MM-dd') : '';
    const newDateString = format(newDate, 'yyyy-MM-dd');
    
    // Check if there are dates that would be cleared.
    const hasDatesToClear = !!tailoringData.fittingDate || !!tailoringData.completionDate;

    // Only show the modal if the date is changing, details are entered, AND there are dates to clear.
    if (newDateString !== currentDateString && hasItems && hasDatesToClear) {
      setPendingDateChange(newDate);
      setShowDateChangeWarning(true);
    } else {
      // Otherwise, just update the date directly without showing the modal.
      setTargetDate(newDate);
    }
  };

  const handleConfirmDateChange = () => {
    setTargetDate(pendingDateChange);

    setTailoringData(prev => ({
      ...prev,
      fittingDate: '',
      completionDate: '',
    }));

    setShowDateChangeWarning(false);
    setPendingDateChange(null);
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
    setCustomerDetails(selectedRental.customerInfo[0]);
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
    
    const payload: any = {
      customerInfo: [customerDetails],
      customTailoring: [{ 
          ...tailoringData,
          _id: uuidv4(),
          referenceImages: uploadedUrls || [],
      }]
    };

    // --- Conditionally add rental dates ---
    if (tailoringData.tailoringType === 'Tailored for Rent-Back' && targetDate) {
      const startDate = targetDate;
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 3);

      payload.rentalStartDate = format(startDate, 'yyyy-MM-dd');
      payload.rentalEndDate = format(endDate, 'yyyy-MM-dd');
    }

    return payload;
  };

  const executeSubmission = async () => {
      setIsSubmitting(true);
      try {
          const payload = await buildPayload();
          const response = await api.post('/rentals', payload);
          addAlert("Custom rental created successfully! Redirecting...", "success");
          setTimeout(() => navigate(`/rentals/${response.data._id}`), 1500);
      } catch (err: any) {
          addAlert(err.response?.data?.message || "Failed to process request.", 'danger');
      } finally {
          setIsSubmitting(false);
      }
  }

  const handleFormSubmission = () => {
      const { hasErrors, warnings: newWarnings } = checkForIssues();
      if (hasErrors) return;

      if (newWarnings.length > 0) {
        setWarnings(newWarnings);
        setShowWarningModal(true);
        return;
      }

      if (tailoringData.price <= 0) {
        setShowZeroPriceModal(true);
        return;
      }

      executeSubmission();
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

    if (!tailoringData.fittingDate) {
      errors.push("A Fitting Date is required.");
    }
    if (!tailoringData.completionDate) {
      errors.push("A Target Completion Date is required.");
    }

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
          // Use the .label property of the measurement object as the key
          const value = tailoringData.measurements[measurement.label];

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

  if (loading) return <div className="text-center py-5"><Spinner /></div>;

  return (
    <Container fluid>
      <h2 className="mb-4">New Custom Tailoring</h2>
      <Row className="g-4">
      {/* --- LEFT COLUMN: DATE & ITEM DETAILS --- */}
      <Col lg={6} xl={7}>
        {/* Step 2: Select Rental Date (Conditionally Visible) */}
        {tailoringData.tailoringType === 'Tailored for Rent-Back' && (
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
                            placeholderText={!isCustomerInfoValid ? "Fill customer details first..." : "Click to select a date..."}
                            isClearable
                            dateFormat="MMMM d, yyyy"
                            wrapperClassName="w-100"
                            disabled={!isCustomerInfoValid}
                            filterDate={isSelectableDate}
                        />
                    </Form.Group>
                </Card.Body>
            </Card>
        )}

        {/* Step 3: Outfit Details */}
        <Card>
            <Card.Header as="h5" className="d-flex align-items-center"><ClipboardCheck className="me-2"/>Outfit Details</Card.Header>
            <Card.Body>
                <CustomItemForm
                    formData={tailoringData}
                    measurementRefs={measurementRefs}
                    selectedCategory={selectedCategory}
                    priceInput={priceInput}
                    onPriceBlur={handlePriceBlur} 
                    selectedRefId={selectedRefId}
                    errors={{errors}}
                    isCreateMode={true}
                    onInputChange={handleInputChange}
                    onDateChange={handleDateChange}
                    isFittingDateDisabled={false}
                    onCategoryChange={handleCategoryChange}
                    onRefChange={handleRefChange}
                    onMeasurementChange={handleMeasurementChange}
                    onDynamicListChange={handleDynamicListChange}
                    onAddDynamicListItem={addDynamicListItem}
                    onRemoveDynamicListItem={removeDynamicListItem}
                    dropzoneRef={dropzoneRef}
                    onInsertMeasurement={handleInsertMeasurement}
                    onMeasurementFocus={setActiveMeasurementField}
                    activeMeasurementField={activeMeasurementField}
                    sensorData={sensorData}
                    isSensorLoading={isLoading}
                    sensorError={sensorError}
                />
            </Card.Body>
        </Card>
      </Col>
      
      {/* --- RIGHT COLUMN: CUSTOMER DETAILS --- */}
      <Col lg={6} xl={5}>
        <CustomerDetailsCard 
          customerDetails={customerDetails}
          setCustomerDetails={setCustomerDetails}
          allRentals={allRentals}
          onSelectExisting={handleSelectCustomer}
          onSubmit={handleFormSubmission}
          isSubmitting={isSubmitting}
          canSubmit={
            isCustomerInfoValid &&
            !!selectedRefId &&
            (tailoringData.tailoringType === 'Tailored for Purchase' || 
            (tailoringData.tailoringType === 'Tailored for Rent-Back' && !!targetDate))
          }
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
            executeSubmission(); // Call the simplified function directly
          }}>
            Proceed
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmationModal
        show={showWarningModal}
        onHide={() => setShowWarningModal(false)}
        onConfirm={() => {
            setShowWarningModal(false);
            // The user has approved the warnings, now check for zero price.
            if (tailoringData.price <= 0) {
                setShowZeroPriceModal(true);
            } else {
                executeSubmission(); // Call the simplified function directly
            }
        }}
        title="Missing Optional Details"
        warnings={warnings}
      />

      <Modal show={showDateChangeWarning} onHide={() => setShowDateChangeWarning(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <ExclamationTriangleFill className="me-2 text-warning" />
            Change Rental Date?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Changing the rental start date will clear the existing Fitting Date and Target Completion Date fields.</p>
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

export default CustomRent;
