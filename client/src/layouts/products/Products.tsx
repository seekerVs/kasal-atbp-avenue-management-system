// client/src/layouts/products/Products.tsx

import React, { useState, useEffect } from "react";
import {
  Col,
  Dropdown,
  Row,
  DropdownButton,
  ButtonGroup,
  Accordion,
  Alert,
} from "react-bootstrap";
import { Funnel, SortDown } from "react-bootstrap-icons";
import ProductCard from "../../components/productCard/ProductCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from '../../services/api';
import { InventoryItem } from '../../types';
import './products.css';
import CustomPagination from "../../components/customPagination/CustomPagination";
import { useHeartedItems } from "../../hooks/useHeartedItems";
import { FilterForm } from '../../components/forms/FilterForm';
import { ProductCardSkeleton } from "../../components/productCardSkeleton/ProductCardSkeleton";

function Products() {
  const navigate = useNavigate();
  const { isHearted, addHeartedId, removeHeartedId } = useHeartedItems();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const [selectedSize, setSelectedSize] = useState(() => searchParams.get('size') || "");
  const [selectedSort, setSelectedSort] = useState("Relevance");
  const [attireType, setAttireType] = useState("");
  const [selectedAge, setSelectedAge] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || "");

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: any = {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          excludeCategory: 'Accessory' 
        };
        if (attireType) params.category = attireType;
        if (selectedAge) params.ageGroup = selectedAge;
        if (selectedGender) params.gender = selectedGender;
        if (searchTerm) params.search = searchTerm;
        if (selectedSize) params.size = selectedSize; 

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
  }, [attireType, selectedAge, selectedGender, searchTerm, currentPage, selectedSort, selectedSize]);

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

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [attireType, selectedAge, selectedGender, searchTerm, selectedSort, selectedSize]);

  const handleSortSelect = (eventKey: string | null) => {
    if (eventKey) setSelectedSort(eventKey);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setAttireType("");
    setSelectedAge("");
    setSelectedGender("");
    setSelectedSort("Relevance");
    setSelectedSize("");
    setSearchParams({});
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  const handleHeartClick = async (productId: string) => {
    const wasHearted = isHearted(productId);

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

    try {
      if (wasHearted) {
        await api.delete(`/inventory/${productId}/heart`);
      } else {
        await api.post(`/inventory/${productId}/heart`);
      }
    } catch (error) {
      console.error("Failed to update heart count on server:", error);
    }
  };

  return (
    <>
      <div className="products-page-container pt-4">
        <Row>
          <Col md={3} className="text-start">
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
                        mode="rental"
                        assignmentScope="all"
                        onAssignmentScopeChange={() => {}}
                        selectedSize={selectedSize}
                        setSelectedSize={setSelectedSize}
                    />
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </div>
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
                  mode="rental"
                  assignmentScope="all"
                  onAssignmentScopeChange={() => {}}
                  selectedSize={selectedSize}
                  setSelectedSize={setSelectedSize}
              />
            </div>
          </Col>
          
          <Col md={9} className="pb-4 product-grid-container">
            <div className="d-flex justify-content-end align-items-center mb-3">
              <DropdownButton
                as={ButtonGroup}
                size="sm"
                align="end"
                variant="outline-secondary"
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
              <Row xs={2} sm={2} md={3} lg={4} xl={5} className="g-2">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                  <Col key={index}>
                    <ProductCardSkeleton />
                  </Col>
                ))}
              </Row>
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : products.length === 0 ? (
                <Alert variant="info" className="text-center">No items found matching your criteria.</Alert>
            ) : (
              <Row xs={2} sm={2} md={3} lg={4} xl={5} className="g-2" >
                {products.map((product) => (
                  <Col key={product._id}>
                    <ProductCard
                      image={product.variations?.[0]?.imageUrls?.[0] || 'https://via.placeholder.com/400x500?text=No+Image'}
                      title={product.name}
                      price={product.price}
                      sizes={Array.from(new Set(product.variations.map(v => v.size)))}
                      heartCount={product.heartCount || 0}
                      isHearted={isHearted(product._id)}
                      onHeartClick={() => handleHeartClick(product._id)}
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
    </>
  );
}

export default Products;