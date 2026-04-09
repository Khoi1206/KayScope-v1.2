import { TestBuilderClient } from './TestBuilderClient'

export const metadata = {
  title: 'Test Builder — KayScope',
  description: 'Visual Playwright E2E test builder using drag-and-drop blocks',
}

/**
 * Test Builder page — requires authentication (protected by middleware).
 * The builder itself is a pure client-side Blockly workspace.
 */
export default function TestBuilderPage() {
  return <TestBuilderClient />
}
