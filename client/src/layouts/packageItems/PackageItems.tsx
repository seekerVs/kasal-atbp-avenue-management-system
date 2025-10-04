// client/src/layouts/packageItems/PackageItems.tsx

import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Table, Modal, Form, Spinner, Alert, InputGroup, Image } from 'react-bootstrap'; // <-- Add Image
import { PlusCircleFill, BoxSeam, PencilSquare, Trash, Search } from 'react-bootstrap-icons';
import { Package } from '../../types';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { PackageFormModal } from './packageForm/PackageFormModal';

function PackageItems() {
  const { addAlert } = useAlert(); 
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

  const handleSavePackage = async (packageData: Package, urlsToDelete: string[]) => {
      const id = packageData._id;
      const method = id ? 'put' : 'post';
      const url = id ? `/packages/${id}` : `/packages`;
      try {
        await api[method](url, packageData);
        if (urlsToDelete.length > 0) {
          await api.delete('/upload/bulk', { data: { urls: urlsToDelete } });
        }
        fetchPackages(); 
        setShowPackageModal(false);
        addAlert(`Package "${packageData.name}" saved successfully.`, 'success');
      } catch (err: any) { 
        setError(err.response?.data?.message || 'Failed to save package.'); 
      }
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
            <Col md={4}><InputGroup><InputGroup.Text><Search /></InputGroup.Text><Form.Control type="search" placeholder="Search by package name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></InputGroup></Col>
            <Col md={3} className="text-end"><Button variant="primary" onClick={() => handleOpenModal(null)}><PlusCircleFill className="me-2" />Add New Package</Button></Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
          {loading ? ( <div className="text-center py-5"><Spinner animation="border" /></div> ) : (
            <Table striped bordered hover responsive className="align-middle">
              {/* --- (1) ADD THE "IMAGE" HEADER --- */}
              <thead>
                <tr>
                  <th>Image</th>
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
                    {/* --- (2) ADD THE IMAGE DATA CELL --- */}
                    <td style={{ width: '80px', textAlign: 'center' }}>
                      <Image
                        src={pkg.imageUrls && pkg.imageUrls.length > 0 ? pkg.imageUrls[0] : 'https://placehold.co/60x60/e9ecef/adb5bd?text=N/A'}
                        alt={pkg.name}
                        style={{ width: '60px', height: '60px', borderRadius: '0.25rem', objectFit: 'cover' }}
                      />
                    </td>
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
      
      {showPackageModal && 
        <PackageFormModal 
          show={showPackageModal} 
          onHide={() => setShowPackageModal(false)} 
          onSave={handleSavePackage} 
          packageData={currentPackage} 
        />
      }
      
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Deletion</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to delete the package: <strong>{currentPackage?.name}</strong>? This action cannot be undone.</Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button><Button variant="danger" onClick={handleDeletePackage}>Delete</Button></Modal.Footer>
      </Modal>
    </Container>
  );
}

export default PackageItems;