import React from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';

interface LayoutProps {
  activityBar: React.ReactNode;
  sideBar: React.ReactNode;
  mainContent: React.ReactNode;
  bottomPanel: React.ReactNode;
  statusBar: React.ReactNode;
  topBar?: React.ReactNode;
  sideBarVisible?: boolean;
  bottomPanelVisible?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  activityBar,
  sideBar,
  mainContent,
  bottomPanel,
  statusBar,
  sideBarVisible = true,
  bottomPanelVisible = false,
  topBar,
}) => {
  return (
    <div
      className="flex flex-col h-screen overflow-hidden bg-rd-base text-rd-text"
      data-ui-chrome
    >
      {/* ── Title / Menu Bar ── */}
      {topBar}

      {/* ── Main Shell ── */}
      <div className="flex flex-1 min-h-0">
        {/* Activity Bar — fixed width, never resizable */}
        {activityBar}

        {/* Resizable work area */}
        <div className="flex-1 min-w-0">
          <Group orientation="vertical">
            {/* ── Top: sidebar + editor ── */}
            <Panel defaultSize={80} minSize={30}>
              <Group orientation="horizontal">
                {sideBarVisible && (
                  <>
                    <Panel
                      defaultSize="200px"
                      minSize={10}
                      collapsible
                    >
                      {sideBar}
                    </Panel>
                    <Separator className="w-px vscode-panel-divider" />
                  </>
                )}
                <Panel minSize={30}>{mainContent}</Panel>
              </Group>
            </Panel>

            {/* ── Bottom: terminal/logs ── */}
            {bottomPanelVisible && (
              <>
                <Separator className="h-[3px] vscode-panel-divider" />
                <Panel defaultSize={20} minSize={8} collapsible>
                  {bottomPanel}
                </Panel>
              </>
            )}
          </Group>
        </div>
      </div>

      {/* ── Status Bar ── */}
      {statusBar}
    </div>
  );
};
