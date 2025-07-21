import React from 'react'
import { Form, InputGroup, ListGroup, Button, Row, Col } from 'react-bootstrap';
import { Search, Palette, Hash } from 'react-bootstrap-icons';
import { InventoryItem, ItemReservation } from '../../types';

interface ItemReservationAdderProps {
  inventory: InventoryItem[];
  onAdd: (item: ItemReservation) => void;
}

export const ItemReservationAdder: React.FC<ItemReservationAdderProps> = ({ inventory, onAdd }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedItem, setSelectedItem] = React.useState<InventoryItem | null>(null);
  const [selectedVariationKey, setSelectedVariationKey] = React.useState('');
  const [quantity, setQuantity] = React.useState(1);

  const filteredInventory = React.useMemo(() => {
    if (!searchTerm) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return inventory.filter(i => i.name.toLowerCase().includes(lowerTerm) || i.category.toLowerCase().includes(lowerTerm));
  }, [searchTerm, inventory]);

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSearchTerm(item.name); // Populate search bar for clarity
    setSelectedVariationKey('');
    setQuantity(1);
  };

  const selectedVariation = selectedItem?.variations.find(v => `${v.color}, ${v.size}` === selectedVariationKey);
  
  const handleAddClick = () => {
    if (!selectedItem || !selectedVariation) return;
    onAdd({
      reservationId: '', // Parent will generate this
      status: 'Reserved',
      itemId: selectedItem._id,
      itemName: selectedItem.name,
      variation: { color: selectedVariation.color, size: selectedVariation.size },
      quantity: quantity,
      price: selectedItem.price,
    });
    // Reset form after adding
    setSearchTerm('');
    setSelectedItem(null);
    setSelectedVariationKey('');
    setQuantity(1);
  };

  return (
    <div>
      <Form.Group className="mb-3 position-relative">
        <Form.Label>Search for an Item</Form.Label>
        <InputGroup>
          <InputGroup.Text><Search /></InputGroup.Text>
          <Form.Control 
            type="search" 
            placeholder="Type name or category..." 
            value={searchTerm} 
            onChange={e => { setSearchTerm(e.target.value); setSelectedItem(null); }}
          />
        </InputGroup>
        {searchTerm && !selectedItem && (
          <ListGroup className="position-absolute w-100" style={{ zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
            {filteredInventory.length > 0 ? filteredInventory.map(item => (
              <ListGroup.Item action key={item._id} onClick={() => handleSelectItem(item)}>
                {item.name} <small className="text-muted">({item.category})</small>
              </ListGroup.Item>
            )) : <ListGroup.Item disabled>No items found</ListGroup.Item>}
          </ListGroup>
        )}
      </Form.Group>

      {selectedItem && (
        <>
          <Row>
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label><Palette className="me-2"/>Variation (Color, Size)</Form.Label>
                <Form.Select value={selectedVariationKey} onChange={e => setSelectedVariationKey(e.target.value)}>
                  <option value="">Select a variation...</option>
                  {selectedItem.variations.map(v => (
                    <option key={`${v.color}-${v.size}`} value={`${v.color}, ${v.size}`} disabled={v.quantity <= 0}>
                      {v.color}, {v.size} (Stock: {v.quantity})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label><Hash className="me-2"/>Quantity</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max={selectedVariation?.quantity || 1}
                  value={quantity}
                  onChange={e => setQuantity(Number(e.target.value))}
                  disabled={!selectedVariation}
                />
              </Form.Group>
            </Col>
          </Row>
          <div className="d-grid">
            <Button onClick={handleAddClick} disabled={!selectedVariation || quantity < 1}>
              Add Item to Booking
            </Button>
          </div>
        </>
      )}
    </div>
  );
};