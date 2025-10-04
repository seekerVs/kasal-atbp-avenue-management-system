import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Spinner, Alert, Breadcrumb, Card, Badge, Button, ListGroup, Modal } from 'react-bootstrap';
import { format, isFuture, startOfDay } from 'date-fns'; // <-- Import isFuture and startOfDay

import { Appointment, CustomerInfo, PackageReservation, Reservation } from '../../types';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { ReservationItemsList } from '../../components/reservationItemsList/ReservationItemsList';
import { PersonFill, CalendarEvent, CheckCircleFill, CashCoin, ExclamationTriangleFill, XCircleFill,PencilSquare, Image as ImageIcon, CalendarWeek } from 'react-bootstrap-icons';
import { formatCurrency } from '../../utils/formatters';
import { LinkedAppointmentsList } from '../../components/linkedAppointmentsList/LinkedAppointmentsList';
import { calculateItemDeposit, calculatePackageDeposit } from '../../utils/financials';
import { ReservedPackageDetailsModal } from '../../components/modals/reservedPackageDetailsModal/ReservedPackageDetailsModal';
import { EditCustomerInfoModal } from '../../components/modals/editCustomerInfoModal/EditCustomerInfoModal';
import { CancellationReasonModal } from '../../components/modals/cancellationReasonModal/CancellationReasonModal';
import { RescheduleReservationModal } from '../../components/modals/rescheduleReservationModal/RescheduleReservationModal';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';

function ReservationViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addAlert } = useAlert();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [linkedAppointments, setLinkedAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDateWarningModal, setShowDateWarningModal] = useState(false);
  const [showPackageDetailsModal, setShowPackageDetailsModal] = useState(false);
  const [selectedPackageForModal, setSelectedPackageForModal] = useState<PackageReservation | null>(null);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchFullReservationDetails = async () => {
      setLoading(true);
      setError(null);
      setLinkedAppointments([]);

      try {
        const res = await api.get(`/reservations/${id}`);
        const fetchedReservation: Reservation = res.data;
        setReservation(fetchedReservation);

        const appointmentIds = (fetchedReservation.packageReservations || [])
          .flatMap(pkg => pkg.fulfillmentPreview)
          .map(fulfillment => fulfillment.linkedAppointmentId)
          .filter((id): id is string => !!id);

        if (appointmentIds.length > 0) {
          const appointmentPromises = appointmentIds.map(aptId => api.get(`/appointments/${aptId}`));
          const appointmentResponses = await Promise.all(appointmentPromises);
          const appointments = appointmentResponses.map(response => response.data);
          setLinkedAppointments(appointments);
        }

      } catch (err) {
        setError("Failed to load reservation details.");
      } finally {
        setLoading(false);
      }
    };
    fetchFullReservationDetails();
  }, [id]);

  const handleSaveCustomerInfo = async (updatedCustomer: CustomerInfo) => {
    if (!reservation) return;

    // We don't need setIsSaving here as the modal doesn't show a spinner
    try {
      const response = await api.put(`/reservations/${reservation._id}/customer`, updatedCustomer);
      setReservation(response.data); // Update the main reservation state with the response
      addAlert('Customer details updated successfully!', 'success');
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to update customer info.', 'danger');
    }
  };

  const handleViewPackageDetails = (pkg: PackageReservation) => {
    setSelectedPackageForModal(pkg);
    setShowPackageDetailsModal(true);
  };

  const handleConfirmReservation = async () => {
    if (!reservation) return;
    setIsSaving(true);
    try {
      const response = await api.put(`/reservations/${reservation._id}/confirm`);
      setReservation(response.data);
      addAlert('Reservation has been confirmed!', 'success');
    } catch (err: any) {
      addAlert(err.response?.data?.message || "Failed to confirm reservation.", 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmCancellation = async (reason: string) => {
    if (!reservation) return;
    
    // The modal is now responsible for showing alerts if the reason is empty.
    
    setShowCancelModal(false); // Close the modal
    setIsSaving(true);
    try {
      // Call the updated backend route with the reason
      const response = await api.put(`/reservations/${reservation._id}/cancel`, {
        reason: reason
      });
      setReservation(response.data);
      addAlert('Reservation has been successfully cancelled.', 'success');
    } catch (err: any) {
      addAlert(err.response?.data?.message || "Failed to cancel reservation.", 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmReschedule = async (newDate: Date) => {
    if (!reservation) {
        throw new Error("Reservation data is missing.");
    }
    // The onConfirm prop in the modal expects a Promise, so we make this async
    const response = await api.put(`/reservations/${reservation._id}/reschedule`, {
      newDate: format(newDate, 'yyyy-MM-dd')
    });
    setReservation(response.data); // Update the state with the final data
    addAlert('Reservation has been successfully rescheduled!', 'success');
    // The modal will handle closing itself
  };

  // --- 2. RENAME THE ORIGINAL FUNCTION ---
  // This function now only contains the API call logic.
  const executeCreateRental = async () => {
    if (!reservation) return;
    setIsSaving(true);
    try {
      const response = await api.post('/rentals/from-reservation', {
        reservationId: reservation._id
      });
      const newRental = response.data;

      addAlert(`Successfully created Rental ID: ${newRental._id}`, 'success');
      setReservation(prev => prev ? { ...prev, status: 'Completed', rentalId: newRental._id } : null);

      setTimeout(() => {
        navigate(`/rentals/${newRental._id}`);
      }, 2000);

    } catch (err: any) {
      addAlert(err.response?.data?.message || "Failed to create rental from reservation.", 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  // --- 3. CREATE THE NEW INTERMEDIARY FUNCTION ---
  const handleCreateRental = () => {
    if (!reservation) return;

    // Use date-fns' `isFuture` which is cleaner than comparing dates manually.
    // `startOfDay` ensures we only compare the date part, not the time.
    if (isFuture(startOfDay(new Date(reservation.reserveDate)))) {
      // If the date is in the future, show the warning modal.
      setShowDateWarningModal(true);
    } else {
      // Otherwise, proceed directly to creating the rental.
      executeCreateRental();
    }
  };

  const getStatusBadgeVariant = (status: Reservation['status']): BadgeVariant => {
    switch (status) {
      case 'Pending': return 'primary';
      case 'Confirmed': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };
  
  if (loading) {
    return <Container className="text-center py-5"><Spinner /></Container>;
  }
  if (error) {
    return <Container><Alert variant="danger">{error}</Alert></Container>;
  }
  if (!reservation) {
    return <Container><Alert variant="info">Reservation data not found.</Alert></Container>;
  }

  const subtotal = (
    (reservation.itemReservations || []).reduce((sum, item) => sum + item.price * item.quantity, 0) +
    (reservation.packageReservations || []).reduce((sum, pkg) => sum + pkg.price, 0)
  );
  const requiredDeposit = (
    (reservation.itemReservations || []).reduce((sum, item) => sum + calculateItemDeposit(item), 0) +
    (reservation.packageReservations || []).length * calculatePackageDeposit()
  );
  const grandTotal = subtotal + requiredDeposit;
  const payments = reservation.financials?.payments || [];
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = grandTotal - totalPaid;

  const canBeConfirmed = reservation.status === 'Pending';
  const canBeConverted = reservation.status === 'Confirmed';
  const canBeCancelled = reservation.status === 'Pending' || reservation.status === 'Confirmed';
  const canBeRescheduled = reservation.status === 'Pending' || reservation.status === 'Confirmed';
  const canEditCustomerInfo = reservation.status === 'Pending' || reservation.status === 'Confirmed';

  return (
    <>
      <Container fluid>
        <Breadcrumb>
          <Breadcrumb.Item onClick={() => navigate('/manage-reservations')}>Reservations Manager</Breadcrumb.Item>
          <Breadcrumb.Item active>View Reservation</Breadcrumb.Item>
        </Breadcrumb>
        
        <Row className="g-4">
          <Col lg={7} className='lh-sm'>
            <ReservationItemsList items={reservation.itemReservations} packages={reservation.packageReservations} onViewPackage={handleViewPackageDetails}/>
            {linkedAppointments.length > 0 && (
              <LinkedAppointmentsList 
                appointments={linkedAppointments} 
                reservation={reservation}
              />
            )}
          </Col>

          <Col lg={5}>
            <Card className="shadow-sm">
              <Card.Header className="d-flex justify-content-between align-items-center lh-sm">
                <div>
                  <p className="fw-semibold mb-0">ID: {reservation._id}</p>
                  <small className="text-muted mb-0">
                    Created: {format(new Date(reservation.createdAt), 'MMM dd, yyyy, h:mm a')}
                  </small>
                </div>
                <Badge bg={getStatusBadgeVariant(reservation.status)} pill>{reservation.status}</Badge>
              </Card.Header>
              <Card.Body className='lh-sm'>
                <div className="small">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h5 className="mb-0"><PersonFill className="me-2 text-muted"/>Customer Info</h5>
                    {canEditCustomerInfo && (
                      <Button variant="outline-secondary" size="sm" onClick={() => setShowEditCustomerModal(true)}>
                        <PencilSquare className="me-1" /> Edit
                      </Button>
                    )}
                  </div>
                  <div className=''>
                    <p className="mb-1"><span className='fw-semibold'>Name: </span>{reservation.customerInfo.name}</p>
                    <p className="mb-1"><span className='fw-semibold'>Contact: </span> {reservation.customerInfo.phoneNumber}</p>
                    <p className="mb-1"><span className='fw-semibold'>Email: </span> {reservation.customerInfo.email || 'N/A'}</p>
                    <p className="mb-3"><span className='fw-semibold'>Address: </span>
                      {`${reservation.customerInfo.address.street}, ${reservation.customerInfo.address.barangay}, ${reservation.customerInfo.address.city}, ${reservation.customerInfo.address.province}`}
                    </p>
                  </div>
                </div>
                
                <hr className="my-1"/>
                <p className="mb-1"><CalendarEvent className="me-2"/><span className='fw-medium'>Reservation Date
                  </span></p>
                <p className='my-1 small'>{format(new Date(reservation.reserveDate), 'MMMM dd, yyyy')}</p>
                
                <hr className="my-2"/>
                <div className="mb-3">
                  <p className="mb-1 fw-bold"><CashCoin className="me-2"/><span className='fw-medium'>Payment Details</span></p>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between px-0 py-1 border-0 small"><span className="text-muted">Subtotal</span><span>{formatCurrency(subtotal)}</span></ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between px-0 py-1 border-0 small"><span className="text-muted">Required Deposit</span><span>{formatCurrency(requiredDeposit)}</span></ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between px-0 py-1 border-0 small fw-bold"><span>Grand Total</span><span>{formatCurrency(grandTotal)}</span></ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between px-0 py-1 border-0 text-success small fw-bold"><span>Amount Paid</span><span>{formatCurrency(totalPaid)}</span></ListGroup.Item>
                    {payments.length > 0 && payments.map((payment, index) => (
                      <div key={index} className="px-0 pt-0 mb-1">
                        {payment.referenceNumber && (
                          <div className="d-flex justify-content-between small text-muted fst-italic">
                              <span>GCash Ref #:</span>
                              <span>{payment.referenceNumber}</span>
                          </div>
                        )}
                        {payment.receiptImageUrl && (
                          <div className="d-flex justify-content-between small mt-1">
                              <span className="text-muted"><ImageIcon className="me-1"/> Proof of Payment:</span>
                              <a href={payment.receiptImageUrl} target="_blank" rel="noopener noreferrer">
                                View Receipt
                              </a>
                          </div>
                        )}
                      </div>
                    ))}
                    
                  </ListGroup>

                  {remainingBalance > 0 && (
                      <ListGroup.Item className="d-flex justify-content-between pt-2  border-top text-danger fw-bold">
                        <span>Remaining Balance</span>
                        <span>{formatCurrency(remainingBalance)}</span>
                      </ListGroup.Item>
                    )}
                </div>
                
                <div className="d-grid gap-2 mt-2">
                  {canBeConfirmed && (
                    <Button variant="info" onClick={handleConfirmReservation} disabled={isSaving}>
                      {isSaving ? <Spinner as="span" size="sm" /> : <><CheckCircleFill className="me-2"/>Confirm Reservation</>}
                    </Button>
                  )}

                  {canBeConverted && (
                    // --- 4. THE BUTTON NOW CALLS THE NEW HANDLER ---
                    <Button variant="danger" onClick={handleCreateRental} disabled={isSaving}>
                      {isSaving ? <Spinner as="span" size="sm" /> : 'Create Rental'}
                    </Button>
                  )}

                  {canBeRescheduled && (
                    <Button variant="secondary" onClick={() => setShowRescheduleModal(true)} disabled={isSaving}>
                      <CalendarWeek className="me-2"/>Reschedule
                    </Button>
                  )}

                  {canBeCancelled && (
                    <Button variant="outline-danger" onClick={() => setShowCancelModal(true)} disabled={isSaving}>
                      <XCircleFill className="me-2"/>Cancel Reservation
                    </Button>
                  )}

                  {reservation.status === 'Completed' && reservation.rentalId && (
                      <Alert variant="success" className="mt-0 text-center">
                          <p className="mb-1 fw-bold">Reservation Completed</p>
                          <Button variant="link" size="sm" onClick={() => navigate(`/rentals/${reservation.rentalId}`)}>
                              View Rental: {reservation.rentalId}
                          </Button>
                      </Alert>
                  )}

                  {reservation.status === 'Cancelled' && (
                    <Alert variant="danger" className="mt-0 text-center">
                        <p className="fw-bold mb-1">Reservation Cancelled</p>
                        {reservation.cancellationReason && (
                          <p className="small mb-0 fst-italic">
                            Reason: "{reservation.cancellationReason}"
                          </p>
                        )}
                    </Alert>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <RescheduleReservationModal
        show={showRescheduleModal}
        onHide={() => setShowRescheduleModal(false)}
        onConfirm={handleConfirmReschedule}
        reservation={reservation}
      />

      <EditCustomerInfoModal 
        show={showEditCustomerModal}
        onHide={() => setShowEditCustomerModal(false)}
        customer={reservation.customerInfo}
        onSave={handleSaveCustomerInfo}
      />

      <ReservedPackageDetailsModal
        show={showPackageDetailsModal}
        onHide={() => setShowPackageDetailsModal(false)}
        packageReservation={selectedPackageForModal}
      />
      
      <CancellationReasonModal
        show={showCancelModal}
        onHide={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancellation}
        title="Confirm Reservation Cancellation"
        itemType="reservation"
        itemId={reservation._id}
      />

      {/* --- 5. ADD THE NEW DATE WARNING MODAL --- */}
      <Modal show={showDateWarningModal} onHide={() => setShowDateWarningModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <ExclamationTriangleFill className="me-2 text-warning" />
            Future Reservation Date
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          The reservation date is set for <strong>{format(new Date(reservation.reserveDate), 'MMMM dd, yyyy')}</strong>, which is in the future.
          <br /><br />
          Are you sure you want to create the rental record now?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDateWarningModal(false)}>
            No
          </Button>
          <Button variant="danger" onClick={() => {
            setShowDateWarningModal(false);
            executeCreateRental(); // Proceed with the action
          }}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default ReservationViewer;