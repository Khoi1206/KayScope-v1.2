import * as Blockly from 'blockly/core'

/** Escape a string value for safe inclusion inside a template string */
function esc(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

/**
 * Walk a block chain (following nextConnection) and return concatenated code.
 * This bypasses Blockly v12's scrub_() which does not chain by default.
 */
function chainToCode(first: Blockly.Block | null, gen: Blockly.Generator): string {
  let code = ''
  let block: Blockly.Block | null = first
  while (block) {
    const result = gen.forBlock[block.type]?.(block, gen) ?? ''
    code += typeof result === 'string' ? result : result[0]
    block = block.nextConnection?.targetBlock() ?? null
  }
  return code
}

export function registerGenerators(gen: Blockly.Generator): void {
  // Disable Blockly's own indentation — our block generators already add 2 spaces
  gen.INDENT = ''

  /* ── Test Container ─────────────────────────────────────────────── */
  gen.forBlock['pw_test'] = (block: Blockly.Block) => {
    const name = esc(block.getFieldValue('NAME') || 'My Test')
    // Use chainToCode to walk STEPS — bypasses scrub_() binding issues in v12
    const firstStep = block.getInputTargetBlock('STEPS')
    const steps = chainToCode(firstStep, gen)
    return `test(\`${name}\`, async ({ page }) => {\n${steps}});\n`
  }

  /* ── Navigation ─────────────────────────────────────────────────── */
  gen.forBlock['pw_goto'] = (block: Blockly.Block) => {
    const url = esc(block.getFieldValue('URL') || '/')
    return `  await page.goto(\`${url}\`);\n`
  }

  /* ── Click actions ──────────────────────────────────────────────── */
  gen.forBlock['pw_click_text'] = (block: Blockly.Block) => {
    const text = esc(block.getFieldValue('TEXT') || '')
    return `  await page.getByText(\`${text}\`).first().click();\n`
  }

  gen.forBlock['pw_click_role'] = (block: Blockly.Block) => {
    const role = block.getFieldValue('ROLE') || 'button'
    const name = esc(block.getFieldValue('NAME') || '')
    return `  await page.getByRole('${role}', { name: \`${name}\` }).click();\n`
  }

  gen.forBlock['pw_click_title'] = (block: Blockly.Block) => {
    const title = esc(block.getFieldValue('TITLE') || '')
    return `  await page.getByTitle(\`${title}\`).click();\n`
  }

  gen.forBlock['pw_click_placeholder'] = (block: Blockly.Block) => {
    const ph = esc(block.getFieldValue('PLACEHOLDER') || '')
    return `  await page.getByPlaceholder(\`${ph}\`).click();\n`
  }

  /* ── Fill / Type ────────────────────────────────────────────────── */
  gen.forBlock['pw_fill_placeholder'] = (block: Blockly.Block) => {
    const ph = esc(block.getFieldValue('PLACEHOLDER') || '')
    const val = esc(block.getFieldValue('VALUE') || '')
    return `  await page.getByPlaceholder(\`${ph}\`).fill(\`${val}\`);\n`
  }

  gen.forBlock['pw_fill_label'] = (block: Blockly.Block) => {
    const label = esc(block.getFieldValue('LABEL') || '')
    const val = esc(block.getFieldValue('VALUE') || '')
    return `  await page.getByLabel(\`${label}\`).fill(\`${val}\`);\n`
  }

  gen.forBlock['pw_select_option'] = (block: Blockly.Block) => {
    const option = esc(block.getFieldValue('OPTION') || '')
    const selector = esc(block.getFieldValue('SELECTOR') || 'select')
    return `  await page.locator(\`${selector}\`).selectOption(\`${option}\`);\n`
  }

  /* ── Hover ──────────────────────────────────────────────────────── */
  gen.forBlock['pw_hover_text'] = (block: Blockly.Block) => {
    const text = esc(block.getFieldValue('TEXT') || '')
    return `  await page.getByText(\`${text}\`).first().hover();\n`
  }

  /* ── Assertions ─────────────────────────────────────────────────── */
  gen.forBlock['pw_expect_url'] = (block: Blockly.Block) => {
    const raw = block.getFieldValue('PATTERN') || ''
    // Strip surrounding slashes the user may have typed (e.g. /admin → admin),
    // then escape internal forward slashes so the regex literal is valid.
    const pattern = raw.replace(/^\/+|\/+$/g, '').replace(/\//g, '\\/')
    return `  await expect(page).toHaveURL(/${pattern}/, { timeout: 15_000 });\n`
  }

  gen.forBlock['pw_expect_visible'] = (block: Blockly.Block) => {
    const text = esc(block.getFieldValue('TEXT') || '')
    return `  await expect(page.getByText(\`${text}\`).first()).toBeVisible();\n`
  }

  gen.forBlock['pw_expect_not_visible'] = (block: Blockly.Block) => {
    const text = esc(block.getFieldValue('TEXT') || '')
    return `  await expect(page.getByText(\`${text}\`).first()).not.toBeVisible();\n`
  }

  gen.forBlock['pw_expect_value'] = (block: Blockly.Block) => {
    const selector = esc(block.getFieldValue('SELECTOR') || 'input')
    const value = esc(block.getFieldValue('VALUE') || '')
    return `  await expect(page.locator(\`${selector}\`)).toHaveValue(\`${value}\`);\n`
  }

  /* ── Timing ─────────────────────────────────────────────────────── */
  gen.forBlock['pw_wait'] = (block: Blockly.Block) => {
    const ms = Number(block.getFieldValue('MS')) || 1000
    // Hard waits are a test anti-pattern — they slow tests and make them flaky.
    // Prefer the "Wait for text" block which uses an assertion-based wait instead.
    return `  // WARNING: Hard wait — prefer waiting for a visible element instead.\n  await page.waitForTimeout(${ms});\n`
  }

  gen.forBlock['pw_wait_selector'] = (block: Blockly.Block) => {
    const text = esc(block.getFieldValue('TEXT') || '')
    return `  await expect(page.getByText(\`${text}\`).first()).toBeVisible({ timeout: 10_000 });\n`
  }

  /* ── Screenshots ─────────────────────────────────────────────────── */
  gen.forBlock['pw_screenshot'] = (block: Blockly.Block) => {
    const name = esc(block.getFieldValue('NAME') || 'screenshot')
    return `  await page.screenshot({ path: \`test-results/${name}.png\` });\n`
  }
}

/**
 * Convert a Blockly workspace to a complete Playwright .spec.ts file string.
 * Returns { code, testCount } where testCount is the number of pw_test blocks found.
 */
export function workspaceToSpec(
  workspace: Blockly.Workspace,
  gen: Blockly.Generator
): { code: string; testCount: number } {
  const topBlocks = workspace.getTopBlocks(true).filter((b) => b.type === 'pw_test')

  const testBodies = topBlocks
    .map((block) => {
      // Call forBlock directly — avoids Blockly v12 internals in blockToCode()
      const result = gen.forBlock[block.type]?.(block, gen) ?? ''
      return typeof result === 'string' ? result : result[0]
    })
    .join('\n')

  const code =
    `import { test, expect } from '@playwright/test'\n` +
    `\n` +
    `// Auto-generated by KayScope Test Builder\n` +
    `// Generated at: ${new Date().toISOString()}\n` +
    `\n` +
    testBodies

  return { code, testCount: topBlocks.length }
}
