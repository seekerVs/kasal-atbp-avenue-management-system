// client/src/layouts/packageItems/packageForm/PackageMotifsForm.tsx

import React from 'react';
import { Row, Col, Form, Button, Accordion, ListGroup, InputGroup, useAccordionButton } from 'react-bootstrap';
import { ChevronDown, Trash } from 'react-bootstrap-icons';
import { ColorMotif, InclusionItem, InventoryItem } from '../../../types';
import namer from 'color-namer';

interface PackageMotifsFormProps {
  motifs: ColorMotif[];
  inclusions: InclusionItem[];
  inventoryMap: Map<string, InventoryItem>;
  errors: any;
  onAddMotif: () => void;
  onRemoveMotif: (index: number) => void;
  onOpenMotifBuilder: (index: number) => void;
  onOpenAssignmentModal: (motifIndex: number, inclusionId: string, wearerIndex: number) => void;
}

function CustomAccordionToggle({ eventKey }: { eventKey: string }) {
  const decoratedOnClick = useAccordionButton(eventKey);
  return (<Button variant="light" onClick={decoratedOnClick} className="border"><ChevronDown /></Button>);
}

export const PackageMotifsForm: React.FC<PackageMotifsFormProps> = ({
  motifs,
  inclusions,
  inventoryMap,
  errors,
  onAddMotif,
  onRemoveMotif,
  onOpenMotifBuilder,
  onOpenAssignmentModal,
}) => {
  const getMotifName = (hex: string) => {
    try {
      const result = namer(hex);
      const name = result.ntc[0]?.name || 'Custom Color';
      return name.replace(/\b\w/g, char => char.toUpperCase());
    } catch { return 'Invalid Color'; }
  };

  return (
    <Accordion.Item eventKey="1">
      <Accordion.Header>Color Motifs & Item Assignments ({motifs.length})</Accordion.Header>
      <Accordion.Body>
        <Accordion defaultActiveKey="0">
          {motifs.map((motif, motifIndex) => (
            <Accordion.Item eventKey={String(motifIndex)} key={motif._id || motifIndex} className="mb-2">
              <div className="d-flex align-items-center gap-2 p-2 border-bottom bg-light">
                <CustomAccordionToggle eventKey={String(motifIndex)} />
                <InputGroup>
                  <div className="input-group-text" style={{ backgroundColor: motif.motifHex }}></div>
                  <Form.Control value={getMotifName(motif.motifHex)} readOnly />
                  <Button variant="outline-secondary" onClick={() => onOpenMotifBuilder(motifIndex)}>Select Color</Button>
                  <Button variant="outline-danger" onClick={() => onRemoveMotif(motifIndex)}><Trash/></Button>
                </InputGroup>
              </div>
              <Accordion.Body>
                <ListGroup variant="flush">
                  {motif.assignments.map((assignment, assignIndex) => {
                    const inclusion = inclusions.find(inc => inc._id === assignment.inclusionId);
                    if (!inclusion) return null;
                    return (
                      <ListGroup.Item key={assignment.inclusionId} className="px-1 py-3">
                        <Row>
                          <Col md={4}><strong className='d-block mt-2'>{inclusion.wearerNum} {inclusion.name}</strong></Col>
                          <Col md={8}>
                            {Array.from({ length: inclusion.wearerNum }).map((_, wearerIndex) => {
                              const assignedItem = assignment.assignedItems[wearerIndex];
                              const itemDetails = assignedItem ? inventoryMap.get(assignedItem.itemId) : null;
                              const displayValue = (assignedItem && itemDetails) 
                                ? `${itemDetails.name} (${assignedItem.color.name}, ${assignedItem.size})` 
                                : 'Not Assigned';
                              return (
                                <InputGroup key={wearerIndex} className="mb-2">
                                  <InputGroup.Text>{`#${wearerIndex + 1}`}</InputGroup.Text>
                                  <Form.Control readOnly value={displayValue} className={!itemDetails ? 'text-muted fst-italic' : ''} isInvalid={!!errors.colorMotifs?.[motifIndex]?.assignments?.[assignIndex]}/>
                                  <Button variant="outline-primary" disabled={!!inclusion.isCustom} onClick={() => onOpenAssignmentModal(motifIndex, inclusion._id, wearerIndex)}>Assign</Button>
                                </InputGroup>
                              )
                            })}
                          </Col>
                        </Row>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
        <Button variant="outline-primary" className="mt-2" onClick={onAddMotif}>+ Add Color Motif</Button>
      </Accordion.Body>
    </Accordion.Item>
  );
};