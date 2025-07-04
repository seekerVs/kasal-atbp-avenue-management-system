// client/src/components/modals/AssignmentSubModal.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Button, Row, Col, InputGroup, Form, ListGroup, Card, Image as BsImage, Badge, Alert } from 'react-bootstrap';
import { Search } from 'react-bootstrap-icons';
import { InventoryItem } from '../../../types';

interface AssignmentSubModalProps {
    show: boolean;
    onHide: () => void;
    inventory: InventoryItem[];
    onAssign: (data: { itemId: string; name: string; variation: string; imageUrl: string }) => void;
    preselectedItemId?: string;      // <-- NEW PROP
    preselectedVariation?: string; // <-- NEW PROP
}

const AssignmentSubModal: React.FC<AssignmentSubModalProps> = ({
  show,
  onHide,
  inventory,
  onAssign,
  preselectedItemId,
  preselectedVariation,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [selectedVariation, setSelectedVariation] = useState<string>('');

    const selectedItem = useMemo(() => inventory.find(i => i._id === selectedItemId), [selectedItemId, inventory]);

    useEffect(() => {
        if (show) {
            // If there's a preselected item, set the state
            if (preselectedItemId) {
                setSelectedItemId(preselectedItemId);
                if (preselectedVariation) {
                    setSelectedVariation(preselectedVariation);
                }
            }
        } else {
            // Reset state when modal is hidden
            setSearchTerm('');
            setSelectedItemId(null);
            setSelectedVariation('');
        }
    }, [show, preselectedItemId, preselectedVariation]);

    const filteredInventory = useMemo(() => {
        if (!searchTerm) return inventory;
        return inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, inventory]);

    const handleAssign = () => {
        if (!selectedItem || !selectedVariation) return;

        const variationDetails = selectedItem.variations.find(v => `${v.color}, ${v.size}` === selectedVariation);
        if (!variationDetails) return;

        onAssign({
            itemId: selectedItem._id,
            name: selectedItem.name,
            variation: selectedVariation,
            imageUrl: variationDetails.imageUrl
        });
        onHide();
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>Assign Item to Role</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Row>
                    <Col md={5}>
                        <InputGroup className="mb-3">
                            <InputGroup.Text><Search/></InputGroup.Text>
                            <Form.Control placeholder="Search inventory..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </InputGroup>
                        <ListGroup style={{maxHeight: '400px', overflowY: 'auto'}}>
                            {filteredInventory.map(item => (
                                <ListGroup.Item key={item._id} action active={selectedItemId === item._id} onClick={() => { setSelectedItemId(item._id); setSelectedVariation(''); }}>
                                    {item.name}
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Col>
                    <Col md={7}>
                        {selectedItem ? (
                            <>
                                <h5>{selectedItem.name}</h5>
                                <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                                    {selectedItem.variations.map(v => (
                                        <Card key={`${v.color}-${v.size}`} className={`mb-2 ${selectedVariation === `${v.color}, ${v.size}` ? 'border-primary' : ''}`} onClick={() => v.quantity > 0 ? setSelectedVariation(`${v.color}, ${v.size}`) : null} style={{cursor: v.quantity > 0 ? 'pointer' : 'not-allowed'}}>
                                            <Row className="g-0">
                                                <Col xs={4}><BsImage src={v.imageUrl} fluid className="rounded-start" style={{ width: '100%', height: '100px', objectFit: 'cover'}} /></Col>
                                                <Col xs={8}>
                                                    <Card.Body className="py-2 px-3">
                                                        <Card.Text className="mb-1"><strong>Color:</strong> {v.color}</Card.Text>
                                                        <Card.Text className="mb-1"><strong>Size:</strong> {v.size}</Card.Text>
                                                        <Card.Text><strong>Stock:</strong> <Badge bg={v.quantity > 0 ? 'success' : 'danger'}>{v.quantity}</Badge></Card.Text>
                                                    </Card.Body>
                                                </Col>
                                            </Row>
                                        </Card>
                                    ))}
                                </div>
                            </>
                        ) : <Alert variant="info">Select an item from the list to view variations.</Alert>}
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={handleAssign} disabled={!selectedItemId || !selectedVariation}>Assign Variation</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default AssignmentSubModal;