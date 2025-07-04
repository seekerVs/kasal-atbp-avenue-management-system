import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Table, Badge, Modal, Form, InputGroup, Spinner, Alert, ListGroup, Accordion } from 'react-bootstrap';
import { PlusCircleFill, BoxSeam, PencilSquare, Trash, Search } from 'react-bootstrap-icons';
import axios from 'axios';
import { PackageDetails, InventoryItem, PackageAssignment, ColorMotif } from '../../types';
import AssignmentSubModal from '../../components/modals/assignmentSubModal/AssignmentSubModal';

interface FormAssignment extends PackageAssignment {
  isCustom?: boolean;
}

interface FormColorMotif extends Omit<ColorMotif, 'assignments'> {
  assignments: FormAssignment[];
}

interface FormPackageData extends Omit<PackageDetails, 'colorMotifs' | '_id'> {
  colorMotifs: FormColorMotif[];
}

interface InclusionItem {
  quantity: number;
  role: string;
}

const API_URL = 'http://localhost:3001/api';

// ===================================================================================
// --- MAIN COMPONENT: PackageItems ---
// ===================================================================================
function PackageItems() {
  const [packages, setPackages] = useState<PackageDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<PackageDetails | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true); setError(null);
    try {
      const response = await axios.get(`${API_URL}/packages`);
      setPackages(response.data);
    } catch (err) {
      setError('Failed to load packages.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (pkg: PackageDetails  | null) => {
    setCurrentPackage(pkg);
    setShowPackageModal(true);
  };

  const handleOpenDeleteModal = (pkg: PackageDetails ) => {
    setCurrentPackage(pkg);
    setShowDeleteModal(true);
  };

  const handleSavePackage = async (packageData: PackageDetails) => {
    const id = packageData._id;
    const method = id ? 'put' : 'post';
    const url = id ? `${API_URL}/packages/${id}` : `${API_URL}/packages`;

    // Sanitize the data to match the backend schema, now including all necessary fields.
    const sanitizedPackageData = {
        ...packageData,
        colorMotifs: packageData.colorMotifs.map(motif => ({
            motifName: motif.motifName,
            assignments: motif.assignments.map(({ 
                role, 
                itemId, 
                isCustom, 
                assignedItemName, 
                variation,
                imageUrl // Destructure all possible fields
            }) => {
                const finalAssignment: PackageAssignment = { role };

                if (isCustom) {
                    finalAssignment.isCustom = true;
                } else if (itemId) {
                    finalAssignment.itemId = itemId;
                    finalAssignment.assignedItemName = assignedItemName;
                    finalAssignment.variation = variation;
                    finalAssignment.imageUrl = imageUrl;
                }
                
                return finalAssignment;
            })
        }))
    };

    try {
      await axios[method](url, sanitizedPackageData);
      fetchPackages(); 
      setShowPackageModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save package.');
    }
  };

  const handleDeletePackage = async () => {
    if (!currentPackage) return;
    try {
      await axios.delete(`${API_URL}/packages/${currentPackage._id}`);
      fetchPackages();
      setShowDeleteModal(false);
    } catch (err) {
      setError('Failed to delete package.');
    }
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
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" /></div>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Package Name</th>
                  <th>Price</th>
                  <th>Inclusions</th>
                  <th>Color Motifs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPackages.map(pkg => (
                  <tr key={pkg._id}>
                    <td><strong>{pkg.name}</strong></td>
                    <td>₱{pkg.price.toFixed(2)}</td>
                    <td>{pkg.inclusions.length} items</td>
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

      {showPackageModal && (
        <PackageFormModal show={showPackageModal} onHide={() => setShowPackageModal(false)} onSave={handleSavePackage} packageData={currentPackage} />
      )}

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Deletion</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to delete the package: <strong>{currentPackage?.name}</strong>? This action cannot be undone.</Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button><Button variant="danger" onClick={handleDeletePackage}>Delete</Button></Modal.Footer>
      </Modal>
    </Container>
  );
}

// ===================================================================================
// --- SUB-COMPONENT: PackageFormModal ---
// ===================================================================================
interface PackageFormModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: PackageDetails) => void; // Use the official type
  packageData: PackageDetails | null;    // Use the official type
}

function PackageFormModal({ show, onHide, onSave, packageData }: PackageFormModalProps) {
    const emptyPackage: FormPackageData = { name: '', description: '', inclusions: [], price: 0, imageUrl: '', colorMotifs: [] };
    const [formData, setFormData] = useState<FormPackageData>(emptyPackage);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [assignmentContext, setAssignmentContext] = useState<{ motifIndex: number; assignmentIndex: number } | null>(null);
    const [inclusionItems, setInclusionItems] = useState<InclusionItem[]>([{ quantity: 1, role: '' }]);

    useEffect(() => {
        if (show) {
            axios.get(`${API_URL}/inventory`).then(res => {
                setInventory(res.data || []);
            });
        }
    }, [show]);

    useEffect(() => {
        // We need all data to be ready before initializing the form
        if (show && packageData && inventory.length > 0) {
            const { _id, ...data } = packageData;

            // 1. Enrich the colorMotifs with item names
            const enrichedMotifs = data.colorMotifs.map(motif => ({
                ...motif,
                assignments: motif.assignments.map(assign => {
                    if (assign.itemId) {
                        const itemDetails = inventory.find(invItem => invItem._id === assign.itemId);
                        return {
                            ...assign,
                            assignedItemName: itemDetails ? itemDetails.name : 'Unknown Item'
                        };
                    }
                    return assign;
                })
            }));

            // 2. Deconstruct the inclusions string array into objects
            const parsedInclusions = data.inclusions.map(inc => {
                const match = inc.match(/^(\d+)\s+(.*)$/);
                if (match) {
                    return { quantity: parseInt(match[1], 10), role: match[2] };
                }
                return { quantity: 1, role: inc };
            });

            // 3. Set ALL form state at once
            setFormData({ ...data, colorMotifs: enrichedMotifs });
            setInclusionItems(parsedInclusions.length > 0 ? parsedInclusions : [{ quantity: 1, role: '' }]);

        } else if (show && !packageData) {
            // This is for creating a NEW package, reset everything
            setFormData(emptyPackage);
            setInclusionItems([{ quantity: 1, role: '' }]);
        }
    }, [packageData, inventory, show]); 

    const handleInclusionChange = (index: number, field: 'quantity' | 'role', value: string | number) => {
        const updatedInclusions = [...inclusionItems];
        const targetInclusion = { ...updatedInclusions[index] };

        if (field === 'quantity') {
            targetInclusion.quantity = Number(value) >= 1 ? Number(value) : 1;
        } else {
            targetInclusion.role = String(value);
        }
        
        updatedInclusions[index] = targetInclusion;
        setInclusionItems(updatedInclusions);
    };

    const handleAddInclusion = () => {
        setInclusionItems(prev => [...prev, { quantity: 1, role: '' }]);
    };

    const handleRemoveInclusion = (index: number) => {
        setInclusionItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleCustomToggle = (motifIndex: number, assignmentIndex: number, isChecked: boolean) => {
      const updatedMotifs = formData.colorMotifs.map((motif, mIndex) => {
        if (mIndex === motifIndex) {
          const updatedAssignments = motif.assignments.map((assign, aIndex) => {
            if (aIndex === assignmentIndex) {
              const newAssign: FormAssignment = { ...assign, isCustom: isChecked };
              // When a slot is marked as custom, remove any assigned inventory item ID
              if (isChecked) {
                delete newAssign.itemId;
              }
              return newAssign;
            }
            return assign;
          });
          return { ...motif, assignments: updatedAssignments };
        }
        return motif;
      });
      setFormData(prev => ({ ...prev, colorMotifs: updatedMotifs }));
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'price') setFormData(prev => ({ ...prev, price: parseFloat(value) || 0 }));
        else if (name === 'inclusions') setFormData(prev => ({ ...prev, inclusions: value.split('\n') }));
        else setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleMotifChange = (motifIndex: number, field: 'motifName', value: string) => {
        const updatedMotifs = formData.colorMotifs.map((motif, index) => index === motifIndex ? { ...motif, [field]: value } : motif);
        setFormData(prev => ({ ...prev, colorMotifs: updatedMotifs }));
    };

    const handleAddMotif = () => setFormData(prev => ({ ...prev, colorMotifs: [...prev.colorMotifs, { motifName: '', assignments: [] }] }));
    const handleRemoveMotif = (motifIndex: number) => setFormData(prev => ({ ...prev, colorMotifs: prev.colorMotifs.filter((_, i) => i !== motifIndex) }));
    const handleAddAssignment = (motifIndex: number) => {
        const updatedMotifs = formData.colorMotifs.map((motif, index) => index === motifIndex ? { ...motif, assignments: [...motif.assignments, { role: '' }] } : motif);
        setFormData(prev => ({ ...prev, colorMotifs: updatedMotifs }));
    };
    const handleRemoveAssignment = (motifIndex: number, assignmentIndex: number) => {
        const updatedMotifs = formData.colorMotifs.map((motif, mIndex) => {
            if (mIndex === motifIndex) return { ...motif, assignments: motif.assignments.filter((_, aIndex) => aIndex !== assignmentIndex) };
            return motif;
        });
        setFormData(prev => ({ ...prev, colorMotifs: updatedMotifs }));
    };

    const handleOpenAssignmentModal = (motifIndex: number, assignmentIndex: number) => {
        setAssignmentContext({ motifIndex, assignmentIndex });
        setShowAssignmentModal(true);
    };

    const handleSaveAssignment = (assignedData: { itemId: string; name: string; variation: string; imageUrl: string }) => {
        if (!assignmentContext) return;
        const { motifIndex, assignmentIndex } = assignmentContext;

        const updatedMotifs = formData.colorMotifs.map((motif, mIndex) => {
            if (mIndex === motifIndex) {
                const updatedAssignments = motif.assignments.map((assign, aIndex) => {
                    if (aIndex === assignmentIndex) {
                        return { 
                            ...assign, 
                            itemId: assignedData.itemId,
                            assignedItemName: assignedData.name,
                            variation: assignedData.variation,
                            imageUrl: assignedData.imageUrl
                        };
                    }
                    return assign;
                });
                return { ...motif, assignments: updatedAssignments };
            }
            return motif;
        });
        setFormData(prev => ({...prev, colorMotifs: updatedMotifs }));
        setShowAssignmentModal(false);
    };

    const handleRoleChange = (motifIndex: number, assignmentIndex: number, value: string) => {
        const updatedMotifs = formData.colorMotifs.map((motif, mIndex) => {
            if (mIndex === motifIndex) {
                const updatedAssignments = motif.assignments.map((assign, aIndex) => aIndex === assignmentIndex ? { ...assign, role: value } : assign);
                return { ...motif, assignments: updatedAssignments };
            }
            return motif;
        });
        setFormData(prev => ({...prev, colorMotifs: updatedMotifs }));
    };

    const assignmentToPreselect = assignmentContext !== null 
        ? formData.colorMotifs[assignmentContext.motifIndex]?.assignments[assignmentContext.assignmentIndex] 
        : null;

    return (
        <>
            <Modal show={show} onHide={onHide} size="xl" backdrop="static">
                <Modal.Header closeButton><Modal.Title>{packageData ? 'Edit Package' : 'Add New Package'}</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form>
                        <Row>
                            <Col md={6}><Form.Group className="mb-3"><Form.Label>Package Name</Form.Label><Form.Control name="name" value={formData.name} onChange={handleInputChange} /></Form.Group></Col>
                            <Col md={3}><Form.Group className="mb-3"><Form.Label>Price</Form.Label><InputGroup><InputGroup.Text>₱</InputGroup.Text><Form.Control type="number" name="price" value={formData.price} onChange={handleInputChange} /></InputGroup></Form.Group></Col>
                            <Col md={3}><Form.Group className="mb-3"><Form.Label>Image URL</Form.Label><Form.Control name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} /></Form.Group></Col>
                        </Row>
                        <Form.Group className="mb-3"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} name="description" value={formData.description} onChange={handleInputChange} /></Form.Group>
                        
                        <Accordion>
                          {/* --- INCLUSIONS SECTION --- */}
                          <Accordion.Item eventKey="0">
                            <Accordion.Header>Inclusions ({inclusionItems.length} items)</Accordion.Header>
                            <Accordion.Body>
                                {inclusionItems.map((inclusion, index) => (
                                    <InputGroup className="mb-2" key={index}>
                                        <Form.Control
                                            type="number"
                                            min="1"
                                            value={inclusion.quantity}
                                            onChange={(e) => handleInclusionChange(index, 'quantity', e.target.value)}
                                            placeholder="Qty"
                                            style={{ flex: '0 0 80px' }}
                                        />
                                        <Form.Control
                                            type="text"
                                            value={inclusion.role}
                                            onChange={(e) => handleInclusionChange(index, 'role', e.target.value)}
                                            placeholder="Role / Item Description"
                                        />
                                        <Button variant="outline-danger" onClick={() => handleRemoveInclusion(index)} disabled={inclusionItems.length <= 1}>
                                            <Trash />
                                        </Button>
                                    </InputGroup>
                                ))}
                                <Button variant="outline-secondary" size="sm" onClick={handleAddInclusion}>
                                    <PlusCircleFill className="me-2" />
                                    Add Inclusion
                                </Button>
                            </Accordion.Body>
                          </Accordion.Item>

                          <hr />
                          <Accordion.Item eventKey="1">
                            <Accordion.Header>Color Motifs & Assignments ({formData.colorMotifs.length} motifs)</Accordion.Header>
                            <Accordion.Body>
                                {formData.colorMotifs.map((motif, motifIndex) => (
                                    <Card key={motif._id || motifIndex} className="mb-3">
                                        <Card.Header>
                                            <InputGroup>
                                                <Form.Control placeholder="Motif Name (e.g., Blush & Gold)" value={motif.motifName} onChange={e => handleMotifChange(motifIndex, 'motifName', e.target.value)} />
                                                <Button variant="outline-danger" onClick={() => handleRemoveMotif(motifIndex)}><Trash/></Button>
                                            </InputGroup>
                                        </Card.Header>
                                        <ListGroup variant="flush">
                                            {motif.assignments.map((assignment, assignIndex) => (
                                                <ListGroup.Item key={assignIndex}>
                                                    <Row className="align-items-center g-3">
                                                        <Col md={4}>
                                                            <InputGroup>
                                                                <InputGroup.Text>Role</InputGroup.Text>
                                                                <Form.Control 
                                                                    placeholder="e.g., Maid of Honor" 
                                                                    value={assignment.role} 
                                                                    onChange={e => handleRoleChange(motifIndex, assignIndex, e.target.value)}
                                                                />
                                                            </InputGroup>
                                                        </Col>
                                                        <Col>
                                                            <Form.Check 
                                                                type="switch"
                                                                id={`custom-switch-${motifIndex}-${assignIndex}`}
                                                                label="Custom Item Slot"
                                                                checked={!!assignment.isCustom}
                                                                onChange={(e) => handleCustomToggle(motifIndex, assignIndex, e.target.checked)}
                                                            />
                                                        </Col>
                                                        <Col>
                                                            {assignment.isCustom ? (
                                                                <Badge bg="info" className="p-2 w-100">Custom Tailoring Slot</Badge>
                                                            ) : (
                                                                <div className='text-center'>
                                                                    <p className='mb-0 fw-bold'>{assignment.assignedItemName || 'No Item Assigned'}</p>
                                                                    <p className='small text-muted mb-0'>{assignment.variation || ''}</p>
                                                                </div>
                                                            )}
                                                        </Col>
                                                        <Col xs="auto">
                                                            <Button 
                                                                variant="outline-primary" 
                                                                size="sm" 
                                                                onClick={() => handleOpenAssignmentModal(motifIndex, assignIndex)} 
                                                                disabled={!!assignment.isCustom}
                                                            >
                                                                {assignment.itemId ? 'Change Item' : 'Assign Item'}
                                                            </Button>
                                                        </Col>
                                                        <Col xs="auto">
                                                            <Button variant="outline-danger" size="sm" onClick={() => handleRemoveAssignment(motifIndex, assignIndex)}>×</Button>
                                                        </Col>
                                                    </Row>
                                                </ListGroup.Item>
                                            ))}
                                            <ListGroup.Item>
                                                <Button variant="link" size="sm" onClick={() => handleAddAssignment(motifIndex)}>+ Add Role</Button>
                                            </ListGroup.Item>
                                        </ListGroup>
                                    </Card>
                                ))}
                                <Button variant="outline-primary" onClick={handleAddMotif}>+ Add Color Motif</Button>
                            </Accordion.Body>
                        </Accordion.Item>
                      </Accordion>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={onHide}>Cancel</Button>
                  <Button variant="primary" 
                  onClick={() => {
                      // 1. Reconstruct the inclusions array from the 'inclusionItems' state
                      const reconstructedInclusions = inclusionItems
                          .filter(inc => inc.role.trim() !== '') // Ignore empty roles
                          .map(inc => `${inc.quantity} ${inc.role.trim()}`);

                      // 2. Build the final payload for saving
                      const finalSaveData = {
                          ...formData, // Contains name, price, description, colorMotifs etc.
                          inclusions: reconstructedInclusions, // Overwrite with the newly constructed array
                          _id: packageData?._id // Ensure the ID is included for updates
                      };
                      
                      // 3. Call the onSave prop with the complete, correct data
                      onSave(finalSaveData as PackageDetails);
                  }}>
                    Save Package
                  </Button>
                </Modal.Footer>
            </Modal>
            
            {showAssignmentModal && (
                <AssignmentSubModal 
                    show={showAssignmentModal}
                    onHide={() => setShowAssignmentModal(false)}
                    onAssign={handleSaveAssignment}
                    inventory={inventory}
                    preselectedItemId={assignmentToPreselect?.itemId}
                    preselectedVariation={assignmentToPreselect?.variation}
                />
            )}  
        </>
    );
}


export default PackageItems;