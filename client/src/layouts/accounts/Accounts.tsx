import React, { useState, useEffect, useMemo } from 'react';
import {
    Container, Row, Col, Button, Card, Table, InputGroup, Form,
    Spinner, Alert, Badge,
    Modal
} from 'react-bootstrap';
import { PersonPlusFill, Person, PencilSquare, Trash, Search } from 'react-bootstrap-icons';
import { User } from '../../types';
import { fetchUsers, deleteUser } from '../../api/apiService';
import UserFormModal from '../../components/modals/userFormModal/UserFormModal';
import { useNotification } from '../../contexts/NotificationContext';

// Simple confirmation modal for reusability
const DeleteConfirmationModal = ({ show, onHide, onConfirm, userName }: { show: boolean, onHide: () => void, onConfirm: () => void, userName: string }) => (
    <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
            <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            Are you sure you want to delete the user: <strong>{userName}</strong>? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={onHide}>Cancel</Button>
            <Button variant="danger" onClick={onConfirm}>Delete</Button>
        </Modal.Footer>
    </Modal>
);


function Accounts() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const { addNotification } = useNotification();

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await fetchUsers();
            setUsers(data);
        } catch (err) {
            setError('Failed to fetch users.');
            addNotification('Error fetching users', 'danger');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleOpenFormModal = (user: User | null) => {
        setCurrentUser(user);
        setShowFormModal(true);
    };

    const handleOpenDeleteModal = (user: User) => {
        setCurrentUser(user);
        setShowDeleteModal(true);
    };

    const handleDeleteUser = async () => {
        if (!currentUser) return;
        try {
            await deleteUser(currentUser._id);
            addNotification(`User '${currentUser.name}' deleted successfully.`, 'success');
            setShowDeleteModal(false);
            setCurrentUser(null);
            loadUsers(); // Refresh the list
        } catch (err) {
            addNotification('Failed to delete user.', 'danger');
            setError('Failed to delete user.');
        }
    };

    const filteredUsers = useMemo(() =>
        users.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        ), [users, searchTerm]);

    const renderContent = () => {
        if (loading) {
            return <div className="text-center py-5"><Spinner animation="border" /></div>;
        }
        if (error) {
            return <Alert variant="danger">{error}</Alert>;
        }
        return (
            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined On</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.map(user => (
                        <tr key={user._id}>
                            <td><strong>{user.name}</strong></td>
                            <td>{user.email}</td>
                            <td>
                                <Badge bg={user.role === 'Admin' ? 'primary' : 'secondary'}>{user.role}</Badge>
                            </td>
                            <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td>
                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleOpenFormModal(user)}>
                                    <PencilSquare />
                                </Button>
                                <Button variant="outline-danger" size="sm" onClick={() => handleOpenDeleteModal(user)}>
                                    <Trash />
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        );
    };

    return (
        <Container fluid>
            <h2 className="mb-4">Account Management</h2>
            <Card>
                <Card.Header>
                    <Row className="align-items-center g-3">
                        <Col md={4}><div className="d-flex align-items-center"><Person size={24} className="me-2" /><h5 className="mb-0">All Users</h5></div></Col>
                        <Col md={5}>
                            <InputGroup>
                                <InputGroup.Text><Search /></InputGroup.Text>
                                <Form.Control type="search" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </InputGroup>
                        </Col>
                        <Col md={3} className="text-end">
                            <Button variant="primary" onClick={() => handleOpenFormModal(null)}>
                                <PersonPlusFill className="me-2" />Add New User
                            </Button>
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body>
                    {renderContent()}
                </Card.Body>
            </Card>

            {showFormModal && (
                <UserFormModal
                    show={showFormModal}
                    onHide={() => setShowFormModal(false)}
                    onSave={() => {
                        setShowFormModal(false);
                        loadUsers(); // Refresh the user list after saving
                    }}
                    userToEdit={currentUser}
                />
            )}

            {showDeleteModal && currentUser && (
                <DeleteConfirmationModal
                    show={showDeleteModal}
                    onHide={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteUser}
                    userName={currentUser.name}
                />
            )}
        </Container>
    );
}

export default Accounts;