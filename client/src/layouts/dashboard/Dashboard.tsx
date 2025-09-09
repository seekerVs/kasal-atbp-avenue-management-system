import React, { useState, useEffect, useMemo } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Table,
  Button,
  OverlayTrigger,
  Badge,
  Tooltip,
} from "react-bootstrap";
import {
  CalendarFill,
  HourglassSplit,
  ArrowRepeat,
  BoxArrowUpRight,
  CaretDownFill,
  CaretUpFill,
  JournalCheck,
  CalendarHeart,
} from "react-bootstrap-icons";
import {
  XAxis,
  Tooltip as RechartsTooltip,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Bar,
  BarChart,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { subDays, format as formatDate } from 'date-fns';

import "./dashboard.css";
import { RentalOrder } from "../../types";
import api from "../../services/api";
import { AdvancedDateRangePicker } from "../../components/advancedDateRangePicker/AdvancedDateRangePicker";
import CustomButton1 from "../../components/customButton1/CustomButton1";
import OutfitRecommendationModal from "../../components/modals/outfitRecommendationModal/OutfitRecommendationModal";

// --- Data Interfaces ---
interface SalesDataPoint {
  name: string;
  sales: number;
}
interface DashboardStats {
  Pending?: number; // Renamed from ToProcess
  ToReturn?: number;
  pendingReservations?: number;
  pendingAppointments?: number;
}
interface DashboardData {
  stats: DashboardStats;
  monthlySales: number;
  toReturnOrders: DashboardRentalOrder[];
  overdueOrders: DashboardRentalOrder[];
  weeklySalesData: { _id: string; totalSales: number }[];
}

interface DashboardRentalOrder extends RentalOrder {
  itemCount: number;
}

const formatSalesDataForChart = (
    apiData: { _id: string; totalSales: number }[],
    startDate: Date,
    endDate: Date
): SalesDataPoint[] => {
    const salesMap = new Map(apiData.map(item => [item._id, item.totalSales]));
    const result: SalesDataPoint[] = [];
    
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
        // Create the date string from LOCAL year, month, and day to avoid timezone shifts.
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        result.push({
            name: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sales: salesMap.get(dateString) || 0, // Now this key will be correct
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
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
        return `₱${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `₱${(value / 1000).toFixed(0)}k`;
    }
    return `₱${value}`;
};

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartLoading, setChartLoading] = useState(false); 
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);

  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 6),
    endDate: new Date(),
  });

  type SortableColumn = 'customer' | 'items' | 'status';
  const [sortColumn, setSortColumn] = useState<SortableColumn>('status');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchDashboardData = async () => {
      const isInitialLoad = !dashboardData;
      if (isInitialLoad) setLoading(true); 
      else setChartLoading(true);
      
      setError(null);
      try {
        const response = await api.get('/dashboard/stats', {
          params: {
            startDate: formatDate(dateRange.startDate, 'yyyy-MM-dd'),
            endDate: formatDate(dateRange.endDate, 'yyyy-MM-dd')
          }
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
  }, [dateRange]);

  const handleExport = () => {
    // Get the base URL from the environment variables, just like your api.ts service
    const API_BASE_URL = import.meta.env.VITE_API_URL;

    // Format the dates into YYYY-MM-DD strings
    const startDate = formatDate(dateRange.startDate, 'yyyy-MM-dd');
    const endDate = formatDate(dateRange.endDate, 'yyyy-MM-dd');

    // Construct the full URL for the backend endpoint
    const exportUrl = `${API_BASE_URL}/dashboard/export-report?startDate=${startDate}&endDate=${endDate}`;

    // Open the URL in a new tab. The browser will handle the PDF download.
    window.open(exportUrl, '_blank');
  };


  const sortedUpcomingAndOverdue = useMemo(() => {
    if (!dashboardData) return [];
    
    const allOrders = [...(dashboardData.overdueOrders || []), ...(dashboardData.toReturnOrders || [])];

    return allOrders.sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case 'customer':
          aValue = a.customerInfo[0]?.name || '';
          bValue = b.customerInfo[0]?.name || '';
          break;
        case 'items':
          aValue = a.itemCount || 0;
          bValue = b.itemCount || 0;
          break;
        case 'status':
        default:
          aValue = new Date(a.rentalEndDate).getTime();
          bValue = new Date(b.rentalEndDate).getTime();
          break;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [dashboardData, sortColumn, sortDirection]);

   const handleRecommend = (size: string) => {
    if (!size) return;
    const path = `/products?size=${encodeURIComponent(size)}`;
    navigate(path);
    setShowRecommendationModal(false);
  };

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortableColumn) => {
    // Determine if the current column is the one being sorted
    const isActive = sortColumn === column;

    return (
      <span className="sort-icon-container">
        {/* The 'asc' caret is muted if the column is NOT active OR if the direction is 'desc' */}
        <CaretUpFill size={12} className={!isActive || sortDirection === 'desc' ? 'sort-icon-muted' : ''} />
        {/* The 'desc' caret is muted if the column is NOT active OR if the direction is 'asc' */}
        <CaretDownFill size={12} className={!isActive || sortDirection === 'asc' ? 'sort-icon-muted' : ''} />
      </span>
    );
  };
  
  const totalSalesForRange = useMemo(() => {
    if (!dashboardData?.weeklySalesData) {
      return 0;
    }
    return dashboardData.weeklySalesData.reduce((sum, day) => sum + day.totalSales, 0);
  }, [dashboardData?.weeklySalesData]);

  const chartData = useMemo(() => {
    if (!dashboardData) return [];
    return formatSalesDataForChart(dashboardData.weeklySalesData, dateRange.startDate, dateRange.endDate);
  }, [dashboardData, dateRange.startDate, dateRange.endDate]);
  
  const averageSales = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, entry) => sum + entry.sales, 0) / chartData.length;
  }, [chartData]);


  const renderOrderTableRows = (orders: DashboardRentalOrder[]) => {
    if (orders.length === 0) {
      return <tr><td colSpan={5} className="text-center text-muted py-3">No pending returns.</td></tr>;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return orders.map((order) => {
        const returnDate = new Date(order.rentalEndDate);
        const isOverdue = returnDate < today;

        const timeDiff = Math.abs(today.getTime() - returnDate.getTime());
        const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));

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
  
  const { stats } = dashboardData;

  return (
    <div className="d-flex flex-column justify-content-between gap-3">
      <div className="d-flex justify-content-between align-items-center">
        <p className="m-0 fw-semibold fs-2 text-start">Dashboard</p>
        
        <div onClick={() => setShowRecommendationModal(true)}>
          <CustomButton1 />
        </div>
      </div>

      <Row xs={1} sm={2} md={3} lg={5} className="g-3">
        {/* Each Col will automatically take up 1/5th of the width on large screens,
            1/3rd on medium, 1/2 on small, and full-width on extra-small */}
        <Col>
          <Card className="shadow-sm h-100">
            <Card.Body className="d-flex align-items-center border-start border-primary border-4 rounded bg-white">
              <div className="text-start pe-3 py-2">
                <p className="text-secondary mb-1 fw-bold small">SALES</p>
                <h5 className="fw-bold mb-0">₱{totalSalesForRange.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h5>
              </div>
              <CalendarFill size={30} className="ms-auto text-light" />
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <div 
            className="dashboard-stat-card" 
            onClick={() => navigate('/manage-reservations', { state: { activeTab: 'Pending' } })}
          >
            <Card className="shadow-sm h-100">
              <Card.Body className="d-flex align-items-center border-start border-primary border-4 rounded bg-white">
                <div className="text-start pe-3 py-2">
                  <p className="text-secondary mb-1 fw-bold small">PENDING RESERVATIONS</p>
                  <h5 className="fw-bold mb-0">{stats.pendingReservations || 0}</h5>
                </div>
                <JournalCheck size={30} className="ms-auto text-light" />
              </Card.Body>
            </Card>
          </div>
        </Col>

        {/* Pending Appointments Card (Clickable) */}
        <Col>
          <div 
            className="dashboard-stat-card" 
            onClick={() => navigate('/manage-appointments', { state: { activeTab: 'Pending' } })}
          >
            <Card className="shadow-sm h-100">
              <Card.Body className="d-flex align-items-center border-start border-primary border-4 rounded bg-white">
                <div className="text-start pe-3 py-2">
                  <p className="text-secondary mb-1 fw-bold small">PENDING APPOINTMENTS</p>
                  <h5 className="fw-bold mb-0">{stats.pendingAppointments || 0}</h5>
                </div>
                <CalendarHeart size={30} className="ms-auto text-light" />
              </Card.Body>
            </Card>
          </div>
        </Col>

        {/* Pending Rentals Card (Clickable) */}
        <Col>
          <div 
            className="dashboard-stat-card" 
            onClick={() => navigate('/manageRentals', { state: { activeTab: 'Pending' } })}
          >
            <Card className="shadow-sm h-100">
              <Card.Body className="d-flex align-items-center border-start border-primary border-4 rounded bg-white">
                <div className="text-start pe-3 py-2">
                  <p className="text-secondary mb-1 fw-bold small">PENDING <br/>RENTALS</p>
                  <h5 className="fw-bold mb-0">{stats.Pending || 0}</h5>
                </div>
                <HourglassSplit size={30} className="ms-auto text-light" />
              </Card.Body>
            </Card>
          </div>
        </Col>

        {/* To Return Card (Clickable) */}
        <Col>
          <div 
            className="dashboard-stat-card" 
            onClick={() => navigate('/manageRentals', { state: { activeTab: 'To Return' } })}
          >
            <Card className="shadow-sm h-100">
              <Card.Body className="d-flex align-items-center border-start border-primary border-4 rounded bg-white">
                <div className="text-start pe-3 py-2">
                  <p className="text-secondary mb-1 fw-bold small">TO RETURN</p>
                  <h5 className="fw-bold mb-0">{stats.ToReturn || 0}</h5>
                </div>
                <ArrowRepeat size={30} className="ms-auto text-light" />
              </Card.Body>
            </Card>
          </div>
        </Col>
      </Row>

      <Row>
        <Col lg={7} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Header className="bg-white py-3">
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">Sales Visualization</h5>
                    <div className="d-flex align-items-center gap-2">
                        <Button 
                          variant="outline-secondary" 
                          size="sm" 
                          onClick={handleExport}
                          className="text-nowrap"
                        >
                            <BoxArrowUpRight className="me-1" /> Export
                        </Button>
                        <AdvancedDateRangePicker 
                          initialRange={dateRange}
                          onRangeChange={setDateRange} 
                        />
                    </div>
                </div>
            </Card.Header>
            <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '320px' }}>
              {chartLoading ? <Spinner animation="border" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barGap={4}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#AE0C00" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#AE0C00" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={dynamicYAxisFormatter} allowDecimals={false} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(174, 12, 0, 0.1)' }}/>
                    {averageSales > 0 && <ReferenceLine y={averageSales} label={{ value: 'Avg', position: 'insideTopLeft' }} stroke="grey" strokeDasharray="4 4" />}
                    
                    {/* --- 3. REPLACE Line and Area with Bar --- */}
                    <Bar 
                      dataKey="sales" 
                      fill="url(#barGradient)" 
                      radius={[4, 4, 0, 0]} // Adds slightly rounded top corners
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5} className="mb-3">
          <Card className="shadow-sm h-100">
            <Card.Header>
                <h5 className="mb-0 fw-bold">Upcoming & Overdue Returns</h5>
            </Card.Header>
            <Card.Body className="p-0 small">
              <div className="table-responsive">
                <Table hover className="mb-0 dashboard-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('customer')} className="sortable-header">
                        Customer {getSortIcon('customer')}
                      </th>
                      <th onClick={() => handleSort('items')} className="sortable-header text-center">
                        Items {getSortIcon('items')}
                      </th>
                      <th onClick={() => handleSort('status')} className="sortable-header">
                        Status {getSortIcon('status')}
                      </th>
                      <th className="sortable-header">
                        Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderOrderTableRows(sortedUpcomingAndOverdue)}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* --- 6. RENDER the modal at the bottom --- */}
      <OutfitRecommendationModal
        show={showRecommendationModal}
        onHide={() => setShowRecommendationModal(false)}
        onRecommend={handleRecommend}
      />
    </div>
  );
}

export default Dashboard;