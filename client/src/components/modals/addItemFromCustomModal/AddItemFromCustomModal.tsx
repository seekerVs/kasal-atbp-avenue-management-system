import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Card, InputGroup, Alert, ListGroup, Spinner, CardText } from 'react-bootstrap';
import { CustomTailoringItem, InventoryItem, ItemVariation } from '../../../types';
import api from '../../../services/api';
import { useAlert } from '../../../contexts/AlertContext';
import { Gem, InfoCircleFill, Palette, PlusCircleFill, TagFill, Trash } from 'react-bootstrap-icons';
import { ImageDropzone } from '../../imageDropzone/ImageDropzone';
import { convertMeasurementsToSize } from '../../../utils/sizeConverter';

interface AddItemFromCustomModalProps {
  show: boolean;
  onHide: () => void;
  onFinished: () => void;
  itemToProcess: CustomTailoringItem;
}

type AddMode = 'new' | 'variation';

const AddItemFromCustomModal: React.FC<AddItemFromCustomModalProps> = ({ show, onHide, onFinished, itemToProcess }) => {
  const { addAlert } = useAlert();
  const [addMode, setAddMode] = useState<AddMode>('new');
  const [formData, setFormData] = useState<Omit<InventoryItem, '_id'>>({} as any);
  const [variationData, setVariationData] = useState({
    color: '',
    size: '',
    imageUrl: '',
    });
  
  // State for 'variation' mode
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (show) {
        const calculatedSize = convertMeasurementsToSize(itemToProcess.measurements);
        // --- PRE-POPULATE THE 'CREATE NEW PRODUCT' FORM ---
        const initialVariation: ItemVariation = {
        color: '', // User must fill this
        size: calculatedSize,
        quantity: itemToProcess.quantity, // Pre-filled and locked
        imageUrl: '', // User must fill this
        };

        setFormData({
        name: itemToProcess.name,
        price: itemToProcess.price,
        category: itemToProcess.outfitCategory,
        description: itemToProcess.designSpecifications,
        composition: itemToProcess.materials || '',
        features: [''], // User can add these
        variations: [initialVariation],
        });

        // --- RESET THE 'ADD AS VARIATION' FORM ---
        setVariationData({ color: '', size: calculatedSize, imageUrl: '' });

        // Reset other states
        setAddMode('new');
        setSelectedInventoryItem(null);
        setSearchTerm('');
    }
    }, [show, itemToProcess]);
  
  useEffect(() => {
    // Fetch inventory only when switching to 'variation' mode
    const fetchInventory = async () => {
      setLoadingInventory(true);
      try {
        const res = await api.get('/inventory');
        setInventory(res.data || []);
      } catch (error) {
        addAlert('Failed to load inventory.', 'danger');
      } finally {
        setLoadingInventory(false);
      }
    };

    if (show && addMode === 'variation' && inventory.length === 0) {
      fetchInventory();
    }
  }, [show, addMode]);

  const handleDynamicListChange = (listType: 'features' | 'composition', index: number, value: string) => {
        const list = formData[listType] as string[];
        const newList = [...list];
        newList[index] = value;
        setFormData(prev => ({ ...prev, [listType]: newList }));
    };

    const addDynamicListItem = (listType: 'features' | 'composition') => {
        const list = formData[listType] as string[] || [];
        setFormData(prev => ({ ...prev, [listType]: [...list, ''] }));
    };

    const removeDynamicListItem = (listType: 'features' | 'composition', index: number) => {
        const list = formData[listType] as string[] || [];
        const newList = list.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, [listType]: newList }));
    };

  const handleSave = async () => {
    // --- HANDLE "CREATE NEW PRODUCT" MODE ---
    if (addMode === 'new') {
        const newVariation = formData.variations[0];
        
        // Validation for 'new' mode
        if (!formData.name.trim()) {
        addAlert('Product Name is required.', 'warning');
        return;
        }
        if (!newVariation.color.trim()) {
        addAlert('Please provide a Color for the new product.', 'warning');
        return;
        }

        try {
        await api.post('/inventory', formData);
        addAlert(`Successfully created new product: ${formData.name}`, 'success');
        onFinished();
        } catch (error) {
        addAlert('Failed to create new product.', 'danger');
        }

    // --- HANDLE "ADD AS VARIATION" MODE ---
    } else {
        // Validation for 'variation' mode
        if (!selectedInventoryItem) {
        addAlert('Please select an existing product to add the variation to.', 'warning');
        return;
        }
        if (!variationData.color.trim()) { // <-- We removed the size check
        addAlert('Please provide a Color for the new variation.', 'warning'); // <-- Updated message
        return;
        }
        
        // Build the new variation from its dedicated state
        const newVariation: ItemVariation = {
        ...variationData,
        quantity: itemToProcess.quantity,
        };
        
        const updatedVariations = [...selectedInventoryItem.variations, newVariation];

        try {
        await api.put(`/inventory/${selectedInventoryItem._id}`, {
            ...selectedInventoryItem,
            variations: updatedVariations,
        });
        addAlert(`Successfully added new variation to ${selectedInventoryItem.name}`, 'success');
        onFinished();
        } catch (error) {
        addAlert('Failed to add variation.', 'danger');
        }
    }
    };

    const handleMainFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'price') {
        setFormData(prev => ({ ...prev, price: parseFloat(value) || 0 }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
    };

    const handleVariationFormChange = (field: keyof ItemVariation, value: string) => {
    const newVariations = [...formData.variations];
    (newVariations[0] as any)[field] = value;
    setFormData({ ...formData, variations: newVariations });
    };
  
  const filteredInventory = inventory.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleImageUploadSuccess = (newUrl: string) => {
    // This directly updates the imageUrl in the first variation of our form data.
    handleVariationFormChange('imageUrl', newUrl);
    };

    const handleVariationImageUploadSuccess = (newUrl: string) => {
    setVariationData(prev => ({ ...prev, imageUrl: newUrl }));
    };

  return (
    <Modal show={show} onHide={onFinished} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Add Returned Custom Item to Inventory</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        <Alert variant="info">
            Add the returned custom item, <strong>"{itemToProcess.name}"</strong>, to your inventory.
        </Alert>

        <div className="d-flex gap-2 mb-3">
            <Button variant={addMode === 'new' ? 'primary' : 'outline-primary'} onClick={() => setAddMode('new')}>Create as New Product</Button>
            <Button variant={addMode === 'variation' ? 'primary' : 'outline-primary'} onClick={() => setAddMode('variation')}>Add as Variation</Button>
        </div>

        {/* --- FORM FOR "ADD AS VARIATION" MODE --- */}
        {addMode === 'variation' && (
            <>
            <Row className='mb-3'>
                <Col md={6}>
                <Form.Control type="search" placeholder="Search for existing product..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                {searchTerm && (
                    <ListGroup className='mt-1' style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {loadingInventory ? <Spinner animation="border" size="sm" /> : filteredInventory.map(item => (
                        <ListGroup.Item key={item._id} action onClick={() => { setSelectedInventoryItem(item); setSearchTerm(''); }}>
                        {item.name}
                        </ListGroup.Item>
                    ))}
                    </ListGroup>
                )}
                </Col>
                <Col md={6}>
                {selectedInventoryItem && <Alert variant='success' className='py-2'>Adding variation to: <strong>{selectedInventoryItem.name}</strong></Alert>}
                </Col>
            </Row>

            <Card>
                <Card.Header as="h5">New Variation Details</Card.Header>
                <Card.Body>
                <Row>
                    <Col md={4}><Form.Group><Form.Label>Color <span className="text-danger">*</span></Form.Label><Form.Control value={variationData.color} onChange={e => setVariationData(p => ({ ...p, color: e.target.value }))} /></Form.Group></Col>
                    <Col md={4}><Form.Group><Form.Label>Size <span className="text-danger">*</span></Form.Label><Form.Control value={variationData.size} onChange={e => setVariationData(p => ({ ...p, size: e.target.value }))} disabled readOnly /></Form.Group></Col>
                    <Col md={4}><Form.Group><Form.Label>Quantity</Form.Label><Form.Control value={itemToProcess.quantity} disabled readOnly /></Form.Group></Col>
                </Row>
                <Row className="mt-3">
                    <Col>
                        <ImageDropzone
                        label="Variation Image"
                        currentImageUrl={variationData.imageUrl}
                        onUploadSuccess={handleVariationImageUploadSuccess}
                        />
                    </Col>
                </Row>
                </Card.Body>
            </Card>
            </>
        )}

        {/* --- FORM FOR "CREATE NEW PRODUCT" MODE --- */}
        {addMode === 'new' && formData.variations && (
        <Form>
            {/* Main Item Details */}
            <Row>
            <Col md={6}>
                <Form.Group className="mb-3">
                <Form.Label><InfoCircleFill className="me-1" /> Product Name <span className="text-danger">*</span></Form.Label>
                <Form.Control name="name" value={formData.name} onChange={handleMainFormChange} />
                </Form.Group>
            </Col>
            <Col md={3}>
                <Form.Group className="mb-3">
                <Form.Label><TagFill className="me-1" /> Category</Form.Label>
                <Form.Control name="category" value={formData.category} onChange={handleMainFormChange} />
                </Form.Group>
            </Col>
            <Col md={3}>
                <Form.Group className="mb-3">
                <Form.Label>Price (₱)</Form.Label>
                <Form.Control type="number" name="price" value={formData.price} onChange={handleMainFormChange} />
                </Form.Group>
            </Col>
            </Row>
            
            <Form.Group className="mb-3">
            <Form.Label><CardText className="me-1" /> Description</Form.Label>
            <Form.Control as="textarea" rows={2} name="description" value={formData.description} onChange={handleMainFormChange} />
            </Form.Group>
            
            <Row>
                <Col md={6}>
                    <Form.Group className="mb-4">
                    <Form.Label><Gem className="me-1" /> Features</Form.Label>
                    {/* Map over the features array to create an input for each */}
                    {formData.features.map((feature, index) => (
                        <InputGroup key={index} className="mb-2">
                        <Form.Control 
                            placeholder="e.g., Beaded bodice" 
                            value={feature} 
                            onChange={(e) => handleDynamicListChange('features', index, e.target.value)} 
                        />
                        <Button variant="outline-danger" onClick={() => removeDynamicListItem('features', index)}>
                            <Trash />
                        </Button>
                        </InputGroup>
                    ))}
                    <Button variant="outline-secondary" size="sm" onClick={() => addDynamicListItem('features')}>
                        <PlusCircleFill className="me-1" />Add Feature
                    </Button>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-4">
                    <Form.Label>Composition</Form.Label>
                    {/* Map over the composition array to create an input for each */}
                    {formData.composition.map((material, index) => (
                        <InputGroup key={index} className="mb-2">
                        <Form.Control 
                            placeholder="e.g., Chiffon" 
                            value={material} 
                            onChange={(e) => handleDynamicListChange('composition', index, e.target.value)} 
                        />
                        <Button variant="outline-danger" onClick={() => removeDynamicListItem('composition', index)}>
                            <Trash />
                        </Button>
                        </InputGroup>
                    ))}
                    <Button variant="outline-secondary" size="sm" onClick={() => addDynamicListItem('composition')}>
                        <PlusCircleFill className="me-1" />Add Material
                    </Button>
                    </Form.Group>
                </Col>
                </Row>

            <hr />
            <h5><Palette className="me-2" />Product Variations</h5>
            
            <Card className="mb-3">
            <Card.Body>
                <Row className="align-items-center">
                <Col md={3}>
                    <Form.Group>
                    <Form.Label>Color <span className="text-danger">*</span></Form.Label>
                    <Form.Control placeholder="e.g., Scarlet Red" value={formData.variations[0].color} onChange={e => handleVariationFormChange('color', e.target.value)} />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                    <Form.Label>Size <span className="text-danger">*</span></Form.Label>
                    <Form.Control placeholder="e.g., S, M, XL" value={formData.variations[0].size} onChange={e => handleVariationFormChange('size', e.target.value)} readOnly disabled />
                    </Form.Group>
                </Col>
                <Col md={2}>
                    <Form.Group>
                    <Form.Label>Quantity</Form.Label>
                    <Form.Control type="number" value={formData.variations[0].quantity} disabled readOnly />
                    </Form.Group>
                </Col>
                </Row>
                {/* --- Image Dropzone Implementation --- */}
                <Row className="mt-3">
                    <Col>
                        <ImageDropzone 
                            label="Variation Image"
                            currentImageUrl={formData.variations[0].imageUrl}
                            onUploadSuccess={handleImageUploadSuccess}
                        />
                    </Col>
                </Row>
            </Card.Body>
            </Card>
        </Form>
        )}
        </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onFinished}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save to Inventory</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddItemFromCustomModal;