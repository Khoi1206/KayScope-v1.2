'use client'

import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import type { Workspace, SavedRequest, Collection } from './types'
import { METHOD_COLOR } from './constants'
import { ConfirmModal } from './ConfirmModal'
import { RenameModal } from './RenameModal'
import { EnvEditorModal } from './EnvEditorModal'
import { MembersModal } from './MembersModal'
import { ProfileModal } from './ProfileModal'
import { SaveToCollectionModal } from './SaveToCollectionModal'
import { ResponsePanel } from './ResponsePanel'
import { RequestEditor } from './RequestEditor'
import { Navbar } from './Navbar'
import { SidebarPanel } from './SidebarPanel'
import type { SidebarSection } from './SidebarPanel'
import { ErrorBoundary } from './ErrorBoundary'
import {
  useWorkspaces, useEnvironments, useHistoryActivity,
  useLiveSync, useCollectionTree, useRequestEditor,
} from '../hooks'

// Heavy components — lazy-loaded so they are excluded from the initial JS bundle
// and only fetched when the user actually needs them.
const PanelFallback = () => (
  <div className="flex items-center justify-center w-full h-full">
    <div className="w-5 h-5 border-2 border-th-text-3 border-t-transparent rounded-full animate-spin" />
  </div>
)
const ModalFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
  </div>
)

const TestBuilderPanel = dynamic(
  () => import('./TestBuilderPanel').then(m => m.TestBuilderPanel),
  { ssr: false, loading: PanelFallback }
)
const CollectionRunnerPanel = dynamic(
  () => import('./CollectionRunnerPanel').then(m => m.CollectionRunnerPanel),
  { ssr: false, loading: PanelFallback }
)
const SearchModal = dynamic(
  () => import('./SearchModal').then(m => m.SearchModal),
  { ssr: false, loading: ModalFallback }
)
const ImportModal = dynamic(
  () => import('./ImportModal').then(m => m.ImportModal),
  { ssr: false, loading: ModalFallback }
)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AppShell({ userName: initialUserName, userEmail: _userEmail, userId }: { userName: string; userEmail: string; userId: string }) {
  const [userName, setUserName] = useState(initialUserName)
  const t = useTranslations()

  const {
    workspaces, setWorkspaces, currentWs, setCurrentWs,
    showWsDropdown, setShowWsDropdown,
    newWsName, setNewWsName,
    showWsCreate, setShowWsCreate,
    wsCreateError, setWsCreateError,
    loadingWs, wsDropdownRef,
    createWorkspace, renameWorkspace, deleteWorkspace,
  } = useWorkspaces()

  const [sidebarSection, setSidebarSection] = useState<SidebarSection>('collections')

  const {
    environments, setEnvironments,
    currentEnvId, setCurrentEnvId,
    envEditorTarget, setEnvEditorTarget,
    saveEnvironment, deleteEnvironment, reloadEnvironments,
  } = useEnvironments(currentWs)

  const {
    history,
    loadingHistory,
    activityLogs, setActivityLogs,
    loadingActivity,
    dbActivityCount,
    loadHistory, loadActivity,
    loadMoreHistory, loadMoreActivity,
  } = useHistoryActivity(currentWs, sidebarSection)

  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void; destructive?: boolean; confirmLabel?: string; secondaryAction?: { label: string; onClick: () => void } } | null>(null)
  const [renameModal, setRenameModal] = useState<{ label: string; currentName: string; onSave: (name: string) => void; title?: string } | null>(null)
  const [membersModalWs, setMembersModalWs] = useState<Workspace | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [testBuilderKey, setTestBuilderKey] = useState(0)
  const [canGoBack, setCanGoBack] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [runnerCollection, setRunnerCollection] = useState<Collection | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  const importFileRef = useRef<HTMLInputElement>(null)
  const testBlocklyStateRef = useRef<object | undefined>(undefined)
  const blocklyStateStackRef = useRef<object[]>([])

  const handleOpenTestRun = useCallback((run: import('./TestsSidebarPanel').SavedTestRun) => {
    if (run.blocklyState) {
      blocklyStateStackRef.current.push(testBlocklyStateRef.current as object)
      setCanGoBack(true)
      testBlocklyStateRef.current = run.blocklyState
      setTestBuilderKey(k => k + 1)
    }
    setSidebarSection('tests')
  }, [setSidebarSection])

  const handleGoBackTestRun = useCallback(() => {
    const prev = blocklyStateStackRef.current.pop()
    testBlocklyStateRef.current = prev
    setCanGoBack(blocklyStateStackRef.current.length > 0)
    setTestBuilderKey(k => k + 1)
  }, [])

  useEffect(() => {
    blocklyStateStackRef.current = []
    testBlocklyStateRef.current = undefined
    setCanGoBack(false)
  }, [currentWs?.id])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const setRequestsByColProxy = useRef<React.Dispatch<React.SetStateAction<Record<string, SavedRequest[]>>>>(() => {})

  const stableSetRequestsByCol = useCallback(
    (...args: Parameters<typeof setRequestsByColProxy.current>) => {
      setRequestsByColProxy.current(...args)
    },
    []
  )

  const editor = useRequestEditor({
    currentWs,
    environments,
    currentEnvId,
    setEnvironments,
    setRequestsByCol: stableSetRequestsByCol,
    sidebarSection,
    loadHistory,
  })

  const {
    activeReq, isDraft, reqName, method, url,
    params, setParams, headers, setHeaders, body, setBody, auth, setAuth,
    activeTab, setActiveTab,
    preRequestScript, setPreRequestScript, postRequestScript, setPostRequestScript,
    preScriptResult, postScriptResult,
    tempVars,
    tabs, activeTabId, tabBarRef,
    response, responseTab, setResponseTab, isSending, sendError, requestTiming,
    isSaving, saveFlash, saveError, setSaveError, saveToColModal, setSaveToColModal,
    isDirty,
    switchToTab, closeTab, newTab, openInTab, openHistoryInTab,
    handleRequestsRemoved, saveRequest, sendRequest,
    varOverrides, setVarOverride,
  } = editor

  const currentEnv = useMemo(
    () => environments.find(e => e.id === currentEnvId) ?? null,
    [environments, currentEnvId]
  )

  const resolvedEnvVars = useMemo(() => {
    const vars: Record<string, string> = {}
    currentEnv?.variables
      .filter(v => v.enabled && v.key)
      .forEach(v => { vars[v.key] = v.value })
    return vars
  }, [currentEnv])

  const {
    collections,
    setRequestsByCol,
    foldersByCol,
    expandedCols, expandedFolders, setExpandedFolders,
    loadingCols,
    newColName, setNewColName,
    showColCreate, setShowColCreate,
    colCreateError, setColCreateError,
    folderTrees,
    toggleCollection, loadFoldersForCollection,
    createCollection, renameCollection, deleteCollection,
    createFolder, renameFolder, deleteFolder,
    createRequestImmediately, deleteRequest,
    exportCollection, handleImportFile,
    reloadCollections, reloadExpandedCollectionData,
  } = useCollectionTree(currentWs, importFileRef, {
    onOpenInTab: openInTab,
    onRequestsRemoved: handleRequestsRemoved,
  })

  setRequestsByColProxy.current = setRequestsByCol

  const handleTabClose = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return
    if (tab.dirty) {
      const label = tab.id === activeTabId ? reqName : tab.label
      setConfirmModal({
        title: t('confirm.unsavedTitle'),
        message: t('confirm.unsavedMessage', { label }),
        confirmLabel: t('confirm.dontSave'),
        onConfirm: () => { setConfirmModal(null); closeTab(tabId) },
        destructive: false,
        secondaryAction: {
          label: t('confirm.saveChanges'),
          onClick: async () => {
            setConfirmModal(null)
            if (tabId !== activeTabId) { switchToTab(tabId); return }
            await saveRequest()
            closeTab(tabId)
          },
        },
      })
      return
    }
    closeTab(tabId)
  }, [t, tabs, activeTabId, reqName, closeTab, switchToTab, saveRequest, setConfirmModal])

  const saveRequestRef = useRef(saveRequest)
  saveRequestRef.current = saveRequest
  const stableSaveRequest = useCallback(() => saveRequestRef.current(), [])

  const sendRequestRef = useRef(sendRequest)
  sendRequestRef.current = sendRequest
  const stableSendRequest = useCallback(() => sendRequestRef.current(), [])

  const { liveConnected } = useLiveSync(currentWs?.id, userId, {
    reloadCollections,
    reloadEnvironments,
    reloadExpandedCollectionData,
    setWorkspaces,
    setActivityLogs,
  })


  return (
    <div className="flex flex-col h-screen bg-th-bg text-th-text overflow-hidden">
      <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />

      {confirmModal && <ConfirmModal {...confirmModal} onCancel={() => setConfirmModal(null)} />}
      {renameModal && <RenameModal {...renameModal} onCancel={() => setRenameModal(null)} />}
      {envEditorTarget !== null && (
        <EnvEditorModal
          env={envEditorTarget === 'new' ? null : envEditorTarget}
          onSave={saveEnvironment}
          onCancel={() => setEnvEditorTarget(null)}
        />
      )}
      {membersModalWs && (
        <MembersModal ws={membersModalWs} currentUserId={userId} onClose={() => setMembersModalWs(null)} />
      )}
      {showProfileModal && (
        <ProfileModal
          initialName={userName}
          onClose={() => setShowProfileModal(false)}
          onNameChange={n => setUserName(n)}
        />
      )}
      {saveToColModal && (
        <SaveToCollectionModal
          collections={collections}
          foldersByCol={foldersByCol}
          loadFolders={loadFoldersForCollection}
          onSave={(colId, folderId) => { setSaveToColModal(false); saveRequest(colId, folderId) }}
          onCancel={() => setSaveToColModal(false)}
        />
      )}
      {showImportModal && currentWs && (
        <ImportModal
          workspaceId={currentWs.id}
          onImported={() => { setShowImportModal(false); reloadCollections() }}
          onClose={() => setShowImportModal(false)}
        />
      )}
      {runnerCollection && (
        <CollectionRunnerPanel
          collection={runnerCollection}
          tree={folderTrees[runnerCollection.id]}
          workspaceId={currentWs?.id ?? ''}
          currentEnvId={currentEnvId}
          environments={environments}
          onClose={() => setRunnerCollection(null)}
        />
      )}
      {showSearch && (
        <SearchModal
          collections={collections}
          folderTrees={folderTrees}
          onOpen={req => openInTab(req)}
          onClose={() => setShowSearch(false)}
        />
      )}

      <Navbar
        workspaces={workspaces} currentWs={currentWs} setCurrentWs={setCurrentWs} loadingWs={loadingWs}
        createWorkspace={createWorkspace} renameWorkspace={renameWorkspace} deleteWorkspace={deleteWorkspace}
        showWsDropdown={showWsDropdown} setShowWsDropdown={setShowWsDropdown}
        newWsName={newWsName} setNewWsName={setNewWsName}
        showWsCreate={showWsCreate} setShowWsCreate={setShowWsCreate}
        wsCreateError={wsCreateError} setWsCreateError={setWsCreateError}
        wsDropdownRef={wsDropdownRef}
        importFileRef={importFileRef}
        liveConnected={liveConnected}
        setMembersModalWs={setMembersModalWs} setRenameModal={setRenameModal} setConfirmModal={setConfirmModal}
        userName={userName}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <ErrorBoundary label="Sidebar">
        <SidebarPanel
          sidebarSection={sidebarSection} setSidebarSection={setSidebarSection}
          currentWs={currentWs} loadingWs={loadingWs} setShowWsDropdown={setShowWsDropdown}
          collections={collections} loadingCols={loadingCols}
          expandedCols={expandedCols} expandedFolders={expandedFolders} setExpandedFolders={setExpandedFolders}
          folderTrees={folderTrees} showColCreate={showColCreate} setShowColCreate={setShowColCreate}
          newColName={newColName} setNewColName={setNewColName}
          colCreateError={colCreateError} setColCreateError={setColCreateError}
          toggleCollection={toggleCollection} createCollection={createCollection}
          renameCollection={renameCollection} deleteCollection={deleteCollection}
          createFolder={createFolder} renameFolder={renameFolder} deleteFolder={deleteFolder}
          createRequestImmediately={createRequestImmediately} deleteRequest={deleteRequest}
          exportCollection={exportCollection} importFileRef={importFileRef}
          onImportClick={() => setShowImportModal(true)}
          onRunCollection={col => { loadFoldersForCollection(col.id); setRunnerCollection(col) }}
          openInTab={openInTab} activeReq={activeReq} isDraft={isDraft}
          environments={environments} currentEnvId={currentEnvId} setCurrentEnvId={setCurrentEnvId}
          setEnvEditorTarget={setEnvEditorTarget} deleteEnvironment={deleteEnvironment}
          history={history} loadingHistory={loadingHistory}
          openHistoryInTab={openHistoryInTab} loadMoreHistory={loadMoreHistory}
          activityLogs={activityLogs} loadingActivity={loadingActivity}
          loadActivity={loadActivity} loadMoreActivity={loadMoreActivity}
          dbActivityCount={dbActivityCount}
          setConfirmModal={setConfirmModal} setRenameModal={setRenameModal}
          currentEnvName={currentEnv?.name}
          onOpenTestRun={handleOpenTestRun}
        />
        </ErrorBoundary>

        {/* ══ Main content ══ */}
        <main className="flex flex-col flex-1 overflow-hidden">

          {sidebarSection === 'tests' && (
            <ErrorBoundary label="Test Builder">
              <TestBuilderPanel
                key={testBuilderKey}
                initialBlocklyState={testBlocklyStateRef.current}
                onBlocklyStateChange={s => { testBlocklyStateRef.current = s }}
                workspaceId={currentWs?.id}
                canGoBack={canGoBack}
                onGoBack={handleGoBackTestRun}
              />
            </ErrorBoundary>
          )}

          {sidebarSection !== 'tests' && (<>
          <div className="flex items-center border-b border-th-border bg-th-tabbar shrink-0">
            {tabs.length > 3 && (
              <button onClick={() => tabBarRef.current?.scrollBy({ left: -150, behavior: 'smooth' })} className="px-1.5 py-2 text-gray-600 hover:text-gray-300 shrink-0 transition" title="Scroll left">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            <div role="tablist" ref={tabBarRef} className="flex items-center flex-1 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            {tabs.map(tab => {
              const isActive = tab.id === activeTabId
              const displayMethod = isActive ? method : tab.method
              const displayLabel = isActive ? reqName : tab.label
              return (
                <div
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => switchToTab(tab.id)}
                  className={`group flex items-center gap-1.5 px-3 py-2 text-xs cursor-pointer border-r border-th-border/80 shrink-0 max-w-[200px] min-w-[80px] transition ${
                    isActive
                      ? 'bg-th-nav border-t-[2px] border-t-orange-500'
                      : 'text-th-text-3 hover:bg-th-input/50 hover:text-th-text-2 border-t-[2px] border-t-transparent'
                  }`}
                >
                  <span className={`text-[10px] font-bold shrink-0 ${METHOD_COLOR[displayMethod]}`}>{displayMethod.slice(0, 3)}</span>
                  <span className={`truncate flex-1 min-w-0 ${isActive ? 'text-gray-200' : ''}`}>{displayLabel}</span>
                  {tab.dirty ? (
                    <>
                      <span className="group-hover:hidden shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400 ml-0.5" />
                      <button
                        onClick={e => { e.stopPropagation(); handleTabClose(tab.id) }}
                        className="hidden group-hover:block shrink-0 text-gray-600 hover:text-red-400 transition ml-0.5 p-0.5 rounded"
                        title="Close tab (unsaved changes)"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); handleTabClose(tab.id) }}
                      className="shrink-0 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 p-0.5 rounded"
                      title="Close tab"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
            <button
              onClick={newTab}
              className="px-3 py-2 text-gray-600 hover:text-gray-300 shrink-0 transition"
              title="New tab"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            </div>
            {tabs.length > 3 && (
              <button onClick={() => tabBarRef.current?.scrollBy({ left: 150, behavior: 'smooth' })} className="px-1.5 py-2 text-gray-600 hover:text-gray-300 shrink-0 transition" title="Scroll right">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            )}

            <div className="shrink-0 border-l border-th-border ml-1 pl-2 pr-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-xs bg-th-input text-gray-300 border border-th-border-soft rounded px-2 py-1 hover:border-gray-500 focus:outline-none focus:border-orange-500 transition min-w-[120px]">
                    <svg className="w-3 h-3 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h12M3 17h6" />
                    </svg>
                    <span className="flex-1 text-left truncate">
                      {currentEnvId === 'none' ? t('nav.noEnvironment') : (environments.find(e => e.id === currentEnvId)?.name ?? t('nav.noEnvironment'))}
                    </span>
                    <svg className="w-3 h-3 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-th-surface border-th-border-soft text-xs">
                  <DropdownMenuItem
                    onClick={() => setCurrentEnvId('none')}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <span className="flex-1">{t('nav.noEnvironment')}</span>
                    {currentEnvId === 'none' && <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                  </DropdownMenuItem>
                  {environments.map(env => (
                    <DropdownMenuItem
                      key={env.id}
                      onClick={() => setCurrentEnvId(env.id)}
                      className="flex items-center gap-2 text-xs cursor-pointer"
                    >
                      <span className="flex-1 truncate">{env.name}</span>
                      {currentEnvId === env.id && <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {(activeTabId === '' || (!activeReq && !isDraft)) && (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-600">
              <svg className="w-12 h-12 mb-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">{t('request.emptyState')}</p>
            </div>
          )}

          {activeTabId !== '' && (activeReq || isDraft) && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <ErrorBoundary label="Request Editor">
              <RequestEditor
                reqName={reqName} setReqName={editor.setReqName}
                method={method} setMethod={editor.setMethod}
                url={url} setUrl={editor.setUrl}
                saveRequest={stableSaveRequest} sendRequest={stableSendRequest}
                isSaving={isSaving} saveFlash={saveFlash} isDirty={isDirty}
                saveError={saveError} setSaveError={setSaveError}
                isSending={isSending}
                activeTab={activeTab} setActiveTab={setActiveTab}
                params={params} setParams={setParams}
                headers={headers} setHeaders={setHeaders}
                body={body} setBody={setBody}
                auth={auth} setAuth={setAuth}
                preRequestScript={preRequestScript} setPreRequestScript={setPreRequestScript}
                postRequestScript={postRequestScript} setPostRequestScript={setPostRequestScript}
                preScriptResult={preScriptResult} postScriptResult={postScriptResult}
                envVars={resolvedEnvVars} tempVars={tempVars}
                varOverrides={varOverrides} onSetVarOverride={setVarOverride}
              />
              <ResponsePanel
                response={response}
                responseTab={responseTab}
                setResponseTab={setResponseTab}
                isSending={isSending}
                sendError={sendError}
                requestTiming={requestTiming}
              />
              </ErrorBoundary>
            </div>
          )}
          </>)}
        </main>
      </div>
    </div>
  )
}

