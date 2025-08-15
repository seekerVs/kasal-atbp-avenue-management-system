import React from 'react';
import { Modal, Button, ListGroup, Row, Col, Badge, Image } from 'react-bootstrap'; // <-- Add Image
import { BoxSeam, WrenchAdjustable } from 'react-bootstrap-icons';
import { InventoryItem, PackageReservation } from '../../../types'; // <-- Add InventoryItem

interface ReservedPackageDetailsModalProps {
  show: boolean;
  onHide: () => void;
  packageReservation: PackageReservation | null;
}

export const ReservedPackageDetailsModal: React.FC<ReservedPackageDetailsModalProps> = ({
  show,
  onHide,
  packageReservation,
}) => {

  if (!packageReservation) {
    return null;
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <BoxSeam className="me-2" />
          Package Details: {packageReservation.packageName}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className='lh-1' style={{maxHeight:'75vh', overflowY:'auto'}}>
        <ListGroup variant="flush">
          <ListGroup.Item className="d-none d-md-block">
            <Row className="fw-bold text-muted">
              <Col md={3}>Role</Col>
              <Col md={3}>Wearer Name</Col>
              <Col md={6}>Assigned Item</Col>
            </Row>
          </ListGroup.Item>

          {packageReservation.fulfillmentPreview.map((fulfillment, index) => {
            // --- THIS IS THE NEW LOGIC BLOCK ---
            const assignedItem = fulfillment.assignedItemId as InventoryItem; // Type assertion for easier access
            const isAssigned = fulfillment.assignedItemId && typeof fulfillment.assignedItemId === 'object';
            let imageUrl = 'https://placehold.co/60x60/e9ecef/adb5bd?text=N/A';

            if (isAssigned && fulfillment.variation) {
              const [colorName, size] = fulfillment.variation.split(',').map(s => s.trim());
              const variationDetails = assignedItem.variations.find(
                v => v.color.name === colorName && v.size === size
              );
              if (variationDetails) {
                imageUrl = variationDetails.imageUrl;
              }
            }
            // --- END OF NEW LOGIC ---

            return (
              <ListGroup.Item key={index}>
                <Row className="align-items-center">
                  <Col md={3}>
                    <p className="fw-bold mb-0">
                      {fulfillment.role}
                    </p>
                  </Col>
                  <Col md={3}>
                    <p className="text-muted mb-0">
                      {fulfillment.wearerName || '(No name specified)'}
                    </p>
                  </Col>
                  <Col md={6}>
                    {fulfillment.isCustom ? (
                      // Custom item display (unchanged)
                      <div className="d-flex align-items-center">
                        <WrenchAdjustable className="me-2 text-info" />
                        <div>
                          <p className="mb-1">Custom Tailoring Item</p>
                          {fulfillment.notes && (<p className="text-muted fst-italic small mb-0">Notes: "{fulfillment.notes}"</p>)}
                          {fulfillment.linkedAppointmentId && (<Badge pill bg="primary" as="a" href={`/appointments/${fulfillment.linkedAppointmentId}`} target="_blank" className="text-decoration-none mt-1">View Appointment</Badge>)}
                        </div>
                      </div>
                    ) : isAssigned ? (
                      // --- UPDATED DISPLAY FOR STANDARD ITEMS ---
                      <div className="d-flex align-items-center">
                        <Image src={imageUrl} rounded style={{ width: '60px', height: '60px', objectFit: 'cover', marginRight: '1rem' }} />
                        <div>
                          <p className="mb-1 fw-bold">{assignedItem.name}</p>
                          <p className="text-muted small mb-0">{fulfillment.variation}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted fst-italic mb-0">Not yet assigned</p>
                    )}
                  </Col>
                </Row>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};