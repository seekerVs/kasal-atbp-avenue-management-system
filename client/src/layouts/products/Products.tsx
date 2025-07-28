// client/src/layouts/products/Products.tsx

import React, { useState, useEffect } from "react";
import {
  Col,
  Dropdown,
  Row,
  DropdownButton,
  ButtonGroup,
  Accordion,
  Spinner,
  Alert,
} from "react-bootstrap";
import { Funnel, Search, SortDown } from "react-bootstrap-icons";
import ProductCard from "../../components/productCard/ProductCard";
import { useNavigate } from "react-router-dom";
import CustomFooter from "../../components/customFooter/CustomFooter";

import api from '../../services/api';
import { InventoryItem } from '../../types';
import './products.css'; // Import the new CSS
import CustomPagination from "../../components/customPagination/CustomPagination";
import { useHeartedItems } from "../../hooks/useHeartedItems";
import { FilterForm } from '../../components/forms/FilterForm';

// --- Products Component (Main Component) ---
function Products() {
  const navigate = useNavigate();
  const { isHearted, addHeartedId, removeHeartedId } = useHeartedItems();;
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]); // State for dynamic categories
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const [selectedSort, setSelectedSort] = useState("Relevance");
  const [attireType, setAttireType] = useState("");
  const [selectedAge, setSelectedAge] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: any = {
          page: currentPage,
          limit: ITEMS_PER_PAGE
        };
        if (attireType) params.category = attireType;
        if (selectedAge) params.ageGroup = selectedAge;
        if (selectedGender) params.gender = selectedGender;
        if (searchTerm) params.search = searchTerm;

        // --- ADD THIS SORTING LOGIC ---
        if (selectedSort === "Price Asc") params.sort = 'price_asc';
        if (selectedSort === "Price Desc") params.sort = 'price_desc';
        if (selectedSort === "Latest") params.sort = 'latest';

        const response = await api.get('/inventory', { params });
        setProducts(response.data.items);
        setTotalPages(response.data.totalPages);
      } catch (err) {
        setError("Failed to load items. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [attireType, selectedAge, selectedGender, searchTerm, currentPage, selectedSort]);

  // This useEffect fetches the categories list only once.
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await api.get('/inventory');
        const uniqueCategories = Array.from(new Set((response.data.items as InventoryItem[]).map(item => item.category)));
        setCategories(uniqueCategories.sort());
      } catch (err) { console.error("Could not fetch categories", err); }
    };
    fetchInitialData();
  }, []);

  const handleSortSelect = (eventKey: string | null) => {
    if (eventKey) setSelectedSort(eventKey);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setAttireType("");
    setSelectedAge("");
    setSelectedGender("");
    setSelectedSort("Relevance"); // Also reset sort order
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0); // Scroll to top on page change
  };

  const handleHeartClick = async (productId: string) => {
    const wasHearted = isHearted(productId);

    // 1. Optimistically update the UI first for a snappy user experience
    if (wasHearted) {
      removeHeartedId(productId);
      setProducts(prev =>
        prev.map(p =>
          p._id === productId ? { ...p, heartCount: Math.max(0, (p.heartCount || 0) - 1) } : p
        )
      );
    } else {
      addHeartedId(productId);
      setProducts(prev =>
        prev.map(p =>
          p._id === productId ? { ...p, heartCount: (p.heartCount || 0) + 1 } : p
        )
      );
    }

    // 2. Send the corresponding request to the backend
    try {
      if (wasHearted) {
        // Un-hearting: send a DELETE request
        await api.delete(`/inventory/${productId}/heart`);
      } else {
        // Hearting: send a POST request
        await api.post(`/inventory/${productId}/heart`);
      }
    } catch (error) {
      console.error("Failed to update heart count on server:", error);
      // Optional: Revert the UI change on failure
      setProducts(prev => [...prev]); // Force a re-render to get original state back if needed
    }
  };

  return (
    // Replaced container-fluid with our new custom container class
    <>
      <div className="products-page-container pt-4">
        <Row>
          {/* Sidebar */}
          <Col md={3} className="text-start">
            {/* Mobile View Accordion */}
            <div className="d-lg-none mb-3">
              <Accordion>
                <Accordion.Item eventKey="0">
                  <Accordion.Header>
                    <Funnel className="me-2" />
                    <strong>Filters & Search</strong>
                  </Accordion.Header>
                  <Accordion.Body>
                    <FilterForm
                        categories={categories}
                        attireType={attireType}
                        setAttireType={setAttireType}
                        selectedAge={selectedAge}
                        setSelectedAge={setSelectedAge}
                        selectedGender={selectedGender}
                        setSelectedGender={setSelectedGender}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        onReset={handleResetFilters}
                    />
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </div>
            {/* Desktop View Filter */}
            <div className="d-none d-lg-block">
              <FilterForm
                  categories={categories}
                  attireType={attireType}
                  setAttireType={setAttireType}
                  selectedAge={selectedAge}
                  setSelectedAge={setSelectedAge}
                  selectedGender={selectedGender}
                  setSelectedGender={setSelectedGender}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  onReset={handleResetFilters}
              />
            </div>
          </Col>
          {/* Product Grid */}
          <Col md={9} className="pb-4 product-grid-container">
            <div className="d-flex justify-content-end align-items-center mb-3">
              <DropdownButton
                as={ButtonGroup}
                size="sm"
                align="end"
                variant="outline-secondary"
                // --- REPLACE THE LINE BELOW ---
                title={
                  <>
                    <SortDown className="me-2" />
                    {selectedSort}
                  </>
                }
                onSelect={handleSortSelect}
              >
                <Dropdown.Item eventKey="Relevance">Relevance</Dropdown.Item>
                <Dropdown.Item eventKey="Latest">Latest</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item eventKey="Price Asc">Price Asc</Dropdown.Item> 
                <Dropdown.Item eventKey="Price Desc">Price Desc</Dropdown.Item>
              </DropdownButton>
            </div>
            {loading ? (
              <div className="text-center py-5"><Spinner /> <p className="mt-2">Loading Items...</p></div>
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : products.length === 0 ? ( // <-- Using sortedProducts here
                <Alert variant="info" className="text-center">No items found matching your criteria.</Alert>
            ) : (
              <Row xs={2} sm={2} md={3} lg={4} xl={5} className="g-3">
                {products.map((product) => ( // <-- Using sortedProducts here
                  <Col key={product._id}>
                    <ProductCard
                      image={product.variations[0]?.imageUrl || 'https://via.placeholder.com/400x500?text=No+Image'}
                      title={product.name}
                      price={product.price}
                      sizes={product.variations.map(v => v.size)}
                      // --- ADD THESE PROPS ---
                      heartCount={product.heartCount || 0}
                      isHearted={isHearted(product._id)}
                      onHeartClick={() => handleHeartClick(product._id)}
                      // --- RENAME THIS PROP ---
                      onCardClick={() => navigate(`/productViewer/${product._id}`)}
                    />
                  </Col>
                ))}
              </Row>
            )}

            {totalPages > 1 && !loading && (
              <div className="d-flex justify-content-center mt-4">
                <CustomPagination
                  active={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </Col>
        </Row>
      </div>
      <footer className="px-0 py-3 mt-4 border-top">
        <CustomFooter />
      </footer>
    </>
  );
}

export default Products;