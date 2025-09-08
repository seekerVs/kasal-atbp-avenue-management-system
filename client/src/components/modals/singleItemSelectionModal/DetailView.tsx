// client/src/components/modals/singleItemSelectionModal/DetailView.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { Row, Col, Form, Button, Image, Accordion, Carousel } from 'react-bootstrap';
import { InventoryItem, ItemVariation } from '../../../types';

interface DetailViewProps {
  item: InventoryItem;
  // The 'mode' prop is now more descriptive
  mode: 'full' | 'size-only';
  
  // State from parent
  selectedVariation: ItemVariation | null;
  quantity: number;
  
  // State setters from parent
  onVariationChange: (variation: ItemVariation | null) => void;
  onQuantityChange: (quantity: number) => void;
  availableSizesForDisplay: ItemVariation[];
  isQuantityDisabled?: boolean;
}

export const DetailView: React.FC<DetailViewProps> = ({
  item, mode = 'full', selectedVariation, quantity, onVariationChange, onQuantityChange,
  availableSizesForDisplay, isQuantityDisabled
}) => {
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  const imagesForCarousel = useMemo(() => Array.from(new Set(item.variations.map(v => v.imageUrl))), [item]);
  
  useEffect(() => {
    if (!selectedVariation || imagesForCarousel.length === 0) return;
    const newIndex = imagesForCarousel.findIndex(img => img === selectedVariation.imageUrl);
    if (newIndex !== -1) setCarouselIndex(newIndex);
  }, [selectedVariation, imagesForCarousel]);

  const availableColors = useMemo(() => {
    const colorsMap = new Map<string, { name: string; hex: string }>();
    item.variations.forEach(v => {
      if (!colorsMap.has(v.color.hex)) colorsMap.set(v.color.hex, v.color);
    });
    return Array.from(colorsMap.values());
  }, [item]);

  const handleColorSelect = (colorHex: string) => {
    const firstAvailable = item.variations.find(v => v.color.hex === colorHex && v.quantity > 0);
    onVariationChange(firstAvailable || null);
    onQuantityChange(1);
  };

  const handleSizeSelect = (size: string) => {
    if (!item || !selectedVariation) return;
    const newVar = item.variations.find(v => v.color.hex === selectedVariation.color.hex && v.size === size);
    onVariationChange(newVar || null);
    onQuantityChange(1);
  };

  return (
    <div className="d-md-flex gap-4 p-3">
      <div className="flex-shrink-0 text-center mb-3 mb-md-0" style={{ flexBasis: '40%' }}>
        <Carousel activeIndex={carouselIndex} onSelect={setCarouselIndex} interval={3000} variant="dark" className='border rounded'>
          {imagesForCarousel.map((img, idx) => (
            <Carousel.Item key={idx}>
              <Image src={img} fluid rounded style={{ aspectRatio: '4/5', objectFit: 'cover' }} />
            </Carousel.Item>
          ))}
        </Carousel>
      </div>
      <div className="flex-grow-1">
        <p className="modal-product-category mb-1">{item.category}</p>
        <h3 className="modal-product-title">{item.name}</h3>
        <p className="text-muted">{item.description}</p>
        <p className="modal-product-price">₱{item.price.toLocaleString()}</p>
        <hr/>
        <div className="mb-3">
          <Form.Label className="modal-selector-label">Color: <span>{selectedVariation?.color?.name}</span></Form.Label>
          <div className="d-flex gap-2 mt-1">
            {availableColors.map(color => (
              <Button
                key={color.hex}
                onClick={() => handleColorSelect(color.hex)}
                className={`modal-color-swatch ${selectedVariation?.color.hex === color.hex ? 'active' : ''}`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </div>
        <div className="mb-3">
          <Form.Label className="modal-selector-label">Size:</Form.Label>
          <div className="d-flex gap-2 flex-wrap mt-1">
            {availableSizesForDisplay.map(v => (
              <Button key={v.size} variant={selectedVariation?.size === v.size ? 'dark' : 'outline-dark'} size="sm" onClick={() => handleSizeSelect(v.size)} disabled={v.quantity <= 0}>{v.size}</Button>
            ))}
          </div>
        </div>
        {mode === 'full' && (
          <div className="mb-4">
            <Form.Label className="modal-selector-label">Quantity:</Form.Label>
            <div className="d-flex align-items-center gap-3 mt-1 modal-quantity-selector">
              <Button variant="outline-dark" size="sm" onClick={() => onQuantityChange(Math.max(1, quantity - 1))} disabled={!selectedVariation || isQuantityDisabled}>-</Button>
              <span className="fw-bold fs-5">{quantity}</span>
              <Button variant="outline-dark" size="sm" onClick={() => onQuantityChange(Math.min(selectedVariation?.quantity || 1, quantity + 1))} disabled={!selectedVariation || isQuantityDisabled}>+</Button>
              <small className="text-muted">{selectedVariation?.quantity || 0} pieces available</small>
            </div>
          </div>
        )}
        <Accordion defaultActiveKey="0" className="modal-product-accordion">
          <Accordion.Item eventKey="0">
            <Accordion.Header>Features & Composition</Accordion.Header>
            <Accordion.Body>
              {item.features && <ul>{item.features.map((feat, idx) => (<li key={idx}>{feat}</li>))}</ul>}
              {item.composition && <p>{item.composition.join(', ')}</p>}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
};