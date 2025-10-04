// client/src/layouts/accounts/Accounts.tsx

import { useState, useEffect, useMemo } from 'react';
import {
    Container, Row, Col, Button, Card, InputGroup, Form,
    Spinner, Alert, Badge, Modal
} from 'react-bootstrap';
import { PersonPlusFill, PersonVcard, PencilSquare, Trash, Search, PersonCircle } from 'react-bootstrap-icons';

import { fetchUsers, deleteUser } from '../../api/apiService';
import UserFormModal from '../../components/modals/userFormModal/UserFormModal';
import { useAlert } from '../../contexts/AlertContext';
import { User } from '../../types';
import './Account.css';
import api from '../../services/api';

const DeleteConfirmationModal = ({ show, onHide, onConfirm, userName }: { show: boolean, onHide: () => void, onConfirm: () => void, userName: string }) => (
    <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Deletion</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to delete <strong>{userName}</strong>? This action cannot be undone.</Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={onHide}>Cancel</Button>
            <Button variant="danger" onClick={onConfirm}>Delete</Button>
        </Modal.Footer>
    </Modal>
);

function Accounts() {
    // --- NEW STATE for managing tabs ---
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loggedInUserRole, setLoggedInUserRole] = useState<'Standard' | 'Super Admin' | null>(null);

    const { addAlert } = useAlert();

    useEffect(() => {
        // --- 3. FETCH both all users and the current user's data in parallel ---
        const loadInitialData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Use Promise.all for more efficient data fetching
                const [allUsers, currentUserData] = await Promise.all([
                    fetchUsers(),
                    api.get('/users/me') // Your existing endpoint to get the logged-in user
                ]);
                setUsers(allUsers);
                setLoggedInUserRole(currentUserData.data.role);
            } catch (err) {
                setError('Failed to fetch user accounts.');
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await fetchUsers();
            setUsers(data);
        } catch (err) {
            setError('Failed to refresh user accounts.');
        }
    };

    const handleDeleteUser = async () => {
        if (!currentUser) return;
        try {
            await deleteUser(currentUser._id);
            addAlert('User deleted successfully.', 'success'); 
            setShowDeleteModal(false);
            setCurrentUser(null);
            loadUsers(); 
        } catch {
            addAlert('Failed to delete user.', 'danger');
        }
    };

    const filteredUsers = useMemo(() => (
        users.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ), [users, searchTerm]);

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'inactive': return 'secondary';
            case 'suspended': return 'warning';
            default: return 'light';
        }
    };

    const isSuperAdmin = loggedInUserRole === 'Super Admin';

    return (
        <Container fluid>
            <h2 className="mb-4">Account Management</h2>

            <Card className="shadow-sm">
                <Card.Header>
                    <Row className="align-items-center gy-3">
                        <Col md={4}><div className="d-flex align-items-center"><PersonVcard size={24} className="me-2" /><h5 className="mb-0">All Accounts</h5></div></Col>
                        <Col md={5}>
                            <InputGroup>
                                <InputGroup.Text><Search /></InputGroup.Text>
                                <Form.Control type="search" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </InputGroup>
                        </Col>
                        <Col md={3} className="text-md-end">
                            {/* --- 5. CONDITIONALLY render the "Add" button --- */}
                            {isSuperAdmin && (
                                <Button onClick={() => { setCurrentUser(null); setShowFormModal(true); }}>
                                    <PersonPlusFill className="me-2" /> Add New Account
                                </Button>
                            )}
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body>
                    {loading && <div className="text-center py-5"><Spinner animation="border" /></div>}
                    {error && <Alert variant="danger">{error}</Alert>}
                    {!loading && !error && (
                        <div className="accounts-container">
                            {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                <Card key={user._id} className="account-card shadow-sm text-center">
                                    <Card.Body>
                                        <PersonCircle className="account-card-icon mb-3" />
                                        <Card.Title as="h5" className="mb-1">{user.name}</Card.Title>
                                        <Card.Text className="text-muted small mb-3">{user.email}</Card.Text>
                                        <div className="d-flex justify-content-center gap-2">
                                            <Badge bg={user.role === 'Super Admin' ? 'danger' : 'primary'}>
                                                {user.role}
                                            </Badge>
                                            <Badge bg={getStatusBadgeVariant(user.status)}>
                                                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                            </Badge>
                                        </div>
                                    </Card.Body>
                                    <Card.Footer className="bg-white border-0">
                                        {/* --- 6. CONDITIONALLY render action buttons --- */}
                                        {isSuperAdmin && (
                                            <>
                                                <Button variant="outline-primary" size="sm" onClick={() => { setCurrentUser(user); setShowFormModal(true); }}>
                                                    <PencilSquare className="me-1"/> Edit
                                                </Button>
                                                {/* Prevent the Super Admin from deleting themselves */}
                                                <Button variant="outline-danger" size="sm" onClick={() => { setCurrentUser(user); setShowDeleteModal(true); }} disabled={user.role === 'Super Admin'}>
                                                    <Trash className="me-1"/> Delete
                                                </Button>
                                            </>
                                        )}
                                    </Card.Footer>
                                </Card>
                            )) : (
                                <Alert variant="info" style={{ gridColumn: '1 / -1' }}>No users found matching your search.</Alert>
                            )}
                        </div>
                    )}
                </Card.Body>
            </Card>

            {showFormModal && <UserFormModal show={showFormModal} onHide={() => setShowFormModal(false)} onSave={() => { setShowFormModal(false); loadUsers(); }} userToEdit={currentUser} />}
            {showDeleteModal && currentUser && <DeleteConfirmationModal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} onConfirm={handleDeleteUser} userName={currentUser.name} />}
        </Container>
    );
}

export default Accounts;