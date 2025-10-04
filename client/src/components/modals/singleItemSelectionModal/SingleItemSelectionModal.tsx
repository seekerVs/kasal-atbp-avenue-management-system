// client/src/components/modals/singleItemSelectionModal/SingleItemSelectionModal.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { ArrowLeft } from 'react-bootstrap-icons';
import { InventoryItem, ItemVariation } from '../../../types';
import './singleItemSelectionModal.css'
import api from '../../../services/api';
import { GridView } from './GridView';
import { DetailView } from './DetailView';

export interface SelectedItemData {
  product: InventoryItem;
  variation: ItemVariation;
  quantity: number;
}

interface ItemSelectionModalProps {
  show: boolean;
  onHide: () => void;
  onSelect: (selection: SelectedItemData) => void;
  addAlert: (message: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
  mode: 'rental' | 'assignment';
  preselectedItemId?: string;
  preselectedVariation?: string;
  filterByColorHex?: string;
  filterByCategoryType?: 'Wearable' | 'Accessory';
  initialSelectedItem?: InventoryItem | null;
  confirmButtonText?: string;
  disableQuantity?: boolean;
}

const ACCESSORY_CATEGORIES = ['Veils', 'Cords', 'Arrhae', 'Jewelry', 'Footwear'];

export const SingleItemSelectionModal: React.FC<ItemSelectionModalProps> = ({ 
  show, onHide, onSelect, addAlert, mode, 
  preselectedItemId, preselectedVariation, filterByColorHex, filterByCategoryType, initialSelectedItem = null, confirmButtonText, disableQuantity
}) => {
  const [assignmentScope, setAssignmentScope] = useState<'matching' | 'all'>('matching');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<ItemVariation | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSort, setSelectedSort] = useState("Relevance");
  const [attireType, setAttireType] = useState("");
  const [selectedAge, setSelectedAge] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    if (!show) return;
    const fetchInitialData = async () => {
      try {
        const response = await api.get('/inventory');
        const uniqueCategories = Array.from(new Set((response.data.items as InventoryItem[]).map(item => item.category)));
        setCategories(uniqueCategories.sort());
      } catch (err) { console.error("Could not fetch categories for modal", err); }
    };
    fetchInitialData();
  }, [show]);

  useEffect(() => {
    if (show) {
      setAssignmentScope(mode === 'assignment' ? 'matching' : 'all');
      // Optionally reset other filters here too if desired when the modal re-opens
      // setCurrentPage(1);
      // setSearchTerm('');
    }
  }, [show, mode, filterByColorHex]); 

  useEffect(() => {
    if (!show) return;

    if (initialSelectedItem) {
      handleSelectItem(initialSelectedItem);
      // We don't need to fetch anything, so we can exit the effect early.
      return; 
    }

    const fetchProducts = async () => {
      setLoadingInventory(true);
      try {
        const params: any = { 
            page: currentPage, 
            limit: ITEMS_PER_PAGE, 
            search: searchTerm, 
            category: attireType, 
            ageGroup: selectedAge, 
            gender: selectedGender 
        };
        
        if (mode === 'assignment' && assignmentScope === 'matching' && filterByColorHex) {
          params.colorHex = filterByColorHex;
        }

        if (filterByCategoryType === 'Accessory') {
            params.categories = ACCESSORY_CATEGORIES.join(',');
        } else {
            params.excludeCategory = 'Accessory';
            // Only use the manual attireType filter if not in accessory mode
            if (attireType) {
                params.category = attireType;
            }
        }

        if (selectedSort === "Price Asc") params.sort = 'price_asc'; 
        else if (selectedSort === "Price Desc") params.sort = 'price_desc'; 
        else if (selectedSort === "Latest") params.sort = 'latest';

        if (selectedSize) params.size = selectedSize;

        const response = await api.get('/inventory', { params });
        setInventory(response.data.items || []);
        setTotalPages(response.data.totalPages || 1);
        
        if (preselectedItemId) {
          const itemToSelect = (response.data.items || []).find((i: InventoryItem) => i._id === preselectedItemId);
          if (itemToSelect) handleSelectItem(itemToSelect);
        }
      } catch (err) { addAlert('Could not load inventory items.', 'danger'); } 
      finally { setLoadingInventory(false); }
    };
    fetchProducts();
  }, [show, currentPage, searchTerm, selectedSort, attireType, selectedAge, selectedGender, addAlert, preselectedItemId, filterByColorHex, assignmentScope, mode, filterByCategoryType, initialSelectedItem]);
  
  useEffect(() => { if (currentPage !== 1) setCurrentPage(1); }, [searchTerm, selectedSort, attireType, selectedAge, selectedGender, assignmentScope, selectedSize]);

  const handleResetFilters = () => { setSearchTerm(""); setAttireType(""); setSelectedAge(""); setSelectedGender(""); setSelectedSort("Relevance"); setAssignmentScope('matching'); setSelectedSize("");};
  const handleGoBack = () => { setSelectedItem(null); setSelectedVariation(null); setQuantity(1); };
  
  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);

    let initialVariation: ItemVariation | null = null;

    // 1. Prioritize the preselected variation if it exists
    if (preselectedVariation) {
      const [colorName, size] = preselectedVariation.split(',').map(s => s.trim());
      const foundVar = item.variations.find(
        v => v.color.name === colorName && v.size === size
      );
      if (foundVar) {
        initialVariation = foundVar;
      }
    }

    // 2. If no preselected variation was found or provided, use other logic
    if (!initialVariation) {
      if (mode === 'assignment' && assignmentScope === 'matching' && filterByColorHex) {
        initialVariation = item.variations.find(v => v.color.hex === filterByColorHex) || null;
      } else {
        // Fallback to the very first available variation
        initialVariation = item.variations.find(v => v.quantity > 0) || item.variations[0] || null;
      }
    }
    
    setSelectedVariation(initialVariation);
  };
  
  const handleConfirmSelection = () => {
    if (!selectedItem || !selectedVariation) return;
    onSelect({
      product: selectedItem,
      variation: selectedVariation,
      quantity: mode === 'rental' ? quantity : 1,
    });
    addAlert(`${selectedItem.name} ${mode === 'rental' ? 'added!' : 'assigned!'}`, 'success');
    handleGoBack();
  };

  const availableSizesForDisplay = useMemo(() => {
    if (!selectedItem) return [];
    return selectedItem.variations.filter(v => {
        if (mode === 'assignment' && assignmentScope === 'matching' && filterByColorHex) return v.color.hex === filterByColorHex;
        return v.color.hex === selectedVariation?.color.hex;
    });
  }, [selectedItem, selectedVariation, mode, assignmentScope, filterByColorHex]);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static" dialogClassName="modal-90w">
      <Modal.Header closeButton><Modal.Title>{selectedItem ? 'Select Variation & Quantity' : 'Select an Item'}</Modal.Title></Modal.Header>
      <Modal.Body style={{ maxHeight: selectedItem ? '75vh' : '80vh', overflowY: 'auto' }}>
        {selectedItem ? (
          <DetailView
            item={selectedItem} mode="full" selectedVariation={selectedVariation} quantity={quantity}
            onVariationChange={setSelectedVariation} onQuantityChange={setQuantity}
            availableSizesForDisplay={availableSizesForDisplay} isQuantityDisabled={disableQuantity}
          />
        ) : (
            <GridView
              inventory={inventory} categories={categories} totalPages={totalPages} loading={loadingInventory}
              currentPage={currentPage} onPageChange={setCurrentPage} onSelectItem={handleSelectItem}
              showFilters={showFilters} onToggleFilters={() => setShowFilters(!showFilters)}
              searchTerm={searchTerm} onSearchTermChange={setSearchTerm}
              attireType={attireType} onAttireTypeChange={setAttireType}
              selectedAge={selectedAge} onAgeChange={setSelectedAge}
              selectedGender={selectedGender} onGenderChange={setSelectedGender}
              selectedSort={selectedSort} onSortChange={setSelectedSort}
              onResetFilters={handleResetFilters}
              mode={mode}
              filterByColorHex={filterByColorHex}
              assignmentScope={assignmentScope}
              onAssignmentScopeChange={setAssignmentScope}
              selectedSize={selectedSize}
              onSizeChange={setSelectedSize}  
            />
        )}
      </Modal.Body>
      <Modal.Footer>
        {selectedItem && (
          <>
            <Button variant="secondary" onClick={confirmButtonText ? onHide : handleGoBack}>
              {confirmButtonText ? 'Cancel' : <><ArrowLeft className="me-2"/>Back</>}
            </Button>
            
            <Button variant="primary" onClick={handleConfirmSelection} disabled={!selectedVariation}>
              {confirmButtonText || (mode === 'rental' ? 'Confirm Selection' : 'Assign Item')}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};