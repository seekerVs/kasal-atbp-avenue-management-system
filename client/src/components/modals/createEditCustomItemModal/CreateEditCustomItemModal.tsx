import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { CustomTailoringItem, MeasurementRef } from '../../../types';
import { v4 as uuidv4 } from 'uuid';
import { MultiImageDropzoneRef } from '../../multiImageDropzone/MultiImageDropzone';
import { useAlert } from '../../../contexts/AlertContext';
import ConfirmationModal from '../confirmationModal/ConfirmationModal';
import api from '../../../services/api';
import { CustomItemForm } from '../../forms/customItemForm/CustomItemForm';
import { useSensorData } from '../../../hooks/useSensorData';

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
  const { sensorData, isLoading, error } = useSensorData(show);
  const [formData, setFormData] = useState<CustomTailoringItem>(item || getInitialItem(itemName));
  const [errors, setErrors] = useState<{ [key: string]: any }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeMeasurementField, setActiveMeasurementField] = useState<string | null>(null);
  const [lastInsertedTimestamp, setLastInsertedTimestamp] = useState<string | null>(null);

  const isCreateMode = !item;
  const dropzoneRef = useRef<MultiImageDropzoneRef>(null);
  const initialImageUrlsRef = useRef<string[]>([]);

  const selectedRef = useMemo(() => {
    if (!formData.outfitType || !formData.outfitCategory || !measurementRefs.length) {
        return null;
    }
    return measurementRefs.find(r => 
        r.category === formData.outfitCategory && r.outfitName === formData.outfitType
    );
  }, [formData.outfitCategory, formData.outfitType, measurementRefs]);
  
  const selectedRefId = selectedRef?._id || '';

  useEffect(() => {
    if (show) {
        setErrors({});
        const initialData = isCreateMode 
            ? getInitialItem(itemName) 
            : JSON.parse(JSON.stringify(item || {}));

        if (isForPackage) {
            initialData.tailoringType = 'Tailored for Rent-Back';
        }

        setFormData(initialData);
        initialImageUrlsRef.current = initialData.referenceImages || [];
    }
  }, [show, item, itemName, isCreateMode, isForPackage]);

  useEffect(() => {
    const handleSensorCommand = (event: CustomEvent) => {
      if (event.detail.action === 'focusNext' && selectedRef) {
        const measurementFields = selectedRef.measurements;
        const currentActiveIndex = activeMeasurementField ? measurementFields.indexOf(activeMeasurementField) : -1;
        const nextIndex = (currentActiveIndex + 1) % measurementFields.length;
        const nextField = measurementFields[nextIndex];
        
        // Find the actual input element and focus it
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

  const handleInsertMeasurement = (field: string) => {
    if (sensorData && typeof sensorData.centimeters === 'number') {
      handleMeasurementChange(field, sensorData.centimeters.toFixed(2));
    } else {
      addAlert("No measurement data received from the device.", "warning");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setErrors({});
    if (errors.length > 0) setErrors([]);
    const { name, value } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: (name === 'price' || name === 'quantity') ? parseFloat(value) || 0 : value
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => { 
    const newCategory = e.target.value;
    // When category changes, update it in formData and reset the outfitType and measurements.
    setFormData(prev => ({
        ...prev,
        outfitCategory: newCategory,
        outfitType: '', // Reset outfit type
        measurements: {} // Reset measurements
    }));
  };
  
  const handleRefChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const refId = e.target.value;
    const ref = measurementRefs.find(r => r._id === refId);
    if (ref) {
        // When outfit type changes, update the type in formData and clear measurements.
        setFormData(prev => ({
            ...prev,
            outfitType: ref.outfitName,
            measurements: {}
        }));
    }
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
  
  
const checkForIssues = (): { isValid: boolean, warnings: string[] } => {
    const selectedRef = measurementRefs.find(ref => ref._id === selectedRefId);

    const newErrors: { [key: string]: any } = { measurements: {} };
    const newWarnings: string[] = [];

    // --- Hard Validations (Errors) ---
    if (!formData.name.trim()) newErrors.name = "Item Name is required.";
    if (formData.quantity < 1) newErrors.quantity = "Quantity must be at least 1.";
    if (!formData.outfitCategory) newErrors.outfitCategory = "Outfit Category is required.";
    if (!selectedRefId) newErrors.outfitType = "Outfit Type is required.";
    
    // Check measurements only if an outfit type has been selected
    if (selectedRef) {
      for (const measurement of selectedRef.measurements) {
        const value = formData.measurements[measurement];
        // This checks if the value is missing, empty, or not a positive number.
        if (value === undefined || value === null || String(value).trim() === '' || isNaN(Number(value)) || Number(value) <= 0) {
          newErrors.measurements[measurement] = `Required.`;
        }
      }
    }
    
    if (!formData.designSpecifications.trim()) {
      newWarnings.push("Design Specifications");
    }
    if (!formData.materials || formData.materials.every(m => m.trim() === '')) {
      newWarnings.push("Materials");
    }
    const hasImages = (dropzoneRef.current?.getFiles() ?? []).length > 0;
    if (!hasImages) {
      newWarnings.push("Reference Images");
    }
    
    setErrors(newErrors);

    const hasMainErrors = Object.keys(newErrors).length > 1;
    const hasMeasurementErrors = Object.keys(newErrors.measurements).length > 0;
    
    // The form is valid only if there are no main errors and no measurement errors
    return { isValid: !hasMainErrors && !hasMeasurementErrors, warnings: newWarnings };
  };

  const proceedWithSave = async () => {
    // ADD THIS LINE
    const selectedRef = measurementRefs.find(ref => ref._id === selectedRefId);

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
              // This line will now work correctly
              const finalData: CustomTailoringItem = {
                  ...formData,
                  _id: formData._id || uuidv4(),
                  outfitCategory: formData.outfitCategory,
                  outfitType: selectedRef?.outfitName || item?.outfitType || '',
                  materials: (formData.materials || []).filter(m => m.trim() !== ''),
                  referenceImages: finalUrls,
              };
              onSave(finalData);
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
            outfitCategory: formData.outfitCategory,
            outfitType: selectedRef?.outfitName || item?.outfitType || '',
            materials: (formData.materials || []).filter(m => m.trim() !== ''),
            referenceImages: [ ...existingUrls, ...pendingFiles.map(f => `placeholder_${f.name}`) ],
        };
        onSave(stagedItemData, pendingFiles);
        onHide();
    }
  };
  
  const handleSaveChanges = async () => {
    const { isValid, warnings: newWarnings } = checkForIssues();
    
    if (!isValid) {
      addAlert("Please correct the errors before saving.", "warning");
      return;
    }

    if (newWarnings.length > 0) {
        setWarnings(newWarnings);
        setShowWarningModal(true);
    } else {
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
          <CustomItemForm
            formData={formData}
            measurementRefs={measurementRefs}
            selectedCategory={formData.outfitCategory || ''} 
            selectedRefId={selectedRefId}
            errors={errors}
            isForPackage={isForPackage}
            isCreateMode={isCreateMode} 
            onInputChange={handleInputChange}
            onCategoryChange={handleCategoryChange}
            onRefChange={handleRefChange}
            onMeasurementChange={handleMeasurementChange}
            onDynamicListChange={handleDynamicListChange}
            onAddDynamicListItem={addDynamicListItem}
            onRemoveDynamicListItem={removeDynamicListItem}
            dropzoneRef={dropzoneRef}
            onInsertMeasurement={handleInsertMeasurement}
            onMeasurementFocus={setActiveMeasurementField}
            sensorData={sensorData}
            isSensorLoading={isLoading}
            sensorError={error}
          />
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