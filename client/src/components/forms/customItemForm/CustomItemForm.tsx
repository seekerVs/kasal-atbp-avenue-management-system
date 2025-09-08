import React, { Ref, useMemo } from 'react';
import { Form, Row, Col, InputGroup, Button } from 'react-bootstrap';
import { PlusCircleFill, Trash, CardText, CashCoin, Hash, PencilSquare, Palette, Image, FileText, Grid3x3GapFill } from 'react-bootstrap-icons';
import { CustomTailoringItem, MeasurementRef } from '../../../types';
import { MultiImageDropzone, MultiImageDropzoneRef } from '../../multiImageDropzone/MultiImageDropzone';

// --- PROPS INTERFACE (from previous step) ---
export interface CustomItemFormProps {
  formData: Omit<CustomTailoringItem, '_id'>;
  measurementRefs: MeasurementRef[];
  selectedCategory: string;
  selectedRefId: string;
  errors: { [key: string]: any };
  isForPackage?: boolean;
  isCreateMode?: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onCategoryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onRefChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onMeasurementChange: (field: string, value: string) => void;
  onDynamicListChange: (listType: 'materials', index: number, value: string) => void;
  onAddDynamicListItem: (listType: 'materials') => void;
  onRemoveDynamicListItem: (listType: 'materials', index: number) => void;
  dropzoneRef: Ref<MultiImageDropzoneRef>; 
}

// --- NEW: THE FULL COMPONENT IMPLEMENTATION ---
export const CustomItemForm: React.FC<CustomItemFormProps> = ({
  formData,
  measurementRefs,
  selectedCategory,
  selectedRefId,
  errors,
  isForPackage,
  isCreateMode,
  onInputChange,
  onCategoryChange,
  onRefChange,
  onMeasurementChange,
  onDynamicListChange,
  onAddDynamicListItem,
  onRemoveDynamicListItem,
  dropzoneRef,
}) => {

  // Memoized calculations are now done inside the reusable component
  const uniqueCategories = useMemo(() => Array.from(new Set((measurementRefs || []).map(ref => ref.category))), [measurementRefs]);
  const filteredOutfits = useMemo(() => (measurementRefs || []).filter(ref => ref.category === selectedCategory), [selectedCategory, measurementRefs]);
  const selectedRef = useMemo(() => (measurementRefs || []).find(ref => ref._id === selectedRefId), [selectedRefId, measurementRefs]);

  return (
    // This is the JSX moved from CreateEditCustomItemModal
    // It has been adapted to use props instead of local state.
    <Form noValidate>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><Grid3x3GapFill className="me-2 text-muted" />Outfit Category<span className="text-danger">*</span></Form.Label>
            <Form.Select value={selectedCategory} onChange={onCategoryChange} disabled={!isCreateMode} isInvalid={!!errors.outfitCategory} >
              <option value="">-- Select a Category --</option>
              {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors.outfitCategory}</Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label><FileText className="me-2 text-muted" />Outfit Type<span className="text-danger">*</span></Form.Label>
            <Form.Select value={selectedRefId} onChange={onRefChange} disabled={!isCreateMode || !selectedCategory} isInvalid={!!errors.outfitType} >
              <option value="">-- Select an Outfit Type --</option>
              {filteredOutfits.map(ref => <option key={ref._id} value={ref._id}>{ref.outfitName}</option>)}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors.outfitType}</Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>
      <hr/>

      <Form.Group className="mb-3">
        <Form.Label><PencilSquare className="me-2 text-muted" />Item Name<span className="text-danger">*</span></Form.Label>
        <Form.Control type="text" name="name" value={formData.name} onChange={onInputChange} isInvalid={!!errors.name} />
        <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
      </Form.Group>
      <Row>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label><CashCoin className="me-2 text-muted" />Price (₱)</Form.Label>
            <Form.Control type="number" name="price" min="0" value={formData.price} onChange={onInputChange} />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label><Hash className="me-2 text-muted" />Quantity<span className="text-danger">*</span></Form.Label>
            <Form.Control type="number" name="quantity" min="1" value={formData.quantity} onChange={onInputChange} isInvalid={!!errors.quantity} />
            <Form.Control.Feedback type="invalid">{errors.quantity}</Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Tailoring Type</Form.Label>
            <Form.Select name="tailoringType" value={formData.tailoringType} onChange={onInputChange} disabled={isForPackage}>
              <option value="Tailored for Purchase">For Purchase</option>
              <option value="Tailored for Rent-Back">For Rent-Back</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label><CardText className="me-2 text-muted" />Design Specifications</Form.Label>
        <Form.Control as="textarea" rows={3} name="designSpecifications" value={formData.designSpecifications || ''} onChange={onInputChange} />
      </Form.Group>

      {(selectedRef || (!isCreateMode && Object.keys(formData.measurements).length > 0)) && (
            <>
            <hr /><h6>Measurements (cm)</h6><Row>
            {(isCreateMode && selectedRef ? selectedRef.measurements : Object.keys(formData.measurements)).map(m => (
                <Col md={4} lg={3} key={m} className="mb-2">
                <Form.Group>
                    <Form.Label className="small text-capitalize">{m.replace(/([A-Z])/g, ' $1').trim()}<span className="text-danger">*</span></Form.Label>
                    <Form.Control type="number" value={formData.measurements[m] || ''} onChange={(e) => onMeasurementChange(m, e.target.value)} isInvalid={!!errors.measurements?.[m]} />
                    <Form.Control.Feedback type="invalid" tooltip>{errors.measurements?.[m]}</Form.Control.Feedback>
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
                <Form.Control placeholder="e.g., Silk, Lace" value={material} onChange={(e) => onDynamicListChange('materials', index, e.target.value)} />
                <Button variant="outline-danger" onClick={() => onRemoveDynamicListItem('materials', index)}><Trash /></Button>
              </InputGroup>
            ))}
            <Button variant="outline-secondary" size="sm" onClick={() => onAddDynamicListItem('materials')}><PlusCircleFill className="me-1" />Add Material</Button>
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
        <Form.Control as="textarea" rows={2} name="notes" value={formData.notes || ''} onChange={onInputChange} />
      </Form.Group>
    </Form>
  );
};