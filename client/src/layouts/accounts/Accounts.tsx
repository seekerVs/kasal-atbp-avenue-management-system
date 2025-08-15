// client/src/layouts/accounts/Accounts.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
    Container, Row, Col, Button, Card, Table, InputGroup, Form,
    Spinner, Alert, Badge, Modal, Nav // <-- Add Nav
} from 'react-bootstrap';
import { PersonPlusFill, PersonVcard, PencilSquare, Trash, Search } from 'react-bootstrap-icons';

import { fetchUsers, deleteUser } from '../../api/apiService';
import UserFormModal from '../../components/modals/userFormModal/UserFormModal';
import { useAlert } from '../../contexts/AlertContext';
import { User } from '../../types';
import RolesManager from '../rolesManager/RolesManager';

// DeleteConfirmationModal can remain unchanged
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
    const [activeTab, setActiveTab] = useState('accounts');

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const { addAlert } = useAlert();

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await fetchUsers();
            setUsers(data);
        } catch (err) {
            setError('Failed to fetch user accounts.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only load users if the accounts tab is active
        if (activeTab === 'accounts') {
            loadUsers();
        }
    }, [activeTab]); // Re-run when the tab changes

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

    return (
        <Container fluid>
            <h2 className="mb-4">Account Management</h2>

            {/* --- NEW TABBED INTERFACE --- */}
            <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'accounts')} className="mb-3">
                <Nav.Item>
                    <Nav.Link eventKey="accounts">Accounts</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                    <Nav.Link eventKey="roles">Roles & Permissions</Nav.Link>
                </Nav.Item>
            </Nav>

            {/* --- TAB CONTENT --- */}
            {activeTab === 'accounts' && (
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
                                <Button onClick={() => { setCurrentUser(null); setShowFormModal(true); }}><PersonPlusFill className="me-2" /> Add New Account</Button>
                            </Col>
                        </Row>
                    </Card.Header>
                    <Card.Body>
                        {loading && <div className="text-center py-5"><Spinner animation="border" /></div>}
                        {error && <Alert variant="danger">{error}</Alert>}
                        {!loading && !error && (
                            <Table striped bordered hover responsive>
                                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created On</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {filteredUsers.length > 0 ? filteredUsers.map(user => (
                                        <tr key={user._id}>
                                            <td>{user.name}</td>
                                            <td>{user.email}</td>
                                            {/* UPDATED: Now reads role name from the nested object */}
                                            <td><Badge bg={user.role.name === 'Super Admin' ? 'danger' : 'secondary'}>{user.role.name}</Badge></td>
                                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <Button variant="outline-primary" size="sm" onClick={() => { setCurrentUser(user); setShowFormModal(true); }}><PencilSquare /></Button>{' '}
                                                <Button variant="outline-danger" size="sm" onClick={() => { setCurrentUser(user); setShowDeleteModal(true); }}><Trash/></Button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="text-center">No users found.</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                </Card>
            )}

            {activeTab === 'roles' && (
                <RolesManager />
            )}

            {showFormModal && <UserFormModal show={showFormModal} onHide={() => setShowFormModal(false)} onSave={() => { setShowFormModal(false); loadUsers(); }} userToEdit={currentUser} />}
            {showDeleteModal && currentUser && <DeleteConfirmationModal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} onConfirm={handleDeleteUser} userName={currentUser.name} />}
        </Container>
    );
}

export default Accounts;