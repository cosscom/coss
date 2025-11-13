/**
 * Registry Categories Type Definition
 *
 * This file defines all valid categories that can be used in registry items.
 * Categories are divided into:
 * - Component categories: Main UI components (e.g., "input", "button")
 * - Tag categories: Additional tags/features (e.g., "loading", "disabled")
 */

// Main component categories (UI primitives)
export const componentCategories = [
  "accordion",
  "alert",
  "alert dialog",
  "autocomplete",
  "avatar",
  "badge",
  "banner",
  "breadcrumb",
  "button",
  "calendar",
  "card",
  "checkbox",
  "checkbox group",
  "collapsible",
  "combobox",
  "command",
  "dialog",
  "dropdown",
  "empty",
  "field",
  "fieldset",
  "form",
  "frame",
  "group",
  "input",
  "input group",
  "kbd",
  "label",
  "menu",
  "meter",
  "number field",
  "pagination",
  "popover",
  "preview card",
  "progress",
  "radio",
  "scroll area",
  "select",
  "separator",
  "sheet",
  "skeleton",
  "slider",
  "spinner",
  "switch",
  "table",
  "tabs",
  "textarea",
  "timeline",
  "toast",
  "toggle",
  "toggle group",
  "toolbar",
  "tooltip",
] as const

// Tag categories (features, states, modifiers)
export const tagCategories = [
  "authentication",
  "avatar group",
  "back",
  "chart",
  "checkout",
  "chip",
  "color",
  "controls",
  "cookies",
  "countdown",
  "counter",
  "copy",
  "credit card",
  "darkmode",
  "date",
  "delete",
  "disabled",
  "drag and drop",
  "emblor",
  "equalizer",
  "error",
  "feedback",
  "file",
  "filter",
  "flag",
  "gdpr",
  "hamburger",
  "helper",
  "hint",
  "hover card",
  "image",
  "info",
  "like",
  "loading",
  "login",
  "mask",
  "modal",
  "multiselect",
  "native select",
  "newsletter",
  "next",
  "number",
  "onboarding",
  "password",
  "payment",
  "phone",
  "picker",
  "previous",
  "pricing",
  "privacy",
  "profile",
  "radix",
  "range",
  "range calendar",
  "range slider",
  "rating",
  "react aria",
  "react daypicker",
  "read-only",
  "required",
  "reset",
  "resize",
  "sale",
  "search",
  "share",
  "signup",
  "social",
  "sort",
  "sonner",
  "status",
  "sticky",
  "stepper",
  "subscribe",
  "success",
  "tag",
  "tanstack",
  "team",
  "text editor",
  "time",
  "timezone",
  "tour",
  "tree",
  "upload",
  "user",
  "validation",
  "vertical slider",
  "vertical stepper",
  "vertical table",
  "vertical tabs",
  "vertical timeline",
  "volume",
  "vote",
  "warning",
  "week",
  "zod",
  "zoom",
] as const

// Combined categories array in custom order (components first, then tags)
export const registryCategories = [
  ...componentCategories,
  ...tagCategories,
] as const

export type ComponentCategory = (typeof componentCategories)[number]
export type TagCategory = (typeof tagCategories)[number]
export type RegistryCategory = (typeof registryCategories)[number]

// Helper function to check if a category is a component category
export function isComponentCategory(
  category: string
): category is ComponentCategory {
  return componentCategories.includes(category as ComponentCategory)
}

// Helper function to check if a category is a tag category
export function isTagCategory(category: string): category is TagCategory {
  return tagCategories.includes(category as TagCategory)
}

// Custom order for display (components first, then tags)
export const categoryDisplayOrder: RegistryCategory[] = [
  ...componentCategories,
  ...tagCategories,
]

// Helper function to get category sort order
export function getCategorySortOrder(category: string): number {
  const index = categoryDisplayOrder.indexOf(category as RegistryCategory)
  return index === -1 ? Infinity : index
}
