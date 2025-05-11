import React from "react";
import { Pagination } from "react-bootstrap";
import { ArrowLeftShort, ArrowRightShort } from "react-bootstrap-icons"; // Custom icons
import "./customPagination.css";

interface CustomPaginationProps {
  active: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const CustomPagination: React.FC<CustomPaginationProps> = ({
  active,
  totalPages,
  onPageChange,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <Pagination className="custom-pagination justify-content-center">
      <Pagination.Prev
        onClick={() => onPageChange(Math.max(1, active - 1))}
        disabled={active === 1}
      >
        <ArrowLeftShort size={24} />
      </Pagination.Prev>

      {pages.map((page) => (
        <Pagination.Item
          key={page}
          active={page === active}
          onClick={() => onPageChange(page)}
          className={page === active ? "custom-active" : ""}
        >
          {page}
        </Pagination.Item>
      ))}

      <Pagination.Next
        onClick={() => onPageChange(Math.min(totalPages, active + 1))}
        disabled={active === totalPages}
        className="bg-light"
      >
        <ArrowRightShort size={24} />
      </Pagination.Next>
    </Pagination>
  );
};

export default CustomPagination;
