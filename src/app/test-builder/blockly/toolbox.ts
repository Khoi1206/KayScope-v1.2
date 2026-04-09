/**
 * Blockly toolbox configuration for Playwright test builder.
 * Categories match the Playwright block types defined in blocks.ts.
 */
export const PLAYWRIGHT_TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '🧪 Test',
      colour: '210',
      contents: [
        { kind: 'block', type: 'pw_test' },
      ],
    },
    {
      kind: 'category',
      name: '🌐 Navigation',
      colour: '160',
      contents: [
        {
          kind: 'block',
          type: 'pw_goto',
          fields: { URL: 'http://localhost:3000' },
        },
      ],
    },
    {
      kind: 'category',
      name: '🖱️ Click',
      colour: '290',
      contents: [
        {
          kind: 'block',
          type: 'pw_click_text',
          fields: { TEXT: 'button text' },
        },
        {
          kind: 'block',
          type: 'pw_click_role',
          fields: { ROLE: 'button', NAME: 'Submit' },
        },
        {
          kind: 'block',
          type: 'pw_click_title',
          fields: { TITLE: 'icon title' },
        },
        {
          kind: 'block',
          type: 'pw_click_placeholder',
          fields: { PLACEHOLDER: 'placeholder text' },
        },
        {
          kind: 'block',
          type: 'pw_hover_text',
          fields: { TEXT: 'element text' },
        },
      ],
    },
    {
      kind: 'category',
      name: '✏️ Fill',
      colour: '65',
      contents: [
        {
          kind: 'block',
          type: 'pw_fill_placeholder',
          fields: { PLACEHOLDER: 'Email address', VALUE: 'test@example.com' },
        },
        {
          kind: 'block',
          type: 'pw_fill_label',
          fields: { LABEL: 'Email', VALUE: 'test@example.com' },
        },
        {
          kind: 'block',
          type: 'pw_select_option',
          fields: { OPTION: 'POST', SELECTOR: 'select' },
        },
      ],
    },
    {
      kind: 'category',
      name: '✅ Assert',
      colour: '20',
      contents: [
        {
          kind: 'block',
          type: 'pw_expect_url',
          fields: { PATTERN: '/dashboard' },
        },
        {
          kind: 'block',
          type: 'pw_expect_visible',
          fields: { TEXT: 'Welcome' },
        },
        {
          kind: 'block',
          type: 'pw_expect_not_visible',
          fields: { TEXT: 'Error' },
        },
        {
          kind: 'block',
          type: 'pw_expect_value',
          fields: { SELECTOR: 'input', VALUE: 'expected value' },
        },
      ],
    },
    {
      kind: 'category',
      name: '⏳ Timing',
      colour: '120',
      contents: [
        {
          kind: 'block',
          type: 'pw_wait',
          fields: { MS: 1000 },
        },
        {
          kind: 'block',
          type: 'pw_wait_selector',
          fields: { TEXT: 'Loading...' },
        },
      ],
    },
    {
      kind: 'category',
      name: '📸 Media',
      colour: '330',
      contents: [
        {
          kind: 'block',
          type: 'pw_screenshot',
          fields: { NAME: 'screenshot' },
        },
      ],
    },
  ],
}

/**
 * Starting workspace state using Blockly v12 JSON serialization.
 * XML-based loading (domToWorkspace) does not correctly restore nested
 * <next> chains in Blockly v12 — use serialization.workspaces.load() instead.
 */
export const INITIAL_STATE = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: 'pw_test',
        x: 30,
        y: 30,
        fields: { NAME: 'Login Flow' },
        inputs: {
          STEPS: {
            block: {
              type: 'pw_goto',
              fields: { URL: 'http://localhost:3000' },
              next: {
                block: {
                  type: 'pw_fill_placeholder',
                  fields: { PLACEHOLDER: 'Email address', VALUE: 'user@example.com' },
                  next: {
                    block: {
                      type: 'pw_fill_placeholder',
                      fields: { PLACEHOLDER: 'Password', VALUE: 'password123' },
                      next: {
                        block: {
                          type: 'pw_click_role',
                          fields: { ROLE: 'button', NAME: 'Sign in' },
                          next: {
                            block: {
                              type: 'pw_expect_url',
                              fields: { PATTERN: '/dashboard' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
  },
}
