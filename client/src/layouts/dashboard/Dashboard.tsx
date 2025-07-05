import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Table,
  Button,
  Form,
  OverlayTrigger,
  Badge,
  Tooltip,
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
  Tooltip as RechartsTooltip,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  ReferenceLine,
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
  toReturnOrders: DashboardRentalOrder[];
  overdueOrders: DashboardRentalOrder[];
  weeklySalesData: { _id: string; totalSales: number }[];
}

interface DashboardRentalOrder extends RentalOrder {
  itemCount: number; // The new field from our backend
}

const API_URL = 'http://localhost:3001/api';

const formatSalesDataForChart = (
    apiData: { _id: string; totalSales: number }[],
    startDateStr: string,
    endDateStr: string
): SalesDataPoint[] => {
    const salesMap = new Map(apiData.map(item => [item._id, item.totalSales]));
    const result: SalesDataPoint[] = [];
    
    let currentDate = new Date(startDateStr + 'T00:00:00'); // Ensure UTC context
    const endDate = new Date(endDateStr + 'T00:00:00');

    // Loop through every day in the selected date range
    while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
        
        result.push({
            // Format the label for the X-axis
            name: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sales: salesMap.get(dateString) || 0, // Get sales for this day, or 0 if none
        });
        
        currentDate.setDate(currentDate.getDate() + 1); // Move to the next day
    }
    return result;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip bg-white border rounded shadow-sm p-2">
        <p className="label fw-bold mb-1">{`${label}`}</p>
        <p className="intro text-danger mb-0">
          {`Sales: ₱${payload[0].value.toLocaleString()}`}
        </p>
      </div>
    );
  }
  return null;
};

const dynamicYAxisFormatter = (value: number): string => {
    if (value >= 1000000) {
        return `₱${(value / 1000000).toFixed(1)}M`; // Format as millions
    }
    if (value >= 1000) {
        return `₱${(value / 1000).toFixed(0)}k`; // Format as thousands
    }
    return `₱${value}`; // Format as a plain number
};

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState(false); 

  // State for date pickers
  const [startDate, setStartDate] = useState(() => new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const isInitialLoad = !dashboardData;
      // Use the main loader only on the first load
      if (isInitialLoad) setLoading(true); 
      // Use the chart-specific loader for subsequent date changes
      else setChartLoading(true);
      
      setError(null);
      try {
        // Pass the dates as query parameters to the API
        const response = await axios.get(`${API_URL}/dashboard/stats`, {
          params: { startDate, endDate }
        });
        setDashboardData(response.data);
      } catch (err) {
        setError("Failed to load dashboard data.");
        console.error(err);
      } finally {
        if (isInitialLoad) setLoading(false);
        setChartLoading(false);
      }
    };
    fetchDashboardData();
  }, [startDate, endDate]);

  const allUpcomingAndOverdue = [
    ...(dashboardData?.overdueOrders || []),
    ...(dashboardData?.toReturnOrders || [])
  ];

  const handleExport = () => {
    alert("Export functionality would be implemented here!");
  };

  const renderOrderTableRows = (orders: DashboardRentalOrder[]) => {
    if (orders.length === 0) {
      return <tr><td colSpan={5} className="text-center text-muted py-3">No pending returns.</td></tr>;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date

    return orders.map((order) => {
        const returnDate = new Date(order.rentalEndDate);
        const isOverdue = returnDate < today;

        const timeDiff = Math.abs(today.getTime() - returnDate.getTime());
        const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        let statusElement;
        if (isOverdue) {
            statusElement = <Badge bg="danger">{dayDiff} {dayDiff === 1 ? 'day' : 'days'} overdue</Badge>;
        } else if (dayDiff === 0) {
            statusElement = <Badge bg="warning">Due today</Badge>;
        } else {
            statusElement = <span>Due in {dayDiff} {dayDiff === 1 ? 'day' : 'days'}</span>;
        }

        return (
            <tr key={order._id} onClick={() => navigate(`/rentals/${order._id}`)} 
                className={isOverdue ? 'table-danger' : ''} 
                style={{ cursor: 'pointer' }}
            >
                <td>
                    <OverlayTrigger
                        placement="top"
                        overlay={<Tooltip id={`tooltip-${order._id}`}>ID: {order._id}</Tooltip>}
                    >
                        <span>{order.customerInfo[0]?.name || 'N/A'}</span>
                    </OverlayTrigger>
                </td>
                <td className="text-center">{order.itemCount}</td>
                <td>{statusElement}</td>
                <td>
                    <a href={`tel:${order.customerInfo[0]?.phoneNumber}`} onClick={(e) => e.stopPropagation()}>
                        {order.customerInfo[0]?.phoneNumber || 'N/A'}
                    </a>
                </td>
            </tr>
        );
    });
  };

  if (loading) {
    return <Container className="text-center p-5"><Spinner animation="border" /></Container>;
  }

  if (error || !dashboardData) {
    return <Container><Alert variant="danger">{error || 'Could not load data.'}</Alert></Container>;
  }
  

  const { stats, monthlySales, weeklySalesData } = dashboardData;
  const chartData = dashboardData ? formatSalesDataForChart(weeklySalesData, startDate, endDate) : [];

  const averageSales = chartData.length > 0 ? chartData.reduce((sum, entry) => sum + entry.sales, 0) / chartData.length : 0;

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
            <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '320px' }}>
              {/* Use the new chart-specific loader */}
              {chartLoading ? <Spinner animation="border" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    {/* 1. Define the gradient for the area chart */}
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#AE0C00" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#AE0C00" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={dynamicYAxisFormatter} allowDecimals={false} />
                    
                    {/* 2. Use the custom tooltip component */}
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(174, 12, 0, 0.1)' }}/>
                    
                    {/* 3. Add the reference line for the average */}
                    {averageSales > 0 && <ReferenceLine y={averageSales} label={{ value: 'Avg', position: 'insideTopLeft' }} stroke="grey" strokeDasharray="4 4" />}
                    
                    {/* 4. The Area component creates the gradient fill */}
                    <Area type="monotone" dataKey="sales" stroke="none" fill="url(#salesGradient)" />
                    
                    {/* 5. The Line component now has dots. Legend is removed. */}
                    <Line type="monotone" dataKey="sales" stroke="#AE0C00" strokeWidth={2} activeDot={{ r: 8 }} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5} className="mb-3">
          <Card className="shadow-sm h-100">
            {/* --- NEW: Simplified Header for the single tab --- */}
            <Card.Header>
                <h5 className="mb-0 fw-bold">Upcoming & Overdue Returns</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0 dashboard-table">
                  {/* --- NEW: Updated Table Headers --- */}
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th className="text-center">Items</th>
                      <th>Status</th>
                      <th>Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Render the single combined and sorted list */}
                    {renderOrderTableRows(allUpcomingAndOverdue)}
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