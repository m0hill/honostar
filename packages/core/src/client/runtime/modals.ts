type ModalsApi = {
  closeAll(): void
  close(id: string): void
  count(): number
}

function focusModalContent(root: ParentNode): void {
  queueMicrotask(() => {
    const target =
      root.querySelector<HTMLElement>("[data-auto-focus]") ??
      root.querySelector<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
      )
    try {
      target?.focus()
    } catch {}
  })
}

export function createModalHost(opts?: { hostId?: string; appId?: string }): ModalsApi {
  const hostId = opts?.hostId ?? "ds-overlays"
  const appId = opts?.appId ?? "app"

  const host = document.getElementById(hostId)
  if (!host) {
    return {
      closeAll: () => {},
      close: () => {},
      count: () => 0,
    }
  }

  const app = document.getElementById(appId)

  const setInert = (on: boolean) => {
    if (!app) return
    if (on) {
      app.setAttribute("inert", "")
      document.body.style.overflow = "hidden"
    } else {
      app.removeAttribute("inert")
      document.body.style.overflow = ""
    }
  }

  const hasAnyModal = () => Boolean(host.querySelector("[data-modal]"))

  const releaseIfNone = () => {
    if (!hasAnyModal()) setInert(false)
  }

  const activateModalElement = (el: HTMLElement) => {
    setInert(true)
    focusModalContent(el)
  }

  const openDialog = (dlg: HTMLDialogElement) => {
    try {
      if (!dlg.open && typeof dlg.showModal === "function") {
        dlg.showModal()
      } else if (!dlg.open) {
        dlg.setAttribute("open", "")
      }
    } catch {
      dlg.setAttribute("open", "")
    }
    setInert(true)
    const onClose = () => {
      dlg.removeEventListener("close", onClose)
      dlg.remove()
      releaseIfNone()
    }
    dlg.addEventListener("close", onClose, { once: true })
    focusModalContent(dlg)
  }

  host.addEventListener("click", (e) => {
    const target = e.target
    if (!(target instanceof HTMLElement)) return
    const dismiss = target.closest("[data-modal-dismiss]")
    if (!dismiss) return
    const dialog = target.closest("dialog[data-modal]")
    if (dialog instanceof HTMLDialogElement) {
      try {
        dialog.close()
      } catch {
        dialog.remove()
        releaseIfNone()
      }
    } else {
      const el = target.closest("[data-modal]")
      if (el instanceof HTMLElement) {
        el.remove()
        releaseIfNone()
      }
    }
  })

  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return
        const dialogCandidates = node.matches("dialog[data-modal]")
          ? [node]
          : Array.from(node.querySelectorAll("dialog[data-modal]"))
        for (const el of dialogCandidates) {
          if (!(el instanceof HTMLDialogElement)) continue
          if (el.hasAttribute("data-auto-open")) {
            openDialog(el)
          }
        }
        const modalCandidates = node.matches("[data-modal]")
          ? [node]
          : Array.from(node.querySelectorAll<HTMLElement>("[data-modal]"))
        for (const el of modalCandidates) {
          if (el instanceof HTMLDialogElement) continue
          activateModalElement(el)
        }
      })
      if (m.removedNodes.length > 0) releaseIfNone()
    }
  })

  mo.observe(host, { childList: true, subtree: true })

  return {
    closeAll: () => {
      host.querySelectorAll<HTMLDialogElement>("dialog[data-modal]").forEach((d) => {
        try {
          d.close()
        } catch {
          d.remove()
        }
      })
      host.innerHTML = ""
      setInert(false)
    },
    close: (id: string) => {
      const el = host.querySelector<HTMLElement>(`[data-modal-id="${CSS.escape(id)}"]`)
      if (!el) return
      const dlg = el.closest("dialog[data-modal]")
      if (dlg instanceof HTMLDialogElement) {
        try {
          dlg.close()
        } catch {
          dlg.remove()
          releaseIfNone()
        }
      } else {
        el.remove()
        releaseIfNone()
      }
    },
    count: () => host.querySelectorAll("[data-modal]").length,
  }
}

export type { ModalsApi }
