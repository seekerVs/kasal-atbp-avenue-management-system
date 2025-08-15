import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { Palette } from 'react-bootstrap-icons';
import { SingleRentItem, InventoryItem, ItemVariation } from '../../../types';
import api from '../../../services/api';

// --- COMPONENT PROPS INTERFACE ---
interface EditItemModalProps {
  show: boolean;
  onHide: () => void;
  item: SingleRentItem; // <-- NEW, CORRECT TYPE
  onSave: (quantity: number, newVariation: ItemVariation) => void;
}

// ===================================================================================
// --- THE REUSABLE MODAL COMPONENT ---
// ===================================================================================
const EditItemModal: React.FC<EditItemModalProps> = ({ show, onHide, item, onSave }) => {
  const [productDetails, setProductDetails] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(item.quantity);
  const [selectedVariation, setSelectedVariation] = useState<ItemVariation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Set/Reset state when the modal is shown with a new item
  useEffect(() => {
    if (show && item) {
      setQuantity(item.quantity);
      
      const fetchProductDetails = async () => {
          setLoading(true);
          setError('');
          try {
              // --- UPDATED: Fetch by the direct itemId ---
              const res = await api.get(`/inventory/${item.itemId}`);
              const fetchedProduct: InventoryItem = res.data;
              setProductDetails(fetchedProduct);
              
              // --- UPDATED: Find and set the initial variation object ---
              const initialVariation = fetchedProduct.variations.find(
                  v => v.color.hex === item.variation.color.hex && v.size === item.variation.size
              );
              setSelectedVariation(initialVariation || null);

          } catch (err) {
              setError('Could not load item variations.');
          } finally {
              setLoading(false);
          }
      };
      fetchProductDetails();
    }
  }, [show, item]);

  const maxAvailableStock = useMemo(() => {
    if (!productDetails || !selectedVariation) return 1;

    const currentDBStock = selectedVariation.quantity;
    const isOriginalVariation = selectedVariation.color.hex === item.variation.color.hex && selectedVariation.size === item.variation.size;
    
    // If we're on the original variation, the available stock is what's in the DB PLUS what the user currently has rented.
    // Otherwise, it's just what's in the DB.
    return currentDBStock + (isOriginalVariation ? item.quantity : 0);
  }, [selectedVariation, productDetails, item]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newQuantity = Number(e.target.value);
    if (newQuantity < 1) newQuantity = 1;
    if (newQuantity > maxAvailableStock) newQuantity = maxAvailableStock;
    setQuantity(newQuantity);
  };
  
  const handleSaveChanges = () => {
    if (!selectedVariation) {
        setError("A valid variation must be selected.");
        return;
    }
    // --- UPDATED: Pass the full variation object to the onSave handler ---
    onSave(quantity, selectedVariation);
    onHide(); // The modal now just passes data up, it doesn't need to know how to close itself fully.
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Rented Item</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center"><Spinner animation="border" /></div>
        ) : error ? (
          <Alert variant="danger">{error}</Alert>
        ) : productDetails ? (
          <Form>
            <h5>{productDetails.name}</h5>
            <hr />
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label column sm="3">Quantity</Form.Label>
              <Col sm="9">
                <Form.Control type="number" min="1" max={maxAvailableStock} value={quantity} onChange={handleQuantityChange}/>
              </Col>
            </Form.Group>
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label column sm="3"><Palette className="me-1"/>Variation</Form.Label>
              <Col sm="9">
                {/* --- UPDATED: Select logic now works with variation objects --- */}
                <Form.Select 
                  value={selectedVariation ? JSON.stringify(selectedVariation) : ""}
                  onChange={e => setSelectedVariation(JSON.parse(e.target.value))}
                >
                  <option value="" disabled>-- Select a Variation --</option>
                  {productDetails.variations.map((v, index) => {
                    const isOriginalVariation = v.color.hex === item.variation.color.hex && v.size === item.variation.size;
                    const stockAvailable = v.quantity + (isOriginalVariation ? item.quantity : 0);
                    const isSelectable = stockAvailable >= quantity;

                    return (
                      <option 
                        key={index}
                        value={JSON.stringify(v)}
                        disabled={!isSelectable && !isOriginalVariation}
                      >
                        {v.color.name} - {v.size} (Stock: {stockAvailable})
                      </option>
                    );
                  })}
                </Form.Select>
              </Col>
            </Form.Group>
          </Form>
        ) : (
          <Alert variant="warning">Could not find product details.</Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleSaveChanges} disabled={loading || !!error}>Save Changes</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default EditItemModal;