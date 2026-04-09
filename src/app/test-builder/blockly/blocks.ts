import * as Blockly from 'blockly/core'

/**
 * Defines all custom Playwright Blockly blocks using the JSON block-definition API.
 * Guard ensures blocks are only registered once per page load — calling this
 * multiple times (e.g. on component remount) would cause Blockly v12 to warn
 * about duplicate block types and potentially break the workspace.
 */
let _registered = false
export function definePlaywrightBlocks(): void {
  if (_registered) return
  _registered = true
  Blockly.defineBlocksWithJsonArray([
    /* ── Test Container ─────────────────────────────────────────────── */
    {
      type: 'pw_test',
      message0: '🧪 Test: %1',
      args0: [{ type: 'field_input', name: 'NAME', text: 'My Test' }],
      message1: 'steps %1',
      args1: [{ type: 'input_statement', name: 'STEPS' }],
      colour: 210,
      tooltip: 'A Playwright test. Add steps inside.',
      helpUrl: '',
    },

    /* ── Navigation ─────────────────────────────────────────────────── */
    {
      type: 'pw_goto',
      message0: '🌐 go to %1',
      args0: [{ type: 'field_input', name: 'URL', text: 'http://localhost:3000' }],
      previousStatement: null,
      nextStatement: null,
      colour: 160,
      tooltip: 'Navigate to a URL.',
    },

    /* ── Click actions ──────────────────────────────────────────────── */
    {
      type: 'pw_click_text',
      message0: '🖱️ click text %1',
      args0: [{ type: 'field_input', name: 'TEXT', text: 'button text' }],
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: 'Click an element that contains the given text.',
    },
    {
      type: 'pw_click_role',
      message0: '🖱️ click %1 named %2',
      args0: [
        {
          type: 'field_dropdown',
          name: 'ROLE',
          options: [
            ['button', 'button'],
            ['link', 'link'],
            ['menuitem', 'menuitem'],
            ['tab', 'tab'],
            ['checkbox', 'checkbox'],
            ['radio', 'radio'],
            ['option', 'option'],
            ['heading', 'heading'],
          ],
        },
        { type: 'field_input', name: 'NAME', text: 'label' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: 'Click an element by ARIA role and name.',
    },
    {
      type: 'pw_click_title',
      message0: '🖱️ click title %1',
      args0: [{ type: 'field_input', name: 'TITLE', text: 'icon title' }],
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: 'Click an element with the given title attribute.',
    },
    {
      type: 'pw_click_placeholder',
      message0: '🖱️ click placeholder %1',
      args0: [{ type: 'field_input', name: 'PLACEHOLDER', text: 'placeholder text' }],
      previousStatement: null,
      nextStatement: null,
      colour: 290,
      tooltip: 'Click an element with the given placeholder.',
    },

    /* ── Fill / Type ────────────────────────────────────────────────── */
    {
      type: 'pw_fill_placeholder',
      message0: '✏️ fill %1 with %2',
      args0: [
        { type: 'field_input', name: 'PLACEHOLDER', text: 'placeholder' },
        { type: 'field_input', name: 'VALUE', text: 'value' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 65,
      tooltip: 'Fill an input located by placeholder text.',
    },
    {
      type: 'pw_fill_label',
      message0: '✏️ fill label %1 with %2',
      args0: [
        { type: 'field_input', name: 'LABEL', text: 'label text' },
        { type: 'field_input', name: 'VALUE', text: 'value' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 65,
      tooltip: 'Fill an input located by its label.',
    },
    {
      type: 'pw_select_option',
      message0: '📋 select option %1 in %2',
      args0: [
        { type: 'field_input', name: 'OPTION', text: 'value' },
        { type: 'field_input', name: 'SELECTOR', text: 'select' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 65,
      tooltip: 'Select an option in a <select> element.',
    },

    /* ── Hover ──────────────────────────────────────────────────────── */
    {
      type: 'pw_hover_text',
      message0: '🔍 hover over text %1',
      args0: [{ type: 'field_input', name: 'TEXT', text: 'element text' }],
      previousStatement: null,
      nextStatement: null,
      colour: 180,
      tooltip: 'Hover over an element by its visible text.',
    },

    /* ── Assertions ─────────────────────────────────────────────────── */
    {
      type: 'pw_expect_url',
      message0: '✅ expect URL contains %1',
      args0: [{ type: 'field_input', name: 'PATTERN', text: '/dashboard' }],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: 'Assert the current URL matches a pattern.',
    },
    {
      type: 'pw_expect_visible',
      message0: '✅ expect text %1 is visible',
      args0: [{ type: 'field_input', name: 'TEXT', text: 'Welcome' }],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: 'Assert an element containing text is visible.',
    },
    {
      type: 'pw_expect_not_visible',
      message0: '❌ expect text %1 is NOT visible',
      args0: [{ type: 'field_input', name: 'TEXT', text: 'Error' }],
      previousStatement: null,
      nextStatement: null,
      colour: 0,
      tooltip: 'Assert an element is not visible.',
    },
    {
      type: 'pw_expect_value',
      message0: '✅ expect input %1 has value %2',
      args0: [
        { type: 'field_input', name: 'SELECTOR', text: 'input' },
        { type: 'field_input', name: 'VALUE', text: 'expected' },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 20,
      tooltip: 'Assert an input element has a specific value.',
    },

    /* ── Timing ─────────────────────────────────────────────────────── */
    {
      type: 'pw_wait',
      message0: '⏳ wait %1 ms',
      args0: [{ type: 'field_number', name: 'MS', value: 1000, min: 0, max: 60000 }],
      previousStatement: null,
      nextStatement: null,
      colour: 120,
      tooltip: 'Pause for a fixed duration.',
    },
    {
      type: 'pw_wait_selector',
      message0: '⏳ wait for text %1 visible',
      args0: [{ type: 'field_input', name: 'TEXT', text: 'Loading...' }],
      previousStatement: null,
      nextStatement: null,
      colour: 120,
      tooltip: 'Wait until an element with the text becomes visible.',
    },

    /* ── Screenshots ─────────────────────────────────────────────────── */
    {
      type: 'pw_screenshot',
      message0: '📸 take screenshot named %1',
      args0: [{ type: 'field_input', name: 'NAME', text: 'screenshot' }],
      previousStatement: null,
      nextStatement: null,
      colour: 330,
      tooltip: 'Capture a screenshot of the page.',
    },
  ])
}
