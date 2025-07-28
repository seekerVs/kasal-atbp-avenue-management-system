import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Table,
  Badge,
  Modal,
  Form,
  InputGroup,
  Spinner,
  Alert,
  Pagination,
} from 'react-bootstrap';
import {
  PencilSquare,
  Trash,
  PlusCircleFill,
  BoxSeam,
  Palette,
  Image as ImageIcon,
  TagFill,
  InfoCircleFill,
  CardText,
  Gem,
  Search,
  ExclamationTriangleFill
} from 'react-bootstrap-icons';
import { InventoryItem, ItemVariation, MeasurementRef } from '../../types';
import api, { uploadFile } from '../../services/api';
import { ColorPickerInput } from '../../components/colorPickerInput/ColorPickerInput';
import { SizeChart } from '../../assets/images';
import { useAlert } from '../../contexts/AlertContext';
import { ImageDropzone } from '../../components/imageDropzone/ImageDropzone';


// --- MAIN COMPONENT ---
function InventoryItems() {
  const { addAlert } = useAlert(); 
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');

  const [showItemModal, setShowItemModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [inventoryResponse, refsResponse] = await Promise.all([
          api.get('/inventory', {
            params: {
              page: currentPage,
              limit: ITEMS_PER_PAGE,
              search: searchTerm,
            }
          }),
          api.get('/measurementrefs')
        ]);
        
        setInventory(inventoryResponse.data.items); 
        setTotalPages(inventoryResponse.data.totalPages);

        const uniqueCategories = Array.from(
          new Set((refsResponse.data as MeasurementRef[]).map(ref => ref.category))
        );
        setCategories(uniqueCategories.sort());

      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError('Failed to load inventory data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);


  const handleOpenItemModal = (item: InventoryItem | null) => {
    setCurrentItem(item);
    setShowItemModal(true);
  };
  const handleCloseItemModal = () => {
    setCurrentItem(null);
    setShowItemModal(false);
  };
  const handleOpenDeleteModal = (item: InventoryItem) => {
    setCurrentItem(item);
    setShowDeleteModal(true);
  };
  const handleCloseDeleteModal = () => {
    setCurrentItem(null);
    setShowDeleteModal(false);
  };

  const handleSaveItem = async (itemData: InventoryItem, urlsToDelete: string[]) => {
      setError(null);
      const id = itemData._id;
      const method = id ? 'put' : 'post';
      const url = id ? `/inventory/${id}` : '/inventory';

      try {
        const response = await api[method](url, itemData);
        const savedItem = response.data;

        if (id) {
          addAlert(`Item "${savedItem.name}" updated successfully.`, 'success');
        } else {
          addAlert(`Item "${savedItem.name}" created successfully.`, 'success');
        }
        
        if (urlsToDelete.length > 0) {
          await api.delete('/upload/bulk', { data: { urls: urlsToDelete } });
        }

        if (id) {
          setInventory(prev => prev.map(item => item._id === id ? savedItem : item));
        } else {
          const res = await api.get('/inventory', { params: { page: currentPage, limit: ITEMS_PER_PAGE, search: searchTerm }});
          setInventory(res.data.items);
          setTotalPages(res.data.totalPages);
        }
        handleCloseItemModal();

      } catch (err: any) {
        console.error("Error saving item or deleting images:", err);
        setError(err.response?.data?.message || 'Failed to save item. Please try again.');
      }
  };

  const handleDeleteItem = async () => {
    if (!currentItem) return;
    setError(null);
    const id = currentItem._id;
    try {
      await api.delete(`/inventory/${id}`);
      addAlert(`Item "${currentItem.name}" deleted successfully.`, 'success');
      const res = await api.get('/inventory', { params: { page: currentPage, limit: ITEMS_PER_PAGE, search: searchTerm }});
      setInventory(res.data.items);
      setTotalPages(res.data.totalPages);

      if(res.data.items.length === 0 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }

      handleCloseDeleteModal();
    } catch (err: any) {
      console.error("Error deleting item:", err);
      setError(err.response?.data?.message || 'Failed to delete item. Please try again.');
    }
  };

  const getTotalStock = (item: InventoryItem) =>
    item.variations.reduce((sum, v) => sum + (v.quantity || 0), 0);

  const filteredInventory = inventory; 

  return (
    <Container fluid>
      <h2 className="mb-4">Inventory Management</h2>
      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col md={5}><div className="d-flex align-items-center"><BoxSeam size={24} className="me-2" /><h5 className="mb-0">All Items</h5></div></Col>
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text><Search /></InputGroup.Text>
                <Form.Control
                  type="search"
                  placeholder="Search by name or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3} className="text-end"><Button variant="primary" onClick={() => handleOpenItemModal(null)}><PlusCircleFill className="me-2" />Add New Item</Button></Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" /><p className="mt-2">Loading Inventory...</p></div>
          ) : (
            <>
              {filteredInventory.length > 0 ? (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Variations</th>
                      <th>Total Stock</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map(item => (
                      <tr key={item._id}>
                        <td style={{ width: '80px', textAlign: 'center' }}>
                          <img
                            src={item.variations && item.variations.length > 0 ? item.variations[0].imageUrl : 'https://placehold.co/60x60/e9ecef/adb5bd?text=N/A'}
                            alt={item.name}
                            style={{ width: '60px', height: '60px', borderRadius: '0.25rem', objectFit: 'cover' }}
                          />
                        </td>
                        <td>{item.name}</td>
                        <td>{item.category}</td>
                        <td>₱{item.price ? item.price.toFixed(2) : '0.00'}</td>
                        <td>{item.variations ? item.variations.length : 0}</td>
                        <td>{getTotalStock(item)}</td>
                        <td>{getTotalStock(item) > 0 ? <Badge bg="success">In Stock</Badge> : <Badge bg="danger">Out of Stock</Badge>}</td>
                        <td>
                          <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => handleOpenItemModal(item)}><PencilSquare /></Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleOpenDeleteModal(item)}><Trash /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-5"><h5>No items found</h5><p className="text-muted">{searchTerm ? `No inventory items match your search for "${searchTerm}".` : "Your inventory is currently empty."}</p></div>
              )}
            </>
          )}
        </Card.Body>
        <Card.Footer>
            {totalPages > 1 && (
              <Pagination className="justify-content-end mb-0">
                <Pagination.Prev onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} />
                <Pagination.Item disabled>{`Page ${currentPage} of ${totalPages}`}</Pagination.Item>
                <Pagination.Next onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} />
              </Pagination>
            )}
        </Card.Footer>
      </Card>

      {showItemModal && <ItemFormModal show={showItemModal} onHide={handleCloseItemModal} onSave={handleSaveItem} item={currentItem} categories={categories} />}
      
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Deletion</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to delete the item: <strong>{currentItem?.name}</strong>? This action cannot be undone.</Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={handleCloseDeleteModal}>Cancel</Button><Button variant="danger" onClick={handleDeleteItem}>Delete Item</Button></Modal.Footer>
      </Modal>
    </Container>
  );
}

interface ItemFormModalProps {
    show: boolean;
    onHide: () => void;
    onSave: (itemData: InventoryItem, urlsToDelete: string[]) => void;
    item: InventoryItem | null;
    categories: string[];
} 

function ItemFormModal({ show, onHide, onSave, item, categories }: ItemFormModalProps) {
    type FormVariation = Omit<ItemVariation, 'imageUrl'> & {
        imageUrl: string | File | null;
    };

    const [formData, setFormData] = useState<{
        name: string;
        price: number;
        category: string;
        description: string;
        features: string[];
        composition: string[];
        variations: FormVariation[];
    }>({
        name: '', price: 0, category: '', description: '',
        features: [], composition: [], variations: [],
    });

    const { addAlert } = useAlert();
    const [priceInput, setPriceInput] = useState('0');
    const initialVariationsRef = useRef<FormVariation[]>([]);
    const [showSizeChartModal, setShowSizeChartModal] = useState(false);
    const [errors, setErrors] = useState<any>({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showPriceWarningModal, setShowPriceWarningModal] = useState(false);
    const [isCheckingName, setIsCheckingName] = useState(false); // <-- ADD THIS
    const [nameError, setNameError] = useState<string | null>(null);

    const STANDARD_SIZES = ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
    
    useEffect(() => {
      if (item) {
        const { _id, ...editableData } = item;
        setFormData({
          ...editableData,
          description: editableData.description || '', 
          features: editableData.features?.length ? editableData.features : [''],
          composition: editableData.composition?.length ? editableData.composition : [''],
          variations: editableData.variations ? editableData.variations.map(v => ({...v})) : [],
        });
        setPriceInput(String(item.price));
        initialVariationsRef.current = JSON.parse(JSON.stringify(item.variations || []));
      } else {
        setFormData({
          name: '', price: 0, category: '', description: '', 
          features: [''], 
          composition: [''], 
          variations: [{ color: { name: 'Black', hex: '#000000' }, size: '', quantity: 1, imageUrl: null }]
        });
        setPriceInput('0');
        initialVariationsRef.current = [];
      }
    }, [item]);

    useEffect(() => {
        // Don't validate if the name is empty or unchanged from the original
        if (!formData.name || (item && formData.name === item.name)) {
            setNameError(null);
            return;
        }

        setIsCheckingName(true); // Show a spinner
        
        // Set up a timer to wait 500ms after the user stops typing
        const handler = setTimeout(async () => {
            try {
                const response = await api.get('/inventory/check-name', {
                    params: {
                        name: formData.name,
                        excludeId: item?._id // Pass the current item's ID if we are editing
                    }
                });

                if (response.data.isTaken) {
                    setNameError(`An item named "${formData.name}" already exists.`);
                } else {
                    setNameError(null); // Clear any previous error
                }
            } catch (error) {
                console.error("Failed to check item name:", error);
                // Optionally set an error for network issues
            } finally {
                setIsCheckingName(false); // Hide spinner
            }
        }, 500); // 500ms delay

        // Cleanup function: If the user types again, clear the previous timer
        return () => {
            clearTimeout(handler);
        };
    }, [formData.name, item]);

    const handleMainFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleQuantityBlur = (index: number) => {
        const newVariations = [...formData.variations];
        const variation = newVariations[index];
        let numericValue = parseInt(String(variation.quantity), 10);
        if (isNaN(numericValue) || numericValue < 1) {
            numericValue = 1;
        }
        newVariations[index] = { ...variation, quantity: numericValue };
        setFormData(prev => ({ ...prev, variations: newVariations }));
    };

    const handleSave = async () => {
        const initialImageUrls = new Set(
            initialVariationsRef.current
                .map(v => v.imageUrl)
                .filter((url): url is string => typeof url === 'string')
        );
        const finalImageUrls = new Set(
            formData.variations
                .map(v => v.imageUrl)
                .filter((url): url is string => typeof url === 'string')
        );
        const urlsToDelete: string[] = [];
        initialImageUrls.forEach(initialUrl => {
            if (!finalImageUrls.has(initialUrl)) {
                urlsToDelete.push(initialUrl);
            }
        });

        const finalVariations = [...formData.variations];
        const uploadPromises: Promise<void>[] = [];

        finalVariations.forEach((variation, index) => {
            if (variation.imageUrl instanceof File) {
                const fileToUpload = variation.imageUrl;
                const uploadPromise = uploadFile(fileToUpload)
                    .then(newUrl => {
                        finalVariations[index] = { ...variation, imageUrl: newUrl };
                    })
                    .catch(err => {
                        console.error(`Upload failed for variation #${index + 1}:`, err);
                        throw new Error(`Upload failed for an image. Please try again.`);
                    });
                uploadPromises.push(uploadPromise);
            }
        });

        try {
            await Promise.all(uploadPromises);
            const itemToSave: InventoryItem = {
                ...formData,
                price: parseFloat(priceInput) || 0,
                _id: item ? item._id : '',
                variations: finalVariations.map(v => ({
                    ...v,
                    quantity: parseInt(String(v.quantity), 10) || 1,
                    imageUrl: v.imageUrl as string,
                })),
            };
            onSave(itemToSave, urlsToDelete);
        } catch (error: any) {
            addAlert(error.message, 'danger');
        }
    };
    
    const handleVariationChange = (index: number, field: keyof ItemVariation, value: any) => {
      const newVariations = formData.variations.map((v, i) => {
        if (i === index) {
          return { ...v, [field]: value };
        }
        return v;
      });
      setFormData({ ...formData, variations: newVariations });
    };

    const handleAddVariation = () => {
        setFormData({
            ...formData,
            variations: [...formData.variations, { color: { name: 'Black', hex: '#000000' }, size: '', quantity: 1, imageUrl: null }],
        });
    };
    const handleRemoveVariation = (index: number) => {
        const newVariations = formData.variations.filter((_, i) => i !== index);
        setFormData({ ...formData, variations: newVariations });
    };

    const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
          setPriceInput(e.target.value);
      }
    };

    const handlePriceBlur = () => {
      const numericValue = parseFloat(priceInput) || 0;
      setFormData(prev => ({ ...prev, price: numericValue }));
      setPriceInput(String(numericValue));
    };

    const validateForm = () => {
        const newErrors: any = { variations: [] };
        if (!formData.name.trim()) {
            newErrors.name = 'Item name is required.';
        } else if (nameError) { // Also check if the async validation found an error
            newErrors.name = nameError;
        }
        if (!formData.category.trim()) newErrors.category = true;
        if (parseFloat(priceInput) < 0) newErrors.price = 'Price cannot be negative.';
        if (!formData.description || !formData.description.trim()) newErrors.description = true;
        if (formData.features.length === 0 || (formData.features.length === 1 && !formData.features[0]?.trim())) {
            newErrors.features = true;
        }
        if (formData.composition.length === 0 || (formData.composition.length === 1 && !formData.composition[0]?.trim())) {
            newErrors.composition = true;
        }

        const variationPairs = new Set();
        formData.variations.forEach(v => {
            // Create a unique key for each color/size pair, case-insensitively
            const key = `${v.color.name.toLowerCase().trim()}|${v.size.toLowerCase().trim()}`;
            variationPairs.add(key);
        });

        // If the Set size is less than the array length, it means there were duplicates
        if (variationPairs.size < formData.variations.length) {
            newErrors.variations_duplicate = 'Each variation must have a unique combination of color and size.';
        }

        formData.variations.forEach((variation, index) => {
          const variationErrors: any = {};
          if (!variation.color.name.trim() || variation.color.name === 'Custom Color' || variation.color.name === 'Unknown') {
            variationErrors.color = true;
          }
          if (!variation.size.trim()) variationErrors.size = true;
          if (parseInt(String(variation.quantity), 10) < 1) variationErrors.quantity = true;
          if (!variation.imageUrl) variationErrors.imageUrl = true;
          
          if (Object.keys(variationErrors).length > 0) {
            newErrors.variations[index] = variationErrors;
          }
        });
        setErrors(newErrors);
        const hasMainErrors = ['name', 'category', 'price', 'description', 'features', 'composition'].some(key => newErrors[key]);
        const hasVariationErrors = newErrors.variations.some((e: any) => e && Object.keys(e).length > 0);
        const hasDuplicateError = !!newErrors.variations_duplicate; // Check if the duplicate error exists

        return !hasMainErrors && !hasVariationErrors && !hasDuplicateError;
    };

    const handleDynamicListChange = (listType: 'features' | 'composition', index: number, value: string) => {
        const list = formData[listType] as string[];
        const newList = [...list];
        newList[index] = value;
        setFormData(prev => ({ ...prev, [listType]: newList }));
    };

    const addDynamicListItem = (listType: 'features' | 'composition') => {
        const list = formData[listType] || [];
        setFormData(prev => ({ ...prev, [listType]: [...list, ''] }));
    };

    const removeDynamicListItem = (listType: 'features' | 'composition', index: number) => {
        const list = formData[listType] as string[];
        const newList = list.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, [listType]: newList }));
    };

    return (
        <Modal show={show} onHide={() => { setErrors({}); onHide(); }} size="xl" backdrop="static">
        <Modal.Header closeButton><Modal.Title>{item ? 'Edit Item' : 'Add New Item'}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><InfoCircleFill className="me-1" /> Item Name<span className="text-danger">*</span></Form.Label>
                    <InputGroup hasValidation>
                      <Form.Control 
                        type="text" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleMainFormChange} 
                        isInvalid={!!errors.name || !!nameError}
                        required
                      />
                      {isCheckingName && (
                        <InputGroup.Text>
                          <Spinner animation="border" size="sm" />
                        </InputGroup.Text>
                      )}
                      <Form.Control.Feedback type="invalid">
                        {errors.name || nameError}
                      </Form.Control.Feedback>
                    </InputGroup>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label><TagFill className="me-1" /> Category <span className="text-danger">*</span></Form.Label>
                    <Form.Select name="category" value={formData.category} onChange={handleMainFormChange} isInvalid={!!errors.category}>
                      <option value="">-- Select a Category --</option>
                      {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}><Form.Group className="mb-3"><Form.Label>Price (₱)<span className="text-danger">*</span></Form.Label>
                  <Form.Control type="text" inputMode="decimal" name="price" value={priceInput} onChange={handlePriceInputChange} onBlur={handlePriceBlur} isInvalid={!!errors.price}/>
                  </Form.Group></Col>
            </Row>
            <Form.Group className="mb-3"><Form.Label><CardText className="me-1" /> Description<span className="text-danger">*</span></Form.Label><Form.Control as="textarea" name="description" rows={2} value={formData.description} onChange={handleMainFormChange} isInvalid={!!errors.description}  /></Form.Group>
            <Row>
              <Col lg={6}>
                <Form.Group className="mb-3">
                  <Form.Label><Gem className="me-2"/>Features<span className="text-danger">*</span></Form.Label>
                  {(formData.features || []).map((feature, index) => (
                    <InputGroup key={index} className="mb-2">
                      <Form.Control placeholder={`Feature #${index + 1}`} value={feature} onChange={(e) => handleDynamicListChange('features', index, e.target.value)} isInvalid={!!errors.features}/>
                      <Button variant="outline-danger" onClick={() => removeDynamicListItem('features', index)}><Trash /></Button>
                    </InputGroup>
                  ))}
                  <Button variant="outline-secondary" size="sm" onClick={() => addDynamicListItem('features')}><PlusCircleFill className="me-1" />Add Feature</Button>
                </Form.Group>
              </Col>
              <Col lg={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Composition<span className="text-danger">*</span></Form.Label>
                  {(formData.composition || []).map((material, index) => (
                    <InputGroup key={index} className="mb-2">
                      <Form.Control placeholder={`Material #${index + 1}`} value={material} onChange={(e) => handleDynamicListChange('composition', index, e.target.value)} isInvalid={!!errors.composition}/>
                      <Button variant="outline-danger" onClick={() => removeDynamicListItem('composition', index)}><Trash /></Button>
                    </InputGroup>
                  ))}
                  <Button variant="outline-secondary" size="sm" onClick={() => addDynamicListItem('composition')}><PlusCircleFill className="me-1" />Add Material</Button>
                </Form.Group>
              </Col>
            </Row>
            <hr/>
            <h5><Palette className="me-2" />Item Variations</h5>
            {formData.variations.map((v, index) => (
                <Card key={index} className="mb-3">
                <Card.Body>
                <Row className="g-3 align-items-start">
                  <Col lg={3} md={6} sm={12}>
                    <Form.Group>
                      <Form.Label>Color <span className="text-danger">*</span></Form.Label>
                      <ColorPickerInput
                        value={v.color}
                        onChange={colorObject => handleVariationChange(index, 'color', colorObject)}
                      />
                      {!!errors.variations?.[index]?.color && <div className="is-invalid"></div>}
                    </Form.Group>
                  </Col>
                  <Col lg={2} md={6} sm={12}>
                    <Form.Group>
                      <div className="d-flex justify-content-between align-items-baseline">
                        <Form.Label>Size <span className="text-danger">*</span></Form.Label>
                        <Button variant="link" size="sm" className="p-0 text-decoration-none" style={{ lineHeight: 1 }} onClick={() => setShowSizeChartModal(true)}>
                          Size Chart
                        </Button>
                      </div>
                      <Form.Select
                        value={v.size}
                        onChange={e => handleVariationChange(index, 'size', e.target.value)}
                        isInvalid={!!errors.variations?.[index]?.size}
                      >
                        <option value="">Select</option>
                        {STANDARD_SIZES.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col lg={2} md={6} sm={12}>
                    <Form.Group>
                      <Form.Label>Quantity <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        inputMode="numeric"
                        value={v.quantity}
                        onChange={e => handleVariationChange(index, 'quantity', e.target.value)}
                        onBlur={() => handleQuantityBlur(index)}
                        isInvalid={!!errors.variations?.[index]?.quantity}
                      />
                    </Form.Group>
                  </Col>
                  <Col lg={4} md={6} sm={12}>
                    <ImageDropzone
                      label="Variation Image *"
                      currentImage={v.imageUrl}
                      onFileSelect={(file) => handleVariationChange(index, 'imageUrl', file)}
                    />
                    {!!errors.variations?.[index]?.imageUrl && (
                        <div className="text-danger small mt-1">
                            An image is required for this variation.
                        </div>
                    )}
                  </Col>
                  <Col lg={1} md={12} sm={12} className="d-flex justify-content-end align-items-center mt-lg-4">
                    <Button variant="outline-danger" size="sm" onClick={() => handleRemoveVariation(index)}>
                      <Trash />
                    </Button>
                  </Col>
                </Row>
                </Card.Body>
                </Card>
            ))}
            <Button variant="outline-primary" size="sm" onClick={handleAddVariation} className="mt-1 mb-3"><PlusCircleFill className="me-2"/>Add Variation</Button>
            </Form>
        </Modal.Body>

        <Modal show={showSizeChartModal} onHide={() => setShowSizeChartModal(false)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Size Chart</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            <img src={SizeChart} alt="Size Chart" style={{ maxWidth: '100%' }} />
          </Modal.Body>
        </Modal>

        <Modal show={showPriceWarningModal} onHide={() => setShowPriceWarningModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <ExclamationTriangleFill className="me-2 text-warning" />
              Confirm Price
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            The price for this item is set to ₱0.00. Are you sure you want to proceed?
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPriceWarningModal(false)}>
              Go Back & Edit
            </Button>
            <Button 
              variant="warning" // Using warning color for emphasis
              onClick={() => {
                setShowPriceWarningModal(false); // Close this modal
                setShowConfirmModal(true);      // Open the next (final) confirmation modal
              }}
            >
              Yes, Proceed
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Changes</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to save these changes to the item?
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={() => {
                setShowConfirmModal(false); // Close the confirmation modal
                handleSave(); // Proceed with the actual save logic
              }}
            >
              Confirm & Save
            </Button>
          </Modal.Footer>
        </Modal>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={() => {
              // Step 1: Run standard validation first.
              if (!validateForm()) {
                addAlert('Please fill in all required fields marked with an asterisk (*).', 'danger');
                return; // Stop if there are basic errors.
              }
              
              // --- THIS IS THE NEW LOGIC ---
              // Step 2: Check if the price is zero.
              if (parseFloat(priceInput) <= 0) {
                // If price is zero, show the price warning modal first.
                setShowPriceWarningModal(true);
              } else {
                // If price is valid, proceed directly to the final confirmation modal.
                setShowConfirmModal(true);
              }
            }}
          >
            Save Item
          </Button>
        </Modal.Footer>
        </Modal>
    );
}

export default InventoryItems;