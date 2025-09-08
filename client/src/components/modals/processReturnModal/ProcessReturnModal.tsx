import React, { useState, useMemo } from 'react';
import { Modal, Button, Form, Row, Col, Image, InputGroup, ListGroup, Alert, Card, Spinner, Accordion } from 'react-bootstrap';
import { ExclamationTriangleFill, ArrowCounterclockwise } from 'react-bootstrap-icons';
import { RentalOrder, SingleRentItem, RentedPackage, CustomTailoringItem } from '../../../types';
import { useAlert } from '../../../contexts/AlertContext';
import { formatCurrency } from '../../../utils/formatters';

// Define the shape of the data this modal will submit
export interface ReturnPayload {
  late: boolean;
  depositReimbursed: number;
  damagedItems: {
    itemId: string;
    itemName: string;
    variation: string;
    imageUrl: string;
    quantity: number;
    damageReason: string;
    damageNotes?: string;
  }[];
}

// Define the props for our new modal
interface ProcessReturnModalProps {
  show: boolean;
  onHide: () => void;
  rental: RentalOrder;
  onSubmit: (payload: ReturnPayload) => Promise<void>; // The parent (RentalViewer) will handle the API call
}

interface ReturnableItem {
  key: string;
  type: 'Single' | 'Package' | 'Custom';
  name: string;
  variation: string;
  imageUrl: string;
  quantity: number;
  itemId: string;
}

// A helper type to manage the local state for each damaged item
type DamageLogEntry = ReturnPayload['damagedItems'][0];

const DAMAGE_REASONS = ["Stain", "Tear / Rip", "Broken Zipper / Button", "Missing Part", "Permanent Alteration", "Other"];

export const ProcessReturnModal: React.FC<ProcessReturnModalProps> = ({ show, onHide, rental, onSubmit }) => {
  const { addAlert } = useAlert();
  const [isLate, setIsLate] = useState(false);
  const [reimburseAmount, setReimburseAmount] = useState(String(rental.financials.depositAmount || 0));
  const [damagedItems, setDamagedItems] = useState<Map<string, DamageLogEntry>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeItemKey, setActiveItemKey] = useState<string | null>(null);

  // Memoize the flattened list of all rentable items in the order
  const allItems = useMemo(() => {
    const combined: ReturnableItem[] = [];
    rental.singleRents.forEach(item => {
      combined.push({
        key: `${item.itemId}-${item.variation.color.hex}-${item.variation.size}`,
        type: 'Single',
        name: item.name,
        variation: `${item.variation.color.name}, ${item.variation.size}`,
        imageUrl: item.imageUrl || '',
        quantity: item.quantity,
        itemId: item.itemId,
      });
    });
    rental.packageRents.forEach(pkg => {
      pkg.packageFulfillment.forEach((fulfill, fulfillIndex) => {
        const assigned = fulfill.assignedItem;

        // Use the 'in' operator as a type guard to check for 'itemId'.
        // This narrows the type of 'assigned' to FulfillmentItem inside this block.
        if (!fulfill.isCustom && assigned && 'itemId' in assigned && typeof assigned.itemId === 'string') {
          combined.push({
            key: `${pkg._id}-${fulfillIndex}-${assigned.itemId}-${assigned.variation}`,
            type: 'Package',
            name: `${assigned.name} (from ${pkg.name.split(',')[0]})`,
            variation: assigned.variation || '',
            imageUrl: assigned.imageUrl || '',
            quantity: 1,
            itemId: assigned.itemId,
          });
        }
        // --- END OF FIX ---
      });
    });
    rental.customTailoring.forEach(item => {
      // Only include items that are meant to be returned to us.
      if (item.tailoringType === 'Tailored for Rent-Back') {
        combined.push({
          // For custom items, the key is just their unique _id.
          key: `${item._id}-Custom`,
          type: 'Custom', // A new type for easy identification
          name: item.name,
          variation: `Custom (${item.outfitType})`,
          imageUrl: item.referenceImages[0] || '',
          quantity: item.quantity,
          itemId: item._id, // The ID is the item's own _id
        });
      }
    });
    return combined;
  }, [rental]);

  const handleDamageToggle = (itemKey: string, itemData: typeof allItems[0]) => {
    const isCurrentlyDamaged = damagedItems.has(itemKey);
    setDamagedItems(prev => {
      const newMap = new Map(prev);
      if (isCurrentlyDamaged) {
        newMap.delete(itemKey); // Untoggle: remove from map
      } else {
        // Toggle on: add a new entry with default values
        newMap.set(itemKey, {
          itemId: itemData.itemId,
          itemName: itemData.name,
          variation: itemData.variation,
          imageUrl: itemData.imageUrl,
          quantity: 1, // Default to 1 damaged
          damageReason: DAMAGE_REASONS[0], // Default to first reason
        });
      }
      return newMap;
    });
    if (isCurrentlyDamaged) {
      // If we are un-toggling it, close the accordion.
      setActiveItemKey(null);
    } else {
      // If we are toggling it on, open this item's accordion.
      setActiveItemKey(itemKey);
    }
  };

  const handleDamageDetailChange = (itemKey: string, field: keyof DamageLogEntry, value: string | number) => {
    setDamagedItems(prev => {
      const newMap = new Map(prev);
      const entry = newMap.get(itemKey);
      if (entry) {
        (entry as any)[field] = value;
        newMap.set(itemKey, entry);
      }
      return newMap;
    });
  };

  const handleSubmit = async () => {
    const reimburseValue = parseFloat(reimburseAmount) || 0;
    if (reimburseValue < 0 || reimburseValue > (rental.financials.depositAmount || 0)) {
        addAlert('Reimbursement amount is invalid.', 'warning');
        return;
    }
    
    // Final validation check for damaged items
    for (const entry of damagedItems.values()) {
        if (!entry.damageReason.trim()) {
            addAlert(`Please specify a reason for the damaged item: "${entry.itemName}".`, 'warning');
            return;
        }
    }

    setIsSubmitting(true);
    const payload: ReturnPayload = {
        late: isLate,
        depositReimbursed: reimburseValue,
        damagedItems: Array.from(damagedItems.values()),
    };
    await onSubmit(payload);
    setIsSubmitting(false);
  };
  
  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
            <ArrowCounterclockwise className="me-2"/>
            Inspect & Process Return for Rental #{rental._id}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-4">
          <Col lg={7}>
            <h6>Returnable Items</h6>
            <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '1rem' }}>
                <Accordion activeKey={activeItemKey || undefined} onSelect={(key) => setActiveItemKey(key as string | null)}>
                {allItems.map(item => {
                  const isDamaged = damagedItems.has(item.key);
                  const damageEntry = damagedItems.get(item.key);
                  return (
                    <Accordion.Item eventKey={item.key} key={item.key}>
                      <Accordion.Header>
                        <div className="d-flex justify-content-between align-items-center w-100 me-3">
                          <div className="d-flex align-items-center">
                            <Image src={item.imageUrl} style={{ width: 50, height: 50, objectFit: 'cover' }} rounded/>
                            <div className="ms-3 text-start lh-1">
                              <p className="fw-bold mb-0">{item.name}</p>
                              <small className="text-muted">{item.variation}</small><br/>
                              <small className="text-muted">Qty: {item.quantity}</small>
                            </div>
                          </div>
                          <Form.Check 
                            type="switch"
                            id={`damage-switch-${item.key}`}
                            label={isDamaged ? "Damaged" : "Not Damaged"}
                            checked={isDamaged}
                            // Stop propagation to prevent the accordion header click from firing
                            onClick={(e) => e.stopPropagation()} 
                            onChange={() => handleDamageToggle(item.key, item)}
                          />
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        {damageEntry && (
                          <div className="p-2 bg-light rounded border">
                              <Row className="g-2">
                                <Col md={3}>
                                    <Form.Group><Form.Label className="small">Qty Damaged</Form.Label><Form.Control type="number" size="sm" min="1" max={item.quantity} value={damageEntry.quantity} onChange={(e) => handleDamageDetailChange(item.key, 'quantity', Number(e.target.value))}/></Form.Group>
                                </Col>
                                <Col md={9}>
                                    <Form.Group><Form.Label className="small">Reason</Form.Label><Form.Select size="sm" value={damageEntry.damageReason} onChange={(e) => handleDamageDetailChange(item.key, 'damageReason', e.target.value)}>{DAMAGE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}</Form.Select></Form.Group>
                                </Col>
                                <Col xs={12}>
                                    <Form.Group><Form.Label className="small">Notes (Optional)</Form.Label><Form.Control as="textarea" rows={1} size="sm" placeholder="e.g., Large wine stain on front" value={damageEntry.damageNotes || ''} onChange={(e) => handleDamageDetailChange(item.key, 'damageNotes', e.target.value)}/></Form.Group>
                                </Col>
                              </Row>
                          </div>
                        )}
                      </Accordion.Body>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            </div>
          </Col>
          <Col lg={5}>
            <h6>Return Details</h6>
            <Card>
              <Card.Body>
                <Form.Check 
                    type="checkbox"
                    id="late-return-check"
                    label="This is a late return"
                    checked={isLate}
                    onChange={(e) => setIsLate(e.target.checked)}
                    className="mb-3"
                />
                <hr/>
                <Form.Group>
                    <Form.Label className="fw-bold">Deposit Reimbursement</Form.Label>
                    <Alert variant="info" className="small py-2">
                        Paid Deposit: <strong>{formatCurrency(rental.financials.depositAmount)}</strong>
                    </Alert>
                    <InputGroup>
                        <InputGroup.Text>₱</InputGroup.Text>
                        <Form.Control type="number" value={reimburseAmount} onChange={e => setReimburseAmount(e.target.value)} min="0" max={rental.financials.depositAmount} />
                    </InputGroup>
                    <Form.Text>Amount to return to the customer. This can be reduced to cover damages or late fees.</Form.Text>
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <><Spinner as="span" size="sm"/> Processing...</> : 'Confirm & Process Return'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};