'use client'

import { useEffect, useRef } from 'react'
import * as Blockly from 'blockly'
import { definePlaywrightBlocks } from '../blockly/blocks'
import { registerGenerators, workspaceToSpec } from '../blockly/generator'
import { PLAYWRIGHT_TOOLBOX, INITIAL_STATE } from '../blockly/toolbox'

/**
 * Blockly workspace component.
 * Initialises once on mount, notifies parent on every block change.
 */
export function BlocklyEditor({
  onCodeChange,
  initialState,
  onStateChange,
}: {
  onCodeChange: (code: string, testCount: number) => void
  initialState?: object
  onStateChange?: (state: object) => void
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null)
  // Keep the latest callback in a ref so the stable useEffect closure can call it
  const callbackRef = useRef(onCodeChange)
  useEffect(() => {
    callbackRef.current = onCodeChange
  })
  const stateCallbackRef = useRef(onStateChange)
  useEffect(() => {
    stateCallbackRef.current = onStateChange
  })
  const initialStateRef = useRef(initialState)

  useEffect(() => {
    if (!divRef.current || workspaceRef.current) return

    // Guard: if Blockly already injected into this container (StrictMode double-invoke),
    // clear it first so we start with a clean DOM node.
    const container = divRef.current
    if (container.querySelector('.blocklySvg')) {
      container.innerHTML = ''
    }

    // Register blocks and generator once per page load
    definePlaywrightBlocks()
    const gen = new Blockly.Generator('Playwright')
    registerGenerators(gen)

    /* ── Inject workspace ────────────────────────────────────────── */
    let ws: Blockly.WorkspaceSvg
    try {
      ws = Blockly.inject(container, {
        toolbox: PLAYWRIGHT_TOOLBOX as Blockly.utils.toolbox.ToolboxDefinition,
        grid: {
          spacing: 24,
          length: 3,
          colour: '#374151',   // gray-700
          snap: true,
        },
        zoom: {
          controls: true,
          wheel: true,
          startScale: 1.0,
          maxScale: 3,
          minScale: 0.2,
          scaleSpeed: 1.2,
        },
        trashcan: true,
        scrollbars: true,
        theme: Blockly.Themes.Classic,
      })
    } catch {
      // Blockly injection failed (e.g. FocusManager conflict) — skip
      return
    }
    workspaceRef.current = ws

    /* ── Load initial state or fallback example ─────────────────── */
    try {
      const stateToLoad = initialStateRef.current ?? INITIAL_STATE
      Blockly.serialization.workspaces.load(stateToLoad, ws, { recordUndo: false })
    } catch {
      // If load fails, start with blank workspace
    }

    /* ── Generate code on every workspace change ─────────────────── */
    const handleChange = (event: Blockly.Events.Abstract) => {
      // Skip UI-only events that don't change block content
      if (
        event.type === Blockly.Events.VIEWPORT_CHANGE ||
        event.type === Blockly.Events.SELECTED ||
        event.type === Blockly.Events.CLICK
      )
        return
      const { code, testCount } = workspaceToSpec(ws, gen)
      callbackRef.current(code, testCount)
      if (stateCallbackRef.current) {
        try {
          const state = Blockly.serialization.workspaces.save(ws)
          stateCallbackRef.current(state)
        } catch { /* ignore serialization errors */ }
      }
    }

    ws.addChangeListener(handleChange)

    // Generate code for the initially loaded workspace
    const { code, testCount } = workspaceToSpec(ws, gen)
    callbackRef.current(code, testCount)

    return () => {
      ws.removeChangeListener(handleChange)
      try {
        // Unregister from FocusManager before disposal to prevent
        // "Attempted to focus unregistered tree" on React StrictMode remount
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fm = (Blockly as any).getFocusManager?.()
        if (fm && typeof fm.unregisterTree === 'function') {
          try { fm.unregisterTree(ws) } catch { /* already unregistered */ }
        }
        ws.dispose()
      } catch { /* ignore disposal errors */ }
      workspaceRef.current = null
    }
  }, []) // intentionally empty — runs once on mount

  return (
    <div
      ref={divRef}
      className="blockly-workspace w-full h-full"
    />
  )
}
