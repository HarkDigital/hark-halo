// Shared by the portfolio capture scripts (work-video.mjs, add-site.mjs).

/** headless Chrome as a visitor's desktop Chrome (and quiet: no audio, no scrollbars) */
export const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
export const LAUNCH = {
  executablePath: CHROME,
  headless: 'new',
  args: ['--hide-scrollbars', '--disable-blink-features=AutomationControlled', '--mute-audio'],
}
export const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

/**
 * Third-party overlays hidden in every capture (never clicked): cookie banners,
 * chat bubbles, reCAPTCHA badges, accessibility toolbars, Popup Maker, the
 * Wayback toolbar. A site's own go in --hide.
 */
export const DEFAULT_HIDE = [
  '.grecaptcha-badge', '#pojo-a11y-toolbar', '[id^="trustedsite"]', '.trustedsite-trustmark',
  '#hubspot-messages-iframe-container', '.intercom-lightweight-app', '#CybotCookiebotDialog',
  '#onetrust-banner-sdk', '#onetrust-consent-sdk', '.cky-consent-container', '#cookie-law-info-bar',
  // (Popup Maker's open popup is .pum-active, display:block !important: outranked here)
  '#hark-wpe-cookie-consent', '.pum-overlay', 'html .pum-overlay.pum-active', '#moove_gdpr_cookie_info_bar', '.cmplz-cookiebanner',
  '#tidio-chat', '.buttonizer',
  '#wm-ipp-base', '#wm-ipp', '#donato', '.wm-ipp-base',
].join(',')

/** CSS that hides the default overlays plus `extra` (a site's own selectors, comma-separated) */
export const hideCss = (extra = '') => `${extra ? `${DEFAULT_HIDE},${extra}` : DEFAULT_HIDE}{display:none!important;visibility:hidden!important}`

/**
 * ffmpeg colour handling for every encode: frames are full-range sRGB, so encode
 * limited-range BT.601 and tag it fully. Untagged, Chrome guesses BT.709 for HD
 * sizes (800+ lines) and its software decoder reads full range as limited.
 */
export const COLOR =
  'in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt601,setparams=range=tv:colorspace=smpte170m:color_primaries=smpte170m:color_trc=smpte170m'
