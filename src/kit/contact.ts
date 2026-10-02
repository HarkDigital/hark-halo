import { CONTACT } from '../content'

/*
 * The contact card's direct lines under its button: the email and the phone,
 * shared by the story's contact card, the service pages' and portfolio's card
 * (page/shell.ts) and the copy layer (core/srContent.ts).
 */
export function directHtml(cls: string): string {
  return `<a class="${cls}" href="mailto:${CONTACT.email}">${CONTACT.email}</a><span class="${cls}-sep" aria-hidden="true">·</span><a class="${cls}" href="tel:${CONTACT.tel}" aria-label="Call ${CONTACT.phoneSpoken}">${CONTACT.phone}</a>`
}
