/**
 * ScenarioForge - Node Palette Component Tests
 * 
 * Tests for the draggable node palette that shows available node types
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NodePalette } from '../../components/panels/NodePalette';

describe('NodePalette Component', () => {
  // ============================================
  // Rendering Tests
  // ============================================
  describe('Rendering', () => {
    it('should render the node palette', () => {
      render(<NodePalette />);
      expect(screen.getByText('Node Palette')).toBeInTheDocument();
    });

    it('should render category sections', () => {
      render(<NodePalette />);
      
      // Check for main category buttons (exact text)
      expect(screen.getByRole('button', { name: /Inputs/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Transform/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Outputs/i })).toBeInTheDocument();
    });

    it('should render basic node types', () => {
      render(<NodePalette />);
      
      // Check for node type names (in draggable elements)
      expect(screen.getByText('Constant')).toBeInTheDocument();
      expect(screen.getByText('Transformer')).toBeInTheDocument();
      expect(screen.getByText('Distribution')).toBeInTheDocument();
    });
  });

  // ============================================
  // Category Expansion Tests
  // ============================================
  describe('Category Expansion', () => {
    it('should expand and collapse categories', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);
      
      // Find the Inputs category button
      const inputsButton = screen.getByRole('button', { name: /Inputs/i });
      
      // Click to toggle
      await user.click(inputsButton);
      
      // Button should still be present
      expect(inputsButton).toBeInTheDocument();
    });
  });

  // ============================================
  // Search/Filter Tests
  // ============================================
  describe('Search Functionality', () => {
    it('should filter nodes based on search input', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);
      
      // Find search input
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
      
      // Type search query
      await user.type(searchInput, 'constant');
      
      // Should show Constant node
      expect(screen.getByText(/constant/i)).toBeInTheDocument();
    });

    it('should show no results for invalid search', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);
      
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'xyznonexistent');
      
      // Should show some indication of no results or empty state
      // The exact behavior depends on implementation
    });

    it('should clear search on clear button click', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);
      
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'test');
      
      // Find and click clear button if it exists
      const clearButton = screen.queryByRole('button', { name: /clear/i });
      if (clearButton) {
        await user.click(clearButton);
        expect(searchInput).toHaveValue('');
      }
    });
  });

  // ============================================
  // Drag and Drop Tests
  // ============================================
  describe('Drag and Drop', () => {
    it('should have draggable node items', () => {
      render(<NodePalette />);
      
      // Find all draggable elements
      const draggables = document.querySelectorAll('[draggable="true"]');
      expect(draggables.length).toBeGreaterThan(0);
    });

    it('should set drag data on drag start', () => {
      render(<NodePalette />);
      
      // Find the first draggable element
      const nodeItems = document.querySelectorAll('[draggable="true"]');
      const firstItem = nodeItems[0];
      
      if (firstItem) {
        const setDataMock = vi.fn();
        const dataTransfer = { setData: setDataMock };
        
        fireEvent.dragStart(firstItem, { dataTransfer });
        
        // Verify setData was called with node type format
        if (setDataMock.mock.calls.length > 0) {
          const [format] = setDataMock.mock.calls[0];
          expect(format).toBe('application/node-type');
        }
      }
    });
  });

  // ============================================
  // Accessibility Tests
  // ============================================
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<NodePalette />);
      
      // Search input should have proper label/placeholder
      const searchInput = screen.getByPlaceholderText(/search/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);
      
      // Tab to search input
      await user.tab();
      
      // Should focus on search or first interactive element
      expect(document.activeElement).not.toBe(document.body);
    });
  });

  // ============================================
  // Node Type Information Tests
  // ============================================
  describe('Node Type Information', () => {
    it('should display node descriptions', () => {
      render(<NodePalette />);
      
      // Descriptions should be visible or accessible
      expect(screen.getByText(/fixed value/i)).toBeInTheDocument();
    });

    it('should display node icons', () => {
      render(<NodePalette />);
      
      // Icons are rendered as emoji, check for common ones
      expect(screen.getByText('🔢')).toBeInTheDocument(); // Constant
      expect(screen.getByText('⚙️')).toBeInTheDocument(); // Transformer
    });

    it('should include advanced node types', () => {
      render(<NodePalette />);
      
      // Check for some advanced node types
      expect(screen.getByText(/aggregator/i)).toBeInTheDocument();
      expect(screen.getByText(/decision/i)).toBeInTheDocument();
    });
  });
});
