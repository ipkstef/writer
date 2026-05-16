const STORAGE_KEY = 'writer:draft:v1'
const AUTOSAVE_DELAY = 250

const today = new Date()
const defaultTitle = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(today)

let autosaveTimer
let savedAt = null

const root = document.querySelector('main')

root.innerHTML = `
  <section class="writer-app" aria-label="Writer">
    <header class="writer-topbar">
      <input class="writer-title" type="text" aria-label="Document title" spellcheck="false" />
      <div class="writer-actions" aria-label="Document actions">
        <button class="writer-button" type="button" data-action="new">New</button>
        <button class="writer-button" type="button" data-action="open">Open</button>
        <button class="writer-button writer-button-primary" type="button" data-action="export">Export .md</button>
      </div>
      <input class="writer-file" type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" />
    </header>
    <div class="writer-editor-shell">
      <textarea class="writer-editor" aria-label="Markdown editor" spellcheck="true"></textarea>
    </div>
    <footer class="writer-status" aria-live="polite">
      <span data-stat="words">0 words</span>
      <span data-stat="chars">0 chars</span>
      <span data-stat="cursor">Ln 1, Col 1</span>
      <span data-stat="save">Saved locally</span>
    </footer>
  </section>
`

const titleInput = root.querySelector('.writer-title')
const editor = root.querySelector('.writer-editor')
const fileInput = root.querySelector('.writer-file')
const actionNew = root.querySelector('[data-action="new"]')
const actionOpen = root.querySelector('[data-action="open"]')
const actionExport = root.querySelector('[data-action="export"]')
const wordStat = root.querySelector('[data-stat="words"]')
const charStat = root.querySelector('[data-stat="chars"]')
const cursorStat = root.querySelector('[data-stat="cursor"]')
const saveStat = root.querySelector('[data-stat="save"]')

function getDraft() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setDraft({ title, content }) {
  savedAt = new Date()
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      title,
      content,
      savedAt: savedAt.toISOString(),
    })
  )
}

function loadDraft() {
  const draft = getDraft()
  titleInput.value = draft?.title || defaultTitle
  editor.value = draft?.content || ''
  savedAt = draft?.savedAt ? new Date(draft.savedAt) : null
}

function scheduleSave() {
  clearTimeout(autosaveTimer)
  saveStat.textContent = 'Saving...'
  autosaveTimer = setTimeout(() => {
    setDraft({ title: titleInput.value, content: editor.value })
    updateStats()
  }, AUTOSAVE_DELAY)
}

function updateStats() {
  const text = editor.value
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const chars = text.length
  const position = editor.selectionStart
  const beforeCursor = text.slice(0, position)
  const lines = beforeCursor.split('\n')
  const line = lines.length
  const column = lines[lines.length - 1].length + 1

  wordStat.textContent = `${words} ${words === 1 ? 'word' : 'words'}`
  charStat.textContent = `${chars} ${chars === 1 ? 'char' : 'chars'}`
  cursorStat.textContent = `Ln ${line}, Col ${column}`
  saveStat.textContent = savedAt ? `Saved ${formatTime(savedAt)}` : 'Saved locally'
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function slugify(value) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'note'
  )
}

function downloadMarkdown() {
  const filename = `${slugify(titleInput.value || defaultTitle)}.md`
  const blob = new Blob([editor.value], {
    type: 'text/markdown;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function newDraft() {
  if (editor.value.trim() && !window.confirm('Start a new blank note?')) {
    return
  }

  titleInput.value = defaultTitle
  editor.value = ''
  setDraft({ title: titleInput.value, content: editor.value })
  updateStats()
  editor.focus()
}

async function openFile(file) {
  if (!file) return

  const text = await file.text()
  const name = file.name.replace(/\.(md|markdown|txt)$/i, '')

  titleInput.value = name || defaultTitle
  editor.value = text
  setDraft({ title: titleInput.value, content: editor.value })
  updateStats()
  editor.focus()
}

function handleDrop(event) {
  event.preventDefault()
  document.body.classList.remove('is-dragging')
  openFile(event.dataTransfer.files[0])
}

titleInput.addEventListener('input', scheduleSave)
editor.addEventListener('input', () => {
  updateStats()
  scheduleSave()
})
editor.addEventListener('click', updateStats)
editor.addEventListener('keyup', updateStats)
editor.addEventListener('select', updateStats)

actionNew.addEventListener('click', newDraft)
actionOpen.addEventListener('click', () => fileInput.click())
actionExport.addEventListener('click', downloadMarkdown)
fileInput.addEventListener('change', () => openFile(fileInput.files[0]))

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    setDraft({ title: titleInput.value, content: editor.value })
    updateStats()
  }

  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
    event.preventDefault()
    downloadMarkdown()
  }
})

document.addEventListener('dragenter', (event) => {
  event.preventDefault()
  document.body.classList.add('is-dragging')
})
document.addEventListener('dragover', (event) => event.preventDefault())
document.addEventListener('dragleave', (event) => {
  if (event.target === document.documentElement || event.target === document.body) {
    document.body.classList.remove('is-dragging')
  }
})
document.addEventListener('drop', handleDrop)

loadDraft()
updateStats()
editor.focus()
