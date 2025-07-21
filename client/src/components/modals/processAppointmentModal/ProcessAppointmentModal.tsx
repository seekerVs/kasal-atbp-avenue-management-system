import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { PlusCircleFill, Trash } from 'react-bootstrap-icons';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import { Appointment, CustomTailoringItem, MeasurementRef } from '../../../types';
import { useAlert } from '../../../contexts/AlertContext';
import api from '../../../services/api';
import { MultiImageDropzone, MultiImageDropzoneRef } from '../../multiImageDropzone/MultiImageDropzone';
import { ValidatedInput } from '../../forms/ValidatedInput';

// Define the shape of the data that this modal saves
export interface ProcessedAppointmentData {
  appointmentId: string;
  status: 'Scheduled' | 'Completed';
  appointmentDate: string; // ISO string format
  processedItemData: CustomTailoringItem;
}

interface ProcessAppointmentModalProps {
  show: boolean;
  onHide: () => void;
  appointment: Appointment;
  bookingId: string;
  onSave: (updatedBooking: any) => void; // Parent will handle state update
}

const getInitialItemData = (appointment: Appointment): CustomTailoringItem => ({
  _id: `custom_${appointment.appointmentId}`,
  name: `Custom Item for ${appointment.appointmentFor.role}`,
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
});

export const ProcessAppointmentModal: React.FC<ProcessAppointmentModalProps> = ({ show, onHide, appointment, bookingId, onSave }) => {
  const { addAlert } = useAlert();
  const dropzoneRef = useRef<MultiImageDropzoneRef>(null);

  const [measurementRefs, setMeasurementRefs] = useState<MeasurementRef[]>([]);
  const [formData, setFormData] = useState<CustomTailoringItem>(getInitialItemData(appointment));
  const [appointmentDate, setAppointmentDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Reset form when modal is shown with a new appointment
    if (show) {
      const initialData = appointment.processedItemData || getInitialItemData(appointment);
      setFormData(initialData);
      
      const date = appointment.appointmentDate ? format(new Date(appointment.appointmentDate), 'yyyy-MM-dd') : '';
      setAppointmentDate(date);
      
      const fetchRefs = async () => {
        try {
          const res = await api.get('/measurementrefs');
          setMeasurementRefs(res.data || []);
        } catch (err) {
          addAlert('Could not load measurement templates.', 'danger');
        }
      };
      fetchRefs();
    }
  }, [show, appointment, addAlert]);

  const uniqueCategories = React.useMemo(() => Array.from(new Set(measurementRefs.map(ref => ref.category))), [measurementRefs]);
  const filteredOutfits = React.useMemo(() => measurementRefs.filter(ref => ref.category === formData.outfitCategory), [formData.outfitCategory, measurementRefs]);
  const selectedRef = measurementRefs.find(ref => ref.category === formData.outfitCategory && ref.outfitName === formData.outfitType);

  const handleChange = (field: keyof CustomTailoringItem, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMeasurementChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, measurements: { ...prev.measurements, [field]: value } }));
  };
  
  const handleDynamicListChange = (index: number, value: string) => {
    const newList = [...formData.materials];
    newList[index] = value;
    setFormData(prev => ({ ...prev, materials: newList }));
  };

  const addDynamicListItem = () => {
    setFormData(prev => ({ ...prev, materials: [...prev.materials, ''] }));
  };

  const removeDynamicListItem = (index: number) => {
    const newList = formData.materials.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, materials: newList }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!appointmentDate) newErrors.appointmentDate = "An appointment date must be scheduled.";
    if (!formData.name.trim()) newErrors.name = "Item name is required.";
    if (formData.price < 0) newErrors.price = "Price cannot be negative.";
    if (!formData.outfitCategory) newErrors.outfitCategory = "Outfit category is required.";
    if (!formData.outfitType) newErrors.outfitType = "Outfit type is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveClick = async () => {
    if (!validate()) {
        addAlert('Please fill in all required fields.', 'warning');
        return;
    }
    setIsSaving(true);
    try {
      const uploadedUrls = await dropzoneRef.current?.uploadAll();
      const finalItemData = {
        ...formData,
        referenceImages: uploadedUrls || [],
        materials: formData.materials.filter(m => m.trim() !== ''),
      };
      
      const payload: ProcessedAppointmentData = {
        appointmentId: appointment.appointmentId,
        status: 'Completed',
        appointmentDate: new Date(appointmentDate).toISOString(),
        processedItemData: finalItemData
      };
      
      const response = await api.put(`/bookings/${bookingId}`, {
        // We send the whole appointments array with our one change
        appointments: [{ ...payload }] 
      });

      onSave(response.data); // Let parent update its state
      onHide();
      addAlert('Appointment details saved successfully!', 'success');
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to save appointment.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Process Appointment for: {appointment.appointmentFor.role}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        <Form>
            <ValidatedInput
                label="Appointment Date"
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                error={errors.appointmentDate}
                isRequired
            />
            <hr />
            <h5>Custom Item Details</h5>
            <ValidatedInput
                label="Item Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={errors.name}
                isRequired
            />
            <Row>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Outfit Category <span className="text-danger">*</span></Form.Label>
                        <Form.Select value={formData.outfitCategory} onChange={e => handleChange('outfitCategory', e.target.value)} isInvalid={!!errors.outfitCategory}>
                            <option value="">Select Category...</option>
                            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">{errors.outfitCategory}</Form.Control.Feedback>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Outfit Type <span className="text-danger">*</span></Form.Label>
                        <Form.Select value={formData.outfitType} onChange={e => handleChange('outfitType', e.target.value)} isInvalid={!!errors.outfitType} disabled={!formData.outfitCategory}>
                            <option value="">Select Type...</option>
                            {filteredOutfits.map(ref => <option key={ref._id} value={ref.outfitName}>{ref.outfitName}</option>)}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">{errors.outfitType}</Form.Control.Feedback>
                    </Form.Group>
                </Col>
            </Row>

            {selectedRef && (
                <>
                <hr />
                <h6>Measurements (cm)</h6>
                <Row>
                    {selectedRef.measurements.map(m => (
                    <Col md={4} lg={3} key={m}>
                        <ValidatedInput
                            label={m.replace(/([A-Z])/g, ' $1').trim()}
                            type="number"
                            min="0"
                            value={String(formData.measurements[m] || '')}
                            onChange={(e) => handleMeasurementChange(m, e.target.value)}
                        />
                    </Col>
                    ))}
                </Row>
                </>
            )}

            <hr/>
            <Row>
                <Col md={6}>
                  <ValidatedInput
                    label="Price (₱)"
                    type="number"
                    min="0"
                    value={String(formData.price)}
                    onChange={e => handleChange('price', parseFloat(e.target.value) || 0)}
                    error={errors.price}
                  />
                  <Form.Group className="mb-3">
                    <Form.Label>Tailoring Type</Form.Label>
                    <Form.Select value={formData.tailoringType} onChange={e => handleChange('tailoringType', e.target.value)}>
                      <option value="Tailored for Purchase">For Purchase</option>
                      <option value="Tailored for Rent-Back">For Rent-Back</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-3">
                        <Form.Label>Materials</Form.Label>
                        {formData.materials.map((mat, index) => (
                            <InputGroup key={index} className="mb-2">
                                <Form.Control value={mat} onChange={e => handleDynamicListChange(index, e.target.value)} />
                                <Button variant="outline-danger" onClick={() => removeDynamicListItem(index)}><Trash /></Button>
                            </InputGroup>
                        ))}
                        <Button variant="outline-secondary" size="sm" onClick={addDynamicListItem}><PlusCircleFill className="me-2"/>Add Material</Button>
                    </Form.Group>
                </Col>
            </Row>

            <ValidatedInput
                label="Design Specifications"
                as="textarea"
                rows={3}
                value={formData.designSpecifications}
                onChange={e => handleChange('designSpecifications', e.target.value)}
            />
            
            <Form.Group className="mb-3">
                <Form.Label>Reference Images</Form.Label>
                <MultiImageDropzone
                    ref={dropzoneRef}
                    existingImageUrls={formData.referenceImages || []}
                />
            </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isSaving}>Cancel</Button>
        <Button variant="primary" onClick={handleSaveClick} disabled={isSaving}>
          {isSaving ? <><Spinner as="span" size="sm" /> Saving...</> : 'Save and Mark as Completed'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};