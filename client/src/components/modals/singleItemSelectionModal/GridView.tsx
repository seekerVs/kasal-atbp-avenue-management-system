// client/src/components/modals/singleItemSelectionModal/GridView.tsx

import React from 'react';
import { Row, Col, Button, DropdownButton, Dropdown, ButtonGroup, Spinner, Alert } from 'react-bootstrap';
import { SortDown, Funnel } from 'react-bootstrap-icons';
import { InventoryItem } from '../../../types';
import { FilterForm } from '../../forms/FilterForm';
import ProductCard from '../../productCard/ProductCard';
import CustomPagination from '../../customPagination/CustomPagination';
// --- ADDED: Import the skeleton component ---
import { ProductCardSkeleton } from '../../productCardSkeleton/ProductCardSkeleton';

interface GridViewProps {
  inventory: InventoryItem[];
  categories: string[];
  totalPages: number;
  loading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSelectItem: (item: InventoryItem) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  attireType: string;
  onAttireTypeChange: (type: string) => void;
  selectedAge: string;
  onAgeChange: (age: string) => void;
  selectedGender: string;
  onGenderChange: (gender: string) => void;
  selectedSort: string;
  onSortChange: (sort: string) => void;
  onResetFilters: () => void;
  mode: 'rental' | 'assignment';
  filterByColorHex?: string;
  assignmentScope: 'matching' | 'all';
  onAssignmentScopeChange: (scope: 'matching' | 'all') => void;
}

export const GridView: React.FC<GridViewProps> = ({
  inventory, categories, totalPages, loading, currentPage, onPageChange, onSelectItem,
  showFilters, onToggleFilters, searchTerm, onSearchTermChange, attireType, onAttireTypeChange,
  selectedAge, onAgeChange, selectedGender, onGenderChange, selectedSort, onSortChange,
  onResetFilters,
  mode, filterByColorHex, assignmentScope, onAssignmentScopeChange
}) => {

  const renderGridContent = () => {
    // --- CHANGED: Show skeletons when loading ---
    if (loading) {
      return (
        <Row xs={2} sm={3} lg={4} xl={showFilters ? 5 : 6} className="g-2">
          {Array.from({ length: 12 }).map((_, index) => (
            <Col key={index}>
              <ProductCardSkeleton />
            </Col>
          ))}
        </Row>
      );
    }
    
    if (inventory.length === 0) {
      return <Alert variant="info" className="mt-3">No items found matching your criteria.</Alert>;
    }
    
    return (
      <Row xs={2} sm={3} lg={4} xl={showFilters ? 5 : 6} className="g-2">
        {inventory.map(item => (
          <Col key={item._id}>
            <ProductCard 
              title={item.name} 
              price={item.price} 
              image={item.variations[0]?.imageUrl || 'https://placehold.co/400x500'} 
              // --- CHANGED: Ensure unique sizes are displayed ---
              sizes={Array.from(new Set(item.variations.map(v => v.size)))} 
              heartCount={item.heartCount || 0} 
              isHearted={false} 
              onHeartClick={() => {}} 
              onCardClick={() => onSelectItem(item)} 
            />
          </Col>
        ))}
      </Row>
    );
  };


  return (
    <Row>
      {showFilters && (
        <Col lg={3} className="border-end pe-lg-4">
          <FilterForm
            categories={categories} attireType={attireType} setAttireType={onAttireTypeChange}
            selectedAge={selectedAge} setSelectedAge={onAgeChange}
            selectedGender={selectedGender} setSelectedGender={onGenderChange}
            searchTerm={searchTerm} setSearchTerm={onSearchTermChange}
            onReset={onResetFilters} isModal={true}
            mode={mode}
            filterByColorHex={filterByColorHex}
            assignmentScope={assignmentScope}
            onAssignmentScopeChange={onAssignmentScopeChange}
          />
        </Col>
      )}
      <Col lg={showFilters ? 9 : 12}>
        <div className="d-flex justify-content-end align-items-center mb-3">
          <Button variant="outline-secondary" size="sm" className="me-2" onClick={onToggleFilters} title={showFilters ? "Hide Filters" : "Show Filters"}>
            <Funnel />
          </Button>
          <DropdownButton as={ButtonGroup} size="sm" align="end" variant="outline-secondary" title={<><SortDown className="me-2" />{selectedSort}</>} onSelect={(key) => onSortChange(key || 'Relevance')}>
            <Dropdown.Item eventKey="Relevance">Relevance</Dropdown.Item>
            <Dropdown.Item eventKey="Latest">Latest</Dropdown.Item><Dropdown.Divider />
            <Dropdown.Item eventKey="Price Asc">Price Asc</Dropdown.Item>
            <Dropdown.Item eventKey="Price Desc">Price Desc</Dropdown.Item>
          </DropdownButton>
        </div>
        
        {/* --- CHANGED: Use the new render function --- */}
        {renderGridContent()}

        {/* --- CHANGED: Don't show pagination while loading --- */}
        {!loading && totalPages > 1 && (
          <div className="d-flex justify-content-center mt-4">
            <CustomPagination active={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
          </div>
        )}
      </Col>
    </Row>
  );
};