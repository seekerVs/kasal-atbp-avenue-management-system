// client/src/layouts/productViewer/ProductViewer.tsx

import React, { useEffect, useState, useMemo } from "react";
import {
  Row, Col, Button, Image, Spinner, Carousel, Modal, Alert, Toast, ToastContainer, Accordion,
} from "react-bootstrap"; 
import { X, CheckCircleFill } from "react-bootstrap-icons";
import { SizeChart } from "../../assets/images";
import { useNavigate, useParams, Link } from "react-router-dom";
import CustomFooter from "../../components/customFooter/CustomFooter";

import { InventoryItem, ItemVariation, ItemReservation } from "../../types";
import api from "../../services/api";

import './productViewer.css'; // Import the new CSS file

type ColorData = { name: string; hex: string };
const toCleanHex = (hex: string) => hex.replace('#', '').toUpperCase();

const ProductViewer: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [product, setProduct] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<ItemVariation | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [colorData, setColorData] = useState<Record<string, ColorData>>({});
  const [loadingColors, setLoadingColors] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    if (!id) {
      setError("No product ID provided."); setLoading(false); return;
    }
    const fetchProduct = async () => {
      setLoading(true); setError(null);
      try {
        const response = await api.get(`/inventory/${id}`);
        const fetchedProduct: InventoryItem = response.data;
        setProduct(fetchedProduct);
        const firstAvailable = fetchedProduct.variations.find(v => v.quantity > 0);
        setSelectedVariation(firstAvailable || fetchedProduct.variations[0] || null);
      } catch (err) {
        setError("Product not found or an error occurred.");
      } finally { setLoading(false); }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!product || product.variations.length === 0) return;
    const fetchColorNames = async () => {
      setLoadingColors(true);
      try {
        const uniqueHexes = Array.from(new Set(product.variations.map(v => toCleanHex(v.color))));
        const query = uniqueHexes.join(',');
        if (!query) { setLoadingColors(false); return; }

        const response = await fetch(`https://api.color.pizza/v1/?values=${query}&list=bestOf`);
        if (!response.ok) throw new Error('Color API response was not ok.');
        const data = await response.json();

        const newColorMap: Record<string, ColorData> = {};
        data.colors.forEach((colorInfo: { name: string; hex: string; requestedHex: string }) => {
          const key = toCleanHex(colorInfo.requestedHex);
          newColorMap[key] = { name: colorInfo.name, hex: colorInfo.hex };
        });
        setColorData(newColorMap);
      } catch (err) {
        console.error("Failed to fetch color names:", err);
      } finally {
        setLoadingColors(false);
      }
    };
    fetchColorNames();
  }, [product]);


  const availableColors = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set(product.variations.map(v => v.color)));
  }, [product]);

  const sizesForSelectedColor = useMemo(() => {
    if (!product || !selectedVariation) return [];
    return product.variations.filter(v => v.color === selectedVariation.color);
  }, [product, selectedVariation]);
  
  const imagesForCarousel = useMemo(() => {
    if (!product) return [];

    // 1. Get all image URLs from every variation.
    const allImageUrls = product.variations.map(v => v.imageUrl);

    // 2. Use a Set to automatically keep only the unique URLs.
    // 3. Convert the Set back to an array.
    const uniqueImageUrls = Array.from(new Set(allImageUrls));

    return uniqueImageUrls;
  }, [product]);

  useEffect(() => {
    // Don't do anything if the necessary data isn't ready yet.
    if (!selectedVariation || imagesForCarousel.length === 0) {
      return;
    }

    // Find the index of the selected variation's image within our full slideshow array.
    const newIndex = imagesForCarousel.findIndex(
      (imageUrl) => imageUrl === selectedVariation.imageUrl
    );

    // If the image is found in the array, update the carousel's active index.
    if (newIndex !== -1) {
      setCarouselIndex(newIndex);
    }
  }, [selectedVariation, imagesForCarousel]);


  const handleColorSelect = (color: string) => {
    if (!product) return;
    const firstAvailableSizeForColor = product.variations.find(v => v.color === color && v.quantity > 0);
    setSelectedVariation(firstAvailableSizeForColor || product.variations.find(v => v.color === color) || null);
    setQuantity(1);
  };

  const handleSizeSelect = (size: string) => {
    if (!product || !selectedVariation) return;
    const newVariation = product.variations.find(v => v.color === selectedVariation.color && v.size === size);
    setSelectedVariation(newVariation || null);
    setQuantity(1);
  };

  const handleAddToReservation = () => {
    if (!product || !selectedVariation || selectedVariation.quantity < 1) {
      alert("This variation is out of stock or invalid.");
      return;
    }
    const newItemReservation: ItemReservation = {
      reservationId: `item_${Date.now()}`,
      itemId: product._id,
      itemName: product.name,
      variation: {
        color: selectedVariation.color,
        size: selectedVariation.size,
      },
      quantity: quantity,
      price: product.price,
    };
    const existingItemsJSON = sessionStorage.getItem('pendingReservations');
    const existingItems: ItemReservation[] = existingItemsJSON ? JSON.parse(existingItemsJSON) : [];
    existingItems.push(newItemReservation);
    sessionStorage.setItem('pendingReservations', JSON.stringify(existingItems));
    setShowSuccessToast(true);
  };

  if (loading) return <div className="text-center py-5"><Spinner /></div>;
  if (error) return <Alert variant="danger" className="m-5 text-center">{error}</Alert>;
  if (!product) return <Alert variant="info" className="m-5 text-center">Product data could not be loaded.</Alert>;

  return (
    <>
      <div className="product-viewer-container mt-3 mt-lg-4 mx-4 mx-lg-5 position-relative">
        <Button variant="link" className="position-absolute top-0 end-0 p-0 m-0 mt-3" onClick={() => navigate(`/products`)} style={{ zIndex: 10 }}>
          <X size={28} color="dark" />
        </Button>
        <Row className="g-4 g-lg-5">
          <Col md={6} lg={7} className="d-flex justify-content-md-end">
              <Carousel 
                activeIndex={carouselIndex} 
                onSelect={(idx) => setCarouselIndex(idx)} 
                interval={3000} 
                className="w-100" 
                style={{ maxWidth: '500px' }}
              >
                {imagesForCarousel.map((img, idx) => (
                  <Carousel.Item key={idx}>
                    <Image src={img} fluid rounded style={{ aspectRatio: '4/5', objectFit: 'cover' }} />
                  </Carousel.Item>
                ))}
              </Carousel>
          </Col>

          <Col md={6} lg={5} className="text-start text-dark">
            <p className="product-category mb-2">{product.category}</p>
            <h2 className="product-title mb-2">{product.name}</h2>
            <p className="lead fs-6 text-muted">{product.description}</p>
            <p className="product-price my-3">₱{product.price.toLocaleString()}</p>
            
            <hr />

            <div className="mb-3">
              <span className="selector-label">
                Color:
                {loadingColors ? (
                  <Spinner animation="border" size="sm" className="ms-2" />
                ) : (
                  <span className="fw-normal ms-2">
                    {colorData[toCleanHex(selectedVariation?.color ?? '')]?.name || selectedVariation?.color}
                  </span>
                )}
              </span>
              <div className="d-flex gap-2 mt-2">
                {availableColors.map((originalColorHex) => {
                  // --- THIS IS THE FIX ---
                  // 1. Create the clean key.
                  const cleanHexKey = toCleanHex(originalColorHex);
                  // 2. Use that clean key to look up the color info.
                  const colorInfo = colorData[cleanHexKey];
                  
                  const displayHex = colorInfo ? colorInfo.hex : originalColorHex;
                  const displayName = colorInfo ? colorInfo.name : originalColorHex;

                  return (
                    <button
                      key={originalColorHex}
                      className={`color-swatch ${selectedVariation?.color === originalColorHex ? 'active' : ''}`}
                      style={{ backgroundColor: displayHex }}
                      onClick={() => handleColorSelect(originalColorHex)}
                      title={displayName}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mb-3">
              <span className="selector-label">Size:</span>
              <div className="d-flex gap-2 flex-wrap">
                {sizesForSelectedColor.map((v) => (
                  <Button key={v.size} className="size-btn" variant={selectedVariation?.size === v.size ? "dark" : "outline-dark"} onClick={() => handleSizeSelect(v.size)} disabled={v.quantity <= 0} size="sm">
                    {v.size}
                  </Button>
                ))}
              </div>
              <a href="#sizechart" className="d-block mt-1 text-decoration-underline text-muted" style={{ fontSize: "0.9rem" }} onClick={(e) => { e.preventDefault(); setShowSizeChart(true); }}>
                Size Chart
              </a>
            </div>

            <div className="mb-3">
              <span className="selector-label">Quantity:</span>
              <div className="d-flex align-items-center gap-2 quantity-selector">
                <Button variant="outline-dark" size="sm" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={!selectedVariation}>-</Button>
                <span className="fw-bold fs-5">{quantity}</span>
                <Button variant="outline-dark" size="sm" onClick={() => setQuantity((q) => Math.min(selectedVariation?.quantity || 1, q + 1))} disabled={!selectedVariation}>+</Button>
                <small className="ms-2 text-muted">{selectedVariation?.quantity || 0} pieces available</small>
              </div>
            </div>

            <div className="d-grid gap-2 my-4">
              <Button className="add-to-booking-btn" size="lg" onClick={handleAddToReservation} disabled={!selectedVariation || selectedVariation.quantity < 1}>
                Add to Reservation
              </Button>
            </div>
            
            <Accordion defaultActiveKey="0" className="product-accordion">
              <Accordion.Item eventKey="0">
                <Accordion.Header>Features & Composition</Accordion.Header>
                <Accordion.Body>
                  {product.features && <ul>{product.features.map((feat, idx) => (<li key={idx}>{feat}</li>))}</ul>}
                  {product.composition && <p>{product.composition.join(', ')}</p>}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Col>
        </Row>
      </div>
      <footer className="text-dark py-3 mt-5">
        <CustomFooter />
      </footer>

      <Modal show={showSizeChart} onHide={() => setShowSizeChart(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>Size Chart</Modal.Title></Modal.Header>
        <Modal.Body className="text-center"><Image src={SizeChart} fluid /></Modal.Body>
      </Modal>

      <ToastContainer position="bottom-center" className="p-3" style={{ zIndex: 1100 }}>
        <Toast onClose={() => setShowSuccessToast(false)} show={showSuccessToast} delay={4000} autohide bg="dark">
          <Toast.Body className="text-white">
            <div className="d-flex align-items-center justify-content-between">
                <span><CheckCircleFill className="me-2 text-success" />Added to your reservation!</span>
                <Button onClick={() => navigate('/reservations/new')} variant="outline-light" size="sm">View Reservation</Button>
            </div>
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default ProductViewer;