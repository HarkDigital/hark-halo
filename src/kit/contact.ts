import { CONTACT } from '../content'

/*
 * The contact card's direct lines under its button: the email and the phone,
 * one per line, each with its icon. Shared by the story's contact card, the
 * service pages' and portfolio's card (page/shell.ts) and the copy layer
 * (core/srContent.ts). `cls` names the links; `${cls}-i` the icons.
 */
const ICON = {
  mail: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="15" height="11" rx="2"/><path d="m3.5 6 6.5 5 6.5-5"/></svg>',
  phone:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 3.2 4.8 3.3a1.6 1.6 0 0 0-1.5 1.7c.4 6 5.1 10.6 11 11a1.6 1.6 0 0 0 1.7-1.5l.1-1.8a1 1 0 0 0-.7-1l-2.6-.9a1 1 0 0 0-1.1.3l-1 1.1a10 10 0 0 1-4.3-4.3l1.1-1a1 1 0 0 0 .3-1.1l-.9-2.6a1 1 0 0 0-1-.7Z"/></svg>',
}

export function directHtml(cls: string): string {
  const icon = (k: keyof typeof ICON) => `<span class="${cls}-i" aria-hidden="true">${ICON[k]}</span>`
  return `<a class="${cls}" href="mailto:${CONTACT.email}">${icon('mail')}<span>${CONTACT.email}</span></a><a class="${cls}" href="tel:${CONTACT.tel}" aria-label="Call ${CONTACT.phoneSpoken}">${icon('phone')}<span>${CONTACT.phone}</span></a>`
}
