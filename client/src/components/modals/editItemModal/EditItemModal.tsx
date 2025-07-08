import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { Palette } from 'react-bootstrap-icons';
import { SingleRentItem, InventoryItem } from '../../../types';
import api from '../../../services/api';

const getVariationKey = (v: { color: string, size: string }) => JSON.stringify({ color: v.color, size: v.size });

// --- COMPONENT PROPS INTERFACE ---
interface EditItemModalProps {
  show: boolean;
  onHide: () => void;
  item: SingleRentItem; // <-- NEW, CORRECT TYPE
  onSave: (quantity: number, newVariationString: string) => void;
}

// ===================================================================================
// --- THE REUSABLE MODAL COMPONENT ---
// ===================================================================================
const EditItemModal: React.FC<EditItemModalProps> = ({ show, onHide, item, onSave }) => {
  const [productDetails, setProductDetails] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(item.quantity);
  const [selectedVariationKey, setSelectedVariationKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Set/Reset state when the modal is shown with a new item
  useEffect(() => {
    if (show) {
      setQuantity(item.quantity);
      const initialVariation = {
          color: item.name.split(',')[1],
          size: item.name.split(',')[2]
      };
      setSelectedVariationKey(getVariationKey(initialVariation));
      
      const fetchProductDetails = async () => {
          setLoading(true);
          setError('');
          try {
              const res = await api.get(`/inventory/byFullName/${encodeURIComponent(item.name)}`);
              setProductDetails(res.data);
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
    if (!productDetails) return 1; // Default to 1 if details not loaded

    try {
        const selectedVarObj = JSON.parse(selectedVariationKey);
        const currentVariation = productDetails.variations.find(v => v.color === selectedVarObj.color && v.size === selectedVarObj.size);
        if (!currentVariation) return 1;

        const originalVarObj = {
            color: item.name.split(',')[1],
            size: item.name.split(',')[2]
        };
        
        const isOriginalVariation = currentVariation.color === originalVarObj.color && currentVariation.size === originalVarObj.size;
        
        return currentVariation.quantity + (isOriginalVariation ? item.quantity : 0);
    } catch (e) {
        return 1; // Fallback in case of JSON parsing error
    }
  }, [selectedVariationKey, productDetails, item]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newQuantity = Number(e.target.value);
    // Ensure quantity is not less than 1
    if (newQuantity < 1) {
        newQuantity = 1;
    }
    // --- NEW: Cap the quantity at the max available stock ---
    if (newQuantity > maxAvailableStock) {
        newQuantity = maxAvailableStock;
    }
    setQuantity(newQuantity);
  };
  
  const handleSaveChanges = () => {
    setError(''); // Clear previous errors

    if (quantity < 1) {
        setError("Quantity must be at least 1.");
        return;
    }

    const selectedVariationObject = JSON.parse(selectedVariationKey);
    const currentVariation = productDetails?.variations.find(v => v.color === selectedVariationObject.color && v.size === selectedVariationObject.size);
    if (!currentVariation) {
        setError("Please select a valid variation.");
        return;
    }

    const originalItemVariationKey = `${item.name.split(',')[1]}-${item.name.split(',')[2]}`;
    const isOriginalVariation = selectedVariationKey === originalItemVariationKey;
    
    // This is the available stock in the database for the selected variation
    const stockInDB = currentVariation.quantity;
    
    // If we're editing the original item, its current quantity doesn't count against the stock.
    // So, we add it back to get the "total available" for this transaction.
    const totalAvailable = stockInDB + (isOriginalVariation ? item.quantity : 0);
    
    if (quantity > totalAvailable) {
        setError(`Requested quantity (${quantity}) exceeds available stock (${totalAvailable}).`);
        return;
    }
    
    onSave(quantity, selectedVariationKey);
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
                <Form.Control 
                  type="number" 
                  min="1" 
                  max={maxAvailableStock} // Add the max attribute
                  value={quantity} 
                  onChange={handleQuantityChange}
                />
              </Col>
            </Form.Group>
            <Form.Group as={Row} className="mb-3 align-items-center">
              <Form.Label column sm="3"><Palette className="me-1"/>Variation</Form.Label>
              <Col sm="9">
                <Form.Select value={selectedVariationKey} onChange={e => setSelectedVariationKey(e.target.value)}>
                  {productDetails.variations.map(v => {
                    const currentVariationKey = getVariationKey(v); // Create JSON key
                    
                    const originalItemVariationKey = JSON.stringify({
                      color: item.name.split(',')[1],
                      size: item.name.split(',')[2]
                    });

                    const isOriginalVariation = currentVariationKey === originalItemVariationKey;
                    const stockAvailable = v.quantity + (isOriginalVariation ? item.quantity : 0);
                    const isSelectable = stockAvailable >= quantity;

                    return (
                      <option 
                        key={currentVariationKey} // Key is now a stable JSON string
                        value={currentVariationKey} 
                        disabled={!isSelectable && !isOriginalVariation}
                      >
                        {v.color} - {v.size} (Stock: {stockAvailable})
                      </option>
                    );
                  })}
                </Form.Select>
                {/* <Form.Select value={selectedVariationKey} onChange={e => setSelectedVariationKey(e.target.value)}>
                  {productDetails.variations.map(v => {
                    const originalItemVariationKey = `${item.name.split(',')[1]}-${item.name.split(',')[2]}`;
                    const currentVariationKey = `${v.color}-${v.size}`;
                    const isOriginalVariation = currentVariationKey === originalItemVariationKey;
                    const stockAvailable = v.quantity + (isOriginalVariation ? item.quantity : 0);
                    const isSelectable = stockAvailable >= quantity;

                    return (
                      <option 
                        key={currentVariationKey}
                        value={currentVariationKey} 
                        disabled={!isSelectable && !isOriginalVariation}
                      >
                        {v.color} - {v.size} (Stock: {stockAvailable})
                      </option>
                    );
                  })}
                </Form.Select> */}
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