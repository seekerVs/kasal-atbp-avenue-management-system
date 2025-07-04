import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Row, Col, InputGroup, Alert } from 'react-bootstrap';
import { PlusCircleFill, Trash } from 'react-bootstrap-icons';
import { CustomTailoringItem, MeasurementRef } from '../../../types';

// A helper function to create a blank-slate item object for "create" mode
const getInitialItem = (name: string): CustomTailoringItem => ({
    name,
    price: 0,
    quantity: 1,
    notes: '',
    tailoringType: 'Tailored for Purchase',
    materials: [''],
    designSpecifications: '',
    referenceImages: [''],
    outfitCategory: '',
    outfitType: '',
    measurements: {},
});

interface CreateEditCustomItemModalProps {
  show: boolean;
  onHide: () => void;
  item: CustomTailoringItem | null; // Null when creating a new item
  itemName: string;                  // The base name, e.g., "Package: Gown"
  measurementRefs: MeasurementRef[]; // The list of measurement templates
  onSave: (updatedItem: CustomTailoringItem) => void;
}

const CreateEditCustomItemModal: React.FC<CreateEditCustomItemModalProps> = ({ 
    show,
    onHide, 
    item, 
    itemName, 
    measurementRefs, 
    onSave 
}) => {
  const [formData, setFormData] = useState<CustomTailoringItem>(item || getInitialItem(itemName));
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRefId, setSelectedRefId] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);

  // A flag to determine if the modal is for creating a new item's structure
  // or just editing an existing one.
  const isCreateMode = !item || !item.outfitCategory;

  // This effect populates the form and clears errors whenever the modal is opened
  useEffect(() => {
    if (show) {
        setErrors([]); // Clear any errors from a previous session
        const initialData = isCreateMode ? getInitialItem(itemName) : JSON.parse(JSON.stringify(item));
        setFormData(initialData);
        
        if (!isCreateMode && item) {
            // If editing, pre-select the category and type dropdowns
            setSelectedCategory(item.outfitCategory);
            const ref = measurementRefs.find(r => r.category === item.outfitCategory && r.outfitName === item.outfitType);
            if (ref) setSelectedRefId(ref._id);
        } else {
            // If creating, ensure dropdowns are reset
            setSelectedCategory('');
            setSelectedRefId('');
        }
    }
  }, [show, item, itemName, isCreateMode, measurementRefs]);

  // --- Memos for dropdown options ---
  const uniqueCategories = useMemo(() => Array.from(new Set((measurementRefs || []).map(ref => ref.category))), [measurementRefs]);
  const filteredOutfits = useMemo(() => (measurementRefs || []).filter(ref => ref.category === selectedCategory), [selectedCategory, measurementRefs]);
  const selectedRef = useMemo(() => (measurementRefs || []).find(ref => ref._id === selectedRefId), [selectedRefId, measurementRefs]);

  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (errors.length > 0) setErrors([]); // Clear errors once the user starts editing
    const { name, value } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: (name === 'price' || name === 'quantity') ? parseFloat(value) || 0 : value
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => { 
    if (errors.length > 0) setErrors([]);
    setSelectedCategory(e.target.value); 
    setSelectedRefId(''); 
    setFormData(prev => ({...prev, measurements: {}})); 
  };
  
  const handleRefChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (errors.length > 0) setErrors([]);
    setSelectedRefId(e.target.value);
  };

  const handleMeasurementChange = (field: string, value: string) => {
    if (errors.length > 0) setErrors([]);
    setFormData(prev => ({ ...prev, measurements: { ...prev.measurements, [field]: value }}));
  };

  const handleDynamicListChange = (listType: 'materials' | 'referenceImages', index: number, value: string) => {
    if (errors.length > 0) setErrors([]);
    if (!formData[listType]) return;
    const newList = [...(formData[listType] as string[])];
    newList[index] = value;
    setFormData(prev => ({ ...prev, [listType]: newList }));
  };

  const addDynamicListItem = (listType: 'materials' | 'referenceImages') => {
    const currentList = formData[listType] || [];
    setFormData(prev => ({ ...prev, [listType]: [...currentList, ''] }));
  };

  const removeDynamicListItem = (listType: 'materials' | 'referenceImages', index: number) => {
    if (!formData[listType]) return;
    const newList = (formData[listType] as string[]).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, [listType]: newList }));
  };
  
  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) newErrors.push("Item Name cannot be empty.");
    if (!formData.designSpecifications.trim()) newErrors.push("Design Specifications are required.");
    if (!formData.materials || formData.materials.every(m => m.trim() === '')) newErrors.push("At least one Material must be specified.");
    if (formData.quantity < 1) newErrors.push("Quantity must be at least 1.");
    if (formData.price < 0) newErrors.push("Price cannot be a negative number.");

    if (isCreateMode) {
        if (!selectedCategory) newErrors.push("An Outfit Category must be selected.");
        if (!selectedRefId) newErrors.push("An Outfit Type must be selected.");
        if (selectedRef) {
            for (const measurement of selectedRef.measurements) {
                const value = formData.measurements[measurement];
                if (value === undefined || value === null || isNaN(Number(value)) || Number(value) <= 0) {
                    newErrors.push(`Measurement "${measurement}" must be a number greater than 0.`);
                }
            }
        }
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };
  
  const handleSaveChanges = () => {
    if (!validateForm()) {
        return; // Stop if validation fails. The Alert will be displayed.
    }

    // If validation passes, construct the final data and save.
    const finalData: CustomTailoringItem = {
        ...formData,
        outfitCategory: selectedCategory || formData.outfitCategory,
        outfitType: selectedRef?.outfitName || formData.outfitType,
        materials: formData.materials.filter(m => m.trim() !== ''),
        referenceImages: formData.referenceImages.filter(r => r.trim() !== ''),
    };
    onSave(finalData);
    onHide(); // Close the modal only on success
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Custom Item Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {errors.length > 0 && (
            <Alert variant="danger" onClose={() => setErrors([])} dismissible>
                <Alert.Heading as="h6">Please correct the following:</Alert.Heading>
                <ul className="mb-0">
                    {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                    ))}
                </ul>
            </Alert>
        )}
        
        <Form>
          {/* Section 1: Outfit Structure (disabled in edit mode) */}
          <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Outfit Category</Form.Label>
                  <Form.Select value={selectedCategory} onChange={handleCategoryChange} disabled={!isCreateMode}>
                    <option value="">-- Select a Category --</option>
                    {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Outfit Type</Form.Label>
                  <Form.Select value={selectedRefId} onChange={handleRefChange} disabled={!isCreateMode || !selectedCategory}>
                    <option value="">-- Select an Outfit Type --</option>
                    {filteredOutfits.map(ref => <option key={ref._id} value={ref._id}>{ref.outfitName}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
          </Row>
          <hr/>
          
          {/* Section 2: Core Item Details */}
          <Form.Group className="mb-3"><Form.Label>Item Name</Form.Label><Form.Control type="text" name="name" value={formData.name} onChange={handleInputChange} readOnly /></Form.Group>
          <Row>
            <Col md={4}><Form.Group className="mb-3"><Form.Label>Price (₱)</Form.Label><Form.Control type="number" name="price" min="0" value={formData.price} onChange={handleInputChange} /></Form.Group></Col>
            <Col md={4}><Form.Group className="mb-3"><Form.Label>Quantity</Form.Label><Form.Control type="number" name="quantity" min="1" value={formData.quantity} onChange={handleInputChange} /></Form.Group></Col>
            <Col md={4}><Form.Group className="mb-3"><Form.Label>Tailoring Type</Form.Label><Form.Select name="tailoringType" value={formData.tailoringType} onChange={handleInputChange}><option value="Tailored for Purchase">For Purchase</option><option value="Tailored for Rent-Back">For Rent-Back</option></Form.Select></Form.Group></Col>
          </Row>
          <Form.Group className="mb-3"><Form.Label>Design Specifications</Form.Label><Form.Control as="textarea" rows={3} name="designSpecifications" value={formData.designSpecifications || ''} onChange={handleInputChange} /></Form.Group>
          
          {/* Section 3: Measurements (conditionally rendered) */}
          {(selectedRef || (!isCreateMode && Object.keys(formData.measurements).length > 0)) && (
            <>
                <hr /><h6>Measurements (cm)</h6><Row>
                {(isCreateMode && selectedRef ? selectedRef.measurements : Object.keys(formData.measurements)).map(m => (
                    <Col md={4} lg={3} key={m} className="mb-2">
                        <Form.Group>
                            <Form.Label className="small text-capitalize">{m.replace(/([A-Z])/g, ' $1').trim()}</Form.Label>
                            <Form.Control type="number" value={formData.measurements[m] || ''} onChange={(e) => handleMeasurementChange(m, e.target.value)} />
                        </Form.Group>
                    </Col>
                ))}
                </Row>
            </>
          )}
          
          {/* Section 4: Materials & Images */}
          <hr /><Row>
            <Col md={6}><Form.Group className="mb-3"><Form.Label>Materials</Form.Label>{(formData.materials || []).map((material, index) => (<InputGroup key={index} className="mb-2"><Form.Control placeholder="e.g., Silk, Lace" value={material} onChange={(e) => handleDynamicListChange('materials', index, e.target.value)} /><Button variant="outline-danger" onClick={() => removeDynamicListItem('materials', index)}><Trash /></Button></InputGroup>))}<Button variant="outline-secondary" size="sm" onClick={() => addDynamicListItem('materials')}><PlusCircleFill className="me-1" />Add Material</Button></Form.Group></Col>
            <Col md={6}><Form.Group className="mb-3"><Form.Label>Reference Image URLs</Form.Label>{(formData.referenceImages || []).map((image, index) => (<InputGroup key={index} className="mb-2"><Form.Control placeholder="https://..." value={image} onChange={(e) => handleDynamicListChange('referenceImages', index, e.target.value)} /><Button variant="outline-danger" onClick={() => removeDynamicListItem('referenceImages', index)}><Trash /></Button></InputGroup>))}<Button variant="outline-secondary" size="sm" onClick={() => addDynamicListItem('referenceImages')}><PlusCircleFill className="me-1" />Add Image URL</Button></Form.Group></Col>
          </Row>

          {/* Section 5: Notes */}
          <Form.Group className="mb-3"><Form.Label>Additional Notes</Form.Label><Form.Control as="textarea" rows={2} name="notes" value={formData.notes || ''} onChange={handleInputChange} /></Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleSaveChanges}>Save Details</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateEditCustomItemModal;