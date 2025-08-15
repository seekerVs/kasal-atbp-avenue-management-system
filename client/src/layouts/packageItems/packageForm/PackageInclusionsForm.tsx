// client/src/layouts/packageItems/packageForm/PackageInclusionsForm.tsx

import React from 'react';
import { Row, Col, Form, Button, Accordion } from 'react-bootstrap';
import { PlusCircleFill, Trash } from 'react-bootstrap-icons';
import { InclusionItem } from '../../../types';

interface PackageInclusionsFormProps {
  inclusions: InclusionItem[];
  onInclusionChange: (index: number, field: keyof Omit<InclusionItem, '_id'>, value: string | number | boolean) => void;
  onAddInclusion: () => void;
  onRemoveInclusion: (id: string) => void;
}

export const PackageInclusionsForm: React.FC<PackageInclusionsFormProps> = ({
  inclusions,
  onInclusionChange,
  onAddInclusion,
  onRemoveInclusion,
}) => {
  return (
    <Accordion.Item eventKey="0">
      <Accordion.Header>Package Inclusions ({inclusions.length})</Accordion.Header>
      <Accordion.Body>
        <Row>
          {(() => {
            const midpoint = Math.ceil(inclusions.length / 2);
            const leftColumnInclusions = inclusions.slice(0, midpoint);
            const rightColumnInclusions = inclusions.slice(midpoint);
            return (
              <>
                <Col md={6} className="border-end-md pe-md-3">
                  <Row className="text-muted small mb-2 d-none d-md-flex gx-2 align-items-center">
                    <Col xs="auto" style={{ width: '70px' }}>#</Col>
                    <Col>Inclusion Name</Col>
                    <Col xs="auto" style={{ width: '120px' }}>Type</Col>
                    <Col xs="auto" style={{ width: '80px' }} className="text-center">Custom</Col>
                    <Col xs="auto" style={{ width: '50px' }}></Col>
                  </Row>
                  {leftColumnInclusions.map((inclusion, index) => (
                    <Row key={inclusion._id} className="g-2 align-items-center mb-2">
                      <Col xs="auto" style={{ width: '70px' }}><Form.Control type="number" min="1" value={inclusion.wearerNum} onChange={(e) => onInclusionChange(index, 'wearerNum', Number(e.target.value))} placeholder="#"/></Col>
                      <Col><Form.Control type="text" placeholder="e.g., Bridal Gown" value={inclusion.name} onChange={(e) => onInclusionChange(index, 'name', e.target.value)} /></Col>
                      <Col xs="auto" style={{ width: '120px' }}><Form.Select size="sm" value={inclusion.type || 'Wearable'} onChange={(e) => onInclusionChange(index, 'type', e.target.value as 'Wearable' | 'Accessory')} disabled={inclusion.isCustom}><option value="Wearable">Wearable</option><option value="Accessory">Accessory</option></Form.Select></Col>
                      <Col xs="auto" style={{ width: '80px' }} className="text-center"><Form.Check type="switch" id={`custom-switch-left-${index}`} checked={!!inclusion.isCustom} onChange={(e) => onInclusionChange(index, 'isCustom', e.target.checked)} /></Col>
                      <Col xs="auto" style={{ width: '50px' }} className="text-end"><Button variant="outline-danger" size="sm" onClick={() => onRemoveInclusion(inclusion._id)}><Trash /></Button></Col>
                    </Row>
                  ))}
                </Col>
                <Col md={6} className="ps-md-3">
                  <Row className="text-muted small mb-2 d-none d-md-flex gx-2 align-items-center">
                    <Col xs="auto" style={{ width: '70px' }}>#</Col>
                    <Col>Inclusion Name</Col>
                    <Col xs="auto" style={{ width: '120px' }}>Type</Col>
                    <Col xs="auto" style={{ width: '80px' }} className="text-center">Custom</Col>
                    <Col xs="auto" style={{ width: '50px' }}></Col>
                  </Row>
                  {rightColumnInclusions.map((inclusion, index) => {
                    const originalIndex = midpoint + index;
                    return (
                      <Row key={inclusion._id} className="g-2 align-items-center mb-2">
                          <Col xs="auto" style={{ width: '70px' }}><Form.Control type="number" min="1" value={inclusion.wearerNum} onChange={(e) => onInclusionChange(originalIndex, 'wearerNum', Number(e.target.value))} placeholder="#"/></Col>
                          <Col><Form.Control type="text" placeholder="e.g., Entourage Gown" value={inclusion.name} onChange={(e) => onInclusionChange(originalIndex, 'name', e.target.value)} /></Col>
                          <Col xs="auto" style={{ width: '120px' }}><Form.Select size="sm" value={inclusion.type || 'Wearable'} onChange={(e) => onInclusionChange(originalIndex, 'type', e.target.value as 'Wearable' | 'Accessory')} disabled={inclusion.isCustom}><option value="Wearable">Wearable</option><option value="Accessory">Accessory</option></Form.Select></Col>
                          <Col xs="auto" style={{ width: '80px' }} className="text-center"><Form.Check type="switch" id={`custom-switch-right-${index}`} checked={!!inclusion.isCustom} onChange={(e) => onInclusionChange(originalIndex, 'isCustom', e.target.checked)} /></Col>
                          <Col xs="auto" style={{ width: '50px' }} className="text-end"><Button variant="outline-danger" size="sm" onClick={() => onRemoveInclusion(inclusion._id)}><Trash /></Button></Col>
                      </Row>
                    )
                  })}
                </Col>
              </>
            )
          })()}
        </Row>
        <Button variant="outline-secondary" size="sm" className="mt-2" onClick={onAddInclusion}><PlusCircleFill className="me-2" />Add Inclusion</Button>
      </Accordion.Body>
    </Accordion.Item>
  );
};