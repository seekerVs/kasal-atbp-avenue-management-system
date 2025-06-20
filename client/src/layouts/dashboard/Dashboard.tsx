import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Table,
  Nav,
  InputGroup,
  Stack,
} from "react-bootstrap";
import {
  CalendarFill,
  HourglassSplit,
  ArrowRepeat,
  BagCheckFill,
  BoxArrowUpRight,
  CalendarDate,
} from "react-bootstrap-icons";
import "./dashboard.css";

// --- Import Recharts Components ---
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
import CustomFooter from "../../components/customFooter/CustomFooter";

// --- Data Interfaces (Optional but Recommended for Type Safety) ---
interface Order {
  customerName: string;
  orderDate: string;
  returnDate: string;
  phoneNumber: string;
}

// --- Sample Data (Replace with real data from your backend) ---
const salesMonthly = "105,575";
const toProcessCount = 10;
const toReturnCount = 2;
const completedOrdersCount = 764;

const toReturnOrders: Order[] = [
  {
    customerName: "Jean A. Doe",
    orderDate: "04/29/2025",
    returnDate: "05/03/2025",
    phoneNumber: "09342769835",
  },
  {
    customerName: "John A. Doe",
    orderDate: "04/30/2025",
    returnDate: "05/04/2025",
    phoneNumber: "09903426712",
  },
  // Add more sample data if needed
];

const overdueOrders: Order[] = [
  // Add sample overdue orders here
];

// --- Sample Data for Sales Visualization Chart (Matching your image) ---
interface SalesDataPoint {
  name: string; // e.g., 'Monday'
  sales: number; // The sales value for that day
}

const salesChartData: SalesDataPoint[] = [
  { name: "Monday", sales: 2700 },
  { name: "Tuesday", sales: 2900 },
  { name: "Wednesday", sales: 3450 },
  { name: "Thursday", sales: 2600 },
  { name: "Friday", sales: 1800 },
  { name: "Saturday", sales: 0 }, // Assuming 0 if no sales, adjust as needed
  { name: "Sunday", sales: 0 }, // Assuming 0 if no sales, adjust as needed
];

// --- Dashboard Component ---
function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>("toReturn");
  const [startDate, setStartDate] = useState<string>("2021-10-30");
  const [endDate, setEndDate] = useState<string>("2021-12-06");

  const handleExport = () => {
    alert("Export functionality would be implemented here!");
  };

  return (
    <div className="d-flex flex-column justify-content-between gap-3 px-4 px-lg-5 pt-3">
      <p className="m-0 fw-semibold fs-2 text-start">Dashboard</p>

      {/* --- Top Row: Summary Cards --- */}
      <Row>
        {/* Card 1: Sales (Monthly) */}
        <Col md={3} sm={6} className="mb-3">
          <Card className="shadow-sm h-100 ">
            <Card.Body className="d-flex align-items-center border-start border-primary border-5 rounded bg-white">
              <div className="text-start pe-3 py-2">
                <p className="text-secondary mb-1 fw-bold">SALES (MONTHLY)</p>
                <h4 className="fw-bold mb-0">₱{salesMonthly}</h4>
              </div>
              <CalendarFill
                size={40}
                className="ms-auto text-light"
              />
            </Card.Body>
          </Card>
        </Col>

        {/* Card 2: To Process */}
        <Col md={3} sm={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex align-items-center border-start border-primary border-5 rounded bg-white">
              <div className="text-start pe-3 py-2">
                <p className="text-secondary mb-1 fw-bold">TO PROCESS</p>
                <h4 className="fw-bold mb-0">{toProcessCount}</h4>
              </div>
              <HourglassSplit
                size={40}
                className="ms-auto text-light"
              />
            </Card.Body>
          </Card>
        </Col>

        {/* Card 3: To Return */}
        <Col md={3} sm={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex align-items-center border-start border-primary border-5 rounded bg-white">
              <div className="text-start pe-3 py-2">
                <p className="text-secondary mb-1 fw-bold">TO RETURN</p>
                <h4 className="fw-bold mb-0">{toReturnCount}</h4>
              </div>
              <ArrowRepeat
                size={40}
                className="ms-auto text-light"
              />
            </Card.Body>
          </Card>
        </Col>

        {/* Card 4: Completed Orders */}
        <Col md={3} sm={6} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex align-items-center border-start border-primary border-5 rounded bg-white">
              <div className="text-start pe-3 py-2">
                <p className="text-secondary mb-1 fw-bold">COMPLETED ORDERS</p>
                <h4 className="fw-bold mb-0">{completedOrdersCount}</h4>
              </div>
              <BagCheckFill
                size={40}
                className="ms-auto text-light"
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* --- Middle Row: Sales Visualization (Chart) & To Return/Overdue (Table) --- */}
      <Row>
        {/* Sales Visualization (Chart) */}
        <Col md={7}>
          <Card className="shadow-sm h-100">
            <Card.Header className="d-flex flex-wrap justify-content-between align-items-center bg-white py-3">
              <h5 className="mb-0 fw-bold mb-2">Sales Visualization</h5>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleExport}
                >
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
                <InputGroup
                  size="sm"
                  className="flex-nowrap"
                  style={{ width: "auto" }}
                >
                  <Form.Control
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="form-control-sm"
                  />
                </InputGroup>
              </div>
            </Card.Header>
            <Card.Body className="d-flex justify-content-center align-items-center">
              {/* Recharts Line Chart Implementation */}
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={salesChartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#dc3545"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* To Return / Overdue Table */}
        <Col md={5}>
          <Card className="shadow-sm h-100">
            <Card.Body className="p-0">
              <div className="bg-white p-0 border-bottom-0 rounded-top">
                <Nav variant="tabs" defaultActiveKey="toReturn">
                  <Nav.Item>
                    <Nav.Link
                      eventKey="toReturn"
                      onClick={() => setActiveTab("toReturn")}
                    >
                      To Return
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      eventKey="overdue"
                      onClick={() => setActiveTab("overdue")}
                    >
                      Overdue
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </div>
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead>
                    <tr>
                      <th className="text-nowrap">Customer Name</th>
                      <th className="text-nowrap">Order Date</th>
                      <th className="text-nowrap">Return Date</th>
                      <th className="text-nowrap">Phone Number</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab === "toReturn" ? (
                      toReturnOrders.length > 0 ? (
                        toReturnOrders.map((order, index) => (
                          <tr key={index}>
                            <td>{order.customerName}</td>
                            <td>{order.orderDate}</td>
                            <td>{order.returnDate}</td>
                            <td>{order.phoneNumber}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-center text-muted py-3"
                          >
                            No items to return.
                          </td>
                        </tr>
                      )
                    ) : overdueOrders.length > 0 ? (
                      overdueOrders.map((order, index) => (
                        <tr key={index} className="text-danger">
                          <td>{order.customerName}</td>
                          <td>{order.orderDate}</td>
                          <td>{order.returnDate}</td>
                          <td>{order.phoneNumber}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-3">
                          No overdue items.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <footer className="text-dark py-3">
        <CustomFooter />
      </footer>
    </div>
  );
}

export default Dashboard;
