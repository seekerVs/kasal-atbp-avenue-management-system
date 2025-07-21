import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Modal, Button, Form, Row, Col, InputGroup, Alert, Spinner } from 'react-bootstrap';
import { 
    PlusCircleFill, 
    Trash, 
    CardText, 
    CashCoin, 
    Hash, 
    PencilSquare, 
    Palette, 
    Image, 
    FileText,
    Grid3x3GapFill
} from 'react-bootstrap-icons';
import { CustomTailoringItem, MeasurementRef } from '../../../types';
import { v4 as uuidv4 } from 'uuid';
import { MultiImageDropzone, MultiImageDropzoneRef } from '../../multiImageDropzone/MultiImageDropzone';
import { useAlert } from '../../../contexts/AlertContext';
import ConfirmationModal from '../confirmationModal/ConfirmationModal';
import api from '../../../services/api';

// A helper function to create a blank-slate item object for "create" mode
// --- THIS IS THE FIX ---
const getInitialItem = (name: string): CustomTailoringItem => ({
    _id: '',
    name,
    price: 0,
    quantity: 1,
    notes: '',
    tailoringType: 'Tailored for Purchase',
    materials: [''],
    designSpecifications: '',
    referenceImages: [], // Correct: initialize as an empty array
    outfitCategory: '',
    outfitType: '',
    measurements: {},
});

interface CreateEditCustomItemModalProps {
  show: boolean;
  onHide: () => void;
  item: CustomTailoringItem | null;
  itemName: string;
  measurementRefs: MeasurementRef[];
  onSave: (stagedItem: CustomTailoringItem, pendingFiles?: File[]) => void;
  isForPackage?: boolean;
  uploadMode?: 'immediate' | 'deferred';
}

const CreateEditCustomItemModal: React.FC<CreateEditCustomItemModalProps> = ({ 
    show,
    onHide, 
    item, 
    itemName, 
    measurementRefs, 
    onSave,
    isForPackage,
    uploadMode = 'deferred'
}) => {
  const { addAlert } = useAlert();
  const [formData, setFormData] = useState<CustomTailoringItem>(item || getInitialItem(itemName));
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRefId, setSelectedRefId] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const isCreateMode = !item;

  const dropzoneRef = useRef<MultiImageDropzoneRef>(null);

  const initialImageUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (show) {
        setErrors([]);
        const initialData = isCreateMode ? getInitialItem(itemName) : JSON.parse(JSON.stringify(item));

        if (isForPackage) {
            initialData.tailoringType = 'Tailored for Rent-Back';
        }

        setFormData(initialData);

        initialImageUrlsRef.current = initialData.referenceImages || [];
        
        if (!isCreateMode && item) {
            setSelectedCategory(item.outfitCategory);
            const ref = measurementRefs.find(r => r.category === item.outfitCategory && r.outfitName === item.outfitType);
            if (ref) setSelectedRefId(ref._id);
        } else {
            setSelectedCategory('');
            setSelectedRefId('');
        }
    }
  }, [show, item, itemName, isCreateMode, measurementRefs, isForPackage]);

  const uniqueCategories = useMemo(() => Array.from(new Set((measurementRefs || []).map(ref => ref.category))), [measurementRefs]);
  const filteredOutfits = useMemo(() => (measurementRefs || []).filter(ref => ref.category === selectedCategory), [selectedCategory, measurementRefs]);
  const selectedRef = useMemo(() => (measurementRefs || []).find(ref => ref._id === selectedRefId), [selectedRefId, measurementRefs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (errors.length > 0) setErrors([]);
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

  const handleDynamicListChange = (listType: 'materials', index: number, value: string) => {
    if (errors.length > 0) setErrors([]);
    const newList = [...(formData[listType] as string[])];
    newList[index] = value;
    setFormData(prev => ({ ...prev, [listType]: newList }));
  };

  const addDynamicListItem = (listType: 'materials') => {
    const currentList = formData[listType] || [];
    setFormData(prev => ({ ...prev, [listType]: [...currentList, ''] }));
  };

  const removeDynamicListItem = (listType: 'materials', index: number) => {
    const newList = (formData[listType] as string[]).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, [listType]: newList }));
  };
  
  const checkForIssues = (): { errors: string[], warnings: string[] } => {
    const newErrors: string[] = [];
    const newWarnings: string[] = [];

    // --- Hard Validations (Errors) ---
    if (!formData.name.trim()) newErrors.push("Item Name cannot be empty.");
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

    // --- Soft Validations (Warnings) ---
    if (!formData.designSpecifications.trim()) newWarnings.push("Design Specifications");
    if (!formData.materials || formData.materials.every(m => m.trim() === '')) newWarnings.push("Materials");
    const hasImages = (dropzoneRef.current?.getFiles() ?? []).length > 0;
    if (!hasImages) newWarnings.push("Reference Images");
    
    return { errors: newErrors, warnings: newWarnings };
  };

  const proceedWithSave = async () => {
    // 1. Get the pending File objects from the dropzone component
    const pendingFiles = (dropzoneRef.current?.getFiles() ?? [])
      .filter(f => f instanceof File) as File[];

    // 2. Get the list of existing URLs that were NOT removed by the user
    const existingUrls = (dropzoneRef.current?.getFiles() ?? [])
      .filter(f => typeof f === 'string') as string[];
    
    // --- HYBRID LOGIC ---
    if (uploadMode === 'immediate') {
        // --- IMMEDIATE MODE: Upload and delete right here ---
        setIsUploading(true);
        try {
            // A) Upload new files
            const uploadPromises = pendingFiles.map(file => {
                const formData = new FormData();
                formData.append('file', file);
                return api.post('/upload', formData);
            });
            const uploadResponses = await Promise.all(uploadPromises);
            const newUrls = uploadResponses.map(res => res.data.url);

            // B) Delete removed files
            const finalUrls = [...existingUrls, ...newUrls];
            const urlsToDelete = initialImageUrlsRef.current.filter(
                initialUrl => !finalUrls.includes(initialUrl)
            );
            if (urlsToDelete.length > 0) {
                await api.delete('/upload/bulk', { data: { urls: urlsToDelete } });
            }

              // C) Build final item and call onSave
              const finalData: CustomTailoringItem = {
                  ...formData,
                  _id: formData._id || uuidv4(),
                  outfitCategory: selectedCategory || formData.outfitCategory,
                  outfitType: selectedRef?.outfitName || item?.outfitType || '',
                  materials: (formData.materials || []).filter(m => m.trim() !== ''),
                  referenceImages: finalUrls,
              };
              onSave(finalData); // Only sends the final item, no pending files
              onHide();

        } catch (error) {
            console.error("Immediate save process failed:", error);
            addAlert("Could not save details. An error occurred during file processing.", "danger");
        } finally {
            setIsUploading(false);
        }

    } else {
        // --- DEFERRED MODE: Just pass staged data up ---
        const stagedItemData: CustomTailoringItem = {
            ...formData,
            _id: formData._id || uuidv4(),
            outfitCategory: selectedCategory || formData.outfitCategory,
            outfitType: selectedRef?.outfitName || item?.outfitType || '',
            materials: (formData.materials || []).filter(m => m.trim() !== ''),
            referenceImages: [ ...existingUrls, ...pendingFiles.map(f => `placeholder_${f.name}`) ],
        };
        // Call onSave with both the staged item and the pending files
        onSave(stagedItemData, pendingFiles);
        onHide();
    }
  };
  
  const handleSaveChanges = async () => {
    const { errors: newErrors, warnings: newWarnings } = checkForIssues();
    setErrors(newErrors);
    if (newErrors.length > 0) return;

    if (newWarnings.length > 0) {
        setWarnings(newWarnings);
        setShowWarningModal(true);
    } else {
        // If no warnings, call our new proceed function
        proceedWithSave();
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>{isCreateMode ? 'Custom Item Details' : 'Edit Custom Item'}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto' }}>
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
            <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><Grid3x3GapFill className="me-2 text-muted" />Outfit Category</Form.Label>
                    <Form.Select value={selectedCategory} onChange={handleCategoryChange} disabled={!isCreateMode}>
                      <option value="">-- Select a Category --</option>
                      {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><FileText className="me-2 text-muted" />Outfit Type</Form.Label>
                    <Form.Select value={selectedRefId} onChange={handleRefChange} disabled={!isCreateMode || !selectedCategory}>
                      <option value="">-- Select an Outfit Type --</option>
                      {filteredOutfits.map(ref => <option key={ref._id} value={ref._id}>{ref.outfitName}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
            </Row>
            <hr/>
      
            <Form.Group className="mb-3">
              <Form.Label><PencilSquare className="me-2 text-muted" />Item Name</Form.Label>
              <Form.Control type="text" name="name" value={formData.name} onChange={handleInputChange} />
            </Form.Group>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label><CashCoin className="me-2 text-muted" />Price (₱)</Form.Label>
                  <Form.Control type="number" name="price" min="0" value={formData.price} onChange={handleInputChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label><Hash className="me-2 text-muted" />Quantity</Form.Label>
                  <Form.Control type="number" name="quantity" min="1" value={formData.quantity} onChange={handleInputChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Tailoring Type</Form.Label>
                  <Form.Select name="tailoringType" value={formData.tailoringType} onChange={handleInputChange} disabled={isForPackage}>
                    <option value="Tailored for Purchase">For Purchase</option>
                    <option value="Tailored for Rent-Back">For Rent-Back</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label><CardText className="me-2 text-muted" />Design Specifications</Form.Label>
              <Form.Control as="textarea" rows={3} name="designSpecifications" value={formData.designSpecifications || ''} onChange={handleInputChange} />
            </Form.Group>
      
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
      
            <hr />
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label><Palette className="me-2 text-muted" />Materials</Form.Label>
                  {(formData.materials || []).map((material, index) => (
                    <InputGroup key={index} className="mb-2">
                      <Form.Control placeholder="e.g., Silk, Lace" value={material} onChange={(e) => handleDynamicListChange('materials', index, e.target.value)} />
                      <Button variant="outline-danger" onClick={() => removeDynamicListItem('materials', index)}><Trash /></Button>
                    </InputGroup>
                  ))}
                  <Button variant="outline-secondary" size="sm" onClick={() => addDynamicListItem('materials')}><PlusCircleFill className="me-1" />Add Material</Button>
                </Form.Group>
              </Col>
              <Col md={6}>
                  <Form.Group className="mb-3">
                      <Form.Label><Image className="me-2 text-muted" />Reference Images</Form.Label>
                      <MultiImageDropzone
                          ref={dropzoneRef}
                          existingImageUrls={formData.referenceImages || []}
                      />
                  </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Additional Notes</Form.Label>
              <Form.Control as="textarea" rows={2} name="notes" value={formData.notes || ''} onChange={handleInputChange} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={isUploading}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveChanges} disabled={isUploading}>
            {isUploading 
              ? <><Spinner as="span" size="sm" /> Saving...</> 
              // --- THIS IS THE NEW DYNAMIC TEXT ---
              : isCreateMode ? 'Confirm Details' : 'Save Changes' 
            }
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmationModal
        show={showWarningModal}
        onHide={() => setShowWarningModal(false)}
        onConfirm={() => {
          setShowWarningModal(false);
          proceedWithSave();
        }}
        title="Missing Optional Details"
        warnings={warnings}
      />
    </>
    
  );
};

export default CreateEditCustomItemModal;