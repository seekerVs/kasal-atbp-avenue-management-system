import React, { useState, useEffect } from 'react';
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
  Gem
} from 'react-bootstrap-icons';
import { InventoryItem, ItemVariation } from '../../types';
import api from '../../services/api';


// --- MAIN COMPONENT ---
function InventoryItems() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');

  const [showItemModal, setShowItemModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/inventory');
        setInventory(response.data);
      } catch (err) {
        console.error("Error fetching inventory:", err);
        setError('Failed to load inventory. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

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

  const handleSaveItem = async (itemData: Omit<InventoryItem, '_id'> & { _id?: string | { $oid: string } }) => {
    setError(null);
    const id = currentItem ? currentItem._id : undefined;
    const method = id ? 'put' : 'post';
    const url = id ? `/inventory/${id}` : '/inventory';

    // Ensure _id is not sent for new items, and correctly formatted for updates if needed by backend
    let payload: any = { ...itemData };
    if (!id) { // New item
      delete payload._id; 
    } else { // Existing item, ensure _id is not in the payload if backend handles it from URL
      delete payload._id;
    }

    


    try {
      const response = await api[method](url, payload);
      const savedItem = response.data;

      if (id) {
        setInventory(inventory.map(item => item._id === id ? savedItem : item));
      } else {
        setInventory([...inventory, savedItem]);
      }
      handleCloseItemModal();
    } catch (err: any) {
      console.error("Error saving item:", err);
      setError(err.response?.data?.message || 'Failed to save item. Please try again.');
    }
  };

  const handleDeleteItem = async () => {
    if (!currentItem) return;
    setError(null);
    const id = currentItem._id;
    try {
      await api.delete(`/inventory/${id}`);
      setInventory(inventory.filter(item => item._id !== id));
      handleCloseDeleteModal();
    } catch (err: any) {
      console.error("Error deleting item:", err);
      setError(err.response?.data?.message || 'Failed to delete item. Please try again.');
    }
  };

  const getTotalStock = (item: InventoryItem) =>
    item.variations.reduce((sum, v) => sum + (v.quantity || 0), 0); // Ensure quantity exists

  const filteredInventory = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container fluid>
      <h2 className="mb-4">Inventory Management</h2>
      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col md={5}><div className="d-flex align-items-center"><BoxSeam size={24} className="me-2" /><h5 className="mb-0">All Products</h5></div></Col>
            <Col md={4}><InputGroup><Form.Control type="search" placeholder="Search by name or category..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></InputGroup></Col>
            <Col md={3} className="text-end"><Button variant="primary" onClick={() => handleOpenItemModal(null)}><PlusCircleFill className="me-2" />Add New Product</Button></Col>
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
                      <th>Product Name</th>
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
                          <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => handleOpenItemModal(item)}><PencilSquare /> Edit</Button>
                          <Button variant="outline-danger" size="sm" onClick={() => handleOpenDeleteModal(item)}><Trash /> Delete</Button>
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
        <Card.Footer><Pagination>{/* TODO: Implement pagination with API */}<Pagination.Prev disabled /><Pagination.Item active>{1}</Pagination.Item><Pagination.Next /></Pagination></Card.Footer>
      </Card>

      {showItemModal && <ItemFormModal show={showItemModal} onHide={handleCloseItemModal} onSave={handleSaveItem} item={currentItem} />}
      
      <Modal show={showDeleteModal} onHide={handleCloseDeleteModal} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Deletion</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to delete the item: <strong>{currentItem?.name}</strong>? This action cannot be undone.</Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={handleCloseDeleteModal}>Cancel</Button><Button variant="danger" onClick={handleDeleteItem}>Delete Item</Button></Modal.Footer>
      </Modal>
    </Container>
  );
}

// --- SUB-COMPONENT for the Add/Edit Form Modal ---
interface ItemFormModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (itemData: InventoryItem) => void; // It now just saves the whole item
  item: InventoryItem | null;
}

function ItemFormModal({ show, onHide, onSave, item }: ItemFormModalProps) {
  const [formData, setFormData] = useState<Omit<InventoryItem, '_id'>>({
    name: '',
    price: 0,
    category: '',
    description: '',
    features: [],
    composition: '',
    variations: [],
  });
  
  useEffect(() => {
    if (item) {
      const { _id, ...editableData } = item;
      setFormData({
        ...editableData,
        variations: editableData.variations ? editableData.variations.map(v => ({...v})) : [], // Deep copy variations
      });
    } else {
      setFormData({
        name: '', price: 0, category: '', description: '', features: [], composition: '',
        variations: [{ color: '', size: '', quantity: 1, imageUrl: '' }]
      });
    }
  }, [item]);

  const handleMainFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "features") {
        setFormData(prev => ({ ...prev, [name]: value.split(',').map(s => s.trim()).filter(s => s) }));
    } else if (name === "price") {
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = () => {
    // Construct the object to save, including the _id if we are editing.
    const itemToSave: InventoryItem = {
      ...formData,
      _id: item ? item._id : '', // Add original _id if editing, or an empty string for new items
    };
    onSave(itemToSave);
};
  
  const handleVariationChange = (index: number, field: keyof Omit<ItemVariation, '_id' | 'dressId'>, value: string | number) => {
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
      variations: [...formData.variations, { color: '', size: '', quantity: 1, imageUrl: '' }],
    });
  };

  const handleRemoveVariation = (index: number) => {
    const newVariations = formData.variations.filter((_, i) => i !== index);
    setFormData({ ...formData, variations: newVariations });
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static">
      <Modal.Header closeButton><Modal.Title>{item ? 'Edit Product' : 'Add New Product'}</Modal.Title></Modal.Header>
      <Modal.Body>
        <Form>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label><InfoCircleFill className="me-1" /> Product Name</Form.Label>
                <Form.Control type="text" name="name" value={formData.name} onChange={handleMainFormChange} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label><TagFill className="me-1" /> Category</Form.Label>
                <Form.Control type="text" name="category" placeholder="e.g., Gowns" value={formData.category} onChange={handleMainFormChange} />
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
            <Form.Control as="textarea" name="description" rows={2} value={formData.description} onChange={handleMainFormChange} />
          </Form.Group>
          
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label><Gem className="me-1" /> Features (comma-separated)</Form.Label>
                <Form.Control type="text" name="features" placeholder="e.g., Floor-length, Beaded bodice" value={formData.features.join(', ')} onChange={handleMainFormChange} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label>Composition</Form.Label>
                <Form.Control type="text" name="composition" placeholder="e.g., Chiffon, Satin lining" value={formData.composition} onChange={handleMainFormChange} />
              </Form.Group>
            </Col>
          </Row>
          
          <hr/>
          <h5><Palette className="me-2" />Product Variations</h5>
          
          {formData.variations.map((v, index) => (
            <Card key={index} className="mb-3 variation-card"> {/* Use index as key if v._id might not be present for new variations */}
              <Card.Body>
                <Row className="align-items-center">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Color</Form.Label>
                      <Form.Control type="text" placeholder="e.g., Scarlet Red" value={v.color} onChange={e => handleVariationChange(index, 'color', e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Size</Form.Label>
                      <Form.Control type="text" placeholder="e.g., S, M, US 4" value={v.size} onChange={e => handleVariationChange(index, 'size', e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={2}>
                    <Form.Group>
                      <Form.Label>Quantity</Form.Label>
                      <Form.Control type="number" min="0" value={v.quantity} onChange={e => handleVariationChange(index, 'quantity', parseInt(e.target.value, 10) || 0)} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Image URL</Form.Label>
                      <Form.Control type="text" placeholder="https://..." value={v.imageUrl} onChange={e => handleVariationChange(index, 'imageUrl', e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={1} className="d-flex align-items-end justify-content-center">
                    {v.imageUrl ? 
                        <img src={v.imageUrl} alt={`${v.color} ${v.size}`} style={{width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px'}}/>
                        : <ImageIcon size={24} className="text-muted"/>
                    }
                  </Col>
                  <Col md={1} className="d-flex align-items-end justify-content-end">
                    <Button variant="outline-danger" size="sm" onClick={() => handleRemoveVariation(index)}><Trash /></Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ))}
          <Button variant="outline-primary" size="sm" onClick={handleAddVariation} className="mt-1 mb-3"><PlusCircleFill className="me-2"/>Add Variation</Button>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save Product</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default InventoryItems;