import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Button, Row, Col, Form, InputGroup, Image, Spinner, Accordion, Carousel, Alert, DropdownButton, Dropdown, ButtonGroup } from 'react-bootstrap';
import { Search, ArrowLeft, SortDown, Funnel } from 'react-bootstrap-icons';
import { InventoryItem, ItemVariation } from '../../../types';
import ProductCard from '../../productCard/ProductCard';
import './singleItemSelectionModal.css'
import api from '../../../services/api';
import CustomPagination from '../../customPagination/CustomPagination';
import { FilterForm } from '../../forms/FilterForm';

// Define the shape of the data the modal returns on success
export interface SelectedItemData {
  product: InventoryItem;
  variation: ItemVariation;
  quantity: number;
}

interface ItemSelectionModalProps {
  show: boolean;
  onHide: () => void;
  onSelect: (selection: SelectedItemData) => void; // Renamed from onConfirm
  addAlert: (message: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  
  // New configuration props
  mode: 'rental' | 'assignment';
  preselectedItemId?: string;
  preselectedVariation?: string;
}

export const SingleItemSelectionModal: React.FC<ItemSelectionModalProps> = ({ show, onHide, onSelect, addAlert, mode, 
  preselectedItemId, preselectedVariation  }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<ItemVariation | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  // State for controls
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSort, setSelectedSort] = useState("Relevance");
  const [attireType, setAttireType] = useState("");
  const [selectedAge, setSelectedAge] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const ITEMS_PER_PAGE = 12;

  const [showFilters, setShowFilters] = useState(false);

  // Fetch categories once for the filter form
  useEffect(() => {
    if (!show) return;
    const fetchInitialData = async () => {
      try {
        const response = await api.get('/inventory'); // Fetches the first page by default
        const uniqueCategories = Array.from(new Set((response.data.items as InventoryItem[]).map(item => item.category)));
        setCategories(uniqueCategories.sort());
      } catch (err) { console.error("Could not fetch categories for modal", err); }
    };
    fetchInitialData();
  }, [show]);

  // Re-fetch products whenever any filter, search, sort, or page changes
  useEffect(() => {
    if (!show) return;

    const fetchProducts = async () => {
      setLoadingInventory(true);
      try {
        const params: any = { 
          page: currentPage, 
          limit: ITEMS_PER_PAGE,
        };
        // The existing filter, sort, and search params work perfectly.
        if (searchTerm) params.search = searchTerm;
        if (attireType) params.category = attireType;
        if (selectedAge) params.ageGroup = selectedAge;
        if (selectedGender) params.gender = selectedGender;
        if (selectedSort === "Price Asc") params.sort = 'price_asc';
        if (selectedSort === "Price Desc") params.sort = 'price_desc';
        if (selectedSort === "Latest") params.sort = 'latest';
        
        const response = await api.get('/inventory', { params });
        setInventory(response.data.items || []);
        setTotalPages(response.data.totalPages || 1);

        // Pre-selection logic still needs to work, but it might need to fetch the specific item
        // if it's not on the first page. For simplicity, we'll assume for now it's on the first page
        // or the user will search for it. A more advanced implementation could fetch the specific item's details.
        if (preselectedItemId) {
          const itemToSelect = (response.data.items || []).find((i: InventoryItem) => i._id === preselectedItemId);
          if (itemToSelect) {
            setSelectedItem(itemToSelect);
            const variationToSelect = itemToSelect.variations.find((v: ItemVariation) => `${v.color}, ${v.size}` === preselectedVariation);
            setSelectedVariation(variationToSelect || itemToSelect.variations[0] || null);
          }
        }

      } catch (err) { addAlert('Could not load inventory items.', 'danger'); } 
      finally { setLoadingInventory(false); }
    };

    fetchProducts();
  }, [show, currentPage, searchTerm, selectedSort, attireType, selectedAge, selectedGender, addAlert, preselectedItemId, preselectedVariation]);

  // Reset page to 1 when filters change
  useEffect(() => {
    // This effect ensures we don't stay on a non-existent page after filtering
    if (currentPage !== 1) {
        setCurrentPage(1);
    }
  }, [searchTerm, selectedSort, attireType, selectedAge, selectedGender]);

  const handleResetFilters = () => {
    setSearchTerm(""); setAttireType(""); setSelectedAge(""); setSelectedGender(""); setSelectedSort("Relevance");
  };

  const handleGoBack = () => {
    setSelectedItem(null);
    setSelectedVariation(null);
    setQuantity(1);
    setSearchTerm('');
  };
  
  const handleSelect = () => {
    if (!selectedItem || !selectedVariation) return;
    onSelect({
      product: selectedItem,
      variation: selectedVariation,
      quantity: mode === 'rental' ? quantity : 1, // Quantity is always 1 for assignments
    });
    addAlert(`${selectedItem.name} ${mode === 'rental' ? 'added!' : 'assigned!'}`, 'success');
    handleGoBack();
  };

  const DetailView = ({ item }: { item: InventoryItem }) => {
    type ColorData = { name: string; hex: string };
    const [colorData, setColorData] = useState<Record<string, ColorData>>({});
    const [loadingColors, setLoadingColors] = useState(true);
    const selectedColorKey = selectedVariation?.color?.toUpperCase() ?? '';
    const [carouselIndex, setCarouselIndex] = useState(0);  

    useEffect(() => {
      const fetchColorNames = async () => {
        setLoadingColors(true);
        try {
          const uniqueHexes = Array.from(new Set(item.variations.map(v => v.color.replace('#', '').toUpperCase())));
          const query = uniqueHexes.join(',');
          if (!query) return;

          const response = await fetch(`https://api.color.pizza/v1/?values=${query}&list=bestOf`);
          if (!response.ok) return;
          const data = await response.json();
          
          const newColorMap: Record<string, ColorData> = {};
          data.colors.forEach((info: { name: string; hex: string; requestedHex: string }) => {
            newColorMap[info.requestedHex.toUpperCase()] = { name: info.name, hex: info.hex };
          });
          setColorData(newColorMap);
        } catch (err) {
          console.error("Failed to fetch color names in modal:", err);
        } finally {
          setLoadingColors(false);
        }
      };
      fetchColorNames();
    }, [item]);

    const imagesForCarousel = useMemo(() => {
        const allImageUrls = item.variations.map(v => v.imageUrl);
        return Array.from(new Set(allImageUrls));
    }, [item]);

    useEffect(() => {
        if (!selectedVariation || imagesForCarousel.length === 0) return;
        const newIndex = imagesForCarousel.findIndex(img => img === selectedVariation.imageUrl);
        if (newIndex !== -1) setCarouselIndex(newIndex);
    }, [selectedVariation, imagesForCarousel]);

    const availableColors = Array.from(new Set(item.variations.map(v => v.color)));
    const sizesForSelectedColor = item.variations.filter(v => v.color === selectedVariation?.color);

    const handleColorSelect = (color: string) => {
      const firstAvailable = item.variations.find(v => v.color === color && v.quantity > 0);
      setSelectedVariation(firstAvailable || null);
      setQuantity(1);
    };

    const handleSizeSelect = (size: string) => {
      const newVar = item.variations.find(v => v.color === selectedVariation?.color && v.size === size);
      setSelectedVariation(newVar || null);
      setQuantity(1);
    };

    return (
      <div className="d-md-flex gap-4 p-3">
        <div className="flex-shrink-0 text-center mb-3 mb-md-0" style={{ flexBasis: '40%' }}>
          {/* --- Carousel Replaces the Single Image --- */}
          <Carousel activeIndex={carouselIndex} onSelect={(idx) => setCarouselIndex(idx)} interval={3000} variant="dark" className='border rounded'>
            {imagesForCarousel.map((img, idx) => (
              <Carousel.Item key={idx}>
                <Image src={img} fluid rounded style={{ aspectRatio: '4/5', objectFit: 'cover' }} />
              </Carousel.Item>
            ))}
          </Carousel>
        </div>
        
        <div className="flex-grow-1">
          {/* --- Added Category, Title, Price with new CSS classes --- */}
          <p className="modal-product-category mb-1">{item.category}</p>
          <h3 className="modal-product-title">{item.name}</h3>
          <p className="text-muted">{item.description}</p>
          <p className="modal-product-price">₱{item.price.toLocaleString()}</p>
          <hr/>
          
          <div className="mb-3">
            <Form.Label className="modal-selector-label">
              Color: {loadingColors ? <Spinner size="sm" className="ms-2" /> : <span>{colorData[selectedColorKey]?.name || selectedVariation?.color}</span>}
            </Form.Label>
            <div className="d-flex gap-2 mt-1">
              {availableColors.map(color => {
                const cleanHexKey = color.replace('#','').toUpperCase();
                const colorInfo = colorData[cleanHexKey];
                return (
                  <Button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    className={`modal-color-swatch ${selectedVariation?.color === color ? 'active' : ''}`}
                    style={{ backgroundColor: colorInfo?.hex || color }}
                    title={colorInfo?.name || color}
                  />
                );
              })}
            </div>
          </div>
          
          <div className="mb-3">
            <Form.Label className="modal-selector-label">Size:</Form.Label>
            <div className="d-flex gap-2 flex-wrap mt-1">
              {sizesForSelectedColor.map(v => (
                <Button key={v.size} variant={selectedVariation?.size === v.size ? 'dark' : 'outline-dark'} size="sm" onClick={() => handleSizeSelect(v.size)} disabled={v.quantity <= 0}>{v.size}</Button>
              ))}
            </div>
          </div>
          
          {mode === 'rental' && (
            <div className="mb-4">
            <Form.Label className="modal-selector-label">Quantity:</Form.Label>
            <div className="d-flex align-items-center gap-3 mt-1 modal-quantity-selector">
              <Button variant="outline-dark" size="sm" onClick={() => setQuantity(q => Math.max(1, q-1))} disabled={!selectedVariation}>-</Button>
              <span className="fw-bold fs-5">{quantity}</span>
              <Button variant="outline-dark" size="sm" onClick={() => setQuantity(q => Math.min(selectedVariation?.quantity || 1, q+1))} disabled={!selectedVariation}>+</Button>
              <small className="text-muted">{selectedVariation?.quantity || 0} pieces available</small>
            </div>
          </div>
          )}
          
          
          {/* --- Added Accordion for Features & Composition --- */}
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

  const GridView = () => {

    const gridHandleSelectItem = (item: InventoryItem) => {
      setSelectedItem(item);
      const firstAvailable = item.variations.find(v => v.quantity > 0);
      setSelectedVariation(firstAvailable || null);
    };

    if (loadingInventory) {
      return <div className="text-center py-5"><Spinner /><p>Loading...</p></div>;
    }

    if (inventory.length === 0) {
      return <Alert variant="info">No items found matching your criteria.</Alert>;
    }

    return (
      <>
        <Row xs={2} sm={3} lg={4} xl={showFilters ?  5 : 6} className="g-2">
          {inventory.map(item => (
            <Col key={item._id}>
              <ProductCard
                title={item.name} price={item.price}
                image={item.variations[0]?.imageUrl || 'https://placehold.co/400x500'}
                sizes={item.variations.map(v => v.size)}
                heartCount={item.heartCount || 0} isHearted={false}
                onHeartClick={() => {}}
                onCardClick={() => gridHandleSelectItem(item)}
              />
            </Col>
          ))}
        </Row>
        {totalPages > 1 && (
          <div className="d-flex justify-content-center mt-4">
            <CustomPagination active={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </>
    );
  };

    return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static" dialogClassName="modal-90w">
      <Modal.Header closeButton>
        <Modal.Title>{selectedItem ? 'Select Variation & Quantity' : 'Select an Item'}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ 
            maxHeight: selectedItem ? '75vh' : '80vh', // Dynamic height
            overflowY: 'auto' 
        }}>
      {selectedItem ? (
        // --- Render only the DetailView when an item is selected ---
        <DetailView item={selectedItem} />
      ) : (
        // --- Render the new two-column layout for the grid view ---
        <Row>
            {showFilters && (
                <Col lg={3} className="border-end pe-lg-4">
                <FilterForm
                    categories={categories} attireType={attireType} setAttireType={setAttireType}
                    selectedAge={selectedAge} setSelectedAge={setSelectedAge}
                    selectedGender={selectedGender} setSelectedGender={setSelectedGender}
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                    onReset={handleResetFilters} isModal={true}
                />
                </Col>
            )}
            <Col lg={showFilters ? 9 : 12}>
            <div className="d-flex justify-content-end align-items-center mb-3">
                <Button 
                variant="outline-secondary" 
                size="sm" 
                className="me-2"
                onClick={() => setShowFilters(!showFilters)}
                title={showFilters ? "Hide Filters" : "Show Filters"}
            >
                <Funnel />
            </Button>
                <DropdownButton as={ButtonGroup} size="sm" align="end" variant="outline-secondary" title={<><SortDown className="me-2" />{selectedSort}</>} onSelect={(key) => setSelectedSort(key || 'Relevance')}>
                    <Dropdown.Item eventKey="Relevance">Relevance</Dropdown.Item>
                    <Dropdown.Item eventKey="Latest">Latest</Dropdown.Item><Dropdown.Divider />
                    <Dropdown.Item eventKey="Price Asc">Price Asc</Dropdown.Item>
                    <Dropdown.Item eventKey="Price Desc">Price Desc</Dropdown.Item>
                </DropdownButton>
            </div>
            <GridView />
            </Col>
        </Row>
      )}
      </Modal.Body>

      {/* --- Footer Logic is now cleaner --- */}
      <Modal.Footer>
        {selectedItem && (
          <>
            <Button variant="secondary" onClick={handleGoBack}>Cancel</Button>
            <Button variant="primary" onClick={handleSelect} disabled={!selectedVariation}>
              {mode === 'rental' ? 'Confirm Selection' : 'Assign Item'}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};