// client\src\components\forms\packageFulfillmentForm\PackageFulfillmentForm.tsx

import React, { useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { setHours, setMinutes, getDay, startOfDay } from 'date-fns';
import { Row, Col, Form, Button, ListGroup, Image } from 'react-bootstrap';
import { PencilSquare } from 'react-bootstrap-icons';
import { FulfillmentPreview, PackageFulfillment } from '../../../types';
import './packageFulfillmentForm.css';
import { DateTimePicker } from '../../dateTimePicker/DateTimePicker';


type FulfillmentItem = PackageFulfillment | FulfillmentPreview;

export interface FulfillmentError {
  index: number;
  field: 'wearerName' | 'notes'; // Specify which field has the error
  message: string;
}

interface PackageFulfillmentFormProps {
  fulfillmentData: FulfillmentItem[];
  appointmentDate: Date | null;
  unavailableDates: Date[];
  errors: FulfillmentError[]; 
  onWearerNameChange: (index: number, name: string) => void;
  onOpenSizeSelectionModal: (index: number) => void;
  onAppointmentDateChange: (date: Date | null) => void;
  onCustomItemNoteChange: (index: number, note: string) => void;
}

export const PackageFulfillmentForm: React.FC<PackageFulfillmentFormProps> = ({
  fulfillmentData,
  appointmentDate,
  unavailableDates,
  onWearerNameChange,
  onOpenSizeSelectionModal,
  onAppointmentDateChange,
  onCustomItemNoteChange,
  errors,
}) => {
    // Helper to check if there are any custom items in the package
  const hasCustomItems = useMemo(() => 
    fulfillmentData.some(item => (item as FulfillmentPreview).isCustom), 
    [fulfillmentData]
  );

  return (
    <>
      <ListGroup variant="flush" className="fulfillment-form-container">
        {/* --- NEW: Conditional DatePicker for Custom Items --- */}
        {hasCustomItems && (
            <Form.Group className="mb-2 p-3 bg-light border rounded">
            <Form.Label className="fw-bold">
                Select Appointment Date & Time
            </Form.Label>
            <DateTimePicker
                selectedDate={appointmentDate}
                onChange={onAppointmentDateChange}
                unavailableDates={unavailableDates}
                minDate={new Date()}
            />
            <Form.Text>This single appointment will be for all custom-made items in this package.</Form.Text>
            </Form.Group>
        )}

        {fulfillmentData.map((fulfillItem, index) => {
          const isDesignatedAsCustom = (fulfillItem as FulfillmentPreview).isCustom === true;
          const assigned = (fulfillItem as PackageFulfillment).assignedItem || {};
          
          let isLinkedToItem = false;
          let imageUrl = 'https://placehold.co/80x80/e9ecef/adb5bd?text=N/A';
          let displayName = 'Not Assigned';
          let displayVariation = '';

          if (assigned && 'itemId' in assigned && assigned.itemId) {
              isLinkedToItem = true;
              displayName = assigned.name || 'Assigned Item';
              displayVariation = assigned.variation || 'Variation not selected';
              imageUrl = assigned.imageUrl || imageUrl;
          }

          const wearerNameError = errors.find(e => e.index === index && e.field === 'wearerName');
          const notesError = errors.find(e => e.index === index && e.field === 'notes');

          return (
            <ListGroup.Item key={index} className="px-0 py-3">
              {/* --- THIS IS THE CORRECTED STRUCTURE --- */}
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-bold">{fulfillItem.role}</Form.Label>
                    <Form.Control
                      id={`wearer-name-${index}`}
                      size="sm"
                      type="text"
                      placeholder="Enter wearer's name"
                      value={fulfillItem.wearerName || ''}
                      onChange={(e) => onWearerNameChange(index, e.target.value)}
                      isInvalid={!!wearerNameError}
                    />
                    <Form.Control.Feedback type="invalid">
                      {wearerNameError?.message}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>

                {isDesignatedAsCustom ? (
                  // Layout for Custom Items (no image)
                  <Col md={8} className='align-self-end'>
                    <Form.Group>
                      <Form.Label className="fw-bold small text-muted">Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Notes for customization..."
                        value={(fulfillItem as FulfillmentPreview).notes || ''}
                        onChange={(e) => onCustomItemNoteChange(index, e.target.value)}
                        size="sm"
                        isInvalid={!!notesError}
                        
                      />
                      <Form.Control.Feedback type="invalid">
                          {notesError?.message}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                ) : (
                  // Layout for Standard Items (with image)
                  <>
                    <Col xs={4} md={2} className="text-center align-self-center">
                      <Image src={imageUrl} rounded style={{width: 60, height: 60, objectFit: 'cover'}}/>
                    </Col>
                    <Col xs={8} md={4} className="align-self-center">
                      <div className="assignment-details">
                        <p className="fw-bold mb-0 text-truncate" title={displayName}>{displayName}</p>
                        <p className="small text-muted mb-0">{displayVariation}</p>
                      </div>
                    </Col>
                    <Col md={2} className="text-end align-self-center p-0">
                      {isLinkedToItem && (
                        <Button 
                          variant="outline-primary" 
                          size="sm" 
                          onClick={() => onOpenSizeSelectionModal(index)}
                        >
                          <PencilSquare className="me-1"/>
                          Change Size
                        </Button>
                      )}
                    </Col>
                  </>
                )}
              </Row>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </>
  );
};