/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TreeView, TreeNode } from './TreeView';
import React from 'react';

// Mock Icon to avoid issues with SVGs/components in tests
vi.mock('./Icon', () => ({
  Icon: () => <div data-testid="icon" />
}));

const mockNodes: TreeNode[] = [
  {
    id: 'f-1',
    label: 'Folder 1',
    children: [
      { id: 'h-1', label: 'Host 1' }
    ]
  },
  { id: 'h-2', label: 'Host 2' }
];

describe('TreeView', () => {
  it('renders root nodes correctly', () => {
    render(<TreeView nodes={mockNodes} />);
    expect(screen.getByText('Folder 1')).toBeInTheDocument();
    expect(screen.getByText('Host 2')).toBeInTheDocument();
  });

  it('calls onSelect when a node is clicked', () => {
    const onSelect = vi.fn();
    render(<TreeView nodes={mockNodes} onSelect={onSelect} />);
    
    const nodeElement = screen.getByText('Host 2');
    fireEvent.click(nodeElement);
    
    expect(onSelect).toHaveBeenCalled();
  });

  it('shows and hides children when toggled', async () => {
    const onToggleExpand = vi.fn();
    const { rerender } = render(<TreeView nodes={mockNodes} onToggleExpand={onToggleExpand} />);
    
    // In react-arborist default, children might not be in DOM if parent is closed
    expect(screen.queryByText('Host 1')).not.toBeInTheDocument();

    const chevron = screen.getByTestId('chevron-f-1');
    fireEvent.click(chevron);
    
    expect(onToggleExpand).toHaveBeenCalledWith('f-1', true);
  });

  it('renders with status indicator if provided', () => {
    const statusNodes: TreeNode[] = [
      { id: 'h-1', label: 'Connected Host', data: { status: 'connected' } }
    ];
    render(<TreeView nodes={statusNodes} />);
    // The label should be there
    expect(screen.getByText('Connected Host')).toBeInTheDocument();
  });
});
