import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { PlusCircleFill, Trash } from 'react-bootstrap-icons';
import { useNotification } from '../../../contexts/NotificationContext';
import { CustomTailoringItem } from '../../../types';

interface EditCustomItemModalProps {
  show: boolean;
  onHide: () => void;
  item: CustomTailoringItem;
  onSave: (updatedItem: CustomTailoringItem) => void;
}

const EditCustomItemModal: React.FC<EditCustomItemModalProps> = ({ show, onHide, item, onSave }) => {
  const [formData, setFormData] = useState<CustomTailoringItem>(item);
  const { addNotification } = useNotification();

  // Reset form data when the modal is opened with a new item
  useEffect(() => {
    // Deep copy to prevent mutating the original object from the parent component
    setFormData(JSON.parse(JSON.stringify(item)));
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: (name === 'price' || name === 'quantity') ? parseFloat(value) || 0 : value
    }));
  };

  const handleMeasurementChange = (field: string, value: string) => {
    setFormData(prev => ({
        ...prev,
        measurements: {
            ...prev.measurements,
            [field]: value,
        },
    }));
  };

  const handleDynamicListChange = (listType: 'materials' | 'referenceImages', index: number, value: string) => {
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
    let isValid = true;
    if (!formData.name.trim()) {
        addNotification("Item Name is required.", 'danger');
        isValid = false;
    }
    if (formData.quantity < 1) {
        addNotification("Quantity must be at least 1.", 'danger');
        isValid = false;
    }
    if (formData.price < 0) {
        addNotification("Price cannot be negative.", 'danger');
        isValid = false;
    }
    if (!formData.designSpecifications.trim()) {
        addNotification("Design Specifications are required.", 'danger');
        isValid = false;
    }
    if (!formData.materials || formData.materials.every(m => m.trim() === '')) {
      addNotification("At least one Material is required.", 'danger');
      isValid = false;
    }
    return isValid;
  };

  const handleSaveChanges = () => {
    if (!validateForm()) {
        return; // Stop if validation fails
    }

    // Clean up empty strings from arrays before saving
    const cleanedData = {
        ...formData,
        materials: formData.materials?.filter(m => m.trim() !== '') || [],
        referenceImages: formData.referenceImages?.filter(r => r.trim() !== '') || [],
    };
    onSave(cleanedData);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Edit Custom Tailoring Item</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Item Name</Form.Label>
                <Form.Control type="text" name="name" value={formData.name} onChange={handleChange} />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label>Quantity</Form.Label>
                <Form.Control type="number" name="quantity" min="1" value={formData.quantity} onChange={handleChange} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Price (₱)</Form.Label>
                <Form.Control type="number" name="price" min="0" value={formData.price} onChange={handleChange} />
              </Form.Group>
            </Col>
            <Col md={3}>
                <Form.Group className="mb-3">
                    <Form.Label>Tailoring Type</Form.Label>
                    <Form.Select name="tailoringType" value={formData.tailoringType} onChange={handleChange}>
                        <option value="Tailored for Purchase">For Purchase</option>
                        <option value="Tailored for Rent-Back">For Rent-Back</option>
                    </Form.Select>
                </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Design Specifications</Form.Label>
            <Form.Control as="textarea" rows={3} name="designSpecifications" value={formData.designSpecifications || ''} onChange={handleChange} />
          </Form.Group>

          {formData.measurements && Object.keys(formData.measurements).length > 0 && (
            <>
                <hr />
                <h6>Measurements (cm)</h6>
                <Row>
                    {Object.entries(formData.measurements).map(([key, value]) => (
                        <Col md={4} lg={3} key={key} className="mb-2">
                            <Form.Group>
                                <Form.Label className="small text-capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={value || ''}
                                    onChange={(e) => handleMeasurementChange(key, e.target.value)}
                                />
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
                    <Form.Label>Materials</Form.Label>
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
                    <Form.Label>Reference Image URLs</Form.Label>
                    {(formData.referenceImages || []).map((image, index) => (
                        <InputGroup key={index} className="mb-2">
                            <Form.Control placeholder="https://..." value={image} onChange={(e) => handleDynamicListChange('referenceImages', index, e.target.value)} />
                            <Button variant="outline-danger" onClick={() => removeDynamicListItem('referenceImages', index)}><Trash /></Button>
                        </InputGroup>
                    ))}
                    <Button variant="outline-secondary" size="sm" onClick={() => addDynamicListItem('referenceImages')}><PlusCircleFill className="me-1" />Add Image URL</Button>
                </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Additional Notes</Form.Label>
            <Form.Control as="textarea" rows={2} name="notes" value={formData.notes || ''} onChange={handleChange} />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleSaveChanges}>Save Changes</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditCustomItemModal;