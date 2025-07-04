import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Table,
  Nav,
  Button,
  Form,
} from "react-bootstrap";
import {
  CalendarFill,
  HourglassSplit,
  ArrowRepeat,
  BagCheckFill,
  BoxArrowUpRight
} from "react-bootstrap-icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import { RentalOrder } from "../../types";


// --- Data Interfaces ---
interface SalesDataPoint {
  name: string;
  sales: number;
}
interface DashboardStats {
  ToProcess?: number;
  ToPickup?: number;
  ToReturn?: number;
  Completed?: number;
  Returned?: number;
  Cancelled?: number;
}
interface DashboardData {
  stats: DashboardStats;
  monthlySales: number;
  toReturnOrders: RentalOrder[];
  overdueOrders: RentalOrder[];
  weeklySalesData: { _id: number; totalSales: number }[];
}

const API_URL = 'http://localhost:3001/api';

const formatWeeklySalesData = (data: { _id: number; totalSales: number }[]): SalesDataPoint[] => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // Create a map for quick lookups: { 1: sales, 2: sales, ... }
    const salesMap = new Map(data.map(item => [item._id, item.totalSales]));
    
    // Build the final array, ensuring all 7 days are present
    return days.map((day, index) => ({
        name: day,
        sales: salesMap.get(index + 1) || 0 // MongoDB dayOfWeek is 1-7 (Sun-Sat)
    }));
};

function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("toReturn");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for date pickers
  const [startDate, setStartDate] = useState(() => new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_URL}/dashboard-stats`);
        setDashboardData(response.data);
      } catch (err) {
        setError("Failed to load dashboard data. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleExport = () => {
    alert("Export functionality would be implemented here!");
  };

  const renderOrderTableRows = (orders: RentalOrder[]) => {
    if (orders.length === 0) {
      return <tr><td colSpan={4} className="text-center text-muted py-3">No orders found.</td></tr>;
    }
    return orders.map((order) => (
      <tr key={order._id} onClick={() => navigate(`/rentals/${order._id}`)} style={{ cursor: 'pointer' }}>
        <td>{order.customerInfo[0]?.name || 'N/A'}</td>
        <td>{new Date(order.rentalStartDate).toLocaleDateString()}</td>
        <td>{new Date(order.rentalEndDate).toLocaleDateString()}</td>
        <td>{order.customerInfo[0]?.phoneNumber || 'N/A'}</td>
      </tr>
    ));
  };

  if (loading) {
    return <Container className="text-center p-5"><Spinner animation="border" /></Container>;
  }

  if (error || !dashboardData) {
    return <Container><Alert variant="danger">{error || 'Could not load data.'}</Alert></Container>;
  }

  const { stats, monthlySales, toReturnOrders, overdueOrders, weeklySalesData } = dashboardData;

  const chartData = formatWeeklySalesData(weeklySalesData);

  return (
    <div className="d-flex flex-column justify-content-between gap-3">
      <p className="m-0 fw-semibold fs-2 text-start">Dashboard</p>

      {/* --- Top Row: Summary Cards --- */}
      <Row>
        <Col md={3} sm={6} className="mb-3"><Card className="shadow-sm h-100"><Card.Body className="d-flex align-items-center border-start border-primary border-5 rounded bg-white"><div className="text-start pe-3 py-2"><p className="text-secondary mb-1 fw-bold">SALES (MONTHLY)</p><h4 className="fw-bold mb-0">₱{monthlySales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h4></div><CalendarFill size={40} className="ms-auto text-light" /></Card.Body></Card></Col>
        <Col md={3} sm={6} className="mb-3"><Card className="shadow-sm h-100"><Card.Body className="d-flex align-items-center border-start border-primary border-5 rounded bg-white"><div className="text-start pe-3 py-2"><p className="text-secondary mb-1 fw-bold">TO PROCESS</p><h4 className="fw-bold mb-0">{stats.ToProcess || 0}</h4></div><HourglassSplit size={40} className="ms-auto text-light" /></Card.Body></Card></Col>
        <Col md={3} sm={6} className="mb-3"><Card className="shadow-sm h-100"><Card.Body className="d-flex align-items-center border-start border-primary border-5 rounded bg-white"><div className="text-start pe-3 py-2"><p className="text-secondary mb-1 fw-bold">TO RETURN</p><h4 className="fw-bold mb-0">{stats.ToReturn || 0}</h4></div><ArrowRepeat size={40} className="ms-auto text-light" /></Card.Body></Card></Col>
        <Col md={3} sm={6} className="mb-3"><Card className="shadow-sm h-100"><Card.Body className="d-flex align-items-center border-start border-primary border-5 rounded bg-white"><div className="text-start pe-3 py-2"><p className="text-secondary mb-1 fw-bold">COMPLETED ORDERS</p><h4 className="fw-bold mb-0">{(stats.Completed || 0) + (stats.Returned || 0)}</h4></div><BagCheckFill size={40} className="ms-auto text-light" /></Card.Body></Card></Col>
      </Row>

      {/* --- Middle Row: Sales Chart & To Return/Overdue Table --- */}
      <Row>
        <Col lg={7} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white py-3">
                <div className="d-flex flex-wrap justify-content-between align-items-center">
                    <h5 className="mb-2 mb-md-0 fw-bold">Sales Visualization</h5>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <Button variant="outline-secondary" size="sm" onClick={handleExport}>
                            <BoxArrowUpRight className="me-1" /> Export
                        </Button>
                        <Form.Control
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="form-control-sm"
                            style={{ width: "auto" }}
                        />
                        <span className="text-muted">→</span>
                        <Form.Control
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="form-control-sm"
                            style={{ width: "auto" }}
                        />
                    </div>
                </div>
            </Card.Header>
            <Card.Body className="d-flex justify-content-center align-items-center">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `₱${(value / 1000)}k`} />
                  <Tooltip formatter={(value: number) => `₱${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#AE0C00" strokeWidth={2} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Header className="p-0 border-bottom-0">
                <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'toReturn')}>
                  <Nav.Item><Nav.Link eventKey="toReturn">To Return ({toReturnOrders.length})</Nav.Link></Nav.Item>
                  <Nav.Item><Nav.Link eventKey="overdue">Overdue ({overdueOrders.length})</Nav.Link></Nav.Item>
                </Nav>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0 dashboard-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Start</th>
                      <th>Return</th>
                      <th>Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === "toReturn" ? renderOrderTableRows(toReturnOrders) : renderOrderTableRows(overdueOrders)}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;