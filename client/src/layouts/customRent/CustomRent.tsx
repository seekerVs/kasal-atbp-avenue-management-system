import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Form, Button, Card, Spinner, InputGroup, Modal, ToastContainer, Toast } from 'react-bootstrap';
import { ClipboardCheck, Palette, Gem, Camera, Pen, ExclamationTriangleFill, Trash, PlusCircleFill } from 'react-bootstrap-icons';
import { useNavigate } from "react-router-dom";

import CustomerDetailsCard from "../../components/CustomerDetailsCard";
import { MeasurementRef, CustomerInfo, RentalOrder, MeasurementValues, CustomTailoringItem } from '../../types';
import api from "../../services/api";
import { useAlert } from "../../contexts/AlertContext";
import { v4 as uuidv4 } from 'uuid';

// --- TYPE DEFINITIONS (Specific to this component's state) ---
export type InitialCustomTailoringData = Omit<CustomTailoringItem, '_id' | 'measurements' | 'outfitCategory' | 'outfitType'>;

// --- INITIAL STATE & CONSTANTS ---
const initialCustomerDetails: CustomerInfo = { name: '', phoneNumber: '', email: '', address: '' };
const initialTailoringData: InitialCustomTailoringData = {
  name: '',
  price: 0,
  quantity: 1,
  notes: '',
  tailoringType: 'Tailored for Purchase',
  materials: [''],
  designSpecifications: '', 
  referenceImages: ['']
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
  
  const [formData, setFormData] = useState({
      customer: initialCustomerDetails,
      tailoring: initialTailoringData,
      measurements: {} as MeasurementValues,
  });

  const [isNewCustomerMode, setIsNewCustomerMode] = useState(true);
  const [existingOpenRental, setExistingOpenRental] = useState<RentalOrder | null>(null);
  const [selectedRentalForDisplay, setSelectedRentalForDisplay] = useState<RentalOrder | null>(null);
  const [showZeroPriceModal, setShowZeroPriceModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    setFormData(prev => ({ ...prev, tailoring: { ...prev.tailoring, [name]: (name === 'price' || name === 'quantity') ? parseFloat(value) || 0 : value } }));
  };
  
  const handleMeasurementChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, measurements: { ...prev.measurements, [field]: value } }));
  };

  const handleCustomerDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, customer: { ...prev.customer, [name]: value } }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => { 
    setSelectedCategory(e.target.value); 
    setSelectedRefId(''); 
    setFormData(prev => ({...prev, measurements: {}})); 
  };
  
  const handleRefChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRefId = e.target.value;
    setSelectedRefId(newRefId);
    const ref = measurementRefs.find(r => r._id === newRefId);
    if(ref) { 
        setFormData(prev => ({ 
            ...prev, 
            tailoring: {
                ...prev.tailoring, 
                // Only update the name if not in association mode (where it's pre-filled)
                name: ref.outfitName
            }, 
            measurements: {} 
        })); 
    }
  };

  const handleSelectCustomer = (selectedRental: RentalOrder) => {
    setFormData(prev => ({ ...prev, customer: selectedRental.customerInfo[0] }));
    setSelectedRentalForDisplay(selectedRental);
    setExistingOpenRental(selectedRental.status === 'To Process' ? selectedRental : null);
  };
  
  const handleDynamicListChange = (listType: 'materials' | 'referenceImages', index: number, value: string) => {
    const list = formData.tailoring[listType] as string[];
    const newList = [...list];
    newList[index] = value;
    setFormData(prev => ({ ...prev, tailoring: { ...prev.tailoring, [listType]: newList } }));
  };

  const addDynamicListItem = (listType: 'materials' | 'referenceImages') => {
    const list = formData.tailoring[listType] as string[] || [];
    setFormData(prev => ({ ...prev, tailoring: { ...prev.tailoring, [listType]: [...list, ''] } }));
  };

  const removeDynamicListItem = (listType: 'materials' | 'referenceImages', index: number) => {
    const list = formData.tailoring[listType] as string[] || [];
    const newList = list.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, tailoring: { ...prev.tailoring, [listType]: newList } }));
  };

  const validateForm = () => {
    if (!formData.customer.name || !formData.customer.phoneNumber || !formData.customer.address) { 
      addAlert("Please fill in all required customer details (*).", 'danger'); return false; 
    }
    if (!selectedCategory) { addAlert("Please select an Outfit Category.", 'danger'); return false; }
    if (!selectedRefId || !selectedRef) { addAlert("Please select an Outfit Type.", 'danger'); return false; }
    if (!formData.tailoring.name.trim()) { addAlert("Custom Item Name cannot be empty.", 'danger'); return false; }
    for (const measurement of selectedRef.measurements) { if (!formData.measurements[measurement]) { addAlert(`Please fill in the "${measurement}" measurement.`, 'danger'); return false; } }
    if (formData.tailoring.materials.every(m => m.trim() === '')) { addAlert("Materials field cannot be empty.", 'danger'); return false; }
    if (!formData.tailoring.designSpecifications.trim()) { addAlert("Design Specifications field cannot be empty.", 'danger'); return false; }
    return true;
  };

    const buildPayload = () => {
    const { customer, tailoring, measurements } = formData;
    return {
      customerInfo: [customer], // Always include customer info now
      customTailoring: [{ 
           _id: uuidv4(),
          ...tailoring, 
          measurements: measurements, 
          materials: tailoring.materials.filter(m => m.trim() !== ''),
          referenceImages: tailoring.referenceImages.filter(r => r.trim() !== ''),
          outfitCategory: selectedCategory, 
          outfitType: selectedRef?.outfitName || '' 
      }]
    };
  };

  const createNewRental = async () => {
    if (!validateForm()) { setIsSubmitting(false); return; }
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      const response = await api.post('/rentals', payload);
      addAlert("Custom rental created successfully! Redirecting...","success");
      setTimeout(() => { navigate(`/rentals/${response.data._id}`); }, 1500);
    } catch (err: any) { 
      addAlert(err.response?.data?.message || "Failed to create request.", 'danger'); 
      setIsSubmitting(false);
    } 
  };

  const addItemToExistingRental = async () => {
    const rentalId = existingOpenRental?._id;
    if (!rentalId || !validateForm()) { setIsSubmitting(false); return; }
    setIsSubmitting(true);
    try {
        const payload = buildPayload();
        await api.put(`/rentals/${rentalId}/addItem`, payload);
        addAlert("Custom item added successfully! Redirecting...","success");
        setTimeout(() => navigate(`/rentals/${rentalId}`), 1500);
    } catch (err: any) { 
        addAlert(err.response?.data?.message || "Failed to add to rental.", 'danger');
        setIsSubmitting(false);
    }
  };

  const handleFormSubmission = () => {
    const action = existingOpenRental ? addItemToExistingRental : createNewRental;
    if (!validateForm()) return;
    if (formData.tailoring.price <= 0) {
        setPendingAction(() => action);
        setShowZeroPriceModal(true);
    } else {
        action();
    }
  };

  if (loading) return <div className="text-center py-5"><Spinner /></div>;

  return (
    <Container fluid>
      <h2 className="mb-4">New Custom Tailoring</h2>
      <Row className="g-4">
        <Col lg={7} xl={8}>
            <Card>
                <Card.Header as="h5" className="d-flex align-items-center"><ClipboardCheck className="me-2"/>Outfit Details</Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Outfit Category <span className="text-danger">*</span></Form.Label><Form.Select value={selectedCategory} onChange={handleCategoryChange} required><option value="">-- Select a Category --</option>{uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</Form.Select></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Outfit Type <span className="text-danger">*</span></Form.Label><Form.Select value={selectedRefId} onChange={handleRefChange} disabled={!selectedCategory} required><option value="">-- Select an Outfit Type --</option>{filteredOutfits.map(ref => <option key={ref._id} value={ref._id}>{ref.outfitName}</option>)}</Form.Select></Form.Group></Col>
                    </Row>
                    {selectedRef && ( <>
                        <Form.Group className="mb-3">
                          <Form.Label>Custom Item Name <span className="text-danger">*</span></Form.Label>
                          <Form.Control name="name" value={formData.tailoring.name} onChange={handleInputChange} placeholder="e.g., Debut Gown for Maria" required />
                          <Form.Text className="text-muted">This will be the name of the item in the rental record.</Form.Text>
                        </Form.Group>
                        <hr/>
                        <Row>
                            <Col md={4}><Form.Group><Form.Label>Quantity <span className="text-danger">*</span></Form.Label><Form.Control type="number" name="quantity" value={formData.tailoring.quantity} onChange={handleInputChange} min="1" required /></Form.Group></Col>
                            <Col md={4}><Form.Group><Form.Label>Tailoring Type</Form.Label><Form.Select name="tailoringType" value={formData.tailoring.tailoringType} onChange={handleInputChange}><option>Tailored for Purchase</option><option>Tailored for Rent-Back</option></Form.Select></Form.Group></Col>
                            <Col md={4}><Form.Group><Form.Label>Price <span className="text-danger">*</span></Form.Label><InputGroup><InputGroup.Text>₱</InputGroup.Text><Form.Control type="number" name="price" value={formData.tailoring.price} onChange={handleInputChange} required /></InputGroup></Form.Group></Col>
                        </Row>
                        <hr/>
                        <h6>Measurements (in cm)</h6>
                        <Row>{selectedRef.measurements.map(m => (<Col md={6} lg={4} key={m}><Form.Group className="mb-2"><Form.Label className="small">{m} <span className="text-danger">*</span></Form.Label><Form.Control size="sm" type="number" value={formData.measurements[m] || ''} onChange={e => handleMeasurementChange(m, e.target.value)} required /></Form.Group></Col>))}</Row>
                        <hr/>
                        <Form.Group className="mb-3">
                          <Form.Label><Palette className="me-2"/>Materials <span className="text-danger">*</span></Form.Label>
                          {formData.tailoring.materials.map((material, index) => (
                            <InputGroup key={index} className="mb-2"><Form.Control placeholder="e.g., Silk, Lace, etc." value={material} onChange={(e) => handleDynamicListChange('materials', index, e.target.value)} />{formData.tailoring.materials.length > 1 && (<Button variant="outline-danger" onClick={() => removeDynamicListItem('materials', index)}><Trash /></Button>)}</InputGroup>
                          ))}<Button variant="outline-secondary" size="sm" onClick={() => addDynamicListItem('materials')}><PlusCircleFill className="me-1"/>Add Material</Button>
                        </Form.Group>
                        <Form.Group className="mb-3"><Form.Label><Gem className="me-2"/>Design Specifications <span className="text-danger">*</span></Form.Label><Form.Control name="designSpecifications" value={formData.tailoring.designSpecifications} onChange={handleInputChange} as="textarea" rows={3} required /></Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label><Camera className="me-2"/>Reference Image URLs</Form.Label>
                            {formData.tailoring.referenceImages.map((image, index) => (
                                <InputGroup key={index} className="mb-2"><Form.Control placeholder="https://..." value={image} onChange={(e) => handleDynamicListChange('referenceImages', index, e.target.value)} />{formData.tailoring.referenceImages.length > 1 && (<Button variant="outline-danger" onClick={() => removeDynamicListItem('referenceImages', index)}><Trash/></Button>)}</InputGroup>
                            ))}<Button variant="outline-secondary" size="sm" onClick={() => addDynamicListItem('referenceImages')}><PlusCircleFill className="me-1"/>Add Image URL</Button>
                        </Form.Group>
                        <Form.Group className="mb-3"><Form.Label><Pen className="me-2"/>Additional Notes</Form.Label><Form.Control name="notes" value={formData.tailoring.notes} onChange={handleInputChange} as="textarea" rows={2} /></Form.Group>
                        
                    </>)}
                </Card.Body>
            </Card>
        </Col>
        
        <Col lg={5} xl={4}>
          <CustomerDetailsCard 
            customerDetails={formData.customer}
            onCustomerDetailChange={handleCustomerDetailChange}
            isNewCustomerMode={isNewCustomerMode}
            onSetIsNewCustomerMode={setIsNewCustomerMode}
            allRentals={allRentals}
            onSelectExisting={handleSelectCustomer}
            onSubmit={handleFormSubmission}
            isSubmitting={isSubmitting}
            canSubmit={!!selectedRefId}
            existingOpenRental={existingOpenRental}
            selectedRentalForDisplay={selectedRentalForDisplay}
          />
        </Col>
      </Row>

      <Modal show={showZeroPriceModal} onHide={() => setShowZeroPriceModal(false)} centered>
        <Modal.Header closeButton><Modal.Title><ExclamationTriangleFill className="me-2 text-warning" />Confirm Price</Modal.Title></Modal.Header>
        <Modal.Body>The price for this item is set to ₱0.00. Are you sure you want to proceed with this price?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowZeroPriceModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => { setShowZeroPriceModal(false); if(pendingAction) pendingAction(); }}>Yes, Proceed</Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
}

export default CustomRent;
