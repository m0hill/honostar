import type { EffectHandler } from "@honostar/core/server"

type ToastType = "success" | "error" | "info"

function Toast({ message, type }: { message: string; type: ToastType }) {
  const bgColor = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  }[type]

  const icon = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  }[type]

  const timestamp = new Date().getTime()
  return (
    <div
      id={`toast-${timestamp}`}
      class={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 mb-2 animate-slide-in`}
      data-init="setTimeout(() => el.remove(), 4000)"
    >
      <span class="text-lg font-bold">{icon}</span>
      <span>{message}</span>
    </div>
  )
}

export const toastShow: EffectHandler<[message: string, type: ToastType]> = async (
  c,
  message,
  type
) => {
  await c.var.fx.reply([
    [
      "patch-elements",
      <Toast message={message} type={type} />,
      { selector: "#toast-container", mode: "append" },
    ],
  ])
}

export const toastSuccess: EffectHandler<[message: string]> = async (c, message) => {
  await c.var.fx.reply([["toast:show", message, "success"]])
}

export const toastError: EffectHandler<[message: string]> = async (c, message) => {
  await c.var.fx.reply([["toast:show", message, "error"]])
}

export const toastEffects = {
  "toast:show": toastShow,
  "toast:success": toastSuccess,
  "toast:error": toastError,
} as const
