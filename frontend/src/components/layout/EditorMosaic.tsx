import {
  MosaicWithoutDragDropContext,
  MosaicWindow,
  MosaicNode,
} from 'react-mosaic-component';
import 'react-mosaic-component/react-mosaic-component.css';
import { Icon } from '../ui/Icon';

export type MosaicId = string;

interface EditorMosaicProps {
  layout: MosaicNode<MosaicId> | null;
  onChange: (newNode: MosaicNode<MosaicId> | null) => void;
  renderTile: (id: MosaicId) => React.ReactElement;
}

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

/** Stato vuoto — look pulito e professionale */
const ZeroState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
    <Icon name="terminal" size={32} className="text-rd-text-dim opacity-30" />
    <span className="text-[13px] text-rd-text-dim">
      Apri un file per iniziare
    </span>
    <span className="text-[11px] text-rd-text-disabled">
      File → Apri configurazione
    </span>
  </div>
);
