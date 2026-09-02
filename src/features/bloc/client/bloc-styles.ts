// The Bloc workspace's scoped CSS, lifted verbatim out of bloc-notepad.tsx so
// the orchestration component stays comfortably under the feature size ceiling.
// Consumed once, as <style>{BLOC_STYLES}</style>, by the notepad.
export const BLOC_STYLES = `
  .al-bloc-desktop-grid { align-items: stretch; }
  .al-bloc-editor-shell { min-height: 0; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); display: flex; flex-direction: column; }
  .al-bloc-title-row { border-bottom: 1px solid #f0ece2; }
  .al-bloc-title-input { color: #111111; }
  .al-bloc-title-input::placeholder { color: #9a958a; }
  .al-bloc-toolbar { border-bottom: 1px solid #f0ece2; background: #faf8f4; }
  .al-bloc-toolbar-row { min-width: 0; flex-wrap: nowrap; }
  .al-bloc-toolbar-desktop .al-bloc-toolbar-row { gap: 1px; padding: 8px 6px; }
  .al-bloc-toolbar-desktop .al-bloc-tool-btn { min-width: 28px; padding-right: 5px; padding-left: 5px; }
  .al-bloc-toolbar-desktop .al-bloc-toolbar-divider { margin-right: 1px; margin-left: 1px; }
  .al-bloc-toolbar-desktop .al-bloc-toolbar-select { padding-right: 21px; padding-left: 7px; font-size: 11px; }
  .al-bloc-toolbar-divider { width: 1px; height: 20px; background: #ece7dc; margin: 0 2px; flex-shrink: 0; }
  .al-bloc-tool-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 32px; min-width: 32px; padding: 0 7px; border-radius: 8px; border: none; background: transparent; color: #6b6f72; cursor: pointer; }
  .al-bloc-tool-btn:hover { background: white; color: #c94f21; }
  .al-bloc-tool-btn-active { background: #f7ded2; color: #b9471f; box-shadow: inset 0 0 0 1px rgba(225, 93, 45, 0.18); }
  .al-bloc-tool-btn-active:hover { background: #f7ded2; color: #a73d18; }
  .al-bloc-tool-group { display: inline-flex; align-items: center; gap: 1px; flex-shrink: 0; }
  .al-bloc-size-group { display: inline-flex; align-items: center; gap: 1px; flex-shrink: 0; overflow: hidden; border: 1px solid #ece7dc; border-radius: 8px; background: white; }
  .al-bloc-size-group .al-bloc-tool-btn { height: 30px; min-width: 28px; padding: 0 6px; border-radius: 7px; }
  .al-bloc-font-size-field { display: flex; height: 30px; align-items: center; justify-content: center; border-left: 1px solid #f0ece2; border-right: 1px solid #f0ece2; color: #9a958a; }
  .al-bloc-font-size-field input { box-sizing: border-box; width: 32px; height: 28px; appearance: textfield; border: 0; background: transparent; padding: 0 2px; color: #333029; font-size: 12px; font-weight: 700; line-height: 28px; outline: none; text-align: right; }
  .al-bloc-font-size-field input::-webkit-inner-spin-button, .al-bloc-font-size-field input::-webkit-outer-spin-button { appearance: none; margin: 0; }
  .al-bloc-font-size-field span { padding: 0 5px 0 1px; font-size: 9px; font-weight: 700; line-height: 30px; text-transform: uppercase; }
  .al-bloc-toolbar-select { box-sizing: border-box; height: 32px; flex-shrink: 0; border: 1px solid #ece7dc; border-radius: 8px; background: white; padding: 0 26px 0 8px; color: #333029; font-size: 12px; line-height: normal; }
  .al-bloc-paragraph-select { width: 126px; }
  .al-bloc-font-select { width: 114px; }
  .al-bloc-list-select { width: 120px; }
  .al-bloc-toolbar-select-active { border-color: rgba(225, 93, 45, 0.35); background: #fff7f2; color: #b9471f; }
  .al-bloc-color-tool { position: relative; flex-shrink: 0; }
  .al-bloc-color-input { position: absolute; inset: 0; height: 100%; width: 100%; cursor: pointer; opacity: 0; }
  .al-bloc-toolbar-mobile .al-bloc-toolbar-row { width: 100%; gap: 2px; overflow: hidden; padding: 6px; }
  .al-bloc-toolbar-mobile .al-bloc-tool-btn { width: 30px; min-width: 30px; padding: 0; }
  .al-bloc-toolbar-mobile .al-bloc-toolbar-divider { margin: 0; }
  .al-bloc-toolbar-mobile .al-bloc-toolbar-divider { height: 18px; }
  .al-bloc-mobile-size-select { display: flex; width: 58px; min-width: 0; flex: 1 1 58px; }
  .al-bloc-mobile-size-select select { box-sizing: border-box; width: 100%; height: 32px; border: 1px solid #ece7dc; border-radius: 8px; background: white; padding: 0 15px 0 5px; color: #333029; font-size: 11px; font-weight: 700; outline: none; }
  .al-bloc-mobile-size-select:focus-within select, .al-bloc-mobile-icon-select:focus-within { border-color: rgba(225, 93, 45, 0.5); box-shadow: 0 0 0 2px rgba(225, 93, 45, 0.12); }
  .al-bloc-mobile-icon-select { position: relative; display: inline-flex; width: 38px; min-width: 38px; height: 32px; flex-shrink: 0; align-items: center; justify-content: center; gap: 2px; border: 1px solid #ece7dc; border-radius: 8px; background: white; color: #6b6f72; }
  .al-bloc-mobile-icon-select select { position: absolute; inset: 0; width: 100%; height: 100%; cursor: pointer; opacity: 0; }
  .al-bloc-mobile-select-chevron { width: 9px; height: 9px; }
  .al-bloc-content-wrap { position: relative; display: flex; min-height: 0; flex: 1; overflow: hidden; background: white; }
  .al-bloc-editor-empty { position: absolute; z-index: 2; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; pointer-events: none; text-align: center; }
  .al-bloc-editor-empty-icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 16px; background: #f7f4ee; color: #aaa399; }
  .al-bloc-editor-empty p { margin: 12px 0 0; color: #333029; font-size: 14px; font-weight: 800; }
  .al-bloc-editor-empty > span:last-child { margin-top: 4px; max-width: 360px; color: #777269; font-size: 12px; line-height: 20px; }
  .al-bloc-content { position: relative; z-index: 1; min-width: 0; color: #333029; overflow-wrap: anywhere; }
  /* The editor is contenteditable, so links otherwise inherit the text
     caret. A pointer plus a hover colour is the only affordance that a
     "Ir al momento" link (or any pasted link) can actually be followed. */
  .al-bloc-content a { color: #c94f21; text-decoration: underline; cursor: pointer; }
  .al-bloc-content a:hover { color: #a63f1a; }
  .al-bloc-content p { margin: 0 0 8px; }
  .al-bloc-content hr { margin: 12px 0 14px; border: 0; border-top: 1px solid #ece7dc; }
  .al-bloc-content blockquote { border-left: 3px solid #ece7dc; padding-left: 14px; color: #6b6f72; }
  .al-bloc-content h1 { font-size: 1.7em; font-weight: 700; color: #111111; }
  .al-bloc-content h2 { font-size: 1.4em; font-weight: 700; color: #111111; }
  .al-bloc-content h3 { font-size: 1.15em; font-weight: 700; color: #111111; }
  .al-bloc-content ol { list-style: decimal; padding-left: 24px; }
  .al-bloc-content ul { list-style: disc; padding-left: 24px; }
  .al-bloc-content img { max-width: 100%; border-radius: 8px; margin: 6px 0; }
  .al-bloc-footer { border-top: 1px solid #f0ece2; background: #faf8f4; color: #6b6f72; }
  .al-bloc-save-dot { background: #4C9A6E; }
  .al-bloc-header-btn { border-radius: 10px; border: 1px solid #ece7dc; background: white; color: #333029; font-size: 12.5px; font-weight: 600; cursor: pointer; }
  .al-bloc-header-btn:hover { border-color: rgba(225, 93, 45, 0.35); color: #c94f21; }
  .al-bloc-header-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .al-bloc-menu { background: white; border: 1px solid #ece7dc; box-shadow: 0 16px 36px rgba(17,17,17,0.12); }
  .al-bloc-menu-item { display: flex; width: 100%; align-items: center; gap: 8px; border-radius: 8px; border: none; background: none; padding: 8px 10px; font-size: 12.5px; font-weight: 600; color: #333029; cursor: pointer; text-align: left; }
  .al-bloc-menu-item:hover { background: #faf8f4; }
  .al-bloc-menu-item-danger { color: #c23a2e; }
  .al-bloc-menu-item-danger:hover { background: #fbe2df; }
  .al-bloc-menu-divider { height: 1px; margin: 4px 6px; background: #f0ece2; }
  .al-bloc-export-doc { padding: 32px; color: #25221d; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  .al-bloc-export-title { margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #111111; }
  .al-bloc-export-title + .al-bloc-export-body { margin-top: 18px; }
  .al-bloc-export-body { font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; word-break: break-word; }
  .al-bloc-export-body p { margin: 0 0 10px; }
  .al-bloc-export-body h1 { font-size: 1.6em; font-weight: 700; margin: 0.6em 0 0.3em; }
  .al-bloc-export-body h2 { font-size: 1.3em; font-weight: 700; margin: 0.6em 0 0.3em; }
  .al-bloc-export-body h3 { font-size: 1.1em; font-weight: 700; margin: 0.6em 0 0.3em; }
  .al-bloc-export-body ol { list-style: decimal; padding-left: 24px; margin: 0 0 10px; }
  .al-bloc-export-body ul { list-style: disc; padding-left: 24px; margin: 0 0 10px; }
  .al-bloc-export-body a { color: #c94f21; text-decoration: underline; }
  .al-bloc-export-body img { max-width: 100%; }
  .al-bloc-export-body blockquote { border-left: 3px solid #ece7dc; padding-left: 14px; color: #6b6f72; margin: 0 0 10px; }
  .al-bloc-export-empty { color: #9a958a; font-style: italic; }
  .al-bloc-icon-btn { display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid #ece7dc; background: white; color: #6b6f72; cursor: pointer; }
  .al-bloc-icon-btn:hover { border-color: rgba(225, 93, 45, 0.35); color: #c94f21; }
  .al-bloc-icon-btn-active { background: #fbe7dd; border-color: rgba(225, 93, 45, 0.3); color: #c94f21; }
  .al-bloc-icon-btn-ghost { border-radius: 9px; border: none; background: transparent; color: #6b6f72; cursor: pointer; }
  .al-bloc-icon-btn-ghost:hover { background: #f3ece1; color: #111111; }
  .al-bloc-icon-btn-danger:hover { background: #fbe2df; color: #c23a2e; }
  .al-bloc-star-active { color: #E15D2D; }
  .al-bloc-primary-btn { display: inline-flex; align-items: center; justify-content: center; height: 40px; border-radius: 12px; border: 1px solid var(--al-action-soft-border); background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(80, 43, 27, 0.05); transition: background .15s, border-color .15s, color .15s; }
  .al-bloc-primary-btn:hover { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
  .al-bloc-primary-btn-compact { height: 34px; border-radius: 10px; font-size: 12px; }
  .al-bloc-list-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; text-align: center; border-radius: 12px; border: 1px dashed #ece7dc; }
  .al-bloc-list-empty-img { width: 96px; height: auto; opacity: 0.85; }
  .al-bloc-list-empty p { font-size: 12px; color: #6b6f72; margin: 0; }
  .al-bloc-search input { border: 1px solid #ece7dc; border-radius: 10px; background: white; }
  .al-bloc-sidebar { min-height: 0; overflow: hidden; background: white; border: 1px solid #ece7dc; box-shadow: 0 12px 32px rgba(17, 17, 17, 0.05); padding: 14px; }
  .al-bloc-tabs { display: flex; align-items: center; gap: 2px; border-radius: 11px; border: 1px solid #ece7dc; background: #faf8f4; padding: 3px; }
  .al-bloc-tab { flex: 1; height: 28px; border-radius: 8px; font-size: 11px; font-weight: 600; color: #6b6f72; background: transparent; border: none; cursor: pointer; }
  .al-bloc-tab-active { background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); box-shadow: inset 0 0 0 1px var(--al-action-soft-border); }
  .al-bloc-settings-panel { border: 1px solid #ece7dc; border-radius: 12px; background: #faf8f4; padding: 10px; }
  .al-bloc-note-row { display: flex; align-items: stretch; gap: 2px; }
  .al-bloc-note-card { min-width: 0; flex: 1; border-radius: 10px; padding: 8px 10px; text-align: left; background: transparent; border: none; cursor: pointer; color: #333029; }
  .al-bloc-note-card:hover { background: #faf8f4; }
  .al-bloc-note-card-active { background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); box-shadow: inset 0 0 0 1px var(--al-action-soft-border); }
  .al-bloc-note-card-active:hover { background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
  .al-bloc-note-card-meta { color: #9a958a; }
  .al-bloc-note-card-active .al-bloc-note-card-meta { color: #8f7468; }
  .al-bloc-note-card-star { color: #b94720; }
  .al-bloc-note-card:not(.al-bloc-note-card-active) .al-bloc-note-card-star { color: #E15D2D; }
  .al-bloc-note-row-delete { display: flex; align-items: center; justify-content: center; width: 30px; border-radius: 9px; border: none; background: #fff7f2; color: #b9471f; cursor: pointer; opacity: 1; }
  .al-bloc-note-row-delete:hover { background: #fbe2df; color: #c23a2e; }
  .al-bloc-trash-link { flex-shrink: 0; border-top: 1px solid #f0ece2; color: #6b6f72; background: none; border-left: none; border-right: none; border-bottom: none; cursor: pointer; }
  .al-bloc-trash-link:hover { color: #c94f21; }
  .al-bloc-trash-count { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: #fbe7dd; color: #c94f21; font-size: 10.5px; font-weight: 700; }
  .al-bloc-trash-modal { background: rgba(17,17,17,0.35); }
  .al-bloc-trash-panel { background: white; box-shadow: 0 24px 60px rgba(17,17,17,0.18); }
  .al-bloc-trash-row { background: #faf8f4; border: 1px solid #f0ece2; }
  .al-bloc-trash-footer { border-top: 1px solid #f0ece2; color: #9a958a; }
  .al-bloc-save-dot { background: #4C9A6E; }
  .al-bloc-mobile-create { line-height: 1; }
  .al-bloc-mobile-notes { min-height: 50px; }
  .al-bloc-mobile-title-row { border-bottom: 1px solid #f0ece2; }
  .al-bloc-mobile-title-button { border: 0; background: transparent; }
  .al-bloc-mobile-actions { gap: 2px; border-top: 1px solid #f0ece2; background: white; }
  .al-bloc-mobile-action { display: flex; min-width: 0; flex: 1; align-items: center; justify-content: center; gap: 7px; height: 38px; border: 0; border-radius: 8px; background: transparent; color: #6b6f72; font-size: 12px; font-weight: 600; cursor: pointer; }
  .al-bloc-mobile-action:hover, .al-bloc-mobile-action[aria-expanded="true"] { background: #fff3ed; color: #b9471f; }
  .al-bloc-mobile-status { border-top: 1px solid #f0ece2; background: #faf8f4; }
  .al-bloc-mobile-card { min-height: 48px; border: 1px solid #ece7dc; background: white; color: #333029; }
  .al-bloc-mobile-card-active { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); box-shadow: 0 4px 12px rgba(80,43,27,0.05); }
  .al-bloc-mobile-card-meta { color: #9a958a; }
  .al-bloc-mobile-card-active .al-bloc-mobile-card-meta { color: #8f7468; }
  .al-bloc-mobile-card-delete { border: 0; background: #fff3ed; color: #b9471f; }
  .al-bloc-mobile-card-delete:hover { background: #fbe2df; color: #c23a2e; }
  .al-bloc-mobile-card-active .al-bloc-mobile-card-delete { background: #fff8f4; color: #b9471f; }
  .al-bloc-panel-label { display: block; margin: 0 0 6px; color: #6b6f72; font-size: 11px; font-weight: 700; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.04em; }
  .al-bloc-panel-select { width: 100%; height: 42px; padding-right: 34px; padding-left: 12px; font-size: 14px; }
  .al-bloc-size-group-panel { width: 100%; justify-content: space-between; }
  .al-bloc-size-group-panel .al-bloc-tool-btn { width: 42px; height: 40px; }
  .al-bloc-size-group-panel .al-bloc-font-size-field { height: 40px; flex: 1; }
  .al-bloc-size-group-panel .al-bloc-font-size-field input { width: 46px; height: 38px; font-size: 14px; line-height: 38px; }
  .al-bloc-size-group-panel .al-bloc-font-size-field span { font-size: 10px; line-height: 40px; }
  .al-bloc-panel-alignment .al-bloc-tool-btn { width: 100%; height: 40px; border: 1px solid #ece7dc; background: white; }
  .al-bloc-panel-alignment .al-bloc-tool-btn-active { border-color: rgba(225, 93, 45, 0.28); background: #f7ded2; }
  .al-bloc-panel-color { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 8px; min-height: 44px; border: 1px solid #ece7dc; border-radius: 9px; padding: 7px 8px 7px 10px; color: #333029; font-size: 12px; font-weight: 600; }
  .al-bloc-panel-color > span { display: flex; min-width: 0; align-items: center; gap: 6px; }
  .al-bloc-panel-color input { width: 30px; height: 28px; flex-shrink: 0; cursor: pointer; border: 0; border-radius: 6px; padding: 0; background: transparent; }
  .al-bloc-sheet { background: white; border-top: 1px solid #ece7dc; box-shadow: 0 -12px 32px rgba(17,17,17,0.12); }
  .al-bloc-sheet-handle { background: #ece7dc; }
  .al-bloc-sheet-row { color: #333029; background: none; border: none; }
  .al-bloc-sheet-row:hover { background: #faf8f4; }
  .al-bloc-sheet-row-danger { color: #c23a2e; }
  .al-bloc-sheet-row-danger:hover { background: #fbe2df; }
  @media (max-width: 767px) {
    .al-bloc-page-header { margin-bottom: 0; gap: 0; }
    .al-bloc-page-header .al-page-header-subtitle { font-size: 12px; line-height: 1.35; }
    .al-bloc-mobile-layout { min-height: calc(100dvh - 190px); }
  }
  @media (min-width: 768px) {
    .al-bloc-desktop-grid { height: clamp(520px, calc(100dvh - 148px), 960px); }
    .al-bloc-editor-shell, .al-bloc-sidebar { height: 100%; }
  }
`;
