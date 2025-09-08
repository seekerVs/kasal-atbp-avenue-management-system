// client/src/layouts/packageItems/packageForm/PackageFormModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { Package, InventoryItem, PackageAssignment, InclusionItem, AssignedItem } from '../../../types';
import api, { uploadFile } from '../../../services/api';
import { v4 as uuidv4 } from 'uuid';
import { SelectedItemData, SingleItemSelectionModal } from '../../../components/modals/singleItemSelectionModal/SingleItemSelectionModal';
import { useAlert } from '../../../contexts/AlertContext';
import { MotifBuilderModal } from '../../../components/modals/motifBuilderModal/MotifBuilderModal';
import { PackageDetailsForm } from './PackageDetailsForm';
import { PackageImagesForm } from './PackageImagesForm';
import { PackageInclusionsForm } from './PackageInclusionsForm';
import { PackageMotifsForm } from './PackageMotifsForm';
import { Accordion } from 'react-bootstrap';
import { ExclamationTriangleFill } from 'react-bootstrap-icons';


interface PackageFormModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: Package, urlsToDelete: string[]) => void;
  packageData: Package | null;
}

export function PackageFormModal({ show, onHide, onSave, packageData }: PackageFormModalProps) {
    const emptyPackage: Omit<Package, '_id'> = { name: '', description: '', inclusions: [], price: 0, imageUrls: [], colorMotifs: [] };
    const [formData, setFormData] = useState<Omit<Package, '_id' | 'imageUrls'> & { imageUrls: (string | File | null)[] }>(emptyPackage);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [assignmentContext, setAssignmentContext] = useState<{ motifIndex: number; inclusionId: string; wearerIndex: number; inclusionType?: 'Wearable' | 'Accessory'; } | null>(null);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [showMotifBuilder, setShowMotifBuilder] = useState(false);
    const [motifBuilderContext, setMotifBuilderContext] = useState<number | null>(null);
    const [priceInput, setPriceInput] = useState('0');
    const [errors, setErrors] = useState<any>({});
    const [isCheckingName, setIsCheckingName] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);
    const [imageUrlsToDelete, setImageUrlsToDelete] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showPriceWarningModal, setShowPriceWarningModal] = useState(false);
    const { addAlert } = useAlert(); 

    const inventoryMap = useMemo(() => new Map(inventory.map(item => [item._id, item])), [inventory]);

    useEffect(() => {
      if (show) {
        api.get('/inventory?limit=1000').then(res => setInventory(res.data.items || [])).catch(console.error);
        const initialData = packageData ? JSON.parse(JSON.stringify(packageData)) : emptyPackage;
        if (!packageData && initialData.colorMotifs.length === 0) {
          initialData.colorMotifs.push({ motifHex: '#FFFFFF', assignments: [] });
        }
        initialData.inclusions = initialData.inclusions.map((inc: InclusionItem) => ({ ...inc, _id: inc._id || uuidv4() }));
        initialData.colorMotifs = initialData.colorMotifs.map((motif: any) => {
          const syncedAssignments = initialData.inclusions.map((inclusion: InclusionItem) => {
            const existingAssignment = motif.assignments.find((a: PackageAssignment) => a.inclusionId === inclusion._id);
            if (existingAssignment) {
              return { ...existingAssignment, assignedItems: Array.from({ length: inclusion.wearerNum }, (_, i) => existingAssignment.assignedItems[i] || null) };
            }
            return { inclusionId: inclusion._id, assignedItems: Array(inclusion.wearerNum).fill(null) };
          });
          return { ...motif, assignments: syncedAssignments };
        });
        setFormData(initialData);
        setPriceInput(String(initialData.price || '0'));
        setImageUrlsToDelete([]);
      }
    }, [show, packageData]);

    useEffect(() => {
        if (!formData.name || (packageData && formData.name === packageData.name)) { setNameError(null); setIsCheckingName(false); return; }
        setIsCheckingName(true);
        const handler = setTimeout(async () => {
            try {
                const response = await api.get('/packages/check-name', { params: { name: formData.name, excludeId: packageData?._id } });
                if (response.data.isTaken) setNameError(`A package named "${formData.name}" already exists.`); else setNameError(null);
            } catch (error) { console.error("Failed to check package name:", error); } 
            finally { setIsCheckingName(false); }
        }, 500);
        return () => { clearTimeout(handler); };
    }, [formData.name, packageData]);

    const handleInclusionChange = (index: number, field: keyof Omit<InclusionItem, '_id'>, value: string | number | boolean) => {
      const updatedInclusions = [...formData.inclusions];
      let targetInclusion = { ...updatedInclusions[index], [field]: value };
      if (field === 'isCustom' && value === true) { targetInclusion.type = 'Wearable'; }
      updatedInclusions[index] = targetInclusion;
      if (field === 'isCustom' || field === 'type') {
          const updatedMotifs = formData.colorMotifs.map(motif => ({
              ...motif,
              assignments: motif.assignments.map(assign => {
                  if (assign.inclusionId === targetInclusion._id) { return { ...assign, assignedItems: Array(targetInclusion.wearerNum).fill(null) }; }
                  return assign;
              })
          }));
          setFormData(prev => ({ ...prev, inclusions: updatedInclusions, colorMotifs: updatedMotifs }));
      } else if (field === 'wearerNum') {
        const updatedMotifs = formData.colorMotifs.map(motif => ({
          ...motif,
          assignments: motif.assignments.map(assign => {
            if (assign.inclusionId === targetInclusion._id) { return { ...assign, assignedItems: Array.from({ length: Number(value) }, (_, i) => assign.assignedItems[i] || null) }; }
            return assign;
          })
        }));
        setFormData(prev => ({ ...prev, inclusions: updatedInclusions, colorMotifs: updatedMotifs }));
      } else {
        setFormData(prev => ({ ...prev, inclusions: updatedInclusions }));
      }
    };

    const handleAddInclusion = () => {
      const newInclusion: InclusionItem = { _id: uuidv4(), wearerNum: 1, name: '', isCustom: false, type: 'Wearable' };
      const updatedMotifs = formData.colorMotifs.map(motif => ({ ...motif, assignments: [...motif.assignments, { inclusionId: newInclusion._id, assignedItems: [null] }] }));
      setFormData(prev => ({ ...prev, inclusions: [...prev.inclusions, newInclusion], colorMotifs: updatedMotifs }));
    };

    const handleRemoveInclusion = (idToRemove: string) => {
        const updatedMotifs = formData.colorMotifs.map(motif => ({ ...motif, assignments: motif.assignments.filter(a => a.inclusionId !== idToRemove) }));
        setFormData(prev => ({ ...prev, inclusions: prev.inclusions.filter(inc => inc._id !== idToRemove), colorMotifs: updatedMotifs }));
    };

    const handleSaveAssignment = (selection: SelectedItemData) => {
        if (!assignmentContext) return;
        const { motifIndex, inclusionId, wearerIndex } = assignmentContext;
        const { product, variation } = selection; 
        const updatedMotifs = [...formData.colorMotifs];
        const assignment = updatedMotifs[motifIndex].assignments.find(a => a.inclusionId === inclusionId);
        if (assignment) {
            assignment.assignedItems[wearerIndex] = { itemId: product._id, color: variation.color, size: variation.size };
        }
        setFormData(prev => ({...prev, colorMotifs: updatedMotifs}));
        setShowAssignmentModal(false);
    };

    const handleOpenAssignmentModal = (motifIndex: number, inclusionId: string, wearerIndex: number) => {
        const inclusion = formData.inclusions.find(inc => inc._id === inclusionId);
        setAssignmentContext({ motifIndex, inclusionId, wearerIndex, inclusionType: inclusion?.type || 'Wearable' });
        setShowAssignmentModal(true);
    };
    
    const assignmentToPreselect = useMemo(() => { if (!assignmentContext) return null; const { motifIndex, inclusionId, wearerIndex } = assignmentContext; return formData.colorMotifs[motifIndex]?.assignments.find(a => a.inclusionId === inclusionId)?.assignedItems[wearerIndex]; }, [assignmentContext, formData]);
    const motifHexForModal = useMemo(() => { if (assignmentContext) return formData.colorMotifs[assignmentContext.motifIndex]?.motifHex; return undefined; }, [assignmentContext, formData.colorMotifs]);
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) || 0 : value })); };
    const handleImageFileSelect = (index: number, file: File | null) => { const updatedUrls = [...formData.imageUrls]; const oldImage = updatedUrls[index]; if (typeof oldImage === 'string') setImageUrlsToDelete(prev => [...prev, oldImage]); updatedUrls[index] = file; setFormData(prev => ({ ...prev, imageUrls: updatedUrls })); };
    const addImageSlot = () => { if (formData.imageUrls.length < 3) setFormData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, null] })); };
    const removeImageSlot = (index: number) => { const imageToRemove = formData.imageUrls[index]; if (typeof imageToRemove === 'string') setImageUrlsToDelete(prev => [...prev, imageToRemove]); const updatedUrls = formData.imageUrls.filter((_, i) => i !== index); setFormData(prev => ({ ...prev, imageUrls: updatedUrls })); };
    const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setPriceInput(e.target.value); };
    const handlePriceBlur = () => { const numericValue = parseFloat(priceInput) || 0; setFormData(prev => ({ ...prev, price: numericValue })); setPriceInput(String(numericValue)); };
    const validateForm = () => { const newErrors: any = { inclusions: [], colorMotifs: [] }; const alertMessages: string[] = []; let hasMissingAssignment = false; if (!formData.name.trim()) newErrors.name = 'Package name is required.'; else if (nameError) newErrors.name = nameError; if (!formData.description?.trim()) newErrors.description = 'Description is required.'; if (parseFloat(priceInput) < 0) newErrors.price = 'Price cannot be negative.'; if (formData.imageUrls.filter(Boolean).length === 0) alertMessages.push('At least one package image is required.\n'); if (formData.inclusions.length < 2) alertMessages.push('A package must have at least 2 inclusions.\n'); if (formData.colorMotifs.length < 1) alertMessages.push('A package must have at least 1 color motif.\n'); if (formData.colorMotifs.length < 1) alertMessages.push('A package must have at least 1 color motif.\n'); formData.inclusions.forEach((inc, index) => { const incErrors: any = {}; if (!inc.name.trim()) incErrors.name = true; if (inc.wearerNum < 1) incErrors.wearerNum = true; if (Object.keys(incErrors).length > 0) newErrors.inclusions[index] = incErrors; }); formData.colorMotifs.forEach((motif, motifIndex) => { const motifErrors: any = { assignments: [] }; if (!motif.motifHex.trim()) motifErrors.hex = true; motif.assignments.forEach((assign, assignIndex) => { const inclusion = formData.inclusions.find(inc => inc._id === assign.inclusionId); if (inclusion && !inclusion.isCustom && assign.assignedItems.some(item => item === null)) { motifErrors.assignments[assignIndex] = true; hasMissingAssignment = true; } }); if (motifErrors.hex || motifErrors.assignments.some((a: any) => a)) { newErrors.colorMotifs[motifIndex] = motifErrors; }}); setErrors(newErrors); if (hasMissingAssignment) {alertMessages.push('All non-custom items in every motif must be assigned.');} const hasDirectErrors = ['name', 'price', 'description'].some(key => newErrors[key]); const hasNestedErrors = newErrors.inclusions.some((e: any) => e) || newErrors.colorMotifs.some((e: any) => e); const hasAlertErrors = alertMessages.length > 0; if (hasAlertErrors) addAlert(alertMessages, 'danger'); return !hasDirectErrors && !hasNestedErrors && !hasAlertErrors; };
    const handleAddMotif = () => { const newAssignments = formData.inclusions.map(inc => ({inclusionId: inc._id, assignedItems: Array(inc.wearerNum).fill(null)})); setFormData(prev => ({ ...prev, colorMotifs: [...prev.colorMotifs, { motifHex: '#FFFFFF', assignments: newAssignments }] })); };
    const handleRemoveMotif = (motifIndex: number) => setFormData(prev => ({ ...prev, colorMotifs: prev.colorMotifs.filter((_, i) => i !== motifIndex) }));
    const handleOpenMotifBuilder = (motifIndex: number) => { setMotifBuilderContext(motifIndex); setShowMotifBuilder(true); };
    const handleSelectMotifFromBuilder = (color: { name: string, hex: string }) => { if (motifBuilderContext === null) return; const updatedMotifs = formData.colorMotifs.map((motif, index) => index === motifBuilderContext ? { ...motif, motifHex: color.hex } : motif); setFormData(prev => ({ ...prev, colorMotifs: updatedMotifs })); setShowMotifBuilder(false); };
    
    const proceedWithSave = async () => {
        setIsSaving(true);
        try {
            const finalImageUrls: (string | File | null)[] = [...formData.imageUrls];
            const uploadPromises: Promise<void>[] = [];
            formData.imageUrls.forEach((image, index) => {
                if (image instanceof File) {
                    const uploadPromise = uploadFile(image).then(newUrl => { finalImageUrls[index] = newUrl; }).catch(err => { console.error(`Upload failed for image slot #${index + 1}:`, err); throw new Error(`Image upload failed. Please try again.`); });
                    uploadPromises.push(uploadPromise);
                }
            });
            await Promise.all(uploadPromises);
            const finalPackageData = { ...formData, price: parseFloat(priceInput) || 0, imageUrls: finalImageUrls.filter((url): url is string => !!url), _id: packageData?._id } as Package;
            onSave(finalPackageData, imageUrlsToDelete);
        } catch (error: any) {
            console.error("Save process failed:", error);
            addAlert(error.message || "An unexpected error occurred during save.", 'danger');
        } finally {
            setIsSaving(false);
            setShowPriceWarningModal(false); // Ensure modal is closed
        }
    };
    
    const handleSave = () => {
        if (!validateForm()) return; // First, run standard validation.

        // Next, check for the zero price condition.
        if (parseFloat(priceInput) <= 0) {
            setShowPriceWarningModal(true); // If price is zero, show the warning modal and stop.
        } else {
            proceedWithSave(); // If price is valid, save directly.
        }
    };

    return (
        <>
            <Modal show={show} onHide={onHide} size="xl" backdrop="static">
              <Modal.Header closeButton><Modal.Title>{packageData ? 'Edit Package' : 'Add New Package'}</Modal.Title></Modal.Header>
              <Modal.Body style={{ height: '75vh', overflowY: 'auto' }}>
                  <Form>
                    <PackageDetailsForm
                      formData={formData} priceInput={priceInput} errors={errors}
                      nameError={nameError} isCheckingName={isCheckingName}
                      handleInputChange={handleInputChange} handlePriceInputChange={handlePriceInputChange} handlePriceBlur={handlePriceBlur}
                    />
                    <PackageImagesForm
                      imageUrls={formData.imageUrls}
                      onImageSelect={handleImageFileSelect}
                      onAddSlot={addImageSlot}
                    />
                    <Accordion>
                      <PackageInclusionsForm
                        inclusions={formData.inclusions}
                        onInclusionChange={handleInclusionChange}
                        onAddInclusion={handleAddInclusion}
                        onRemoveInclusion={handleRemoveInclusion}
                      />
                      <PackageMotifsForm
                        motifs={formData.colorMotifs} inclusions={formData.inclusions}
                        inventoryMap={inventoryMap} errors={errors} onAddMotif={handleAddMotif}
                        onRemoveMotif={handleRemoveMotif} onOpenMotifBuilder={handleOpenMotifBuilder}
                        onOpenAssignmentModal={handleOpenAssignmentModal}
                      />
                    </Accordion>
                  </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="primary" disabled={isSaving} onClick={handleSave}>
                  {isSaving ? <><Spinner as="span" size="sm" /> Saving...</> : 'Save Package'}
                </Button>
              </Modal.Footer>
            </Modal>
            
            {showAssignmentModal && (
                <SingleItemSelectionModal 
                    show={showAssignmentModal} onHide={() => setShowAssignmentModal(false)}
                    onSelect={handleSaveAssignment} addAlert={addAlert} mode="assignment"
                    preselectedItemId={assignmentToPreselect?.itemId}
                    preselectedVariation={assignmentToPreselect ? `${assignmentToPreselect.color.name}, ${assignmentToPreselect.size}` : undefined}
                    filterByColorHex={motifHexForModal}
                    filterByCategoryType={assignmentContext?.inclusionType}
                />
            )}  
            {showMotifBuilder && (<MotifBuilderModal show={showMotifBuilder} onHide={() => setShowMotifBuilder(false)} onSelect={handleSelectMotifFromBuilder} inventory={inventory} />)}
        
            <Modal show={showPriceWarningModal} onHide={() => setShowPriceWarningModal(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>
                  <ExclamationTriangleFill className="me-2 text-warning" />
                  Confirm Zero Price
                </Modal.Title>
              </Modal.Header>
              <Modal.Body>
                The price for this package is set to ₱0.00. Are you sure you want to proceed?
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowPriceWarningModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={proceedWithSave}>
                  Yes, Save with Zero Price
                </Button>
              </Modal.Footer>
            </Modal>
        </>
    );
}

export default PackageFormModal;