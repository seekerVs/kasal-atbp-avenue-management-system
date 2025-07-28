import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Button, Card, Table, Modal, Form, InputGroup, Spinner, Alert, ListGroup, Accordion } from 'react-bootstrap';
import { PlusCircleFill, BoxSeam, PencilSquare, Trash } from 'react-bootstrap-icons';
import { Package, InventoryItem, PackageAssignment, InclusionItem } from '../../types';
import api from '../../services/api';
import { v4 as uuidv4 } from 'uuid';
import { SelectedItemData, SingleItemSelectionModal } from '../../components/modals/singleItemSelectionModal/SingleItemSelectionModal';

// ===================================================================================
// --- MAIN COMPONENT: PackageItems (Unchanged) ---
// ===================================================================================
function PackageItems() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<Package | null>(null);

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    setLoading(true); setError(null);
    try {
      const response = await api.get('/packages');
      setPackages(response.data);
    } catch (err) { setError('Failed to load packages.'); } 
    finally { setLoading(false); }
  };

  const handleOpenModal = (pkg: Package | null) => { setCurrentPackage(pkg); setShowPackageModal(true); };
  const handleOpenDeleteModal = (pkg: Package) => { setCurrentPackage(pkg); setShowDeleteModal(true); };

  const handleSavePackage = async (packageData: Package) => {
    const id = packageData._id;
    const method = id ? 'put' : 'post';
    const url = id ? `/packages/${id}` : `/packages`;
    try {
      await api[method](url, packageData);
      fetchPackages(); 
      setShowPackageModal(false);
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to save package.'); }
  };

  const handleDeletePackage = async () => {
    if (!currentPackage) return;
    try {
      await api.delete(`/packages/${currentPackage._id}`);
      fetchPackages();
      setShowDeleteModal(false);
    } catch (err) { setError('Failed to delete package.'); }
  };

  const filteredPackages = packages.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <Container fluid>
      <h2 className="mb-4">Package Management</h2>
      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col md={5}><div className="d-flex align-items-center"><BoxSeam size={24} className="me-2" /><h5 className="mb-0">All Packages</h5></div></Col>
            <Col md={4}><InputGroup><Form.Control type="search" placeholder="Search by package name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></InputGroup></Col>
            <Col md={3} className="text-end"><Button variant="primary" onClick={() => handleOpenModal(null)}><PlusCircleFill className="me-2" />Add New Package</Button></Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
          {loading ? ( <div className="text-center py-5"><Spinner animation="border" /></div> ) : (
            <Table striped bordered hover responsive>
              <thead><tr><th>Package Name</th><th>Price</th><th>Inclusions</th><th>Color Motifs</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredPackages.map(pkg => (
                  <tr key={pkg._id}>
                    <td><strong>{pkg.name}</strong></td><td>₱{pkg.price.toFixed(2)}</td><td>{pkg.inclusions.length} items</td>
                    <td>{pkg.colorMotifs.length}</td>
                    <td>
                      <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => handleOpenModal(pkg)}><PencilSquare /></Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleOpenDeleteModal(pkg)}><Trash /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
      {showPackageModal && <PackageFormModal show={showPackageModal} onHide={() => setShowPackageModal(false)} onSave={handleSavePackage} packageData={currentPackage} />}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Deletion</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to delete the package: <strong>{currentPackage?.name}</strong>? This action cannot be undone.</Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button><Button variant="danger" onClick={handleDeletePackage}>Delete</Button></Modal.Footer>
      </Modal>
    </Container>
  );
}

// ===================================================================================
// --- SUB-COMPONENT: PackageFormModal (Completely Overhauled) ---
// ===================================================================================
interface PackageFormModalProps {
  show: boolean; onHide: () => void; onSave: (data: Package) => void; packageData: Package | null;
}

function PackageFormModal({ show, onHide, onSave, packageData }: PackageFormModalProps) {
    const emptyPackage: Omit<Package, '_id'> = { name: '', description: '', inclusions: [], price: 0, imageUrls: [], colorMotifs: [] };
    const [formData, setFormData] = useState<Omit<Package, '_id'>>(emptyPackage);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    // NEW: Context now needs more detail to pinpoint the exact assignment slot
    const [assignmentContext, setAssignmentContext] = useState<{ motifIndex: number; inclusionId: string; wearerIndex: number } | null>(null);

    const inventoryMap = useMemo(() => new Map(inventory.map(item => [item._id, item])), [inventory]);

    // This crucial useEffect hook ensures the assignments data structure is always synchronized with the inclusions list.
    useEffect(() => {
      if (show) {
        api.get('/inventory').then(res => setInventory(res.data.items || [])).catch(console.error);
        const initialData = packageData ? JSON.parse(JSON.stringify(packageData)) : emptyPackage;
        // Ensure every inclusion has a client-side UUID for stable keys
        initialData.inclusions = initialData.inclusions.map((inc: InclusionItem) => ({ ...inc, _id: inc._id || uuidv4() }));

        // For each motif, ensure an assignment exists for every inclusion.
        initialData.colorMotifs = initialData.colorMotifs.map((motif: any) => {
          const syncedAssignments = initialData.inclusions.map((inclusion: InclusionItem) => {
            const existingAssignment = motif.assignments.find((a: PackageAssignment) => a.inclusionId === inclusion._id);
            if (existingAssignment) {
              // Ensure the itemIds array has the correct length, padding with null if needed.
              const correctedItemIds = Array.from({ length: inclusion.wearerNum }, (_, i) => existingAssignment.itemIds[i] || null);
              return { ...existingAssignment, itemIds: correctedItemIds };
            }
            // If no assignment exists for this inclusion, create a new blank one.
            return {
              inclusionId: inclusion._id,
              itemIds: Array(inclusion.wearerNum).fill(null)
            };
          });
          return { ...motif, assignments: syncedAssignments };
        });
        setFormData(initialData);
      }
    }, [show, packageData]);

    // Main package details handlers (name, price, etc.)
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) || 0 : value }));
    };

    // --- NEW: Handlers for inclusions that also update assignments ---
    const handleInclusionChange = (index: number, field: keyof Omit<InclusionItem, '_id'>, value: string | number | boolean) => {
      const updatedInclusions = [...formData.inclusions];
      const targetInclusion = { ...updatedInclusions[index], [field]: value };
      updatedInclusions[index] = targetInclusion;

      // If wearerNum changes, we must resize the itemIds array in all motifs for this inclusion.
      if (field === 'wearerNum') {
        const updatedMotifs = formData.colorMotifs.map(motif => ({
          ...motif,
          assignments: motif.assignments.map(assign => {
            if (assign.inclusionId === targetInclusion._id) {
              const newItemIds = Array.from({ length: Number(value) }, (_, i) => assign.itemIds[i] || null);
              return { ...assign, itemIds: newItemIds };
            }
            return assign;
          })
        }));
        setFormData(prev => ({ ...prev, inclusions: updatedInclusions, colorMotifs: updatedMotifs }));
      } else {
        setFormData(prev => ({ ...prev, inclusions: updatedInclusions }));
      }
    };
    
    const handleAddInclusion = () => {
      const newInclusion: InclusionItem = { _id: uuidv4(), wearerNum: 1, name: '', isCustom: false };
      // Also add a corresponding blank assignment to every existing motif.
      const updatedMotifs = formData.colorMotifs.map(motif => ({
        ...motif,
        assignments: [...motif.assignments, { inclusionId: newInclusion._id, itemIds: [null] }]
      }));
      setFormData(prev => ({ ...prev, inclusions: [...prev.inclusions, newInclusion], colorMotifs: updatedMotifs }));
    };

    const handleRemoveInclusion = (idToRemove: string) => {
      // Also remove the corresponding assignment from every motif.
      const updatedMotifs = formData.colorMotifs.map(motif => ({
        ...motif,
        assignments: motif.assignments.filter(a => a.inclusionId !== idToRemove)
      }));
      setFormData(prev => ({
        ...prev,
        inclusions: prev.inclusions.filter(inc => inc._id !== idToRemove),
        colorMotifs: updatedMotifs
      }));
    };

    // Motif handlers
    const handleAddMotif = () => {
      // When adding a new motif, it must be pre-populated with assignments for all existing inclusions.
      const newAssignments = formData.inclusions.map(inc => ({
        inclusionId: inc._id,
        itemIds: Array(inc.wearerNum).fill(null)
      }));
      setFormData(prev => ({ ...prev, colorMotifs: [...prev.colorMotifs, { motifName: '', assignments: newAssignments }] }));
    };
    const handleRemoveMotif = (motifIndex: number) => setFormData(prev => ({ ...prev, colorMotifs: prev.colorMotifs.filter((_, i) => i !== motifIndex) }));
    const handleMotifChange = (motifIndex: number, value: string) => {
        const updatedMotifs = formData.colorMotifs.map((motif, index) => index === motifIndex ? { ...motif, motifName: value } : motif);
        setFormData(prev => ({ ...prev, colorMotifs: updatedMotifs }));
    };
    
    // Assignment Handlers
    const handleOpenAssignmentModal = (motifIndex: number, inclusionId: string, wearerIndex: number) => {
        setAssignmentContext({ motifIndex, inclusionId, wearerIndex });
        setShowAssignmentModal(true);
    };

    const handleSaveAssignment = (selection: SelectedItemData) => { // The parameter type changes
        if (!assignmentContext) return;
        const { motifIndex, inclusionId, wearerIndex } = assignmentContext;
        const { product } = selection; // We only need the product from the selection
        
        const updatedMotifs = [...formData.colorMotifs];
        const assignment = updatedMotifs[motifIndex].assignments.find(a => a.inclusionId === inclusionId);
        
        if (assignment) {
            // We only save the ID, the name will be looked up for display
            assignment.itemIds[wearerIndex] = product._id;
        }
        
        setFormData(prev => ({...prev, colorMotifs: updatedMotifs}));
        setShowAssignmentModal(false);
    };

    const assignmentToPreselect = useMemo(() => {
        if (!assignmentContext) return null;
        const { motifIndex, inclusionId, wearerIndex } = assignmentContext;
        return formData.colorMotifs[motifIndex]?.assignments.find(a => a.inclusionId === inclusionId)?.itemIds[wearerIndex];
    }, [assignmentContext, formData]);
    
    return (
        <>
            <Modal show={show} onHide={onHide} size="xl" backdrop="static">
              <Modal.Header closeButton><Modal.Title>{packageData ? 'Edit Package' : 'Add New Package'}</Modal.Title></Modal.Header>
              <Modal.Body>
                  <Form>
                      {/* --- Main package details section (unchanged) --- */}
                      <Row>
                          <Col md={8}><Form.Group className="mb-3"><Form.Label>Package Name</Form.Label><Form.Control name="name" value={formData.name} onChange={handleInputChange} /></Form.Group></Col>
                          <Col md={4}><Form.Group className="mb-3"><Form.Label>Price</Form.Label><InputGroup><InputGroup.Text>₱</InputGroup.Text><Form.Control type="number" name="price" value={formData.price} onChange={handleInputChange} /></InputGroup></Form.Group></Col>
                      </Row>
                      <Form.Group className="mb-3"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} name="description" value={formData.description || ''} onChange={handleInputChange} /></Form.Group>
                      
                      <Accordion>
                        {/* --- Inclusions Management Section (unchanged) --- */}
                        <Accordion.Item eventKey="0">
                          <Accordion.Header>Package Inclusions ({formData.inclusions.length})</Accordion.Header>
                          <Accordion.Body>
                              <Row>
                                  {/* 1. Calculate the midpoint to split the array */}
                                  {(() => {
                                    const midpoint = Math.ceil(formData.inclusions.length / 2);
                                    const leftColumnInclusions = formData.inclusions.slice(0, midpoint);
                                    const rightColumnInclusions = formData.inclusions.slice(midpoint);

                                    return (
                                      <>
                                        {/* --- LEFT COLUMN --- */}
                                        <Col md={6}>
                                          {leftColumnInclusions.map((inclusion, index) => (
                                              <Row key={inclusion._id} className="g-2 align-items-center mb-2 p-2 border rounded">
                                                  <Col sm={12} md={3}><Form.Control type="number" min="1" value={inclusion.wearerNum} onChange={(e) => handleInclusionChange(index, 'wearerNum', Number(e.target.value))} placeholder="#"/></Col>
                                                  <Col><Form.Control type="text" placeholder="Inclusion Name" value={inclusion.name} onChange={(e) => handleInclusionChange(index, 'name', e.target.value)} /></Col>
                                                  <Col sm="auto"><Form.Check type="switch" label="Custom" checked={!!inclusion.isCustom} onChange={(e) => handleInclusionChange(index, 'isCustom', e.target.checked)} /></Col>
                                                  <Col sm="auto"><Button variant="outline-danger" onClick={() => handleRemoveInclusion(inclusion._id)}><Trash /></Button></Col>
                                              </Row>
                                          ))}
                                        </Col>

                                        {/* --- RIGHT COLUMN --- */}
                                        <Col md={6}>
                                          {rightColumnInclusions.map((inclusion, index) => {
                                            // 2. IMPORTANT: Adjust the index for the right column for the handler to work correctly.
                                            const originalIndex = midpoint + index;
                                            return (
                                              <Row key={inclusion._id} className="g-2 align-items-center mb-2 p-2 border rounded">
                                                  <Col sm={12} md={3}><Form.Control type="number" min="1" value={inclusion.wearerNum} onChange={(e) => handleInclusionChange(originalIndex, 'wearerNum', Number(e.target.value))} placeholder="#"/></Col>
                                                  <Col><Form.Control type="text" placeholder="Inclusion Name" value={inclusion.name} onChange={(e) => handleInclusionChange(originalIndex, 'name', e.target.value)} /></Col>
                                                  <Col sm="auto"><Form.Check type="switch" label="Custom" checked={!!inclusion.isCustom} onChange={(e) => handleInclusionChange(originalIndex, 'isCustom', e.target.checked)} /></Col>
                                                  <Col sm="auto"><Button variant="outline-danger" onClick={() => handleRemoveInclusion(inclusion._id)}><Trash /></Button></Col>
                                              </Row>
                                            )
                                          })}
                                        </Col>
                                      </>
                                    )
                                  })()}
                              </Row>
                              <Button variant="outline-secondary" size="sm" className="mt-2" onClick={handleAddInclusion}><PlusCircleFill className="me-2" />Add Inclusion</Button>
                          </Accordion.Body>
                        </Accordion.Item>

                        {/* --- Color Motifs & Assignments Section (THIS IS THE CHANGED PART) --- */}
                        <Accordion.Item eventKey="1">
                          <Accordion.Header>Color Motifs & Item Assignments ({formData.colorMotifs.length})</Accordion.Header>
                          <Accordion.Body>
                              {/* 1. Wrap the motifs in another Accordion */}
                              <Accordion defaultActiveKey="0">
                                {formData.colorMotifs.map((motif, motifIndex) => (
                                  // 2. Each Card is now an Accordion.Item
                                  <Accordion.Item eventKey={String(motifIndex)} key={motif._id || motifIndex} className="mb-2">
                                    <Accordion.Header>
                                      {/* 3. The Header contains the input and remove button */}
                                      <InputGroup onClick={(e) => e.stopPropagation()}>
                                        <Form.Control 
                                          placeholder="Motif Name (e.g., Blush & Gold)" 
                                          value={motif.motifName} 
                                          onChange={e => handleMotifChange(motifIndex, e.target.value)} 
                                        />
                                        <Button 
                                          variant="outline-danger" 
                                          onClick={() => handleRemoveMotif(motifIndex)}
                                        >
                                          <Trash/>
                                        </Button>
                                      </InputGroup>
                                    </Accordion.Header>
                                    <Accordion.Body>
                                      {/* 4. The Body contains the list of inclusions and their assignment slots */}
                                      <ListGroup variant="flush">
                                          {formData.inclusions.map(inclusion => {
                                              const assignment = motif.assignments.find(a => a.inclusionId === inclusion._id);
                                              if (!assignment) return null;
                                              return (
                                                <ListGroup.Item key={inclusion._id} className="px-1 py-3">
                                                  <Row>
                                                    <Col md={4}><strong className='d-block mt-2'>{inclusion.wearerNum} {inclusion.name}</strong></Col>
                                                    <Col md={8}>
                                                      {Array.from({ length: inclusion.wearerNum }).map((_, wearerIndex) => {
                                                        const itemId = assignment.itemIds[wearerIndex];
                                                        const itemDetails = itemId ? inventoryMap.get(itemId) : null;
                                                        return (
                                                          <InputGroup key={wearerIndex} className="mb-2">
                                                            <InputGroup.Text>{`#${wearerIndex + 1}`}</InputGroup.Text>
                                                            <Form.Control readOnly value={itemDetails?.name || 'Not Assigned'} className={!itemDetails ? 'text-muted fst-italic' : ''}/>
                                                            <Button variant="outline-primary" disabled={!!inclusion.isCustom} onClick={() => handleOpenAssignmentModal(motifIndex, inclusion._id, wearerIndex)}>Assign</Button>
                                                          </InputGroup>
                                                        )
                                                      })}
                                                    </Col>
                                                  </Row>
                                                </ListGroup.Item>
                                              );
                                          })}
                                      </ListGroup>
                                    </Accordion.Body>
                                  </Accordion.Item>
                                ))}
                              </Accordion>
                              <Button variant="outline-primary" className="mt-2" onClick={handleAddMotif}>+ Add Color Motif</Button>
                          </Accordion.Body>
                        </Accordion.Item>
                      </Accordion>
                  </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={() => onSave({ ...formData, _id: packageData?._id } as Package)}>Save Package</Button>
              </Modal.Footer>
            </Modal>
            
            {showAssignmentModal && (
                <SingleItemSelectionModal 
                    show={showAssignmentModal}
                    onHide={() => setShowAssignmentModal(false)}
                    onSelect={handleSaveAssignment} // Use the updated handler
                    addAlert={() => {}} // Pass a no-op alert function as it's not critical here
                    mode="assignment" // Set the mode
                    preselectedItemId={assignmentToPreselect || undefined}
                    // We don't have variation info here, so this prop is omitted
                />
            )}  
        </>
    );
}

export default PackageItems;