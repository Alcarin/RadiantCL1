import React from 'react';
import {
  MosaicWithoutDragDropContext,
  MosaicWindow,
  MosaicNode,
} from 'react-mosaic-component';
import 'react-mosaic-component/react-mosaic-component.css';

export type MosaicId = string;

// Formato stabile v6: { direction, first, second, splitPercentage? }
export type LayoutNode = MosaicNode<MosaicId>;

interface EditorMosaicProps {
  layout: LayoutNode | null;
  onChange: (newNode: LayoutNode | null) => void;
  renderTile: (id: MosaicId) => React.ReactElement;
}

const ZeroState: React.FC = () => (
  <div className="flex items-center justify-center h-full text-rd-text-dim text-sm italic">
    Apri una connessione dalla sidebar
  </div>
);

export const EditorMosaic: React.FC<EditorMosaicProps> = ({
  layout,
  onChange,
  renderTile,
}) => {
  return (
    <div className="w-full h-full bg-rd-base">
      <MosaicWithoutDragDropContext<MosaicId>
        renderTile={(id, path) => (
          <MosaicWindow<MosaicId>
            path={path}
            title={id}
            renderToolbar={() => <div style={{ display: 'none' }} />}
          >
            {renderTile(id)}
          </MosaicWindow>
        )}
        value={layout}
        onChange={onChange}
        className="mosaic-blueprint-theme bp5-dark"
        zeroStateView={<ZeroState />}
      />
    </div>
  );
};
